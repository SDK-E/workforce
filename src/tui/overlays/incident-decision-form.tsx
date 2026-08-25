import { useState } from "react";
import { Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { IncidentEvent, IncidentStatus } from "../../governance/incident-machines.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

const EVENTS: Record<IncidentStatus, IncidentEvent[]> = {
  reported: ["TRIAGE"],
  triaged: ["INVESTIGATE", "CONTAIN"],
  investigating: ["CONTAIN", "RESOLVE"],
  contained: ["INVESTIGATE", "RESOLVE"],
  resolved: ["CLOSE"],
  closed: [],
};

export function IncidentDecisionForm(props: {
  incidentId: string;
  status: IncidentStatus;
  terminalWidth: number;
  onSubmit: (event: IncidentEvent) => void;
  onCancel: () => void;
}) {
  const options = EVENTS[props.status];
  const [event, setEvent] = useState<IncidentEvent | null>(null);
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (event && matchesKeybinding("activate", input, key)) props.onSubmit(event);
  });
  return (
    <FormFrame
      title="Advance incident lifecycle"
      terminalWidth={props.terminalWidth}
      footer={
        event
          ? "Enter confirm and audit · Esc cancel"
          : "Up/Down select · Enter choose · Esc cancel"
      }
    >
      <Text dimColor>
        Incident {props.incidentId} · current status {props.status}
      </Text>
      {options.length === 0 ? (
        <Text>This incident lifecycle is complete.</Text>
      ) : event ? (
        <Text>Confirm {event.toLowerCase()} transition?</Text>
      ) : (
        <SelectInput
          items={options.map((value) => ({
            label: value.toLowerCase().replace("_", " "),
            value,
          }))}
          onSelect={(item) => {
            setEvent(item.value);
          }}
        />
      )}
    </FormFrame>
  );
}
