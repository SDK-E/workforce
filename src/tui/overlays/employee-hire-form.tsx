import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Role objective",
  "Capabilities (language:python, browser, git, public-internet, build:pnpm)",
  "Probation acceptance criteria (comma separated)",
] as const;

export interface EmployeeHireInput {
  objective: string;
  capabilities: string[];
  acceptanceCriteria: string[];
}

export function EmployeeHireForm(props: {
  terminalWidth: number;
  onSubmit: (input: EmployeeHireInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(["", "", ""]);
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    props.onSubmit({
      objective: values[0]?.trim() ?? "",
      capabilities: split(values[1]),
      acceptanceCriteria: split(values[2]),
    });
  }
  return (
    <FormFrame
      title="Hire probationary agent"
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter approve hire · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>Approve an audited probationary hire for “{values[0]}”?</Text>
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

function split(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
