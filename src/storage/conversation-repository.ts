import { randomUUID } from "node:crypto";
import type { AuditRepository } from "./audit-repository.js";
import type { CompanyRepository } from "./company-repository.js";
import type { WorkforceDatabase } from "./database.js";
import type { MessageRecord } from "./records.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";

export class ConversationRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  addMessage(
    companyId: string,
    roomId: string,
    authorId: string,
    body: string,
    threadId: string | null = null,
  ): MessageRecord {
    this.companies.require(companyId);
    const message: MessageRecord = {
      id: randomUUID(),
      companyId,
      roomId,
      threadId,
      authorId: sanitizeTerminal(authorId, 100),
      body: sanitizeTerminal(body),
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          message.id,
          companyId,
          roomId,
          threadId,
          message.authorId,
          message.body,
          0,
          message.createdAt,
        );
      this.audit.append("message.created", message.authorId, companyId, {
        messageId: message.id,
        roomId,
        threadId,
      });
    });
    return message;
  }

  messages(companyId: string, roomId: string, limit = 100): MessageRecord[] {
    const rows = this.database.connection
      .prepare(
        "SELECT * FROM messages WHERE company_id = ? AND room_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(companyId, roomId, limit) as Record<string, unknown>[];
    return rows.reverse().map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      roomId: String(row.room_id),
      threadId: typeof row.thread_id === "string" ? row.thread_id : null,
      authorId: String(row.author_id),
      body: String(row.body),
      createdAt: String(row.created_at),
      pinned: Number(row.pinned) === 1,
    }));
  }
}
