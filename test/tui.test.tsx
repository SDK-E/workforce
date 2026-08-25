import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import type { CompanyRecord } from "../src/storage/records.js";
import { nameDirectory } from "../src/tui/names.js";
import { TaskView } from "../src/tui/views/task-view.js";
import { ConversationView } from "../src/tui/views/conversation-view.js";

const company: CompanyRecord = {
  id: "acme",
  name: "Acme",
  displayName: "Acme",
  mission: "",
  vision: "",
  values: [],
  policies: {},
  budgetCents: 0,
  status: "active",
  createdAt: "2026-08-25T00:00:00.000Z",
};

test("task view renders status, risk, named assignee, and objective", () => {
  const view = render(
    <TaskView
      names={nameDirectory({
        employees: [
          {
            id: "engineer-1",
            name: "Ada Engineer",
            title: "Engineer",
            department: "Engineering",
            manager: null,
            status: "active",
            responsibilities: [],
            capabilityTags: [],
            hiredAt: company.createdAt,
          },
        ],
      })}
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
  assert.match(frame, /assigned to Ada Engineer/);
  view.unmount();
});

test("conversation view exposes rooms, threads, pins, and message state", () => {
  const view = render(
    <ConversationView
      names={nameDirectory({
        employees: [
          {
            id: "arm",
            name: "Resources Manager",
            title: "ARM",
            department: "Governance",
            manager: null,
            status: "active",
            responsibilities: [],
            capabilityTags: [],
            hiredAt: company.createdAt,
          },
        ],
      })}
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
  assert.match(frame, /Engineering/);
  assert.match(frame, /1 rooms · 1 threads in the primary room/);
  assert.match(frame, /#Release · thread · open/);
  assert.match(frame, /◆ Resources Manager: Evidence attached \(edited\)/);
  view.unmount();
});
