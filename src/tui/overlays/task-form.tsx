import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import type { CreateTaskInput, TaskRecord } from "../../tasks/task-types.js";
import { FormFrame } from "./form-frame.js";

const RISKS: { label: string; value: TaskRecord["risk"] }[] = [
  "low",
  "medium",
  "high",
  "critical",
].map((value) => ({ label: value, value: value as TaskRecord["risk"] }));

export function TaskForm(props: {
  companyId: string;
  terminalWidth: number;
  onSubmit: (input: CreateTaskInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState("");
  const [criteria, setCriteria] = useState("");
  const [risk, setRisk] = useState<TaskRecord["risk"]>("medium");
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (step === 3 && key.return) submit();
  });
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      objective: objective.trim(),
      acceptanceCriteria: criteria
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      risk,
      dataSensitivity: "internal",
      managerId: "ceo",
    });
  }
  return (
    <FormFrame
      title="Create task"
      terminalWidth={props.terminalWidth}
      footer={step === 3 ? "Enter confirm · Esc cancel" : "Enter/select next · Esc cancel"}
    >
      {step === 0 && (
        <>
          <Text>Objective</Text>
          <Box>
            <Text color="cyan">› </Text>
            <TextInput
              value={objective}
              onChange={setObjective}
              onSubmit={() => {
                if (objective.trim()) setStep(1);
              }}
            />
          </Box>
        </>
      )}
      {step === 1 && (
        <>
          <Text>Acceptance criteria (comma separated)</Text>
          <Box>
            <Text color="cyan">› </Text>
            <TextInput
              value={criteria}
              onChange={setCriteria}
              onSubmit={() => {
                if (criteria.trim()) setStep(2);
              }}
            />
          </Box>
        </>
      )}
      {step === 2 && (
        <>
          <Text>Risk</Text>
          <SelectInput
            items={RISKS}
            initialIndex={1}
            onSelect={(item) => {
              setRisk(item.value);
              setStep(3);
            }}
          />
        </>
      )}
      {step === 3 && (
        <Text>
          Confirm “{objective}” at {risk} risk? This mutation is audited.
        </Text>
      )}
    </FormFrame>
  );
}
