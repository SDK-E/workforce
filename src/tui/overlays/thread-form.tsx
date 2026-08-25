import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { RoomRecord } from "../../conversations/conversation-types.js";
import { NamedSelect } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, isFieldForward, useFormSteps } from "../use-form-steps.js";

export function ThreadForm(props: {
  rooms: RoomRecord[];
  terminalWidth: number;
  onSubmit: (input: { roomId: string; title: string }) => void;
  onCancel: () => void;
}) {
  const rooms = props.rooms.filter(({ status }) => status === "active");
  const steps = useFormSteps(2);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const selectStep = !steps.confirming && steps.step === 0;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (steps.step === 1 && !steps.confirming && isFieldForward(input, key, false) && title.trim())
      steps.advance();
    if (steps.confirming && matchesKeybinding("activate", input, key))
      props.onSubmit({ roomId, title: title.trim() });
  });
  return (
    <FormFrame
      title="Create conversation thread"
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, 2, { selectStep, verb: "create" })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {rooms.length === 0 ? (
        <Text>Create an active room before creating a thread. Esc closes this dialog.</Text>
      ) : steps.step === 0 ? (
        <NamedSelect
          label="Room"
          items={rooms.map((room) => ({ label: room.name, value: room.id }))}
          value={roomId}
          onSelect={(value) => {
            setRoomId(value);
            steps.advance();
          }}
        />
      ) : steps.step === 1 ? (
        <>
          <Text>Thread title</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={title}
              onChange={(value) => {
                setTitle(value);
                steps.fail("");
              }}
              onSubmit={() => {
                if (title.trim()) steps.advance();
                else steps.fail("Thread title is required");
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
