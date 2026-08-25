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
  ephemeralSecretNames: string[];
  environment?: Record<string, string>;
  instructionRevision?: number | null;
  instructionDigest?: string | null;
}

export interface AttemptRecord extends AttemptRequest {
  environment: Record<string, string>;
  instructionRevision: number | null;
  instructionDigest: string | null;
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

export interface AttemptEventRecord {
  sequence: number;
  attemptId: string;
  taskId: string;
  employeeId: string;
  at: string;
  kind: string;
  data: Record<string, unknown>;
}
