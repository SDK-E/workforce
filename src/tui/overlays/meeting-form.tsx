import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Employee } from "../../domain.js";
import type { MeetingRecord } from "../../governance/meeting-repository.js";
import { NamedMultiSelect } from "../components/named-multi-select.js";
import { NamedSelect, type NamedOption } from "../components/named-select.js";
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

export interface MeetingFormInput {
  title: string;
  organizerId: string;
  participantIds: string[];
  agenda: string[];
  scheduledAt: string;
}

const LAST_STEP = 5;

export function MeetingForm(props: {
  terminalWidth: number;
  employees?: Employee[];
  initial?: MeetingRecord;
  onSubmit: (input: MeetingFormInput) => void;
  onCancel: () => void;
}) {
  const employeeItems = activeEmployees(props.employees ?? []);
  const steps = useFormSteps(LAST_STEP);
  const [title, setTitle] = useState(props.initial?.title ?? "");
  const [organizerId, setOrganizerId] = useState(props.initial?.organizerId ?? "ceo");
  const [participantIds, setParticipantIds] = useState(
    props.initial?.participantIds ?? ["ceo", "arm"],
  );
  const [agenda, setAgenda] = useState(props.initial?.agenda.join(", ") ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    props.initial?.scheduledAt ?? new Date().toISOString(),
  );
  const selectStep = !steps.confirming && [1, 2].includes(steps.step);
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (!steps.confirming && steps.step === 0 && isFieldForward(input, key, false)) advanceTitle();
    if (!steps.confirming && steps.step === 3 && isFieldForward(input, key, false))
      advanceText(agenda, "Agenda");
    if (steps.confirming && matchesKeybinding("activate", input, key))
      props.onSubmit({
        title: title.trim(),
        organizerId,
        participantIds,
        agenda: splitList(agenda),
        scheduledAt,
      });
  });
  function advanceTitle(): void {
    if (title.trim()) steps.advance();
    else steps.fail("Title is required");
  }
  function advanceText(value: string, label: string): void {
    if (value.trim()) steps.advance();
    else steps.fail(`${label} is required`);
  }
  return (
    <FormFrame
      title={props.initial ? "Edit bounded meeting" : "Schedule bounded meeting"}
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, LAST_STEP, { selectStep })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.step === 0 && !steps.confirming ? (
        <>
          <Text>Title</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={title}
              onChange={(value) => {
                setTitle(value);
                steps.fail("");
              }}
              onSubmit={advanceTitle}
            />
          </Box>
        </>
      ) : steps.step === 1 && !steps.confirming ? (
        <NamedSelect
          label="Organizer"
          items={employeeItems}
          value={organizerId}
          onSelect={(value) => {
            setOrganizerId(value);
            steps.advance();
          }}
        />
      ) : steps.step === 2 && !steps.confirming ? (
        <NamedMultiSelect
          label="Participants"
          items={employeeItems}
          selected={participantIds}
          onSubmit={(values) => {
            setParticipantIds(values);
            steps.advance();
          }}
        />
      ) : steps.step === 3 && !steps.confirming ? (
        <>
          <Text>Agenda (comma separated)</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={agenda}
              onChange={(value) => {
                setAgenda(value);
                steps.fail("");
              }}
              onSubmit={() => {
                advanceText(agenda, "Agenda");
              }}
            />
          </Box>
        </>
      ) : steps.step === 4 && !steps.confirming ? (
        <>
          <Text>Scheduled time (ISO; Enter keeps the pre-filled time)</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={scheduledAt}
              onChange={setScheduledAt}
              onSubmit={() => {
                steps.advance();
              }}
            />
          </Box>
        </>
      ) : (
        <Text>
          Schedule “{title}” with {participantIds.length} bounded participants?
        </Text>
      )}
    </FormFrame>
  );
}

function activeEmployees(employees: Employee[]): NamedOption[] {
  return employees
    .filter(({ status }) => status !== "terminated")
    .map((employee) => ({ label: `${employee.name} — ${employee.title}`, value: employee.id }));
}
