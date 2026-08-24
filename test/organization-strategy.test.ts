import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { StateStore } from "../src/storage/state-store.js";

test("organization and strategy hierarchies enforce company-scoped parents", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-org-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    store.createCompany({ id: "other", name: "Other" });
    const department = store.createOrganizationUnit({
      id: "engineering",
      companyId: "acme",
      kind: "department",
      name: "Engineering",
      managerId: "ceo",
    });
    const team = store.createOrganizationUnit({
      id: "platform",
      companyId: "acme",
      kind: "team",
      parentId: department.id,
      name: "Platform",
      managerId: "ceo",
    });
    assert.equal(store.organizationUnits("acme", "team").length, 1);
    assert.equal(store.organizationUnits("other").length, 0);
    assert.equal(
      store.organizationRepository.update({
        companyId: "acme",
        unitId: team.id,
        name: "Platform Engineering",
      }).name,
      "Platform Engineering",
    );
    assert.equal(store.organizationRepository.archive("acme", team.id).status, "archived");
    assert.equal(store.organizationRepository.restore("acme", team.id).status, "active");
    assert.throws(
      () =>
        store.organizationRepository.update({
          companyId: "acme",
          unitId: team.id,
          parentId: "missing",
        }),
      /same company/,
    );

    const objective = store.createStrategyItem({
      id: "reliable-growth",
      companyId: "acme",
      kind: "objective",
      name: "Reliable growth",
      ownerId: "ceo",
      managerId: "ceo",
      successMeasures: ["99% accepted deliverables"],
    });
    const initiative = store.createStrategyItem({
      id: "workforce-product",
      companyId: "acme",
      kind: "initiative",
      parentId: objective.id,
      name: "Workforce product",
      ownerId: "ceo",
      managerId: "ceo",
      successMeasures: ["Acceptance scenario passes"],
    });
    assert.equal(
      store.strategyRepository.update({
        companyId: "acme",
        itemId: initiative.id,
        name: "Workforce OS product",
        successMeasures: ["All acceptance gates pass"],
      }).name,
      "Workforce OS product",
    );
    assert.equal(store.strategyRepository.archive("acme", initiative.id).status, "archived");
    assert.equal(store.strategyRepository.restore("acme", initiative.id).status, "draft");
    assert.throws(
      () =>
        store.createStrategyItem({
          companyId: "other",
          kind: "project",
          parentId: initiative.id,
          name: "Leak",
          ownerId: "ceo",
          managerId: "ceo",
          successMeasures: ["Must be refused"],
        }),
      /same company/,
    );
    assert.throws(
      () =>
        store.createStrategyItem({
          companyId: "acme",
          kind: "milestone",
          parentId: initiative.id,
          name: "Wrong level",
          ownerId: "ceo",
          managerId: "ceo",
          successMeasures: ["Must be refused"],
        }),
      /must be a goal/,
    );
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
