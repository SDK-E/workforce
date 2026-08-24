import { createMachine, transition } from "xstate";

export type MeetingStatus = "planned" | "active" | "adjourned" | "cancelled" | "archived";
export type MeetingEvent = "START" | "ADJOURN" | "CANCEL" | "ARCHIVE";

const machine = createMachine({
  id: "meeting",
  initial: "planned",
  states: {
    planned: { on: { START: "active", CANCEL: "cancelled" } },
    active: { on: { ADJOURN: "adjourned", CANCEL: "cancelled" } },
    adjourned: { on: { ARCHIVE: "archived" } },
    cancelled: { on: { ARCHIVE: "archived" } },
    archived: { type: "final" },
  },
});

export function nextMeetingStatus(current: MeetingStatus, event: MeetingEvent): MeetingStatus {
  const snapshot = machine.resolveState({ value: current, context: {} });
  const [next] = transition(machine, snapshot, { type: event });
  if (next.value === current) throw new Error(`Meeting cannot handle ${event} while ${current}`);
  return next.value as MeetingStatus;
}
