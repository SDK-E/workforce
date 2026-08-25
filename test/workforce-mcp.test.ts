import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StateStore } from "../src/storage/state-store.js";
import type { WorkforceMcpPrincipal } from "../src/workforce-mcp/mcp-principal.js";
import { WorkforceMcpQueryService } from "../src/workforce-mcp/workforce-mcp-query-service.js";
import { createWorkforceMcpServer } from "../src/workforce-mcp/workforce-mcp-server.js";

test("Workforce MCP reads are capability checked, company isolated, and audited", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-"));
  const store = new StateStore(root);
  store.initialize();
  try {
    const first = store.createCompany({ id: "first-co", name: "First", mission: "Build" });
    const second = store.createCompany({ id: "second-co", name: "Second", mission: "Research" });
    const principal: WorkforceMcpPrincipal = {
      id: "external-admin",
      role: "human-admin",
      companyIds: [first.id],
      employeeId: null,
      capabilities: ["company:read", "task:read"],
    };
    const service = new WorkforceMcpQueryService(store);
    assert.equal(service.companyOverview(principal, first.id).name, "First");
    assert.deepEqual(service.listTasks(principal, first.id), []);
    assert.throws(() => service.companyOverview(principal, second.id), /company access denied/);
    assert.ok(store.audit.list(first.id).some(({ type }) => type === "workforce-mcp.read"));
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("agent MCP participates in joined rooms, mail, meetings, and assigned task checkpoints", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-agent-"));
  const store = new StateStore(root);
  store.initialize();
  const server = createWorkforceMcpServer(store, {
    id: "ceo-session",
    role: "employee",
    companyIds: ["agent-co"],
    employeeId: "ceo",
    capabilities: [
      "company:read",
      "task:read",
      "message:read",
      "message:write",
      "mail:read",
      "mail:write",
      "meeting:read",
      "meeting:write",
      "checkpoint:write",
    ],
  });
  const client = new Client({ name: "workforce-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    store.createCompany({ id: "agent-co", name: "Agent Company" });
    const joined = store.conversations.rooms.create("agent-co", "Delivery", "project", "ceo");
    const privateRoom = store.conversations.rooms.create(
      "agent-co",
      "Private",
      "leadership",
      "arm",
    );
    store.conversations.rooms.addMember("agent-co", joined.id, "ceo", "member", "ceo");
    const task = store.createTask({
      id: "assigned-work",
      companyId: "agent-co",
      objective: "Deliver production work",
      acceptanceCriteria: ["Verified"],
      risk: "low",
      dataSensitivity: "internal",
      managerId: "arm",
      assigneeId: "ceo",
    });
    store.createTask({
      id: "arm-only-work",
      companyId: "agent-co",
      objective: "ARM private work",
      acceptanceCriteria: ["Verified"],
      risk: "low",
      dataSensitivity: "internal",
      managerId: "ceo",
      assigneeId: "arm",
    });
    const meeting = store.meetings.create({
      companyId: "agent-co",
      title: "Delivery sync",
      organizerId: "arm",
      participantIds: ["ceo"],
      agenda: ["Progress"],
      scheduledAt: new Date().toISOString(),
    });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some(({ name }) => name === "send_message"));
    assert.ok(!tools.tools.some(({ name }) => name === "get_attempt"));
    const listedTasks = await client.callTool({
      name: "list_tasks",
      arguments: { companyId: "agent-co" },
    });
    assert.match(JSON.stringify(listedTasks.content), /assigned-work/);
    assert.doesNotMatch(JSON.stringify(listedTasks.content), /arm-only-work/);
    const overview = await client.readResource({
      uri: "workforce://companies/agent-co/overview",
    });
    assert.match(JSON.stringify(overview.contents), /Agent Company/);
    const message = await client.callTool({
      name: "send_message",
      arguments: { companyId: "agent-co", roomId: joined.id, body: "Work has started" },
    });
    assert.equal(message.isError, undefined);
    const denied = await client.callTool({
      name: "send_message",
      arguments: { companyId: "agent-co", roomId: privateRoom.id, body: "Should fail" },
    });
    assert.equal(denied.isError, true);
    await client.callTool({
      name: "send_mail",
      arguments: {
        companyId: "agent-co",
        recipientId: "arm",
        subject: "Status",
        body: "Delivery is underway",
      },
    });
    await client.callTool({
      name: "contribute_meeting",
      arguments: { companyId: "agent-co", meetingId: meeting.id, body: "Implementation started" },
    });
    await client.callTool({
      name: "update_task_checkpoint",
      arguments: {
        companyId: "agent-co",
        taskId: task.id,
        summary: "Foundation complete",
        progressPercent: 35,
        blockers: [],
      },
    });
    assert.equal(store.mail.inbox("agent-co", "agent", "arm").length, 1);
    assert.equal(store.meetingContributions.list("agent-co", meeting.id).length, 1);
    assert.equal(store.taskCheckpoints.list("agent-co", task.id)[0]?.progressPercent, 35);
    assert.ok(
      store.audit
        .list("agent-co")
        .some(({ type, actor }) => type === "workforce-mcp.mutation" && actor === "ceo-session"),
    );
  } finally {
    await client.close();
    await server.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("Workforce MCP refuses undisclosed capabilities", () => {
  const principal: WorkforceMcpPrincipal = {
    id: "employee",
    role: "employee",
    companyIds: ["first-co"],
    employeeId: "worker",
    capabilities: ["task:read"],
  };
  assert.throws(
    () => new WorkforceMcpQueryService({} as StateStore).companyOverview(principal, "first-co"),
    /capability denied/,
  );
});
