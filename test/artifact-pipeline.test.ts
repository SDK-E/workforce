import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { create } from "tar";
import { ArtifactPipeline } from "../src/acceptance/artifact-pipeline.js";
import type { SandboxSpec } from "../src/domain.js";
import { StateStore } from "../src/storage/state-store.js";
import type { AttemptResult } from "../src/supervision/attempt-types.js";
import type { DockerClient } from "../src/supervision/docker-client.js";

class ArchiveDockerClient implements DockerClient {
  constructor(private readonly archive: string) {}
  available = () => Promise.resolve(true);
  createVolume = () => Promise.resolve();
  exportVolume = (_volume: string, _image: string, target: string) =>
    copyFile(this.archive, target);
  start = (): Promise<AttemptResult> =>
    Promise.resolve({ exitCode: 0, stdout: "", stderr: "", timedOut: false });
  stop = () => Promise.resolve();
  managedContainers = () => Promise.resolve([]);
  removeContainer = () => Promise.resolve();
}

const sandbox: SandboxSpec = {
  jobId: "artifact-job",
  profile: "engineering",
  image: "workforce-agent-builder:0.1.0",
  engine: "opencode",
  networkMode: "none",
  allowedHosts: [],
  readOnlyRoot: true,
  nonRoot: true,
  capDropAll: true,
  noNewPrivileges: true,
  workspace: { type: "volume", name: "artifact-volume" },
  inputs: [],
  tmpfs: [],
  cpu: 1,
  memoryMb: 512,
  pids: 64,
  timeoutSeconds: 60,
  tools: ["shell"],
  decisions: [],
  rejectedCapabilities: [],
};

test("artifact pipeline validates, hashes, and rejects secret leakage", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-artifacts-"));
  const source = join(root, "source");
  const archive = join(root, "source.tar");
  const store = new StateStore(join(root, "state"));
  try {
    await mkdir(source);
    await writeFile(join(source, "result.txt"), "verified result");
    await create({ cwd: source, file: archive }, ["result.txt"]);
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const attempt = store.attempts.enqueue({
      id: "artifact-attempt",
      companyId: "acme",
      taskId: "task-one",
      employeeId: "worker",
      sandbox,
      command: ["opencode", "run", "--model", "openai/gpt-5", "Work"],
      secretNames: [],
    });
    const pipeline = new ArtifactPipeline(
      store.root,
      store.artifacts,
      new ArchiveDockerClient(archive),
    );
    const artifacts = await pipeline.finalize(attempt, {});
    assert.equal(artifacts.length, 1);
    assert.equal(artifacts[0]?.relativePath, "result.txt");
    assert.equal(artifacts[0].sha256.length, 64);
    assert.equal(store.artifacts.receipts(attempt.id)[0]?.status, "passed");

    const leakingArchive = join(root, "leaking.tar");
    await writeFile(join(source, "result.txt"), "token-is-secret-value");
    await create({ cwd: source, file: leakingArchive }, ["result.txt"]);
    const leakingAttempt = store.attempts.enqueue({ ...attempt, id: "leaking-attempt" });
    const leakingPipeline = new ArtifactPipeline(
      store.root,
      store.artifacts,
      new ArchiveDockerClient(leakingArchive),
    );
    await assert.rejects(
      leakingPipeline.finalize(leakingAttempt, { TOKEN: "secret-value" }),
      /injected secret/,
    );
    assert.equal(store.artifacts.list(leakingAttempt.id).length, 0);
    assert.equal(store.artifacts.receipts(leakingAttempt.id)[0]?.status, "failed");
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
