import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { UpdateAgentInstructionsInput } from "../../employees/agent-profile-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Employee ID",
  "Persona name",
  "Identity summary",
  "Communication style",
  "System prompt",
  "Instructions (comma separated)",
  "Constraints (comma separated)",
  "Change rationale",
] as const;

export function AgentProfileForm(props: {
  companyId: string;
  terminalWidth: number;
  onSubmit: (input: UpdateAgentInstructionsInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(FIELDS.map(() => ""));
  const confirming = step === FIELDS.length;
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (confirming && key.return) submit();
  });
  function advance(): void {
    if (!values[step]?.trim()) return;
    setStep((current) => current + 1);
  }
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      employeeId: values[0]?.trim() ?? "",
      personaName: values[1]?.trim() ?? "",
      identitySummary: values[2]?.trim() ?? "",
      communicationStyle: values[3]?.trim() ?? "",
      autonomyPolicy: { mode: "task-scoped", consequentialActionsRequireApproval: true },
      systemPrompt: values[4]?.trim() ?? "",
      instructions: split(values[5]),
      constraints: split(values[6]),
      contextSources: ["company-policy", "employee-role", "task-requirements", "relevant-chat"],
      modelPolicy: { selection: "task-and-role-specific", hiddenSwitching: false },
      changedBy: "human",
      changeReason: values[7]?.trim() ?? "",
    });
  }
  return (
    <FormFrame
      title="Version agent identity and instructions"
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter confirm · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>
          Activate a new instruction revision for {values[0]}? Prior revisions remain preserved.
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
              onSubmit={advance}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function split(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
