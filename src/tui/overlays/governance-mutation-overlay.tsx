import { useState } from "react";
import { Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import { GovernanceForm, type GovernanceFormKind } from "./governance-form.js";
import { FormFrame } from "./form-frame.js";
import { matchesKeybinding } from "../keybindings.js";

export function GovernanceMutationOverlay(props: {
  kind: GovernanceFormKind;
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  const [incidentKind, setIncidentKind] = useState<"incident" | "corrective" | null>(null);
  useInput((input, key) => {
    if (props.kind === "incident" && !incidentKind && matchesKeybinding("cancel", input, key))
      props.onClose();
  });
  if (props.kind === "incident" && !incidentKind)
    return (
      <FormFrame
        title="Create governance record"
        terminalWidth={props.terminalWidth}
        footer="Up/Down select · Enter choose · Esc cancel"
      >
        <Text>Choose the evidence-backed record to create.</Text>
        <SelectInput
          items={[
            { label: "Report incident", value: "incident" as const },
            { label: "Draft corrective action", value: "corrective" as const },
          ]}
          onSelect={(item) => {
            setIncidentKind(item.value);
          }}
        />
      </FormFrame>
    );
  return (
    <GovernanceForm
      kind={incidentKind ?? props.kind}
      employees={props.store.employees(props.company.id)}
      incidents={props.store.incidents.listIncidents(props.company.id)}
      terminalWidth={props.terminalWidth}
      onCancel={props.onClose}
      onSubmit={(result) => {
        props.finish(() => {
          if (result.kind === "incident")
            props.store.incidents.report({
              companyId: props.company.id,
              reporterId: "human",
              ...result,
            });
          else if (result.kind === "corrective")
            props.store.incidents.draftCorrective({
              companyId: props.company.id,
              issuedBy: "human",
              employeeId: result.employeeId,
              incidentId: result.incidentId,
              kind: result.correctiveKind,
              rationale: result.rationale,
              evidenceIds: result.evidenceIds,
            });
          else if (result.kind === "claim")
            props.store.performance.assertClaim({
              companyId: props.company.id,
              authorId: "human",
              ...result,
            });
          else
            props.store.performance.record({
              companyId: props.company.id,
              authorId: "human",
              employeeId: result.employeeId,
              kind: result.performanceKind,
              summary: result.summary,
              evidenceIds: result.evidenceIds,
            });
        }, `${result.kind} record persisted with evidence and audited`);
      }}
    />
  );
}
