import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { parseJson } from "../storage/serialization.js";
import type {
  AutomationRecord,
  AutomationRunRecord,
  AutomationStatus,
  ProposeAutomationInput,
} from "./automation-types.js";
import { AutomationActionSchema, AutomationTriggerSchema } from "./automation-contracts.js";

export class AutomationRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  propose(input: ProposeAutomationInput): AutomationRecord {
    this.companies.require(input.companyId);
    this.requireEmployee(input.companyId, input.requestedBy);
    AutomationTriggerSchema.parse(input.trigger);
    AutomationActionSchema.parse(input.action);
    if (input.estimatedRunsSaved < 1)
      throw new Error("Automation must save at least one agent run");
    const now = new Date().toISOString();
    const record: AutomationRecord = {
      id: randomUUID(),
      ...input,
      title: sanitizeTerminal(input.title, 200),
      rationale: sanitizeTerminal(input.rationale, 2_000),
      status: "proposed",
      decidedBy: null,
      decisionReason: null,
      nextRunAt: null,
      lastRunAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!record.title || !record.rationale) throw new Error("Automation needs title and rationale");
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO automation_requests
           (id,company_id,requested_by,title,trigger_json,action_json,rationale,
            estimated_runs_saved,status,decided_by,decision_reason,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          record.id,
          record.companyId,
          record.requestedBy,
          record.title,
          JSON.stringify(record.trigger),
          JSON.stringify(record.action),
          record.rationale,
          record.estimatedRunsSaved,
          record.status,
          null,
          null,
          now,
          now,
        );
      this.audit.append("automation.proposed", record.requestedBy, record.companyId, {
        automationId: record.id,
        estimatedRunsSaved: record.estimatedRunsSaved,
      });
    });
    return record;
  }

  decide(
    companyId: string,
    id: string,
    decision: "approved" | "rejected",
    actorId: string,
    reason: string,
  ): AutomationRecord {
    const current = this.require(companyId, id);
    if (current.status !== "proposed") throw new Error("Only proposed automations can be decided");
    return this.updateStatus(current, decision, actorId, reason);
  }

  disable(companyId: string, id: string, actorId: string, reason: string): AutomationRecord {
    const current = this.require(companyId, id);
    if (current.status !== "approved") throw new Error("Only approved automations can be disabled");
    return this.updateStatus(current, "disabled", actorId, reason);
  }

  archive(companyId: string, id: string, actorId: string, reason: string): AutomationRecord {
    const current = this.require(companyId, id);
    if (current.status === "archived") throw new Error("Automation is already archived");
    return this.updateStatus(current, "archived", actorId, reason);
  }

  restore(companyId: string, id: string, actorId: string, reason: string): AutomationRecord {
    const current = this.require(companyId, id);
    if (current.status !== "disabled" && current.status !== "archived")
      throw new Error("Only disabled or archived automations can be restored");
    return this.updateStatus(current, "approved", actorId, reason);
  }

  list(companyId: string, status?: AutomationStatus): AutomationRecord[] {
    const rows = (
      status
        ? this.database.connection
            .prepare(
              "SELECT * FROM automation_requests WHERE company_id=? AND status=? ORDER BY updated_at DESC",
            )
            .all(companyId, status)
        : this.database.connection
            .prepare(
              "SELECT * FROM automation_requests WHERE company_id=? ORDER BY updated_at DESC",
            )
            .all(companyId)
    ) as Record<string, unknown>[];
    return rows.map(mapAutomation);
  }

  due(now: string): AutomationRecord[] {
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM automation_requests
         WHERE status='approved' AND next_run_at IS NOT NULL AND next_run_at<=?
         ORDER BY next_run_at,id LIMIT 100`,
      )
      .all(now) as Record<string, unknown>[];
    return rows.map(mapAutomation);
  }

  schedule(companyId: string, id: string, nextRunAt: string | null): AutomationRecord {
    this.require(companyId, id);
    this.database.connection
      .prepare("UPDATE automation_requests SET next_run_at=? WHERE company_id=? AND id=?")
      .run(nextRunAt, companyId, id);
    return this.require(companyId, id);
  }

  beginRun(automation: AutomationRecord, scheduledFor: string): AutomationRunRecord | undefined {
    const id = randomUUID();
    const startedAt = new Date().toISOString();
    const result = this.database.connection
      .prepare(
        `INSERT OR IGNORE INTO automation_runs
         (id,automation_id,company_id,scheduled_for,status,started_at)
         VALUES (?,?,?,?,'running',?)`,
      )
      .run(id, automation.id, automation.companyId, scheduledFor, startedAt);
    return result.changes === 0
      ? undefined
      : {
          id,
          automationId: automation.id,
          companyId: automation.companyId,
          scheduledFor,
          status: "running",
          taskId: null,
          attemptId: null,
          error: null,
          startedAt,
          finishedAt: null,
        };
  }

  finishRun(
    run: AutomationRunRecord,
    status: AutomationRunRecord["status"],
    nextRunAt: string,
    result: { taskId?: string; attemptId?: string; error?: string },
  ): void {
    const finishedAt = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE automation_runs SET status=?,task_id=?,attempt_id=?,error=?,finished_at=? WHERE id=?`,
        )
        .run(
          status,
          result.taskId ?? null,
          result.attemptId ?? null,
          result.error ? sanitizeTerminal(result.error, 2_000) : null,
          finishedAt,
          run.id,
        );
      this.database.connection
        .prepare(
          "UPDATE automation_requests SET last_run_at=?,next_run_at=?,updated_at=? WHERE id=?",
        )
        .run(finishedAt, nextRunAt, finishedAt, run.automationId);
      this.audit.append(`automation.run-${status}`, "automation", run.companyId, {
        automationId: run.automationId,
        runId: run.id,
        taskId: result.taskId ?? null,
        attemptId: result.attemptId ?? null,
      });
    });
  }

  listRuns(companyId: string, automationId?: string): AutomationRunRecord[] {
    const rows = (
      automationId
        ? this.database.connection
            .prepare(
              "SELECT * FROM automation_runs WHERE company_id=? AND automation_id=? ORDER BY started_at DESC LIMIT 200",
            )
            .all(companyId, automationId)
        : this.database.connection
            .prepare(
              "SELECT * FROM automation_runs WHERE company_id=? ORDER BY started_at DESC LIMIT 200",
            )
            .all(companyId)
    ) as Record<string, unknown>[];
    return rows.map(mapAutomationRun);
  }

  private require(companyId: string, id: string): AutomationRecord {
    const row = this.database.connection
      .prepare("SELECT * FROM automation_requests WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown automation: ${id}`);
    return mapAutomation(row);
  }

  private updateStatus(
    current: AutomationRecord,
    status: AutomationStatus,
    actorId: string,
    reason: string,
  ): AutomationRecord {
    const decisionReason = sanitizeTerminal(reason, 2_000);
    if (!decisionReason) throw new Error("Automation status changes require a reason");
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "UPDATE automation_requests SET status=?,decided_by=?,decision_reason=?,updated_at=? WHERE company_id=? AND id=?",
        )
        .run(status, actorId, decisionReason, now, current.companyId, current.id);
      this.audit.append(`automation.${status}`, actorId, current.companyId, {
        automationId: current.id,
        reason: decisionReason,
      });
    });
    return { ...current, status, decidedBy: actorId, decisionReason, updatedAt: now };
  }

  private requireEmployee(companyId: string, employeeId: string): void {
    const exists = this.database.connection
      .prepare("SELECT 1 FROM employees WHERE company_id=? AND id=?")
      .get(companyId, employeeId);
    if (!exists) throw new Error(`Unknown automation requester: ${employeeId}`);
  }
}

