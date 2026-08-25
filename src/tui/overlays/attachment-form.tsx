import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { MessageRecord } from "../../conversations/conversation-types.js";
import { NamedSelect } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { truncate } from "../navigation.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, isFieldForward, useFormSteps } from "../use-form-steps.js";

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
  const steps = useFormSteps(LABELS.length + 1);
  const [messageId, setMessageId] = useState(props.messages[0]?.id ?? "");
  const [values, setValues] = useState(["", "application/octet-stream", "0", "", "artifact://"]);
  const field = steps.step - 1;
  const updateAt = (value: string): void => {
    setValues((current) => current.map((item, index) => (index === field ? value : item)));
    steps.fail("");
  };
  const tryAdvance = (): void => {
    if ((values[field] ?? "").trim()) steps.advance();
    else steps.fail(`${LABELS[field]} is required`);
  };
  const selectStep = steps.step === 0 && !steps.confirming;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (!steps.confirming && steps.step >= 1 && isFieldForward(input, key, false)) tryAdvance();
    if (steps.confirming && matchesKeybinding("activate", input, key))
      props.onSubmit({
        messageId,
        filename: values[0]?.trim() ?? "",
        mediaType: values[1]?.trim() ?? "",
        sizeBytes: Number(values[2]),
        digest: values[3]?.trim() ?? "",
        artifactUri: values[4]?.trim() ?? "",
      });
  });
  return (
    <FormFrame
      title="Register message attachment"
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, LABELS.length + 1, { selectStep })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {props.messages.length === 0 ? (
        <Text>Create a message before registering an attachment. Esc closes this dialog.</Text>
      ) : steps.step === 0 ? (
        <NamedSelect
          label="Message"
          items={props.messages.map((message) => ({
            label: `${message.authorId}: ${truncate(message.body, 48)}`,
            value: message.id,
          }))}
          value={messageId}
          onSelect={(value) => {
            setMessageId(value);
            steps.advance();
          }}
        />
      ) : steps.confirming ? (
        <Text>Register this immutable artifact reference on the selected message?</Text>
      ) : (
        <>
          <Text>{LABELS[field]}</Text>
          <Box>
            <PromptMarker />
            <TextInput value={values[field] ?? ""} onChange={updateAt} onSubmit={tryAdvance} />
          </Box>
        </>
      )}
    </FormFrame>
  );
}
