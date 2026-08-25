import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { ApprovalEvent } from "../../governance/approval-machine.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

export function ApprovalDecisionForm(props: {
  terminalWidth: number;
  onSubmit: (input: { approvalId: string; event: ApprovalEvent; rationale: string }) => void;
  onCancel: () => void;
  approvalId?: string;
}) {
  const [step, setStep] = useState(0);
  const [event, setEvent] = useState<ApprovalEvent>("APPROVE");
  const [rationale, setRationale] = useState("");
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 2 && props.approvalId && matchesKeybinding("activate", input, key))
      props.onSubmit({ approvalId: props.approvalId, event, rationale });
  });
  return (
    <FormFrame
      title="Record approval decision"
      terminalWidth={props.terminalWidth}
      footer={
        step === 2 ? "Enter confirm and audit · Esc cancel" : "Enter/select next · Esc cancel"
      }
    >
      {!props.approvalId ? (
        <Text>Select an approval before recording a decision.</Text>
      ) : step === 0 ? (
        <>
          <Text>Decision</Text>
          <SelectInput
            items={[
              { label: "Approve", value: "APPROVE" as const },
              { label: "Reject", value: "REJECT" as const },
            ]}
            onSelect={(item) => {
              setEvent(item.value);
              setStep(1);
            }}
          />
        </>
      ) : step === 1 ? (
        <>
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
        </>
      ) : (
        <Text>Confirm {event === "APPROVE" ? "approval" : "rejection"}?</Text>
      )}
    </FormFrame>
  );
}
