import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StateStore } from "../src/storage/state-store.js";
import { createWorkforceMcpServer } from "../src/workforce-mcp/workforce-mcp-server.js";

const hireJob = {
  id: "browser-specialist",
  title: "Browser specialist",
  objective: "Validate production journeys in a browser",
  risk: "medium" as const,
  dataSensitivity: "internal" as const,
  capabilities: {
    filesystemWrite: true,
    shell: true,
    sourceControl: false,
    browser: true,
    publicInternet: true,
    packageInstall: true,
    buildTools: ["playwright"],
    languages: ["typescript"],
  },
  inputs: [],
  outputs: [{ path: "report.md", required: true }],
  network: {
    mode: "audited-internet" as const,
    allowedHosts: [],
    reason: "Validate public production pages",
    approvedBy: "ceo",
  },
  resources: { cpu: 1, memoryMb: 768, pids: 128, timeoutSeconds: 1_800 },
  enginePreference: ["opencode" as const],
  acceptanceCriteria: ["Critical browser journeys pass"],
};

test("CEO MCP management is idempotent, company scoped, capability filtered, and audited", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-management-"));
  const store = new StateStore(root);
  store.initialize();
  store.createCompany({ id: "managed-co", name: "Managed" });
  store.createCompany({ id: "other-co", name: "Other" });
  insertTestEmployee(store);
  const server = createWorkforceMcpServer(store, {
    id: "ceo-management-session",
    role: "ceo",
    companyIds: ["managed-co"],
    employeeId: "ceo",
    capabilities: ["work:mutate", "workforce:manage"],
  });
  const client = new Client({ name: "management-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some(({ name }) => name === "create_objective"));
    assert.ok(tools.tools.some(({ name }) => name === "transition_employment"));
    assert.ok(!tools.tools.some(({ name }) => name === "get_secret"));

    const objective = {
      companyId: "managed-co",
      idempotencyKey: "objective-0001",
      name: "Reach production readiness",
      ownerId: "ceo",
      managerId: "ceo",
      successMeasures: ["All acceptance gates pass"],
      requirements: ["Evidence is durable"],
      constraints: [],
      risks: [],
    };
    await callOk(client, "create_objective", objective);
    await callOk(client, "create_objective", objective);
    assert.equal(store.strategyRepository.list("managed-co", "objective").length, 1);

    await callOk(client, "create_task", {
      companyId: "managed-co",
      idempotencyKey: "task-create-001",
      id: "managed-task",
      objective: "Deliver a verified release",
      acceptanceCriteria: ["Independent validation passes"],
      risk: "medium",
      dataSensitivity: "internal",
      managerId: "ceo",
    });
    await callOk(client, "assign_task", {
      companyId: "managed-co",
      idempotencyKey: "task-assign-001",
      taskId: "managed-task",
      employeeId: "arm",
    });
    assert.equal(store.tasksRepository.get("managed-co", "managed-task")?.assigneeId, "arm");

    const approvalId = store.approvalsRepository.request(
      "managed-co",
      "task",
      "managed-task",
      "arm",
      "Release decision",
    );
    await callOk(client, "decide_approval", {
      companyId: "managed-co",
      idempotencyKey: "approval-decision-1",
      approvalId,
      event: "APPROVE",
      rationale: "Evidence is sufficient",
    });
    assert.equal(store.approvalsRepository.list("managed-co")[0]?.status, "approved");

    await callOk(client, "transition_employment", {
      companyId: "managed-co",
      idempotencyKey: "employment-promote-1",
      employeeId: "worker",
      event: "PROMOTE",
      rationale: "Probation criteria passed",
    });
    assert.equal(store.employees("managed-co").find(({ id }) => id === "worker")?.status, "active");
    await callOk(client, "propose_hire", {
      companyId: "managed-co",
      idempotencyKey: "hire-proposal-01",
      job: hireJob,
    });
    assert.equal(store.employment.proposalList("managed-co").length, 1);

    const durableDenied = await client.callTool({
      name: "transition_employment",
      arguments: {
        companyId: "managed-co",
        idempotencyKey: "employment-0001",
        employeeId: "arm",
        event: "SUSPEND",
        rationale: "Must be denied",
      },
    });
    assert.equal(durableDenied.isError, true);
    const companyDenied = await client.callTool({
      name: "create_objective",
      arguments: { ...objective, companyId: "other-co", idempotencyKey: "objective-denied" },
    });
    assert.equal(companyDenied.isError, true);
    assert.ok(
      store.audit
        .list("managed-co")
        .some(
          ({ type, actor }) =>
            type === "workforce-mcp.management" && actor === "ceo-management-session",
        ),
    );
  } finally {
    await client.close();
    await server.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

async function callOk(
  client: Client,
  name: string,
  arguments_: Record<string, unknown>,
): Promise<void> {
  const result = await client.callTool({ name, arguments: arguments_ });
  assert.equal(result.isError, undefined, JSON.stringify(result.content));
}

function insertTestEmployee(store: StateStore): void {
  store.db
    .prepare("INSERT INTO employees VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(
      "worker",
      "managed-co",
      "Test Worker",
      "Engineer",
      "contributor",
      "engineering",
      "arm",
      "probation",
      "[]",
      "[]",
      new Date().toISOString(),
    );
}
