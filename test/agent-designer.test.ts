import test from "node:test";
import assert from "node:assert/strict";
import { designAgentForJob } from "../src/agent-designer.js";
import { JobRequirementsSchema } from "../src/domain.js";

const requirements = (overrides: Record<string, unknown> = {}) =>
  JobRequirementsSchema.parse({
    id: "job-one",
    title: "Job",
    objective: "Deliver the required artifact",
    risk: "low",
    dataSensitivity: "public",
    capabilities: {
      filesystemWrite: true,
      shell: false,
      sourceControl: false,
      browser: false,
      publicInternet: false,
      packageInstall: false,
      buildTools: [],
      languages: [],
    },
    inputs: [],
    outputs: [{ path: "out/report.md", required: true }],
    network: { allowedHosts: [], reason: "" },
    resources: { cpu: 1, memoryMb: 512, pids: 64, timeoutSeconds: 600 },
    enginePreference: ["opencode", "kilo"],
    acceptanceCriteria: ["Report is complete"],
    ...overrides,
  });

test("ARM adapts employee role and policy to engineering requirements", () => {
  const job = requirements({
    capabilities: {
      filesystemWrite: true,
      shell: true,
      sourceControl: true,
      browser: false,
      publicInternet: false,
      packageInstall: false,
      buildTools: ["pnpm"],
      languages: ["TypeScript"],
    },
  });
  const blueprint = designAgentForJob(job);
  assert.equal(blueprint.employee.title, "TypeScript Delivery Engineer");
  assert.ok(blueprint.skills.includes("language:typescript"));
  assert.ok(blueprint.permissions.includes("shell"));
  assert.equal(blueprint.enginePolicy.preferred, "opencode");
  assert.deepEqual(blueprint.enginePolicy.fallbacks, ["kilo"]);
});

test("ARM produces a different role for browser work", () => {
  const job = requirements({
    id: "browser-job",
    capabilities: {
      filesystemWrite: true,
      shell: false,
      sourceControl: false,
      browser: true,
      publicInternet: false,
      packageInstall: false,
      buildTools: [],
      languages: [],
    },
  });
  const blueprint = designAgentForJob(job);
  assert.equal(blueprint.employee.title, "Browser Automation Specialist");
  assert.ok(blueprint.permissions.includes("playwright"));
  assert.ok(!blueprint.permissions.includes("shell"));
});

test("ARM refuses contradictory restricted-network requirements", () => {
  const job = requirements({
    id: "restricted-job",
    dataSensitivity: "restricted",
    capabilities: {
      filesystemWrite: true,
      shell: false,
      sourceControl: false,
      browser: true,
      publicInternet: true,
      packageInstall: false,
      buildTools: [],
      languages: [],
    },
    network: { allowedHosts: ["example.com"], reason: "requested research" },
  });
  assert.throws(() => designAgentForJob(job), /authorization or decomposition/);
});
