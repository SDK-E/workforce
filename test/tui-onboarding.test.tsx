import assert from "node:assert/strict";
import { Box } from "ink";
import { render } from "ink-testing-library";
import test from "node:test";
import type { CompanyRecord } from "../src/storage/records.js";
import { onboardingComplete, onboardingSteps } from "../src/tui/onboarding-steps.js";
import type { OnboardingStep } from "../src/tui/onboarding-steps.js";
import { ExecutiveOverview } from "../src/tui/views/executive-overview.js";

const company: CompanyRecord = {
  id: "acme",
  name: "Acme",
  displayName: "Acme",
  mission: "Ship reliably",
  vision: "",
  values: [],
  policies: {},
  budgetCents: 0,
  status: "active",
  createdAt: new Date().toISOString(),
};

function stepsWith(overrides: Partial<Record<string, boolean>>): OnboardingStep[] {
  return onboardingSteps({
    models: [{ model: "unconfigured", health: "unknown", verifiedAt: null }],
    tasks: [],
    strategyItems: [],
    artifacts: [],
  }).map((step) => (overrides[step.label] === undefined ? step : { ...step, done: true }));
}

test("onboarding checklist tracks the first-run path in order", () => {
  const steps = onboardingSteps({
    models: [
      { model: "openai/gpt-5", health: "healthy", verifiedAt: new Date().toISOString() },
      { model: "unconfigured", health: "unknown", verifiedAt: null },
    ],
    tasks: [{ id: "task-1" }],
    strategyItems: [],
    artifacts: [],
  });
  assert.deepEqual(
    steps.map(({ label, done }) => [label, done]),
    [
      ["Configure a model", true],
      ["Verify the model", true],
      ["Describe work", true],
      ["Run a task and inspect its deliverable", false],
    ],
  );
  assert.equal(onboardingComplete(steps), false);
  assert.equal(onboardingComplete(steps.map((step) => ({ ...step, done: true }))), true);
});

test("executive overview shows the checklist until every step is done", async () => {
  const incomplete = render(
    <Box width={100} height={30}>
      <ExecutiveOverview
        company={company}
        docker={{ available: true }}
        compact={false}
        activeEmployees={2}
        activeAttempts={0}
        queuedAttempts={0}
        pendingApprovals={0}
        acceptedDeliverables={0}
        eventCount={3}
        auditVerified
        strategyItems={[]}
        onboarding={stepsWith({})}
        active={false}
      />
    </Box>,
  );
  await settle();
  const frame = incomplete.lastFrame() ?? "";
  assert.match(frame, /GETTING STARTED/);
  assert.match(frame, /\[ \] Configure a model — Models & engines · n/);
  assert.match(frame, /Identities persist;/);
  assert.match(frame, /containers run only/);
  incomplete.unmount();

  const complete = render(
    <Box width={100} height={30}>
      <ExecutiveOverview
        company={company}
        docker={{ available: true }}
        compact={false}
        activeEmployees={2}
        activeAttempts={1}
        queuedAttempts={0}
        pendingApprovals={0}
        acceptedDeliverables={2}
        eventCount={30}
        auditVerified
        strategyItems={[]}
        onboarding={stepsWith({
          "Configure a model": true,
          "Verify the model": true,
          "Describe work": true,
          "Run a task and inspect its deliverable": true,
        })}
        active={false}
      />
    </Box>,
  );
  await settle();
  assert.doesNotMatch(complete.lastFrame() ?? "", /GETTING STARTED/);
  complete.unmount();
});

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
