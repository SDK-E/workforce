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
import { TaskExecutionService } from "../src/tasks/task-execution-service.js";
import { AttemptCapabilityResolver } from "../src/integrations/attempt-capability-resolver.js";

class InstantDocker implements DockerClient {
  started: SandboxSpec[] = [];
  runtimeEnvironment: Record<string, string> = {};
  available() {
    return Promise.resolve(true);
  }
  createVolume() {
    return Promise.resolve();
  }
  exportVolume() {
    return Promise.resolve();
  }
  start(
    spec: SandboxSpec,
    _attemptId: string,
    _command: string[],
    secretEnvironment: Record<string, string> = {},
    runtimeEnvironment: Record<string, string> = {},
  ): Promise<AttemptResult> {
    this.started.push(spec);
    void secretEnvironment;
    this.runtimeEnvironment = runtimeEnvironment;
    return Promise.resolve({ exitCode: 0, stdout: "done", stderr: "", timedOut: false });
  }
  stop() {
    return Promise.resolve();
  }
  managedContainers() {
    return Promise.resolve([]);
  }
  removeContainer() {
    return Promise.resolve();
  }
}

test("approved task contracts queue verified inference-capable Docker execution", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-task-execution-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    store.models.save({
      companyId: "acme",
      id: "production-model",
      engine: "opencode",
      model: "openai/gpt-5",
      provider: "openai",
      capabilities: ["engineering"],
      supportedRoles: ["general"],
      contextLimit: 128_000,
      freePreferred: false,
      localModel: false,
      priority: 100,
      health: "healthy",
      verifiedAt: new Date().toISOString(),
      verificationReceiptId: "model-check-1",
      failureClass: null,
    });
    store.mcpServers.save(
      {
        companyId: "acme",
        id: "quality",
        name: "Quality tools",
        transport: "stdio",
        endpoint: null,
        command: ["quality-mcp"],
        toolAllowlist: ["inspect"],
        secretRequirements: [],
        credentialBindings: [],
        status: "active",
        health: "unknown",
        healthReceiptId: null,
      },
      "arm",
    );
    store.mcpServers.recordHealth("acme", "quality", "healthy", { protocol: "mcp" }, "probe");
    const objective = store.createStrategyItem({
      companyId: "acme",
      kind: "objective",
      name: "Ship dependable software",
      ownerId: "ceo",
      managerId: "ceo",
      successMeasures: ["Acceptance passes"],
    });
    const initiative = store.createStrategyItem({
      companyId: "acme",
      kind: "initiative",
      parentId: objective.id,
      name: "API delivery",
      ownerId: "ceo",
      managerId: "ceo",
      successMeasures: ["Projects ship"],
    });
    const project = store.createStrategyItem({
      companyId: "acme",
      kind: "project",
      parentId: initiative.id,
      name: "API",
      ownerId: "ceo",
      managerId: "ceo",
      successMeasures: ["Issue graph stays current"],
    });
    store.projectIntegrations.save(
      {
        companyId: "acme",
        projectId: project.id,
        provider: "beads",
        config: { databasePath: ".beads" },
        secretRequirements: [],
        status: "active",
      },
      "human",
    );
    const task = store.createTask({
      id: "build-api",
      companyId: "acme",
      projectId: project.id,
      objective: "Build and test the API",
      acceptanceCriteria: ["Tests pass"],
      risk: "medium",
      dataSensitivity: "internal",
      capabilities: ["engineering", "language:typescript", "language:python", "framework:laravel"],
      tools: ["mcp:quality/inspect", "integration:beads"],
      managerId: "ceo",
      assigneeId: "ceo",
    });
    store.transitionTask("acme", task.id, "REQUEST_APPROVAL", "ceo", "Ready for approval");
    store.transitionTask("acme", task.id, "APPROVE", "human", "Approved");
    const docker = new InstantDocker();
    const supervisor = new DockerSupervisor(store.attempts, docker, store.audit);
    const execution = new TaskExecutionService(
      store.tasksRepository,
      store.models,
      store.tools,
      store.attemptFactory,
      supervisor,
      new AttemptCapabilityResolver(store.mcpServers, store.projectIntegrations),
    );

    const attempt = await execution.start("acme", task.id, "human");
    await supervisor.waitForIdle();

    assert.equal(attempt.sandbox.networkMode, "inference-only");
    assert.equal(attempt.sandbox.profile, "engineering");
    assert.equal(store.tasksRepository.get("acme", task.id)?.status, "starting");
    assert.equal(store.attempts.get(attempt.id).status, "succeeded");
    assert.equal(docker.started.length, 1);
    assert.match(docker.runtimeEnvironment.OPENCODE_CONFIG_CONTENT ?? "", /quality/);
    assert.equal(docker.runtimeEnvironment.WORKFORCE_REQUIRED_TOOLCHAINS, "beads,laravel,python");
    assert.match(attempt.command.at(-1) ?? "", /workforce-toolchain install beads laravel python/);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
