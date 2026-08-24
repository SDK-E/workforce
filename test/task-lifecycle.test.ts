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

test("requirements are versioned and active attempts require safe checkpoints", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-requirements-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const parent = store.createTask({
      id: "parent",
      companyId: "acme",
      objective: "Parent",
      acceptanceCriteria: ["Accepted"],
      risk: "low",
      dataSensitivity: "internal",
      managerId: "ceo",
    });
    const task = store.createTask({
      id: "child",
      companyId: "acme",
      parentTaskId: parent.id,
      objective: "Initial objective",
      acceptanceCriteria: ["Initial gate"],
      risk: "medium",
      dataSensitivity: "internal",
      managerId: "ceo",
      priority: 90,
    });
    store.tasksRepository.addDependency("acme", task.id, parent.id, "ceo");
    assert.equal(store.tasksRepository.requirements.list("acme", task.id)[0]?.version, 1);
    const attempt = store.attempts.enqueue({
      id: "active-attempt",
      companyId: "acme",
      taskId: task.id,
      employeeId: "arm",
      sandbox: {} as never,
      command: [],
      secretNames: [],
    });
    store.attempts.acquire(attempt, "test-supervisor");
    const update = {
      companyId: "acme",
      taskId: task.id,
      objective: "Revised objective",
      nonGoals: [],
      acceptanceCriteria: ["Revised gate"],
      capabilities: ["engineering"],
      networkPolicy: { mode: "none" },
      resourcePolicy: { memoryMb: 512 },
      changedBy: "ceo",
      changeReason: "New verified requirement",
    };
    assert.throws(() => store.tasksRepository.requirements.update(update), /safe checkpoint/);
    const version = store.tasksRepository.requirements.update({
      ...update,
      checkpointId: "checkpoint-1",
    });
    assert.equal(version.version, 2);
    assert.equal(store.tasksRepository.get("acme", task.id)?.objective, "Revised objective");
    assert.throws(
      () =>
        store.createTask({
          companyId: "acme",
          projectId: "missing",
          objective: "Bad project",
          acceptanceCriteria: ["x"],
          risk: "low",
          dataSensitivity: "internal",
          managerId: "ceo",
        }),
      /project in the same company/,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
