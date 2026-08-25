import { randomUUID } from "node:crypto";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { bindingsFor, matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { ModelRecord } from "../../registries/registry-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Engine (opencode or kilo)",
  "Model identifier",
  "Provider",
  "Priority (higher starts first)",
  "Capabilities (comma separated)",
  "Supported roles (comma separated)",
  "Required secret names (comma separated)",
] as const;

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
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([
    props.initial?.engine ?? "opencode",
    props.initial?.model ?? "",
    props.initial?.provider ?? "",
    props.initial?.priority.toString() ?? "60",
    props.initial?.capabilities.join(", ") ?? "",
    props.initial?.supportedRoles.join(", ") ?? "general",
    props.initial?.secretRequirements.join(", ") ?? "",
  ]);
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key))
      props.onSubmit(parse(values, props.initial?.id));
  });
  return (
    <FormFrame
      title={props.initial ? "Edit model registry entry" : "Configure model registry entry"}
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? `${bindingsFor("activate")} save · ${bindingsFor("cancel")} cancel`
          : `${bindingsFor("activate")} next · ${bindingsFor("cancel")} cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>Save model “{values[1]}” for controlled verification?</Text>
      ) : (
        <>
          <Text>{FIELDS[step]}</Text>
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
                if (values[step]?.trim() || [4, 6].includes(step))
                  setStep((current) => current + 1);
              }}
            />
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
    capabilities: split(values[4]),
    supportedRoles: split(values[5]),
    secretRequirements: split(values[6]),
  };
}

function split(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
