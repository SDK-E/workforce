import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { ConversationThread, RoomRecord } from "../../conversations/conversation-types.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, isFieldForward, useFormSteps } from "../use-form-steps.js";

export function MessageForm(props: {
  rooms: RoomRecord[];
  threads: ConversationThread[];
  terminalWidth: number;
  onSubmit: (input: {
    roomId: string;
    threadId: string | null;
    authorId: string;
    body: string;
  }) => void;
  onCancel: () => void;
}) {
  const activeRooms = props.rooms.filter(({ status }) => status === "active");
  const steps = useFormSteps(3);
  const [roomId, setRoomId] = useState(activeRooms[0]?.id ?? "");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const threads = props.threads.filter(
    (thread) => thread.roomId === roomId && thread.status === "open",
  );
  const selectStep = !steps.confirming && [0, 1].includes(steps.step);
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (steps.step === 2 && !steps.confirming && isFieldForward(input, key, false)) advanceBody();
    if (steps.confirming && matchesKeybinding("activate", input, key))
      props.onSubmit({ roomId, threadId, authorId: "human", body: body.trim() });
  });
  function advanceBody(): void {
    if (body.trim()) steps.advance();
    else steps.fail("Message is required");
  }
  return (
    <FormFrame
      title="Compose durable message"
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, 3, { selectStep, verb: "next/send" })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {activeRooms.length === 0 ? (
        <Text>Create an active room before sending a message. Esc closes this dialog.</Text>
      ) : steps.step === 0 ? (
        <>
          <Text>Room</Text>
          <SelectInput
            items={activeRooms.map((room) => ({ label: room.name, value: room.id }))}
            onSelect={(item) => {
              setRoomId(item.value);
              steps.advance();
            }}
          />
        </>
      ) : steps.step === 1 ? (
        <>
          <Text>Thread</Text>
          <SelectInput
            items={[
              { label: "Room timeline (no thread)", value: "" },
              ...threads.map((thread) => ({ label: thread.title, value: thread.id })),
            ]}
            onSelect={(item) => {
              setThreadId(item.value || null);
              steps.advance();
            }}
          />
        </>
      ) : steps.step === 2 ? (
        <>
          <Text>Message</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={body}
              onChange={(value) => {
                setBody(value);
                steps.fail("");
              }}
              onSubmit={advanceBody}
            />
          </Box>
        </>
      ) : (
        <Text>Send this message as you to the selected room?</Text>
      )}
    </FormFrame>
  );
}
