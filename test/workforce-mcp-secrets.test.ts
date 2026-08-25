import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { EncryptedSecretStore } from "../src/secrets/encrypted-secret-store.js";
import { StateStore } from "../src/storage/state-store.js";
import type { WorkforceMcpPrincipal } from "../src/workforce-mcp/mcp-principal.js";
import { WorkforceMcpSecretService } from "../src/workforce-mcp/workforce-mcp-secret-service.js";
import { createWorkforceMcpServer } from "../src/workforce-mcp/workforce-mcp-server.js";

test("agents manage only task-scoped credentials while CEO owns all company credentials", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-secrets-"));
  const store = new StateStore(root);
  store.initialize();
  const secrets = new EncryptedSecretStore(root, (event, data) => {
    store.append(event, data.employeeId ?? "secret-store", data.companyId, { name: data.name });
  });
  secrets.initialize();
  try {
    store.createCompany({ id: "acme", name: "Acme" });
    store.createCompany({ id: "other", name: "Other" });
    secrets.set("acme", "ALLOWED_TOKEN", "allowed-value", {
      employeeIds: ["worker"],
      taskIds: ["task-1"],
    });
    secrets.set("acme", "PRIVATE_TOKEN", "private-value", {
      employeeIds: ["other-worker"],
      taskIds: ["task-2"],
    });
    const employee = principal("employee", "worker", "task-1", ["secret:read", "secret:write"]);
    const service = new WorkforceMcpSecretService(store, secrets);
    assert.deepEqual(
      service.list(employee, "acme").map(({ name }) => name),
      ["ALLOWED_TOKEN"],
    );
    assert.equal(service.get(employee, "acme", "ALLOWED_TOKEN").value, "allowed-value");
    assert.throws(() => service.get(employee, "acme", "PRIVATE_TOKEN"), /access denied/);
    const created = service.set(employee, {
      companyId: "acme",
      name: "TASK_API_KEY",
      value: "task-value",
      employeeIds: ["*"],
      taskIds: ["*"],
    });
    assert.deepEqual(created.scope, { employeeIds: ["worker"], taskIds: ["task-1"] });
    assert.throws(() => {
      service.remove(employee, "acme", "PRIVATE_TOKEN");
    }, /access denied/);
    service.remove(employee, "acme", "TASK_API_KEY");

    const ceo = principal("ceo", "ceo", "ceo-cycle", [
      "secret:read",
      "secret:write",
      "secret:manage",
    ]);
    assert.deepEqual(
      service.list(ceo, "acme").map(({ name }) => name),
      ["ALLOWED_TOKEN", "PRIVATE_TOKEN"],
    );
    assert.equal(service.get(ceo, "acme", "PRIVATE_TOKEN").value, "private-value");
    assert.throws(() => service.list(ceo, "other-company"), /company access denied/);
    assert.doesNotMatch(JSON.stringify(store.audit.list("acme")), /allowed-value|private-value/);

    const server = createWorkforceMcpServer(store, employee, secrets);
    const client = new Client({ name: "secret-tools-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const names = (await client.listTools()).tools.map(({ name }) => name);
    assert.ok(names.includes("list_secrets"));
    assert.ok(names.includes("get_secret"));
    assert.ok(names.includes("set_secret"));
    assert.ok(names.includes("remove_secret"));
    await client.close();
    await server.close();
  } finally {
    secrets.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function principal(
  role: WorkforceMcpPrincipal["role"],
  employeeId: string,
  taskId: string,
  capabilities: WorkforceMcpPrincipal["capabilities"],
): WorkforceMcpPrincipal {
  return {
    id: `${role}-attempt`,
    role,
    companyIds: ["acme"],
    employeeId,
    taskId,
    attemptId: `${role}-attempt`,
    capabilities,
  };
}
