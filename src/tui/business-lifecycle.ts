import type { StateStore } from "../storage/state-store.js";
import type { LifecycleData, LifecycleTarget } from "./lifecycle-actions.js";

export function businessLifecycleTargets(
  section: string,
  data: LifecycleData,
): LifecycleTarget[] | null {
  if (section === "Opportunities")
    return data.opportunities.map((item) => ({
      kind: "opportunity",
      id: item.id,
      label: item.name,
      status: item.stage,
    }));
  if (section === "Leads")
    return data.leads.map((item) => ({
      kind: "lead",
      id: item.id,
      label: `${item.name} · ${item.organization}`,
      status: item.status,
    }));
  if (section === "Clients")
    return data.clients.map((item) => ({
      kind: "client",
      id: item.id,
      label: item.name,
      status: item.status,
    }));
  if (section === "Engagements")
    return data.engagements.map((item) => ({
      kind: "engagement",
      id: item.id,
      label: item.name,
      status: item.status,
    }));
  return null;
}

export function applyBusinessLifecycleAction(
  store: StateStore,
  companyId: string,
  target: LifecycleTarget,
  restore: boolean,
  actorId: string,
): boolean {
  if (target.kind === "opportunity") {
    if (restore) store.opportunities.restore(companyId, target.id, actorId);
    else store.opportunities.archive(companyId, target.id, actorId);
  } else if (target.kind === "lead") {
    if (restore) store.leads.restore(companyId, target.id, actorId);
    else store.leads.archive(companyId, target.id, actorId);
  } else if (target.kind === "client") {
    if (restore) store.clients.restore(companyId, target.id, actorId);
    else store.clients.archive(companyId, target.id, actorId);
  } else if (target.kind === "engagement") {
    if (restore) store.engagements.restore(companyId, target.id, actorId);
    else store.engagements.archive(companyId, target.id, actorId);
  } else return false;
  return true;
}
