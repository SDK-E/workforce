import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type {
  ClientRecord,
  EngagementRecord,
  LeadRecord,
  OpportunityRecord,
} from "../../business/business-types.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

export type BusinessFormKind = "opportunity" | "lead" | "client" | "engagement";
type BusinessRecord = OpportunityRecord | LeadRecord | ClientRecord | EngagementRecord;

export function BusinessForm(props: {
  kind: BusinessFormKind;
  initial?: BusinessRecord;
  terminalWidth: number;
  onSubmit: (values: string[]) => void;
  onCancel: () => void;
}) {
  const fields = FIELDS[props.kind];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => initialValues(props.kind, props.initial));
  const confirming = step === fields.length;
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
          : `Enter next · Esc cancel · ${step + 1}/${fields.length}`
      }
    >
      {confirming ? (
        <Text>Persist this company-scoped {props.kind} record?</Text>
      ) : (
        <>
          <Text>{fields[step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[step] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === step ? value : item)),
                );
              }}
              onSubmit={() => {
                if ((values[step] ?? "").trim()) setStep((current) => current + 1);
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
    "Owner ID (or none)",
    "Evidence IDs (comma separated, or none)",
  ],
  lead: [
    "Opportunity ID (or none)",
    "Contact name",
    "Organization",
    "Email (or none)",
    "Website (or none)",
    "Source",
    "Qualification score (0-100)",
    "Status",
    "Owner ID (or none)",
    "Notes (or none)",
  ],
  client: [
    "Lead ID (or none)",
    "Client name",
    "Primary contact",
    "Email (or none)",
    "Status",
    "Owner ID (or none)",
    "Notes (or none)",
  ],
  engagement: [
    "Client ID",
    "Project ID (or none)",
    "Engagement name",
    "Status",
    "Scope",
    "Success criteria (comma separated)",
    "Owner ID (or none)",
    "Starts at ISO date (or none)",
    "Ends at ISO date (or none)",
  ],
};

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
