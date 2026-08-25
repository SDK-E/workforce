import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { FormFrame } from "./form-frame.js";
import type { MeetingRecord } from "../../governance/meeting-repository.js";

const FIELDS = [
  "Title",
  "Organizer ID",
  "Participant IDs (comma separated)",
  "Agenda (comma separated)",
  "Scheduled ISO time",
] as const;

export interface MeetingFormInput {
  title: string;
  organizerId: string;
  participantIds: string[];
  agenda: string[];
  scheduledAt: string;
}

export function MeetingForm(props: {
  terminalWidth: number;
  initial?: MeetingRecord;
  onSubmit: (input: MeetingFormInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([
    props.initial?.title ?? "",
    props.initial?.organizerId ?? "ceo",
    props.initial?.participantIds.join(", ") ?? "ceo, arm",
    props.initial?.agenda.join(", ") ?? "",
    props.initial?.scheduledAt ?? new Date().toISOString(),
  ]);
  const confirming = step === FIELDS.length;
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (confirming && key.return)
      props.onSubmit({
        title: values[0] ?? "",
        organizerId: values[1] ?? "",
        participantIds: split(values[2]),
        agenda: split(values[3]),
        scheduledAt: values[4] ?? "",
      });
  });
  return (
    <FormFrame
      title={props.initial ? "Edit bounded meeting" : "Schedule bounded meeting"}
      terminalWidth={props.terminalWidth}
      footer={confirming ? "Enter confirm · Esc cancel" : `Enter next · Esc cancel · ${step + 1}/5`}
    >
      {confirming ? (
        <Text>
          Schedule “{values[0]}” with {split(values[2]).length} bounded participants?
        </Text>
      ) : (
        <>
          <Text>{FIELDS[step]}</Text>
          <Box>
            <Text color="cyan">› </Text>
            <TextInput
              value={values[step] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === step ? value : item)),
                );
              }}
              onSubmit={() => {
                if (values[step]?.trim()) setStep((current) => current + 1);
              }}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function split(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
