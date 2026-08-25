import { useState } from "react";
import { Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import { matchesKeybinding } from "../keybindings.js";
import { ConversationMutationOverlay } from "./conversation-mutation-overlay.js";
import { FormFrame } from "./form-frame.js";
import { MessageForm } from "./message-form.js";
import { ThreadForm } from "./thread-form.js";

type ConversationKind = "room" | "thread" | "message";

export function ConversationCreateOverlay(props: {
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  const [kind, setKind] = useState<ConversationKind | null>(null);
  useInput((input, key) => {
    if (!kind && matchesKeybinding("cancel", input, key)) props.onClose();
  });
  const rooms = props.store.conversations.roomList(props.company.id);
  const threads = rooms.flatMap((room) =>
    props.store.conversations.threads.list(props.company.id, room.id),
  );
  if (!kind)
    return (
      <FormFrame
        title="Create collaboration record"
        terminalWidth={props.terminalWidth}
        footer="↑/↓ choose · Enter continue · Esc cancel"
      >
        <Text>What do you want to create?</Text>
        <SelectInput
          items={[
            { label: "Room", value: "room" as const },
            { label: "Thread", value: "thread" as const },
            { label: "Message", value: "message" as const },
          ]}
          onSelect={(item) => {
            setKind(item.value);
          }}
        />
      </FormFrame>
    );
  if (kind === "room") return <ConversationMutationOverlay {...props} selectedTarget={null} />;
  if (kind === "thread")
    return (
      <ThreadForm
        rooms={rooms}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          props.finish(() => {
            props.store.conversations.createThread(
              props.company.id,
              input.roomId,
              input.title,
              "human",
            );
          }, "Conversation thread created and audited");
        }}
      />
    );
  return (
    <MessageForm
      rooms={rooms}
      threads={threads}
      terminalWidth={props.terminalWidth}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(() => {
          props.store.addMessage(
            props.company.id,
            input.roomId,
            input.authorId,
            input.body,
            input.threadId,
          );
        }, "Message persisted and audited");
      }}
    />
  );
}
