import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { AgentResourcesView } from "../src/tui/views/agent-resources-view.js";

test("Agent Resources exposes reinforcement and ARM decision status", () => {
  const view = render(
    <AgentResourcesView
      proposals={[]}
      plans={[
        {
          id: "plan-1",
          companyId: "company",
          employeeId: "worker",
          status: "active",
          rationale: "Correctable performance gap",
          criteria: ["Accepted delivery"],
          evidenceIds: ["evidence-1"],
          createdBy: "arm",
          reviewAt: "2026-09-01T00:00:00.000Z",
          createdAt: "2026-08-25T00:00:00.000Z",
          updatedAt: "2026-08-25T00:00:00.000Z",
        },
      ]}
      decisions={[
        {
          id: "decision-1",
          companyId: "company",
          action: "reinforce",
          subjectType: "employee",
          subjectId: "worker",
          referenceId: "plan-1",
          rationale: "Reinforce before replacement",
          evidenceIds: ["evidence-1"],
          createdAt: "2026-08-25T00:00:00.000Z",
        },
      ]}
      selectedRow={0}
    />,
  );
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /REINFORCEMENT/);
  assert.match(frame, /active.*worker/);
  assert.match(frame, /reinforce.*worker/);
  assert.match(frame, /No hiring proposals/);
  view.unmount();
});
