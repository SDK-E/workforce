import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { Employee } from "../../domain.js";
import type { MailRecord } from "../../integrations/integration-types.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, isFieldForward, useFormSteps } from "../use-form-steps.js";

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
  const steps = useFormSteps(3);
  const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const selectStep = !steps.confirming && steps.step === 0;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (!steps.confirming && [1, 2].includes(steps.step) && isFieldForward(input, key, false))
      advanceText(steps.step === 1 ? subject : body, steps.step === 1 ? "Subject" : "Body");
    if (steps.confirming && matchesKeybinding("activate", input, key))
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
  function advanceText(value: string, label: string): void {
    if (value.trim()) steps.advance();
    else steps.fail(`${label} is required`);
  }
  const recipient = recipients.find(({ id }) => id === recipientId);
  return (
    <FormFrame
      title="Compose company mail"
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, 3, { selectStep, verb: "next/send" })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {recipients.length === 0 ? (
        <Text>No active company recipient is available. Esc closes this dialog.</Text>
      ) : steps.step === 0 ? (
        <>
          <Text>Recipient</Text>
          <SelectInput
            items={recipients.map((employee) => ({
              label: `${employee.name} — ${employee.title}`,
              value: employee.id,
            }))}
            onSelect={(item) => {
              setRecipientId(item.value);
              steps.advance();
            }}
          />
        </>
      ) : steps.step === 1 ? (
        <>
          <Text>Subject</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={subject}
              onChange={(value) => {
                setSubject(value);
                steps.fail("");
              }}
              onSubmit={() => {
                advanceText(subject, "Subject");
              }}
            />
          </Box>
        </>
      ) : steps.step === 2 ? (
        <>
          <Text>Body</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={body}
              onChange={(value) => {
                setBody(value);
                steps.fail("");
              }}
              onSubmit={() => {
                advanceText(body, "Body");
              }}
            />
          </Box>
        </>
      ) : (
        <Text>Send this mail as you to {recipient?.name ?? recipientId}?</Text>
      )}
    </FormFrame>
  );
}
