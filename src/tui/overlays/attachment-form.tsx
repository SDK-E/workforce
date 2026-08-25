import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { MessageRecord } from "../../conversations/conversation-types.js";
import { NamedSelect } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { truncate } from "../navigation.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

const LABELS = ["Filename", "Media type", "Size in bytes", "SHA-256 digest", "Artifact URI"];

export interface AttachmentFormInput {
  messageId: string;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  digest: string;
  artifactUri: string;
}

export function AttachmentForm(props: {
  messages: MessageRecord[];
  terminalWidth: number;
  onSubmit: (input: AttachmentFormInput) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [messageId, setMessageId] = useState(props.messages[0]?.id ?? "");
  const [values, setValues] = useState(["", "application/octet-stream", "0", "", "artifact://"]);
  const confirming = step === LABELS.length + 1;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key))
      props.onSubmit({
        messageId,
        filename: values[0]?.trim() ?? "",
        mediaType: values[1]?.trim() ?? "",
        sizeBytes: Number(values[2]),
        digest: values[3]?.trim() ?? "",
        artifactUri: values[4]?.trim() ?? "",
      });
  });
  const field = step - 1;
  return (
    <FormFrame
      title="Register message attachment"
      terminalWidth={props.terminalWidth}
      footer={
        confirming ? "Enter register and audit · Esc cancel" : "Enter/select next · Esc cancel"
      }
    >
      {props.messages.length === 0 ? (
        <Text>Create a message before registering an attachment. Esc closes this dialog.</Text>
      ) : step === 0 ? (
        <NamedSelect
          label="Message"
          items={props.messages.map((message) => ({
            label: `${message.authorId}: ${truncate(message.body, 48)}`,
            value: message.id,
          }))}
          value={messageId}
          onSelect={(value) => {
            setMessageId(value);
            setStep(1);
          }}
        />
      ) : confirming ? (
        <Text>Register this immutable artifact reference on the selected message?</Text>
      ) : (
        <>
          <Text>{LABELS[field]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[field] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === field ? value : item)),
                );
              }}
              onSubmit={() => {
                if ((values[field] ?? "").trim()) setStep((current) => current + 1);
              }}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}
