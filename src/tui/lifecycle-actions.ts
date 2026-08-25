import type { StateStore } from "../storage/state-store.js";
import type { OrganizationUnitKind } from "../organizations/organization-types.js";
import type { StrategyItemKind } from "../strategy/strategy-types.js";

export interface LifecycleTarget {
  kind:
    | "company"
    | "employee"
    | "room"
    | "meeting"
    | "model"
    | "organization"
    | "strategy"
    | "task"
    | "mcp"
    | "integration"
    | "automation"
    | "approval"
    | "hiring-proposal"
    | "mail"
    | "tool"
    | "environment";
  id: string;
  label: string;
  status: string;
  projectId?: string;
}

export interface LifecycleData {
  organizationUnits: ReturnType<StateStore["organizationUnits"]>;
  strategyItems: ReturnType<StateStore["strategyItems"]>;
  tasks: ReturnType<StateStore["tasks"]>;
  mcpServers: ReturnType<StateStore["mcpServers"]["list"]>;
  projectIntegrations: ReturnType<StateStore["projectIntegrations"]["list"]>;
  automations: ReturnType<StateStore["automations"]["list"]>;
  companies: ReturnType<StateStore["companies"]>;
  employees: ReturnType<StateStore["employees"]>;
  rooms: ReturnType<StateStore["conversations"]["roomList"]>;
  meetings: ReturnType<StateStore["meetings"]["list"]>;
  models: ReturnType<StateStore["models"]["list"]>;
  approvals: ReturnType<StateStore["approvalsRepository"]["list"]>;
  hiringProposals: ReturnType<StateStore["employment"]["proposalList"]>;
  mail: ReturnType<StateStore["mail"]["listCompany"]>;
  tools: ReturnType<StateStore["tools"]["list"]>;
  environments: ReturnType<StateStore["environments"]["list"]>;
}

export function lifecycleTargets(section: string, data: LifecycleData): LifecycleTarget[] {
  if (section === "Companies")
    return data.companies.map((item) => ({
      kind: "company",
      id: item.id,
      label: item.displayName,
      status: item.status,
    }));
  if (section === "Employees")
    return data.employees.map((item) => ({
      kind: "employee",
      id: item.id,
      label: `${item.name} · ${item.title}`,
      status: item.status,
    }));
  if (section === "Conversations")
    return data.rooms.map((item) => ({
      kind: "room",
      id: item.id,
      label: `${item.name} · ${item.kind}`,
      status: item.status,
    }));
  if (section === "Meetings")
    return data.meetings.map((item) => ({
      kind: "meeting",
      id: item.id,
      label: item.title,
      status: item.status,
    }));
  if (section === "Approvals")
    return data.approvals.map((item) => ({
      kind: "approval",
      id: item.id,
      label: `${item.subjectType} · ${item.subjectId}`,
      status: item.status,
    }));
  if (section === "Agent Resources")
    return data.hiringProposals.map((item) => ({
      kind: "hiring-proposal",
      id: item.id,
      label: `${item.blueprint.employee.title} · ${item.jobId}`,
      status: item.status,
    }));
  if (section === "Mail")
    return data.mail.map((item) => ({
      kind: "mail",
      id: item.id,
      label: `${item.subject} · ${item.recipientId}`,
      status: item.status,
    }));
  if (section === "Models & engines")
    return data.models.map((item) => ({
      kind: "model",
      id: item.id,
      label: `${item.engine} · ${item.model}`,
      status: item.health,
    }));
  if (section === "Tools")
    return data.tools.map((item) => ({
      kind: "tool",
      id: item.id,
      label: `${item.id} · ${item.provider}`,
      status: item.health,
    }));
  if (section === "Environments")
    return data.environments.map((item) => ({
      kind: "environment",
      id: item.id,
      label: `${item.name} · ${item.sandboxImage}`,
      status: item.health,
    }));
  const organizationKinds = organizationSectionKinds(section);
  if (organizationKinds)
    return data.organizationUnits
      .filter(({ kind }) => organizationKinds.includes(kind))
      .map((item) => ({
        kind: "organization",
        id: item.id,
        label: item.name,
        status: item.status,
      }));
  const strategyKind = strategySectionKind(section);
  if (strategyKind)
    return data.strategyItems
      .filter(({ kind }) => kind === strategyKind)
      .map((item) => ({ kind: "strategy", id: item.id, label: item.name, status: item.status }));
  if (section === "Tasks")
    return data.tasks.map((item) => ({
      kind: "task",
      id: item.id,
      label: item.objective,
      status: item.status,
    }));
  if (section === "MCP servers")
    return data.mcpServers.map((item) => ({
      kind: "mcp",
      id: item.id,
      label: item.name,
      status: item.status,
    }));
  if (section === "Project integrations")
    return data.projectIntegrations.map((item) => ({
      kind: "integration",
      id: item.provider,
      projectId: item.projectId,
      label: `${item.provider} · ${item.projectId}`,
      status: item.status,
    }));
  if (section === "Automations")
    return data.automations.map((item) => ({
      kind: "automation",
      id: item.id,
      label: item.title,
      status: item.status,
    }));
  return [];
}

