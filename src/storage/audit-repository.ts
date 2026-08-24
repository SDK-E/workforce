import { createHash, randomUUID } from "node:crypto";
import type { WorkforceEvent } from "../domain.js";
import { parseJson } from "./serialization.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";
import type { WorkforceDatabase } from "./database.js";

const GENESIS_HASH = "GENESIS";

export class AuditRepository {
  constructor(private readonly database: WorkforceDatabase) {}

  append(
    type: string,
    actor: string,
    companyId: string,
    data: Record<string, unknown>,
  ): WorkforceEvent {
    const previous = this.database.connection
      .prepare("SELECT hash FROM events ORDER BY sequence DESC LIMIT 1")
      .get() as { hash: string } | undefined;
    const event: WorkforceEvent = {
      id: randomUUID(),
      at: new Date().toISOString(),
      type: sanitizeTerminal(type, 100),
      actor: sanitizeTerminal(actor, 100),
      organizationId: companyId,
      data,
    };
    const previousHash = previous?.hash ?? GENESIS_HASH;
    const hash = this.hash(previousHash, event);
    this.database.connection
      .prepare(
        `INSERT INTO events
      (id, at, type, actor, company_id, data_json, previous_hash, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.id,
        event.at,
        event.type,
        event.actor,
        companyId,
        JSON.stringify(data),
        previousHash,
        hash,
      );
    return event;
  }

  list(companyId?: string, limit = 500): WorkforceEvent[] {
    const rows = (
      companyId
        ? this.database.connection
            .prepare("SELECT * FROM events WHERE company_id = ? ORDER BY sequence DESC LIMIT ?")
            .all(companyId, limit)
        : this.database.connection
            .prepare("SELECT * FROM events ORDER BY sequence DESC LIMIT ?")
            .all(limit)
    ) as Record<string, unknown>[];
    return rows.reverse().map((row) => this.map(row));
  }

  count(companyId: string): number {
    const row = this.database.connection
      .prepare("SELECT count(*) AS count FROM events WHERE company_id = ?")
      .get(companyId) as { count: number };
    return row.count;
  }

  verifyChain(): boolean {
    const rows = this.database.connection
      .prepare("SELECT * FROM events ORDER BY sequence")
      .all() as Record<string, unknown>[];
    let previousHash = GENESIS_HASH;
    for (const row of rows) {
      const event = this.map(row);
      if (row.previous_hash !== previousHash || row.hash !== this.hash(previousHash, event))
        return false;
      previousHash = row.hash;
    }
    return true;
  }

  private hash(previousHash: string, event: WorkforceEvent): string {
    return createHash("sha256")
      .update(`${previousHash}\n${JSON.stringify(event)}`)
      .digest("hex");
  }

  private map(row: Record<string, unknown>): WorkforceEvent {
    return {
      id: String(row.id),
      at: String(row.at),
      type: String(row.type),
      actor: String(row.actor),
      organizationId: String(row.company_id),
      data: parseJson(row.data_json),
    };
  }
}
