import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { RoomRecord } from "../../conversations/conversation-types.js";
import { NamedSelect } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

export function ThreadForm(props: {
  rooms: RoomRecord[];
  terminalWidth: number;
  onSubmit: (input: { roomId: string; title: string }) => void;
  onCancel: () => void;
}) {
  const rooms = props.rooms.filter(({ status }) => status === "active");
  const [step, setStep] = useState(0);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [title, setTitle] = useState("");
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 2 && matchesKeybinding("activate", input, key))
      props.onSubmit({ roomId, title: title.trim() });
  });
  return (
    <FormFrame
      title="Create conversation thread"
      terminalWidth={props.terminalWidth}
      footer={step === 2 ? "Enter create and audit · Esc cancel" : "Enter/select next · Esc cancel"}
    >
      {rooms.length === 0 ? (
        <Text>Create an active room before creating a thread. Esc closes this dialog.</Text>
      ) : step === 0 ? (
        <NamedSelect
          label="Room"
          items={rooms.map((room) => ({ label: room.name, value: room.id }))}
          value={roomId}
          onSelect={(value) => {
            setRoomId(value);
            setStep(1);
          }}
        />
      ) : step === 1 ? (
        <>
          <Text>Thread title</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={title}
              onChange={setTitle}
              onSubmit={() => {
                if (title.trim()) setStep(2);
              }}
            />
          </Box>
        </>
      ) : (
        <Text>Create “{title}” in the selected room?</Text>
      )}
    </FormFrame>
  );
}
