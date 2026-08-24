import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { CreateCompanyInput } from "../../storage/records.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = ["Company ID", "Operating name", "Display name", "Mission"] as const;

export function CompanyCreateForm(props: {
  terminalWidth: number;
  onSubmit: (input: CreateCompanyInput) => void;
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
    if (step < 3 && !values[step]?.trim()) return;
    setStep((current) => current + 1);
  }
  function submit(): void {
    props.onSubmit({
      id: values[0]?.trim() ?? "",
      name: values[1]?.trim() ?? "",
      displayName: values[2]?.trim() ?? "",
      mission: values[3]?.trim() ?? "",
    });
  }
  return (
    <FormFrame
      title="Create isolated company"
      terminalWidth={props.terminalWidth}
      footer={confirming ? "Enter confirm · Esc cancel" : `Enter next · Esc cancel · ${step + 1}/4`}
    >
      {confirming ? (
        <Text>
          Create {values[2]} with isolated identities, rooms, registries, and audit history?
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