export function lifecycleVerb(target: LifecycleTarget): "archive" | "restore" {
  if (target.kind === "employee" && ["terminated", "archived"].includes(target.status))
    return "restore";
  if (target.kind === "meeting" && target.status === "archived") return "restore";
  return target.status === "archived" || target.status === "disabled" ? "restore" : "archive";
}

export function applyLifecycleAction(
  store: StateStore,
  companyId: string,
  target: LifecycleTarget,
  actorId = "human",
): void {
  const restore = lifecycleVerb(target) === "restore";
  if (target.kind === "company") {
    if (restore) store.companiesRepository.restore(target.id, actorId);
    else store.companiesRepository.archive(target.id, actorId);
  } else if (target.kind === "employee") {
    store.employment.transition(
      companyId,
      target.id,
      restore ? "REINSTATE" : "TERMINATE",
      actorId,
      `${restore ? "Reinstated" : "Terminated"} through confirmed TUI lifecycle action`,
    );
  } else if (target.kind === "room") {
    const room = store.conversations.roomList(companyId).find((item) => item.id === target.id);
    if (!room) throw new Error(`Unknown room in company: ${target.id}`);
    store.conversations.rooms.configure(
      companyId,
      target.id,
      {
        retentionDays: room.retentionDays,
        announcement: room.announcement,
        status: restore ? "active" : "archived",
      },
      actorId,
    );
  } else if (target.kind === "meeting") {
    if (restore) store.meetings.restore(companyId, target.id, actorId);
    else store.meetings.archive(companyId, target.id, actorId);
  } else if (target.kind === "organization") {
    if (restore) store.organizationRepository.restore(companyId, target.id, actorId);
    else store.organizationRepository.archive(companyId, target.id, actorId);
  } else if (target.kind === "strategy") {
    if (restore) store.strategyRepository.restore(companyId, target.id, actorId);
    else store.strategyRepository.archive(companyId, target.id, actorId);
  } else if (target.kind === "task") {
    store.tasksRepository.transition(
      companyId,
      target.id,
      restore ? "RESTORE" : "ARCHIVE",
      actorId,
      `${restore ? "Restored" : "Archived"} through confirmed TUI lifecycle action`,
    );
  } else if (target.kind === "model") {
    throw new Error(
      "Model registry entries are retained for execution history and cannot be archived",
    );
  } else if (target.kind === "mcp") {
    store.mcpServers.setStatus(companyId, target.id, restore ? "active" : "archived", actorId);
  } else if (target.kind === "integration") {
    store.projectIntegrations.setStatus(
      companyId,
      target.projectId ?? "",
      target.id,
      restore ? "active" : "archived",
      actorId,
    );
  } else if (target.kind === "automation" && restore) {
    store.automations.restore(
      companyId,
      target.id,
      actorId,
      "Restored through confirmed TUI action",
    );
  } else if (target.kind === "automation") {
    store.automations.archive(
      companyId,
      target.id,
      actorId,
      "Archived through confirmed TUI action",
    );
  } else if (target.kind === "mail") {
    if (restore) store.mail.restore(companyId, target.id, actorId);
    else store.mail.archive(companyId, target.id, actorId);
  } else throw new Error(`Lifecycle action is not supported for ${target.kind}`);
}

function organizationSectionKinds(section: string): readonly OrganizationUnitKind[] | null {
  if (section === "Organization") return ["department", "team", "office", "room"] as const;
  if (section === "Departments") return ["department"] as const;
  if (section === "Teams") return ["team"] as const;
  if (section === "Offices & rooms") return ["office", "room"] as const;
  return null;
}

function strategySectionKind(section: string): StrategyItemKind | null {
  const kinds = {
    Objectives: "objective",
    Initiatives: "initiative",
    Projects: "project",
    Goals: "goal",
    Milestones: "milestone",
  } as const;
  return Object.hasOwn(kinds, section) ? kinds[section as keyof typeof kinds] : null;
}
