import { randomUUID } from "node:crypto";
import type {
  CreateOrganizationUnitInput,
  OrganizationUnit,
  OrganizationUnitKind,
} from "../organizations/organization-types.js";
import type { AuditRepository } from "./audit-repository.js";
import type { CompanyRepository } from "./company-repository.js";
import type { WorkforceDatabase } from "./database.js";
import { parseJson } from "./serialization.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";

export class OrganizationRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(input: CreateOrganizationUnitInput): OrganizationUnit {
    this.companies.require(input.companyId);
    const now = new Date().toISOString();
    const unit: OrganizationUnit = {
      id: input.id ?? randomUUID(),
      companyId: input.companyId,
      kind: input.kind,
      parentId: input.parentId ?? null,
      name: sanitizeTerminal(input.name, 200),
      managerId: input.managerId ?? null,
      status: "active",
      data: input.data ?? {},
      createdAt: now,
      updatedAt: now,
    };
    if (!unit.name) throw new Error("Organization unit name is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO organization_units VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          unit.id,
          unit.companyId,
          unit.kind,
          unit.parentId,
          unit.name,
          unit.managerId,
          unit.status,
          JSON.stringify(unit.data),
          now,
          now,
        );
      this.audit.append("organization-unit.created", "human", unit.companyId, {
        unitId: unit.id,
        kind: unit.kind,
        name: unit.name,
      });
    });
    return unit;
  }

  list(companyId: string, kind?: OrganizationUnitKind): OrganizationUnit[] {
    const rows = (
      kind
        ? this.database.connection
            .prepare(
              "SELECT * FROM organization_units WHERE company_id = ? AND kind = ? ORDER BY name",
            )
            .all(companyId, kind)
        : this.database.connection
            .prepare("SELECT * FROM organization_units WHERE company_id = ? ORDER BY kind, name")
            .all(companyId)
    ) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      kind: String(row.kind) as OrganizationUnitKind,
      parentId: typeof row.parent_id === "string" ? row.parent_id : null,
      name: String(row.name),
      managerId: typeof row.manager_id === "string" ? row.manager_id : null,
      status: String(row.status) as OrganizationUnit["status"],
      data: parseJson(row.data_json),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }
}
