import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { FormFrame } from "./form-frame.js";

const FIELDS = ["Room ID", "Author ID", "Thread ID (use - for none)", "Message"] as const;

export function MessageForm(props: {
  terminalWidth: number;
  onSubmit: (input: {
    roomId: string;
    authorId: string;
    threadId: string | null;
    body: string;
  }) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(["", "human", "-", ""]);
  const confirming = step === FIELDS.length;
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (confirming && key.return)
      props.onSubmit({
        roomId: values[0] ?? "",
        authorId: values[1] ?? "",
        threadId: values[2] === "-" ? null : (values[2] ?? null),
        body: values[3] ?? "",
      });
  });
  return (
    <FormFrame
      title="Compose durable message"
      terminalWidth={props.terminalWidth}
      footer={
        confirming ? "Enter send and audit · Esc cancel" : `Enter next · Esc cancel · ${step + 1}/4`
      }
    >
      {confirming ? (
        <Text>
          Send to {values[0]} as {values[1]}?
        </Text>
      ) : (
        <>
          <Text>{FIELDS[step]}</Text>
          <Box>
            <Text color="cyan">› </Text>
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
