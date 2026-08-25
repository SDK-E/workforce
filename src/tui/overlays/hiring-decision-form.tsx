import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { matchesKeybinding } from "../keybindings.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { FormFrame } from "./form-frame.js";

export function HiringDecisionForm(props: {
  proposalId: string;
  terminalWidth: number;
  onSubmit: (decision: "approved" | "rejected", rationale: string) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [rationale, setRationale] = useState("");
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 2 && matchesKeybinding("activate", input, key))
      props.onSubmit(decision, rationale);
  });
  return (
    <FormFrame
      title="Decide hiring proposal"
      terminalWidth={props.terminalWidth}
      footer={
        step === 2 ? "Enter confirm and audit · Esc cancel" : "Select/Enter next · Esc cancel"
      }
    >
      <Text dimColor>Proposal {props.proposalId}</Text>
      {step === 0 && (
        <SelectInput
          items={[
            { label: "Approve probationary hire", value: "approved" as const },
            { label: "Reject proposal", value: "rejected" as const },
          ]}
          onSelect={(item) => {
            setDecision(item.value);
            setStep(1);
          }}
        />
      )}
      {step === 1 && (
        <Box flexDirection="column">
          <Text>Evidence-based rationale</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={rationale}
              onChange={setRationale}
              onSubmit={() => {
                if (rationale.trim()) setStep(2);
              }}
            />
          </Box>
        </Box>
      )}
      {step === 2 && <Text>Confirm {decision} decision?</Text>}
    </FormFrame>
  );
}
