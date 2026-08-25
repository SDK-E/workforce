import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { ProjectIntegrationRecord } from "../../integrations/integration-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = ["Project ID", "Provider (for example beads)", "Configuration JSON", "Secret names"];

export function ProjectIntegrationForm(props: {
  companyId: string;
  terminalWidth: number;
  onSubmit: (input: Omit<ProjectIntegrationRecord, "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  initial?: ProjectIntegrationRecord | undefined;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(
    props.initial
      ? [
          props.initial.projectId,
          props.initial.provider,
          JSON.stringify(props.initial.config),
          props.initial.secretRequirements.join(", "),
        ]
      : ["", "beads", "{}", ""],
  );
  const [error, setError] = useState("");
  const confirming = step === FIELDS.length;
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (confirming && key.return) submit();
  });
  function submit(): void {
    try {
      const config = JSON.parse(values[2] ?? "{}") as unknown;
      if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error();
      props.onSubmit({
        companyId: props.companyId,
        projectId: props.initial?.projectId ?? values[0]?.trim() ?? "",
        provider: props.initial?.provider ?? values[1]?.trim() ?? "",
        config: config as Record<string, unknown>,
        secretRequirements: splitList(values[3]),
        status: props.initial?.status ?? "active",
      });
    } catch {
      setError("Configuration must be a JSON object");
    }
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Configure"} project integration`}
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter confirm · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {error && <Text color="red">{error}</Text>}
      {confirming ? (
        <Text>
          Activate {values[1]} only for project {values[0]}?
        </Text>
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
                setStep((current) => current + 1);
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
