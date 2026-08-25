import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type { MailRecord } from "../../integrations/integration-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = [
  "Sender kind (human/agent)",
  "Sender ID",
  "Recipient kind",
  "Recipient ID",
  "Subject",
  "Body",
];

export function MailForm(props: {
  companyId: string;
  terminalWidth: number;
  onSubmit: (
    input: Pick<
      MailRecord,
      "companyId" | "senderKind" | "senderId" | "recipientKind" | "recipientId" | "subject" | "body"
    >,
  ) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(["human", "human", "agent", "ceo", "", ""]);
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      senderKind: partyKind(values[0]),
      senderId: values[1]?.trim() ?? "",
      recipientKind: partyKind(values[2]),
      recipientId: values[3]?.trim() ?? "",
      subject: values[4]?.trim() ?? "",
      body: values[5]?.trim() ?? "",
    });
  }
  return (
    <FormFrame
      title="Compose company mail"
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter send · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${FIELDS.length}`
      }
    >
      {confirming ? (
        <Text>
          Send durable mail to {values[2]}:{values[3]}?
        </Text>
      ) : (
        <>
          <Text>{FIELDS[step]}</Text>
          <Box>
            <PromptMarker />
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

function partyKind(value: string | undefined): "agent" | "human" {
  return value === "agent" ? "agent" : "human";
}
