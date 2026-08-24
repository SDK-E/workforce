import { randomUUID } from "node:crypto";
import type { AuditRepository } from "./audit-repository.js";
import type { CompanyRepository } from "./company-repository.js";
import type { WorkforceDatabase } from "./database.js";
import type { EntityRecord } from "./records.js";
import { parseJson } from "./serialization.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";

export class EntityRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(
    companyId: string,
    kind: string,
    name: string,
    data: Record<string, unknown> = {},
    parentId: string | null = null,
  ): EntityRecord {
    this.companies.require(companyId);
    const now = new Date().toISOString();
    const entity: EntityRecord = {
      id: randomUUID(),
      companyId,
      kind: sanitizeTerminal(kind, 40),
      parentId,
      name: sanitizeTerminal(name, 200),
      status: "active",
      data,
      createdAt: now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO entities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          entity.id,
          companyId,
          entity.kind,
          parentId,
          entity.name,
          entity.status,
          JSON.stringify(data),
          now,
          now,
        );
      this.audit.append(`${entity.kind}.created`, "human", companyId, {
        id: entity.id,
        name: entity.name,
      });
    });
    return entity;
  }

  list(companyId: string, kind?: string, limit = 100): EntityRecord[] {
    const rows = (
      kind
        ? this.database.connection
            .prepare(
              "SELECT * FROM entities WHERE company_id = ? AND kind = ? ORDER BY updated_at DESC LIMIT ?",
            )
            .all(companyId, kind, limit)
        : this.database.connection
            .prepare("SELECT * FROM entities WHERE company_id = ? ORDER BY updated_at DESC LIMIT ?")
            .all(companyId, limit)
    ) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      kind: String(row.kind),
      parentId: typeof row.parent_id === "string" ? row.parent_id : null,
      name: String(row.name),
      status: String(row.status),
      data: parseJson(row.data_json),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }
}
