import { useState } from "react";
import { Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { CorrectiveEvent, CorrectiveStatus } from "../../governance/incident-machines.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

const EVENTS: Record<CorrectiveStatus, CorrectiveEvent[]> = {
  drafted: ["ISSUE"],
  issued: ["ACKNOWLEDGE", "CHALLENGE"],
  acknowledged: ["CHALLENGE", "RESOLVE"],
  challenged: ["RESOLVE"],
  resolved: ["ARCHIVE"],
  archived: [],
};

export function CorrectiveDecisionForm(props: {
  actionId: string;
  status: CorrectiveStatus;
  terminalWidth: number;
  onSubmit: (event: CorrectiveEvent) => void;
  onCancel: () => void;
}) {
  const options = EVENTS[props.status];
  const [event, setEvent] = useState<CorrectiveEvent | null>(null);
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (event && matchesKeybinding("activate", input, key)) props.onSubmit(event);
  });
  return (
    <FormFrame
      title="Advance corrective action"
      terminalWidth={props.terminalWidth}
      footer={
        event
          ? "Enter confirm and audit · Esc cancel"
          : "Up/Down select · Enter choose · Esc cancel"
      }
    >
      <Text dimColor>
        Corrective action {props.actionId} · current status {props.status}
      </Text>
      {options.length === 0 ? (
        <Text>This corrective-action lifecycle is complete.</Text>
      ) : event ? (
        <Text>Confirm {event.toLowerCase()} transition?</Text>
      ) : (
        <SelectInput
          items={options.map((value) => ({ label: value.toLowerCase(), value }))}
          onSelect={(item) => {
            setEvent(item.value);
          }}
        />
      )}
    </FormFrame>
  );
}
