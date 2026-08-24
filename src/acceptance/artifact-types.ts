export interface ArtifactRecord {
  id: string;
  companyId: string;
  taskId: string;
  attemptId: string;
  relativePath: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
  storagePath: string;
  createdAt: string;
}

export type ValidatorStatus = "passed" | "failed" | "blocked";

export interface ValidatorReceipt {
  id: string;
  companyId: string;
  taskId: string;
  attemptId: string;
  artifactId: string | null;
  validator: string;
  status: ValidatorStatus;
  details: Record<string, unknown>;
  observedAt: string;
}

export interface ArtifactLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
}

export interface ArtifactSink {
  add(input: Omit<ArtifactRecord, "id" | "createdAt">): ArtifactRecord;
  addReceipt(input: {
    companyId: string;
    taskId: string;
    attemptId: string;
    artifactId?: string;
    validator: string;
    status: ValidatorStatus;
    details: Record<string, unknown>;
  }): ValidatorReceipt;
}
