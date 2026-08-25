import assert from "node:assert/strict";
import { Box } from "ink";
import { render } from "ink-testing-library";
import test from "node:test";
import { DEFAULT_AGENT_CONCURRENCY } from "../src/supervision/capacity-controller.js";
import type { PerformanceRecord } from "../src/governance/performance-repository.js";
import { nameDirectory } from "../src/tui/names.js";
import { ExecutiveOverview } from "../src/tui/views/executive-overview.js";
import { PerformanceView } from "../src/tui/views/performance-view.js";
import { TaskView } from "../src/tui/views/task-view.js";

const names = nameDirectory({});

test("performance view reports the real record count instead of a placeholder", () => {
  const records = [record("p1"), record("p2")];
  const instance = render(
    <Box width={80}>
      <PerformanceView records={records} names={names} />
    </Box>,
  );
  assert.match(instance.lastFrame() ?? "", /2 evidence-backed performance records/);
  instance.unmount();

  const recognition = render(
    <Box width={80}>
      <PerformanceView records={[record("r1", "recognition")]} kind="recognition" names={names} />
    </Box>,
  );
  assert.doesNotMatch(recognition.lastFrame() ?? "", /n record evidence-backed/);
  assert.match(recognition.lastFrame() ?? "", /1 evidence-backed recognition records/);
  recognition.unmount();
});

test("task view no longer prints its own key-hint footer", () => {
  const instance = render(
    <Box width={80}>
      <TaskView tasks={[]} names={names} />
    </Box>,
  );
  const frame = instance.lastFrame() ?? "";
  assert.doesNotMatch(frame, /n create · e edit/);
  assert.match(frame, /No tasks configured\./);
  instance.unmount();
});

test("executive overview derives its concurrency line from the supervisor constant", async () => {
  const instance = render(
    <Box width={100} height={30}>
      <ExecutiveOverview
        company={{
          id: "acme",
          name: "Acme",
          displayName: "Acme",
          mission: "",
          vision: "",
          values: [],
          policies: {},
          budgetCents: 0,
          status: "active",
          createdAt: new Date().toISOString(),
        }}
        docker={{ available: true }}
        compact={false}
        activeEmployees={0}
        activeAttempts={0}
        queuedAttempts={0}
        pendingApprovals={0}
        acceptedDeliverables={0}
        eventCount={0}
        auditVerified
        strategyItems={[]}
        onboarding={[]}
        active
      />
    </Box>,
  );
  instance.stdin.write("\x1b[C");
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  const frame = instance.lastFrame() ?? "";
  assert.match(frame, new RegExp(`up to ${DEFAULT_AGENT_CONCURRENCY} containers`));
  assert.doesNotMatch(frame, /Memory policy/);
  instance.unmount();
});

function record(id: string, kind: PerformanceRecord["kind"] = "observation"): PerformanceRecord {
  return {
    id,
    companyId: "acme",
    employeeId: "emp-1",
    kind,
    summary: `Summary for ${id}`,
    evidenceIds: ["event-1"],
    authorId: "ceo",
    createdAt: new Date().toISOString(),
  };
}
