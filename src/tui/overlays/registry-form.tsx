import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { EnvironmentRecord, ToolRecord } from "../../registries/registry-types.js";
import { matchesKeybinding } from "../keybindings.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { FormFrame } from "./form-frame.js";

type RegistryKind = "tool" | "environment";

const FIELDS: Record<RegistryKind, string[]> = {
  tool: [
    "ID",
    "Version",
    "Provider",
    "Capabilities (comma separated)",
    "Risk (low, medium, high, critical)",
    "Required environment (blank for none)",
    "Network policy (JSON object)",
    "Secret names (comma separated)",
    "Sandbox profiles (comma separated)",
    "Audit behavior",
  ],
  environment: [
    "ID",
    "Name",
    "Sandbox image",
    "Runtime (JSON object)",
    "Build toolchain (comma separated)",
    "Browser configuration (JSON object)",
    "Network policy (JSON object)",
    "Secrets policy (JSON object)",
    "Resource policy (JSON object)",
    "Supported profiles (comma separated)",
  ],
};

export type RegistryFormResult =
  | { kind: "tool"; record: Omit<ToolRecord, "updatedAt"> }
  | { kind: "environment"; record: Omit<EnvironmentRecord, "updatedAt"> };

export function RegistryForm(props: {
  companyId: string;
  kind: RegistryKind;
  terminalWidth: number;
  initial?: ToolRecord | EnvironmentRecord;
  onSubmit: (result: RegistryFormResult) => void;
  onCancel: () => void;
}) {
  const fields = FIELDS[props.kind];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => initialValues(props.kind, props.initial));
  const [error, setError] = useState("");
  const confirming = step === fields.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    try {
      props.onSubmit(buildResult(props.companyId, props.kind, values));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invalid registry configuration");
      setStep(0);
    }
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Configure"} ${props.kind}`}
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter save and audit · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${fields.length}`
      }
    >
      {error && <Text color="red">{error}</Text>}
      {confirming ? (
        <Text>
          Save {props.kind} {values[0]} as unverified configuration?
        </Text>
      ) : (
        <>
          <Text>{fields[step]}</Text>
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
                if (mayAdvance(step, values[step] ?? "", props.kind))
                  setStep((current) => current + 1);
              }}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function initialValues(kind: RegistryKind, initial?: ToolRecord | EnvironmentRecord): string[] {
  if (!initial)
    return kind === "tool"
      ? [
          "",
          "1.0.0",
          "",
          "",
          "medium",
          "",
          '{"mode":"inference-only"}',
          "",
          "engineering",
          "Log every invocation",
        ]
      : [
          "",
          "",
          "workforce-agent:0.1.0",
          "{}",
          "",
          "{}",
          '{"mode":"audited-internet"}',
          "{}",
          "{}",
          "engineering",
        ];
  if (kind === "tool" && "provider" in initial)
    return [
      initial.id,
      initial.version,
      initial.provider,
      csv(initial.capabilities),
      initial.risk,
      initial.requiredEnvironment ?? "",
      JSON.stringify(initial.networkPolicy),
      csv(initial.secretRequirements),
      csv(initial.sandboxProfiles),
      initial.auditBehavior,
    ];
  const environment = initial as EnvironmentRecord;
  return [
    environment.id,
    environment.name,
    environment.sandboxImage,
    JSON.stringify(environment.runtime),
    csv(environment.buildToolchain),
    JSON.stringify(environment.browser),
    JSON.stringify(environment.networkPolicy),
    JSON.stringify(environment.secretsPolicy),
    JSON.stringify(environment.resourcePolicy),
    csv(environment.supportedProfiles),
  ];
}

function buildResult(companyId: string, kind: RegistryKind, values: string[]): RegistryFormResult {
  if (kind === "tool")
    return {
      kind,
      record: {
        companyId,
        id: required(values[0], "ID"),
        version: required(values[1], "Version"),
        provider: required(values[2], "Provider"),
        capabilities: list(values[3]),
        risk: risk(values[4]),
        inputSchema: {},
        outputSchema: {},
        requiredEnvironment: values[5]?.trim() ? values[5].trim() : null,
        networkPolicy: object(values[6]),
        secretRequirements: list(values[7]),
        sandboxProfiles: list(values[8]),
        permissionPolicy: {},
        health: "unknown",
        testReceiptId: null,
        auditBehavior: required(values[9], "Audit behavior"),
      },
    };
  return {
    kind,
    record: {
      companyId,
      id: required(values[0], "ID"),
      name: required(values[1], "Name"),
      sandboxImage: required(values[2], "Sandbox image"),
      runtime: object(values[3]),
      buildToolchain: list(values[4]),
      browser: object(values[5]),
      networkPolicy: object(values[6]),
      inputContract: {},
      secretsPolicy: object(values[7]),
      resourcePolicy: object(values[8]),
      outputContract: {},
      cleanupPolicy: {},
      supportedProfiles: list(values[9]),
      health: "unknown",
      healthReceiptId: null,
    },
  };
}

function mayAdvance(step: number, value: string, kind: RegistryKind): boolean {
  return (
    value.trim().length > 0 ||
    (kind === "tool" && [3, 5, 7].includes(step)) ||
    (kind === "environment" && [4].includes(step))
  );
}
function object(value: string | undefined): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value ?? "{}");
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
    throw new Error("Expected a JSON object");
  return parsed as Record<string, unknown>;
}
function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
function csv(values: string[]): string {
  return values.join(", ");
}
function required(value: string | undefined, label: string): string {
  const result = value?.trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
}
function risk(value: string | undefined): ToolRecord["risk"] {
  if (!(["low", "medium", "high", "critical"] as const).some((item) => item === value))
    throw new Error("Risk must be low, medium, high, or critical");
  return value as ToolRecord["risk"];
}
