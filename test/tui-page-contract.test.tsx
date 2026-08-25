import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { render } from "ink-testing-library";
import { StateStore } from "../src/storage/state-store.js";
import { NAVIGATION_SECTIONS } from "../src/tui/navigation.js";
import { WorkspaceView } from "../src/tui/views/workspace-view.js";
import { loadWorkspaceData } from "../src/tui/workspace-data.js";

test("every configured workspace page has an explicit production view", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-tui-pages-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    const company = store.createCompany({ id: "page-audit", name: "Page Audit" });
    const data = loadWorkspaceData(store, company.id);
    const sections = NAVIGATION_SECTIONS.filter((section) => section !== "Executive overview");
    assert.ok(sections.length > 30);
    for (const section of sections) {
      const view = render(
        <WorkspaceView
          {...data}
          section={section}
          company={company}
          auditVerified={store.verifyAuditChain()}
          docker={{ available: true, version: "page-contract" }}
          compact={false}
          selectedRow={0}
        />,
      );
      assert.notEqual(view.lastFrame()?.trim(), "", `${section} rendered an empty page`);
      view.unmount();
    }
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
