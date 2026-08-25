import assert from "node:assert/strict";
import test from "node:test";
import { executionReadiness } from "../src/execution/execution-readiness.js";
import type { EnvironmentRecord, ModelRecord } from "../src/registries/registry-types.js";

test("execution readiness reports concrete blockers instead of optimistic defaults", () => {
  const readiness = executionReadiness({
    docker: { available: false, reason: "daemon stopped" },
    environments: [environment("unknown", null)],
    models: [model("unconfigured", "unknown", null)],
    attempts: [],
    runtime: undefined,
  });
  assert.equal(readiness.ready, false);
  assert.deepEqual(
    readiness.checks.filter(({ status }) => status === "blocked").map(({ id }) => id),
    ["docker", "model-configured", "model-verified"],
  );
});

test("execution readiness requires model and environment verification receipts", () => {
  const readiness = executionReadiness({
    docker: { available: true, version: "28.0.0" },
    environments: [environment("healthy", "environment-receipt")],
    models: [model("provider/model", "healthy", "model-receipt")],
    attempts: [],
    runtime: {
      companyId: "acme",
      enabled: true,
      cadenceSeconds: 10,
      monthlyBudgetCents: 0,
      maxConcurrentAttempts: 2,
      state: "idle",
      lastCycleAt: null,
      nextCycleAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  assert.equal(readiness.ready, true);
  assert.ok(readiness.checks.every(({ status }) => status === "ready"));
});

function environment(
  health: EnvironmentRecord["health"],
  healthReceiptId: string | null,
): EnvironmentRecord {
  return {
    companyId: "acme",
    id: "universal",
    name: "Universal",
    sandboxImage: "workforce-agent:0.1.0",
    runtime: {},
    buildToolchain: [],
    browser: {},
    networkPolicy: {},
    inputContract: {},
    secretsPolicy: {},
    resourcePolicy: {},
    outputContract: {},
    cleanupPolicy: {},
    supportedProfiles: [],
    health,
    healthReceiptId,
    updatedAt: new Date().toISOString(),
  };
}

function model(name: string, health: ModelRecord["health"], receipt: string | null): ModelRecord {
  return {
    companyId: "acme",
    id: "model",
    engine: "opencode",
    model: name,
    provider: "provider",
    capabilities: [],
    supportedRoles: ["general"],
    contextLimit: null,
    freePreferred: false,
    localModel: false,
    priority: 50,
    health,
    verifiedAt: receipt ? new Date().toISOString() : null,
    verificationReceiptId: receipt,
    failureClass: null,
    updatedAt: new Date().toISOString(),
  };
}
