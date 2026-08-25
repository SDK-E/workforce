import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { RoomRecord } from "../../conversations/conversation-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = ["Name", "Kind", "Retention days (blank = forever)", "Announcement"] as const;

export interface RoomInput {
  name: string;
  kind: string;
  retentionDays: number | null;
  announcement: string;
}

export function RoomForm(props: {
  terminalWidth: number;
  initial?: RoomRecord;
  onSubmit: (input: RoomInput) => void;
  onCancel: () => void;
}) {
  const steps = props.initial ? [0, 1, 2, 3] : [0, 1];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([
    props.initial?.name ?? "",
    props.initial?.kind ?? "team",
    props.initial?.retentionDays?.toString() ?? "",
    props.initial?.announcement ?? "",
  ]);
  const fieldIndex = steps[step];
  const confirming = step === steps.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key))
      props.onSubmit({
        name: values[0]?.trim() ?? "",
        kind: values[1]?.trim() ?? "",
        retentionDays: retention(values[2]),
        announcement: values[3]?.trim() ?? "",
      });
  });
  return (
    <FormFrame
      title={props.initial ? "Edit conversation room" : "Create conversation room"}
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter confirm · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${steps.length}`
      }
    >
      {confirming ? (
        <Text>Save room “{values[0]}” with audited configuration?</Text>
      ) : (
        <>
          <Text>{FIELDS[fieldIndex ?? 0]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[fieldIndex ?? 0] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === fieldIndex ? value : item)),
                );
              }}
              onSubmit={() => {
                if ((fieldIndex ?? 0) >= 2 || values[fieldIndex ?? 0]?.trim())
                  setStep((current) => current + 1);
              }}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function retention(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error("Retention must be a positive day count");
  return parsed;
}
