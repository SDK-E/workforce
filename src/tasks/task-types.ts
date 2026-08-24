export type TaskStatus =
  | "draft"
  | "clarifying"
  | "awaiting-approval"
  | "ready"
  | "assigned"
  | "starting"
  | "investigating"
  | "planning"
  | "implementing"
  | "verifying"
  | "waiting-dependency"
  | "waiting-message"
  | "waiting-approval"
  | "blocked"
  | "paused"
  | "stale"
  | "recovering"
  | "retrying"
  | "review-required"
  | "completed"
  | "rejected"
  | "failed"
  | "cancelled"
  | "archived";
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
  priority: number;
  dueAt: string | null;
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
  priority?: number;
  dueAt?: string | null;
}

export interface TaskRequirementVersion {
  companyId: string;
  taskId: string;
  version: number;
  objective: string;
  nonGoals: string[];
  acceptanceCriteria: string[];
  capabilities: string[];
  networkPolicy: Record<string, unknown>;
  resourcePolicy: Record<string, unknown>;
  changedBy: string;
  changeReason: string;
  checkpointId: string | null;
  createdAt: string;
}

export interface UpdateTaskRequirementsInput {
  companyId: string;
  taskId: string;
  objective: string;
  nonGoals: string[];
  acceptanceCriteria: string[];
  capabilities: string[];
  networkPolicy: Record<string, unknown>;
  resourcePolicy: Record<string, unknown>;
  changedBy: string;
  changeReason: string;
  checkpointId?: string | null;
}
