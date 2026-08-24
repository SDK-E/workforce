import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { Box } from "ink";
import type { CompanyRecord } from "../src/storage/records.js";
import { CompanyForm } from "../src/tui/overlays/company-form.js";
import { TaskView } from "../src/tui/views/task-view.js";

const company: CompanyRecord = {
  id: "acme",
  name: "Acme",
  displayName: "Acme",
  mission: "",
  vision: "",
  values: [],
  policies: { network: "audited-internet" },
  budgetCents: 0,
  createdAt: "2026-08-25T00:00:00.000Z",
};
const noop = (): undefined => undefined;

test("company form renders an accessible labelled workflow", async () => {
  const view = render(
    <Box width={100} height={30}>
      <CompanyForm company={company} terminalWidth={100} onSubmit={noop} onCancel={noop} />
    </Box>,
  );
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /Configure Acme/);
  assert.match(frame, /Mission/);
  assert.match(frame, /Enter next\/save/);
  view.unmount();
});

test("task view renders status, risk, assignee, and objective", () => {
  const view = render(
    <TaskView
      tasks={[
        {
          id: "task-1",
          companyId: "acme",
          projectId: null,
          parentTaskId: null,
          objective: "Verify the release",
          nonGoals: [],
          acceptanceCriteria: ["Tests pass"],
          status: "verifying",
          risk: "high",
          dataSensitivity: "internal",
          capabilities: [],
          networkPolicy: { mode: "none" },
          resourcePolicy: {},
          managerId: "ceo",
          assigneeId: "engineer-1",
          reviewerId: "arm",
          createdAt: company.createdAt,
          updatedAt: company.createdAt,
        },
      ]}
    />,
  );
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /\[verifying\] Verify the release/);
  assert.match(frame, /high risk/);
  assert.match(frame, /engineer-1/);
  view.unmount();
});
