import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { StateStore } from "../src/storage/state-store.js";
import type { WorkforceMcpPrincipal } from "../src/workforce-mcp/mcp-principal.js";
import { WorkforceMcpQueryService } from "../src/workforce-mcp/workforce-mcp-query-service.js";

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
