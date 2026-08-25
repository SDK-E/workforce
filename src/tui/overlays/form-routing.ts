import type { CreateFormKind } from "./create-overlay.js";

export function createFormForSection(section: string): CreateFormKind | null {
  if (section === "Companies") return "company-create";
  if (["Organization", "Departments", "Teams", "Offices & rooms"].includes(section))
    return "organization";
  if (["Projects", "Objectives", "Initiatives", "Goals", "Milestones"].includes(section))
    return "strategy";
  const routes: Record<string, CreateFormKind> = {
    Employees: "employee-hire",
    "CEO office": "message",
    Conversations: "room",
    Meetings: "meeting",
    "Models & engines": "model",
    Tools: "tool",
    Environments: "environment",
    "MCP servers": "mcp-server",
    "Project integrations": "project-integration",
    Mail: "mail",
    Automations: "automation",
    Performance: "performance",
    Recognition: "recognition",
    "Warnings & incidents": "incident",
    "Critics & reviews": "claim",
    Tasks: "task",
    Opportunities: "opportunity",
    Leads: "lead",
    Clients: "client",
    Engagements: "engagement",
  };
  return routes[section] ?? null;
}

export function editFormForSection(section: string): CreateFormKind | null {
  if (["Organization", "Departments", "Teams", "Offices & rooms"].includes(section))
    return "organization";
  if (["Projects", "Objectives", "Initiatives", "Goals", "Milestones"].includes(section))
    return "strategy";
  const routes: Record<string, CreateFormKind> = {
    Companies: "company-edit",
    Employees: "agent-profile",
    "Agent Resources": "hiring-decision",
    Meetings: "meeting",
    "Models & engines": "model",
    Tools: "tool",
    Environments: "environment",
    Conversations: "room",
    Approvals: "approval-decision",
    Tasks: "task",
    "MCP servers": "mcp-server",
    "Project integrations": "project-integration",
    Automations: "automation-decision",
    Opportunities: "opportunity",
    Leads: "lead",
    Clients: "client",
    Engagements: "engagement",
    "Warnings & incidents": "incident-decision",
  };
  return routes[section] ?? null;
}
