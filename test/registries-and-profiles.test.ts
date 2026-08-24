import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { SandboxSpec } from "../src/domain.js";
import { StateStore } from "../src/storage/state-store.js";

const sandbox: SandboxSpec = {
  jobId: "profile-job",
  profile: "engineering",
  image: "workforce-agent-builder:0.1.0",
  engine: "opencode",
  networkMode: "none",
  allowedHosts: [],
  readOnlyRoot: true,
  nonRoot: true,
  capDropAll: true,
  noNewPrivileges: true,
  workspace: { type: "volume", name: "profile-volume" },
  inputs: [],
  tmpfs: ["/tmp:rw,noexec,nosuid,size=256m"],
  cpu: 1,
  memoryMb: 1024,
  pids: 128,
  timeoutSeconds: 600,
  tools: ["shell"],
  decisions: [],
  rejectedCapabilities: [],
};

test("registries and dynamic agent instructions are company scoped and versioned", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-registries-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    store.createCompany({ id: "other", name: "Other" });
    assert.equal(store.tools.list("acme").length, 5);
    assert.equal(store.environments.list("acme").length, 5);
    assert.equal(store.models.list("acme").length, 2);
    assert.equal(store.tools.list("other").length, 5);

    const initial = store.agentProfiles.active("acme", "ceo");
    assert.equal(initial.revision, 1);
    store.agentProfiles.update({
      companyId: "acme",
      employeeId: "ceo",
      personaName: "Evidence-led CEO",
      identitySummary: "Durable chief executive identity",
      communicationStyle: "Decisive and concise",
      autonomyPolicy: { mode: "approval-aware" },
      systemPrompt: "You are the durable company CEO. Ground decisions in evidence.",
      instructions: ["Consult the ARM for verified workforce gaps."],
      constraints: ["Do not approve your own unverified work."],
      contextSources: ["company-policy", "ceo-office"],
      modelPolicy: { preferred: "openai/gpt-5", fallbacks: [] },
      changedBy: "human",
      changeReason: "Refine executive operating persona",
    });
    assert.equal(store.agentProfiles.history("acme", "ceo").length, 2);
    assert.equal(store.agentProfiles.active("other", "ceo").revision, 1);

    const task = store.createTask({
      id: "task-one",
      companyId: "acme",
      objective: "Prepare an evidenced operating review",
      acceptanceCriteria: ["Review is independently verifiable"],
      risk: "medium",
      dataSensitivity: "internal",
      managerId: "ceo",
    });
    const attempt = store.attemptFactory.create({
      task,
      employeeId: "ceo",
      sandbox,
      model: "openai/gpt-5",
    });
    assert.equal(attempt.instructionRevision, 2);
    assert.equal(attempt.instructionDigest?.length, 64);
    assert.match(attempt.command.at(-1) ?? "", /durable company CEO/);
    assert.match(attempt.command.at(-1) ?? "", /Prepare an evidenced operating review/);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
