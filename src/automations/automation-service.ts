import { CronExpressionParser } from "cron-parser";
import type { StateStore } from "../storage/state-store.js";
import type { TaskExecutionService } from "../tasks/task-execution-service.js";
import type { AutomationRecord } from "./automation-types.js";
import {
  AutomationActionSchema,
  AutomationTriggerSchema,
  type AutomationTrigger,
} from "./automation-contracts.js";

export class AutomationService {
  constructor(
    private readonly store: StateStore,
    private readonly execution: TaskExecutionService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async tick(): Promise<void> {
    this.initializeSchedules();
    for (const automation of this.store.automations.due(this.now().toISOString()))
      await this.execute(automation);
  }

  private initializeSchedules(): void {
    for (const company of this.store.companies()) {
      for (const automation of this.store.automations.list(company.id, "approved")) {
        if (!automation.nextRunAt)
          this.store.automations.schedule(
            company.id,
            automation.id,
            nextOccurrence(AutomationTriggerSchema.parse(automation.trigger), this.now()),
          );
      }
    }
  }

  private async execute(automation: AutomationRecord): Promise<void> {
    const scheduledFor = automation.nextRunAt;
    if (!scheduledFor) return;
    const trigger = AutomationTriggerSchema.parse(automation.trigger);
    const nextRunAt = nextOccurrence(trigger, new Date(scheduledFor));
    const run = this.store.automations.beginRun(automation, scheduledFor);
    if (!run) {
      this.store.automations.schedule(automation.companyId, automation.id, nextRunAt);
      return;
    }
    try {
      const action = AutomationActionSchema.parse(automation.action);
      const task = this.store.createTask({
        companyId: automation.companyId,
        projectId: action.projectId,
        objective: action.objective,
        acceptanceCriteria: action.acceptanceCriteria,
        risk: action.risk,
        dataSensitivity: action.dataSensitivity,
        capabilities: action.capabilities,
        tools: action.tools,
        managerId: action.managerId,
        assigneeId: action.assigneeId,
        reviewerId: action.reviewerId,
      });
      this.store.transitionTask(
        automation.companyId,
        task.id,
        "REQUEST_APPROVAL",
        "automation",
        `Approved automation ${automation.id}`,
      );
      this.store.transitionTask(
        automation.companyId,
        task.id,
        "APPROVE",
        automation.decidedBy ?? "automation",
        `Previously approved automation ${automation.id}`,
      );
      const attempt = await this.execution.start(automation.companyId, task.id, "automation");
      this.store.automations.finishRun(run, "succeeded", nextRunAt, {
        taskId: task.id,
        attemptId: attempt.id,
      });
    } catch (error) {
      this.store.automations.finishRun(run, "failed", nextRunAt, {
        error: error instanceof Error ? error.message : "Unknown automation failure",
      });
    }
  }
}

function nextOccurrence(trigger: AutomationTrigger, after: Date): string {
  if (trigger.kind === "interval")
    return new Date(after.getTime() + trigger.everySeconds * 1_000).toISOString();
  const next = CronExpressionParser.parse(trigger.expression, {
    currentDate: after,
    tz: trigger.timezone,
    strict: true,
  })
    .next()
    .toISOString();
  if (!next) throw new Error("Cron expression has no next occurrence");
  return next;
}
