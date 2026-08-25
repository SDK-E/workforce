import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { AutomationDecisionForm } from "./automation-decision-form.js";
import { AutomationForm } from "./automation-form.js";

export function AutomationMutationOverlay(props: {
  kind: "automation" | "automation-decision";
  company: CompanyRecord;
  store: StateStore;
  selectedTarget: LifecycleTarget | null;
  terminalWidth: number;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  if (props.kind === "automation")
    return (
      <AutomationForm
        companyId={props.company.id}
        employees={props.store.employees(props.company.id)}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          props.finish(() => {
            props.store.automations.propose(input);
          }, "Automation proposed for governed approval");
        }}
      />
    );
  if (props.selectedTarget?.kind !== "automation") return null;
  const automationId = props.selectedTarget.id;
  return (
    <AutomationDecisionForm
      automationId={automationId}
      terminalWidth={props.terminalWidth}
      onCancel={props.onClose}
      onSubmit={(decision, rationale) => {
        props.finish(() => {
          props.store.automations.decide(
            props.company.id,
            automationId,
            decision,
            "human",
            rationale,
          );
        }, `Automation ${decision} and audited`);
      }}
    />
  );
}
