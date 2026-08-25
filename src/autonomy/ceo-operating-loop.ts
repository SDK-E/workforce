import { randomUUID } from "node:crypto";
import type { StateStore } from "../storage/state-store.js";
import type { TaskExecutionService } from "../tasks/task-execution-service.js";
import type { TaskRecord } from "../tasks/task-types.js";
import type { AutonomyRepository } from "./autonomy-repository.js";
import { CeoCommercialPlanner } from "./ceo-commercial-planner.js";
import { CeoTaskFactory } from "./ceo-task-factory.js";

export class CeoOperatingLoop {
  readonly ownerId = randomUUID();
  private readonly planner: CeoCommercialPlanner;
  private readonly tasks: CeoTaskFactory;

  constructor(
    private readonly store: StateStore,
    private readonly autonomy: AutonomyRepository,
    private readonly execution: TaskExecutionService,
  ) {
    this.planner = new CeoCommercialPlanner(store);
    this.tasks = new CeoTaskFactory(store);
  }

  async tick(): Promise<void> {
    this.autonomy.recoverExpired();
    for (const runtime of this.autonomy.due()) await this.runCompany(runtime.companyId);
  }

  private async runCompany(companyId: string): Promise<void> {
    const runtime = this.autonomy.get(companyId);
    if (!runtime?.enabled) return;
    const observation = this.observe(companyId);
    const cycle = this.autonomy.acquire(runtime, this.ownerId, observation);
    if (!cycle) return;
    try {
      const runnable = this.runnableTask(companyId) ?? this.resolveGovernedTask(companyId);
      if (runnable) {
        await this.execute(cycle.id, companyId, runnable);
        this.autonomy.finish(
          cycle,
          "completed",
          { action: "execute", taskId: runnable.id },
          runnable.id,
        );
        return;
      }
      if (Number(observation.activeTasks) > 0 || Number(observation.activeAttempts) > 0) {
        this.autonomy.finish(cycle, "completed", { action: "monitor-existing-work" }, null);
        return;
      }
      const decision = this.planner.decide(companyId);
      if (decision.authority === "none") {
        this.autonomy.finish(cycle, "completed", { ...decision }, null);
        this.store.append("ceo.no-safe-action", "ceo", companyId, {
          cycleId: cycle.id,
          ...decision,
        });
        return;
      }
      const task = this.tasks.create(companyId, decision);
      if (task.status === "awaiting-approval") {
        this.autonomy.finish(cycle, "completed", { ...decision, taskId: task.id }, task.id);
        this.store.append("ceo.governance-requested", "ceo", companyId, {
          cycleId: cycle.id,
          taskId: task.id,
          action: decision.action,
        });
        return;
      }
      await this.execute(cycle.id, companyId, task);
      this.autonomy.finish(cycle, "completed", { ...decision, taskId: task.id }, task.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown CEO cycle failure";
      this.autonomy.finish(cycle, "blocked", { action: "retry-after-blockage" }, null, reason);
    }
  }

  private runnableTask(companyId: string): TaskRecord | undefined {
    return this.store
      .tasks(companyId)
      .find((task) => task.assigneeId === "ceo" && ["ready", "assigned"].includes(task.status));
  }

  private resolveGovernedTask(companyId: string): TaskRecord | undefined {
    const waiting = this.store
      .tasks(companyId)
      .find((task) => task.assigneeId === "ceo" && task.status === "awaiting-approval");
    if (!waiting) return undefined;
    const approval = this.store.approvalsRepository
      .list(companyId)
      .find(({ subjectType, subjectId }) => subjectType === "ceo-task" && subjectId === waiting.id);
    if (approval?.status === "approved")
      return this.store.transitionTask(companyId, waiting.id, "APPROVE", "ceo", approval.rationale);
    if (approval?.status === "rejected")
      this.store.transitionTask(companyId, waiting.id, "REJECT", "ceo", approval.rationale);
    return undefined;
  }

  private async execute(cycleId: string, companyId: string, task: TaskRecord): Promise<void> {
    const attempt = await this.execution.start(companyId, task.id, "ceo");
    this.store.append("ceo.delegated-execution", "ceo", companyId, {
      cycleId,
      taskId: task.id,
      attemptId: attempt.id,
    });
  }

  private observe(companyId: string): Record<string, unknown> {
    const tasks = this.store.tasks(companyId, undefined, 100);
    const attempts = this.store.attempts.list(companyId);
    const activeTaskStatuses = new Set([
      "ready",
      "assigned",
      "starting",
      "investigating",
      "planning",
      "implementing",
      "verifying",
      "waiting-dependency",
      "waiting-message",
      "waiting-approval",
      "blocked",
      "recovering",
      "retrying",
      "review-required",
    ]);
    return {
      observedAt: new Date().toISOString(),
      activeTasks: tasks.filter(({ status }) => activeTaskStatuses.has(status)).length,
      blockedTasks: tasks.filter(({ status }) => status === "blocked").length,
      activeAttempts: attempts.filter(({ status }) =>
        ["queued", "starting", "running"].includes(status),
      ).length,
      pendingApprovals: this.store.pendingApprovals(companyId),
      activeStrategyItems: this.store
        .strategyItems(companyId)
        .filter(({ status }) => status === "active").length,
      evidenceActivities: this.store.executionEvidence.activityCount(companyId),
    };
  }
}
