import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { SandboxSpec } from "../src/domain.js";
import { StateStore } from "../src/storage/state-store.js";
import { createWorkforceMcpServer } from "../src/workforce-mcp/workforce-mcp-server.js";

const sandbox: SandboxSpec = {
  jobId: "mcp-work",
  profile: "engineering",
  image: "workforce-agent:0.1.0",
  engine: "opencode",
  networkMode: "inference-only",
  allowedHosts: [],
  readOnlyRoot: true,
  nonRoot: true,
  capDropAll: true,
  noNewPrivileges: true,
  workspace: { type: "volume", name: "mcp-work" },
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

test("agent MCP submits governed work idempotently and cannot escape its task", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-work-"));
  const store = new StateStore(root);
  store.initialize();
  store.createCompany({ id: "work-co", name: "Work Company" });
  const task = store.createTask({
    id: "agent-task",
    companyId: "work-co",
    objective: "Ship verified work",
    acceptanceCriteria: ["Artifact is validated"],
    risk: "low",
    dataSensitivity: "internal",
    managerId: "arm",
    assigneeId: "ceo",
    reviewerId: "arm",
  });
  store.createTask({
    id: "other-task",
    companyId: "work-co",
    objective: "Other work",
    acceptanceCriteria: ["Done"],
    risk: "low",
    dataSensitivity: "internal",
    managerId: "ceo",
    assigneeId: "arm",
  });
  const attempt = store.attempts.enqueue({
    id: "agent-attempt",
    companyId: "work-co",
    taskId: task.id,
    employeeId: "ceo",
    sandbox,
    command: ["opencode", "run", "work"],
    secretNames: [],
    ephemeralSecretNames: [],
  });
  const artifact = store.artifacts.add({
    companyId: "work-co",
    taskId: task.id,
    attemptId: attempt.id,
    relativePath: "result.txt",
    mediaType: "text/plain",
    sizeBytes: 8,
    sha256: "a".repeat(64),
    storagePath: "/artifacts/result.txt",
  });
  const server = createWorkforceMcpServer(store, {
    id: "attempt:agent-attempt",
    role: "employee",
    companyIds: ["work-co"],
    employeeId: "ceo",
    taskId: task.id,
    attemptId: attempt.id,
    capabilities: ["participation:write"],
  });
  const client = new Client({ name: "work-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const approvalInput = {
      companyId: "work-co",
      taskId: task.id,
      idempotencyKey: "approval-0001",
      rationale: "Production release needs approval",
    };
    await requestTwice(client, "request_approval", approvalInput);
    assert.equal(store.approvalsRepository.list("work-co").length, 1);
    await assertChangedReplayDenied(client, approvalInput);

    const claim = await client.callTool({
      name: "submit_claim",
      arguments: {
        companyId: "work-co",
        taskId: task.id,
        idempotencyKey: "claim-0000001",
        subjectId: task.id,
        predicate: "artifact.validated",
        value: true,
        evidenceIds: [artifact.id],
        confidence: 0.95,
      },
    });
    assert.equal(claim.isError, undefined, JSON.stringify(claim.content));
    const reference = await client.callTool({
      name: "attach_artifact_reference",
      arguments: {
        companyId: "work-co",
        taskId: task.id,
        idempotencyKey: "artifact-0001",
        artifactId: artifact.id,
        note: "Primary deliverable",
      },
    });
    assert.equal(reference.isError, undefined, JSON.stringify(reference.content));
    const handoff = await client.callTool({
      name: "request_help",
      arguments: {
        companyId: "work-co",
        taskId: task.id,
        idempotencyKey: "help-00000001",
        kind: "handoff",
        summary: "Review the release evidence",
        context: { phase: "release" },
        evidenceIds: [artifact.id],
      },
    });
    assert.equal(handoff.isError, undefined, JSON.stringify(handoff.content));
    const automation = await client.callTool({
      name: "request_automation",
      arguments: {
        companyId: "work-co",
        taskId: task.id,
        idempotencyKey: "automation-01",
        title: "Repeat validation",
        trigger: { kind: "interval", everySeconds: 3600 },
        objective: "Validate the latest release",
        acceptanceCriteria: ["Validation passes"],
        rationale: "This check repeats for each release",
        estimatedRunsSaved: 12,
      },
    });
    assert.equal(automation.isError, undefined, JSON.stringify(automation.content));
    assert.equal(store.taskHandoffs.list("work-co", task.id).length, 1);
    assert.equal(store.automations.list("work-co", "proposed").length, 1);
    assertSingleArtifactReference(store);
    const denied = await client.callTool({
      name: "request_approval",
      arguments: { ...approvalInput, taskId: "other-task", idempotencyKey: "approval-denied" },
    });
    assert.equal(denied.isError, true);
  } finally {
    await client.close();
    await server.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function assertSingleArtifactReference(store: StateStore): void {
  const row = store.db.prepare("SELECT count(*) count FROM artifact_references").get() as {
    count: number;
  };
  assert.equal(row.count, 1);
}

async function requestTwice(
  client: Client,
  name: string,
  arguments_: Record<string, unknown>,
): Promise<void> {
  await client.callTool({ name, arguments: arguments_ });
  await client.callTool({ name, arguments: arguments_ });
}

async function assertChangedReplayDenied(
  client: Client,
  input: Record<string, unknown>,
): Promise<void> {
  const response = await client.callTool({
    name: "request_approval",
    arguments: { ...input, rationale: "A different request" },
  });
  assert.equal(response.isError, true);
}
