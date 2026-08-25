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

export interface MeetingFormInput {
  title: string;
  organizerId: string;
  participantIds: string[];
  agenda: string[];
  scheduledAt: string;
}

export function MeetingForm(props: {
  terminalWidth: number;
  employees?: Employee[];
  initial?: MeetingRecord;
  onSubmit: (input: MeetingFormInput) => void;
  onCancel: () => void;
}) {
  const employeeItems = activeEmployees(props.employees ?? []);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(props.initial?.title ?? "");
  const [organizerId, setOrganizerId] = useState(props.initial?.organizerId ?? "ceo");
  const [participantIds, setParticipantIds] = useState(
    props.initial?.participantIds ?? ["ceo", "arm"],
  );
  const [agenda, setAgenda] = useState(props.initial?.agenda.join(", ") ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    props.initial?.scheduledAt ?? new Date().toISOString(),
  );
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 5 && matchesKeybinding("activate", input, key))
      props.onSubmit({
        title: title.trim(),
        organizerId,
        participantIds,
        agenda: split(agenda),
        scheduledAt,
      });
  });
  return (
    <FormFrame
      title={props.initial ? "Edit bounded meeting" : "Schedule bounded meeting"}
      terminalWidth={props.terminalWidth}
      footer={step === 5 ? "Enter confirm · Esc cancel" : "Enter/select next · Esc cancel"}
    >
      {step === 0 ? (
        <TextField
          label="Title"
          value={title}
          onChange={setTitle}
          onNext={() => {
            setStep(1);
          }}
        />
      ) : step === 1 ? (
        <NamedSelect
          label="Organizer"
          items={employeeItems}
          value={organizerId}
          onSelect={(value) => {
            setOrganizerId(value);
            setStep(2);
          }}
        />
      ) : step === 2 ? (
        <NamedMultiSelect
          label="Participants"
          items={employeeItems}
          selected={participantIds}
          onSubmit={(values) => {
            setParticipantIds(values);
            setStep(3);
          }}
        />
      ) : step === 3 ? (
        <TextField
          label="Agenda (comma separated)"
          value={agenda}
          onChange={setAgenda}
          onNext={() => {
            setStep(4);
          }}
        />
      ) : step === 4 ? (
        <TextField
          label="Scheduled time (ISO)"
          value={scheduledAt}
          onChange={setScheduledAt}
          onNext={() => {
            setStep(5);
          }}
        />
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

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <Text>{props.label}</Text>
      <Box>
        <PromptMarker />
        <TextInput
          value={props.value}
          onChange={props.onChange}
          onSubmit={() => {
            if (props.value.trim()) props.onNext();
          }}
        />
      </Box>
    </>
  );
}

function split(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
