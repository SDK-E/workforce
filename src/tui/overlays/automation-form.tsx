import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { ProposeAutomationInput } from "../../automations/automation-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Requester agent ID",
  "Title",
  "Cron schedule (UTC)",
  "Task objective",
  "Acceptance criteria (comma separated)",
  "Assignee agent ID",
  "Rationale",
  "Estimated agent runs saved",
];

export function AutomationForm(props: {
  companyId: string;
  terminalWidth: number;
  onSubmit: (input: ProposeAutomationInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(["ceo", "", "0 8 * * *", "", "", "ceo", "", "1"]);
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      requestedBy: values[0]?.trim() ?? "",
      title: values[1]?.trim() ?? "",
      trigger: { kind: "cron", expression: values[2]?.trim() ?? "", timezone: "UTC" },
      action: {
        kind: "task",
        objective: values[3]?.trim() ?? "",
        acceptanceCriteria: splitList(values[4]),
        assigneeId: values[5]?.trim() ?? "ceo",
      },
      rationale: values[6]?.trim() ?? "",
      estimatedRunsSaved: Number(values[7]),
    });
  }
  return (
    <FormFrame
      title="Propose automation"
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter propose · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>Submit {values[1]} for governed approval?</Text>
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
