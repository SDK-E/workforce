import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { ProposeAutomationInput } from "../../automations/automation-types.js";
import type { Employee } from "../../domain.js";
import { NamedSelect } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Title",
  "Cron schedule (UTC)",
  "Task objective",
  "Acceptance criteria (comma separated)",
  "Assignee",
  "Rationale",
] as const;

export function AutomationForm(props: {
  companyId: string;
  employees?: Employee[];
  terminalWidth: number;
  onSubmit: (input: ProposeAutomationInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(["", "0 8 * * *", "", "", "ceo", ""]);
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      requestedBy: "ceo",
      title: values[0]?.trim() ?? "",
      trigger: { kind: "cron", expression: values[1]?.trim() ?? "", timezone: "UTC" },
      action: {
        kind: "task",
        objective: values[2]?.trim() ?? "",
        acceptanceCriteria: splitList(values[3]),
        assigneeId: values[4]?.trim() ?? "ceo",
      },
      rationale: values[5]?.trim() ?? "",
      estimatedRunsSaved: 1,
    });
  }
  const assignees = (props.employees ?? [])
    .filter(({ status }) => status !== "terminated")
    .map((employee) => ({ label: `${employee.name} — ${employee.title}`, value: employee.id }));
  return (
    <FormFrame
      title="Propose automation"
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter propose · Esc cancel"
          : `Enter/select next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>Submit {values[0]} for governed approval?</Text>
      ) : step === 4 ? (
        <NamedSelect
          label={FIELDS[step]}
          items={assignees}
          value={values[step] ?? ""}
          onSelect={(value) => {
            setValue(setValues, step, value);
            setStep((current) => current + 1);
          }}
        />
      ) : (
        <>
          <Text>{FIELDS[step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[step] ?? ""}
              onChange={(value) => {
                setValue(setValues, step, value);
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

function setValue(setter: Dispatch<SetStateAction<string[]>>, step: number, value: string): void {
  setter((current) => current.map((item, index) => (index === step ? value : item)));
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
