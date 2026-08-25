import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";

export interface TaskCheckpointRecord {
  id: string;
  companyId: string;
  taskId: string;
  employeeId: string;
  summary: string;
  progressPercent: number;
  blockers: string[];
  createdAt: string;
}

export class TaskCheckpointRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  create(input: Omit<TaskCheckpointRecord, "id" | "createdAt">): TaskCheckpointRecord {
    const record = {
      ...input,
      id: randomUUID(),
      summary: sanitizeTerminal(input.summary, 4_000),
      blockers: input.blockers.map((item) => sanitizeTerminal(item, 1_000)),
      createdAt: new Date().toISOString(),
    };
    if (!record.summary || !Number.isInteger(record.progressPercent))
      throw new Error("A checkpoint requires a summary and integer progress percentage");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO task_checkpoints VALUES (?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.taskId,
          record.employeeId,
          record.summary,
          record.progressPercent,
          JSON.stringify(record.blockers),
          record.createdAt,
        );
      this.audit.append("task.checkpoint-recorded", record.employeeId, record.companyId, {
        checkpointId: record.id,
        taskId: record.taskId,
        progressPercent: record.progressPercent,
      });
    });
    return record;
  }

  list(companyId: string, taskId: string): TaskCheckpointRecord[] {
    const rows = this.database.connection
      .prepare(
        "SELECT * FROM task_checkpoints WHERE company_id=? AND task_id=? ORDER BY created_at",
      )
      .all(companyId, taskId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      taskId: String(row.task_id),
      employeeId: String(row.employee_id),
      summary: String(row.summary),
      progressPercent: Number(row.progress_percent),
      blockers: parseJson(row.blockers_json),
      createdAt: String(row.created_at),
    }));
  }
}
