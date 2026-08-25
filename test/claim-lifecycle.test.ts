import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { StateStore } from "../src/storage/state-store.js";

test("claim retraction and restoration reconcile contradictory active evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-claim-lifecycle-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const first = store.performance.assertClaim({
      companyId: "acme",
      subjectId: "release",
      predicate: "is-ready",
      value: true,
      evidenceIds: ["evidence-one"],
      confidence: 0.9,
      authorId: "ceo",
    });
    const second = store.performance.assertClaim({
      companyId: "acme",
      subjectId: "release",
      predicate: "is-ready",
      value: false,
      evidenceIds: ["evidence-two"],
      confidence: 0.8,
      authorId: "arm",
    });
    store.performance.setClaimRetraction("acme", second.id, true, "human");
    const afterRetraction = store.performance.listClaims("acme");
    assert.equal(afterRetraction.find(({ id }) => id === second.id)?.status, "retracted");
    assert.equal(afterRetraction.find(({ id }) => id === first.id)?.status, "asserted");
    store.performance.setClaimRetraction("acme", second.id, false, "human");
    assert.deepEqual(
      store.performance.listClaims("acme").map(({ status }) => status),
      ["disputed", "disputed"],
    );
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
