import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { StateStore } from "../src/storage/state-store.js";
import {
  applyLifecycleAction,
  lifecycleTargets,
  lifecycleVerb,
} from "../src/tui/lifecycle-actions.js";

test("selected TUI resources archive and restore without deleting records", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-tui-lifecycle-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const room = store.conversations.rooms.create("acme", "Operations", "company", "human");
    const department = store.createOrganizationUnit({
      companyId: "acme",
      kind: "department",
      name: "Engineering",
    });
    const objective = store.createStrategyItem({
      companyId: "acme",
      kind: "objective",
      name: "Reliable delivery",
      ownerId: "ceo",
      managerId: "ceo",
      successMeasures: ["Acceptance passes"],
    });
    const meeting = store.meetings.create({
      companyId: "acme",
      title: "Delivery review",
      organizerId: "ceo",
      participantIds: ["arm"],
      agenda: ["Verify evidence"],
      scheduledAt: new Date().toISOString(),
    });
    store.meetings.transition("acme", meeting.id, "CANCEL", "human");
    const task = store.createTask({
      companyId: "acme",
      objective: "Retain lifecycle history",
      acceptanceCriteria: ["History is preserved"],
      risk: "low",
      dataSensitivity: "internal",
      managerId: "ceo",
    });
    store.transitionTask("acme", task.id, "CANCEL", "human", "No longer required");
    store.automations.propose({
      companyId: "acme",
      requestedBy: "ceo",
      title: "Evidence refresh",
      trigger: { kind: "interval", everySeconds: 60 },
      action: {
        kind: "task",
        objective: "Refresh evidence",
        acceptanceCriteria: ["Evidence is current"],
      },
      rationale: "Avoid repeated scheduling",
      estimatedRunsSaved: 2,
    });
    const data = workspaceData(store, "acme");
    assert.equal(lifecycleTargets("Companies", data)[0]?.kind, "company");
    assert.equal(lifecycleTargets("Employees", data)[0]?.kind, "employee");
    assert.equal(lifecycleTargets("Conversations", data)[0]?.kind, "room");
    assert.equal(lifecycleTargets("Models & engines", data)[0]?.kind, "model");
    const departmentTarget = lifecycleTargets("Departments", data)[0];
    const objectiveTarget = lifecycleTargets("Objectives", data)[0];
    const taskTarget = lifecycleTargets("Tasks", data)[0];
    const automationTarget = lifecycleTargets("Automations", data)[0];
    const roomTarget = lifecycleTargets("Conversations", data)[0];
    const meetingTarget = lifecycleTargets("Meetings", data)[0];
    assert.ok(
      departmentTarget &&
        objectiveTarget &&
        taskTarget &&
        automationTarget &&
        roomTarget &&
        meetingTarget,
    );

    for (const target of [
      departmentTarget,
      objectiveTarget,
      taskTarget,
      automationTarget,
      roomTarget,
      meetingTarget,
    ])
      applyLifecycleAction(store, "acme", target);
    assert.equal(store.organizationRepository.get("acme", department.id)?.status, "archived");
    assert.equal(store.strategyRepository.get("acme", objective.id)?.status, "archived");
    assert.equal(store.tasksRepository.get("acme", task.id)?.status, "archived");
    assert.equal(store.automations.list("acme")[0]?.status, "archived");
    assert.equal(
      store.conversations.roomList("acme").find((item) => item.id === room.id)?.status,
      "archived",
    );
    assert.equal(store.meetings.list("acme")[0]?.status, "archived");

    const archivedData = workspaceData(store, "acme");
    for (const section of [
      "Departments",
      "Objectives",
      "Tasks",
      "Automations",
      "Conversations",
      "Meetings",
    ]) {
      const target = lifecycleTargets(section, archivedData)[0];
      assert.ok(target);
      assert.equal(lifecycleVerb(target), "restore");
      applyLifecycleAction(store, "acme", target);
    }
    assert.equal(store.organizationRepository.get("acme", department.id)?.status, "active");
    assert.equal(store.strategyRepository.get("acme", objective.id)?.status, "draft");
    assert.equal(store.tasksRepository.get("acme", task.id)?.status, "draft");
    assert.equal(store.automations.list("acme")[0]?.status, "approved");
    assert.equal(
      store.conversations.roomList("acme").find((item) => item.id === room.id)?.status,
      "active",
    );
    assert.equal(store.meetings.list("acme")[0]?.status, "planned");
    assert.ok(store.verifyAuditChain());
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function workspaceData(store: StateStore, companyId: string) {
  return {
    organizationUnits: store.organizationUnits(companyId),
    strategyItems: store.strategyItems(companyId),
    tasks: store.tasks(companyId),
    mcpServers: store.mcpServers.list(companyId),
    projectIntegrations: store.projectIntegrations.list(companyId),
    automations: store.automations.list(companyId),
    companies: store.companies(),
    employees: store.employees(companyId),
    rooms: store.conversations.roomList(companyId),
    meetings: store.meetings.list(companyId),
    models: store.models.list(companyId),
  };
}
