import type { StateStore } from "../storage/state-store.js";
import type { CreateTaskInput } from "../tasks/task-types.js";
import type { EmploymentEvent } from "../governance/employment-machine.js";
import type { ApprovalEvent } from "../governance/approval-machine.js";
import type { JobRequirements } from "../domain.js";
import { analyzeWorkforceGap } from "../governance/gap-analysis.js";
import { designAgentForJob } from "../agent-designer.js";
import {
  authorizeMcp,
  type WorkforceMcpCapability,
  type WorkforceMcpPrincipal,
} from "./mcp-principal.js";
import { McpIdempotencyRepository } from "./mcp-idempotency-repository.js";

interface MutationScope {
  companyId: string;
  idempotencyKey: string;
}

type McpCreateTaskInput = MutationScope &
  Omit<
    CreateTaskInput,
    "companyId" | "id" | "projectId" | "parentTaskId" | "assigneeId" | "reviewerId" | "dueAt"
  > & {
    id?: string | undefined;
    projectId?: string | null | undefined;
    parentTaskId?: string | null | undefined;
    assigneeId?: string | null | undefined;
    reviewerId?: string | null | undefined;
    dueAt?: string | null | undefined;
  };

export class WorkforceMcpManagementService {
  private readonly idempotency: McpIdempotencyRepository;

  constructor(private readonly store: StateStore) {
    this.idempotency = new McpIdempotencyRepository(store.database);
  }

  createObjective(
    principal: WorkforceMcpPrincipal,
    input: MutationScope & {
      name: string;
      ownerId: string;
      managerId: string;
      successMeasures: string[];
      requirements: string[];
      constraints: string[];
      risks: string[];
      targetAt?: string | undefined;
    },
  ) {
    return this.mutate(principal, input, "work:mutate", "create_objective", () =>
      this.store.strategyRepository.create(
        {
          companyId: input.companyId,
          kind: "objective",
          name: input.name,
          ownerId: input.ownerId,
          managerId: input.managerId,
          successMeasures: input.successMeasures,
          requirements: input.requirements,
          constraints: input.constraints,
          risks: input.risks,
          ...(input.targetAt === undefined ? {} : { targetAt: input.targetAt }),
        },
        principal.id,
      ),
    );
  }

  createTask(principal: WorkforceMcpPrincipal, input: McpCreateTaskInput) {
    return this.mutate(principal, input, "work:mutate", "create_task", () => {
      const taskInput = Object.fromEntries(
        Object.entries(input).filter(
          ([key, value]) => key !== "idempotencyKey" && value !== undefined,
        ),
      );
      return this.store.tasksRepository.create(
        taskInput as unknown as CreateTaskInput,
        principal.id,
      );
    });
  }

  assignTask(
    principal: WorkforceMcpPrincipal,
    input: MutationScope & { taskId: string; employeeId: string },
  ) {
    return this.mutate(principal, input, "workforce:manage", "assign_task", () =>
      this.store.tasksRepository.assign(
        input.companyId,
        input.taskId,
        input.employeeId,
        principal.id,
      ),
    );
  }

  decideApproval(
    principal: WorkforceMcpPrincipal,
    input: MutationScope & { approvalId: string; event: ApprovalEvent; rationale: string },
  ) {
    return this.mutate(principal, input, "work:mutate", "decide_approval", () =>
      this.store.approvalsRepository.decide(
        input.companyId,
        input.approvalId,
        input.event,
        principal.id,
        input.rationale,
      ),
    );
  }

  transitionEmployment(
    principal: WorkforceMcpPrincipal,
    input: MutationScope & {
      employeeId: string;
      event: EmploymentEvent;
      rationale: string;
      managerId?: string | undefined;
      department?: string | undefined;
    },
  ) {
    return this.mutate(principal, input, "workforce:manage", "transition_employment", () =>
      this.store.employment.transition(
        input.companyId,
        input.employeeId,
        input.event,
        principal.id,
        input.rationale,
        {
          ...(input.managerId === undefined ? {} : { managerId: input.managerId }),
          ...(input.department === undefined ? {} : { department: input.department }),
        },
      ),
    );
  }

  proposeHire(principal: WorkforceMcpPrincipal, input: MutationScope & { job: JobRequirements }) {
    return this.mutate(principal, input, "workforce:manage", "propose_hire", () => {
      const analysis = analyzeWorkforceGap(input.job, this.store.employees(input.companyId));
      const gap = this.store.employment.recordGap({
        companyId: input.companyId,
        jobId: input.job.id,
        kind: analysis.kind,
        missing: analysis.missing,
        alternatives: analysis.alternatives,
        recommendation: analysis.recommendation,
        createdBy: principal.id,
      });
      if (analysis.recommendation !== "hire") return { gap, proposal: null };
      const proposal = this.store.employment.propose(
        input.companyId,
        designAgentForJob(input.job),
        principal.id,
      );
      return { gap, proposal };
    });
  }

  private mutate<T>(
    principal: WorkforceMcpPrincipal,
    input: MutationScope,
    capability: WorkforceMcpCapability,
    operation: string,
    perform: () => T,
  ): T {
    authorizeMcp(principal, input.companyId, capability);
    return this.idempotency.execute({
      companyId: input.companyId,
      principalId: principal.id,
      operation,
      key: input.idempotencyKey,
      request: input,
      perform: () => {
        const result = perform();
        this.store.audit.append("workforce-mcp.management", principal.id, input.companyId, {
          operation,
          capability,
        });
        return result;
      },
    });
  }
}
