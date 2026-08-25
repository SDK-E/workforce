import { randomUUID } from "node:crypto";
import type { AuditRepository } from "./audit-repository.js";
import type { WorkforceDatabase } from "./database.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";

export interface ArtifactReferenceRecord {
  id: string;
  companyId: string;
  taskId: string;
  attemptId: string;
  artifactId: string;
  createdBy: string;
  note: string;
  createdAt: string;
}

export class ArtifactReferenceRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  create(input: Omit<ArtifactReferenceRecord, "id" | "createdAt">): ArtifactReferenceRecord {
    const artifact = this.database.connection
      .prepare("SELECT 1 FROM artifacts WHERE id=? AND company_id=? AND task_id=? AND attempt_id=?")
      .get(input.artifactId, input.companyId, input.taskId, input.attemptId);
    if (!artifact) {
      throw new Error("Artifact reference must target a validated artifact from this attempt");
    }
    const record = {
      ...input,
      id: randomUUID(),
      note: sanitizeTerminal(input.note, 2_000),
      createdAt: new Date().toISOString(),
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO artifact_references VALUES (?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.taskId,
          record.attemptId,
          record.artifactId,
          record.createdBy,
          record.note,
          record.createdAt,
        );
      this.audit.append("artifact.referenced", input.createdBy, input.companyId, {
        artifactReferenceId: record.id,
        artifactId: input.artifactId,
        taskId: input.taskId,
      });
    });
    return record;
  }
}
