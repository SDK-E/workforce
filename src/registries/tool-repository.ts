import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import type { ToolRecord } from "./registry-types.js";

export class ToolRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  save(input: Omit<ToolRecord, "updatedAt">, actorId = "system"): ToolRecord {
    this.companies.require(input.companyId);
    const record = { ...input, updatedAt: new Date().toISOString() };
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO tools VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(company_id,id) DO UPDATE SET
           version=excluded.version,provider=excluded.provider,capabilities_json=excluded.capabilities_json,
           risk=excluded.risk,input_schema_json=excluded.input_schema_json,
           output_schema_json=excluded.output_schema_json,required_environment=excluded.required_environment,
           network_policy_json=excluded.network_policy_json,
           secret_requirements_json=excluded.secret_requirements_json,
           sandbox_profiles_json=excluded.sandbox_profiles_json,
           permission_policy_json=excluded.permission_policy_json,health=excluded.health,
           test_receipt_id=excluded.test_receipt_id,audit_behavior=excluded.audit_behavior,
           updated_at=excluded.updated_at`,
        )
        .run(
          record.companyId,
          record.id,
          record.version,
          record.provider,
          JSON.stringify(record.capabilities),
          record.risk,
          JSON.stringify(record.inputSchema),
          JSON.stringify(record.outputSchema),
          record.requiredEnvironment,
          JSON.stringify(record.networkPolicy),
          JSON.stringify(record.secretRequirements),
          JSON.stringify(record.sandboxProfiles),
          JSON.stringify(record.permissionPolicy),
          record.health,
          record.testReceiptId,
          record.auditBehavior,
          record.updatedAt,
        );
      this.audit.append("tool.saved", actorId, record.companyId, { toolId: record.id });
    });
    return record;
  }

  list(companyId: string, query = "", limit = 50, offset = 0): ToolRecord[] {
    const bounded = Math.min(Math.max(limit, 1), 100);
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM tools WHERE company_id=? AND (id LIKE ? OR provider LIKE ?)
         ORDER BY id LIMIT ? OFFSET ?`,
      )
      .all(companyId, `%${query}%`, `%${query}%`, bounded, Math.max(offset, 0)) as Record<
      string,
      unknown
    >[];
    return rows.map(mapTool);
  }
}

function mapTool(row: Record<string, unknown>): ToolRecord {
  return {
    companyId: String(row.company_id),
    id: String(row.id),
    version: String(row.version),
    provider: String(row.provider),
    capabilities: parseJson(row.capabilities_json),
    risk: String(row.risk) as ToolRecord["risk"],
    inputSchema: parseJson(row.input_schema_json),
    outputSchema: parseJson(row.output_schema_json),
    requiredEnvironment:
      typeof row.required_environment === "string" ? row.required_environment : null,
    networkPolicy: parseJson(row.network_policy_json),
    secretRequirements: parseJson(row.secret_requirements_json),
    sandboxProfiles: parseJson(row.sandbox_profiles_json),
    permissionPolicy: parseJson(row.permission_policy_json),
    health: String(row.health) as ToolRecord["health"],
    testReceiptId: typeof row.test_receipt_id === "string" ? row.test_receipt_id : null,
    auditBehavior: String(row.audit_behavior),
    updatedAt: String(row.updated_at),
  };
}
