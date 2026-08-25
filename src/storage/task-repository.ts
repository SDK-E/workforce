import { randomUUID } from "node:crypto";
import type { CreateTaskInput, TaskEvent, TaskRecord, TaskStatus } from "../tasks/task-types.js";
import { nextTaskStatus } from "../tasks/task-machine.js";
import type { AuditRepository } from "./audit-repository.js";
import type { CompanyRepository } from "./company-repository.js";
import type { WorkforceDatabase } from "./database.js";
import { parseJson } from "./serialization.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";
import { TaskRequirementRepository } from "../tasks/task-requirement-repository.js";

export class TaskRepository {
  readonly requirements: TaskRequirementRepository;

  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {
    this.requirements = new TaskRequirementRepository(database, audit);
  }

  create(input: CreateTaskInput): TaskRecord {
    this.companies.require(input.companyId);
    this.validateRelationships(input);
    if (input.acceptanceCriteria.length === 0)
      throw new Error("A task requires acceptance criteria");
    const now = new Date().toISOString();
    const task: TaskRecord = {
      id: input.id ?? randomUUID(),
      companyId: input.companyId,
      projectId: input.projectId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      objective: sanitizeTerminal(input.objective),
      nonGoals: (input.nonGoals ?? []).map((value) => sanitizeTerminal(value, 2_000)),
      acceptanceCriteria: input.acceptanceCriteria.map((value) => sanitizeTerminal(value, 2_000)),
      status: "draft",
      risk: input.risk,
      dataSensitivity: input.dataSensitivity,
      capabilities: input.capabilities ?? [],
      inputs: input.inputs ?? [],
      outputs: input.outputs ?? [{ path: "deliverable.md", required: true }],
      tools: input.tools ?? [],
      modelPolicy: input.modelPolicy ?? {
        enginePreference: ["opencode", "kilo"],
        preferredModels: [],
        fallbackModels: [],
      },
      escalationPath: input.escalationPath ?? [input.managerId, "ceo"],
      completionEvidence: [],
      networkPolicy: input.networkPolicy ?? { mode: "inference-only" },
      resourcePolicy: input.resourcePolicy ?? {
        cpu: 1,
        memoryMb: 768,
        pids: 128,
        timeoutSeconds: 1800,
      },
      managerId: input.managerId,
      assigneeId: input.assigneeId ?? null,
      reviewerId: input.reviewerId ?? null,
      priority: input.priority ?? 50,
      dueAt: input.dueAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    if (!task.objective) throw new Error("A task objective is required");
    this.database.transaction(() => {
      this.insert(task);
      this.requirements.createInitial(task, "human");
      this.audit.append("task.created", "human", task.companyId, {
        taskId: task.id,
        objective: task.objective,
      });
    });
    return task;
  }

  get(companyId: string, taskId: string): TaskRecord | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM tasks WHERE company_id = ? AND id = ?")
      .get(companyId, taskId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : undefined;
  }

  list(companyId: string, status?: TaskStatus, limit = 100): TaskRecord[] {
    const bounded = Math.min(Math.max(limit, 1), 100);
    const rows = (
      status
        ? this.database.connection
            .prepare(
              "SELECT * FROM tasks WHERE company_id = ? AND status = ? ORDER BY updated_at DESC LIMIT ?",
            )
            .all(companyId, status, bounded)
        : this.database.connection
            .prepare("SELECT * FROM tasks WHERE company_id = ? ORDER BY updated_at DESC LIMIT ?")
            .all(companyId, bounded)
    ) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  addDependency(companyId: string, taskId: string, dependsOnTaskId: string, actorId: string): void {
    if (!this.get(companyId, taskId) || !this.get(companyId, dependsOnTaskId))
      throw new Error("Task dependencies must belong to the same company");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO task_dependencies VALUES (?, ?, ?, ?)")
        .run(companyId, taskId, dependsOnTaskId, new Date().toISOString());
      this.audit.append("task.dependency-added", actorId, companyId, { taskId, dependsOnTaskId });
    });
  }

