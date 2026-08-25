import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type {
  ClientRecord,
  EngagementRecord,
  LeadRecord,
  OpportunityRecord,
} from "../../business/business-types.js";
import type { Employee } from "../../domain.js";
import type { StrategyItem } from "../../strategy/strategy-types.js";
import { NamedSelect, type NamedOption } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

export type BusinessFormKind = "opportunity" | "lead" | "client" | "engagement";
type BusinessRecord = OpportunityRecord | LeadRecord | ClientRecord | EngagementRecord;

export function BusinessForm(props: {
  kind: BusinessFormKind;
  initial?: BusinessRecord;
  employees?: Employee[];
  opportunities?: OpportunityRecord[];
  leads?: LeadRecord[];
  clients?: ClientRecord[];
  projects?: StrategyItem[];
  terminalWidth: number;
  onSubmit: (values: string[]) => void;
  onCancel: () => void;
}) {
  const fields = FIELDS[props.kind];
  const steps = props.initial ? fields.map((_, index) => index) : CREATE_STEPS[props.kind];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => initialValues(props.kind, props.initial));
  const fieldIndex = steps[step];
  const options = fieldIndex === undefined ? undefined : selectOptions(props, fieldIndex);
  const confirming = step === steps.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) props.onSubmit(values);
  });
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Create"} ${props.kind}`}
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter confirm and audit · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${steps.length}`
      }
    >
      {confirming ? (
        <Text>Persist this company-scoped {props.kind} record?</Text>
      ) : options ? (
        <NamedSelect
          label={fields[fieldIndex ?? 0] ?? "Selection"}
          items={options}
          value={values[fieldIndex ?? 0] ?? ""}
          onSelect={(value) => {
            setValues((current) =>
              current.map((item, index) => (index === fieldIndex ? value : item)),
            );
            setStep((current) => current + 1);
          }}
        />
      ) : (
        <>
          <Text>{fields[fieldIndex ?? 0]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[fieldIndex ?? 0] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === fieldIndex ? value : item)),
                );
              }}
              onSubmit={() => {
                if ((values[fieldIndex ?? 0] ?? "").trim()) setStep((current) => current + 1);
              }}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

const FIELDS: Record<BusinessFormKind, string[]> = {
  opportunity: [
    "Name",
    "Source",
    "Customer problem",
    "Hypothesis",
    "Score (0-100)",
    "Stage",
    "Owner (optional)",
    "Evidence IDs (comma separated, or none)",
  ],
  lead: [
    "Opportunity (optional)",
    "Contact name",
    "Organization",
    "Email (or none)",
    "Website (or none)",
    "Source",
    "Qualification score (0-100)",
    "Status",
    "Owner (optional)",
    "Notes (or none)",
  ],
  client: [
    "Lead (optional)",
    "Client name",
    "Primary contact",
    "Email (or none)",
    "Status",
    "Owner (optional)",
    "Notes (or none)",
  ],
  engagement: [
    "Client",
    "Project (optional)",
    "Engagement name",
    "Status",
    "Scope",
    "Success criteria (comma separated)",
    "Owner (optional)",
    "Starts at ISO date (or none)",
    "Ends at ISO date (or none)",
  ],
};

const CREATE_STEPS: Record<BusinessFormKind, number[]> = {
  opportunity: [0, 1, 2, 3],
  lead: [0, 1, 2, 3, 4, 5],
  client: [0, 1, 2, 3],
  engagement: [0, 1, 2, 4, 5],
};

function selectOptions(
  props: Parameters<typeof BusinessForm>[0],
  step: number,
): NamedOption[] | undefined {
  if (isOwnerStep(props.kind, step))
    return optionalOptions(
      (props.employees ?? [])
        .filter(({ status }) => status !== "terminated")
        .map((employee) => ({ label: `${employee.name} — ${employee.title}`, value: employee.id })),
    );
  if (props.kind === "lead" && step === 0)
    return optionalOptions(
      (props.opportunities ?? []).map(({ id, name }) => ({ label: name, value: id })),
    );
  if (props.kind === "client" && step === 0)
    return optionalOptions((props.leads ?? []).map(({ id, name }) => ({ label: name, value: id })));
  if (props.kind === "engagement" && step === 0)
    return (props.clients ?? []).map(({ id, name }) => ({ label: name, value: id }));
  if (props.kind === "engagement" && step === 1)
    return optionalOptions(
      (props.projects ?? []).map(({ id, name }) => ({ label: name, value: id })),
    );
  if (isStatusStep(props.kind, step)) return statusOptions(props.kind);
  return undefined;
}

function isOwnerStep(kind: BusinessFormKind, step: number): boolean {
  return (
    (kind === "opportunity" && step === 6) ||
    (kind === "lead" && step === 8) ||
    (kind === "client" && step === 5) ||
    (kind === "engagement" && step === 6)
  );
}

function isStatusStep(kind: BusinessFormKind, step: number): boolean {
  return (
    (kind === "opportunity" && step === 5) ||
    (kind === "lead" && step === 7) ||
    (kind === "client" && step === 4) ||
    (kind === "engagement" && step === 3)
  );
}

function statusOptions(kind: BusinessFormKind): NamedOption[] {
  const values =
    kind === "opportunity"
      ? ["discovered", "researching", "validated", "rejected", "converted", "archived"]
      : kind === "lead"
        ? ["new", "qualified", "contacted", "nurturing", "won", "lost", "archived"]
        : kind === "client"
          ? ["prospect", "active", "paused", "former", "archived"]
          : ["proposed", "active", "paused", "completed", "cancelled", "archived"];
  return values.map((value) => ({ label: value, value }));
}

function optionalOptions(items: NamedOption[]): NamedOption[] {
  return [{ label: "None", value: "none" }, ...items];
}

function initialValues(kind: BusinessFormKind, initial?: BusinessRecord): string[] {
  if (!initial) {
    if (kind === "opportunity") return ["", "", "", "", "50", "discovered", "none", "none"];
    if (kind === "lead") return ["none", "", "", "none", "none", "", "50", "new", "none", "none"];
    if (kind === "client") return ["none", "", "", "none", "prospect", "none", "none"];
    return ["", "none", "", "proposed", "", "", "none", "none", "none"];
  }
  if (kind === "opportunity" && "hypothesis" in initial)
    return [
      initial.name,
      initial.source,
      initial.problem,
      initial.hypothesis,
      String(initial.score),
      initial.stage,
      optional(initial.ownerId),
      optionalList(initial.evidenceIds),
    ];
  if (kind === "lead" && "qualificationScore" in initial)
    return [
      optional(initial.opportunityId),
      initial.name,
      initial.organization,
      optional(initial.email),
      optional(initial.website),
      initial.source,
      String(initial.qualificationScore),
      initial.status,
      optional(initial.ownerId),
      initial.notes || "none",
    ];
  if (kind === "client" && "primaryContact" in initial)
    return [
      optional(initial.leadId),
      initial.name,
      initial.primaryContact,
      optional(initial.email),
      initial.status,
      optional(initial.ownerId),
      initial.notes || "none",
    ];
  const engagement = initial as EngagementRecord;
  return [
    engagement.clientId,
    optional(engagement.projectId),
    engagement.name,
    engagement.status,
    engagement.scope,
    optionalList(engagement.successCriteria),
    optional(engagement.ownerId),
    optional(engagement.startsAt),
    optional(engagement.endsAt),
  ];
}

function optional(value: string | null | undefined): string {
  return value?.trim() ? value : "none";
}
export function optionalValue(value: string | undefined): string | null {
  return value?.trim().toLowerCase() === "none" ? null : (value?.trim() ?? null);
}
export function listValue(value: string | undefined): string[] {
  if (value?.trim().toLowerCase() === "none") return [];
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
export function numberValue(value: string | undefined, label: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100)
    throw new Error(`${label} must be an integer from 0 to 100`);
  return number;
}
function optionalList(value: string[]): string {
  return value.length ? value.join(", ") : "none";
}
