import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { render } from "ink-testing-library";
import { Box } from "ink";
import { StateStore } from "../src/storage/state-store.js";
import { EmployeeMutationOverlay } from "../src/tui/overlays/employee-mutation-overlay.js";

test("human hiring form creates an approved probationary employee and dynamic identity", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-employee-tui-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    const company = store.createCompany({ id: "acme", name: "Acme" });
    const view = render(
      <Box width={100} height={30}>
        <EmployeeMutationOverlay
          kind="employee-hire"
          company={company}
          store={store}
          terminalWidth={100}
          selectedTarget={null}
          onClose={() => undefined}
          finish={(action) => {
            action();
          }}
        />
      </Box>,
    );

    for (const input of [
      "Build and verify browser applications",
      "\r",
      "language:typescript, browser, git, public-internet, build:pnpm",
      "\r",
      "Browser checks pass, Evidence is attached",
      "\r",
      "\r",
    ]) {
      view.stdin.write(input);
      await settle();
    }

    const proposal = store.employment.proposalList("acme")[0];
    assert.ok(proposal);
    assert.equal(proposal.status, "approved");
    assert.ok(proposal.probationCriteria.includes("Satisfy and evidence: Browser checks pass"));
    assert.ok(proposal.probationCriteria.includes("Satisfy and evidence: Evidence is attached"));
    const employee = store.employees("acme").find((item) => item.id === proposal.employeeId);
    assert.ok(employee);
    assert.equal(employee.status, "probation");
    assert.ok(proposal.blueprint.sandbox.tools.includes("playwright"));
    assert.equal(proposal.blueprint.sandbox.networkMode, "audited-internet");
    assert.ok(store.agentProfiles.profile("acme", employee.id));
    assert.ok(store.agentProfiles.active("acme", employee.id));
    view.unmount();
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 20);
  });
}
