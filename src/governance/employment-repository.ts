import { randomUUID } from "node:crypto";
import type { AgentBlueprint } from "../agent-designer.js";
import type { Employee } from "../domain.js";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { nextEmploymentStatus, type EmploymentEvent } from "./employment-machine.js";
import type { GapFinding, HiringProposal } from "./governance-types.js";

export class EmploymentRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
    private readonly onEmployeeCreated?: (
      companyId: string,
      blueprint: AgentBlueprint,
      actorId: string,
    ) => void,
  ) {}

  recordGap(input: Omit<GapFinding, "id" | "createdAt" | "resolvedAt">): GapFinding {
    this.companies.require(input.companyId);
    const gap: GapFinding = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO workforce_gaps VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)")
        .run(
          gap.id,
          gap.companyId,
          gap.jobId,
          gap.kind,
          JSON.stringify(gap.missing),
          JSON.stringify(gap.alternatives),
          gap.recommendation,
          gap.createdBy,
          gap.createdAt,
        );
      this.audit.append("workforce-gap.recorded", gap.createdBy, gap.companyId, {
        gapId: gap.id,
        jobId: gap.jobId,
        recommendation: gap.recommendation,
      });
    });
    return gap;
  }

  propose(companyId: string, blueprint: AgentBlueprint, proposedBy: string): HiringProposal {
    this.companies.require(companyId);
    if (blueprint.employee.status !== "probation")
      throw new Error("New employees must start on probation");
    const proposal: HiringProposal = {
      id: randomUUID(),
      companyId,
      jobId: blueprint.jobId,
      employeeId: blueprint.employee.id,
      blueprint,
      probationCriteria: blueprint.probationCriteria,
      status: "proposed",
      proposedBy,
      decidedBy: null,
      rationale: "",
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO hiring_proposals VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, '', ?, NULL)")
        .run(
          proposal.id,
          companyId,
          proposal.jobId,
          proposal.employeeId,
          JSON.stringify(blueprint),
          JSON.stringify(proposal.probationCriteria),
          proposal.status,
          proposedBy,
          proposal.createdAt,
        );
      this.audit.append("hiring.proposed", proposedBy, companyId, {
        proposalId: proposal.id,
        employeeId: proposal.employeeId,
        jobId: proposal.jobId,
      });
    });
    return proposal;
  }

  decide(
    companyId: string,
    proposalId: string,
    decision: "approved" | "rejected",
    actorId: string,
    rationale: string,
  ): HiringProposal {
    const proposal = this.requireProposal(companyId, proposalId);
    if (proposal.status !== "proposed") throw new Error("Hiring proposal is already decided");
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE hiring_proposals SET status=?, decided_by=?, rationale=?, decided_at=?
           WHERE company_id=? AND id=?`,
        )
        .run(decision, actorId, rationale, now, companyId, proposalId);
      if (decision === "approved") this.insertEmployee(companyId, proposal.blueprint.employee);
      this.audit.append(`hiring.${decision}`, actorId, companyId, {
        proposalId,
        employeeId: proposal.employeeId,
        rationale,
      });
    });
    if (decision === "approved") this.onEmployeeCreated?.(companyId, proposal.blueprint, actorId);
    return this.requireProposal(companyId, proposalId);
  }

  transition(
    companyId: string,
    employeeId: string,
    event: EmploymentEvent,
    actorId: string,
    rationale: string,
    assignment?: { managerId?: string; department?: string },
  ): Employee {
    const employee = this.requireEmployee(companyId, employeeId);
    if (employeeId === "ceo" || employeeId === "arm")
      throw new Error("Durable CEO and ARM identities cannot be transitioned by this workflow");
    const next = nextEmploymentStatus(employee.status, event);
    if (next === "terminated" || next === "archived")
      this.requireNoActiveAttempt(companyId, employeeId);
    const manager = assignment?.managerId ?? employee.manager;
    if (manager) this.requireEmployee(companyId, manager);
    const department = assignment?.department ?? employee.department;
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "UPDATE employees SET status=?, manager_id=?, department=? WHERE company_id=? AND id=?",
        )
        .run(next, manager, department, companyId, employeeId);
      const releasedTasks =
        next === "terminated" || next === "archived"
          ? this.releaseAssignments(companyId, employeeId, now)
          : 0;
      const reassignedReports =
        next === "terminated" || next === "archived"
          ? this.reassignReports(companyId, employeeId, employee.manager ?? "arm")
          : 0;
      this.database.connection
        .prepare("INSERT INTO employment_transitions VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(companyId, employeeId, employee.status, next, event, actorId, rationale, now);
      this.audit.append("employment.transitioned", actorId, companyId, {
        employeeId,
        from: employee.status,
        to: next,
        event,
        rationale,
        releasedTasks,
        reassignedReports,
      });
    });
    return this.requireEmployee(companyId, employeeId);
  }

  proposalList(companyId: string): HiringProposal[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM hiring_proposals WHERE company_id=? ORDER BY created_at DESC")
      .all(companyId) as Record<string, unknown>[];
    return rows.map((row) => this.mapProposal(row));
  }

  private requireProposal(companyId: string, id: string): HiringProposal {
    const row = this.database.connection
      .prepare("SELECT * FROM hiring_proposals WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown hiring proposal in company: ${id}`);
    return this.mapProposal(row);
  }

  private requireEmployee(companyId: string, id: string): Employee {
    const employee = this.companies.employees(companyId).find((item) => item.id === id);
    if (!employee) throw new Error(`Unknown employee in company: ${id}`);
    return employee;
  }

  private requireNoActiveAttempt(companyId: string, employeeId: string): void {
    const attempt = this.database.connection
      .prepare(
        `SELECT id FROM attempts WHERE company_id=? AND employee_id=?
         AND status IN ('queued','starting','running') LIMIT 1`,
      )
      .get(companyId, employeeId);
    if (attempt) throw new Error("Stop active employee attempts before offboarding");
  }

  private releaseAssignments(companyId: string, employeeId: string, now: string): number {
    const result = this.database.connection
      .prepare(
        `UPDATE tasks SET assignee_id=NULL,updated_at=? WHERE company_id=? AND assignee_id=?
         AND status NOT IN ('completed','rejected','failed','cancelled','archived')`,
      )
      .run(now, companyId, employeeId);
    return Number(result.changes);
  }

  private reassignReports(companyId: string, employeeId: string, managerId: string): number {
    const replacement = managerId === employeeId ? "arm" : managerId;
    const result = this.database.connection
      .prepare("UPDATE employees SET manager_id=? WHERE company_id=? AND manager_id=?")
      .run(replacement, companyId, employeeId);
    return Number(result.changes);
  }

  private insertEmployee(companyId: string, employee: Employee): void {
    this.database.connection
      .prepare("INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        employee.id,
        companyId,
        employee.name,
        employee.title,
        employee.role ?? "contributor",
        employee.department,
        employee.manager,
        employee.status,
        JSON.stringify(employee.responsibilities),
        JSON.stringify(employee.capabilityTags),
        employee.hiredAt,
      );
  }

  private mapProposal(row: Record<string, unknown>): HiringProposal {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      jobId: String(row.job_id),
      employeeId: String(row.employee_id),
      blueprint: parseJson(row.blueprint_json),
      probationCriteria: parseJson(row.probation_criteria_json),
      status: String(row.status) as HiringProposal["status"],
      proposedBy: String(row.proposed_by),
      decidedBy: typeof row.decided_by === "string" ? row.decided_by : null,
      rationale: String(row.rationale),
      createdAt: String(row.created_at),
      decidedAt: typeof row.decided_at === "string" ? row.decided_at : null,
    };
  }
}
