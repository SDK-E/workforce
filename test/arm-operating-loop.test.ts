import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ArmOperatingLoop } from "../src/autonomy/arm-operating-loop.js";
import { StateStore } from "../src/storage/state-store.js";

test("ARM continuously staffs verified gaps with probationary dynamic agents", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-arm-loop-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "alpha", name: "Alpha" });
    const task = store.createTask({
      companyId: "alpha",
      objective: "Build and browser-test a multilingual delivery system",
      acceptanceCriteria: ["All independent validators pass"],
      risk: "medium",
      dataSensitivity: "internal",
      capabilities: ["language:python", "language:go", "language:rust", "browser"],
      outputs: [{ path: "delivery.json", required: true, validator: "json" }],
      managerId: "ceo",
      assigneeId: null,
      resourcePolicy: { timeoutSeconds: 1800 },
    });
    store.transitionTask("alpha", task.id, "REQUEST_APPROVAL", "ceo", "Staff this work");
    store.transitionTask("alpha", task.id, "APPROVE", "ceo", "Within delegated authority");

    const loop = new ArmOperatingLoop(store);
    loop.tick();
    loop.tick();

    const proposals = store.employment.proposalList("alpha");
    assert.equal(proposals.length, 1);
    const proposal = proposals[0];
    assert.ok(proposal);
    assert.equal(proposal.status, "approved");
    assert.equal(store.tasksRepository.get("alpha", task.id)?.assigneeId, proposal.employeeId);
    assert.equal(
      store.employees("alpha").find(({ id }) => id === proposal.employeeId)?.status,
      "probation",
    );
    assert.ok(store.agentProfiles.profile("alpha", proposal.employeeId));
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
