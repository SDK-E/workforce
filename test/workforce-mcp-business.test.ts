import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StateStore } from "../src/storage/state-store.js";
import type { WorkforceMcpPrincipal } from "../src/workforce-mcp/mcp-principal.js";
import { createWorkforceMcpServer } from "../src/workforce-mcp/workforce-mcp-server.js";

test("CEO business MCP converts an isolated pipeline with replay-safe lifecycle actions", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-business-"));
  const store = new StateStore(root);
  store.initialize();
  store.createCompany({ id: "business-co", name: "Business" });
  store.createCompany({ id: "other-co", name: "Other" });
  const principal: WorkforceMcpPrincipal = {
    id: "business-ceo-session",
    role: "ceo",
    companyIds: ["business-co"],
    employeeId: "ceo",
    capabilities: ["business:read", "business:mutate"],
  };
  const connection = await connect(store, principal);
  try {
    const tools = await connection.client.listTools();
    assert.ok(tools.tools.some(({ name }) => name === "list_business_pipeline"));
    assert.ok(tools.tools.some(({ name }) => name === "save_engagement"));

    const opportunityInput = {
      companyId: "business-co",
      idempotencyKey: "opportunity-create-001",
      name: "Automate release operations",
      source: "CEO research",
      problem: "Teams cannot release reliably",
      hypothesis: "A governed delivery system reduces release failures",
      score: 84,
      stage: "validated",
      ownerId: "ceo",
      evidenceIds: ["research-001"],
    };
    const opportunity = await callRecord(connection.client, "save_opportunity", opportunityInput);
    const replay = await callRecord(connection.client, "save_opportunity", opportunityInput);
    assert.equal(replay.id, opportunity.id);
    assert.equal(store.opportunities.list("business-co").length, 1);

    const changedReplay = await connection.client.callTool({
      name: "save_opportunity",
      arguments: { ...opportunityInput, name: "Changed replay" },
    });
    assert.equal(changedReplay.isError, true);

    const lead = await callRecord(connection.client, "save_lead", {
      companyId: "business-co",
      idempotencyKey: "lead-create-0001",
      opportunityId: opportunity.id,
      name: "Release team",
      organization: "Example Client",
      email: "owner@example.test",
      website: "https://example.test",
      source: "Validated opportunity",
      qualificationScore: 91,
      status: "qualified",
      ownerId: "ceo",
      notes: "Problem and budget confirmed",
    });
    const client = await callRecord(connection.client, "save_client", {
      companyId: "business-co",
      idempotencyKey: "client-create-001",
      leadId: lead.id,
      name: "Example Client",
      primaryContact: "Release Owner",
      email: "owner@example.test",
      status: "active",
      ownerId: "ceo",
      notes: "Acquired from validated lead",
    });
    const engagement = await callRecord(connection.client, "save_engagement", {
      companyId: "business-co",
      idempotencyKey: "engagement-create-01",
      clientId: client.id,
      projectId: null,
      name: "Release reliability delivery",
      status: "active",
      scope: "Build and validate the governed release system",
      successCriteria: ["Production acceptance passes"],
      ownerId: "ceo",
      startsAt: null,
      endsAt: null,
    });

    const listed = await callJson(connection.client, "list_business_pipeline", {
      companyId: "business-co",
      query: "release",
      limit: 20,
      offset: 0,
    });
    assert.ok(JSON.stringify(listed).includes(engagement.id));
    await callOk(connection.client, "set_business_record_archived", {
      companyId: "business-co",
      idempotencyKey: "engagement-archive-1",
      recordType: "engagement",
      id: engagement.id,
      archived: true,
    });
    assert.equal(store.engagements.get("business-co", engagement.id)?.status, "archived");
    await callOk(connection.client, "set_business_record_archived", {
      companyId: "business-co",
      idempotencyKey: "engagement-restore-1",
      recordType: "engagement",
      id: engagement.id,
      archived: false,
    });
    assert.equal(store.engagements.get("business-co", engagement.id)?.status, "proposed");

    const companyDenied = await connection.client.callTool({
      name: "list_business_pipeline",
      arguments: { companyId: "other-co", limit: 20, offset: 0 },
    });
    assert.equal(companyDenied.isError, true);
    assert.ok(
      store.audit
        .list("business-co")
        .some(
          ({ type, actor }) =>
            type === "workforce-mcp.business" && actor === "business-ceo-session",
        ),
    );
  } finally {
    await connection.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("business MCP discovery distinguishes ARM read access from employee denial", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-business-authority-"));
  const store = new StateStore(root);
  store.initialize();
  store.createCompany({ id: "authority-co", name: "Authority" });
  try {
    const arm = await connect(store, principal("arm", ["business:read"]));
    const armTools = await arm.client.listTools();
    assert.ok(armTools.tools.some(({ name }) => name === "list_business_pipeline"));
    assert.ok(!armTools.tools.some(({ name }) => name === "save_opportunity"));
    await arm.close();

    const employee = await connect(store, principal("employee", []));
    const employeeTools = await employee.client.listTools();
    assert.ok(!employeeTools.tools.some(({ name }) => name === "list_business_pipeline"));
    assert.ok(!employeeTools.tools.some(({ name }) => name === "save_opportunity"));
    await employee.close();
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function principal(
  role: "arm" | "employee",
  capabilities: WorkforceMcpPrincipal["capabilities"],
): WorkforceMcpPrincipal {
  return {
    id: `${role}-session`,
    role,
    companyIds: ["authority-co"],
    employeeId: role,
    capabilities,
  };
}

async function connect(store: StateStore, principal: WorkforceMcpPrincipal) {
  const server = createWorkforceMcpServer(store, principal);
  const client = new Client({ name: "business-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

async function callRecord(client: Client, name: string, arguments_: Record<string, unknown>) {
  return (await callJson(client, name, arguments_)) as { id: string };
}

async function callJson(
  client: Client,
  name: string,
  arguments_: Record<string, unknown>,
): Promise<unknown> {
  const result = await client.callTool({ name, arguments: arguments_ });
  assert.equal(result.isError, undefined, JSON.stringify(result.content));
  const content = result.content as { type: string; text?: string }[];
  const first = content[0];
  assert.equal(first?.type, "text");
  return JSON.parse(first.text ?? "null");
}

async function callOk(
  client: Client,
  name: string,
  arguments_: Record<string, unknown>,
): Promise<void> {
  await callJson(client, name, arguments_);
}
