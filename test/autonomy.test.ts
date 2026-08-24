import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CeoOperatingLoop } from "../src/autonomy/ceo-operating-loop.js";
import { StateStore } from "../src/storage/state-store.js";
import type { DockerClient } from "../src/supervision/docker-client.js";
import { DockerSupervisor } from "../src/supervision/docker-supervisor.js";
import { TaskExecutionService } from "../src/tasks/task-execution-service.js";

const unavailableDocker: DockerClient = {
  available: () => Promise.resolve(false),
  createVolume: () => Promise.resolve(),
  exportVolume: () => Promise.resolve(),
  start: () => Promise.reject(new Error("must not start without a configured model")),
  stop: () => Promise.resolve(),
  managedContainers: () => Promise.resolve([]),
  removeContainer: () => Promise.resolve(),
};

test("each company has isolated leaders and a recoverable autonomous CEO cycle", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-autonomy-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "alpha", name: "Alpha", mission: "Ship Alpha outcomes" });
    store.createCompany({ id: "beta", name: "Beta", mission: "Ship Beta outcomes" });
    assert.deepEqual(
      store
        .employees("alpha")
        .map(({ id }) => id)
        .sort(),
      ["arm", "ceo"],
    );
    assert.deepEqual(
      store
        .employees("beta")
        .map(({ id }) => id)
        .sort(),
      ["arm", "ceo"],
    );
    const supervisor = new DockerSupervisor(store.attempts, unavailableDocker, store.audit);
    const execution = new TaskExecutionService(
      store.tasksRepository,
      store.models,
      store.tools,
      store.attemptFactory,
      supervisor,
    );
    const loop = new CeoOperatingLoop(store, store.autonomy, execution);
    await loop.tick();

    assert.equal(store.tasks("alpha").length, 1);
    assert.equal(store.tasks("beta").length, 1);
    assert.equal(store.tasks("alpha")[0]?.assigneeId, "ceo");
    assert.equal(store.autonomy.get("alpha")?.state, "blocked");
    assert.equal(store.autonomy.get("beta")?.state, "blocked");
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
