import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { Employee } from "../../domain.js";
import type { MailRecord } from "../../integrations/integration-types.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

type SendMailInput = Pick<
  MailRecord,
  "companyId" | "senderKind" | "senderId" | "recipientKind" | "recipientId" | "subject" | "body"
>;

export function MailForm(props: {
  companyId: string;
  employees: Employee[];
  terminalWidth: number;
  onSubmit: (input: SendMailInput) => void;
  onCancel: () => void;
}) {
  const recipients = props.employees.filter(({ status }) => status !== "terminated");
  const [step, setStep] = useState(0);
  const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 3 && matchesKeybinding("activate", input, key))
      props.onSubmit({
        companyId: props.companyId,
        senderKind: "human",
        senderId: "human",
        recipientKind: "agent",
        recipientId,
        subject: subject.trim(),
        body: body.trim(),
      });
  });
  const recipient = recipients.find(({ id }) => id === recipientId);
  return (
    <FormFrame
      title="Compose company mail"
      terminalWidth={props.terminalWidth}
      footer={step === 3 ? "Enter send · Esc cancel" : "Enter/select next · Esc cancel"}
    >
      {recipients.length === 0 ? (
        <Text>No active company recipient is available. Esc closes this dialog.</Text>
      ) : step === 0 ? (
        <>
          <Text>Recipient</Text>
          <SelectInput
            items={recipients.map((employee) => ({
              label: `${employee.name} — ${employee.title}`,
              value: employee.id,
            }))}
            onSelect={(item) => {
              setRecipientId(item.value);
              setStep(1);
            }}
          />
        </>
      ) : step === 1 ? (
        <MailTextField
          label="Subject"
          value={subject}
          onChange={setSubject}
          onNext={() => {
            setStep(2);
          }}
        />
      ) : step === 2 ? (
        <MailTextField
          label="Body"
          value={body}
          onChange={setBody}
          onNext={() => {
            setStep(3);
          }}
        />
      ) : (
        <Text>Send this mail as you to {recipient?.name ?? recipientId}?</Text>
      )}
    </FormFrame>
  );
}

function MailTextField(props: {
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
