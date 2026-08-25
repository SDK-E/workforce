import assert from "node:assert/strict";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import { ApprovalDecisionForm } from "../src/tui/overlays/approval-decision-form.js";
import { AutomationDecisionForm } from "../src/tui/overlays/automation-decision-form.js";
import { HiringDecisionForm } from "../src/tui/overlays/hiring-decision-form.js";

const noop = (): undefined => undefined;

test("governance decisions start from the selected record", async () => {
  const approval = render(
    <Box width={100} height={30}>
      <ApprovalDecisionForm
        terminalWidth={100}
        initialApprovalId="approval-one"
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  await settle();
  assert.match(approval.lastFrame() ?? "", /Decision/);
  assert.doesNotMatch(approval.lastFrame() ?? "", /Approval ID/);
  approval.unmount();
  const automation = render(
    <Box width={100} height={30}>
      <AutomationDecisionForm
        automationId="automation-one"
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  await settle();
  assert.match(automation.lastFrame() ?? "", /Proposal automation-one/);
  automation.unmount();
  const hiring = render(
    <Box width={100} height={30}>
      <HiringDecisionForm
        proposalId="hire-one"
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  await settle();
  assert.match(hiring.lastFrame() ?? "", /Proposal hire-one/);
  hiring.unmount();
});

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
