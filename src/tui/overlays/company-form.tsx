import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { CompanyRecord, UpdateCompanyInput } from "../../storage/records.js";
import { FormFrame } from "./form-frame.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { parseCompanyPolicies } from "./company-policy-input.js";

interface CompanyFormProps {
  company: CompanyRecord;
  terminalWidth: number;
  onSubmit: (input: UpdateCompanyInput) => void;
  onCancel: () => void;
}

const FIELDS = [
  "Mission",
  "Vision",
  "Values (comma separated)",
  "Policies and governance (JSON object)",
  "Budget",
] as const;

export function CompanyForm({ company, terminalWidth, onSubmit, onCancel }: CompanyFormProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([
    company.mission,
    company.vision,
    company.values.join(", "),
    JSON.stringify(company.policies),
    (company.budgetCents / 100).toFixed(2),
  ]);
  const [error, setError] = useState("");

  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) onCancel();
  });

  const currentValue = values[step] ?? "";
  function updateCurrent(value: string): void {
    setValues((current) => current.map((item, index) => (index === step ? value : item)));
  }

  function submitCurrent(): void {
    if (step < FIELDS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    const budget = Number(values[4]);
    if (!Number.isFinite(budget) || budget < 0) {
      setError("Budget must be zero or a positive number");
      return;
    }
    try {
      onSubmit({
        companyId: company.id,
        mission: values[0] ?? "",
        vision: values[1] ?? "",
        values: (values[2] ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        policies: parseCompanyPolicies(values[3] ?? "{}"),
        budgetCents: Math.round(budget * 100),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invalid company configuration");
      setStep(3);
    }
  }

  return (
    <FormFrame
      title={`Configure ${company.displayName}`}
      terminalWidth={terminalWidth}
      footer={`Enter next/save · Esc cancel · ${step + 1}/${FIELDS.length}`}
    >
      {error && <Text color="red">{error}</Text>}
      <Text>{FIELDS[step]}</Text>
      <Box>
        <PromptMarker />
        <TextInput
          value={currentValue}
          onChange={(value) => {
            setError("");
            updateCurrent(value);
          }}
          onSubmit={submitCurrent}
        />
      </Box>
    </FormFrame>
  );
}
