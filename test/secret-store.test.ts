import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EncryptedSecretStore } from "../src/secrets/encrypted-secret-store.js";

test("secrets are encrypted, company scoped, and access scoped", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-secrets-"));
  const events: string[] = [];
  const store = new EncryptedSecretStore(root, (event) => {
    events.push(event);
  });
  try {
    store.initialize();
    store.set("acme", "GITHUB_TOKEN", "not-a-real-token", {
      employeeIds: ["engineer-1"],
      taskIds: ["task-1"],
    });
    const rawDatabase = readFileSync(store.databasePath);
    assert.equal(rawDatabase.includes(Buffer.from("not-a-real-token")), false);
    assert.equal(
      store.get("GITHUB_TOKEN", {
        companyId: "acme",
        employeeId: "engineer-1",
        taskId: "task-1",
      }),
      "not-a-real-token",
    );
    assert.throws(
      () =>
        store.get("GITHUB_TOKEN", {
          companyId: "acme",
          employeeId: "engineer-2",
          taskId: "task-1",
        }),
      /access denied/,
    );
    assert.deepEqual(events, ["secret.stored", "secret.accessed", "secret.denied"]);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
