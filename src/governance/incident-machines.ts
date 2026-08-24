import { createMachine, transition } from "xstate";

export type IncidentStatus =
  | "reported"
  | "triaged"
  | "investigating"
  | "contained"
  | "resolved"
  | "closed";
export type IncidentEvent = "TRIAGE" | "INVESTIGATE" | "CONTAIN" | "RESOLVE" | "CLOSE";
export type CorrectiveStatus =
  | "drafted"
  | "issued"
  | "acknowledged"
  | "challenged"
  | "resolved"
  | "archived";
export type CorrectiveEvent = "ISSUE" | "ACKNOWLEDGE" | "CHALLENGE" | "RESOLVE" | "ARCHIVE";

const incidentMachine = createMachine({
  id: "incident",
  initial: "reported",
  states: {
    reported: { on: { TRIAGE: "triaged" } },
    triaged: { on: { INVESTIGATE: "investigating", CONTAIN: "contained" } },
    investigating: { on: { CONTAIN: "contained", RESOLVE: "resolved" } },
    contained: { on: { INVESTIGATE: "investigating", RESOLVE: "resolved" } },
    resolved: { on: { CLOSE: "closed" } },
    closed: { type: "final" },
  },
});
const correctiveMachine = createMachine({
  id: "corrective",
  initial: "drafted",
  states: {
    drafted: { on: { ISSUE: "issued" } },
    issued: { on: { ACKNOWLEDGE: "acknowledged", CHALLENGE: "challenged" } },
    acknowledged: { on: { CHALLENGE: "challenged", RESOLVE: "resolved" } },
    challenged: { on: { RESOLVE: "resolved" } },
    resolved: { on: { ARCHIVE: "archived" } },
    archived: { type: "final" },
  },
});

export function nextIncidentStatus(current: IncidentStatus, event: IncidentEvent): IncidentStatus {
  const [next] = transition(
    incidentMachine,
    incidentMachine.resolveState({ value: current, context: {} }),
    { type: event },
  );
  if (next.value === current) throw new Error(`Incident cannot handle ${event} while ${current}`);
  return next.value as IncidentStatus;
}
export function nextCorrectiveStatus(
  current: CorrectiveStatus,
  event: CorrectiveEvent,
): CorrectiveStatus {
  const [next] = transition(
    correctiveMachine,
    correctiveMachine.resolveState({ value: current, context: {} }),
    { type: event },
  );
  if (next.value === current)
    throw new Error(`Corrective action cannot handle ${event} while ${current}`);
  return next.value as CorrectiveStatus;
}
