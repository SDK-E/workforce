import { designAgentForJob } from "../agent-designer.js";
import { analyzeWorkforceGap } from "../governance/gap-analysis.js";
import type { StateStore } from "../storage/state-store.js";
import { taskJobRequirements } from "../tasks/task-job-requirements.js";
import type { TaskRecord } from "../tasks/task-types.js";
import { ArmReinforcementService } from "./arm-reinforcement-service.js";

export class ArmOperatingLoop {
  private readonly reinforcement: ArmReinforcementService;

  constructor(private readonly store: StateStore) {
    this.reinforcement = new ArmReinforcementService(store);
  }

  tick(): void {
    for (const company of this.store.companies().filter(({ status }) => status === "active")) {
      this.reinforcement.evaluateCompany(company.id);
      for (const task of this.unassignedWork(company.id)) this.staff(task);
    }
  }

  private unassignedWork(companyId: string): TaskRecord[] {
    return this.store
      .tasks(companyId, undefined, 100)
      .filter(
        ({ assigneeId, status }) => !assigneeId && ["ready", "awaiting-approval"].includes(status),
      );
  }

  private staff(task: TaskRecord): void {
    const requirements = taskJobRequirements(task);
    const gap = analyzeWorkforceGap(requirements, this.store.employees(task.companyId));
    this.store.employment.recordGap({
      companyId: task.companyId,
      jobId: requirements.id,
      kind: gap.kind,
      missing: gap.missing,
      alternatives: gap.alternatives,
      recommendation: gap.recommendation,
      createdBy: "arm",
    });
    if (gap.employeeId) {
      this.store.tasksRepository.assign(task.companyId, task.id, gap.employeeId, "arm");
      this.store.append("arm.work-assigned", "arm", task.companyId, {
        taskId: task.id,
        employeeId: gap.employeeId,
        recommendation: gap.recommendation,
      });
      return;
    }
    if (gap.recommendation !== "hire") {
      this.store.tasksRepository.assign(task.companyId, task.id, "arm", "arm");
      this.store.append("arm.temporary-session-assigned", "arm", task.companyId, {
        taskId: task.id,
        missing: gap.missing,
      });
      return;
    }
    const existing = this.store.employment
      .proposalList(task.companyId)
      .find(({ jobId, status }) => jobId === requirements.id && status !== "rejected");
    if (existing) return;
    const proposal = this.store.employment.propose(
      task.companyId,
      designAgentForJob(requirements, "arm"),
      "arm",
    );
    const approved = this.store.employment.decide(
      task.companyId,
      proposal.id,
      "approved",
      "arm",
      "Verified capability gap within delegated workforce policy",
    );
    this.store.tasksRepository.assign(task.companyId, task.id, approved.employeeId, "arm");
  }
}
