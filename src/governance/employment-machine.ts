import { createMachine, transition } from "xstate";
import type { Employee } from "../domain.js";

export type EmploymentEvent =
  | "PROMOTE"
  | "COACH"
  | "RESTRICT"
  | "SUSPEND"
  | "REASSIGN"
  | "ACTIVATE"
  | "TERMINATE"
  | "REINSTATE"
  | "ARCHIVE";

const machine = createMachine({
  id: "employment",
  initial: "probation",
  states: {
    probation: {
      on: {
        PROMOTE: "active",
        RESTRICT: "restricted",
        SUSPEND: "suspended",
        TERMINATE: "terminated",
      },
    },
    active: {
      on: {
        COACH: "coaching",
        RESTRICT: "restricted",
        SUSPEND: "suspended",
        REASSIGN: "reassigned",
        TERMINATE: "terminated",
      },
    },
    coaching: {
      on: {
        ACTIVATE: "active",
        RESTRICT: "restricted",
        SUSPEND: "suspended",
        TERMINATE: "terminated",
      },
    },
    restricted: { on: { ACTIVATE: "active", SUSPEND: "suspended", TERMINATE: "terminated" } },
    suspended: { on: { ACTIVATE: "active", REASSIGN: "reassigned", TERMINATE: "terminated" } },
    reassigned: {
      on: { ACTIVATE: "active", COACH: "coaching", SUSPEND: "suspended", TERMINATE: "terminated" },
    },
    terminated: { on: { REINSTATE: "probation", ARCHIVE: "archived" } },
    archived: { type: "final" },
  },
});

export function nextEmploymentStatus(
  current: Employee["status"],
  event: EmploymentEvent,
): Employee["status"] {
  if (current === "candidate" || current === "proposed")
    throw new Error(`Employee record cannot transition from ${current}`);
  const snapshot = machine.resolveState({ value: current, context: {} });
  const [next] = transition(machine, snapshot, { type: event });
  if (next.value === current) throw new Error(`Employment cannot handle ${event} while ${current}`);
  return next.value as Employee["status"];
}
