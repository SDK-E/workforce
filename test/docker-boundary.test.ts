import assert from "node:assert/strict";
import { execFile, execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { SandboxSpec } from "../src/domain.js";
import { dockerRunArguments, type EgressRuntimePolicy } from "../src/docker-runtime.js";
import { StateStore } from "../src/storage/state-store.js";
import type { AttemptResult } from "../src/supervision/attempt-types.js";
import { DockerSupervisor } from "../src/supervision/docker-supervisor.js";
import { ExecaDockerClient } from "../src/supervision/docker-client.js";

const image = process.env.WORKFORCE_AGENT_IMAGE ?? "workforce-agent:0.1.0";
const egress: EgressRuntimePolicy = {
  networkName: "workforce-egress-internal",
  proxyUrl: "http://workforce-egress-proxy:3128",
};

function dockerImagePresent(): boolean {
  try {
    execFileSync("docker", ["image", "inspect", image], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const ready = await new ExecaDockerClient(egress).available().then(dockerImagePresent);

function spec(overrides: Partial<SandboxSpec> = {}): SandboxSpec {
  return {
    jobId: "boundary-job",
    profile: "engineering",
    image,
    engine: "opencode",
    networkMode: "inference-only",
    allowedHosts: [],
    readOnlyRoot: true,
    nonRoot: true,
    capDropAll: true,
    noNewPrivileges: true,
    workspace: { type: "volume", name: "workforce-boundary-volume" },
    inputs: [],
    tmpfs: ["/tmp:rw,noexec,nosuid,size=16m"],
    cpu: 0.5,
    memoryMb: 256,
    pids: 64,
    timeoutSeconds: 60,
    tools: ["shell"],
    decisions: [],
    rejectedCapabilities: [],
    ...overrides,
  };
}

test("containers run as non-root on a read-only root filesystem", { skip: !ready }, async () => {
  const client = new ExecaDockerClient(egress);
  const result = await client.start(spec(), "boundary-hardening", [
    "sh",
    "-c",
    "id -u; touch /etc/forbidden 2>/dev/null && echo WRITABLE || echo READONLY",
  ]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^10001/m);
  assert.match(result.stdout, /READONLY/);
});

test("private workspace volume persists across containers", { skip: !ready }, async () => {
  const client = new ExecaDockerClient(egress);
  const volume = "workforce-boundary-persistence";
  const first = spec({ workspace: { type: "volume", name: volume } });
  await client.createVolume(volume);
  try {
    await client.start(first, "boundary-write-1", [
      "sh",
      "-c",
      "printf PERSISTED > /work/note.txt",
    ]);
    const second = spec({ workspace: { type: "volume", name: volume } });
    const read = await client.start(second, "boundary-read-1", ["sh", "-c", "cat /work/note.txt"]);
    assert.equal(read.exitCode, 0);
    assert.match(read.stdout, /PERSISTED/);
  } finally {
    await exec("docker", ["volume", "rm", "-f", volume]);
  }
});

test(
  "timed-out attempts are cleaned up and leave no managed container",
  { skip: !ready },
  async () => {
    const client = new ExecaDockerClient(egress);
    const result = await client.start(spec({ timeoutSeconds: 2 }), "boundary-timeout", [
      "sh",
      "-c",
      "sleep 30",
    ]);
    assert.equal(result.timedOut, true);
    try {
      assert.ok(!(await client.managedContainers()).includes("workforce-boundary-timeout"));
    } finally {
      await client.stop("workforce-boundary-timeout");
    }
  },
);

test("secrets enter the run arguments as names only", { skip: !ready }, () => {
  const args = dockerRunArguments(spec(), "boundary-secrets", ["sh", "-c", "true"], egress, [
    "AGENT_TOKEN",
  ]);
  const rendered = JSON.stringify(args);
  assert.ok(rendered.includes("AGENT_TOKEN"));
  assert.doesNotMatch(rendered, /top-secret-value/);
});

test(
  "supervisor refills capacity and reconciles orphans through the real daemon",
  { skip: !ready },
  async () => {
    const root = mkdtempSync(join(tmpdir(), "workforce-boundary-supervisor-"));
    const store = new StateStore(root);
    try {
      store.initialize();
      store.createCompany({ id: "acme", name: "Acme" });
      const docker = new ShellProbeDockerClient();
      const supervisor = new DockerSupervisor(
        store.attempts,
        docker,
        store.audit,
        undefined,
        (running) => ({ totalMemoryMb: 16_000, availableMemoryMb: 8_000, running }),
      );
      for (const id of ["boundary-att-1", "boundary-att-2", "boundary-att-3"])
        supervisor.enqueue({
          id,
          companyId: "acme",
          taskId: `task-${id}`,
          employeeId: id,
          sandbox: spec({ workspace: { type: "volume", name: `workforce-${id}` } }),
          command: ["opencode", "run", "--model", "openai/gpt-5", "Complete task"],
          secretNames: [],
          ephemeralSecretNames: [],
        });
      await supervisor.tick();
      while (store.attempts.queued(10).length > 0) {
        assert.ok(docker.concurrent <= 2);
        await sleep(100);
      }
      await supervisor.waitForIdle();
      assert.deepEqual(
        ["boundary-att-1", "boundary-att-2", "boundary-att-3"].map(
          (id) => store.attempts.get(id).status,
        ),
        ["succeeded", "succeeded", "succeeded"],
      );
      spawnDetached("docker", [
        "run",
        "--rm",
        "--name",
        "workforce-boundary-orphan",
        "--label",
        "workforce.managed=true",
        "--network",
        egress.networkName,
        image,
        "sh",
        "-c",
        "sleep 60",
      ]);
      while (!(await docker.managedContainers()).includes("workforce-boundary-orphan"))
        await sleep(100);
      const recovery = await supervisor.reconcile();
      assert.deepEqual(recovery.removedOrphans, ["workforce-boundary-orphan"]);
      assert.deepEqual(await docker.managedContainers(), []);
    } finally {
      await exec("docker", ["rm", "-f", "workforce-boundary-orphan"]);
      for (const id of ["boundary-att-1", "boundary-att-2", "boundary-att-3"]) {
        await exec("docker", ["rm", "-f", `workforce-${id}`]);
        await exec("docker", ["volume", "rm", "-f", `workforce-${id}`]);
      }
      store.close();
      rmSync(root, { recursive: true, force: true });
    }
  },
);

test(
  "expired leases are recovered by reconcile against the real daemon",
  { skip: !ready },
  async () => {
    const root = mkdtempSync(join(tmpdir(), "workforce-boundary-lease-"));
    const store = new StateStore(root);
    try {
      store.initialize();
      store.createCompany({ id: "acme", name: "Acme" });
      const supervisor = new DockerSupervisor(
        store.attempts,
        new ShellProbeDockerClient(),
        store.audit,
      );
      supervisor.enqueue({
        id: "boundary-lease",
        companyId: "acme",
        taskId: "task",
        employeeId: "worker",
        sandbox: spec(),
        command: ["opencode", "run", "--model", "openai/gpt-5", "Complete task"],
        secretNames: [],
        ephemeralSecretNames: [],
      });
      supervisor.attempts.acquire(store.attempts.get("boundary-lease"), "dead-owner");
      store.db
        .prepare("UPDATE attempt_leases SET expires_at=? WHERE attempt_id='boundary-lease'")
        .run(new Date(Date.now() - 1_000).toISOString());
      const recovery = await supervisor.reconcile();
      assert.deepEqual(recovery.recoveredLeases, ["boundary-lease"]);
      assert.equal(store.attempts.get("boundary-lease").status, "interrupted");
    } finally {
      store.close();
      rmSync(root, { recursive: true, force: true });
    }
  },
);

test(
  "exit zero without validated evidence never completes an attempt",
  { skip: !ready },
  async () => {
    const root = mkdtempSync(join(tmpdir(), "workforce-boundary-false-done-"));
    const store = new StateStore(root);
    try {
      store.initialize();
      store.createCompany({ id: "acme", name: "Acme" });
      const docker = new ShellProbeDockerClient(["sh", "-c", "exit 0"]);
      const supervisor = new DockerSupervisor(
        store.attempts,
        docker,
        store.audit,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          process(attempt, artifacts) {
            if (artifacts.length === 0)
              return Promise.reject(new Error(`No validated artifacts for attempt ${attempt.id}`));
            return Promise.resolve();
          },
        },
      );
      supervisor.enqueue({
        id: "boundary-false-done",
        companyId: "acme",
        taskId: "task",
        employeeId: "worker",
        sandbox: spec(),
        command: ["opencode", "run", "--model", "openai/gpt-5", "Complete task"],
        secretNames: [],
        ephemeralSecretNames: [],
      });
      await supervisor.tick();
      await supervisor.waitForIdle();
      assert.equal(store.attempts.get("boundary-false-done").status, "failed");
    } finally {
      store.close();
      rmSync(root, { recursive: true, force: true });
    }
  },
);

class ShellProbeDockerClient extends ExecaDockerClient {
  concurrent = 0;
  constructor(private readonly probe: string[] = ["sh", "-c", "true"]) {
    super(egress);
  }
  override async start(
    sandbox: SandboxSpec,
    attemptId: string,
    _command: string[],
    secretEnvironment?: Record<string, string>,
    runtimeEnvironment?: Record<string, string>,
  ): Promise<AttemptResult> {
    this.concurrent += 1;
    try {
      return await super.start(
        sandbox,
        attemptId,
        this.probe,
        secretEnvironment,
        runtimeEnvironment,
      );
    } finally {
      this.concurrent -= 1;
    }
  }
}

/** Best-effort cleanup runner: ignores any docker failure so finally blocks never mask results. */
async function exec(file: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve) => {
    execFile(file, args, { timeout: 30_000 }, () => {
      resolve();
    });
  });
}

function spawnDetached(file: string, args: string[]): void {
  spawn(file, args, { stdio: "ignore", detached: true }).unref();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
