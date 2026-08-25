import { randomUUID } from "node:crypto";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { EnvironmentRecord, ToolRecord } from "../../registries/registry-types.js";
import { matchesKeybinding } from "../keybindings.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { FormFrame } from "./form-frame.js";
import { NamedSelect } from "../components/named-select.js";
import { formFooter, isFieldBack, isFieldForward, useFormSteps } from "../use-form-steps.js";

type RegistryKind = "tool" | "environment";

const FIELDS: Record<RegistryKind, string[]> = {
  tool: [
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
  environments?: EnvironmentRecord[];
  onSubmit: (result: RegistryFormResult) => void;
  onCancel: () => void;
}) {
  const fields = FIELDS[props.kind];
  const steps = useFormSteps(fields.length);
  const [values, setValues] = useState(() => initialValues(props.kind, props.initial));
  const selectStep = !steps.confirming && props.kind === "tool" && [3, 4].includes(steps.step);
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (!steps.confirming && !selectStep && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function tryAdvance(): void {
    if (mayAdvance(steps.step, values[steps.step] ?? "", props.kind)) steps.advance();
    else steps.fail(`${fields[steps.step]} is required`);
  }
  function submit(): void {
    try {
      props.onSubmit(buildResult(props.companyId, props.kind, values, props.initial?.id));
    } catch (caught) {
      steps.fail(caught instanceof Error ? caught.message : "Invalid registry configuration");
      steps.goTo(0);
    }
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Configure"} ${props.kind}`}
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, fields.length, { selectStep })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.confirming ? (
        <Text>
          Save {props.kind} {props.kind === "tool" ? values[1] : values[0]} as unverified
          configuration?
        </Text>
      ) : selectStep && steps.step === 3 ? (
        <NamedSelect
          label="Risk"
          items={["low", "medium", "high", "critical"].map((value) => ({
            label: value,
            value,
          }))}
          value={values[steps.step] ?? ""}
          onSelect={(value) => {
            updateValue(setValues, steps.step, value);
            steps.advance();
          }}
        />
      ) : selectStep && steps.step === 4 ? (
        <NamedSelect
          label="Required environment (optional)"
          items={[
            { label: "No required environment", value: "" },
            ...(props.environments ?? []).map(({ id, name }) => ({ label: name, value: id })),
          ]}
          value={values[steps.step] ?? ""}
          onSelect={(value) => {
            updateValue(setValues, steps.step, value);
            steps.advance();
          }}
        />
      ) : (
        <>
          <Text>{fields[steps.step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[steps.step] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === steps.step ? value : item)),
                );
                steps.fail("");
              }}
              onSubmit={tryAdvance}
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

function buildResult(
  companyId: string,
  kind: RegistryKind,
  values: string[],
  existingId?: string,
): RegistryFormResult {
  if (kind === "tool")
    return {
      kind,
      record: {
        companyId,
        id: existingId ?? randomUUID(),
        version: required(values[0], "Version"),
        provider: required(values[1], "Provider"),
        capabilities: list(values[2]),
        risk: risk(values[3]),
        inputSchema: {},
        outputSchema: {},
        requiredEnvironment: values[4]?.trim() ? values[4].trim() : null,
        networkPolicy: object(values[5]),
        secretRequirements: list(values[6]),
        sandboxProfiles: list(values[7]),
        permissionPolicy: {},
        health: "unknown",
        testReceiptId: null,
        auditBehavior: required(values[8], "Audit behavior"),
      },
    };
  return {
    kind,
    record: {
      companyId,
      id: existingId ?? randomUUID(),
      name: required(values[0], "Name"),
      sandboxImage: required(values[1], "Sandbox image"),
      runtime: object(values[2]),
      buildToolchain: list(values[3]),
      browser: object(values[4]),
      networkPolicy: object(values[5]),
      inputContract: {},
      secretsPolicy: object(values[6]),
      resourcePolicy: object(values[7]),
      outputContract: {},
      cleanupPolicy: {},
      supportedProfiles: list(values[8]),
      health: "unknown",
      healthReceiptId: null,
    },
  };
}

function mayAdvance(step: number, value: string, kind: RegistryKind): boolean {
  return (
    value.trim().length > 0 ||
    (kind === "tool" && [2, 4, 6].includes(step)) ||
    (kind === "environment" && [3].includes(step))
  );
}

function updateValue(
  setter: Dispatch<SetStateAction<string[]>>,
  step: number,
  value: string,
): void {
  setter((current) => current.map((item, index) => (index === step ? value : item)));
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