function mapAutomationRun(row: Record<string, unknown>): AutomationRunRecord {
  return {
    id: String(row.id),
    automationId: String(row.automation_id),
    companyId: String(row.company_id),
    scheduledFor: String(row.scheduled_for),
    status: String(row.status) as AutomationRunRecord["status"],
    taskId: typeof row.task_id === "string" ? row.task_id : null,
    attemptId: typeof row.attempt_id === "string" ? row.attempt_id : null,
    error: typeof row.error === "string" ? row.error : null,
    startedAt: String(row.started_at),
    finishedAt: typeof row.finished_at === "string" ? row.finished_at : null,
  };
}

function mapAutomation(row: Record<string, unknown>): AutomationRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    requestedBy: String(row.requested_by),
    title: String(row.title),
    trigger: parseJson(row.trigger_json),
    action: parseJson(row.action_json),
    rationale: String(row.rationale),
    estimatedRunsSaved: Number(row.estimated_runs_saved),
    status: String(row.status) as AutomationStatus,
    decidedBy: typeof row.decided_by === "string" ? row.decided_by : null,
    decisionReason: typeof row.decision_reason === "string" ? row.decision_reason : null,
    nextRunAt: typeof row.next_run_at === "string" ? row.next_run_at : null,
    lastRunAt: typeof row.last_run_at === "string" ? row.last_run_at : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
