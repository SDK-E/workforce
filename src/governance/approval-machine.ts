import { createMachine, transition } from "xstate";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalEvent = "APPROVE" | "REJECT";

const machine = createMachine({
  id: "approval",
  initial: "pending",
  states: {
    pending: { on: { APPROVE: "approved", REJECT: "rejected" } },
    approved: { type: "final" },
    rejected: { type: "final" },
  },
});

export function nextApprovalStatus(current: ApprovalStatus, event: ApprovalEvent): ApprovalStatus {
  const snapshot = machine.resolveState({ value: current, context: {} });
  const [next] = transition(machine, snapshot, { type: event });
  if (next.value === current) throw new Error(`Approval cannot handle ${event} while ${current}`);
  return next.value as ApprovalStatus;
}
