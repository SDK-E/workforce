import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AutomationService } from "../src/automations/automation-service.js";
import { StateStore } from "../src/storage/state-store.js";
import type { TaskExecutionService } from "../src/tasks/task-execution-service.js";

test("agents propose automations while humans govern activation and restoration", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-automation-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const proposal = store.automations.propose({
      companyId: "acme",
      requestedBy: "ceo",
      title: "Daily portfolio health check",
      trigger: { kind: "cron", expression: "0 8 * * *", timezone: "UTC" },
      action: {
        kind: "task",
        objective: "Evaluate portfolio health",
        acceptanceCriteria: ["Health evidence is persisted"],
      },
      rationale: "The same deterministic checks run every morning",
      estimatedRunsSaved: 30,
    });
    assert.equal(proposal.status, "proposed");
    assert.equal(
      store.automations.decide("acme", proposal.id, "approved", "human", "Safe").status,
      "approved",
    );
    assert.equal(
      store.automations.disable("acme", proposal.id, "human", "Maintenance").status,
      "disabled",
    );
    assert.equal(
      store.automations.restore("acme", proposal.id, "human", "Validated").status,
      "approved",
    );
    assert.equal(store.automations.list("acme").length, 1);
    assert.throws(
      () =>
        store.automations.propose({
          companyId: "acme",
          requestedBy: "missing",
          title: "Invalid",
          trigger: {},
          action: {},
          rationale: "No identity",
          estimatedRunsSaved: 1,
        }),
      /Unknown automation requester/,
    );
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("approved automations create durable task runs without duplicate schedules", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-automation-run-"));
  const store = new StateStore(root);
  let now = new Date("2026-01-01T00:00:00.000Z");
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const proposal = store.automations.propose({
      companyId: "acme",
      requestedBy: "ceo",
      title: "Frequent evidence check",
      trigger: { kind: "interval", everySeconds: 10 },
      action: {
        kind: "task",
        objective: "Refresh operating evidence",
        acceptanceCriteria: ["Evidence is current"],
      },
      rationale: "Avoid repeated agent scheduling work",
      estimatedRunsSaved: 10,
    });
    store.automations.decide("acme", proposal.id, "approved", "human", "Validated template");
    const execution = {
      start: () => Promise.resolve({ id: "attempt-one" }),
    } as unknown as TaskExecutionService;
    const service = new AutomationService(store, execution, () => now);
    await service.tick();
    assert.equal(store.automations.list("acme")[0]?.nextRunAt, "2026-01-01T00:00:10.000Z");
    now = new Date("2026-01-01T00:00:10.000Z");
    await service.tick();
    await service.tick();
    assert.equal(store.tasks("acme").length, 1);
    assert.equal(store.automations.listRuns("acme").length, 1);
    assert.equal(store.automations.listRuns("acme")[0]?.status, "succeeded");
    assert.equal(store.automations.list("acme")[0]?.nextRunAt, "2026-01-01T00:00:20.000Z");
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
