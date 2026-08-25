import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import {
  BusinessForm,
  listValue,
  numberValue,
  optionalValue,
  type BusinessFormKind,
} from "./business-form.js";

export function BusinessMutationOverlay(props: {
  kind: BusinessFormKind;
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  selectedTarget: LifecycleTarget | null;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  const initial = selectedRecord(props);
  return (
    <BusinessForm
      kind={props.kind}
      {...(initial ? { initial } : {})}
      employees={props.store.employees(props.company.id)}
      opportunities={props.store.opportunities.list(props.company.id)}
      leads={props.store.leads.list(props.company.id)}
      clients={props.store.clients.list(props.company.id)}
      projects={props.store.strategyRepository.list(props.company.id, "project")}
      terminalWidth={props.terminalWidth}
      onCancel={props.onClose}
      onSubmit={(values) => {
        props.finish(
          () => {
            persist(props, values, initial?.id);
          },
          `${props.kind} ${initial ? "updated" : "created"} and audited`,
        );
      }}
    />
  );
}

function persist(
  props: Parameters<typeof BusinessMutationOverlay>[0],
  values: string[],
  id?: string,
): void {
  const companyId = props.company.id;
  if (props.kind === "opportunity") {
    const input = {
      name: required(values[0], "Name"),
      source: required(values[1], "Source"),
      problem: required(values[2], "Problem"),
      hypothesis: required(values[3], "Hypothesis"),
      score: numberValue(values[4], "Score"),
      stage: opportunityStage(values[5]),
      ownerId: optionalValue(values[6]),
      evidenceIds: listValue(values[7]),
    };
    if (id) props.store.opportunities.update(companyId, id, input, "human");
    else {
      const created = props.store.opportunities.create(
        { companyId, ...input, discoveredBy: "human" },
        "human",
      );
      if (input.stage !== created.stage)
        props.store.opportunities.update(companyId, created.id, { stage: input.stage }, "human");
    }
  } else if (props.kind === "lead") {
    const input = {
      name: required(values[1], "Name"),
      organization: required(values[2], "Organization"),
      email: optionalValue(values[3]),
      website: optionalValue(values[4]),
      source: required(values[5], "Source"),
      qualificationScore: numberValue(values[6], "Qualification score"),
      status: leadStatus(values[7]),
      ownerId: optionalValue(values[8]),
      notes: optionalValue(values[9]) ?? "",
    };
    if (id) props.store.leads.update(companyId, id, input, "human");
    else {
      const created = props.store.leads.create(
        { companyId, opportunityId: optionalValue(values[0]), ...input },
        "human",
      );
      if (input.status !== created.status)
        props.store.leads.update(companyId, created.id, { status: input.status }, "human");
    }
  } else if (props.kind === "client") {
    const input = {
      name: required(values[1], "Name"),
      primaryContact: required(values[2], "Primary contact"),
      email: optionalValue(values[3]),
      status: clientStatus(values[4]),
      ownerId: optionalValue(values[5]),
      notes: optionalValue(values[6]) ?? "",
    };
    if (id) props.store.clients.update(companyId, id, input, "human");
    else {
      const created = props.store.clients.create(
        { companyId, leadId: optionalValue(values[0]), ...input },
        "human",
      );
      if (input.status !== created.status)
        props.store.clients.update(companyId, created.id, { status: input.status }, "human");
    }
  } else {
    const input = {
      name: required(values[2], "Name"),
      status: engagementStatus(values[3]),
      scope: required(values[4], "Scope"),
      successCriteria: requiredList(values[5], "Success criteria"),
      ownerId: optionalValue(values[6]),
      startsAt: optionalValue(values[7]),
      endsAt: optionalValue(values[8]),
    };
    if (id) props.store.engagements.update(companyId, id, input, "human");
    else {
      const created = props.store.engagements.create(
        {
          companyId,
          clientId: required(values[0], "Client ID"),
          projectId: optionalValue(values[1]),
          ...input,
        },
        "human",
      );
      if (input.status !== created.status)
        props.store.engagements.update(companyId, created.id, { status: input.status }, "human");
    }
  }
}

function selectedRecord(props: Parameters<typeof BusinessMutationOverlay>[0]) {
  const id = props.selectedTarget?.kind === props.kind ? props.selectedTarget.id : undefined;
  if (!id) return undefined;
  if (props.kind === "opportunity") return props.store.opportunities.get(props.company.id, id);
  if (props.kind === "lead") return props.store.leads.get(props.company.id, id);
  if (props.kind === "client") return props.store.clients.get(props.company.id, id);
  return props.store.engagements.get(props.company.id, id);
}

function required(value: string | undefined, label: string): string {
  const result = value?.trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
}
function requiredList(value: string | undefined, label: string): string[] {
  const result = listValue(value);
  if (!result.length) throw new Error(`${label} are required`);
  return result;
}

const opportunityStage = enumValue(
  ["discovered", "researching", "validated", "rejected", "converted", "archived"] as const,
  "opportunity stage",
);
const leadStatus = enumValue(
  ["new", "qualified", "contacted", "nurturing", "won", "lost", "archived"] as const,
  "lead status",
);
const clientStatus = enumValue(
  ["prospect", "active", "paused", "former", "archived"] as const,
  "client status",
);
const engagementStatus = enumValue(
  ["proposed", "active", "paused", "completed", "cancelled", "archived"] as const,
  "engagement status",
);

function enumValue<const T extends readonly string[]>(allowed: T, label: string) {
  return (value: string | undefined): T[number] => {
    const result = value?.trim();
    if (!allowed.some((candidate) => candidate === result))
      throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
    return result as T[number];
  };
}
