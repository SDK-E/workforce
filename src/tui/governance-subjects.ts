import type { StateStore } from "../storage/state-store.js";
import type { NamedOption } from "./components/named-select.js";

export function governanceSubjectOptions(store: StateStore, companyId: string): NamedOption[] {
  return [
    ...store.employees(companyId).map((employee) => ({
      label: `Employee — ${employee.name} (${employee.title})`,
      value: employee.id,
    })),
    ...store.tasks(companyId).map((task) => ({
      label: `Task — ${task.objective}`,
      value: task.id,
    })),
    ...store.strategyItems(companyId).map((item) => ({
      label: `${title(item.kind)} — ${item.name}`,
      value: item.id,
    })),
    ...store.opportunities.list(companyId).map((item) => ({
      label: `Opportunity — ${item.name}`,
      value: item.id,
    })),
    ...store.leads.list(companyId).map((item) => ({
      label: `Lead — ${item.name}`,
      value: item.id,
    })),
    ...store.clients.list(companyId).map((item) => ({
      label: `Client — ${item.name}`,
      value: item.id,
    })),
    ...store.engagements.list(companyId).map((item) => ({
      label: `Engagement — ${item.name}`,
      value: item.id,
    })),
  ];
}

function title(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
