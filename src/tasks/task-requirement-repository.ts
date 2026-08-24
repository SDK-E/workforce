import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import type {
  TaskRecord,
  TaskRequirementVersion,
  UpdateTaskRequirementsInput,
} from "./task-types.js";

export class TaskRequirementRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  createInitial(task: TaskRecord, actorId: string): void {
    this.insert({
      companyId: task.companyId,
      taskId: task.id,
      version: 1,
      objective: task.objective,
      nonGoals: task.nonGoals,
      acceptanceCriteria: task.acceptanceCriteria,
      capabilities: task.capabilities,
      networkPolicy: task.networkPolicy,
      resourcePolicy: task.resourcePolicy,
      changedBy: actorId,
      changeReason: "Initial requirements",
      checkpointId: null,
      createdAt: task.createdAt,
    });
  }

  update(input: UpdateTaskRequirementsInput): TaskRequirementVersion {
    const current = this.current(input.companyId, input.taskId);
    if (!current) throw new Error(`Unknown task requirements: ${input.taskId}`);
    if (input.acceptanceCriteria.length === 0 || !input.objective.trim())
      throw new Error("Requirements need an objective and acceptance criteria");
    const active = this.database.connection
      .prepare(
        "SELECT id FROM attempts WHERE company_id=? AND task_id=? AND status IN ('starting','running')",
      )
      .get(input.companyId, input.taskId);
    if (active && !input.checkpointId)
      throw new Error("Active attempt requirement changes require a safe checkpoint");
    const version: TaskRequirementVersion = {
      ...input,
      version: current.version + 1,
      objective: sanitizeTerminal(input.objective),
      nonGoals: input.nonGoals.map((value) => sanitizeTerminal(value, 2_000)),
      acceptanceCriteria: input.acceptanceCriteria.map((value) => sanitizeTerminal(value, 2_000)),
      changeReason: sanitizeTerminal(input.changeReason, 2_000),
      checkpointId: input.checkpointId ?? null,
      createdAt: new Date().toISOString(),
    };
    if (!version.changeReason) throw new Error("Requirement change reason is required");
    this.database.transaction(() => {
      this.insert(version);
      this.database.connection
        .prepare(
          `UPDATE tasks SET objective=?, non_goals_json=?, acceptance_criteria_json=?, capabilities_json=?,
         network_policy_json=?, resource_policy_json=?, updated_at=? WHERE company_id=? AND id=?`,
        )
        .run(
          version.objective,
          JSON.stringify(version.nonGoals),
          JSON.stringify(version.acceptanceCriteria),
          JSON.stringify(version.capabilities),
          JSON.stringify(version.networkPolicy),
          JSON.stringify(version.resourcePolicy),
          version.createdAt,
          version.companyId,
          version.taskId,
        );
      this.audit.append("task.requirements-versioned", version.changedBy, version.companyId, {
        taskId: version.taskId,
        version: version.version,
        checkpointId: version.checkpointId,
      });
    });
    return version;
  }

  list(companyId: string, taskId: string): TaskRequirementVersion[] {
    const rows = this.database.connection
      .prepare(
        "SELECT * FROM task_requirement_versions WHERE company_id=? AND task_id=? ORDER BY version",
      )
      .all(companyId, taskId) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  private current(companyId: string, taskId: string): TaskRequirementVersion | undefined {
    const row = this.database.connection
      .prepare(
        "SELECT * FROM task_requirement_versions WHERE company_id=? AND task_id=? ORDER BY version DESC LIMIT 1",
      )
      .get(companyId, taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : undefined;
  }

  private insert(version: TaskRequirementVersion): void {
    this.database.connection
      .prepare("INSERT INTO task_requirement_versions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(
        version.companyId,
        version.taskId,
        version.version,
        version.objective,
        JSON.stringify(version.nonGoals),
        JSON.stringify(version.acceptanceCriteria),
        JSON.stringify(version.capabilities),
        JSON.stringify(version.networkPolicy),
        JSON.stringify(version.resourcePolicy),
        version.changedBy,
        version.changeReason,
        version.checkpointId,
        version.createdAt,
      );
  }

  private map(row: Record<string, unknown>): TaskRequirementVersion {
    return {
      companyId: String(row.company_id),
      taskId: String(row.task_id),
      version: Number(row.version),
      objective: String(row.objective),
      nonGoals: parseJson(row.non_goals_json),
      acceptanceCriteria: parseJson(row.acceptance_criteria_json),
      capabilities: parseJson(row.capabilities_json),
      networkPolicy: parseJson(row.network_policy_json),
      resourcePolicy: parseJson(row.resource_policy_json),
      changedBy: String(row.changed_by),
      changeReason: String(row.change_reason),
      checkpointId: typeof row.checkpoint_id === "string" ? row.checkpoint_id : null,
      createdAt: String(row.created_at),
    };
  }
}
