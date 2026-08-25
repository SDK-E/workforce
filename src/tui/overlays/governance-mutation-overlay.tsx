import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import { GovernanceForm, type GovernanceFormKind } from "./governance-form.js";

export function GovernanceMutationOverlay(props: {
  kind: GovernanceFormKind;
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  return (
    <GovernanceForm
      kind={props.kind}
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
