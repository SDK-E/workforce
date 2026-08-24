import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { StateStore } from "../src/storage/state-store.js";

test("agents propose automations while humans govern activation and restoration", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-automation-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const proposal = store.automations.propose({
      companyId: "acme",
      requestedBy: "ceo",
      title: "Daily portfolio health check",
      trigger: { schedule: "0 8 * * *" },
      action: { service: "portfolio-health", method: "evaluate" },
      rationale: "The same deterministic checks run every morning",
      estimatedRunsSaved: 30,
    });
    assert.equal(proposal.status, "proposed");
    assert.equal(
      store.automations.decide("acme", proposal.id, "approved", "human", "Safe").status,
      "approved",
    );
    assert.equal(
      store.automations.disable("acme", proposal.id, "human", "Maintenance").status,
      "disabled",
    );
    assert.equal(
      store.automations.restore("acme", proposal.id, "human", "Validated").status,
      "approved",
    );
    assert.equal(store.automations.list("acme").length, 1);
    assert.throws(
      () =>
        store.automations.propose({
          companyId: "acme",
          requestedBy: "missing",
          title: "Invalid",
          trigger: {},
          action: {},
          rationale: "No identity",
          estimatedRunsSaved: 1,
        }),
      /Unknown automation requester/,
    );
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
