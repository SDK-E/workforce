import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { RoomRecord } from "../../conversations/conversation-types.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, isFieldForward, useFormSteps } from "../use-form-steps.js";

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
  const visible = props.initial ? [0, 1, 2, 3] : [0, 1];
  const steps = useFormSteps(visible.length);
  const [values, setValues] = useState([
    props.initial?.name ?? "",
    props.initial?.kind ?? "team",
    props.initial?.retentionDays?.toString() ?? "",
    props.initial?.announcement ?? "",
  ]);
  const fieldIndex = visible[steps.step] ?? 0;
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === fieldIndex ? value : item)));
  };
  const tryAdvance = (): void => {
    if (fieldIndex >= 2 || values[fieldIndex]?.trim()) steps.advance();
    else steps.fail(`${FIELDS[fieldIndex]} is required`);
  };
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, false)) steps.retreat();
    if (!steps.confirming && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key))
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
      footer={formFooter(steps.confirming, steps.step, visible.length)}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.confirming ? (
        <Text>Save room “{values[0]}” with audited configuration?</Text>
      ) : (
        <>
          <Text>{FIELDS[fieldIndex]}</Text>
          <Box>
            <PromptMarker />
            <TextInput value={values[fieldIndex] ?? ""} onChange={updateAt} onSubmit={tryAdvance} />
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
