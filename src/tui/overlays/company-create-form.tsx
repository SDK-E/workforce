import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { CreateCompanyInput } from "../../storage/records.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, isFieldForward, useFormSteps } from "../use-form-steps.js";

const FIELDS = ["Company name", "Mission"] as const;

export function CompanyCreateForm(props: {
  terminalWidth: number;
  onSubmit: (input: CreateCompanyInput) => void;
  onCancel: () => void;
}) {
  const steps = useFormSteps(FIELDS.length);
  const [values, setValues] = useState<string[]>(FIELDS.map(() => ""));
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === steps.step ? value : item)));
    steps.fail("");
  };
  const tryAdvance = (): void => {
    if (values[steps.step]?.trim()) steps.advance();
    else steps.fail(`${FIELDS[steps.step]} is required`);
  };
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, false)) steps.retreat();
    if (!steps.confirming && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    props.onSubmit({
      name: values[0]?.trim() ?? "",
      displayName: values[0]?.trim() ?? "",
      mission: values[1]?.trim() ?? "",
    });
  }
  return (
    <FormFrame
      title="Create isolated company"
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, FIELDS.length, { verb: "create" })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.confirming ? (
        <Text>
          Create {values[0]} with isolated identities, registries, and audit history? Additional
          settings can be added later.
        </Text>
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
