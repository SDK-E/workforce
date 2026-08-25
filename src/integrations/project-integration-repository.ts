import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { validateIntegrationConfig, validateSecretName } from "./integration-config-policy.js";
import type { ManagedStatus, ProjectIntegrationRecord } from "./integration-types.js";

export class ProjectIntegrationRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  save(
    input: Omit<ProjectIntegrationRecord, "createdAt" | "updatedAt">,
    actorId: string,
  ): ProjectIntegrationRecord {
    this.requireProject(input.companyId, input.projectId);
    if (!/^[a-z][a-z0-9_-]{1,63}$/.test(input.provider))
      throw new Error("Invalid integration provider id");
    for (const name of input.secretRequirements) validateSecretName(name, "integration");
    validateIntegrationConfig(input.config, input.secretRequirements);
    const existing = this.get(input.companyId, input.projectId, input.provider);
    const now = new Date().toISOString();
    const record = { ...input, createdAt: existing?.createdAt ?? now, updatedAt: now };
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO project_integrations VALUES (?,?,?,?,?,?,?,?)
           ON CONFLICT(company_id,project_id,provider) DO UPDATE SET config_json=excluded.config_json,
           secret_requirements_json=excluded.secret_requirements_json,status=excluded.status,
           updated_at=excluded.updated_at`,
        )
        .run(
          record.companyId,
          record.projectId,
          record.provider,
          JSON.stringify(record.config),
          JSON.stringify(record.secretRequirements),
          record.status,
          record.createdAt,
          record.updatedAt,
        );
      this.audit.append("project-integration.saved", actorId, record.companyId, {
        projectId: record.projectId,
        provider: record.provider,
        status: record.status,
      });
    });
    return record;
  }

  get(
    companyId: string,
    projectId: string,
    provider: string,
  ): ProjectIntegrationRecord | undefined {
    const row = this.database.connection
      .prepare(
        "SELECT * FROM project_integrations WHERE company_id=? AND project_id=? AND provider=?",
      )
      .get(companyId, projectId, provider) as Record<string, unknown> | undefined;
    return row ? mapIntegration(row) : undefined;
  }

  list(companyId: string, projectId?: string): ProjectIntegrationRecord[] {
    const rows = (
      projectId
        ? this.database.connection
            .prepare(
              "SELECT * FROM project_integrations WHERE company_id=? AND project_id=? ORDER BY provider",
            )
            .all(companyId, projectId)
        : this.database.connection
            .prepare(
              "SELECT * FROM project_integrations WHERE company_id=? ORDER BY project_id,provider",
            )
            .all(companyId)
    ) as Record<string, unknown>[];
    return rows.map(mapIntegration);
  }

  setStatus(
    companyId: string,
    projectId: string,
    provider: string,
    status: ManagedStatus,
    actorId: string,
  ): ProjectIntegrationRecord {
    const current = this.get(companyId, projectId, provider);
    if (!current) throw new Error(`Unknown project integration: ${provider}`);
    return this.save({ ...current, status }, actorId);
  }

  private requireProject(companyId: string, projectId: string): void {
    const row = this.database.connection
      .prepare("SELECT kind FROM strategy_items WHERE company_id=? AND id=?")
      .get(companyId, projectId) as { kind: string } | undefined;
    if (row?.kind !== "project")
      throw new Error("Integration target must be a project in the company");
  }
}

function mapIntegration(row: Record<string, unknown>): ProjectIntegrationRecord {
  return {
    companyId: String(row.company_id),
    projectId: String(row.project_id),
    provider: String(row.provider),
    config: parseJson(row.config_json),
    secretRequirements: parseJson(row.secret_requirements_json),
    status: String(row.status) as ManagedStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
