import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { parseJson } from "../storage/serialization.js";
import type { EngagementRecord } from "./business-types.js";

export class EngagementRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(
    input: Omit<EngagementRecord, "id" | "status" | "createdAt" | "updatedAt">,
    actorId: string,
  ): EngagementRecord {
    this.companies.require(input.companyId);
    this.requireClient(input.companyId, input.clientId);
    if (input.successCriteria.length === 0)
      throw new Error("Engagement success criteria are required");
    const now = new Date().toISOString();
    const record: EngagementRecord = {
      ...input,
      id: randomUUID(),
      name: required(input.name, "Engagement name", 300),
      scope: required(input.scope, "Engagement scope", 10_000),
      status: "proposed",
      createdAt: now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO engagements VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.clientId,
          record.projectId,
          record.name,
          record.status,
          record.scope,
          JSON.stringify(record.successCriteria),
          record.ownerId,
          record.startsAt,
          record.endsAt,
          now,
          now,
        );
      this.audit.append("engagement.created", actorId, record.companyId, {
        engagementId: record.id,
        clientId: record.clientId,
      });
    });
    return record;
  }

  update(
    companyId: string,
    id: string,
    patch: Partial<
      Pick<
        EngagementRecord,
        "name" | "status" | "scope" | "successCriteria" | "ownerId" | "startsAt" | "endsAt"
      >
    >,
    actorId: string,
  ): EngagementRecord {
    const current = this.require(companyId, id);
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    next.name = required(next.name, "Engagement name", 300);
    next.scope = required(next.scope, "Engagement scope", 10_000);
    if (next.successCriteria.length === 0)
      throw new Error("Engagement success criteria are required");
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE engagements SET name=?,status=?,scope=?,success_criteria_json=?,owner_id=?,starts_at=?,ends_at=?,updated_at=? WHERE company_id=? AND id=?`,
        )
        .run(
          next.name,
          next.status,
          next.scope,
          JSON.stringify(next.successCriteria),
          next.ownerId,
          next.startsAt,
          next.endsAt,
          next.updatedAt,
          companyId,
          id,
        );
      this.audit.append("engagement.updated", actorId, companyId, { engagementId: id });
    });
    return next;
  }

  archive(companyId: string, id: string, actorId: string): EngagementRecord {
    return this.update(companyId, id, { status: "archived" }, actorId);
  }
  restore(companyId: string, id: string, actorId: string): EngagementRecord {
    return this.update(companyId, id, { status: "proposed" }, actorId);
  }
  get(companyId: string, id: string): EngagementRecord | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM engagements WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    return row ? mapEngagement(row) : undefined;
  }
  list(
    companyId: string,
    options: {
      query?: string;
      status?: EngagementRecord["status"];
      limit?: number;
      offset?: number;
    } = {},
  ): EngagementRecord[] {
    this.companies.require(companyId);
    const query = `%${options.query?.trim() ?? ""}%`;
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM engagements WHERE company_id=? AND (? IS NULL OR status=?)
      AND (name LIKE ? OR scope LIKE ?) ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      )
      .all(
        companyId,
        options.status ?? null,
        options.status ?? null,
        query,
        query,
        limit,
        offset,
      ) as Record<string, unknown>[];
    return rows.map(mapEngagement);
  }

  private require(companyId: string, id: string): EngagementRecord {
    const record = this.get(companyId, id);
    if (!record) throw new Error(`Unknown engagement in company: ${id}`);
    return record;
  }
  private requireClient(companyId: string, id: string): void {
    if (
      !this.database.connection
        .prepare("SELECT 1 FROM clients WHERE company_id=? AND id=?")
        .get(companyId, id)
    )
      throw new Error(`Unknown client in company: ${id}`);
  }
}

function mapEngagement(row: Record<string, unknown>): EngagementRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    clientId: String(row.client_id),
    projectId: typeof row.project_id === "string" ? row.project_id : null,
    name: String(row.name),
    status: String(row.status) as EngagementRecord["status"],
    scope: String(row.scope),
    successCriteria: parseJson(row.success_criteria_json),
    ownerId: typeof row.owner_id === "string" ? row.owner_id : null,
    startsAt: typeof row.starts_at === "string" ? row.starts_at : null,
    endsAt: typeof row.ends_at === "string" ? row.ends_at : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
function required(value: string, label: string, length: number): string {
  const result = sanitizeTerminal(value, length);
  if (!result) throw new Error(`${label} is required`);
  return result;
}
