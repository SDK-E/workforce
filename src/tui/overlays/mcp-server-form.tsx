import { randomUUID } from "node:crypto";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { McpServerRecord } from "../../integrations/integration-types.js";
import { FormFrame } from "./form-frame.js";
import {
  formFooter,
  isFieldBack,
  isFieldForward,
  splitList as list,
  useFormSteps,
} from "../use-form-steps.js";

const FIELDS = [
  "Name",
  "Transport (stdio/http)",
  "Endpoint or argv command",
  "Allowed tools (comma separated)",
  "Secret environment names (optional, comma separated)",
  "Credential bindings (target=SECRET, optional, comma separated)",
] as const;

/** Steps whose Enter accepts an empty value. */
const OPTIONAL_STEPS = [4, 5];

export function McpServerForm(props: {
  companyId: string;
  terminalWidth: number;
  onSubmit: (input: Omit<McpServerRecord, "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  initial?: McpServerRecord | undefined;
}) {
  const steps = useFormSteps(FIELDS.length);
  const [values, setValues] = useState(initialValues(props.initial));
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === steps.step ? value : item)));
    steps.fail("");
  };
  const tryAdvance = (): void => {
    const label = FIELDS[steps.step] ?? "";
    if ((values[steps.step] ?? "").trim() || OPTIONAL_STEPS.includes(steps.step)) steps.advance();
    else steps.fail(`${label.split(" (")[0]} is required`);
  };
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, false)) steps.retreat();
    if (!steps.confirming && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    const transport = values[1] === "stdio" ? "stdio" : "http";
    const target = values[2]?.trim() ?? "";
    props.onSubmit({
      companyId: props.companyId,
      id: props.initial?.id ?? randomUUID(),
      name: values[0]?.trim() ?? "",
      transport,
      endpoint: transport === "stdio" ? null : target,
      command: transport === "stdio" ? splitWords(target) : [],
      toolAllowlist: list(values[3]),
      secretRequirements: list(values[4]),
      credentialBindings: parseBindings(values[5]),
      status: props.initial?.status ?? "active",
      health: props.initial?.health ?? "unknown",
      healthReceiptId: props.initial?.healthReceiptId ?? null,
    });
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Register"} MCP server`}
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, FIELDS.length)}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.confirming ? (
        <Text>Register {values[0]} as unverified until its health check passes?</Text>
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

function initialValues(initial?: McpServerRecord): string[] {
  if (!initial) return ["", "http", "", "", "", ""];
  return [
    initial.name,
    initial.transport,
    initial.transport === "stdio" ? initial.command.join(" ") : (initial.endpoint ?? ""),
    initial.toolAllowlist.join(", "),
    initial.secretRequirements.join(", "),
    initial.credentialBindings
      .map(({ target, secretName }) => `${target}=${secretName}`)
      .join(", "),
  ];
}

function splitWords(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function parseBindings(value: string | undefined): { target: string; secretName: string }[] {
  return list(value).map((item) => {
    const separator = item.indexOf("=");
    return {
      target: separator < 0 ? item : item.slice(0, separator).trim(),
      secretName: separator < 0 ? item : item.slice(separator + 1).trim(),
    };
  });
}
