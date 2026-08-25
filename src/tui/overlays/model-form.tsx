import { randomUUID } from "node:crypto";
import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { NamedSelect } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { bindingsFor, matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { ModelRecord } from "../../registries/registry-types.js";
import { providerForIdentity } from "../../engines/model-catalog.js";
import { FormFrame } from "./form-frame.js";
import {
  formFooter,
  isFieldBack,
  isFieldForward,
  splitList,
  useFormSteps,
} from "../use-form-steps.js";

const FIELDS = [
  "Engine (opencode or kilo)",
  "Model identifier",
  "Provider",
  "Priority (higher starts first)",
  "Capabilities (comma separated, optional)",
  "Supported roles (comma separated)",
  "Required secret names (optional)",
] as const;

/** Fields shown before the operator expands the advanced registry surface. */
const ESSENTIAL_FIELDS = 3;

/** Steps whose Enter accepts an empty value. */
const OPTIONAL_STEPS = [4, 6];

/** Defaults applied when the first-run form finishes without expanding advanced fields. */
const FIRST_RUN_DEFAULTS = ["60", "", "general", ""];

type CatalogState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; models: string[] }
  | { status: "unavailable"; reason: string };

export interface ModelFormInput {
  id: string;
  engine: ModelRecord["engine"];
  model: string;
  provider: string;
  priority: number;
  capabilities: string[];
  supportedRoles: string[];
  secretRequirements: string[];
}

