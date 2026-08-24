import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StateStore, sanitizeTerminal } from "../src/state.js";
import { evaluateAcceptance } from "../src/acceptance.js";
import { CapacityController, diagnoseStall } from "../src/supervisor.js";

function store() {
  const root = mkdtempSync(join(tmpdir(), "workforce-test-"));
  const state = new StateStore(root);
  return { root, state };
}
test("company onboarding persists CEO and ARM and enforces isolation", async () => {
  const { root, state } = store();
  try {
    await state.initialize();
    state.createCompany({ id: "acme", name: "Acme", mission: "Ship safely" });
    state.createCompany({ id: "other", name: "Other" });
    assert.deepEqual(
      state
        .employees("acme")
        .map((e) => e.id)
        .sort(),
      ["arm", "ceo"],
    );
    state.createEntity("acme", "project", "Apollo");
    assert.equal(state.entities("other").length, 0);
    state.close();
    const reopened = new StateStore(root);
    await reopened.initialize();
    assert.equal(reopened.company("acme")?.mission, "Ship safely");
    assert.equal(reopened.entities("acme", "project")[0]?.name, "Apollo");
    reopened.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("chat is company scoped and terminal escapes are removed", async () => {
  const { root, state } = store();
  try {
    await state.initialize();
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
