import type { LifecycleData, LifecycleTarget } from "./lifecycle-actions.js";

export function incidentLifecycleTargets(data: LifecycleData): LifecycleTarget[] {
  return [
    ...data.incidents.map((item) => ({
      kind: "incident" as const,
      id: item.id,
      label: `${item.severity} · ${item.title}`,
      status: item.status,
      lifecycleMutable: false,
    })),
    ...data.correctiveActions.map((item) => ({
      kind: "corrective" as const,
      id: item.id,
      label: `${item.kind} · ${item.employeeId}`,
      status: item.status,
      lifecycleMutable: false,
    })),
  ];
}
