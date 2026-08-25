import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ArmOperatingLoop } from "../src/autonomy/arm-operating-loop.js";
import { classifyWorkforceFailure } from "../src/autonomy/arm-failure-classifier.js";
import { StateStore } from "../src/storage/state-store.js";
import type { AttemptRecord } from "../src/supervision/attempt-types.js";

test("ARM reinforces, restricts, and governably offboards while preserving records and work", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-arm-reinforcement-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "reinforce-co", name: "Reinforce" });
    insertEmployee(store, "reinforce-co", "worker");
    store.defaultAgentProfiles.ensure("reinforce-co", store.employees("reinforce-co"));
    const task = store.createTask({
      companyId: "reinforce-co",
      objective: "Deliver retained work",
      acceptanceCriteria: ["Independent acceptance passes"],
      risk: "medium",
      dataSensitivity: "internal",
      managerId: "arm",
      assigneeId: "worker",
    });
    recordWarning(store, "warning-1");
    const loop = new ArmOperatingLoop(store);
    loop.tick();
    loop.tick();

    const plan = store.workforceAdaptation.plans("reinforce-co")[0];
    assert.ok(plan);
    assert.equal(plan.status, "active");
    assert.equal(store.workforceAdaptation.plans("reinforce-co").length, 1);
    assert.equal(employeeStatus(store, "reinforce-co", "worker"), "coaching");
    assert.throws(() => {
      store.tasksRepository.requireExecutableAssignee("reinforce-co", "worker");
    }, /not eligible/);

    store.db
      .prepare("UPDATE reinforcement_plans SET created_at=? WHERE company_id=? AND id=?")
      .run("2000-01-01T00:00:00.000Z", "reinforce-co", plan.id);
    recordWarning(store, "warning-2");
    recordWarning(store, "warning-3");
    loop.tick();
    assert.equal(store.workforceAdaptation.plans("reinforce-co")[0]?.status, "failed");
    assert.equal(employeeStatus(store, "reinforce-co", "worker"), "restricted");
    assert.equal(store.incidents.listCorrective("reinforce-co")[0]?.status, "issued");

    loop.tick();
    const approval = store.approvalsRepository.list("reinforce-co", "pending")[0];
    assert.equal(approval?.subjectType, "employment-termination");
    assert.equal(approval.subjectId, "worker");
    store.approvalsRepository.decide(
      "reinforce-co",
      approval.id,
      "APPROVE",
      "human",
      "Evidence and reinforcement history reviewed",
    );
    loop.tick();

    assert.equal(employeeStatus(store, "reinforce-co", "worker"), "terminated");
    assert.equal(store.tasksRepository.get("reinforce-co", task.id)?.assigneeId, null);
    assert.equal(store.performance.listPerformance("reinforce-co", "worker").length, 3);
    assert.equal(store.incidents.listCorrective("reinforce-co").length, 1);
    assert.ok(
      store.workforceAdaptation
        .decisions("reinforce-co")
        .some(({ action }) => action === "offboard"),
    );
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("ARM recognition completes reinforcement and restores active work eligibility", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-arm-success-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "success-co", name: "Success" });
    insertEmployee(store, "success-co", "worker");
    recordPerformance(store, "success-co", "worker", "warning", "initial-warning");
    const loop = new ArmOperatingLoop(store);
    loop.tick();
    const plan = store.workforceAdaptation.plans("success-co")[0];
    assert.ok(plan);
    store.db
      .prepare("UPDATE reinforcement_plans SET created_at=? WHERE company_id=? AND id=?")
      .run("2000-01-01T00:00:00.000Z", "success-co", plan.id);
    recordPerformance(store, "success-co", "worker", "recognition", "accepted-delivery");
    loop.tick();
    assert.equal(store.workforceAdaptation.plans("success-co")[0]?.status, "succeeded");
    assert.equal(employeeStatus(store, "success-co", "worker"), "active");
    assert.doesNotThrow(() => {
      store.tasksRepository.requireExecutableAssignee("success-co", "worker");
    });
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("ARM failure classification does not treat infrastructure or policy faults as performance", () => {
  assert.equal(
    classifyWorkforceFailure(attempt("infrastructure-blocked", "Docker unavailable")),
    "infrastructure",
  );
  assert.equal(
    classifyWorkforceFailure(attempt("failed", "Model provider rate limit")),
    "provider",
  );
  assert.equal(
    classifyWorkforceFailure(attempt("failed", "Secret access denied by policy")),
    "permission",
  );
  assert.equal(
    classifyWorkforceFailure(attempt("failed", "Contradictory requirements")),
    "requirements",
  );
  assert.equal(
    classifyWorkforceFailure(attempt("failed", "Acceptance validator test failed")),
    "acceptance",
  );
});

function insertEmployee(store: StateStore, companyId: string, employeeId: string): void {
  store.db
    .prepare("INSERT INTO employees VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(
      employeeId,
      companyId,
      "Worker",
      "Engineer",
      "contributor",
      "engineering",
      "arm",
      "active",
      "[]",
      "[]",
      new Date().toISOString(),
    );
}

function recordWarning(store: StateStore, evidenceId: string): void {
  recordPerformance(store, "reinforce-co", "worker", "warning", evidenceId);
}

function recordPerformance(
  store: StateStore,
  companyId: string,
  employeeId: string,
  kind: "warning" | "recognition",
  evidenceId: string,
): void {
  store.performance.record({
    companyId,
    employeeId,
    kind,
    summary: `${kind} supported by ${evidenceId}`,
    evidenceIds: [evidenceId],
    authorId: "manager",
  });
}

function employeeStatus(store: StateStore, companyId: string, employeeId: string) {
  return store.employees(companyId).find(({ id }) => id === employeeId)?.status;
}

function attempt(status: AttemptRecord["status"], failureReason: string): AttemptRecord {
  return {
    id: "attempt",
    companyId: "company",
    taskId: "task",
    employeeId: "employee",
    status,
    sandbox: {} as AttemptRecord["sandbox"],
    command: [],
    secretNames: [],
    ephemeralSecretNames: [],
    environment: {},
    instructionRevision: null,
    instructionDigest: null,
    containerName: "container",
    exitCode: 1,
    failureReason,
    queuedAt: "2026-01-01T00:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
