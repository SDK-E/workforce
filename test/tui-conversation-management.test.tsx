import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { render } from "ink-testing-library";
import { StateStore } from "../src/storage/state-store.js";
import { CreateOverlay } from "../src/tui/overlays/create-overlay.js";
import { createFormForSection } from "../src/tui/overlays/form-routing.js";

test("Conversations creates threads, scoped messages, and attachment references", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-tui-conversations-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    const company = store.createCompany({ id: "acme", name: "Acme" });
    const room = store.conversations.rooms.create("acme", "Delivery", "team", "human");
    assert.equal(createFormForSection("Conversations"), "conversation");

    const threadView = renderOverlay(store, company);
    await send(threadView, "\u001B[B");
    await send(threadView, "\r");
    await send(threadView, "\r");
    await send(threadView, "Release evidence");
    await send(threadView, "\r");
    await send(threadView, "\r");
    const thread = store.conversations.threads.list("acme", room.id)[0];
    assert.ok(thread);
    assert.equal(thread.title, "Release evidence");
    threadView.unmount();

    const messageView = renderOverlay(store, company);
    await send(messageView, "\u001B[B");
    await send(messageView, "\u001B[B");
    await send(messageView, "\r");
    await send(messageView, "\r");
    await send(messageView, "\u001B[B");
    await send(messageView, "\r");
    await send(messageView, "Validator evidence is ready");
    await send(messageView, "\r");
    await send(messageView, "\r");
    const message = store.conversations.messagePage("acme", room.id).items[0];
    assert.ok(message);
    assert.equal(message.authorId, "human");
    assert.equal(message.threadId, thread.id);
    assert.equal(message.body, "Validator evidence is ready");
    messageView.unmount();

    const attachmentView = renderOverlay(store, company);
    for (let index = 0; index < 3; index += 1) await send(attachmentView, "\u001B[B");
    await send(attachmentView, "\r");
    await send(attachmentView, "\r");
    await send(attachmentView, "report.json");
    await send(attachmentView, "\r");
    await send(attachmentView, "\r");
    await send(attachmentView, "42");
    await send(attachmentView, "\r");
    await send(attachmentView, "a".repeat(64));
    await send(attachmentView, "\r");
    await send(attachmentView, "reports/release");
    await send(attachmentView, "\r");
    await send(attachmentView, "\r");
    const attachment = store.conversations.attachments.list("acme", message.id)[0];
    assert.ok(attachment);
    assert.equal(attachment.filename, "report.json");
    assert.equal(attachment.mediaType, "application/octet-stream");
    assert.equal(attachment.sizeBytes, 42);
    assert.equal(attachment.artifactUri, "artifact://reports/release");
    assert.ok(store.verifyAuditChain());
    attachmentView.unmount();
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function renderOverlay(store: StateStore, company: ReturnType<StateStore["createCompany"]>) {
  return render(
    <CreateOverlay
      kind="conversation"
      section="Conversations"
      company={company}
      store={store}
      terminalWidth={100}
      selectedTarget={null}
      onCompanyChange={() => undefined}
      onClose={() => undefined}
      onStatus={() => undefined}
    />,
  );
}

async function send(view: ReturnType<typeof render>, input: string): Promise<void> {
  view.stdin.write(input);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 60);
  });
}
