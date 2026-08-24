import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import type { ApprovalEvent } from "../../governance/approval-machine.js";
import { FormFrame } from "./form-frame.js";

export function ApprovalDecisionForm(props: {
  terminalWidth: number;
  onSubmit: (input: { approvalId: string; event: ApprovalEvent; rationale: string }) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [approvalId, setApprovalId] = useState("");
  const [event, setEvent] = useState<ApprovalEvent>("APPROVE");
  const [rationale, setRationale] = useState("");
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (step === 3 && key.return) props.onSubmit({ approvalId, event, rationale });
  });
  return (
    <FormFrame
      title="Record approval decision"
      terminalWidth={props.terminalWidth}
      footer={
        step === 3 ? "Enter confirm and audit · Esc cancel" : "Enter/select next · Esc cancel"
      }
    >
      {step === 0 && (
        <>
          <Text>Approval ID</Text>
          <Box>
            <Text color="cyan">› </Text>
            <TextInput
              value={approvalId}
              onChange={setApprovalId}
              onSubmit={() => {
                if (approvalId.trim()) setStep(1);
              }}
            />
          </Box>
        </>
      )}
      {step === 1 && (
        <>
          <Text>Decision</Text>
          <SelectInput
            items={[
              { label: "Approve", value: "APPROVE" as const },
              { label: "Reject", value: "REJECT" as const },
            ]}
            onSelect={(item) => {
              setEvent(item.value);
              setStep(2);
            }}
          />
        </>
      )}
      {step === 2 && (
        <>
          <Text>Evidence-based rationale</Text>
          <Box>
            <Text color="cyan">› </Text>
            <TextInput
              value={rationale}
              onChange={setRationale}
              onSubmit={() => {
                if (rationale.trim()) setStep(3);
              }}
            />
          </Box>
        </>
      )}
      {step === 3 && (
        <Text>
          Confirm {event === "APPROVE" ? "approval" : "rejection"} of {approvalId}?
        </Text>
      )}
    </FormFrame>
  );
}
