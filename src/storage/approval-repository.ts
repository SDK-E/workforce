import { randomUUID } from "node:crypto";
import type { AuditRepository } from "./audit-repository.js";
import type { CompanyRepository } from "./company-repository.js";
import type { WorkforceDatabase } from "./database.js";

export class ApprovalRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  request(companyId: string, subjectType: string, subjectId: string, requestedBy: string): string {
    this.companies.require(companyId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO approvals
        (id, company_id, subject_type, subject_id, requested_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        )
        .run(id, companyId, subjectType, subjectId, requestedBy, now);
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
}
