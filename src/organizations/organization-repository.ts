import { randomUUID } from "node:crypto";
import type {
  CreateOrganizationUnitInput,
  OrganizationUnit,
  OrganizationUnitKind,
  UpdateOrganizationUnitInput,
} from "./organization-types.js";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";

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
    this.validateParent(unit.companyId, unit.id, unit.parentId);
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
    return rows.map((row) => this.map(row));
  }

  get(companyId: string, unitId: string): OrganizationUnit | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM organization_units WHERE company_id=? AND id=?")
      .get(companyId, unitId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : undefined;
  }

  update(input: UpdateOrganizationUnitInput, actorId = "human"): OrganizationUnit {
    const current = this.get(input.companyId, input.unitId);
    if (!current) throw new Error(`Unknown organization unit: ${input.unitId}`);
    const updated = {
      ...current,
      name: sanitizeTerminal(input.name ?? current.name, 200),
      parentId: input.parentId === undefined ? current.parentId : input.parentId,
      managerId: input.managerId === undefined ? current.managerId : input.managerId,
      data: input.data ?? current.data,
      updatedAt: new Date().toISOString(),
    };
    if (!updated.name) throw new Error("Organization unit name is required");
    this.validateParent(updated.companyId, updated.id, updated.parentId);
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE organization_units SET name=?,parent_id=?,manager_id=?,data_json=?,updated_at=?
           WHERE company_id=? AND id=?`,
        )
        .run(
          updated.name,
          updated.parentId,
          updated.managerId,
          JSON.stringify(updated.data),
          updated.updatedAt,
          updated.companyId,
          updated.id,
        );
      this.audit.append("organization-unit.updated", actorId, updated.companyId, {
        unitId: updated.id,
      });
    });
    return updated;
  }

  archive(companyId: string, unitId: string, actorId = "human"): OrganizationUnit {
    return this.setStatus(companyId, unitId, "archived", actorId);
  }

  restore(companyId: string, unitId: string, actorId = "human"): OrganizationUnit {
    return this.setStatus(companyId, unitId, "active", actorId);
  }

  private setStatus(
    companyId: string,
    unitId: string,
    status: OrganizationUnit["status"],
    actorId: string,
  ): OrganizationUnit {
    const current = this.get(companyId, unitId);
    if (!current) throw new Error(`Unknown organization unit: ${unitId}`);
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare("UPDATE organization_units SET status=?,updated_at=? WHERE company_id=? AND id=?")
        .run(status, now, companyId, unitId);
      this.audit.append(`organization-unit.${status}`, actorId, companyId, { unitId });
    });
    return { ...current, status, updatedAt: now };
  }

  private validateParent(companyId: string, unitId: string, parentId: string | null): void {
    if (parentId === unitId) throw new Error("Organization unit cannot parent itself");
    if (parentId && !this.get(companyId, parentId))
      throw new Error("Organization parent must belong to the same company");
  }

  private map(row: Record<string, unknown>): OrganizationUnit {
    return {
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
    };
  }
}
