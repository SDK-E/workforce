import { randomUUID } from "node:crypto";
import type { AuditRepository } from "./audit-repository.js";
import type { CompanyRepository } from "./company-repository.js";
import type { WorkforceDatabase } from "./database.js";
import {
  nextApprovalStatus,
  type ApprovalEvent,
  type ApprovalStatus,
} from "../governance/approval-machine.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";

export interface ApprovalRecord {
  id: string;
  companyId: string;
  subjectType: string;
  subjectId: string;
  requestedBy: string;
  status: ApprovalStatus;
  rationale: string;
  decidedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export class ApprovalRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  request(
    companyId: string,
    subjectType: string,
    subjectId: string,
    requestedBy: string,
    rationale = "",
  ): string {
    this.companies.require(companyId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO approvals
        (id, company_id, subject_type, subject_id, requested_by, status, rationale, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        )
        .run(
          id,
          companyId,
          subjectType,
          subjectId,
          requestedBy,
          sanitizeTerminal(rationale, 4_000),
          now,
        );
      this.audit.append("approval.requested", requestedBy, companyId, {
        id,
        subjectType,
        subjectId,
      });
    });
    return id;
  }

  pendingCount(companyId: string): number {
    const row = this.database.connection
      .prepare(
        "SELECT count(*) AS count FROM approvals WHERE company_id = ? AND status = 'pending'",
      )
      .get(companyId) as { count: number };
    return row.count;
  }

  decide(
    companyId: string,
    approvalId: string,
    event: ApprovalEvent,
    actorId: string,
    rationale: string,
  ): ApprovalRecord {
    const current = this.require(companyId, approvalId);
    const status = nextApprovalStatus(current.status, event);
    const decidedAt = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE approvals SET status=?, rationale=?, decided_by=?, decided_at=?
           WHERE company_id=? AND id=?`,
        )
        .run(status, sanitizeTerminal(rationale, 4_000), actorId, decidedAt, companyId, approvalId);
      this.audit.append("approval.decided", actorId, companyId, {
        approvalId,
        status,
        rationale,
      });
    });
    return this.require(companyId, approvalId);
  }

  list(companyId: string, status?: ApprovalStatus): ApprovalRecord[] {
    const rows = (
      status
        ? this.database.connection
            .prepare(
              "SELECT * FROM approvals WHERE company_id=? AND status=? ORDER BY created_at DESC",
            )
            .all(companyId, status)
        : this.database.connection
            .prepare("SELECT * FROM approvals WHERE company_id=? ORDER BY created_at DESC")
            .all(companyId)
    ) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  private require(companyId: string, id: string): ApprovalRecord {
    const row = this.database.connection
      .prepare("SELECT * FROM approvals WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown approval in company: ${id}`);
    return this.map(row);
  }

  private map(row: Record<string, unknown>): ApprovalRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      subjectType: String(row.subject_type),
      subjectId: String(row.subject_id),
      requestedBy: String(row.requested_by),
      status: String(row.status) as ApprovalStatus,
      rationale: String(row.rationale),
      decidedBy: typeof row.decided_by === "string" ? row.decided_by : null,
      createdAt: String(row.created_at),
      decidedAt: typeof row.decided_at === "string" ? row.decided_at : null,
    };
  }
}
