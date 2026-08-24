export const TASK_STATUSES = [
  "draft",
  "clarifying",
  "awaiting-approval",
  "ready",
  "assigned",
  "starting",
  "investigating",
  "planning",
  "implementing",
  "verifying",
  "waiting-dependency",
  "waiting-message",
  "waiting-approval",
  "blocked",
  "paused",
  "stale",
  "recovering",
  "retrying",
  "review-required",
  "completed",
  "rejected",
  "failed",
  "cancelled",
  "archived",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskEvent =
  | "REQUEST_CLARIFICATION"
  | "REQUEST_APPROVAL"
  | "APPROVE"
  | "ASSIGN"
  | "START"
  | "INVESTIGATE"
  | "PLAN"
  | "IMPLEMENT"
  | "VERIFY"
  | "WAIT_DEPENDENCY"
  | "WAIT_MESSAGE"
  | "WAIT_APPROVAL"
  | "BLOCK"
  | "PAUSE"
  | "MARK_STALE"
  | "RECOVER"
  | "RETRY"
  | "REQUEST_REVIEW"
  | "COMPLETE"
  | "REJECT"
  | "FAIL"
  | "CANCEL"
  | "ARCHIVE";

export interface TaskRecord {
  id: string;
  companyId: string;
  projectId: string | null;
  parentTaskId: string | null;
  objective: string;
  nonGoals: string[];
  acceptanceCriteria: string[];
  status: TaskStatus;
  risk: "low" | "medium" | "high" | "critical";
  dataSensitivity: "public" | "internal" | "confidential" | "restricted";
  capabilities: string[];
  networkPolicy: Record<string, unknown>;
  resourcePolicy: Record<string, unknown>;
  managerId: string;
  assigneeId: string | null;
  reviewerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  id?: string;
  companyId: string;
  projectId?: string | null;
  parentTaskId?: string | null;
  objective: string;
  nonGoals?: string[];
  acceptanceCriteria: string[];
  risk: TaskRecord["risk"];
  dataSensitivity: TaskRecord["dataSensitivity"];
  capabilities?: string[];
  networkPolicy?: Record<string, unknown>;
  resourcePolicy?: Record<string, unknown>;
  managerId: string;
  assigneeId?: string | null;
  reviewerId?: string | null;
}
