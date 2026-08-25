import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { parseJson } from "../storage/serialization.js";

export interface TaskHandoffRecord {
  id: string;
  companyId: string;
  taskId: string;
  kind: "help-request" | "handoff";
  fromEmployeeId: string;
  toEmployeeId: string | null;
  summary: string;
  context: Record<string, unknown>;
  evidenceIds: string[];
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
  updatedAt: string;
}

export class TaskHandoffRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  create(
    input: Omit<TaskHandoffRecord, "id" | "status" | "createdAt" | "updatedAt">,
  ): TaskHandoffRecord {
    this.requireTask(input.companyId, input.taskId);
    this.requireEmployee(input.companyId, input.fromEmployeeId);
    if (input.toEmployeeId) this.requireEmployee(input.companyId, input.toEmployeeId);
    const now = new Date().toISOString();
    const record: TaskHandoffRecord = {
      ...input,
      id: randomUUID(),
      summary: sanitizeTerminal(input.summary, 4_000),
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    if (!record.summary) throw new Error("Handoff summary is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO task_handoffs VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.taskId,
          record.kind,
          record.fromEmployeeId,
          record.toEmployeeId,
          record.summary,
          JSON.stringify(record.context),
          JSON.stringify(record.evidenceIds),
          record.status,
          now,
          now,
        );
      this.audit.append(`task.${record.kind}`, record.fromEmployeeId, record.companyId, {
        handoffId: record.id,
        taskId: record.taskId,
        toEmployeeId: record.toEmployeeId,
        evidenceIds: record.evidenceIds,
      });
    });
    return record;
  }

  list(companyId: string, taskId: string): TaskHandoffRecord[] {
    this.requireTask(companyId, taskId);
    return (
      this.database.connection
        .prepare("SELECT * FROM task_handoffs WHERE company_id=? AND task_id=? ORDER BY created_at")
        .all(companyId, taskId) as Record<string, unknown>[]
    ).map(mapHandoff);
  }

  private requireTask(companyId: string, taskId: string): void {
    if (
      !this.database.connection
        .prepare("SELECT 1 FROM tasks WHERE company_id=? AND id=?")
        .get(companyId, taskId)
    ) {
      throw new Error(`Unknown task in company: ${taskId}`);
    }
  }

  private requireEmployee(companyId: string, employeeId: string): void {
    if (
      !this.database.connection
        .prepare("SELECT 1 FROM employees WHERE company_id=? AND id=?")
        .get(companyId, employeeId)
    ) {
      throw new Error(`Unknown employee in company: ${employeeId}`);
    }
  }
}

function mapHandoff(row: Record<string, unknown>): TaskHandoffRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    taskId: String(row.task_id),
    kind: String(row.kind) as TaskHandoffRecord["kind"],
    fromEmployeeId: String(row.from_employee_id),
    toEmployeeId: typeof row.to_employee_id === "string" ? row.to_employee_id : null,
    summary: String(row.summary),
    context: parseJson(row.context_json),
    evidenceIds: parseJson(row.evidence_ids_json),
    status: String(row.status) as TaskHandoffRecord["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
