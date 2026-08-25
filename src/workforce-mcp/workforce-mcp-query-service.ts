import type { StateStore } from "../storage/state-store.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import type { TaskRecord } from "../tasks/task-types.js";
import { authorizeMcp, isCompanyManager, type WorkforceMcpPrincipal } from "./mcp-principal.js";

export class WorkforceMcpQueryService {
  constructor(private readonly store: StateStore) {}

  companyOverview(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "company:read");
    const company = this.store.companiesRepository.require(companyId);
    const employees = this.store.companiesRepository.employees(companyId);
    const tasks = this.store.tasksRepository.list(companyId);
    this.recordRead(principal, companyId, "company_overview");
    return {
      id: company.id,
      name: company.displayName,
      mission: company.mission,
      status: company.status,
      employees: employees.length,
      tasks: tasks.length,
      activeTasks: tasks.filter(
        ({ status }) => !["completed", "cancelled", "archived"].includes(status),
      ).length,
    };
  }

  listTasks(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "task:read");
    this.recordRead(principal, companyId, "list_tasks");
    return this.store.tasksRepository
      .list(companyId)
      .filter((task) => this.canReadTask(principal, task))
      .map((task) => ({
        id: task.id,
        objective: sanitizeTerminal(task.objective, 2_000),
        status: task.status,
        assigneeId: task.assigneeId,
        priority: task.priority,
        updatedAt: task.updatedAt,
      }));
  }

  getTask(principal: WorkforceMcpPrincipal, companyId: string, taskId: string) {
    authorizeMcp(principal, companyId, "task:read");
    const task = this.requireVisibleTask(principal, companyId, taskId);
    this.recordRead(principal, companyId, "get_task");
    return { ...task, objective: sanitizeTerminal(task.objective, 2_000) };
  }

  listMessages(principal: WorkforceMcpPrincipal, companyId: string, roomId: string) {
    authorizeMcp(principal, companyId, "message:read");
    const room = this.store.conversations.rooms.list(companyId).find(({ id }) => id === roomId);
    if (!room) throw new Error(`Unknown room in company: ${roomId}`);
    if (!isCompanyManager(principal) && principal.employeeId) {
      const memberships = this.store.conversations.rooms.memberships(
        companyId,
        principal.employeeId,
      );
      if (!memberships.some((membership) => membership.roomId === roomId))
        throw new Error("MCP room access denied");
    }
    this.recordRead(principal, companyId, "list_messages");
    return this.store.conversations.messagePage(companyId, roomId, "", 50).items.map((message) => ({
      ...message,
      body: sanitizeTerminal(message.body, 4_000),
    }));
  }

  getAttempt(principal: WorkforceMcpPrincipal, companyId: string, attemptId: string) {
    authorizeMcp(principal, companyId, "attempt:read");
    const attempt = this.store.attempts.get(attemptId);
    if (attempt.companyId !== companyId) throw new Error("MCP attempt access denied");
    this.requireVisibleTask(principal, companyId, attempt.taskId);
    this.recordRead(principal, companyId, "get_attempt");
    return {
      id: attempt.id,
      taskId: attempt.taskId,
      employeeId: attempt.employeeId,
      status: attempt.status,
      exitCode: attempt.exitCode,
      failureReason: attempt.failureReason,
      queuedAt: attempt.queuedAt,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      updatedAt: attempt.updatedAt,
    };
  }

  listDeliverables(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "deliverable:read");
    const visibleTaskIds = new Set(
      this.store.tasksRepository
        .list(companyId)
        .filter((task) => this.canReadTask(principal, task))
        .map(({ id }) => id),
    );
    this.recordRead(principal, companyId, "list_deliverables");
    return this.store.artifacts
      .listCompany(companyId)
      .filter(({ taskId }) => visibleTaskIds.has(taskId))
      .map((artifact) => ({
        id: artifact.id,
        taskId: artifact.taskId,
        attemptId: artifact.attemptId,
        relativePath: artifact.relativePath,
        mediaType: artifact.mediaType,
        sizeBytes: artifact.sizeBytes,
        sha256: artifact.sha256,
        createdAt: artifact.createdAt,
      }));
  }

  listPendingDecisions(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "decision:read");
    if (!isCompanyManager(principal) && principal.role !== "manager")
      throw new Error("MCP decision access denied");
    this.recordRead(principal, companyId, "list_pending_decisions");
    return this.store.approvalsRepository.list(companyId, "pending");
  }

  organization(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "company:read");
    this.recordRead(principal, companyId, "organization");
    return this.store.organizationRepository.list(companyId);
  }

  strategy(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "company:read");
    this.recordRead(principal, companyId, "strategy");
    return this.store.strategyRepository.list(companyId);
  }

  private requireVisibleTask(
    principal: WorkforceMcpPrincipal,
    companyId: string,
    taskId: string,
  ): TaskRecord {
    const task = this.store.tasksRepository.get(companyId, taskId);
    if (!task || !this.canReadTask(principal, task)) throw new Error("MCP task access denied");
    return task;
  }

  private canReadTask(principal: WorkforceMcpPrincipal, task: TaskRecord): boolean {
    if (isCompanyManager(principal)) return true;
    if (!principal.employeeId) return false;
    if (principal.role === "reviewer") return task.reviewerId === principal.employeeId;
    if (principal.role === "manager")
      return task.managerId === principal.employeeId || task.assigneeId === principal.employeeId;
    return task.assigneeId === principal.employeeId;
  }

  private recordRead(principal: WorkforceMcpPrincipal, companyId: string, operation: string): void {
    this.store.audit.append("workforce-mcp.read", principal.id, companyId, {
      operation,
      role: principal.role,
    });
  }
}
