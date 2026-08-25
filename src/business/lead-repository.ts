import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import type { LeadRecord } from "./business-types.js";

export class LeadRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(
    input: Omit<LeadRecord, "id" | "status" | "createdAt" | "updatedAt">,
    actorId: string,
  ): LeadRecord {
    this.companies.require(input.companyId);
    if (input.opportunityId) this.requireOpportunity(input.companyId, input.opportunityId);
    this.requireOwner(input.companyId, input.ownerId);
    validateScore(input.qualificationScore);
    const now = new Date().toISOString();
    const record: LeadRecord = {
      ...input,
      id: randomUUID(),
      name: required(input.name, "Lead name", 300),
      organization: required(input.organization, "Lead organization", 300),
      source: required(input.source, "Lead source", 500),
      notes: sanitizeTerminal(input.notes, 10_000),
      status: "new",
      createdAt: now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.opportunityId,
          record.name,
          record.organization,
          record.email,
          record.website,
          record.source,
          record.qualificationScore,
          record.status,
          record.ownerId,
          record.notes,
          now,
          now,
        );
      this.audit.append("lead.created", actorId, record.companyId, {
        leadId: record.id,
        opportunityId: record.opportunityId,
      });
    });
    return record;
  }

  update(
    companyId: string,
    id: string,
    patch: Partial<
      Pick<
        LeadRecord,
        | "name"
        | "organization"
        | "email"
        | "website"
        | "source"
        | "qualificationScore"
        | "status"
        | "ownerId"
        | "notes"
      >
    >,
    actorId: string,
  ): LeadRecord {
    const current = this.require(companyId, id);
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.requireOwner(companyId, next.ownerId);
    validateScore(next.qualificationScore);
    next.name = required(next.name, "Lead name", 300);
    next.organization = required(next.organization, "Lead organization", 300);
    next.source = required(next.source, "Lead source", 500);
    next.notes = sanitizeTerminal(next.notes, 10_000);
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE leads SET name=?,organization=?,email=?,website=?,source=?,qualification_score=?,
          status=?,owner_id=?,notes=?,updated_at=? WHERE company_id=? AND id=?`,
        )
        .run(
          next.name,
          next.organization,
          next.email,
          next.website,
          next.source,
          next.qualificationScore,
          next.status,
          next.ownerId,
          next.notes,
          next.updatedAt,
          companyId,
          id,
        );
      this.audit.append("lead.updated", actorId, companyId, { leadId: id });
    });
    return next;
  }

  archive(companyId: string, id: string, actorId: string): LeadRecord {
    return this.update(companyId, id, { status: "archived" }, actorId);
  }
  restore(companyId: string, id: string, actorId: string): LeadRecord {
    return this.update(companyId, id, { status: "new" }, actorId);
  }
  get(companyId: string, id: string): LeadRecord | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM leads WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    return row ? mapLead(row) : undefined;
  }
  list(
    companyId: string,
    options: {
      query?: string;
      status?: LeadRecord["status"];
      limit?: number;
      offset?: number;
    } = {},
  ): LeadRecord[] {
    this.companies.require(companyId);
    const query = `%${options.query?.trim() ?? ""}%`;
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM leads WHERE company_id=? AND (? IS NULL OR status=?)
      AND (name LIKE ? OR organization LIKE ? OR source LIKE ?) ORDER BY qualification_score DESC,updated_at DESC LIMIT ? OFFSET ?`,
      )
      .all(
        companyId,
        options.status ?? null,
        options.status ?? null,
        query,
        query,
        query,
        limit,
        offset,
      ) as Record<string, unknown>[];
    return rows.map(mapLead);
  }

  private require(companyId: string, id: string): LeadRecord {
    const record = this.get(companyId, id);
    if (!record) throw new Error(`Unknown lead in company: ${id}`);
    return record;
  }
  private requireOpportunity(companyId: string, id: string): void {
    if (
      !this.database.connection
        .prepare("SELECT 1 FROM opportunities WHERE company_id=? AND id=?")
        .get(companyId, id)
    )
      throw new Error(`Unknown opportunity in company: ${id}`);
  }
  private requireOwner(companyId: string, ownerId: string | null): void {
    if (ownerId && !this.companies.employees(companyId).some(({ id }) => id === ownerId))
      throw new Error(`Unknown lead owner in company: ${ownerId}`);
  }
}

function mapLead(row: Record<string, unknown>): LeadRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    opportunityId: typeof row.opportunity_id === "string" ? row.opportunity_id : null,
    name: String(row.name),
    organization: String(row.organization),
    email: typeof row.email === "string" ? row.email : null,
    website: typeof row.website === "string" ? row.website : null,
    source: String(row.source),
    qualificationScore: Number(row.qualification_score),
    status: String(row.status) as LeadRecord["status"],
    ownerId: typeof row.owner_id === "string" ? row.owner_id : null,
    notes: String(row.notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
function required(value: string, label: string, length: number): string {
  const result = sanitizeTerminal(value, length);
  if (!result) throw new Error(`${label} is required`);
  return result;
}
function validateScore(score: number): void {
  if (!Number.isInteger(score) || score < 0 || score > 100)
    throw new Error("Qualification score must be an integer from 0 to 100");
}
