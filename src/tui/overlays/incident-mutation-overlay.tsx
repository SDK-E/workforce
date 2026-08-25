import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { CorrectiveDecisionForm } from "./corrective-decision-form.js";
import { IncidentDecisionForm } from "./incident-decision-form.js";

export function IncidentMutationOverlay(props: {
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  selectedTarget: LifecycleTarget | null;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  if (props.selectedTarget?.kind === "incident") {
    const current = props.store.incidents
      .listIncidents(props.company.id)
      .find(({ id }) => id === props.selectedTarget?.id);
    if (!current) return null;
    return (
      <IncidentDecisionForm
        incidentId={current.id}
        status={current.status}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(event) => {
          props.finish(() => {
            props.store.incidents.transition(props.company.id, current.id, event, "human");
          }, `Incident advanced through ${event.toLowerCase()} and audited`);
        }}
      />
    );
  }
  if (props.selectedTarget?.kind === "corrective") {
    const current = props.store.incidents
      .listCorrective(props.company.id)
      .find(({ id }) => id === props.selectedTarget?.id);
    if (!current) return null;
    return (
      <CorrectiveDecisionForm
        actionId={current.id}
        status={current.status}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(event) => {
          props.finish(() => {
            props.store.incidents.transitionCorrective(
              props.company.id,
              current.id,
              event,
              "human",
            );
          }, `Corrective action advanced through ${event.toLowerCase()} and audited`);
        }}
      />
    );
  }
  return null;
}
