import assert from "node:assert/strict";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import { GovernanceForm } from "../src/tui/overlays/governance-form.js";
import { createFormForSection } from "../src/tui/overlays/form-routing.js";
import { editFormForSection } from "../src/tui/overlays/form-routing.js";
import { IncidentDecisionForm } from "../src/tui/overlays/incident-decision-form.js";

const noop = (): undefined => undefined;

test("governance pages route to explicit evidence-backed forms", async () => {
  const routes = [
    ["Performance", "performance", "Record performance evidence"],
    ["Recognition", "recognition", "Record recognition"],
    ["Warnings & incidents", "incident", "Report incident"],
    ["Critics & reviews", "claim", "Assert evidence-backed claim"],
  ] as const;
  for (const [section, kind, title] of routes) {
    assert.equal(createFormForSection(section), kind);
    const view = render(
      <Box width={100} height={30}>
        <GovernanceForm kind={kind} terminalWidth={100} onSubmit={noop} onCancel={noop} />
      </Box>,
    );
    await settle();
    assert.match(view.lastFrame() ?? "", new RegExp(title));
    assert.match(view.lastFrame() ?? "", /Enter next · Esc cancel/);
    view.unmount();
  }
});

test("selected incidents expose only valid XState transitions", async () => {
  assert.equal(editFormForSection("Warnings & incidents"), "incident-decision");
  const view = render(
    <Box width={100} height={30}>
      <IncidentDecisionForm
        incidentId="incident-one"
        status="triaged"
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  await settle();
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /investigate/);
  assert.match(frame, /contain/);
  assert.doesNotMatch(frame, /resolve/);
  view.unmount();
});

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
