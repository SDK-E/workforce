import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { CreateCompanyInput } from "../../storage/records.js";
import { FormFrame } from "./form-frame.js";
const FIELDS = ["Company name", "Mission"] as const;

export function CompanyCreateForm(props: {
  terminalWidth: number;
  onSubmit: (input: CreateCompanyInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<string[]>(FIELDS.map(() => ""));
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
      name: values[0]?.trim() ?? "",
      displayName: values[0]?.trim() ?? "",
      mission: values[1]?.trim() ?? "",
    });
  }
  return (
    <FormFrame
      title="Create isolated company"
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter confirm · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>
          Create {values[0]} with isolated identities, registries, and audit history? Additional
          settings can be added later.
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
