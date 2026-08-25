import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { StateStore } from "../src/storage/state-store.js";
import { applyBusinessLifecycleAction } from "../src/tui/business-lifecycle.js";

test("business pipeline is searchable, recoverable, and company isolated", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-business-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "alpha", name: "Alpha" });
    store.createCompany({ id: "beta", name: "Beta" });
    const opportunity = store.opportunities.create(
      {
        companyId: "alpha",
        name: "Operational automation",
        source: "market research",
        problem: "Teams lose time to repetitive reconciliation",
        hypothesis: "Audited automation reduces manual effort",
        score: 84,
        discoveredBy: "ceo",
        ownerId: "ceo",
        evidenceIds: ["research-one"],
      },
      "ceo",
    );
    const lead = store.leads.create(
      {
        companyId: "alpha",
        opportunityId: opportunity.id,
        name: "Jordan Buyer",
        organization: "Example Industries",
        email: "jordan@example.test",
        website: "https://example.test",
        source: "qualified research",
        qualificationScore: 77,
        ownerId: "ceo",
        notes: "Problem and authority confirmed",
      },
      "ceo",
    );
    const client = store.clients.create(
      {
        companyId: "alpha",
        leadId: lead.id,
        name: "Example Industries",
        primaryContact: "Jordan Buyer",
        email: "jordan@example.test",
        ownerId: "ceo",
        notes: "Discovery engagement",
      },
      "ceo",
    );
    assert.throws(
      () =>
        store.opportunities.create(
          {
            companyId: "alpha",
            name: "Unowned opportunity",
            source: "research",
            problem: "Unknown ownership",
            hypothesis: "Must be rejected",
            score: 10,
            discoveredBy: "ceo",
            ownerId: "missing-employee",
            evidenceIds: [],
          },
          "ceo",
        ),
      /Unknown opportunity owner in company/,
    );
    assert.throws(
      () =>
        store.engagements.create(
          {
            companyId: "alpha",
            clientId: client.id,
            projectId: "missing-project",
            name: "Invalid project link",
            scope: "Must not persist",
            successCriteria: ["Rejected"],
            ownerId: "ceo",
            startsAt: null,
            endsAt: null,
          },
          "ceo",
        ),
      /Unknown project in company/,
    );
    const engagement = store.engagements.create(
      {
        companyId: "alpha",
        clientId: client.id,
        projectId: null,
        name: "Reconciliation discovery",
        scope: "Validate and automate the reconciliation workflow",
        successCriteria: ["Baseline measured", "Acceptance evidence approved"],
        ownerId: "ceo",
        startsAt: null,
        endsAt: null,
      },
      "ceo",
    );
    assert.equal(store.opportunities.list("alpha", { query: "automation" })[0]?.id, opportunity.id);
    assert.equal(store.leads.list("alpha", { query: "Industries" })[0]?.id, lead.id);
    assert.equal(store.clients.list("alpha", { query: "Jordan" })[0]?.id, client.id);
    assert.equal(
      store.engagements.list("alpha", { query: "reconciliation" })[0]?.id,
      engagement.id,
    );
    assert.deepEqual(store.opportunities.list("beta"), []);
    assert.throws(
      () =>
        store.leads.create({ ...lead, companyId: "beta", opportunityId: opportunity.id }, "ceo"),
      /Unknown opportunity in company/,
    );
    assert.equal(
      applyBusinessLifecycleAction(
        store,
        "alpha",
        { kind: "engagement", id: engagement.id, label: engagement.name, status: "proposed" },
        false,
        "human",
      ),
      true,
    );
    assert.equal(store.engagements.get("alpha", engagement.id)?.status, "archived");
    applyBusinessLifecycleAction(
      store,
      "alpha",
      { kind: "engagement", id: engagement.id, label: engagement.name, status: "archived" },
      true,
      "human",
    );
    assert.equal(store.engagements.get("alpha", engagement.id)?.status, "proposed");
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
