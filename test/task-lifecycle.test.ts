import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { StateStore } from "../src/storage/state-store.js";

test("task lifecycle is persisted, auditable, and evidence-gated", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-task-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const task = store.createTask({
      id: "ship-widget",
      companyId: "acme",
      objective: "Ship a verified widget",
      acceptanceCriteria: ["Widget exists", "Independent tests pass"],
      risk: "medium",
      dataSensitivity: "internal",
      managerId: "ceo",
      reviewerId: "arm",
      capabilities: ["engineering", "network"],
      networkPolicy: { mode: "audited-internet", approvedBy: "ceo" },
    });
    assert.equal(task.status, "draft");
    store.transitionTask("acme", task.id, "REQUEST_APPROVAL", "ceo", "Ready for review");
    store.transitionTask("acme", task.id, "APPROVE", "ceo", "Requirements approved");
    store.transitionTask("acme", task.id, "ASSIGN", "ceo", "Assigned to engineering");
    store.transitionTask("acme", task.id, "START", "ceo", "Start approved work");
    store.transitionTask("acme", task.id, "PLAN", "arm", "Plan recorded");
    store.transitionTask("acme", task.id, "IMPLEMENT", "arm", "Implementation began");
    store.transitionTask("acme", task.id, "VERIFY", "arm", "Outputs ready");
    store.transitionTask("acme", task.id, "REQUEST_REVIEW", "arm", "Evidence attached");
    assert.throws(
      () => store.transitionTask("acme", task.id, "COMPLETE", "ceo", "Looks done"),
      /accepted independent evidence/,
    );
    const completed = store.transitionTask(
      "acme",
      task.id,
      "COMPLETE",
      "ceo",
      "Validators and independent review passed",
      true,
    );
    assert.equal(completed.status, "completed");
    assert.equal(store.tasks("acme", "completed").length, 1);
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("invalid task transitions are refused", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-task-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const task = store.createTask({
      companyId: "acme",
      objective: "Do controlled work",
      acceptanceCriteria: ["Verified"],
      risk: "low",
      dataSensitivity: "internal",
      managerId: "ceo",
    });
    assert.throws(
      () => store.transitionTask("acme", task.id, "COMPLETE", "ceo", "Skip controls", true),
      /cannot handle/,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