  transition(
    companyId: string,
    taskId: string,
    event: TaskEvent,
    actorId: string,
    rationale: string,
    acceptanceApproved = false,
  ): TaskRecord {
    const current = this.get(companyId, taskId);
    if (!current) throw new Error(`Unknown task: ${taskId}`);
    if (event === "COMPLETE" && !acceptanceApproved)
      throw new Error("Task completion requires accepted independent evidence");
    const status = nextTaskStatus(current.status, event);
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare("UPDATE tasks SET status = ?, updated_at = ? WHERE company_id = ? AND id = ?")
        .run(status, now, companyId, taskId);
      this.database.connection
        .prepare(
          `INSERT INTO task_transitions
        (company_id, task_id, from_status, to_status, event, actor_id, rationale, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          companyId,
          taskId,
          current.status,
          status,
          event,
          actorId,
          sanitizeTerminal(rationale, 4_000),
          now,
        );
      this.audit.append("task.transitioned", actorId, companyId, {
        taskId,
        from: current.status,
        to: status,
        event,
      });
    });
    return { ...current, status, updatedAt: now };
  }

  assign(companyId: string, taskId: string, employeeId: string, actorId = "arm"): TaskRecord {
    const current = this.get(companyId, taskId);
    if (!current) throw new Error(`Unknown task: ${taskId}`);
    const employee = this.companies
      .employees(companyId)
      .find(({ id, status }) => id === employeeId && ["active", "probation"].includes(status));
    if (!employee) throw new Error(`Task assignee must be an active employee: ${employeeId}`);
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare("UPDATE tasks SET assignee_id=?,updated_at=? WHERE company_id=? AND id=?")
        .run(employeeId, now, companyId, taskId);
      this.audit.append("task.assignee-changed", actorId, companyId, {
        taskId,
        from: current.assigneeId,
        to: employeeId,
      });
    });
    return { ...current, assigneeId: employeeId, updatedAt: now };
  }

  private insert(task: TaskRecord): void {
    this.database.connection
      .prepare(
        `INSERT INTO tasks
      (id, company_id, project_id, parent_task_id, objective, non_goals_json,
       acceptance_criteria_json, status, risk, data_sensitivity, capabilities_json,
       network_policy_json, resource_policy_json, manager_id, assignee_id, reviewer_id,
       created_at, updated_at, priority, due_at, inputs_json, outputs_json, tools_json,
       model_policy_json, escalation_path_json, completion_evidence_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        task.id,
        task.companyId,
        task.projectId,
        task.parentTaskId,
        task.objective,
        JSON.stringify(task.nonGoals),
        JSON.stringify(task.acceptanceCriteria),
        task.status,
        task.risk,
        task.dataSensitivity,
        JSON.stringify(task.capabilities),
        JSON.stringify(task.networkPolicy),
        JSON.stringify(task.resourcePolicy),
        task.managerId,
        task.assigneeId,
        task.reviewerId,
        task.createdAt,
        task.updatedAt,
        task.priority,
        task.dueAt,
        JSON.stringify(task.inputs),
        JSON.stringify(task.outputs),
        JSON.stringify(task.tools),
        JSON.stringify(task.modelPolicy),
        JSON.stringify(task.escalationPath),
        JSON.stringify(task.completionEvidence),
      );
  }

  private map(row: Record<string, unknown>): TaskRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      projectId: typeof row.project_id === "string" ? row.project_id : null,
      parentTaskId: typeof row.parent_task_id === "string" ? row.parent_task_id : null,
      objective: String(row.objective),
      nonGoals: parseJson(row.non_goals_json),
      acceptanceCriteria: parseJson(row.acceptance_criteria_json),
      status: String(row.status) as TaskStatus,
      risk: String(row.risk) as TaskRecord["risk"],
      dataSensitivity: String(row.data_sensitivity) as TaskRecord["dataSensitivity"],
      capabilities: parseJson(row.capabilities_json),
      inputs: parseJson(row.inputs_json),
      outputs: parseJson(row.outputs_json),
      tools: parseJson(row.tools_json),
      modelPolicy: parseJson(row.model_policy_json),
      escalationPath: parseJson(row.escalation_path_json),
      completionEvidence: parseJson(row.completion_evidence_json),
      networkPolicy: parseJson(row.network_policy_json),
      resourcePolicy: parseJson(row.resource_policy_json),
      managerId: String(row.manager_id),
      assigneeId: typeof row.assignee_id === "string" ? row.assignee_id : null,
      reviewerId: typeof row.reviewer_id === "string" ? row.reviewer_id : null,
      priority: Number(row.priority),
      dueAt: typeof row.due_at === "string" ? row.due_at : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private validateRelationships(input: CreateTaskInput): void {
    if (input.parentTaskId && !this.get(input.companyId, input.parentTaskId))
      throw new Error("Parent task must belong to the same company");
    if (input.projectId) {
      const project = this.database.connection
        .prepare("SELECT kind FROM strategy_items WHERE company_id=? AND id=?")
        .get(input.companyId, input.projectId) as { kind: string } | undefined;
      if (project?.kind !== "project")
        throw new Error("Task project must be a project in the same company");
    }
    for (const employeeId of [input.managerId, input.assigneeId, input.reviewerId]) {
      if (!employeeId) continue;
      const employee = this.database.connection
        .prepare("SELECT 1 FROM employees WHERE company_id=? AND id=?")
        .get(input.companyId, employeeId);
      if (!employee) throw new Error(`Task owner must belong to the same company: ${employeeId}`);
    }
    if ((input.priority ?? 50) < 0 || (input.priority ?? 50) > 100)
      throw new Error("Task priority must be between 0 and 100");
  }
}
