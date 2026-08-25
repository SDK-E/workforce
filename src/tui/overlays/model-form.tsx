import { randomUUID } from "node:crypto";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { ModelRecord } from "../../registries/registry-types.js";
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

/** Steps whose Enter accepts an empty value. */
const OPTIONAL_STEPS = [4, 6];

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
  initial?: ModelRecord;
  onCancel: () => void;
  onSubmit: (input: ModelFormInput) => void;
}) {
  const steps = useFormSteps(FIELDS.length);
  const [values, setValues] = useState([
    props.initial?.engine ?? "opencode",
    props.initial?.model ?? "",
    props.initial?.provider ?? "",
    props.initial?.priority.toString() ?? "60",
    props.initial?.capabilities.join(", ") ?? "",
    props.initial?.supportedRoles.join(", ") ?? "general",
    props.initial?.secretRequirements.join(", ") ?? "",
  ]);
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === steps.step ? value : item)));
  };
  const tryAdvance = (): void => {
    if ((values[steps.step] ?? "").trim() || OPTIONAL_STEPS.includes(steps.step)) steps.advance();
    else steps.fail(`${FIELDS[steps.step]} is required`);
  };
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, false)) steps.retreat();
    if (!steps.confirming && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key))
      props.onSubmit(parse(values, props.initial?.id));
  });
  return (
    <FormFrame
      title={props.initial ? "Edit model registry entry" : "Configure model registry entry"}
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, FIELDS.length)}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.confirming ? (
        <Text>Save model “{values[1]}” for controlled verification?</Text>
      ) : (
        <>
          <Text>{FIELDS[steps.step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput value={values[steps.step] ?? ""} onChange={updateAt} onSubmit={tryAdvance} />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function parse(values: string[], existingId?: string): ModelFormInput {
  const engine = values[0]?.trim();
  if (engine !== "opencode" && engine !== "kilo")
    throw new Error("Engine must be opencode or kilo");
  const priority = Number.parseInt(values[3] ?? "", 10);
  if (!Number.isInteger(priority)) throw new Error("Priority must be an integer");
  const model = values[1]?.trim() ?? "";
  const provider = values[2]?.trim() ?? "";
  if (!model || !provider) throw new Error("Model identifier and provider are required");
  return {
    id: existingId ?? randomUUID(),
    engine,
    model,
    provider,
    priority,
    capabilities: splitList(values[4]),
    supportedRoles: splitList(values[5]),
    secretRequirements: splitList(values[6]),
  };
}
