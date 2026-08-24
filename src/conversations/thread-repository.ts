import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { requireRoom } from "./conversation-guards.js";
import type { ConversationThread } from "./conversation-types.js";

export class ThreadRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  create(companyId: string, roomId: string, title: string, actorId: string): ConversationThread {
    requireRoom(this.database, companyId, roomId);
    const now = new Date().toISOString();
    const thread: ConversationThread = {
      id: randomUUID(),
      companyId,
      roomId,
      title: sanitizeTerminal(title, 200),
      createdBy: actorId,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    if (!thread.title) throw new Error("Thread title is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO conversation_threads VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(thread.id, companyId, roomId, thread.title, actorId, thread.status, now, now);
      this.audit.append("thread.created", actorId, companyId, { threadId: thread.id, roomId });
    });
    return thread;
  }

  setStatus(
    companyId: string,
    threadId: string,
    status: ConversationThread["status"],
    actorId: string,
  ): void {
    const result = this.database.connection
      .prepare(
        "UPDATE conversation_threads SET status = ?, updated_at = ? WHERE company_id = ? AND id = ?",
      )
      .run(status, new Date().toISOString(), companyId, threadId);
    if (result.changes !== 1) throw new Error(`Unknown thread in company: ${threadId}`);
    this.audit.append("thread.status-changed", actorId, companyId, { threadId, status });
  }

  list(companyId: string, roomId: string, limit = 100): ConversationThread[] {
    requireRoom(this.database, companyId, roomId);
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM conversation_threads WHERE company_id = ? AND room_id = ?
         ORDER BY updated_at DESC LIMIT ?`,
      )
      .all(companyId, roomId, Math.min(Math.max(limit, 1), 100)) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      roomId: String(row.room_id),
      title: String(row.title),
      createdBy: String(row.created_by),
      status: String(row.status) as ConversationThread["status"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  require(companyId: string, roomId: string, threadId: string): void {
    const row = this.database.connection
      .prepare("SELECT 1 FROM conversation_threads WHERE company_id = ? AND room_id = ? AND id = ?")
      .get(companyId, roomId, threadId);
    if (!row) throw new Error(`Unknown thread in room: ${threadId}`);
  }
}
