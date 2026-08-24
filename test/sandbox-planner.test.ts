import test from "node:test";
import assert from "node:assert/strict";
import { JobRequirementsSchema } from "../src/domain.js";
import { dockerRunArguments } from "../src/docker-runtime.js";
import { planSandbox } from "../src/sandbox-planner.js";

const base = {
  id: "build-api",
  title: "Build API",
  objective: "Implement and test a local API",
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
  inputs: [{ name: "repository", source: "/approved/export.tar", access: "copy" }],
  outputs: [{ path: "dist/result.tar", required: true }],
  network: { allowedHosts: [], reason: "" },
  resources: { cpu: 2, memoryMb: 2048, pids: 256, timeoutSeconds: 1800 },
  enginePreference: ["kilo"],
  acceptanceCriteria: ["Tests pass", "Artifact exists"],
} as const;

test("adapts an engineering sandbox from requirements", () => {
  const spec = planSandbox(JobRequirementsSchema.parse(base));
  assert.equal(spec.profile, "engineering");
  assert.equal(spec.networkMode, "none");
  assert.ok(spec.tools.includes("shell"));
  assert.ok(spec.tools.includes("build:pnpm"));
  assert.equal(spec.workspace.type, "volume");
});

test("rejects restricted data with public internet", () => {
  const job = JobRequirementsSchema.parse({
    ...base,
    dataSensitivity: "restricted",
    capabilities: { ...base.capabilities, publicInternet: true },
    network: { allowedHosts: ["example.com"], reason: "research" },
  });
  const spec = planSandbox(job);
  assert.equal(spec.networkMode, "none");
  assert.ok(spec.rejectedCapabilities.includes("publicInternet"));
});

test("Docker command is hardened and contains no host workspace bind", () => {
  const spec = planSandbox(JobRequirementsSchema.parse(base));
  const args = dockerRunArguments(spec, "attempt-1", ["kilo", "run"]);
  assert.ok(args.includes("--read-only"));
  assert.ok(args.includes("ALL"));
  assert.ok(args.includes("none"));
  assert.ok(args.some((arg) => arg.startsWith("type=volume")));
  assert.ok(!args.some((arg) => arg.includes(process.env.HOME ?? "/Users")));
});

test("refuses direct allowlisted networking until egress proxy exists", () => {
  const job = JobRequirementsSchema.parse({
    ...base,
    dataSensitivity: "public",
    capabilities: { ...base.capabilities, publicInternet: true },
    network: { allowedHosts: ["registry.npmjs.org"], reason: "packages" },
  });
  const spec = planSandbox(job);
  assert.throws(() => dockerRunArguments(spec, "attempt-2", ["kilo", "run"]), /egress proxy/);
});

test("approved broad internet is routed only through the audited egress network", () => {
  const job = JobRequirementsSchema.parse({
    ...base,
    dataSensitivity: "public",
    capabilities: { ...base.capabilities, publicInternet: true },
    network: {
      mode: "audited-internet",
      allowedHosts: [],
      reason: "engineering documentation and registries",
      approvedBy: "ceo",
    },
  });
  const spec = planSandbox(job);
  assert.equal(spec.networkMode, "audited-internet");
  const args = dockerRunArguments(spec, "attempt-networked", ["kilo", "run"], {
    networkName: "workforce-egress-internal",
    proxyUrl: "http://workforce-egress-proxy:3128",
  });
  assert.ok(args.includes("workforce-egress-internal"));
  assert.ok(args.includes("HTTP_PROXY=http://workforce-egress-proxy:3128"));
  assert.ok(!args.includes("bridge"));
});
