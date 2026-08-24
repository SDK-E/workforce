import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import type { MailRecord } from "./integration-types.js";

type MailParty =
  | Pick<MailRecord, "senderKind" | "senderId">
  | Pick<MailRecord, "recipientKind" | "recipientId">;

export class MailRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  send(input: {
    companyId: string;
    senderKind: MailRecord["senderKind"];
    senderId: string;
    recipientKind: MailRecord["recipientKind"];
    recipientId: string;
    subject: string;
    body: string;
  }): MailRecord {
    this.requireParty(input.companyId, { senderKind: input.senderKind, senderId: input.senderId });
    this.requireParty(input.companyId, {
      recipientKind: input.recipientKind,
      recipientId: input.recipientId,
    });
    const now = new Date().toISOString();
    const record: MailRecord = {
      id: randomUUID(),
      ...input,
      subject: sanitizeTerminal(input.subject, 300),
      body: sanitizeTerminal(input.body, 20_000),
      status: "sent",
      createdAt: now,
      readAt: null,
      updatedAt: now,
    };
    if (!record.subject || !record.body) throw new Error("Mail needs a subject and body");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO agent_mail VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.senderKind,
          record.senderId,
          record.recipientKind,
          record.recipientId,
          record.subject,
          record.body,
          record.status,
          record.createdAt,
          null,
          record.updatedAt,
        );
      this.audit.append("mail.sent", record.senderId, record.companyId, {
        mailId: record.id,
        recipientKind: record.recipientKind,
        recipientId: record.recipientId,
      });
    });
    return record;
  }

  inbox(
    companyId: string,
    recipientKind: MailRecord["recipientKind"],
    recipientId: string,
    includeArchived = false,
  ): MailRecord[] {
    this.requireParty(companyId, { recipientKind, recipientId });
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM agent_mail WHERE company_id=? AND recipient_kind=? AND recipient_id=?
         ${includeArchived ? "" : "AND status!='archived'"} ORDER BY created_at DESC LIMIT 200`,
      )
      .all(companyId, recipientKind, recipientId) as Record<string, unknown>[];
    return rows.map(mapMail);
  }

  markRead(companyId: string, id: string, actorId: string): MailRecord {
    return this.setStatus(companyId, id, "read", actorId);
  }

  archive(companyId: string, id: string, actorId: string): MailRecord {
    return this.setStatus(companyId, id, "archived", actorId);
  }

  restore(companyId: string, id: string, actorId: string): MailRecord {
    return this.setStatus(companyId, id, "sent", actorId);
  }

  private setStatus(
    companyId: string,
    id: string,
    status: MailRecord["status"],
    actorId: string,
  ): MailRecord {
    const current = this.get(companyId, id);
    const now = new Date().toISOString();
    const readAt = status === "read" ? now : current.readAt;
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "UPDATE agent_mail SET status=?,read_at=?,updated_at=? WHERE company_id=? AND id=?",
        )
        .run(status, readAt, now, companyId, id);
      this.audit.append(`mail.${status}`, actorId, companyId, { mailId: id });
    });
    return { ...current, status, readAt, updatedAt: now };
  }

  private get(companyId: string, id: string): MailRecord {
    const row = this.database.connection
      .prepare("SELECT * FROM agent_mail WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown mail: ${id}`);
    return mapMail(row);
  }

  private requireParty(companyId: string, party: MailParty): void {
    const kind = "senderKind" in party ? party.senderKind : party.recipientKind;
    const id = "senderId" in party ? party.senderId : party.recipientId;
    if (kind === "human") {
      if (!id.trim()) throw new Error("Human mail identity is required");
      return;
    }
    const exists = this.database.connection
      .prepare("SELECT 1 FROM employees WHERE company_id=? AND id=? AND status!='terminated'")
      .get(companyId, id);
    if (!exists) throw new Error(`Unknown active agent mail identity: ${id}`);
  }
}

function mapMail(row: Record<string, unknown>): MailRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    senderKind: String(row.sender_kind) as MailRecord["senderKind"],
    senderId: String(row.sender_id),
    recipientKind: String(row.recipient_kind) as MailRecord["recipientKind"],
    recipientId: String(row.recipient_id),
    subject: String(row.subject),
    body: String(row.body),
    status: String(row.status) as MailRecord["status"],
    createdAt: String(row.created_at),
    readAt: typeof row.read_at === "string" ? row.read_at : null,
    updatedAt: String(row.updated_at),
  };
}
