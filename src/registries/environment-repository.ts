import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import type { EnvironmentRecord } from "./registry-types.js";

export class EnvironmentRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  save(input: Omit<EnvironmentRecord, "updatedAt">, actorId = "system"): EnvironmentRecord {
    this.companies.require(input.companyId);
    const record = { ...input, updatedAt: new Date().toISOString() };
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO environments VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(company_id,id) DO UPDATE SET name=excluded.name,
           sandbox_image=excluded.sandbox_image,runtime_json=excluded.runtime_json,
           build_toolchain_json=excluded.build_toolchain_json,browser_json=excluded.browser_json,
           network_policy_json=excluded.network_policy_json,input_contract_json=excluded.input_contract_json,
           secrets_policy_json=excluded.secrets_policy_json,resource_policy_json=excluded.resource_policy_json,
           output_contract_json=excluded.output_contract_json,cleanup_policy_json=excluded.cleanup_policy_json,
           supported_profiles_json=excluded.supported_profiles_json,health=excluded.health,
           health_receipt_id=excluded.health_receipt_id,updated_at=excluded.updated_at`,
        )
        .run(
          record.companyId,
          record.id,
          record.name,
          record.sandboxImage,
          JSON.stringify(record.runtime),
          JSON.stringify(record.buildToolchain),
          JSON.stringify(record.browser),
          JSON.stringify(record.networkPolicy),
          JSON.stringify(record.inputContract),
          JSON.stringify(record.secretsPolicy),
          JSON.stringify(record.resourcePolicy),
          JSON.stringify(record.outputContract),
          JSON.stringify(record.cleanupPolicy),
          JSON.stringify(record.supportedProfiles),
          record.health,
          record.healthReceiptId,
          record.updatedAt,
        );
      this.audit.append("environment.saved", actorId, record.companyId, {
        environmentId: record.id,
      });
    });
    return record;
  }

  list(companyId: string, limit = 50, offset = 0): EnvironmentRecord[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM environments WHERE company_id=? ORDER BY id LIMIT ? OFFSET ?")
      .all(companyId, Math.min(Math.max(limit, 1), 100), Math.max(offset, 0)) as Record<
      string,
      unknown
    >[];
    return rows.map(mapEnvironment);
  }
}

function mapEnvironment(row: Record<string, unknown>): EnvironmentRecord {
  return {
    companyId: String(row.company_id),
    id: String(row.id),
    name: String(row.name),
    sandboxImage: String(row.sandbox_image),
    runtime: parseJson(row.runtime_json),
    buildToolchain: parseJson(row.build_toolchain_json),
    browser: parseJson(row.browser_json),
    networkPolicy: parseJson(row.network_policy_json),
    inputContract: parseJson(row.input_contract_json),
    secretsPolicy: parseJson(row.secrets_policy_json),
    resourcePolicy: parseJson(row.resource_policy_json),
    outputContract: parseJson(row.output_contract_json),
    cleanupPolicy: parseJson(row.cleanup_policy_json),
    supportedProfiles: parseJson(row.supported_profiles_json),
    health: String(row.health) as EnvironmentRecord["health"],
    healthReceiptId: typeof row.health_receipt_id === "string" ? row.health_receipt_id : null,
    updatedAt: String(row.updated_at),
  };
}
