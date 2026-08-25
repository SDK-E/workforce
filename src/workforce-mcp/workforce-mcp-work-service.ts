import type { StateStore } from "../storage/state-store.js";
import type { TaskRecord } from "../tasks/task-types.js";
import { authorizeMcp, isCompanyManager, type WorkforceMcpPrincipal } from "./mcp-principal.js";
import { McpIdempotencyRepository } from "./mcp-idempotency-repository.js";

interface ScopedInput {
  companyId: string;
  taskId: string;
  idempotencyKey: string;
}

export class WorkforceMcpWorkService {
  private readonly idempotency: McpIdempotencyRepository;

  constructor(private readonly store: StateStore) {
    this.idempotency = new McpIdempotencyRepository(store.database);
  }

  submitClaim(
    principal: WorkforceMcpPrincipal,
    input: ScopedInput & {
      subjectId: string;
      predicate: string;
      value: unknown;
      evidenceIds: string[];
      confidence: number;
    },
  ) {
    const task = this.authorizeTask(principal, input);
    this.requireEvidence(input.companyId, task.id, input.evidenceIds);
    return this.once(principal, input, "submit_claim", () =>
      this.store.performance.assertClaim({
        companyId: input.companyId,
        subjectId: input.subjectId,
        predicate: input.predicate,
        value: input.value,
        evidenceIds: input.evidenceIds,
        confidence: input.confidence,
        authorId: requireEmployee(principal),
      }),
    );
  }

  attachArtifact(
    principal: WorkforceMcpPrincipal,
    input: ScopedInput & { artifactId: string; note: string },
  ) {
    this.authorizeTask(principal, input);
    const attemptId = requireAttempt(principal);
    return this.once(principal, input, "attach_artifact_reference", () =>
      this.store.artifactReferences.create({
        companyId: input.companyId,
        taskId: input.taskId,
        attemptId,
        artifactId: input.artifactId,
        createdBy: requireEmployee(principal),
        note: input.note,
      }),
    );
  }

  requestApproval(principal: WorkforceMcpPrincipal, input: ScopedInput & { rationale: string }) {
    this.authorizeTask(principal, input);
    return this.once(principal, input, "request_approval", () => ({
      id: this.store.approvalsRepository.request(
        input.companyId,
        "task",
        input.taskId,
        requireEmployee(principal),
        input.rationale,
      ),
    }));
  }

  requestAutomation(
    principal: WorkforceMcpPrincipal,
    input: ScopedInput & {
      title: string;
      trigger: Record<string, unknown>;
      objective: string;
      acceptanceCriteria: string[];
      rationale: string;
      estimatedRunsSaved: number;
    },
  ) {
    const task = this.authorizeTask(principal, input);
    const employeeId = requireEmployee(principal);
    return this.once(principal, input, "request_automation", () =>
      this.store.automations.propose({
        companyId: input.companyId,
        requestedBy: employeeId,
        title: input.title,
        trigger: input.trigger,
        action: {
          kind: "task",
          objective: input.objective,
          acceptanceCriteria: input.acceptanceCriteria,
          assigneeId: isCompanyManager(principal) ? "ceo" : employeeId,
          managerId: task.managerId,
          reviewerId: task.reviewerId,
          risk: task.risk,
          dataSensitivity: task.dataSensitivity,
          capabilities: task.capabilities,
          tools: task.tools,
          projectId: task.projectId,
        },
        rationale: input.rationale,
        estimatedRunsSaved: input.estimatedRunsSaved,
      }),
    );
  }

  requestHelp(
    principal: WorkforceMcpPrincipal,
    input: ScopedInput & {
      kind: "help-request" | "handoff";
      toEmployeeId?: string | undefined;
      summary: string;
      context: Record<string, unknown>;
      evidenceIds: string[];
    },
  ) {
    const task = this.authorizeTask(principal, input);
    if (input.evidenceIds.length > 0)
      this.requireEvidence(input.companyId, input.taskId, input.evidenceIds);
    return this.once(principal, input, "request_help", () =>
      this.store.taskHandoffs.create({
        companyId: input.companyId,
        taskId: input.taskId,
        kind: input.kind,
        fromEmployeeId: requireEmployee(principal),
        toEmployeeId: input.toEmployeeId ?? task.managerId,
        summary: input.summary,
        context: input.context,
        evidenceIds: input.evidenceIds,
      }),
    );
  }

  private authorizeTask(principal: WorkforceMcpPrincipal, input: ScopedInput): TaskRecord {
    authorizeMcp(principal, input.companyId, "participation:write");
    const task = this.store.tasksRepository.get(input.companyId, input.taskId);
    if (!task) throw new Error(`Unknown task in company: ${input.taskId}`);
    if (!isCompanyManager(principal)) {
      if (principal.taskId !== task.id || task.assigneeId !== principal.employeeId)
        throw new Error("MCP task access denied");
    }
    return task;
  }

  private requireEvidence(companyId: string, taskId: string, evidenceIds: string[]): void {
    if (evidenceIds.length === 0) throw new Error("At least one evidence reference is required");
    for (const id of new Set(evidenceIds)) {
      const found = this.store.db
        .prepare(
          `SELECT 1 FROM artifacts WHERE company_id=? AND task_id=? AND id=?
           UNION ALL
           SELECT 1 FROM validator_receipts WHERE company_id=? AND task_id=? AND id=? LIMIT 1`,
        )
        .get(companyId, taskId, id, companyId, taskId, id);
      if (!found) throw new Error(`Unknown evidence in task: ${id}`);
    }
  }

  private once<T>(
    principal: WorkforceMcpPrincipal,
    input: ScopedInput,
    operation: string,
    perform: () => T,
  ): T {
    return this.idempotency.execute({
      companyId: input.companyId,
      principalId: principal.id,
      operation,
      key: input.idempotencyKey,
      request: input,
      perform: () => {
        const result = perform();
        this.store.audit.append("workforce-mcp.mutation", principal.id, input.companyId, {
          operation,
          employeeId: principal.employeeId,
          taskId: input.taskId,
        });
        return result;
      },
    });
  }
}

function requireEmployee(principal: WorkforceMcpPrincipal): string {
  if (!principal.employeeId) throw new Error("MCP operation requires an employee identity");
  return principal.employeeId;
}

function requireAttempt(principal: WorkforceMcpPrincipal): string {
  if (!principal.attemptId) throw new Error("Artifact references require an attempt identity");
  return principal.attemptId;
}
