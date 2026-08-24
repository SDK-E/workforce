import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { Box, Text } from "ink";
import type { CompanyRecord } from "../src/storage/records.js";
import { CompanyForm } from "../src/tui/overlays/company-form.js";
import { TaskView } from "../src/tui/views/task-view.js";
import { ConversationView } from "../src/tui/views/conversation-view.js";
import { TaskForm } from "../src/tui/overlays/task-form.js";
import type { CreateTaskInput } from "../src/tasks/task-types.js";
import { ModalBackdrop } from "../src/tui/components/modal-backdrop.js";

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
          inputs: [],
          outputs: [{ path: "deliverable.md", required: true }],
          tools: [],
          modelPolicy: {
            enginePreference: ["opencode"],
            preferredModels: [],
            fallbackModels: [],
          },
          escalationPath: ["manager", "ceo"],
          completionEvidence: [],
          networkPolicy: { mode: "inference-only" },
          resourcePolicy: {},
          managerId: "ceo",
          assigneeId: "engineer-1",
          reviewerId: "arm",
          priority: 80,
          dueAt: null,
          createdAt: company.createdAt,
          updatedAt: company.createdAt,
        },
      ]}
    />,
  );
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /\[verifying\] P80 · Verify the release/);
  assert.match(frame, /high risk/);
  assert.match(frame, /engineer-1/);
  view.unmount();
});

test("conversation view exposes rooms, threads, pins, and message state", () => {
  const view = render(
    <ConversationView
      rooms={[
        {
          id: "room-1",
          companyId: "acme",
          name: "Engineering",
          kind: "team",
          retentionDays: 90,
          announcement: "Ship safely",
          status: "active",
          createdAt: company.createdAt,
          updatedAt: company.createdAt,
        },
      ]}
      threads={[
        {
          id: "thread-1",
          companyId: "acme",
          roomId: "room-1",
          title: "Release",
          createdBy: "ceo",
          status: "open",
          createdAt: company.createdAt,
          updatedAt: company.createdAt,
        },
      ]}
      messages={[
        {
          id: "message-1",
          companyId: "acme",
          roomId: "room-1",
          threadId: "thread-1",
          authorId: "arm",
          body: "Evidence attached",
          pinned: true,
          status: "edited",
          createdAt: company.createdAt,
          updatedAt: company.createdAt,
          redactedBy: null,
          redactionReason: null,
        },
      ]}
    />,
  );
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /1 rooms · 1 CEO-office threads/);
  assert.match(frame, /◆ arm: Evidence attached \(edited\)/);
  view.unmount();
});

test("task form uses maintained controls and confirms before submitting", async () => {
  let submitted: CreateTaskInput | undefined;
  const view = render(
    <Box width={100} height={30}>
      <TaskForm
        companyId="acme"
        terminalWidth={100}
        onCancel={noop}
        onSubmit={(input) => {
          submitted = input;
        }}
      />
    </Box>,
  );
  for (const input of ["Verify release", "\r", "Tests pass", "\r", "2"]) {
    view.stdin.write(input);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 20);
    });
  }
  assert.match(view.lastFrame() ?? "", /Confirm/);
  view.stdin.write("\r");
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 20);
  });
  assert.equal(submitted?.objective, "Verify release");
  assert.deepEqual(submitted.acceptanceCriteria, ["Tests pass"]);
  assert.equal(submitted.risk, "medium");
  view.unmount();
});

test("modal backdrop repaints the full terminal instead of exposing underlying content", () => {
  const view = render(
    <Box width={80} height={20}>
      <Text>CONTENT BEHIND MODAL</Text>
      <ModalBackdrop width={40}>
        <Box borderStyle="double">
          <Text>Readable modal</Text>
        </Box>
      </ModalBackdrop>
    </Box>,
  );
  const frame = view.lastFrame() ?? "";
  assert.match(frame, /Readable modal/);
  assert.doesNotMatch(frame, /CONTENT BEHIND MODAL/);
  view.unmount();
});
