import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { SandboxSpec } from "../src/domain.js";
import { StateStore } from "../src/storage/state-store.js";
import type { AttemptResult } from "../src/supervision/attempt-types.js";
import type { DockerClient } from "../src/supervision/docker-client.js";
import { DockerSupervisor } from "../src/supervision/docker-supervisor.js";

class FakeDockerClient implements DockerClient {
  online = true;
  starts: string[] = [];
  stops: string[] = [];
  containers: string[] = [];
  private readonly pending = new Map<string, (result: AttemptResult) => void>();
  available() {
    return Promise.resolve(this.online);
  }
  createVolume() {
    return Promise.resolve();
  }
  exportVolume() {
    return Promise.resolve();
  }
  async start(_spec: SandboxSpec, attemptId: string): Promise<AttemptResult> {
    this.starts.push(attemptId);
    return await new Promise((resolve) => this.pending.set(attemptId, resolve));
  }
  stop(containerName: string) {
    this.stops.push(containerName);
    const id = containerName.replace(/^workforce-/, "");
    this.complete(id, 143);
    return Promise.resolve();
  }
  managedContainers() {
    return Promise.resolve(this.containers);
  }
  removeContainer(containerName: string) {
    this.containers = this.containers.filter((name) => name !== containerName);
    return Promise.resolve();
  }
  complete(id: string, exitCode = 0, stdout = "bounded output") {
    this.pending.get(id)?.({ exitCode, stdout, stderr: "", timedOut: false });
    this.pending.delete(id);
  }
}

const sandbox: SandboxSpec = {
  jobId: "job-one",
  profile: "engineering",
  image: "workforce-agent:0.1.0",
  engine: "opencode",
  networkMode: "inference-only",
  allowedHosts: [],
  readOnlyRoot: true,
  nonRoot: true,
  capDropAll: true,
  noNewPrivileges: true,
  workspace: { type: "volume", name: "workforce-job-one" },
  inputs: [],
  tmpfs: ["/tmp:rw,noexec,nosuid,size=256m"],
  cpu: 1,
  memoryMb: 512,
  pids: 64,
  timeoutSeconds: 60,
  tools: ["shell"],
  decisions: [],
  rejectedCapabilities: [],
};

async function until(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error("Timed out waiting for supervisor state");
}

test("supervisor runs two attempts, queues the third, refills capacity, and cleans orphans", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-supervisor-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const docker = new FakeDockerClient();
    const supervisor = new DockerSupervisor(
      store.attempts,
      docker,
      store.audit,
      undefined,
      (running) => ({ totalMemoryMb: 16_000, availableMemoryMb: 8_000, running }),
    );
    for (const id of ["attempt-1", "attempt-2", "attempt-3"])
      supervisor.enqueue({
        id,
        companyId: "acme",
        taskId: `task-${id}`,
        employeeId: id,
        sandbox: { ...sandbox, workspace: { type: "volume", name: `volume-${id}` } },
        command: ["opencode", "run", "--model", "openai/gpt-5", "Complete task"],
        secretNames: [],
        ephemeralSecretNames: [],
      });
    await supervisor.tick();
    await until(() => docker.starts.length === 2);
    assert.equal(store.attempts.queued(10).length, 1);
    docker.complete("attempt-1");
    await until(() => docker.starts.length === 3);
    docker.complete("attempt-2");
    docker.complete("attempt-3");
    await supervisor.waitForIdle();
    assert.deepEqual(
      ["attempt-1", "attempt-2", "attempt-3"].map((id) => store.attempts.get(id).status),
      ["succeeded", "succeeded", "succeeded"],
    );
    docker.containers = ["workforce-orphan"];
    const recovery = await supervisor.reconcile();
    assert.deepEqual(recovery.removedOrphans, ["workforce-orphan"]);
    assert.deepEqual(docker.containers, []);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("supervisor redacts injected secrets before persisting container output", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-redaction-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const docker = new FakeDockerClient();
    const supervisor = new DockerSupervisor(
      store.attempts,
      docker,
      store.audit,
      undefined,
      (running) => ({ totalMemoryMb: 16_000, availableMemoryMb: 8_000, running }),
      () => ({ TOKEN: "top-secret" }),
      undefined,
      store.executionEvidence,
    );
    supervisor.enqueue({
      id: "redacted",
      companyId: "acme",
      taskId: "task",
      employeeId: "worker",
      sandbox,
      command: ["opencode", "run", "--model", "openai/gpt-5", "Complete task"],
      secretNames: ["TOKEN"],
      ephemeralSecretNames: [],
    });
    await supervisor.tick();
    await until(() => docker.starts.length === 1);
    docker.complete("redacted", 0, "token=top-secret");
    await supervisor.waitForIdle();
    const persisted = store.db
      .prepare("SELECT payload_json FROM raw_attempt_events WHERE attempt_id=?")
      .get("redacted") as { payload_json: string };
    assert.doesNotMatch(persisted.payload_json, /top-secret/);
    assert.match(persisted.payload_json, /\[REDACTED\]/);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("Docker unavailability blocks queued execution without host fallback", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-no-docker-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const docker = new FakeDockerClient();
    docker.online = false;
    const supervisor = new DockerSupervisor(store.attempts, docker, store.audit);
    supervisor.enqueue({
      id: "blocked",
      companyId: "acme",
      taskId: "task",
      employeeId: "worker",
      sandbox,
      command: ["opencode", "run", "--model", "openai/gpt-5", "Complete task"],
      secretNames: [],
      ephemeralSecretNames: [],
    });
    await supervisor.tick();
    assert.equal(store.attempts.get("blocked").status, "infrastructure-blocked");
    assert.equal(docker.starts.length, 0);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
