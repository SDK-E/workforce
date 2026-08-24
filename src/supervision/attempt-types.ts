import type { SandboxSpec } from "../domain.js";

export type AttemptStatus =
  | "queued"
  | "starting"
  | "running"
  | "succeeded"
  | "failed"
  | "timed-out"
  | "interrupted"
  | "infrastructure-blocked";

export interface AttemptRequest {
  id: string;
  companyId: string;
  taskId: string;
  employeeId: string;
  sandbox: SandboxSpec;
  command: string[];
  secretNames: string[];
}

export interface AttemptRecord extends AttemptRequest {
  status: AttemptStatus;
  containerName: string;
  exitCode: number | null;
  failureReason: string | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

export interface AttemptResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}
