import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { ProposeAutomationInput } from "../../automations/automation-types.js";
import type { Employee } from "../../domain.js";
import { NamedSelect } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";
import {
  formFooter,
  isFieldBack,
  isFieldForward,
  splitList,
  useFormSteps,
} from "../use-form-steps.js";

const FIELDS = [
  "Title",
  "Cron schedule (UTC)",
  "Task objective",
  "Acceptance criteria (comma separated)",
  "Assignee",
  "Rationale",
] as const;

export function AutomationForm(props: {
  companyId: string;
  employees?: Employee[];
  terminalWidth: number;
  onSubmit: (input: ProposeAutomationInput) => void;
  onCancel: () => void;
}) {
  const steps = useFormSteps(FIELDS.length);
  const [values, setValues] = useState(["", "0 8 * * *", "", "", "ceo", ""]);
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === steps.step ? value : item)));
    steps.fail("");
  };
  const tryAdvance = (): void => {
    if (values[steps.step]?.trim()) steps.advance();
    else steps.fail(`${FIELDS[steps.step]} is required`);
  };
  const selectStep = !steps.confirming && steps.step === 4;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (!steps.confirming && steps.step !== 4 && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      requestedBy: "ceo",
      title: values[0]?.trim() ?? "",
      trigger: { kind: "cron", expression: values[1]?.trim() ?? "", timezone: "UTC" },
      action: {
        kind: "task",
        objective: values[2]?.trim() ?? "",
        acceptanceCriteria: splitList(values[3]),
        assigneeId: values[4]?.trim() ?? "ceo",
      },
      rationale: values[5]?.trim() ?? "",
      estimatedRunsSaved: 1,
    });
  }
  const assignees = (props.employees ?? [])
    .filter(({ status }) => status !== "terminated")
    .map((employee) => ({ label: `${employee.name} — ${employee.title}`, value: employee.id }));
  return (
    <FormFrame
      title="Propose automation"
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, FIELDS.length, { selectStep })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.confirming ? (
        <Text>Submit {values[0]} for governed approval?</Text>
      ) : steps.step === 4 ? (
        <NamedSelect
          label={FIELDS[steps.step]}
          items={assignees}
          value={values[steps.step] ?? ""}
          onSelect={(value) => {
            setValues((current) => current.map((item, index) => (index === 4 ? value : item)));
            steps.advance();
          }}
        />
      ) : (
        <>
          <Text>{FIELDS[steps.step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput value={values[steps.step] ?? ""} onChange={updateAt} onSubmit={tryAdvance} />
          </Box>
        </>
      )}
    </FormFrame>
  );
}
