import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { RegistryForm } from "./registry-form.js";

export function RegistryMutationOverlay(props: {
  kind: "tool" | "environment";
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  selectedTarget: LifecycleTarget | null;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  const initial =
    props.kind === "tool" && props.selectedTarget?.kind === "tool"
      ? props.store.tools.get(props.company.id, props.selectedTarget.id)
      : props.kind === "environment" && props.selectedTarget?.kind === "environment"
        ? props.store.environments
            .list(props.company.id)
            .find(({ id }) => id === props.selectedTarget?.id)
        : undefined;
  return (
    <RegistryForm
      companyId={props.company.id}
      kind={props.kind}
      terminalWidth={props.terminalWidth}
      {...(initial ? { initial } : {})}
      onCancel={props.onClose}
      onSubmit={(result) => {
        props.finish(() => {
          if (result.kind === "tool") props.store.tools.save(result.record, "human");
          else props.store.environments.save(result.record, "human");
        }, `${props.kind} registry configuration saved as unverified and audited`);
      }}
    />
  );
}
