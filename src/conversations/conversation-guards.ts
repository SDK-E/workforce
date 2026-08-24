import type { WorkforceDatabase } from "../storage/database.js";

export function requireRoom(database: WorkforceDatabase, companyId: string, roomId: string): void {
  const room = database.connection
    .prepare("SELECT 1 FROM rooms WHERE company_id = ? AND id = ?")
    .get(companyId, roomId);
  if (!room) throw new Error(`Unknown room in company: ${roomId}`);
}

export function requireMessage(
  database: WorkforceDatabase,
  companyId: string,
  messageId: string,
): Record<string, unknown> {
  const message = database.connection
    .prepare("SELECT * FROM messages WHERE company_id = ? AND id = ?")
    .get(companyId, messageId) as Record<string, unknown> | undefined;
  if (!message) throw new Error(`Unknown message in company: ${messageId}`);
  return message;
}
