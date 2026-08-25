import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";

export interface PerformanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  kind: "observation" | "recognition" | "warning" | "review" | "challenge";
  summary: string;
  evidenceIds: string[];
  authorId: string;
  createdAt: string;
}
export interface ClaimRecord {
  id: string;
  companyId: string;
  subjectId: string;
  predicate: string;
  value: unknown;
  evidenceIds: string[];
  confidence: number;
  status: "asserted" | "disputed" | "retracted";
  authorId: string;
  contradictedBy: string | null;
  createdAt: string;
}

export class PerformanceRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  record(input: Omit<PerformanceRecord, "id" | "createdAt">): PerformanceRecord {
    this.requireEmployee(input.companyId, input.employeeId);
    if (input.evidenceIds.length === 0) throw new Error("Performance conclusions require evidence");
    const record: PerformanceRecord = {
      ...input,
      id: randomUUID(),
      summary: sanitizeTerminal(input.summary, 5_000),
      createdAt: new Date().toISOString(),
    };
    if (!record.summary) throw new Error("Performance summary is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO performance_records VALUES (?,?,?,?,?,?,?,?)")
        .run(
          record.id,
          record.companyId,
          record.employeeId,
          record.kind,
          record.summary,
          JSON.stringify(record.evidenceIds),
          record.authorId,
          record.createdAt,
        );
      this.audit.append(`performance.${record.kind}`, record.authorId, record.companyId, {
        recordId: record.id,
        employeeId: record.employeeId,
        evidenceIds: record.evidenceIds,
      });
    });
    return record;
  }

  assertClaim(input: {
    companyId: string;
    subjectId: string;
    predicate: string;
    value: unknown;
    evidenceIds: string[];
    confidence: number;
    authorId: string;
  }): ClaimRecord {
    this.companies.require(input.companyId);
    if (input.evidenceIds.length === 0 || input.confidence < 0 || input.confidence > 1)
      throw new Error("Claim requires evidence and confidence between zero and one");
    const predicate = sanitizeTerminal(input.predicate, 200);
    if (!predicate) throw new Error("Claim predicate is required");
    const existing = this.activeClaims(input.companyId, input.subjectId, predicate);
    const valueJson = JSON.stringify(input.value);
    const contradiction = existing.find((claim) => JSON.stringify(claim.value) !== valueJson);
    const claim: ClaimRecord = {
      ...input,
      id: randomUUID(),
      predicate,
      status: contradiction ? "disputed" : "asserted",
      contradictedBy: contradiction?.id ?? null,
      createdAt: new Date().toISOString(),
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO claims VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          claim.id,
          claim.companyId,
          claim.subjectId,
          claim.predicate,
          valueJson,
          JSON.stringify(claim.evidenceIds),
          claim.confidence,
          claim.status,
          claim.authorId,
          claim.contradictedBy,
          claim.createdAt,
        );
      if (contradiction)
        this.database.connection
          .prepare(
            "UPDATE claims SET status='disputed', contradicted_by=? WHERE company_id=? AND id=?",
          )
          .run(claim.id, input.companyId, contradiction.id);
      this.audit.append(
        contradiction ? "claim.contradiction-detected" : "claim.asserted",
        input.authorId,
        input.companyId,
        { claimId: claim.id, contradictedClaimId: contradiction?.id ?? null },
      );
    });
    return claim;
  }

  listPerformance(companyId: string, employeeId?: string): PerformanceRecord[] {
    const rows = (
      employeeId
        ? this.database.connection
            .prepare(
              "SELECT * FROM performance_records WHERE company_id=? AND employee_id=? ORDER BY created_at DESC",
            )
            .all(companyId, employeeId)
        : this.database.connection
            .prepare(
              "SELECT * FROM performance_records WHERE company_id=? ORDER BY created_at DESC",
            )
            .all(companyId)
    ) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      employeeId: String(row.employee_id),
      kind: String(row.kind) as PerformanceRecord["kind"],
      summary: String(row.summary),
      evidenceIds: parseJson(row.evidence_ids_json),
      authorId: String(row.author_id),
      createdAt: String(row.created_at),
    }));
  }

  activeClaims(companyId: string, subjectId: string, predicate: string): ClaimRecord[] {
    const rows = this.database.connection
      .prepare(
        "SELECT * FROM claims WHERE company_id=? AND subject_id=? AND predicate=? AND status!='retracted' ORDER BY created_at DESC",
      )
      .all(companyId, subjectId, predicate) as Record<string, unknown>[];
    return rows.map((row) => this.mapClaim(row));
  }

  listClaims(companyId: string): ClaimRecord[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM claims WHERE company_id=? ORDER BY created_at DESC")
      .all(companyId) as Record<string, unknown>[];
    return rows.map((row) => this.mapClaim(row));
  }

  setClaimRetraction(
    companyId: string,
    id: string,
    retracted: boolean,
    actorId: string,
  ): ClaimRecord {
    const claim = this.requireClaim(companyId, id);
    this.database.transaction(() => {
      this.database.connection
        .prepare("UPDATE claims SET status=? WHERE company_id=? AND id=?")
        .run(retracted ? "retracted" : "asserted", companyId, id);
      this.reconcileClaims(companyId, claim.subjectId, claim.predicate);
      this.audit.append(retracted ? "claim.retracted" : "claim.restored", actorId, companyId, {
        claimId: id,
      });
    });
    return this.requireClaim(companyId, id);
  }

  private mapClaim(row: Record<string, unknown>): ClaimRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      subjectId: String(row.subject_id),
      predicate: String(row.predicate),
      value: parseJson(row.value_json),
      evidenceIds: parseJson(row.evidence_ids_json),
      confidence: Number(row.confidence),
      status: String(row.status) as ClaimRecord["status"],
      authorId: String(row.author_id),
      contradictedBy: typeof row.contradicted_by === "string" ? row.contradicted_by : null,
      createdAt: String(row.created_at),
    };
  }

  private requireClaim(companyId: string, id: string): ClaimRecord {
    const row = this.database.connection
      .prepare("SELECT * FROM claims WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown claim in company: ${id}`);
    return this.mapClaim(row);
  }

  private reconcileClaims(companyId: string, subjectId: string, predicate: string): void {
    const claims = this.activeClaims(companyId, subjectId, predicate);
    for (const claim of claims) {
      const contradiction = claims.find(
        (candidate) => JSON.stringify(candidate.value) !== JSON.stringify(claim.value),
      );
      this.database.connection
        .prepare("UPDATE claims SET status=?, contradicted_by=? WHERE company_id=? AND id=?")
        .run(
          contradiction ? "disputed" : "asserted",
          contradiction?.id ?? null,
          companyId,
          claim.id,
        );
    }
  }

  private requireEmployee(companyId: string, employeeId: string): void {
    if (!this.companies.employees(companyId).some(({ id }) => id === employeeId))
      throw new Error(`Unknown employee in company: ${employeeId}`);
  }
}
