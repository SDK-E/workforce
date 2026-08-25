import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { CompanyRecord, UpdateCompanyInput } from "../../storage/records.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, isFieldForward, useFormSteps } from "../use-form-steps.js";
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
  "Policies and governance (advanced JSON object)",
  "Budget",
] as const;

export function CompanyForm({ company, terminalWidth, onSubmit, onCancel }: CompanyFormProps) {
  const steps = useFormSteps(FIELDS.length);
  const [values, setValues] = useState([
    company.mission,
    company.vision,
    company.values.join(", "),
    JSON.stringify(company.policies),
    (company.budgetCents / 100).toFixed(2),
  ]);
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === steps.step ? value : item)));
    steps.fail("");
  };
  const tryAdvance = (): void => {
    if (steps.step < FIELDS.length - 1) {
      steps.advance();
      return;
    }
    save();
  };
  function save(): void {
    const budget = Number(values[4]);
    if (!Number.isFinite(budget) || budget < 0) {
      steps.fail("Budget must be zero or a positive number");
      steps.goTo(4);
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
        policies: parseCompanyPolicies(values[3]?.trim() ? values[3] : "{}"),
        budgetCents: Math.round(budget * 100),
      });
    } catch (caught) {
      steps.fail(caught instanceof Error ? caught.message : "Invalid company configuration");
      steps.goTo(3);
    }
  }
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) onCancel();
    if (isFieldBack(input, key, false)) steps.retreat();
    if (!steps.confirming && isFieldForward(input, key, false)) tryAdvance();
  });
  return (
    <FormFrame
      title={`Configure ${company.displayName}`}
      terminalWidth={terminalWidth}
      footer={formFooter(steps.confirming, steps.step, FIELDS.length, { verb: "next/save" })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      <Text>{FIELDS[steps.step]}</Text>
      <Box>
        <PromptMarker />
        <TextInput value={values[steps.step] ?? ""} onChange={updateAt} onSubmit={tryAdvance} />
      </Box>
    </FormFrame>
  );
}
