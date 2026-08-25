import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { render } from "ink-testing-library";
import { planSandbox } from "../src/sandbox-planner.js";
import { StateStore } from "../src/storage/state-store.js";
import { taskJobRequirements } from "../src/tasks/task-job-requirements.js";
import { WorkforceRoot } from "../src/tui/workforce-root.js";

test("compiled production TUI persists onboarding through accepted deliverable and restart", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-operator-journey-"));
  let store = new StateStore(root);
  try {
    store.initialize();
    const view = renderRoot(store, {
      startTask: (companyId, taskId) => {
        simulateAcceptedDockerResult(store, companyId, taskId);
        return Promise.resolve();
      },
      verifyModel: (companyId, modelId) => {
        store.models.recordVerification(
          companyId,
          modelId,
          true,
          { probe: "deterministic operator-journey verifier" },
          "model-verifier",
        );
        return Promise.resolve();
      },
    });

    await enterText(view, "Northstar Works");
    await enterText(view, "Build dependable customer software");
    await send(view, "\r");
    await eventually(() => {
      assert.match(view.lastFrame() ?? "", /Northstar Works/);
    });

    await openPage(view, "Employees");
    assert.match(view.lastFrame() ?? "", /Agent Resources Manager/);
    assert.deepEqual(
      store
        .employees(store.companies()[0]?.id ?? "")
        .map(({ id }) => id)
        .sort(),
      ["arm", "ceo"],
    );

    await openPage(view, "Objectives");
    await send(view, "n");
    await enterText(view, "Launch a dependable customer portal");
    await send(view, "\r");
    await enterText(view, "Portal is accepted by validators");
    await send(view, "\r");

    await openPage(view, "Models & engines");
    await send(view, "n");
    await send(view, "\r");
    await enterText(view, "test/operator-model");
    await enterText(view, "test-provider");
    await send(view, "\r");
    await send(view, "\r");
    await send(view, "\r");
    await send(view, "\r");
    await send(view, "\r");
    await eventually(() => {
      assert.equal(
        store.models
          .list(store.companies()[0]?.id ?? "")
          .some(({ model }) => model === "test/operator-model"),
        true,
      );
    });
    await send(view, "v");
    await eventually(() => {
      assert.equal(
        store.models
          .list(store.companies()[0]?.id ?? "")
          .find(({ model }) => model === "test/operator-model")?.health,
        "healthy",
      );
    });

    await openPage(view, "Tasks");
    await send(view, "n");
    await enterText(view, "Deliver the customer portal");
    await enterText(view, "Validated deliverable exists");
    await send(view, "\r");
    await send(view, "\u001B[B");
    await send(view, "\r");
    await send(view, "\r");

    const companyId = store.companies()[0]?.id;
    assert.ok(companyId);
    assert.equal(store.strategyItems(companyId, "objective").length, 1);
    await eventually(() => {
      assert.equal(store.tasks(companyId).length, 1);
    });
    assert.equal(store.tasks(companyId)[0]?.status, "ready");
    assert.ok(store.tasks(companyId)[0]?.assigneeId);

    await send(view, "r");
    assert.match(view.lastFrame() ?? "", /Start agent execution/);
    await send(view, "y");
    await eventually(() => {
      assert.equal(store.tasks(companyId)[0]?.status, "completed");
    });

    await openPage(view, "Deliverables");
    assert.match(view.lastFrame() ?? "", /deliverable\.md/);
    assert.match(view.lastFrame() ?? "", /Validated deliverables/);
    assert.equal(store.artifacts.listCompany(companyId).length, 1);
    assert.equal(store.attempts.list(companyId)[0]?.status, "succeeded");
    assert.equal(store.audit.verifyChain(), true);
    view.unmount();
    store.close();

    store = new StateStore(root);
    store.initialize();
    const restarted = renderRoot(store, { startTask: () => Promise.resolve() });
    await openPage(restarted, "Tasks");
    assert.match(restarted.lastFrame() ?? "", /\[completed\].*Deliver the customer portal/);
    await openPage(restarted, "Deliverables");
    assert.match(restarted.lastFrame() ?? "", /deliverable\.md/);
    assert.equal(store.companies()[0]?.displayName, "Northstar Works");
    assert.equal(
      store.employees(companyId).some(({ id }) => id === "ceo"),
      true,
    );
    assert.equal(
      store.employees(companyId).some(({ id }) => id === "arm"),
      true,
    );
    assert.equal(store.audit.verifyChain(), true);
    restarted.unmount();
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function renderRoot(
  store: StateStore,
  actions: {
    startTask: (companyId: string, taskId: string) => Promise<void>;
    verifyModel?: (companyId: string, modelId: string) => Promise<void>;
  },
): ReturnType<typeof render> {
  return render(
    <WorkforceRoot
      store={store}
      docker={{ available: true, version: "operator-journey" }}
      onEmergencyStop={() => Promise.resolve()}
      onStartTask={actions.startTask}
      onVerifyMcp={() => Promise.resolve()}
      onVerifyModel={actions.verifyModel ?? (() => Promise.resolve())}
    />,
  );
}

function simulateAcceptedDockerResult(store: StateStore, companyId: string, taskId: string): void {
  const ready = store.tasksRepository.get(companyId, taskId);
  assert.ok(ready?.assigneeId);
  const assigned = store.tasksRepository.transition(
    companyId,
    taskId,
    "ASSIGN",
    "operator-journey",
    "Accepted production-TUI execution request",
  );
  const attemptId = "operator-journey-attempt";
  const sandbox = planSandbox(taskJobRequirements(assigned));
  store.attempts.enqueue({
    id: attemptId,
    companyId,
    taskId,
    employeeId: ready.assigneeId,
    sandbox,
    command: ["opencode", "run", "--model", "test/operator-journey", assigned.objective],
    secretNames: [],
    ephemeralSecretNames: [],
    environment: {},
    instructionRevision: 1,
    instructionDigest: "operator-journey",
  });
  store.tasksRepository.transition(
    companyId,
    taskId,
    "START",
    "supervisor",
    `Started ${attemptId}`,
  );
  store.attempts.setStatus(attemptId, "running");
  for (const event of ["INVESTIGATE", "PLAN", "IMPLEMENT", "VERIFY", "REQUEST_REVIEW"] as const)
    store.tasksRepository.transition(
      companyId,
      taskId,
      event,
      "operator-journey-agent",
      `Recorded ${event.toLowerCase()} phase`,
    );
  const artifact = store.artifacts.add({
    companyId,
    taskId,
    attemptId,
    relativePath: "deliverable.md",
    mediaType: "text/markdown",
    sizeBytes: 28,
    sha256: "a".repeat(64),
    storagePath: "/validated/operator-journey/deliverable.md",
  });
  store.artifacts.addReceipt({
    companyId,
    taskId,
    attemptId,
    artifactId: artifact.id,
    validator: "operator-journey",
    status: "passed",
    details: { compiledTui: true },
  });
  store.executionEvidence.decision({
    companyId,
    taskId,
    attemptId,
    result: { accepted: true, reasons: [] },
    criteria: [
      {
        criterion: "Validated deliverable exists",
        passed: true,
        evidenceIds: [artifact.id],
      },
    ],
    decidedBy: "independent-validator",
  });
  store.attempts.setStatus(attemptId, "succeeded", { exitCode: 0 });
  store.tasksRepository.transition(
    companyId,
    taskId,
    "COMPLETE",
    "independent-validator",
    "Required artifact and criterion passed",
    true,
  );
}

async function openPage(view: ReturnType<typeof render>, page: string): Promise<void> {
  await send(view, "/");
  await send(view, page);
  await send(view, "\r");
  await eventually(() => {
    assert.match(view.lastFrame() ?? "", new RegExp(page));
  });
}

async function enterText(view: ReturnType<typeof render>, value: string): Promise<void> {
  await send(view, value);
  await send(view, "\r");
}

async function send(view: ReturnType<typeof render>, value: string): Promise<void> {
  view.stdin.write(value);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });
}

async function eventually(assertion: () => void): Promise<void> {
  let failure: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      failure = error;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 25);
      });
    }
  }
  throw failure;
}