export function ModelForm(props: {
  terminalWidth: number;
  /** First-run mode: only essential fields until the operator explicitly asks for advanced ones. */
  minimal?: boolean;
  /** Runs `<engine> models` inside the agent image and returns usable provider/model ids. */
  onDiscoverModels?: (engine: ModelRecord["engine"]) => Promise<string[]>;
  initial?: ModelRecord;
  onCancel: () => void;
  onSubmit: (input: ModelFormInput) => void;
}) {
  const [expanded, setExpanded] = useState(!props.minimal);
  const fieldCount = expanded ? FIELDS.length : ESSENTIAL_FIELDS;
  const steps = useFormSteps(fieldCount);
  const [values, setValues] = useState([
    props.initial?.engine ?? "opencode",
    props.initial?.model ?? "",
    props.initial?.provider ?? "",
    props.initial?.priority.toString() ?? "60",
    props.initial?.capabilities.join(", ") ?? "",
    props.initial?.supportedRoles.join(", ") ?? "general",
    props.initial?.secretRequirements.join(", ") ?? "",
  ]);
  const [catalog, setCatalog] = useState<CatalogState>({ status: "idle" });
  const [manualModel, setManualModel] = useState(Boolean(props.initial));
  const engineValue = values[0]?.trim();
  const discoveryEngine =
    engineValue === "opencode" || engineValue === "kilo" ? engineValue : undefined;
  const discoverable = props.onDiscoverModels !== undefined && discoveryEngine !== undefined;
  useEffect(() => {
    if (steps.step !== 1 || !discoverable || catalog.status !== "idle") return;
    let cancelled = false;
    setCatalog({ status: "loading" });
    props
      .onDiscoverModels?.(discoveryEngine)
      .then((models) => {
        if (!cancelled)
          setCatalog(
            models.length > 0
              ? { status: "ready", models }
              : { status: "unavailable", reason: "no models reported" },
          );
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setCatalog({
            status: "unavailable",
            reason: error instanceof Error ? error.message : "discovery failed",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [steps.step, discoverable, catalog.status]);
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === steps.step ? value : item)));
  };
  const tryAdvance = (): void => {
    if ((values[steps.step] ?? "").trim() || OPTIONAL_STEPS.includes(steps.step)) steps.advance();
    else steps.fail(`${FIELDS[steps.step]} is required`);
  };
  // While the discovered-model list is shown, ink-select owns ↑/↓/Enter; ← still goes back.
  const modelSelectActive =
    !steps.confirming && steps.step === 1 && !manualModel && catalog.status === "ready";
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (!expanded && matchesKeybinding("showAdvanced", input, key)) {
      setExpanded(true);
      return;
    }
    if (isFieldBack(input, key, modelSelectActive)) steps.retreat();
    if (!steps.confirming && !modelSelectActive && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key))
      props.onSubmit(parseModelInput(values, expanded, props.initial?.id));
  });
  return (
    <FormFrame
      title={props.initial ? "Edit model registry entry" : "Configure model registry entry"}
      terminalWidth={props.terminalWidth}
      footer={
        expanded
          ? formFooter(steps.confirming, steps.step, FIELDS.length, {
              selectStep: modelSelectActive,
            })
          : `${formFooter(steps.confirming, steps.step, fieldCount, {
              selectStep: modelSelectActive,
            })} · ${bindingsFor("showAdvanced")} advanced fields`
      }
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.confirming ? (
        <Text>Save model “{values[1]}” for controlled verification?</Text>
      ) : (
        <>
          {!expanded && (
            <Text dimColor>Essential setup — ctrl+a opens priority, roles, and secrets</Text>
          )}
          <Text>{FIELDS[steps.step]}</Text>
          {modelSelectActive ? (
            <NamedSelect
              label={`Discovered ${engineValue} models — pick one or choose manual entry`}
              items={[
                ...catalog.models.map((model) => ({ label: model, value: model })),
                { label: "Type manually…", value: "__manual__" },
              ]}
              onSelect={(value) => {
                if (value === "__manual__") {
                  setManualModel(true);
                  return;
                }
                if (!discoveryEngine) return;
                setValues((current) =>
                  current.map((item, index) =>
                    index === 1
                      ? value
                      : index === 2 && !current[2]?.trim()
                        ? providerForIdentity(discoveryEngine, value)
                        : item,
                  ),
                );
                steps.advance();
              }}
            />
          ) : steps.step === 1 && catalog.status === "loading" ? (
            <>
              <Text dimColor>Discovering models from {engineValue} inside the agent image…</Text>
              <ModelInputStep {...{ values, steps, updateAt, tryAdvance }} />
            </>
          ) : (
            <ModelInputStep {...{ values, steps, updateAt, tryAdvance }} />
          )}
          {steps.step === 1 && catalog.status === "unavailable" && (
            <Text dimColor>
              Discovery unavailable ({catalog.reason}) — enter the identifier manually
            </Text>
          )}
        </>
      )}
    </FormFrame>
  );
}

function ModelInputStep(props: {
  values: string[];
  steps: ReturnType<typeof useFormSteps>;
  updateAt: (value: string) => void;
  tryAdvance: () => void;
}) {
  return (
    <Box>
      <PromptMarker />
      <TextInput
        value={props.values[props.steps.step] ?? ""}
        onChange={props.updateAt}
        onSubmit={props.tryAdvance}
      />
    </Box>
  );
}

export function parseModelInput(
  values: string[],
  expanded: boolean,
  existingId?: string,
): ModelFormInput {
  const complete = expanded
    ? values
    : [...values.slice(0, ESSENTIAL_FIELDS), ...FIRST_RUN_DEFAULTS];
  const engine = complete[0]?.trim();
  if (engine !== "opencode" && engine !== "kilo")
    throw new Error("Engine must be opencode or kilo");
  const priority = Number.parseInt(complete[3] ?? "", 10);
  if (!Number.isInteger(priority)) throw new Error("Priority must be an integer");
  const model = complete[1]?.trim() ?? "";
  const provider = complete[2]?.trim() ?? "";
  if (!model || !provider) throw new Error("Model identifier and provider are required");
  return {
    id: existingId ?? randomUUID(),
    engine,
    model,
    provider,
    priority,
    capabilities: splitList(complete[4]),
    supportedRoles: splitList(complete[5]),
    secretRequirements: splitList(complete[6]),
  };
}
