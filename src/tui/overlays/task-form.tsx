import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import type { Employee } from "../../domain.js";
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
  employees?: Employee[];
  initial?: TaskRecord | undefined;
}) {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState(props.initial?.objective ?? "");
  const [criteria, setCriteria] = useState(props.initial?.acceptanceCriteria.join(", ") ?? "");
  const [risk, setRisk] = useState<TaskRecord["risk"]>(props.initial?.risk ?? "medium");
  const [assigneeId, setAssigneeId] = useState(props.initial?.assigneeId ?? "");
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 4 && matchesKeybinding("activate", input, key)) submit();
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
      assigneeId: assigneeId.trim() || null,
    });
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Create"} task`}
      terminalWidth={props.terminalWidth}
      footer={step === 4 ? "Enter confirm · Esc cancel" : "Enter/select next · Esc cancel"}
    >
      {step === 0 && (
        <>
          <Text>Objective</Text>
          <Box>
            <PromptMarker />
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
            <PromptMarker />
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
            initialIndex={Math.max(
              0,
              RISKS.findIndex(({ value }) => value === risk),
            )}
            onSelect={(item) => {
              setRisk(item.value);
              setStep(3);
            }}
          />
        </>
      )}
      {step === 3 && (
        <>
          <Text>Assignee (optional)</Text>
          <SelectInput
            items={[
              { label: "Let ARM choose", value: "" },
              ...(props.employees ?? [])
                .filter(({ status }) => status !== "terminated")
                .map((employee) => ({
                  label: `${employee.name} — ${employee.title}`,
                  value: employee.id,
                })),
            ]}
            onSelect={(item) => {
              setAssigneeId(item.value);
              setStep(4);
            }}
          />
        </>
      )}
      {step === 4 && (
        <Text>
          Confirm and approve “{objective}” at {risk} risk
          {assigneeId.trim() ? ` for ${assigneeId.trim()}` : " for ARM staffing"}? This mutation is
          audited.
        </Text>
      )}
    </FormFrame>
  );
}
