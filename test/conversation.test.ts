import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { StateStore } from "../src/storage/state-store.js";

test("rooms, threads, messages, pins, redaction, and attachments remain company scoped", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-conversations-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "alpha", name: "Alpha" });
    store.createCompany({ id: "bravo", name: "Bravo" });
    const room = store.conversations.rooms.create("alpha", "Engineering", "team", "ceo");
    store.conversations.rooms.configure(
      "alpha",
      room.id,
      { retentionDays: 90, announcement: "Ship safely", status: "active" },
      "ceo",
    );
    const updatedRoom = store.conversations.rooms.update(
      "alpha",
      room.id,
      {
        name: "Product engineering",
        kind: "department",
        retentionDays: 120,
        announcement: "Evidence before claims",
      },
      "ceo",
    );
    assert.equal(updatedRoom.name, "Product engineering");
    assert.equal(updatedRoom.retentionDays, 120);
    const membership = store.conversations.addRoomMember(
      "alpha",
      room.id,
      "arm",
      "moderator",
      "ceo",
    );
    assert.equal(membership.role, "moderator");
    const thread = store.conversations.createThread("alpha", room.id, "Release", "ceo");
    const message = store.conversations.addMessage(
      "alpha",
      room.id,
      "arm",
      "release evidence",
      thread.id,
    );
    assert.equal(
      store.conversations.messages.edit("alpha", message.id, "arm", "verified").status,
      "edited",
    );
    store.conversations.messages.pin("alpha", room.id, message.id, "ceo");
    const attachment = store.conversations.createAttachment({
      companyId: "alpha",
      messageId: message.id,
      filename: "report.json",
      mediaType: "application/json",
      sizeBytes: 42,
      digest: "a".repeat(64),
      artifactUri: "artifact://reports/release",
      createdBy: "arm",
    });
    assert.equal(store.conversations.attachments.list("alpha", message.id)[0]?.id, attachment.id);
    const redacted = store.conversations.messages.redact("alpha", message.id, "ceo", "sensitive");
    assert.equal(redacted.body, "[redacted]");
    assert.equal(redacted.pinned, true);
    assert.equal(store.conversations.messagePage("alpha", room.id, "redacted").items.length, 1);
    assert.throws(() => store.conversations.messagePage("bravo", room.id), /Unknown room/);
    assert.throws(
      () =>
        store.conversations.createAttachment({
          companyId: "bravo",
          messageId: message.id,
          filename: "x",
          mediaType: "text/plain",
          sizeBytes: 1,
          digest: "b".repeat(64),
          artifactUri: "artifact://x",
          createdBy: "ceo",
        }),
      /Unknown message/,
    );
    store.conversations.threads.setStatus("alpha", thread.id, "closed", "ceo");
    assert.equal(store.conversations.threads.list("alpha", room.id)[0]?.status, "closed");
    assert.equal(
      store.conversations.roomList("alpha").find(({ id }) => id === room.id)?.retentionDays,
      120,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
