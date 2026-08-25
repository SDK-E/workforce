import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { nameDirectory } from "../src/tui/names.js";
import { CeoOfficeView } from "../src/tui/views/ceo-office-view.js";

test("CEO office renders the latest durable autonomous decision", () => {
  const view = render(
    <CeoOfficeView
      runtime={{
        companyId: "company",
        enabled: true,
        cadenceSeconds: 30,
        monthlyBudgetCents: 0,
        maxConcurrentAttempts: 2,
        state: "idle",
        lastCycleAt: "2026-08-25T00:00:00.000Z",
        nextCycleAt: "2026-08-25T00:00:30.000Z",
        updatedAt: "2026-08-25T00:00:00.000Z",
      }}
      cycle={{
        id: "cycle",
        companyId: "company",
        leaderId: "ceo",
        status: "completed",
        leaseOwner: "daemon",
        leaseExpiresAt: "2026-08-25T00:02:00.000Z",
        observation: {},
        decision: {
          action: "discover-opportunities",
          rationale: "The company has no active commercial opportunities",
        },
        spawnedTaskId: "task-1",
        startedAt: "2026-08-25T00:00:00.000Z",
        finishedAt: "2026-08-25T00:00:01.000Z",
        failureReason: null,
      }}
      rooms={[]}
      messages={[]}
      names={nameDirectory({
        tasks: [{ id: "task-1", objective: "Draft the opportunity brief" }],
      })}
    />,
  );
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /CEO office/);
  assert.match(frame, /discover-opportunities/);
  assert.match(frame, /no active commercial/);
  assert.match(frame, /opportunities/);
  assert.match(frame, /Draft the opportunity brief/);
  view.unmount();
});
