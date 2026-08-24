import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { designAgentForJob } from "../src/agent-designer.js";
import { JobRequirementsSchema } from "../src/domain.js";
import { nextApprovalStatus } from "../src/governance/approval-machine.js";
import { nextEmploymentStatus } from "../src/governance/employment-machine.js";
import { analyzeWorkforceGap } from "../src/governance/gap-analysis.js";
import { StateStore } from "../src/storage/state-store.js";

const job = JobRequirementsSchema.parse({
  id: "build-service",
  title: "Build service",
  objective: "Build and verify a TypeScript service",
  risk: "medium",
  dataSensitivity: "internal",
  capabilities: {
    filesystemWrite: true,
    shell: true,
    sourceControl: true,
    browser: false,
    publicInternet: false,
    packageInstall: true,
    buildTools: ["pnpm"],
    languages: ["typescript"],
  },
  inputs: [],
  outputs: [{ path: "dist/service.js", required: true }],
  network: { mode: "none", allowedHosts: [], reason: "" },
  resources: { cpu: 2, memoryMb: 1024, pids: 128, timeoutSeconds: 1800 },
  enginePreference: ["opencode", "kilo"],
  acceptanceCriteria: ["Tests pass"],
});

test("XState governance machines reject invalid decisions and cover employment recovery", () => {
  assert.equal(nextApprovalStatus("pending", "APPROVE"), "approved");
  assert.throws(() => nextApprovalStatus("approved", "REJECT"), /cannot handle/);
  assert.equal(nextEmploymentStatus("probation", "PROMOTE"), "active");
  assert.equal(nextEmploymentStatus("active", "SUSPEND"), "suspended");
  assert.equal(nextEmploymentStatus("suspended", "TERMINATE"), "terminated");
  assert.equal(nextEmploymentStatus("terminated", "REINSTATE"), "probation");
  assert.throws(() => nextEmploymentStatus("active", "REINSTATE"), /cannot handle/);
});

test("gap analysis precedes probationary hiring and offboarding preserves history", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-governance-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const analysis = analyzeWorkforceGap(job, store.employees("acme"));
    assert.equal(analysis.recommendation, "hire");
    const gap = store.employment.recordGap({
      companyId: "acme",
      jobId: job.id,
      kind: analysis.kind,
      missing: analysis.missing,
      alternatives: analysis.alternatives,
      recommendation: analysis.recommendation,
      createdBy: "arm",
    });
    const proposal = store.employment.propose("acme", designAgentForJob(job), "arm");
    assert.equal(proposal.status, "proposed");
    const accepted = store.employment.decide(
      "acme",
      proposal.id,
      "approved",
      "ceo",
      "Gap verified",
    );
    assert.equal(accepted.status, "approved");
    const employeeId = accepted.employeeId;
    assert.equal(store.employees("acme").find(({ id }) => id === employeeId)?.status, "probation");
    store.employment.transition("acme", employeeId, "PROMOTE", "arm", "Probation passed");
    store.employment.transition("acme", employeeId, "REASSIGN", "arm", "Priority changed", {
      managerId: "ceo",
      department: "platform",
    });
    store.employment.transition("acme", employeeId, "ACTIVATE", "ceo", "Reassignment accepted");
    store.employment.transition("acme", employeeId, "SUSPEND", "arm", "Immediate risk");
    store.employment.transition("acme", employeeId, "TERMINATE", "ceo", "Policy decision");
    assert.equal(store.employees("acme").find(({ id }) => id === employeeId)?.status, "terminated");
    assert.ok(
      store.db.prepare("SELECT 1 FROM employment_transitions WHERE employee_id=?").get(employeeId),
    );
    store.employment.transition("acme", employeeId, "REINSTATE", "ceo", "New evidence");
    assert.equal(store.employees("acme").find(({ id }) => id === employeeId)?.status, "probation");
    assert.equal(gap.jobId, job.id);
    assert.throws(
      () => store.employment.transition("acme", "arm", "SUSPEND", "ceo", "x"),
      /Durable/,
    );
    const approvalId = store.requestApproval("acme", "hiring", proposal.id, "arm");
    assert.equal(
      store.approvalsRepository.decide("acme", approvalId, "APPROVE", "ceo", "verified").status,
      "approved",
    );
    assert.throws(
      () => store.approvalsRepository.decide("acme", approvalId, "REJECT", "ceo", "late"),
      /cannot handle/,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
