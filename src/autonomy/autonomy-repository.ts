import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import type { CompanyRuntime, OperatingCycle } from "./autonomy-types.js";

export class AutonomyRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  ensure(companyId: string): CompanyRuntime {
    const existing = this.get(companyId);
    if (existing) return existing;
    const now = new Date().toISOString();
    this.database.connection
      .prepare("INSERT INTO company_runtime VALUES (?,1,60,0,2,'idle',NULL,?,?)")
      .run(companyId, now, now);
    return this.require(companyId);
  }

  configure(
    companyId: string,
    input: Pick<
      CompanyRuntime,
      "enabled" | "cadenceSeconds" | "monthlyBudgetCents" | "maxConcurrentAttempts"
    >,
    actorId: string,
  ): CompanyRuntime {
    if (input.cadenceSeconds < 10) throw new Error("Autonomy cadence must be at least ten seconds");
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.ensure(companyId);
      this.database.connection
        .prepare(
          `UPDATE company_runtime SET enabled=?,cadence_seconds=?,monthly_budget_cents=?,
           max_concurrent_attempts=?,state=?,next_cycle_at=?,updated_at=? WHERE company_id=?`,
        )
        .run(
          input.enabled ? 1 : 0,
          input.cadenceSeconds,
          input.monthlyBudgetCents,
          input.maxConcurrentAttempts,
          input.enabled ? "idle" : "stopped",
          now,
          now,
          companyId,
        );
      this.audit.append("autonomy.configured", actorId, companyId, input);
    });
    return this.require(companyId);
  }

  get(companyId: string): CompanyRuntime | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM company_runtime WHERE company_id=?")
      .get(companyId) as Record<string, unknown> | undefined;
    return row ? mapRuntime(row) : undefined;
  }

  private require(companyId: string): CompanyRuntime {
    const runtime = this.get(companyId);
    if (!runtime) throw new Error(`Unknown company runtime: ${companyId}`);
    return runtime;
  }

  due(now = new Date().toISOString()): CompanyRuntime[] {
    const rows = this.database.connection
      .prepare(
        "SELECT * FROM company_runtime WHERE enabled=1 AND next_cycle_at<=? ORDER BY next_cycle_at",
      )
      .all(now) as Record<string, unknown>[];
    return rows.map(mapRuntime);
  }

  acquire(
    runtime: CompanyRuntime,
    owner: string,
    observation: Record<string, unknown>,
    leaseSeconds = 120,
  ): OperatingCycle | null {
    const started = new Date();
    const expires = new Date(started.getTime() + leaseSeconds * 1_000).toISOString();
    const cycle: OperatingCycle = {
      id: randomUUID(),
      companyId: runtime.companyId,
      leaderId: "ceo",
      status: "leased",
      leaseOwner: owner,
      leaseExpiresAt: expires,
      observation,
      decision: null,
      spawnedTaskId: null,
      startedAt: started.toISOString(),
      finishedAt: null,
      failureReason: null,
    };
    const acquired = this.database.transaction(() => {
      const result = this.database.connection
        .prepare(
          "UPDATE company_runtime SET state='running',updated_at=? WHERE company_id=? AND enabled=1 AND state!='running'",
        )
        .run(cycle.startedAt, runtime.companyId);
      if (result.changes !== 1) return false;
      this.database.connection
        .prepare("INSERT INTO operating_cycles VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          cycle.id,
          cycle.companyId,
          cycle.leaderId,
          cycle.status,
          cycle.leaseOwner,
          cycle.leaseExpiresAt,
          JSON.stringify(cycle.observation),
          null,
          null,
          cycle.startedAt,
          null,
          null,
        );
      this.audit.append("autonomy.cycle-leased", "ceo", runtime.companyId, {
        cycleId: cycle.id,
        owner,
      });
      return true;
    });
    return acquired ? cycle : null;
  }

  finish(
    cycle: OperatingCycle,
    status: "completed" | "blocked" | "failed",
    decision: Record<string, unknown>,
    spawnedTaskId: string | null,
    failureReason: string | null = null,
  ): void {
    const finished = new Date();
    const runtime = this.get(cycle.companyId);
    if (!runtime) throw new Error(`Unknown company runtime: ${cycle.companyId}`);
    const next = new Date(finished.getTime() + runtime.cadenceSeconds * 1_000).toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "UPDATE operating_cycles SET status=?,decision_json=?,spawned_task_id=?,finished_at=?,failure_reason=? WHERE id=? AND lease_owner=?",
        )
        .run(
          status,
          JSON.stringify(decision),
          spawnedTaskId,
          finished.toISOString(),
          failureReason,
          cycle.id,
          cycle.leaseOwner,
        );
      this.database.connection
        .prepare(
          "UPDATE company_runtime SET state=?,last_cycle_at=?,next_cycle_at=?,updated_at=? WHERE company_id=?",
        )
        .run(
          status === "completed" ? "idle" : "blocked",
          finished.toISOString(),
          next,
          finished.toISOString(),
          cycle.companyId,
        );
      this.audit.append(`autonomy.cycle-${status}`, "ceo", cycle.companyId, {
        cycleId: cycle.id,
        spawnedTaskId,
        failureReason,
      });
    });
  }

  recoverExpired(now = new Date().toISOString()): number {
    const rows = this.database.connection
      .prepare(
        "SELECT id,company_id FROM operating_cycles WHERE status='leased' AND lease_expires_at<?",
      )
      .all(now) as { id: string; company_id: string }[];
    this.database.transaction(() => {
      for (const row of rows) {
        this.database.connection
          .prepare(
            "UPDATE operating_cycles SET status='failed',finished_at=?,failure_reason='expired lease' WHERE id=?",
          )
          .run(now, row.id);
        this.database.connection
          .prepare(
            "UPDATE company_runtime SET state='blocked',next_cycle_at=?,updated_at=? WHERE company_id=?",
          )
          .run(now, now, row.company_id);
        this.audit.append("autonomy.lease-recovered", "system", row.company_id, {
          cycleId: row.id,
        });
      }
    });
    return rows.length;
  }
}

function mapRuntime(row: Record<string, unknown>): CompanyRuntime {
  return {
    companyId: String(row.company_id),
    enabled: Boolean(row.enabled),
    cadenceSeconds: Number(row.cadence_seconds),
    monthlyBudgetCents: Number(row.monthly_budget_cents),
    maxConcurrentAttempts: Number(row.max_concurrent_attempts),
    state: String(row.state) as CompanyRuntime["state"],
    lastCycleAt: typeof row.last_cycle_at === "string" ? row.last_cycle_at : null,
    nextCycleAt: String(row.next_cycle_at),
    updatedAt: String(row.updated_at),
  };
}
