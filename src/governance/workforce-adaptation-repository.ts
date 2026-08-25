import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import type { ArmDecision, ReinforcementPlan } from "./workforce-adaptation-types.js";

export class WorkforceAdaptationRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  createPlan(input: {
    companyId: string;
    employeeId: string;
    rationale: string;
    criteria: string[];
    evidenceIds: string[];
    createdBy: string;
    reviewAt: string;
  }): ReinforcementPlan {
    this.requireEmployee(input.companyId, input.employeeId);
    if (input.criteria.length === 0 || input.evidenceIds.length === 0)
      throw new Error("Reinforcement plans require measurable criteria and evidence");
    const existing = this.activePlan(input.companyId, input.employeeId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const plan: ReinforcementPlan = {
      ...input,
      id: randomUUID(),
      status: "active",
      rationale: sanitizeTerminal(input.rationale, 5_000),
      createdAt: now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO reinforcement_plans VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          plan.id,
          plan.companyId,
          plan.employeeId,
          plan.status,
          plan.rationale,
          JSON.stringify(plan.criteria),
          JSON.stringify(plan.evidenceIds),
          plan.createdBy,
          plan.reviewAt,
          now,
          now,
        );
      this.audit.append("reinforcement.created", plan.createdBy, plan.companyId, {
        planId: plan.id,
        employeeId: plan.employeeId,
        evidenceIds: plan.evidenceIds,
      });
    });
    return plan;
  }

  setPlanStatus(
    companyId: string,
    planId: string,
    status: Exclude<ReinforcementPlan["status"], "active">,
    actorId: string,
  ): ReinforcementPlan {
    const current = this.requirePlan(companyId, planId);
    if (current.status !== "active") throw new Error("Only active reinforcement can be concluded");
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare("UPDATE reinforcement_plans SET status=?,updated_at=? WHERE company_id=? AND id=?")
        .run(status, now, companyId, planId);
      this.audit.append(`reinforcement.${status}`, actorId, companyId, {
        planId,
        employeeId: current.employeeId,
      });
    });
    return { ...current, status, updatedAt: now };
  }

  activePlan(companyId: string, employeeId: string): ReinforcementPlan | undefined {
    const row = this.database.connection
      .prepare(
        "SELECT * FROM reinforcement_plans WHERE company_id=? AND employee_id=? AND status='active' ORDER BY created_at DESC LIMIT 1",
      )
      .get(companyId, employeeId) as Record<string, unknown> | undefined;
    return row ? mapPlan(row) : undefined;
  }

  plans(companyId: string): ReinforcementPlan[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM reinforcement_plans WHERE company_id=? ORDER BY created_at DESC")
      .all(companyId) as Record<string, unknown>[];
    return rows.map(mapPlan);
  }

  recordDecision(input: Omit<ArmDecision, "id" | "createdAt">): ArmDecision | undefined {
    this.companies.require(input.companyId);
    const decision: ArmDecision = {
      ...input,
      id: randomUUID(),
      rationale: sanitizeTerminal(input.rationale, 5_000),
      createdAt: new Date().toISOString(),
    };
    const result = this.database.connection
      .prepare("INSERT OR IGNORE INTO arm_decisions VALUES (?,?,?,?,?,?,?,?,?)")
      .run(
        decision.id,
        decision.companyId,
        decision.action,
        decision.subjectType,
        decision.subjectId,
        decision.referenceId,
        decision.rationale,
        JSON.stringify(decision.evidenceIds),
        decision.createdAt,
      );
    if (result.changes === 0) return undefined;
    this.audit.append("arm.decision", "arm", decision.companyId, {
      decisionId: decision.id,
      action: decision.action,
      subjectId: decision.subjectId,
      referenceId: decision.referenceId,
    });
    return decision;
  }

  decisions(companyId: string, limit = 100): ArmDecision[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM arm_decisions WHERE company_id=? ORDER BY created_at DESC LIMIT ?")
      .all(companyId, Math.min(Math.max(limit, 1), 200)) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      action: String(row.action),
      subjectType: String(row.subject_type),
      subjectId: String(row.subject_id),
      referenceId: String(row.reference_id),
      rationale: String(row.rationale),
      evidenceIds: parseJson(row.evidence_ids_json),
      createdAt: String(row.created_at),
    }));
  }

  private requirePlan(companyId: string, planId: string): ReinforcementPlan {
    const row = this.database.connection
      .prepare("SELECT * FROM reinforcement_plans WHERE company_id=? AND id=?")
      .get(companyId, planId) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown reinforcement plan in company: ${planId}`);
    return mapPlan(row);
  }

  private requireEmployee(companyId: string, employeeId: string): void {
    if (!this.companies.employees(companyId).some(({ id }) => id === employeeId))
      throw new Error(`Unknown employee in company: ${employeeId}`);
  }
}

function mapPlan(row: Record<string, unknown>): ReinforcementPlan {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    employeeId: String(row.employee_id),
    status: String(row.status) as ReinforcementPlan["status"],
    rationale: String(row.rationale),
    criteria: parseJson(row.criteria_json),
    evidenceIds: parseJson(row.evidence_ids_json),
    createdBy: String(row.created_by),
    reviewAt: String(row.review_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
