import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ModelVerifier, type ModelProbeRunner } from "../src/registries/model-verifier.js";
import { StateStore } from "../src/storage/state-store.js";

test("model verification requires real probe evidence and redacts scoped secrets", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-model-verifier-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const existing = store.models.get("acme", "opencode-default");
    assert.ok(existing);
    store.models.save({
      ...existing,
      model: "openai/gpt-5",
      provider: "openai",
      secretRequirements: ["OPENAI_API_KEY"],
    });
    const runner: ModelProbeRunner = {
      probe: (_model, secrets) =>
        Promise.resolve({
          healthy: true,
          details: { output: `WORKFORCE_MODEL_READY ${secrets.OPENAI_API_KEY}` },
        }),
    };
    const verifier = new ModelVerifier(store.models, runner, () => ({
      OPENAI_API_KEY: "top-secret-value",
    }));
    const verified = await verifier.verify("acme", "opencode-default", "human");
    assert.equal(verified.health, "healthy");
    assert.ok(verified.verifiedAt);
    assert.ok(verified.verificationReceiptId);
    assert.doesNotMatch(JSON.stringify(store.events("acme", 50)), /top-secret-value/);
    assert.match(JSON.stringify(store.events("acme", 50)), /\[REDACTED\]/);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("failed probes clear prior receipts instead of emitting one", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-model-failed-probe-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const existing = store.models.get("acme", "opencode-default");
    assert.ok(existing);
    store.models.save({ ...existing, model: "openai/gpt-5", provider: "openai" });
    const healthy: ModelProbeRunner = {
      probe: () => Promise.resolve({ healthy: true, details: { output: "WORKFORCE_MODEL_READY" } }),
    };
    const verified = await new ModelVerifier(store.models, healthy, () => ({})).verify(
      "acme",
      "opencode-default",
      "human",
    );
    assert.ok(verified.verifiedAt);
    assert.ok(verified.verificationReceiptId);
    const failing: ModelProbeRunner = {
      probe: () =>
        Promise.resolve({
          healthy: false,
          details: { exitCode: 1, output: "provider unreachable", failureClass: "startup-failed" },
        }),
    };
    const failed = await new ModelVerifier(store.models, failing, () => ({})).verify(
      "acme",
      "opencode-default",
      "human",
    );
    assert.equal(failed.health, "unavailable");
    assert.equal(failed.verifiedAt, null);
    assert.equal(failed.verificationReceiptId, null);
    assert.equal(failed.failureClass, "startup-failed");
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("healthy model state cannot be forged without a receipt", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-model-receipt-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const existing = store.models.get("acme", "opencode-default");
    assert.ok(existing);
    assert.throws(
      () => store.models.save({ ...existing, health: "healthy" }),
      /verification receipt/,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
