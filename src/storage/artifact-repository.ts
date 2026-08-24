import { randomUUID } from "node:crypto";
import type { WorkforceDatabase } from "./database.js";
import { parseJson } from "./serialization.js";
import type {
  ArtifactRecord,
  ValidatorReceipt,
  ValidatorStatus,
} from "../acceptance/artifact-types.js";

export class ArtifactRepository {
  constructor(private readonly database: WorkforceDatabase) {}

  add(input: Omit<ArtifactRecord, "id" | "createdAt">): ArtifactRecord {
    const record = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    this.database.connection
      .prepare("INSERT INTO artifacts VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(
        record.id,
        record.companyId,
        record.taskId,
        record.attemptId,
        record.relativePath,
        record.mediaType,
        record.sizeBytes,
        record.sha256,
        record.storagePath,
        record.createdAt,
      );
    return record;
  }

  addReceipt(input: {
    companyId: string;
    taskId: string;
    attemptId: string;
    artifactId?: string;
    validator: string;
    status: ValidatorStatus;
    details: Record<string, unknown>;
  }): ValidatorReceipt {
    const receipt: ValidatorReceipt = {
      ...input,
      id: randomUUID(),
      artifactId: input.artifactId ?? null,
      observedAt: new Date().toISOString(),
    };
    this.database.connection
      .prepare("INSERT INTO validator_receipts VALUES (?,?,?,?,?,?,?,?,?)")
      .run(
        receipt.id,
        receipt.companyId,
        receipt.taskId,
        receipt.attemptId,
        receipt.artifactId,
        receipt.validator,
        receipt.status,
        JSON.stringify(receipt.details),
        receipt.observedAt,
      );
    return receipt;
  }

  list(attemptId: string): ArtifactRecord[] {
    return (
      this.database.connection
        .prepare("SELECT * FROM artifacts WHERE attempt_id=? ORDER BY relative_path")
        .all(attemptId) as Record<string, unknown>[]
    ).map((row) => this.mapArtifact(row));
  }

  receipts(attemptId: string): ValidatorReceipt[] {
    return (
      this.database.connection
        .prepare("SELECT * FROM validator_receipts WHERE attempt_id=? ORDER BY observed_at")
        .all(attemptId) as Record<string, unknown>[]
    ).map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      taskId: String(row.task_id),
      attemptId: String(row.attempt_id),
      artifactId: typeof row.artifact_id === "string" ? row.artifact_id : null,
      validator: String(row.validator),
      status: String(row.status) as ValidatorStatus,
      details: parseJson(row.details_json),
      observedAt: String(row.observed_at),
    }));
  }

  private mapArtifact(row: Record<string, unknown>): ArtifactRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      taskId: String(row.task_id),
      attemptId: String(row.attempt_id),
      relativePath: String(row.relative_path),
      mediaType: String(row.media_type),
      sizeBytes: Number(row.size_bytes),
      sha256: String(row.sha256),
      storagePath: String(row.storage_path),
      createdAt: String(row.created_at),
    };
  }
}
