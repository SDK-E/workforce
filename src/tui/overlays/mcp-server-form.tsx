import { randomUUID } from "node:crypto";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { McpServerRecord } from "../../integrations/integration-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Name",
  "Transport (stdio/http)",
  "Endpoint or argv command",
  "Allowed tools (comma separated)",
  "Secret environment names (comma separated)",
  "Credential bindings (target=SECRET, comma separated)",
] as const;

export function McpServerForm(props: {
  companyId: string;
  terminalWidth: number;
  onSubmit: (input: Omit<McpServerRecord, "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  initial?: McpServerRecord | undefined;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initialValues(props.initial));
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
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
      toolAllowlist: splitList(values[3]),
      secretRequirements: splitList(values[4]),
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
      footer={
        confirming
          ? "Enter confirm · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>Register {values[0]} as unverified until its health check passes?</Text>
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
                if (values[step]?.trim() || [4, 5].includes(step))
                  setStep((current) => current + 1);
              }}
            />
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

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitWords(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function parseBindings(value: string | undefined): { target: string; secretName: string }[] {
  return splitList(value).map((item) => {
    const separator = item.indexOf("=");
    return {
      target: separator < 0 ? item : item.slice(0, separator).trim(),
      secretName: separator < 0 ? item : item.slice(separator + 1).trim(),
    };
  });
}
