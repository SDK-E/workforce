import assert from "node:assert/strict";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import type { OpportunityRecord } from "../src/business/business-types.js";
import { BusinessForm } from "../src/tui/overlays/business-form.js";
import { createFormForSection, editFormForSection } from "../src/tui/overlays/form-routing.js";

const noop = (): undefined => undefined;

test("business sections route to real create and selected edit forms", async () => {
  for (const [section, kind] of [
    ["Opportunities", "opportunity"],
    ["Leads", "lead"],
    ["Clients", "client"],
    ["Engagements", "engagement"],
  ] as const) {
    assert.equal(createFormForSection(section), kind);
    assert.equal(editFormForSection(section), kind);
  }
  const opportunity: OpportunityRecord = {
    id: "opportunity-one",
    companyId: "acme",
    name: "Automate reconciliation",
    source: "research",
    problem: "Manual reconciliation is slow",
    hypothesis: "Automation reduces cycle time",
    score: 82,
    stage: "validated",
    discoveredBy: "ceo",
    ownerId: "ceo",
    evidenceIds: ["evidence-one"],
    createdAt: "2026-08-25T00:00:00.000Z",
    updatedAt: "2026-08-25T00:00:00.000Z",
  };
  const view = render(
    <Box width={100} height={30}>
      <BusinessForm
        kind="opportunity"
        initial={opportunity}
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  assert.match(view.lastFrame() ?? "", /Edit opportunity/);
  assert.match(view.lastFrame() ?? "", /Automate reconciliation/);
  view.unmount();
});
