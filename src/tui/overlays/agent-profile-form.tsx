import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { UpdateAgentInstructionsInput } from "../../employees/agent-profile-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
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
  employeeId: string;
  terminalWidth: number;
  onSubmit: (input: UpdateAgentInstructionsInput) => void;
  onCancel: () => void;
  initial?: UpdateAgentInstructionsInput | undefined;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => initialValues(props.initial));
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function advance(): void {
    if (!values[step]?.trim()) return;
    setStep((current) => current + 1);
  }
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      employeeId: props.employeeId,
      personaName: values[0]?.trim() ?? "",
      identitySummary: values[1]?.trim() ?? "",
      communicationStyle: values[2]?.trim() ?? "",
      autonomyPolicy: { mode: "task-scoped", consequentialActionsRequireApproval: true },
      systemPrompt: values[3]?.trim() ?? "",
      instructions: split(values[4]),
      constraints: split(values[5]),
      contextSources: ["company-policy", "employee-role", "task-requirements", "relevant-chat"],
      modelPolicy: { selection: "task-and-role-specific", hiddenSwitching: false },
      changedBy: "human",
      changeReason: values[6]?.trim() ?? "",
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
          Activate a new instruction revision for the selected employee? Prior revisions remain
          preserved.
        </Text>
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
              onSubmit={advance}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function initialValues(initial?: UpdateAgentInstructionsInput): string[] {
  if (!initial) return FIELDS.map(() => "");
  return [
    initial.personaName,
    initial.identitySummary,
    initial.communicationStyle,
    initial.systemPrompt,
    initial.instructions.join(", "),
    initial.constraints.join(", "),
    "Update selected employee persona and instructions",
  ];
}

function split(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
