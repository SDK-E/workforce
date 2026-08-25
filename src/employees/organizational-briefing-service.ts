import type { ClientRepository } from "../business/client-repository.js";
import type { EngagementRepository } from "../business/engagement-repository.js";
import type { LeadRepository } from "../business/lead-repository.js";
import type { OpportunityRepository } from "../business/opportunity-repository.js";
import type { OrganizationRepository } from "../organizations/organization-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { StrategyRepository } from "../strategy/strategy-repository.js";
import type { TaskRecord } from "../tasks/task-types.js";

export interface OrganizationalBriefingBuilder {
  render(task: TaskRecord, employeeId: string): string;
}

export class OrganizationalBriefingService implements OrganizationalBriefingBuilder {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly organization: OrganizationRepository,
    private readonly strategy: StrategyRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly leads: LeadRepository,
    private readonly clients: ClientRepository,
    private readonly engagements: EngagementRepository,
  ) {}

  render(task: TaskRecord, employeeId: string): string {
    const company = this.companies.require(task.companyId);
    const employee = this.companies.employees(task.companyId).find(({ id }) => id === employeeId);
    if (!employee) throw new Error(`Unknown briefing employee in company: ${employeeId}`);
    const manager = employee.manager
      ? this.companies.employees(task.companyId).find(({ id }) => id === employee.manager)
      : undefined;
    const activeStrategy = this.strategy
      .list(task.companyId)
      .filter(({ status }) => status !== "archived")
      .filter(({ kind }) => ["objective", "goal", "milestone", "project"].includes(kind));
    const units = this.organization
      .list(task.companyId)
      .filter(({ status }) => status !== "archived");
    return [
      "ORGANIZATIONAL BRIEFING — generated from current Workforce state",
      section("Company", [
        `Identity: ${company.displayName} (${company.id})`,
        `Mission: ${company.mission || "not configured"}`,
        `Vision: ${company.vision || "not configured"}`,
        `Values: ${company.values.join(", ") || "not configured"}`,
        `Shareholders/governance: ${governanceSummary(company.policies)}`,
      ]),
      section("Your position", [
        `Employee: ${employee.name} (${employee.id})`,
        `Title and role: ${employee.title} / ${employee.role ?? employee.title}`,
        `Department/team: ${employee.department} / ${employee.team ?? "none"}`,
        `Employment status: ${employee.status}`,
        `Reports to: ${manager ? `${manager.name} (${manager.id}), ${manager.title}` : "no direct manager"}`,
        `Responsibilities: ${employee.responsibilities.join("; ") || "none configured"}`,
      ]),
      section(
        "Organization",
        units.map(
          ({ kind, name, managerId, parentId }) =>
            `${kind}: ${name}; manager ${managerId ?? "unassigned"}; parent ${parentId ?? "company"}`,
        ),
      ),
      section(
        "Active direction",
        activeStrategy.map(
          ({ kind, name, status, ownerId, successMeasures }) =>
            `${kind}: ${name}; ${status}; owner ${ownerId}; success: ${successMeasures.join("; ")}`,
        ),
      ),
      section("Your current assignment", [
        `Task: ${task.objective}`,
        `Status/priority/risk: ${task.status} / P${task.priority} / ${task.risk}`,
        `Manager/reviewer: ${task.managerId} / ${task.reviewerId ?? "unassigned"}`,
        `Acceptance criteria: ${task.acceptanceCriteria.join("; ")}`,
        `Non-goals: ${task.nonGoals.join("; ") || "none"}`,
        `Escalation path: ${task.escalationPath.join(" -> ") || task.managerId}`,
      ]),
      section("Current operating state", this.operatingState(task.companyId)),
      section("How to operate inside Workforce", [
        "Use Workforce MCP for authorized tasks, rooms, threads, meetings, mail, claims, artifacts, handoffs, approvals, secrets, and management actions.",
        "Coordinate through joined rooms and mail; record decisions, checkpoints, evidence, blockers, and handoffs in Workforce rather than relying on private model memory.",
        "Follow the reporting line. Escalate policy conflicts, unsafe requirement changes, missing authority, and acceptance blockers to the task manager or reviewer.",
        "Work autonomously within the assigned task and capabilities. Propose governed automations when repeated work can be made deterministic.",
      ]),
      section("Do not", [
        "Do not act outside this company, identity, task, secret scope, or approved capabilities.",
        "Do not claim completion from a successful process exit; attach independently verifiable evidence for every acceptance criterion.",
        "Do not bypass Workforce with host execution, hidden communication, untracked credentials, or destructive changes without explicit authority.",
        "Do not treat this briefing as timeless; re-read current Workforce state after checkpoints, reassignment, requirement changes, or manager instructions.",
      ]),
    ].join("\n\n");
  }

  private operatingState(companyId: string): string[] {
    const opportunities = this.opportunities.list(companyId, { limit: 20 });
    const leads = this.leads.list(companyId, { limit: 20 });
    const clients = this.clients.list(companyId, { limit: 20 });
    const engagements = this.engagements.list(companyId, { limit: 20 });
    return [
      `Opportunity pipeline: ${opportunities.length} visible; ${opportunities.filter(({ stage }) => stage === "validated").length} validated`,
      `Lead pipeline: ${leads.length} visible; ${leads.filter(({ status }) => status === "qualified").length} qualified`,
      `Clients: ${clients.length} visible; ${clients.filter(({ status }) => status === "active").length} active`,
      `Engagements: ${engagements.length} visible; ${engagements.filter(({ status }) => status === "active").length} active`,
    ];
  }
}

function section(title: string, lines: string[]): string {
  return `${title}:\n${lines.length ? lines.map((line) => `- ${line}`).join("\n") : "- none configured"}`;
}

function governanceSummary(policies: Record<string, unknown>): string {
  const value = policies.shareholders ?? policies.governance ?? "not configured";
  return typeof value === "string" ? value.slice(0, 2_000) : JSON.stringify(value).slice(0, 2_000);
}
