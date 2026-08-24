import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { ProposeAutomationInput } from "../../automations/automation-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Requester agent ID",
  "Title",
  "Schedule or event",
  "Action service",
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
  const [values, setValues] = useState(["ceo", "", "", "", "", "1"]);
  const confirming = step === FIELDS.length;
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (confirming && key.return) submit();
  });
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      requestedBy: values[0]?.trim() ?? "",
      title: values[1]?.trim() ?? "",
      trigger: { expression: values[2]?.trim() ?? "" },
      action: { service: values[3]?.trim() ?? "" },
      rationale: values[4]?.trim() ?? "",
      estimatedRunsSaved: Number(values[5]),
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
            <Text color="cyan">› </Text>
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
