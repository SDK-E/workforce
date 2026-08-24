import { createMachine, transition } from "xstate";
import type { TaskEvent, TaskStatus } from "./task-types.js";

const terminalTransitions = { ARCHIVE: "archived" } as const;

export const taskMachine = createMachine({
  id: "task",
  initial: "draft",
  states: {
    draft: {
      on: {
        REQUEST_CLARIFICATION: "clarifying",
        REQUEST_APPROVAL: "awaiting-approval",
        CANCEL: "cancelled",
      },
    },
    clarifying: { on: { REQUEST_APPROVAL: "awaiting-approval", CANCEL: "cancelled" } },
    "awaiting-approval": { on: { APPROVE: "ready", REJECT: "rejected", CANCEL: "cancelled" } },
    ready: { on: { ASSIGN: "assigned", CANCEL: "cancelled" } },
    assigned: { on: { START: "starting", PAUSE: "paused", CANCEL: "cancelled" } },
    starting: {
      on: { INVESTIGATE: "investigating", PLAN: "planning", BLOCK: "blocked", FAIL: "failed" },
    },
    investigating: {
      on: {
        PLAN: "planning",
        IMPLEMENT: "implementing",
        WAIT_DEPENDENCY: "waiting-dependency",
        BLOCK: "blocked",
        FAIL: "failed",
      },
    },
    planning: {
      on: {
        IMPLEMENT: "implementing",
        WAIT_MESSAGE: "waiting-message",
        BLOCK: "blocked",
        FAIL: "failed",
      },
    },
    implementing: {
      on: {
        VERIFY: "verifying",
        WAIT_DEPENDENCY: "waiting-dependency",
        WAIT_MESSAGE: "waiting-message",
        BLOCK: "blocked",
        PAUSE: "paused",
        MARK_STALE: "stale",
        FAIL: "failed",
      },
    },
    verifying: {
      on: {
        IMPLEMENT: "implementing",
        REQUEST_REVIEW: "review-required",
        BLOCK: "blocked",
        FAIL: "failed",
      },
    },
    "waiting-dependency": {
      on: { IMPLEMENT: "implementing", RECOVER: "recovering", CANCEL: "cancelled" },
    },
    "waiting-message": { on: { IMPLEMENT: "implementing", CANCEL: "cancelled" } },
    "waiting-approval": {
      on: { APPROVE: "implementing", REJECT: "rejected", CANCEL: "cancelled" },
    },
    blocked: { on: { RECOVER: "recovering", PAUSE: "paused", CANCEL: "cancelled" } },
    paused: { on: { RECOVER: "recovering", CANCEL: "cancelled" } },
    stale: { on: { RECOVER: "recovering", CANCEL: "cancelled" } },
    recovering: { on: { RETRY: "retrying", BLOCK: "blocked", FAIL: "failed" } },
    retrying: { on: { INVESTIGATE: "investigating", IMPLEMENT: "implementing", FAIL: "failed" } },
    "review-required": {
      on: { COMPLETE: "completed", REJECT: "rejected", IMPLEMENT: "implementing" },
    },
    completed: { on: terminalTransitions },
    rejected: { on: terminalTransitions },
    failed: { on: { RETRY: "retrying", ...terminalTransitions } },
    cancelled: { on: terminalTransitions },
    archived: { type: "final" },
  },
});

export function nextTaskStatus(current: TaskStatus, event: TaskEvent): TaskStatus {
  const snapshot = taskMachine.resolveState({ value: current, context: {} });
  const [next] = transition(taskMachine, snapshot, { type: event });
  if (next.value === current) throw new Error(`Task cannot handle ${event} while ${current}`);
  return next.value as TaskStatus;
}
