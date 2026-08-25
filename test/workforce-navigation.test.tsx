import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { render } from "ink-testing-library";
import { StateStore } from "../src/storage/state-store.js";
import { WorkforceApp } from "../src/tui/workforce-app.js";

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

test("rendered TUI arrows reach sidebar pages, palette choices, and room rows", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-navigation-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    const company = store.createCompany({ id: "acme", name: "Acme" });
    store.conversations.rooms.create("acme", "Alpha room", "company", "human");
    store.conversations.rooms.create("acme", "Beta room", "company", "human");
    const view = render(
      <WorkforceApp
        store={store}
        docker={{ available: false, reason: "test" }}
        initialCompany={company}
        onEmergencyStop={() => Promise.resolve()}
        onStartTask={() => Promise.resolve()}
        onVerifyMcp={() => Promise.resolve()}
        onVerifyModel={() => Promise.resolve()}
      />,
    );

    view.stdin.write("\u001B[B");
    await settle();
    assert.match(view.lastFrame() ?? "", /Overview › CEO office/);

    view.stdin.write("/");
    await settle();
    assert.match(view.lastFrame() ?? "", /Command palette/);
    view.stdin.write("\u001B[B");
    await settle();
    assert.match(view.lastFrame() ?? "", /› CEO office/);
    view.stdin.write("\r");
    await settle();
    assert.match(view.lastFrame() ?? "", /Overview › CEO office/);

    view.stdin.write("/");
    await settle();
    view.stdin.write("\u001B");
    await settle();
    assert.doesNotMatch(view.lastFrame() ?? "", /Command palette/);

    view.stdin.write("/");
    await settle();
    view.stdin.write("Conversations");
    await settle();
    view.stdin.write("\r");
    await settle();
    assert.match(view.lastFrame() ?? "", /Collaboration › Conversations/);
    view.stdin.write("\u001B[B");
    await settle();
    assert.match(view.lastFrame() ?? "", /› Beta room/);
    view.unmount();
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
