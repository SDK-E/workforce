import type { StateStore } from "../storage/state-store.js";
import type { OrganizationUnitKind } from "../organizations/organization-types.js";
import type { StrategyItemKind } from "../strategy/strategy-types.js";

export interface LifecycleTarget {
  kind: "company" | "organization" | "strategy" | "task" | "mcp" | "integration" | "automation";
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
}

export function lifecycleTargets(section: string, data: LifecycleData): LifecycleTarget[] {
  if (section === "Companies")
    return data.companies.map((item) => ({
      kind: "company",
      id: item.id,
      label: item.displayName,
      status: item.status,
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
  } else if (restore) {
    store.automations.restore(
      companyId,
      target.id,
      actorId,
      "Restored through confirmed TUI action",
    );
  } else {
    store.automations.archive(
      companyId,
      target.id,
      actorId,
      "Archived through confirmed TUI action",
    );
  }
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
