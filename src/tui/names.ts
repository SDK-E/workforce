import type { Employee } from "../domain.js";
import type { TaskRecord } from "../tasks/task-types.js";
import type { StrategyItem } from "../strategy/strategy-types.js";
import type {
  ClientRecord,
  EngagementRecord,
  LeadRecord,
  OpportunityRecord,
} from "../business/business-types.js";

export interface NameDirectory {
  employee(id: string | null | undefined): string;
  task(id: string | null | undefined): string;
  client(id: string | null | undefined): string;
  subject(id: string): string;
}

export interface NameDirectorySource {
  employees?: Employee[];
  tasks?: Pick<TaskRecord, "id" | "objective">[];
  strategyItems?: Pick<StrategyItem, "id" | "kind" | "name">[];
  opportunities?: Pick<OpportunityRecord, "id" | "name">[];
  leads?: Pick<LeadRecord, "id" | "name">[];
  clients?: Pick<ClientRecord, "id" | "name">[];
  engagements?: Pick<EngagementRecord, "id" | "name">[];
}

/**
 * Resolves record IDs to human-readable names for TUI display. Unknown IDs fall back to the raw
 * value so display never invents a name that is not backed by a persisted record.
 */
export function nameDirectory(source: NameDirectorySource): NameDirectory {
  const employees = index(source.employees ?? [], ({ id, name }) => [id, name] as const);
  const tasks = index(source.tasks ?? [], ({ id, objective }) => [id, objective] as const);
  const strategy = index(
    source.strategyItems ?? [],
    ({ id, kind, name }) => [id, `${title(kind)} — ${name}`] as const,
  );
  const opportunities = index(source.opportunities ?? [], ({ id, name }) => [id, name] as const);
  const leads = index(source.leads ?? [], ({ id, name }) => [id, name] as const);
  const clients = index(source.clients ?? [], ({ id, name }) => [id, name] as const);
  const engagements = index(source.engagements ?? [], ({ id, name }) => [id, name] as const);
  return {
    employee: (id) => (id ? (employees.get(id) ?? id) : ""),
    task: (id) => (id ? truncate(tasks.get(id) ?? id, 40) : ""),
    client: (id) => (id ? (clients.get(id) ?? id) : ""),
    subject: (id) =>
      employees.has(id)
        ? `Employee — ${employees.get(id)}`
        : tasks.has(id)
          ? `Task — ${tasks.get(id)}`
          : strategy.has(id)
            ? `${strategy.get(id)}`
            : opportunities.has(id)
              ? `Opportunity — ${opportunities.get(id)}`
              : leads.has(id)
                ? `Lead — ${leads.get(id)}`
                : clients.has(id)
                  ? `Client — ${clients.get(id)}`
                  : engagements.has(id)
                    ? `Engagement — ${engagements.get(id)}`
                    : id,
  };
}

function title(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function index<T, K>(items: T[], key: (item: T) => readonly [string, K]): Map<string, K> {
  return new Map(items.map(key));
}
