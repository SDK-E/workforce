import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AttemptCapabilityResolver } from "../src/integrations/attempt-capability-resolver.js";
import { MailAttemptBridge } from "../src/integrations/mail-attempt-bridge.js";
import type { ArtifactRecord } from "../src/acceptance/artifact-types.js";
import type { AttemptRecord } from "../src/supervision/attempt-types.js";
import { StateStore } from "../src/storage/state-store.js";

test("MCP, Beads, and mail capabilities are scoped, audited, and reversible", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-integrations-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "alpha", name: "Alpha" });
    store.createCompany({ id: "beta", name: "Beta" });
    const project = createProject(store, "alpha");
    store.mcpServers.save(
      {
        companyId: "alpha",
        id: "research",
        name: "Research tools",
        transport: "http",
        endpoint: "https://mcp.example.test/mcp",
        command: [],
        toolAllowlist: ["search", "read-resource"],
        secretRequirements: ["MCP_TOKEN"],
        credentialBindings: [{ target: "Authorization", secretName: "MCP_TOKEN" }],
        status: "active",
        health: "healthy",
      },
      "arm",
    );
    const beads = store.projectIntegrations.save(
      {
        companyId: "alpha",
        projectId: project.id,
        provider: "beads",
        config: { databasePath: ".beads", sync: "workspace" },
        secretRequirements: [],
        status: "active",
      },
      "ceo",
    );
    const task = store.createTask({
      companyId: "alpha",
      projectId: project.id,
      objective: "Research and update the project issue graph",
      acceptanceCriteria: ["Evidence and issue graph are persisted"],
      risk: "medium",
      dataSensitivity: "internal",
      tools: ["mcp:research/search", "integration:beads"],
      managerId: "ceo",
      assigneeId: "ceo",
    });
    const capabilities = new AttemptCapabilityResolver(
      store.mcpServers,
      store.projectIntegrations,
    ).resolve(task, "kilo");
    assert.deepEqual(capabilities.secretNames, ["MCP_TOKEN"]);
    assert.match(capabilities.environment.KILO_CONFIG_CONTENT ?? "", /\{env:MCP_TOKEN\}/);
    assert.doesNotMatch(capabilities.environment.KILO_CONFIG_CONTENT ?? "", /secret-value/);
    assert.match(capabilities.environment.WORKFORCE_PROJECT_INTEGRATIONS ?? "", /beads/);
    assert.equal(
      store.projectIntegrations.setStatus("alpha", project.id, "beads", "archived", "human").status,
      "archived",
    );
    assert.equal(
      store.projectIntegrations.setStatus("alpha", project.id, "beads", "active", "human").status,
      "active",
    );
    assert.equal(beads.companyId, "alpha");
    assertUnsafeConfigurationsAreRejected(store, project.id);

    const outbound = store.mail.send({
      companyId: "alpha",
      senderKind: "agent",
      senderId: "ceo",
      recipientKind: "human",
      recipientId: "owner",
      subject: "Decision needed",
      body: "Please review the budget exception.",
    });
    store.mail.send({
      companyId: "alpha",
      senderKind: "human",
      senderId: "owner",
      recipientKind: "agent",
      recipientId: "arm",
      subject: "Approved",
      body: "Proceed within the revised budget.",
    });
    assert.equal(store.mail.inbox("alpha", "human", "owner").length, 1);
    assert.equal(store.mail.inbox("alpha", "agent", "arm").length, 1);
    assert.equal(store.mail.archive("alpha", outbound.id, "owner").status, "archived");
    assert.equal(store.mail.restore("alpha", outbound.id, "owner").status, "sent");
    assert.equal(store.mail.inbox("beta", "human", "owner").length, 0);
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("agent attempts receive scoped inbox snapshots and import validated outboxes", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mail-bridge-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    store.mail.send({
      companyId: "acme",
      senderKind: "human",
      senderId: "owner",
      recipientKind: "agent",
      recipientId: "ceo",
      subject: "Status request",
      body: "Send the current evidence summary.",
    });
    const task = store.createTask({
      companyId: "acme",
      objective: "Respond to company mail",
      acceptanceCriteria: ["A response is sent"],
      risk: "low",
      dataSensitivity: "internal",
      tools: ["workforce-mail"],
      managerId: "ceo",
      assigneeId: "ceo",
    });
    const bridge = new MailAttemptBridge(store.mail);
    const environment = bridge.prepare(task);
    assert.match(environment.WORKFORCE_MAIL_INBOX ?? "", /Status request/);
    const outboxPath = join(root, "workforce-mail-outbox.json");
    writeFileSync(
      outboxPath,
      JSON.stringify([
        {
          recipientKind: "human",
          recipientId: "owner",
          subject: "Evidence summary",
          body: "The verified work is on track.",
        },
      ]),
    );
    await bridge.importOutbox(
      {
        companyId: "acme",
        employeeId: "ceo",
        environment: { WORKFORCE_MAIL_OUTBOX_PATH: "/work/workforce-mail-outbox.json" },
      } as unknown as AttemptRecord,
      [{ relativePath: "workforce-mail-outbox.json", storagePath: outboxPath }] as ArtifactRecord[],
    );
    assert.equal(store.mail.inbox("acme", "human", "owner")[0]?.subject, "Evidence summary");
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function assertUnsafeConfigurationsAreRejected(store: StateStore, projectId: string): void {
  assert.throws(
    () =>
      store.mcpServers.save(
        {
          companyId: "alpha",
          id: "unsafe",
          name: "Unsafe",
          transport: "http",
          endpoint: "https://user:secret@example.test/mcp",
          command: [],
          toolAllowlist: ["*"],
          secretRequirements: [],
          credentialBindings: [],
          status: "active",
          health: "healthy",
        },
        "human",
      ),
    /embedded credentials/,
  );
  assert.throws(
    () =>
      store.projectIntegrations.save(
        {
          companyId: "alpha",
          projectId,
          provider: "unsafe",
          config: { apiToken: "plaintext-secret" },
          secretRequirements: ["API_TOKEN"],
          status: "active",
        },
        "human",
      ),
    /declared secret/,
  );
  assert.throws(
    () =>
      store.projectIntegrations.save(
        {
          companyId: "alpha",
          projectId,
          provider: "undeclared",
          config: { authorization: "{env:API_TOKEN}" },
          secretRequirements: [],
          status: "active",
        },
        "human",
      ),
    /declared secret/,
  );
}

function createProject(store: StateStore, companyId: string) {
  const objective = store.createStrategyItem({
    companyId,
    kind: "objective",
    name: "Build dependable products",
    ownerId: "ceo",
    managerId: "ceo",
    successMeasures: ["Acceptance passes"],
  });
  const initiative = store.createStrategyItem({
    companyId,
    kind: "initiative",
    parentId: objective.id,
    name: "Product delivery",
    ownerId: "ceo",
    managerId: "ceo",
    successMeasures: ["Projects deliver"],
  });
  return store.createStrategyItem({
    companyId,
    kind: "project",
    parentId: initiative.id,
    name: "Work graph",
    ownerId: "ceo",
    managerId: "ceo",
    successMeasures: ["Issue graph stays current"],
  });
}
