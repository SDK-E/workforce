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
    store.approvalsRepository.request("acme", "task", task.id, "arm", "Review required");
    const data = workspaceData(store, "acme");
    assert.equal(lifecycleTargets("Companies", data)[0]?.kind, "company");
    assert.equal(lifecycleTargets("Employees", data)[0]?.kind, "employee");
    assert.equal(lifecycleTargets("Conversations", data)[0]?.kind, "room");
    assert.equal(lifecycleTargets("Models & engines", data)[0]?.kind, "model");
    assert.equal(lifecycleTargets("Tools", data)[0]?.kind, "tool");
    assert.equal(lifecycleTargets("Environments", data)[0]?.kind, "environment");
    const approvalTarget = lifecycleTargets("Approvals", data)[0];
    assert.equal(approvalTarget?.kind, "approval");
    assert.ok(approvalTarget);
    assert.throws(() => {
      applyLifecycleAction(store, "acme", approvalTarget);
    }, /not supported for approval/);
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

test("selected mail archives and restores through the TUI lifecycle", () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-tui-mail-"));
  const store = new StateStore(root);
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    const mail = store.mail.send({
      companyId: "acme",
      senderKind: "agent",
      senderId: "ceo",
      recipientKind: "human",
      recipientId: "human",
      subject: "Decision required",
      body: "Review the evidence.",
    });
    const target = lifecycleTargets("Mail", workspaceData(store, "acme"))[0];
    assert.equal(target?.kind, "mail");
    assert.ok(target);
    applyLifecycleAction(store, "acme", target);
    assert.equal(
      store.mail.listCompany("acme").find(({ id }) => id === mail.id)?.status,
      "archived",
    );
    applyLifecycleAction(store, "acme", { ...target, status: "archived" });
    assert.equal(store.mail.listCompany("acme").find(({ id }) => id === mail.id)?.status, "sent");
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
    tools: store.tools.list(companyId),
    environments: store.environments.list(companyId),
    approvals: store.approvalsRepository.list(companyId),
    hiringProposals: store.employment.proposalList(companyId),
    mail: store.mail.listCompany(companyId),
    incidents: store.incidents.listIncidents(companyId),
    claims: store.performance.listClaims(companyId),
    correctiveActions: store.incidents.listCorrective(companyId),
  };
}
