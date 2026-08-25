import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { RoomRecord } from "../../conversations/conversation-types.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

export function MessageForm(props: {
  rooms: RoomRecord[];
  terminalWidth: number;
  onSubmit: (input: { roomId: string; authorId: string; body: string }) => void;
  onCancel: () => void;
}) {
  const activeRooms = props.rooms.filter(({ status }) => status === "active");
  const [step, setStep] = useState(0);
  const [roomId, setRoomId] = useState(activeRooms[0]?.id ?? "");
  const [body, setBody] = useState("");
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 2 && matchesKeybinding("activate", input, key))
      props.onSubmit({ roomId, authorId: "human", body: body.trim() });
  });
  return (
    <FormFrame
      title="Compose durable message"
      terminalWidth={props.terminalWidth}
      footer={step === 2 ? "Enter send and audit · Esc cancel" : "Enter/select next · Esc cancel"}
    >
      {activeRooms.length === 0 ? (
        <Text>Create an active room before sending a message. Esc closes this dialog.</Text>
      ) : step === 0 ? (
        <>
          <Text>Room</Text>
          <SelectInput
            items={activeRooms.map((room) => ({ label: room.name, value: room.id }))}
            onSelect={(item) => {
              setRoomId(item.value);
              setStep(1);
            }}
          />
        </>
      ) : step === 1 ? (
        <>
          <Text>Message</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={body}
              onChange={setBody}
              onSubmit={() => {
                if (body.trim()) setStep(2);
              }}
            />
          </Box>
        </>
      ) : (
        <Text>Send this message as you to the selected room?</Text>
      )}
    </FormFrame>
  );
}
