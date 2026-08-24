import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { requireMessage, requireRoom } from "./conversation-guards.js";
import type { MessagePage, MessageRecord } from "./conversation-types.js";
import type { ThreadRepository } from "./thread-repository.js";

export class MessageRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly threads: ThreadRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(
    companyId: string,
    roomId: string,
    authorId: string,
    body: string,
    threadId: string | null = null,
  ): MessageRecord {
    requireRoom(this.database, companyId, roomId);
    if (threadId) this.threads.require(companyId, roomId, threadId);
    const now = new Date().toISOString();
    const safeBody = sanitizeTerminal(body);
    if (!safeBody) throw new Error("Message body is required");
    const id = randomUUID();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO messages
           (id,company_id,room_id,thread_id,author_id,body,pinned,created_at,status,updated_at)
           VALUES (?,?,?,?,?,?,0,?,'sent',?)`,
        )
        .run(id, companyId, roomId, threadId, sanitizeTerminal(authorId, 100), safeBody, now, now);
      this.audit.append("message.created", authorId, companyId, {
        messageId: id,
        roomId,
        threadId,
      });
    });
    return this.get(companyId, id);
  }

  edit(companyId: string, messageId: string, actorId: string, body: string): MessageRecord {
    const current = requireMessage(this.database, companyId, messageId);
    if (String(current.status) === "redacted")
      throw new Error("Redacted messages cannot be edited");
    const safeBody = sanitizeTerminal(body);
    if (!safeBody) throw new Error("Message body is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "UPDATE messages SET body=?, status='edited', updated_at=? WHERE company_id=? AND id=?",
        )
        .run(safeBody, new Date().toISOString(), companyId, messageId);
      this.audit.append("message.edited", actorId, companyId, { messageId });
    });
    return this.get(companyId, messageId);
  }

  redact(companyId: string, messageId: string, actorId: string, reason: string): MessageRecord {
    requireMessage(this.database, companyId, messageId);
    const safeReason = sanitizeTerminal(reason, 500);
    if (!safeReason) throw new Error("Redaction reason is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE messages SET body='[redacted]', status='redacted', updated_at=?,
           redacted_by=?, redaction_reason=? WHERE company_id=? AND id=?`,
        )
        .run(new Date().toISOString(), actorId, safeReason, companyId, messageId);
      this.audit.append("message.redacted", actorId, companyId, { messageId, reason: safeReason });
    });
    return this.get(companyId, messageId);
  }

  pin(companyId: string, roomId: string, messageId: string, actorId: string): void {
    const message = requireMessage(this.database, companyId, messageId);
    if (String(message.room_id) !== roomId) throw new Error("Message is not in the requested room");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT OR IGNORE INTO room_pins VALUES (?, ?, ?, ?, ?)")
        .run(companyId, roomId, messageId, actorId, new Date().toISOString());
      this.database.connection.prepare("UPDATE messages SET pinned=1 WHERE id=?").run(messageId);
      this.audit.append("message.pinned", actorId, companyId, { roomId, messageId });
    });
  }

  search(companyId: string, roomId: string, query = "", limit = 50, before?: string): MessagePage {
    requireRoom(this.database, companyId, roomId);
    const bounded = Math.min(Math.max(limit, 1), 100);
    const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM messages WHERE company_id=? AND room_id=? AND body LIKE ? ESCAPE '\\'
         AND (? IS NULL OR created_at < ?) ORDER BY created_at DESC LIMIT ?`,
      )
      .all(companyId, roomId, pattern, before ?? null, before ?? null, bounded + 1) as Record<
      string,
      unknown
    >[];
    const page = rows.slice(0, bounded);
    return {
      items: page.reverse().map((row) => this.map(row)),
      nextCursor: rows.length > bounded ? String(page[0]?.created_at) : null,
    };
  }

  get(companyId: string, messageId: string): MessageRecord {
    return this.map(requireMessage(this.database, companyId, messageId));
  }

  private map(row: Record<string, unknown>): MessageRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      roomId: String(row.room_id),
      threadId: typeof row.thread_id === "string" ? row.thread_id : null,
      authorId: String(row.author_id),
      body: String(row.body),
      pinned: Number(row.pinned) === 1,
      status: String(row.status) as MessageRecord["status"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at ?? row.created_at),
      redactedBy: typeof row.redacted_by === "string" ? row.redacted_by : null,
      redactionReason: typeof row.redaction_reason === "string" ? row.redaction_reason : null,
    };
  }
}
