import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateAcceptance } from "../src/acceptance/evaluate-acceptance.js";
import { sanitizeTerminal } from "../src/storage/sanitize-terminal.js";
import { StateStore } from "../src/storage/state-store.js";
import { loadMigrations } from "../src/storage/migration-loader.js";
import { CapacityController } from "../src/supervision/capacity-controller.js";
import { diagnoseStall } from "../src/supervision/diagnose-stall.js";

function store() {
  const root = mkdtempSync(join(tmpdir(), "workforce-test-"));
  const state = new StateStore(root);
  return { root, state };
}
test("company onboarding persists CEO and ARM and enforces isolation", () => {
  const { root, state } = store();
  try {
    state.initialize();
    const entityTable = state.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entities'")
      .get();
    const migration = state.db
      .prepare("SELECT max(version) AS version FROM schema_migrations")
      .get() as { version: number };
    assert.equal(entityTable, undefined);
    assert.equal(migration.version, loadMigrations().at(-1)?.version);
    state.createCompany({ id: "acme", name: "Acme", mission: "Ship safely" });
    state.createCompany({ id: "other", name: "Other" });
    assert.deepEqual(
      state
        .employees("acme")
        .map((e) => e.id)
        .sort(),
      ["arm", "ceo"],
    );
    state.createStrategyItem({
      companyId: "acme",
      kind: "objective",
      name: "Apollo",
      ownerId: "ceo",
      managerId: "ceo",
      successMeasures: ["Accepted release"],
    });
    assert.equal(state.strategyItems("other").length, 0);
    state.close();
    const reopened = new StateStore(root);
    reopened.initialize();
    assert.equal(reopened.company("acme")?.mission, "Ship safely");
    assert.equal(reopened.strategyItems("acme", "objective")[0]?.name, "Apollo");
    reopened.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("chat is company scoped and terminal escapes are removed", () => {
  const { root, state } = store();
  try {
    state.initialize();
    state.createCompany({ id: "one", name: "One" });
    state.createCompany({ id: "two", name: "Two" });
    state.addMessage("one", "ceo-office", "human", "hello\u001b[2J");
    assert.equal(state.messages("one", "ceo-office")[0]?.body, "hello[2J");
    assert.equal(state.messages("two", "ceo-office").length, 0);
    assert.equal(sanitizeTerminal("a\u0000b"), "ab");
    assert.ok(state.verifyAuditChain());
    state.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("process success alone never completes acceptance", () => {
  const result = evaluateAcceptance(0, ["out/report.md"], new Set(), [
    { criterion: "reviewed", passed: true, evidenceIds: [] },
  ]);
  assert.equal(result.accepted, false);
  assert.equal(result.reasons.length, 2);
});
test("acceptance gates reject failed validators and unresolved critical findings", () => {
  const result = evaluateAcceptance(
    0,
    ["out/report.md"],
    new Set(["out/report.md"]),
    [{ criterion: "reviewed", passed: true, evidenceIds: ["evidence-1"] }],
    false,
    false,
    {
      manifestValidated: true,
      validatorReceipts: [{ validator: "security", status: "failed" }],
      unresolvedCriticalFindings: ["credential exposure"],
      permissionDenied: false,
      executionExhausted: false,
    },
  );
  assert.equal(result.accepted, false);
  assert.deepEqual(result.reasons, [
    "Validator security reported failed",
    "Unresolved critical finding: credential exposure",
  ]);
});
test("capacity reduces under pressure and stall clocks are distinct", () => {
  const controller = new CapacityController(2);
  assert.equal(
    controller.decide({ totalMemoryMb: 16000, availableMemoryMb: 1000, running: 1 }).limit,
    1,
  );
  const now = Date.now();
  assert.equal(
    diagnoseStall(
      {
        heartbeat: now,
        engine: now,
        tool: now,
        meaningful: now - 400_000,
        checkpoint: now,
        deliverable: now,
        acceptance: now,
      },
      now,
    ),
    "stalled",
  );
});
