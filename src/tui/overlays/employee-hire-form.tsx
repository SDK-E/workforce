import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import { FormFrame } from "./form-frame.js";
import {
  formFooter,
  isFieldBack,
  isFieldForward,
  splitList,
  useFormSteps,
} from "../use-form-steps.js";

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
  const steps = useFormSteps(FIELDS.length);
  const [values, setValues] = useState(["", "", ""]);
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === steps.step ? value : item)));
    steps.fail("");
  };
  const tryAdvance = (): void => {
    const label = FIELDS[steps.step] ?? "";
    if (values[steps.step]?.trim()) steps.advance();
    else steps.fail(`${label.split(" (")[0]} is required`);
  };
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, false)) steps.retreat();
    if (!steps.confirming && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    props.onSubmit({
      objective: values[0]?.trim() ?? "",
      capabilities: splitList(values[1]),
      acceptanceCriteria: splitList(values[2]),
    });
  }
  return (
    <FormFrame
      title="Hire probationary agent"
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, FIELDS.length)}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.confirming ? (
        <Text>Approve an audited probationary hire for “{values[0]}”?</Text>
      ) : (
        <>
          <Text>{FIELDS[steps.step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput value={values[steps.step] ?? ""} onChange={updateAt} onSubmit={tryAdvance} />
          </Box>
        </>
      )}
    </FormFrame>
  );
}
