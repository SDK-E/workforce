import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import type { SandboxSpec } from "../src/domain.js";
import { StateStore } from "../src/storage/state-store.js";
import { WorkforceThemeProvider } from "../src/tui/themes/theme-context.js";
import { DEFAULT_THEME } from "../src/tui/themes/index.js";
import { WorkflowTimelineView } from "../src/tui/views/workflow-timeline-view.js";

const sandbox: SandboxSpec = {
  jobId: "timeline-job",
  profile: "engineering",
  image: "workforce-agent:0.1.0",
  engine: "opencode",
  networkMode: "audited-internet",
  allowedHosts: [],
  readOnlyRoot: true,
  nonRoot: true,
  capDropAll: true,
  noNewPrivileges: true,
  workspace: { type: "volume", name: "timeline-volume" },
  inputs: [],
  tmpfs: [],
  cpu: 1,
  memoryMb: 1024,
  pids: 128,
  timeoutSeconds: 600,
  tools: [],
  decisions: [],
  rejectedCapabilities: [],
};

test("workflow timeline renders durable company-scoped attempt progression", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-timeline-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "alpha", name: "Alpha" });
    store.createCompany({ id: "beta", name: "Beta" });
    const attempt = store.attempts.enqueue({
      id: "attempt-alpha",
      companyId: "alpha",
      taskId: "task-alpha",
      employeeId: "ceo",
      sandbox,
      command: ["opencode", "run"],
      secretNames: [],
      ephemeralSecretNames: [],
    });
    store.attempts.acquire(attempt, "supervisor-one");
    store.attempts.setStatus(attempt.id, "running");
    store.attempts.event(attempt.id, "checkpoint.recorded", { summary: "Plan approved" });
    const events = store.attempts.listEvents("alpha");
    assert.deepEqual(store.attempts.listEvents("beta"), []);
    const view = render(
      <WorkforceThemeProvider theme={DEFAULT_THEME}>
        <Box width={120} height={35}>
          <WorkflowTimelineView
            attempts={store.attempts.list("alpha")}
            events={events}
            compact={false}
          />
        </Box>
      </WorkforceThemeProvider>,
    );
    const frame = view.lastFrame() ?? "";
    assert.match(frame, /Agent workflow timeline/);
    assert.match(frame, /ceo · task-alpha · running/);
    assert.match(frame, /lease.acquired/);
    assert.match(frame, /checkpoint.recorded/);
    assert.match(frame, /Plan approved/);
    view.unmount();
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
