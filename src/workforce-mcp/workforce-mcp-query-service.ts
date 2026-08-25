import type { StateStore } from "../storage/state-store.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { authorizeMcp, type WorkforceMcpPrincipal } from "./mcp-principal.js";

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
    return this.store.tasksRepository.list(companyId).map((task) => ({
      id: task.id,
      objective: sanitizeTerminal(task.objective, 2_000),
      status: task.status,
      assigneeId: task.assigneeId,
      priority: task.priority,
      updatedAt: task.updatedAt,
    }));
  }

  private recordRead(principal: WorkforceMcpPrincipal, companyId: string, operation: string): void {
    this.store.audit.append("workforce-mcp.read", principal.id, companyId, {
      operation,
      role: principal.role,
    });
  }
}
