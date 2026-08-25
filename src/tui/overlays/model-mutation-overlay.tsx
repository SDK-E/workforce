import type { ModelRecord } from "../../registries/registry-types.js";
import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { ModelForm, type ModelFormInput } from "./model-form.js";

export function ModelMutationOverlay(props: {
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  selectedTarget: LifecycleTarget | null;
  onDiscoverModels?: (engine: "opencode" | "kilo") => Promise<string[]>;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  const current =
    props.selectedTarget?.kind === "model"
      ? props.store.models.get(props.company.id, props.selectedTarget.id)
      : undefined;
  // First run: nothing registered yet, so onboarding asks only for the essentials.
  const minimal = !current && props.store.models.list(props.company.id).length === 0;
  return (
    <ModelForm
      terminalWidth={props.terminalWidth}
      {...(minimal ? { minimal: true } : {})}
      {...(props.onDiscoverModels ? { onDiscoverModels: props.onDiscoverModels } : {})}
      {...(current ? { initial: current } : {})}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(
          () => {
            props.store.models.save(modelRecord(props.company.id, input, current), "human");
          },
          `Model registry entry ${current ? "updated" : "configured"}; verify before execution`,
        );
      }}
    />
  );
}

function modelRecord(
  companyId: string,
  input: ModelFormInput,
  current: ModelRecord | undefined,
): Omit<ModelRecord, "updatedAt"> {
  const unchanged =
    current?.engine === input.engine &&
    current.model === input.model &&
    current.provider === input.provider;
  return {
    companyId,
    ...input,
    freePreferred: current?.freePreferred ?? false,
    localModel: current?.localModel ?? false,
    contextLimit: current?.contextLimit ?? null,
    health: unchanged ? current.health : "unknown",
    verifiedAt: unchanged ? current.verifiedAt : null,
    verificationReceiptId: unchanged ? current.verificationReceiptId : null,
    failureClass: unchanged ? current.failureClass : null,
  };
}
