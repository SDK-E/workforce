import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import type { ClientRecord } from "./business-types.js";

export class ClientRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(
    input: Omit<ClientRecord, "id" | "status" | "createdAt" | "updatedAt">,
    actorId: string,
  ): ClientRecord {
    this.companies.require(input.companyId);
    if (input.leadId) this.requireLead(input.companyId, input.leadId);
    this.requireOwner(input.companyId, input.ownerId);
    const now = new Date().toISOString();
    const record: ClientRecord = {
      ...input,
      id: randomUUID(),
      name: required(input.name, "Client name", 300),
      primaryContact: required(input.primaryContact, "Primary contact", 300),
      notes: sanitizeTerminal(input.notes, 10_000),
      status: "prospect",
      createdAt: now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO clients VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.leadId,
          record.name,
          record.primaryContact,
          record.email,
          record.status,
          record.ownerId,
          record.notes,
          now,
          now,
        );
      this.audit.append("client.created", actorId, record.companyId, {
        clientId: record.id,
        leadId: record.leadId,
      });
    });
    return record;
  }

  update(
    companyId: string,
    id: string,
    patch: Partial<
      Pick<ClientRecord, "name" | "primaryContact" | "email" | "status" | "ownerId" | "notes">
    >,
    actorId: string,
  ): ClientRecord {
    const current = this.require(companyId, id);
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.requireOwner(companyId, next.ownerId);
    next.name = required(next.name, "Client name", 300);
    next.primaryContact = required(next.primaryContact, "Primary contact", 300);
    next.notes = sanitizeTerminal(next.notes, 10_000);
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE clients SET name=?,primary_contact=?,email=?,status=?,owner_id=?,notes=?,updated_at=? WHERE company_id=? AND id=?`,
        )
        .run(
          next.name,
          next.primaryContact,
          next.email,
          next.status,
          next.ownerId,
          next.notes,
          next.updatedAt,
          companyId,
          id,
        );
      this.audit.append("client.updated", actorId, companyId, { clientId: id });
    });
    return next;
  }

  archive(companyId: string, id: string, actorId: string): ClientRecord {
    return this.update(companyId, id, { status: "archived" }, actorId);
  }
  restore(companyId: string, id: string, actorId: string): ClientRecord {
    return this.update(companyId, id, { status: "prospect" }, actorId);
  }
  get(companyId: string, id: string): ClientRecord | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM clients WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    return row ? mapClient(row) : undefined;
  }
  list(
    companyId: string,
    options: {
      query?: string;
      status?: ClientRecord["status"];
      limit?: number;
      offset?: number;
    } = {},
  ): ClientRecord[] {
    this.companies.require(companyId);
    const query = `%${options.query?.trim() ?? ""}%`;
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM clients WHERE company_id=? AND (? IS NULL OR status=?)
      AND (name LIKE ? OR primary_contact LIKE ? OR notes LIKE ?) ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
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
    return rows.map(mapClient);
  }

  private require(companyId: string, id: string): ClientRecord {
    const record = this.get(companyId, id);
    if (!record) throw new Error(`Unknown client in company: ${id}`);
    return record;
  }
  private requireLead(companyId: string, id: string): void {
    if (
      !this.database.connection
        .prepare("SELECT 1 FROM leads WHERE company_id=? AND id=?")
        .get(companyId, id)
    )
      throw new Error(`Unknown lead in company: ${id}`);
  }
  private requireOwner(companyId: string, ownerId: string | null): void {
    if (ownerId && !this.companies.employees(companyId).some(({ id }) => id === ownerId))
      throw new Error(`Unknown client owner in company: ${ownerId}`);
  }
}

function mapClient(row: Record<string, unknown>): ClientRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    leadId: typeof row.lead_id === "string" ? row.lead_id : null,
    name: String(row.name),
    primaryContact: String(row.primary_contact),
    email: typeof row.email === "string" ? row.email : null,
    status: String(row.status) as ClientRecord["status"],
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
