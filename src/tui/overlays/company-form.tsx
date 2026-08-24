import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { CompanyRecord, UpdateCompanyInput } from "../../storage/records.js";

interface CompanyFormProps {
  company: CompanyRecord;
  terminalWidth: number;
  onSubmit: (input: UpdateCompanyInput) => void;
  onCancel: () => void;
}

const FIELDS = ["Mission", "Vision", "Values (comma separated)", "Budget"] as const;

export function CompanyForm({ company, terminalWidth, onSubmit, onCancel }: CompanyFormProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([
    company.mission,
    company.vision,
    company.values.join(", "),
    (company.budgetCents / 100).toFixed(2),
  ]);

  useInput((_input, key) => {
    if (key.escape) onCancel();
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
    const budget = Number(values[3]);
    if (!Number.isFinite(budget) || budget < 0) return;
    onSubmit({
      companyId: company.id,
      mission: values[0] ?? "",
      vision: values[1] ?? "",
      values: (values[2] ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      budgetCents: Math.round(budget * 100),
    });
  }

  return (
    <Box
      position="absolute"
      marginTop={4}
      marginLeft={Math.max(2, Math.floor(terminalWidth / 5))}
      width={Math.max(44, Math.floor((terminalWidth * 3) / 5))}
      borderStyle="double"
      borderColor="cyan"
      flexDirection="column"
      paddingX={2}
    >
      <Text bold>Configure {company.displayName}</Text>
      <Text>{FIELDS[step]}</Text>
      <Box>
        <Text color="cyan">› </Text>
        <TextInput value={currentValue} onChange={updateCurrent} onSubmit={submitCurrent} />
      </Box>
      <Text dimColor>
        Enter next/save · Esc cancel · {step + 1}/{FIELDS.length}
      </Text>
    </Box>
  );
}
