import { useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import type { Employee } from "../../domain.js";
import type { CreateTaskInput, TaskRecord } from "../../tasks/task-types.js";
import { FormFrame } from "./form-frame.js";
import {
  formFooter,
  isFieldBack,
  isFieldForward,
  splitList,
  useFormSteps,
} from "../use-form-steps.js";

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
  const steps = useFormSteps(4);
  const [objective, setObjective] = useState(props.initial?.objective ?? "");
  const [criteria, setCriteria] = useState(props.initial?.acceptanceCriteria.join(", ") ?? "");
  const [risk, setRisk] = useState<TaskRecord["risk"]>(props.initial?.risk ?? "medium");
  const [assigneeId, setAssigneeId] = useState(props.initial?.assigneeId ?? "");
  // stdin events can arrive before React re-renders; refs keep validation on the latest text.
  const latest = useRef({ objective, criteria });
  latest.current = { objective, criteria };
  const assignee = (props.employees ?? []).find(({ id }) => id === assigneeId);
  const selectStep = !steps.confirming && [2, 3].includes(steps.step);
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (!steps.confirming && [0, 1].includes(steps.step) && isFieldForward(input, key, false))
      advanceText(steps.step === 0 ? latest.current.objective : latest.current.criteria);
    if (steps.confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function advanceText(value: string): void {
    if (value.trim()) steps.advance();
    else steps.fail("This field is required");
  }
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      objective: objective.trim(),
      acceptanceCriteria: splitList(criteria),
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
      footer={formFooter(steps.confirming, steps.step, 4, { selectStep })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.step === 0 && !steps.confirming && (
        <>
          <Text>Objective</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={objective}
              onChange={(value) => {
                setObjective(value);
                steps.fail("");
              }}
              onSubmit={() => {
                advanceText(latest.current.objective);
              }}
            />
          </Box>
        </>
      )}
      {steps.step === 1 && !steps.confirming && (
        <>
          <Text>Acceptance criteria (comma separated)</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={criteria}
              onChange={(value) => {
                setCriteria(value);
                steps.fail("");
              }}
              onSubmit={() => {
                advanceText(latest.current.criteria);
              }}
            />
          </Box>
        </>
      )}
      {steps.step === 2 && !steps.confirming && (
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
              steps.advance();
            }}
          />
        </>
      )}
      {steps.step === 3 && !steps.confirming && (
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
              steps.advance();
            }}
          />
        </>
      )}
      {steps.confirming && (
        <Text>
          Confirm and approve “{objective}” at {risk} risk
          {assignee ? ` for ${assignee.name} — ${assignee.title}` : " for ARM staffing"}? This
          mutation is audited.
        </Text>
      )}
    </FormFrame>
  );
}
