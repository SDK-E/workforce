import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { McpServerRecord } from "../../integrations/integration-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Server ID",
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
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(["", "", "http", "", "", "", ""]);
  const confirming = step === FIELDS.length;
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (confirming && key.return) submit();
  });
  function submit(): void {
    const transport = values[2] === "stdio" ? "stdio" : "http";
    const target = values[3]?.trim() ?? "";
    props.onSubmit({
      companyId: props.companyId,
      id: values[0]?.trim() ?? "",
      name: values[1]?.trim() ?? "",
      transport,
      endpoint: transport === "stdio" ? null : target,
      command: transport === "stdio" ? splitWords(target) : [],
      toolAllowlist: splitList(values[4]),
      secretRequirements: splitList(values[5]),
      credentialBindings: parseBindings(values[6]),
      status: "active",
      health: "unknown",
      healthReceiptId: null,
    });
  }
  return (
    <FormFrame
      title="Register MCP server"
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter confirm · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>Register {values[1]} as unverified until its health check passes?</Text>
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
