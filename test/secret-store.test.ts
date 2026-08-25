import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EncryptedSecretStore } from "../src/secrets/encrypted-secret-store.js";
import { CredentialImporter } from "../src/secrets/credential-importer.js";
import { resolveAttemptSecrets } from "../src/secrets/attempt-secret-provider.js";

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

test("trusted credential import and attempt injection preserve scopes without exposing values", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-credential-import-"));
  const secrets = new EncryptedSecretStore(root);
  try {
    secrets.initialize();
    const importer = new CredentialImporter(secrets, () =>
      Promise.resolve({ exitCode: 0, stdout: "github-secret\n" }),
    );
    await importer.importGitHub("acme", { employeeIds: ["engineer"], taskIds: ["task-1"] });
    importer.importVercel("acme", "vercel-secret\n", {
      employeeIds: ["engineer"],
      taskIds: ["task-1"],
    });
    const environment = resolveAttemptSecrets(secrets, {
      id: "attempt",
      companyId: "acme",
      taskId: "task-1",
      employeeId: "engineer",
      sandbox: {} as never,
      command: [],
      secretNames: ["GITHUB_TOKEN", "VERCEL_TOKEN"],
      ephemeralSecretNames: [],
      environment: {},
      instructionRevision: null,
      instructionDigest: null,
      status: "running",
      containerName: "workforce-attempt",
      exitCode: null,
      failureReason: null,
      queuedAt: "",
      startedAt: "",
      finishedAt: null,
      updatedAt: "",
    });
    assert.deepEqual(environment, {
      GITHUB_TOKEN: "github-secret",
      VERCEL_TOKEN: "vercel-secret",
    });
    assert.throws(
      () =>
        resolveAttemptSecrets(secrets, {
          id: "denied",
          companyId: "acme",
          taskId: "other",
          employeeId: "engineer",
          sandbox: {} as never,
          command: [],
          secretNames: ["GITHUB_TOKEN"],
          ephemeralSecretNames: [],
          environment: {},
          instructionRevision: null,
          instructionDigest: null,
          status: "running",
          containerName: "workforce-denied",
          exitCode: null,
          failureReason: null,
          queuedAt: "",
          startedAt: "",
          finishedAt: null,
          updatedAt: "",
        }),
      /denied/,
    );
  } finally {
    secrets.close();
    rmSync(root, { recursive: true, force: true });
  }
});
