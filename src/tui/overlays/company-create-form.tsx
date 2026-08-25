import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { CreateCompanyInput } from "../../storage/records.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Company ID",
  "Operating name",
  "Display name",
  "Mission",
  "Vision",
  "Values (comma separated)",
  "Budget in currency units",
] as const;

export function CompanyCreateForm(props: {
  terminalWidth: number;
  onSubmit: (input: CreateCompanyInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(FIELDS.map(() => ""));
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function advance(): void {
    if (step < 3 && !values[step]?.trim()) return;
    const budget = values[6]?.trim();
    if (
      step === 6 &&
      (!Number.isFinite(Number(budget?.length ? budget : "0")) || Number(budget) < 0)
    )
      return;
    setStep((current) => current + 1);
  }
  function submit(): void {
    props.onSubmit({
      id: values[0]?.trim() ?? "",
      name: values[1]?.trim() ?? "",
      displayName: values[2]?.trim() ?? "",
      mission: values[3]?.trim() ?? "",
      vision: values[4]?.trim() ?? "",
      values: (values[5] ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      budgetCents: Math.round(Number(values[6]?.trim().length ? values[6] : "0") * 100),
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
          Create {values[2]} with isolated identities, rooms, registries, and audit history?
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
