import { randomUUID } from "node:crypto";
import type { StateStore } from "../storage/state-store.js";
import type { TaskExecutionService } from "../tasks/task-execution-service.js";
import type { TaskRecord } from "../tasks/task-types.js";
import type { AutonomyRepository } from "./autonomy-repository.js";

export class CeoOperatingLoop {
  readonly ownerId = randomUUID();

  constructor(
    private readonly store: StateStore,
    private readonly autonomy: AutonomyRepository,
    private readonly execution: TaskExecutionService,
  ) {}

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
      const runnable = this.store
        .tasks(companyId)
        .find((task) => task.assigneeId === "ceo" && ["ready", "assigned"].includes(task.status));
      if (runnable) {
        const attempt = await this.execution.start(companyId, runnable.id, "ceo");
        this.autonomy.finish(
          cycle,
          "completed",
          { action: "execute", taskId: runnable.id },
          runnable.id,
        );
        this.store.append("ceo.delegated-execution", "ceo", companyId, {
          cycleId: cycle.id,
          taskId: runnable.id,
          attemptId: attempt.id,
        });
        return;
      }
      if (Number(observation.activeTasks) > 0 || Number(observation.activeAttempts) > 0) {
        this.autonomy.finish(cycle, "completed", { action: "monitor-existing-work" }, null);
        return;
      }
      const task = this.createDirectionTask(companyId, observation);
      const attempt = await this.execution.start(companyId, task.id, "ceo");
      this.autonomy.finish(
        cycle,
        "completed",
        { action: "set-company-direction", taskId: task.id },
        task.id,
      );
      this.store.append("ceo.direction-cycle-started", "ceo", companyId, {
        cycleId: cycle.id,
        taskId: task.id,
        attemptId: attempt.id,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown CEO cycle failure";
      this.autonomy.finish(cycle, "blocked", { action: "retry-after-blockage" }, null, reason);
    }
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

  private createDirectionTask(companyId: string, observation: Record<string, unknown>): TaskRecord {
    const company = this.store.companiesRepository.require(companyId);
    const task = this.store.createTask({
      companyId,
      objective: [
        `Lead ${company.displayName} as its CEO.`,
        `Mission: ${company.mission || "Mission is not configured; establish one from available evidence."}`,
        `Vision: ${company.vision || "Vision is not configured; propose a measurable direction."}`,
        `Current operating observation: ${JSON.stringify(observation)}.`,
        "Choose the highest-value safe direction, create or revise measurable company objectives, and delegate concrete work through Workforce services.",
      ].join("\n"),
      nonGoals: [
        "Conversational small talk",
        "Unverified claims",
        "Actions outside company policy",
      ],
      acceptanceCriteria: [
        "A measurable objective or maintenance decision is persisted",
        "Every delegated task has an owner and independently verifiable exit criteria",
        "The decision cites current company evidence and respects configured budget and policy",
      ],
      outputs: [{ path: "ceo-decision.json", required: true, validator: "json" }],
      risk: "medium",
      dataSensitivity: "internal",
      capabilities: ["strategy", "delegation"],
      managerId: "ceo",
      assigneeId: "ceo",
      reviewerId: "arm",
      escalationPath: ["ceo", "human"],
    });
    this.store.transitionTask(
      companyId,
      task.id,
      "REQUEST_APPROVAL",
      "ceo",
      "CEO operating mandate",
    );
    return this.store.transitionTask(
      companyId,
      task.id,
      "APPROVE",
      "ceo",
      "Within delegated CEO authority",
    );
  }
}
