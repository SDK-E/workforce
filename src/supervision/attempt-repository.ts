import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import type { AttemptRecord, AttemptRequest, AttemptStatus } from "./attempt-types.js";

export class AttemptRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  enqueue(request: AttemptRequest): AttemptRecord {
    const now = new Date().toISOString();
    const record: AttemptRecord = {
      ...request,
      status: "queued",
      containerName: `workforce-${request.id}`,
      exitCode: null,
      failureReason: null,
      queuedAt: now,
      startedAt: null,
      finishedAt: null,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO attempts
           (id,company_id,task_id,employee_id,status,sandbox_json,command_json,container_name,
            exit_code,failure_reason,queued_at,started_at,finished_at,updated_at,secret_names_json)
           VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?,NULL,NULL,?,?)`,
        )
        .run(
          record.id,
          record.companyId,
          record.taskId,
          record.employeeId,
          record.status,
          JSON.stringify(record.sandbox),
          JSON.stringify(record.command),
          record.containerName,
          record.queuedAt,
          record.updatedAt,
          JSON.stringify(record.secretNames),
        );
      this.audit.append("attempt.queued", "supervisor", record.companyId, {
        attemptId: record.id,
        taskId: record.taskId,
        employeeId: record.employeeId,
      });
    });
    return record;
  }

  queued(limit: number): AttemptRecord[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM attempts WHERE status='queued' ORDER BY queued_at LIMIT ?")
      .all(limit) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  active(): AttemptRecord[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM attempts WHERE status IN ('starting','running') ORDER BY started_at")
      .all() as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  list(companyId: string, limit = 100): AttemptRecord[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM attempts WHERE company_id=? ORDER BY queued_at DESC LIMIT ?")
      .all(companyId, limit) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  get(id: string): AttemptRecord {
    const row = this.database.connection.prepare("SELECT * FROM attempts WHERE id=?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) throw new Error(`Unknown attempt: ${id}`);
    return this.map(row);
  }

  acquire(record: AttemptRecord, ownerId: string, leaseSeconds = 60): void {
    const now = new Date();
    const expires = new Date(now.getTime() + leaseSeconds * 1_000).toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "UPDATE attempts SET status='starting', started_at=?, updated_at=? WHERE id=? AND status='queued'",
        )
        .run(now.toISOString(), now.toISOString(), record.id);
      this.database.connection
        .prepare("INSERT INTO attempt_leases VALUES (?,?,?,?,?,?)")
        .run(record.id, record.companyId, record.employeeId, ownerId, now.toISOString(), expires);
      this.event(record.id, "lease.acquired", { ownerId, expiresAt: expires });
    });
  }

  setStatus(
    id: string,
    status: AttemptStatus,
    input: { exitCode?: number; reason?: string } = {},
  ): void {
    const current = this.get(id);
    const terminal = !["queued", "starting", "running"].includes(status);
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE attempts SET status=?, exit_code=?, failure_reason=?, finished_at=?, updated_at=? WHERE id=?`,
        )
        .run(
          status,
          input.exitCode ?? current.exitCode,
          input.reason ?? null,
          terminal ? now : null,
          now,
          id,
        );
      if (terminal)
        this.database.connection.prepare("DELETE FROM attempt_leases WHERE attempt_id=?").run(id);
      this.event(id, "status.changed", { from: current.status, to: status, ...input });
      this.audit.append("attempt.status-changed", "supervisor", current.companyId, {
        attemptId: id,
        from: current.status,
        to: status,
      });
    });
  }

  event(attemptId: string, kind: string, data: Record<string, unknown>): void {
    this.database.connection
      .prepare("INSERT INTO attempt_events VALUES (NULL,?,?,?,?)")
      .run(attemptId, new Date().toISOString(), kind, JSON.stringify(data));
    this.database.connection
      .prepare(
        `DELETE FROM attempt_events WHERE attempt_id=? AND sequence NOT IN
       (SELECT sequence FROM attempt_events WHERE attempt_id=? ORDER BY sequence DESC LIMIT 1000)`,
      )
      .run(attemptId, attemptId);
  }

  clearExpiredLeases(now = new Date().toISOString()): string[] {
    const rows = this.database.connection
      .prepare("SELECT attempt_id FROM attempt_leases WHERE expires_at < ?")
      .all(now) as { attempt_id: string }[];
    for (const { attempt_id: id } of rows)
      this.setStatus(id, "interrupted", { reason: "expired lease recovered" });
    return rows.map(({ attempt_id }) => attempt_id);
  }

  private map(row: Record<string, unknown>): AttemptRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      taskId: String(row.task_id),
      employeeId: String(row.employee_id),
      status: String(row.status) as AttemptStatus,
      sandbox: parseJson(row.sandbox_json),
      command: parseJson(row.command_json),
      secretNames: parseJson(row.secret_names_json),
      containerName: String(row.container_name),
      exitCode: typeof row.exit_code === "number" ? row.exit_code : null,
      failureReason: typeof row.failure_reason === "string" ? row.failure_reason : null,
      queuedAt: String(row.queued_at),
      startedAt: typeof row.started_at === "string" ? row.started_at : null,
      finishedAt: typeof row.finished_at === "string" ? row.finished_at : null,
      updatedAt: String(row.updated_at),
    };
  }
}
