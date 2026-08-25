import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { RoomForm } from "./room-form.js";

export function ConversationMutationOverlay(props: {
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  selectedTarget: LifecycleTarget | null;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}) {
  const current =
    props.selectedTarget?.kind === "room"
      ? props.store.conversations
          .roomList(props.company.id)
          .find((room) => room.id === props.selectedTarget?.id)
      : undefined;
  return (
    <RoomForm
      terminalWidth={props.terminalWidth}
      {...(current ? { initial: current } : {})}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(
          () => {
            if (current)
              props.store.conversations.rooms.update(props.company.id, current.id, input, "human");
            else {
              const room = props.store.conversations.rooms.create(
                props.company.id,
                input.name,
                input.kind,
                "human",
              );
              props.store.conversations.rooms.configure(
                props.company.id,
                room.id,
                {
                  retentionDays: input.retentionDays,
                  announcement: input.announcement,
                  status: "active",
                },
                "human",
              );
            }
          },
          `Conversation room ${current ? "updated" : "created"} and audited`,
        );
      }}
    />
  );
}
