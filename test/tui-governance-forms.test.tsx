import assert from "node:assert/strict";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import { GovernanceForm } from "../src/tui/overlays/governance-form.js";
import { createFormForSection } from "../src/tui/overlays/form-routing.js";
import { editFormForSection } from "../src/tui/overlays/form-routing.js";
import { IncidentDecisionForm } from "../src/tui/overlays/incident-decision-form.js";
import { CorrectiveDecisionForm } from "../src/tui/overlays/corrective-decision-form.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StateStore } from "../src/storage/state-store.js";
import { governanceSubjectOptions } from "../src/tui/governance-subjects.js";

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

test("selected corrective actions expose only valid XState transitions", async () => {
  const view = render(
    <Box width={100} height={30}>
      <CorrectiveDecisionForm
        actionId="action-one"
        status="issued"
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  await settle();
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /acknowledge/);
  assert.match(frame, /challenge/);
  assert.doesNotMatch(frame, /archive/);
  view.unmount();
});

test("claim subjects use readable company-scoped records instead of opaque IDs", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-claim-subjects-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    store.createTask({
      companyId: "acme",
      objective: "Validate customer release",
      acceptanceCriteria: ["Evidence passes"],
      risk: "low",
      dataSensitivity: "internal",
      managerId: "ceo",
    });
    const subjects = governanceSubjectOptions(store, "acme");
    assert.equal(
      subjects.some(({ label }) => label.includes("Chief Executive")),
      true,
    );
    assert.equal(
      subjects.some(({ label }) => label === "Task — Validate customer release"),
      true,
    );
    const view = render(
      <Box width={100} height={30}>
        <GovernanceForm
          kind="claim"
          subjects={subjects}
          terminalWidth={100}
          onSubmit={noop}
          onCancel={noop}
        />
      </Box>,
    );
    await settle();
    view.stdin.write("\r");
    await settle();
    assert.match(view.lastFrame() ?? "", /Predicate/);
    view.unmount();
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
