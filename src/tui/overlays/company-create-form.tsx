import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { CreateCompanyInput } from "../../storage/records.js";
import { FormFrame } from "./form-frame.js";
import { parseCompanyPolicies } from "./company-policy-input.js";

const FIELDS = [
  "Company ID",
  "Operating name",
  "Display name",
  "Mission",
  "Vision",
  "Values (comma separated)",
  "Policies and governance (JSON object)",
  "Budget in currency units",
] as const;

export function CompanyCreateForm(props: {
  terminalWidth: number;
  onSubmit: (input: CreateCompanyInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<string[]>(
    FIELDS.map((_, index) => (index === 6 ? "{}" : "")),
  );
  const [error, setError] = useState("");
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function advance(): void {
    if (step < 3 && !values[step]?.trim()) return;
    const budget = values[7]?.trim();
    if (
      step === 7 &&
      (!Number.isFinite(Number(budget?.length ? budget : "0")) || Number(budget) < 0)
    )
      return;
    setStep((current) => current + 1);
  }
  function submit(): void {
    try {
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
        policies: parseCompanyPolicies(values[6] ?? "{}"),
        budgetCents: Math.round(Number(values[7]?.trim().length ? values[7] : "0") * 100),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invalid company configuration");
      setStep(6);
    }
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
      {error && <Text color="red">{error}</Text>}
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
                setError("");
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
