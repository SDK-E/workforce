import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { ModelRecord } from "../../registries/registry-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Registry ID",
  "Engine (opencode or kilo)",
  "Model identifier",
  "Provider",
  "Priority (higher starts first)",
  "Capabilities (comma separated)",
  "Supported roles (comma separated)",
] as const;

export interface ModelFormInput {
  id: string;
  engine: ModelRecord["engine"];
  model: string;
  provider: string;
  priority: number;
  capabilities: string[];
  supportedRoles: string[];
}

export function ModelForm(props: {
  terminalWidth: number;
  initial?: ModelRecord;
  onCancel: () => void;
  onSubmit: (input: ModelFormInput) => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([
    props.initial?.id ?? "",
    props.initial?.engine ?? "opencode",
    props.initial?.model ?? "",
    props.initial?.provider ?? "",
    props.initial?.priority.toString() ?? "60",
    props.initial?.capabilities.join(", ") ?? "",
    props.initial?.supportedRoles.join(", ") ?? "general",
  ]);
  const confirming = step === FIELDS.length;
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (confirming && key.return) props.onSubmit(parse(values));
  });
  return (
    <FormFrame
      title={props.initial ? "Edit model registry entry" : "Configure model registry entry"}
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter save · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>Save model “{values[2]}” for controlled verification?</Text>
      ) : (
        <>
          <Text>{FIELDS[step]}</Text>
          <Box>
            <Text color="cyan">› </Text>
            <TextInput
              value={values[step] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === step ? value : item)),
                );
              }}
              onSubmit={() => {
                if (values[step]?.trim()) setStep((current) => current + 1);
              }}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function parse(values: string[]): ModelFormInput {
  const engine = values[1]?.trim();
  if (engine !== "opencode" && engine !== "kilo")
    throw new Error("Engine must be opencode or kilo");
  const priority = Number.parseInt(values[4] ?? "", 10);
  if (!Number.isInteger(priority)) throw new Error("Priority must be an integer");
  const id = values[0]?.trim() ?? "";
  const model = values[2]?.trim() ?? "";
  const provider = values[3]?.trim() ?? "";
  if (!id || !model || !provider)
    throw new Error("Registry ID, model identifier, and provider are required");
  return {
    id,
    engine,
    model,
    provider,
    priority,
    capabilities: split(values[5]),
    supportedRoles: split(values[6]),
  };
}

function split(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
