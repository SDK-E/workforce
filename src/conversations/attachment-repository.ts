import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { requireMessage } from "./conversation-guards.js";
import type { AttachmentRecord } from "./conversation-types.js";

export interface CreateAttachmentInput {
  companyId: string;
  messageId: string;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  digest: string;
  artifactUri: string;
  createdBy: string;
}

export class AttachmentRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  create(input: CreateAttachmentInput): AttachmentRecord {
    requireMessage(this.database, input.companyId, input.messageId);
    if (input.sizeBytes < 0 || !/^[a-f0-9]{64}$/i.test(input.digest))
      throw new Error("Attachment size or SHA-256 digest is invalid");
    const attachment: AttachmentRecord = {
      ...input,
      id: randomUUID(),
      filename: sanitizeTerminal(input.filename, 255),
      mediaType: sanitizeTerminal(input.mediaType, 100),
      artifactUri: sanitizeTerminal(input.artifactUri, 2_000),
      createdAt: new Date().toISOString(),
    };
    if (!attachment.filename || !attachment.mediaType || !attachment.artifactUri)
      throw new Error("Attachment metadata is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO attachments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          attachment.id,
          attachment.companyId,
          attachment.messageId,
          attachment.filename,
          attachment.mediaType,
          attachment.sizeBytes,
          attachment.digest,
          attachment.artifactUri,
          attachment.createdBy,
          attachment.createdAt,
        );
      this.audit.append("attachment.created", input.createdBy, input.companyId, {
        attachmentId: attachment.id,
        messageId: input.messageId,
        digest: input.digest,
      });
    });
    return attachment;
  }

  list(companyId: string, messageId: string): AttachmentRecord[] {
    requireMessage(this.database, companyId, messageId);
    const rows = this.database.connection
      .prepare("SELECT * FROM attachments WHERE company_id=? AND message_id=? ORDER BY created_at")
      .all(companyId, messageId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      messageId: String(row.message_id),
      filename: String(row.filename),
      mediaType: String(row.media_type),
      sizeBytes: Number(row.size_bytes),
      digest: String(row.digest),
      artifactUri: String(row.artifact_uri),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
    }));
  }
}
