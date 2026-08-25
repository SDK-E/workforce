import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CeoCommercialPlanner } from "../src/autonomy/ceo-commercial-planner.js";
import { CeoOperatingLoop } from "../src/autonomy/ceo-operating-loop.js";
import { CeoTaskFactory } from "../src/autonomy/ceo-task-factory.js";
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

test("CEO chooses a commercial phase and gates external commitments", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-commercial-planner-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "commercial", name: "Commercial", mission: "Improve releases" });
    store.createCompany({ id: "unconfigured", name: "Unconfigured" });
    const planner = new CeoCommercialPlanner(store);
    const factory = new CeoTaskFactory(store);
    assert.equal(planner.decide("unconfigured").action, "await-configuration");
    assert.equal(planner.decide("commercial").action, "establish-direction");

    const direction = factory.create("commercial", planner.decide("commercial"));
    assert.equal(direction.status, "ready");
    assert.equal(store.strategyItems("commercial", "objective").length, 1);
    store.transitionTask("commercial", direction.id, "CANCEL", "ceo", "Direction recorded");
    assert.equal(planner.decide("commercial").action, "discover-opportunities");

    const opportunity = store.opportunities.create(
      {
        companyId: "commercial",
        name: "Release reliability",
        source: "Research",
        problem: "Releases fail",
        hypothesis: "Automation improves reliability",
        score: 90,
        discoveredBy: "ceo",
        ownerId: "ceo",
        evidenceIds: ["evidence-1"],
      },
      "ceo",
    );
    store.opportunities.update("commercial", opportunity.id, { stage: "validated" }, "ceo");
    const acquisition = planner.decide("commercial");
    assert.equal(acquisition.action, "qualify-lead");
    assert.equal(acquisition.authority, "approval-required");
    const waiting = factory.create("commercial", acquisition);
    assert.equal(waiting.status, "awaiting-approval");
    assert.equal(store.approvalsRepository.list("commercial", "pending")[0]?.subjectId, waiting.id);
    assert.equal(store.tasks("unconfigured").length, 0);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("CEO retries the same durable task after restart instead of duplicating work", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-ceo-restart-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "restart-co", name: "Restart", mission: "Ship safely" });
    const supervisor = new DockerSupervisor(store.attempts, unavailableDocker, store.audit);
    const execution = new TaskExecutionService(
      store.tasksRepository,
      store.models,
      store.tools,
      store.attemptFactory,
      supervisor,
    );
    await new CeoOperatingLoop(store, store.autonomy, execution).tick();
    const taskId = store.tasks("restart-co")[0]?.id;
    assert.ok(taskId);
    store.db
      .prepare("UPDATE company_runtime SET next_cycle_at=?,state='idle' WHERE company_id=?")
      .run(new Date(0).toISOString(), "restart-co");
    await new CeoOperatingLoop(store, store.autonomy, execution).tick();
    assert.equal(store.tasks("restart-co").length, 1);
    assert.equal(store.tasks("restart-co")[0]?.id, taskId);
    assert.equal(store.strategyItems("restart-co", "objective").length, 1);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("approved CEO commitment resumes the exact governed task", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-ceo-approval-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "approval-co", name: "Approval", mission: "Serve clients" });
    const factory = new CeoTaskFactory(store);
    const planner = new CeoCommercialPlanner(store);
    const direction = factory.create("approval-co", planner.decide("approval-co"));
    store.transitionTask("approval-co", direction.id, "CANCEL", "ceo", "Direction established");
    const opportunity = store.opportunities.create(
      {
        companyId: "approval-co",
        name: "Client need",
        source: "Research",
        problem: "Delivery is slow",
        hypothesis: "Automation accelerates delivery",
        score: 88,
        discoveredBy: "ceo",
        ownerId: "ceo",
        evidenceIds: ["research-2"],
      },
      "ceo",
    );
    store.opportunities.update("approval-co", opportunity.id, { stage: "validated" }, "ceo");
    const waiting = factory.create("approval-co", planner.decide("approval-co"));
    const approval = store.approvalsRepository.list("approval-co", "pending")[0];
    assert.ok(approval);
    store.approvalsRepository.decide(
      "approval-co",
      approval.id,
      "APPROVE",
      "human",
      "Contact authority granted for this task",
    );
    const supervisor = new DockerSupervisor(store.attempts, unavailableDocker, store.audit);
    const execution = new TaskExecutionService(
      store.tasksRepository,
      store.models,
      store.tools,
      store.attemptFactory,
      supervisor,
    );
    await new CeoOperatingLoop(store, store.autonomy, execution).tick();
    assert.equal(store.tasksRepository.get("approval-co", waiting.id)?.status, "assigned");
    assert.equal(
      store.tasks("approval-co").filter(({ objective }) => objective.includes("qualify-lead"))
        .length,
      1,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("CEO commercial planning advances from qualification through client delivery", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-ceo-commercial-flow-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({
      id: "flow-co",
      name: "Flow",
      mission: "Deliver reliable systems",
      policies: { autonomy: { authorities: ["external-contact"] } },
    });
    const planner = new CeoCommercialPlanner(store);
    const factory = new CeoTaskFactory(store);
    const direction = factory.create("flow-co", planner.decide("flow-co"));
    store.transitionTask("flow-co", direction.id, "CANCEL", "ceo", "Direction established");
    const opportunity = store.opportunities.create(
      {
        companyId: "flow-co",
        name: "Reliable delivery",
        source: "Research",
        problem: "Delivery failures",
        hypothesis: "Governed automation reduces failure",
        score: 93,
        discoveredBy: "ceo",
        ownerId: "ceo",
        evidenceIds: ["market-proof"],
      },
      "ceo",
    );
    store.opportunities.update("flow-co", opportunity.id, { stage: "validated" }, "ceo");
    assert.equal(planner.decide("flow-co").action, "qualify-lead");
    assert.equal(planner.decide("flow-co").authority, "delegated");
    const lead = store.leads.create(
      {
        companyId: "flow-co",
        opportunityId: opportunity.id,
        name: "Delivery owner",
        organization: "Client Co",
        email: null,
        website: null,
        source: "Qualified research",
        qualificationScore: 90,
        ownerId: "ceo",
        notes: "Need confirmed",
      },
      "ceo",
    );
    assert.equal(planner.decide("flow-co").action, "acquire-client");
    const client = store.clients.create(
      {
        companyId: "flow-co",
        leadId: lead.id,
        name: "Client Co",
        primaryContact: "Delivery owner",
        email: null,
        ownerId: "ceo",
        notes: "Active relationship",
      },
      "ceo",
    );
    assert.equal(planner.decide("flow-co").action, "plan-engagement");
    store.engagements.create(
      {
        companyId: "flow-co",
        clientId: client.id,
        projectId: null,
        name: "Reliable delivery program",
        scope: "Build and operate the delivery system",
        successCriteria: ["Independent production acceptance passes"],
        ownerId: "ceo",
        startsAt: null,
        endsAt: null,
      },
      "ceo",
    );
    assert.equal(planner.decide("flow-co").action, "deliver-engagement");
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
