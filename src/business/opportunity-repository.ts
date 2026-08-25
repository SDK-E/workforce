import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { parseJson } from "../storage/serialization.js";
import type { OpportunityRecord } from "./business-types.js";

export class OpportunityRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(
    input: Omit<OpportunityRecord, "id" | "stage" | "createdAt" | "updatedAt">,
    actorId: string,
  ): OpportunityRecord {
    this.companies.require(input.companyId);
    validateScore(input.score);
    const now = new Date().toISOString();
    const record: OpportunityRecord = {
      ...input,
      id: randomUUID(),
      name: required(input.name, "Opportunity name", 300),
      source: required(input.source, "Opportunity source", 500),
      problem: required(input.problem, "Customer problem", 5_000),
      hypothesis: required(input.hypothesis, "Opportunity hypothesis", 5_000),
      stage: "discovered",
      createdAt: now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO opportunities VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.name,
          record.source,
          record.problem,
          record.hypothesis,
          record.score,
          record.stage,
          record.discoveredBy,
          record.ownerId,
          JSON.stringify(record.evidenceIds),
          record.createdAt,
          record.updatedAt,
        );
      this.audit.append("opportunity.created", actorId, record.companyId, {
        opportunityId: record.id,
        score: record.score,
      });
    });
    return record;
  }

  update(
    companyId: string,
    id: string,
    patch: Partial<
      Pick<
        OpportunityRecord,
        "name" | "source" | "problem" | "hypothesis" | "score" | "stage" | "ownerId" | "evidenceIds"
      >
    >,
    actorId: string,
  ): OpportunityRecord {
    const current = this.require(companyId, id);
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    validateScore(next.score);
    next.name = required(next.name, "Opportunity name", 300);
    next.source = required(next.source, "Opportunity source", 500);
    next.problem = required(next.problem, "Customer problem", 5_000);
    next.hypothesis = required(next.hypothesis, "Opportunity hypothesis", 5_000);
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE opportunities SET name=?,source=?,problem=?,hypothesis=?,score=?,stage=?,
          owner_id=?,evidence_ids_json=?,updated_at=? WHERE company_id=? AND id=?`,
        )
        .run(
          next.name,
          next.source,
          next.problem,
          next.hypothesis,
          next.score,
          next.stage,
          next.ownerId,
          JSON.stringify(next.evidenceIds),
          next.updatedAt,
          companyId,
          id,
        );
      this.audit.append("opportunity.updated", actorId, companyId, { opportunityId: id });
    });
    return next;
  }

  archive(companyId: string, id: string, actorId: string): OpportunityRecord {
    return this.update(companyId, id, { stage: "archived" }, actorId);
  }

  restore(companyId: string, id: string, actorId: string): OpportunityRecord {
    return this.update(companyId, id, { stage: "discovered" }, actorId);
  }

  get(companyId: string, id: string): OpportunityRecord | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM opportunities WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    return row ? mapOpportunity(row) : undefined;
  }

  list(
    companyId: string,
    options: {
      query?: string;
      stage?: OpportunityRecord["stage"];
      limit?: number;
      offset?: number;
    } = {},
  ): OpportunityRecord[] {
    this.companies.require(companyId);
    const query = `%${options.query?.trim() ?? ""}%`;
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM opportunities WHERE company_id=? AND (? IS NULL OR stage=?)
        AND (name LIKE ? OR problem LIKE ? OR source LIKE ?) ORDER BY score DESC,updated_at DESC LIMIT ? OFFSET ?`,
      )
      .all(
        companyId,
        options.stage ?? null,
        options.stage ?? null,
        query,
        query,
        query,
        limit,
        offset,
      ) as Record<string, unknown>[];
    return rows.map(mapOpportunity);
  }

  private require(companyId: string, id: string): OpportunityRecord {
    const record = this.get(companyId, id);
    if (!record) throw new Error(`Unknown opportunity in company: ${id}`);
    return record;
  }
}

function mapOpportunity(row: Record<string, unknown>): OpportunityRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    name: String(row.name),
    source: String(row.source),
    problem: String(row.problem),
    hypothesis: String(row.hypothesis),
    score: Number(row.score),
    stage: String(row.stage) as OpportunityRecord["stage"],
    discoveredBy: String(row.discovered_by),
    ownerId: typeof row.owner_id === "string" ? row.owner_id : null,
    evidenceIds: parseJson(row.evidence_ids_json),
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
    throw new Error("Opportunity score must be an integer from 0 to 100");
}
