import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import type { ModelRecord } from "./registry-types.js";
import { randomUUID } from "node:crypto";

export class ModelRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  save(input: Omit<ModelRecord, "updatedAt">, actorId = "system"): ModelRecord {
    this.companies.require(input.companyId);
    for (const name of input.secretRequirements)
      if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(name))
        throw new Error(`Invalid model secret requirement: ${name}`);
    if (input.health === "healthy" && (!input.verifiedAt || !input.verificationReceiptId))
      throw new Error("Healthy models require an independent verification receipt");
    const record = { ...input, updatedAt: new Date().toISOString() };
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO models
           (company_id,id,engine,model,provider,capabilities_json,supported_roles_json,
            context_limit,free_preferred,local_model,priority,health,verified_at,
            verification_receipt_id,failure_class,updated_at,secret_requirements_json)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(company_id,id) DO UPDATE SET engine=excluded.engine,model=excluded.model,
           provider=excluded.provider,capabilities_json=excluded.capabilities_json,
           supported_roles_json=excluded.supported_roles_json,context_limit=excluded.context_limit,
           free_preferred=excluded.free_preferred,local_model=excluded.local_model,
           priority=excluded.priority,health=excluded.health,verified_at=excluded.verified_at,
           verification_receipt_id=excluded.verification_receipt_id,
           failure_class=excluded.failure_class,updated_at=excluded.updated_at,
           secret_requirements_json=excluded.secret_requirements_json`,
        )
        .run(
          record.companyId,
          record.id,
          record.engine,
          record.model,
          record.provider,
          JSON.stringify(record.capabilities),
          JSON.stringify(record.supportedRoles),
          record.contextLimit,
          record.freePreferred ? 1 : 0,
          record.localModel ? 1 : 0,
          record.priority,
          record.health,
          record.verifiedAt,
          record.verificationReceiptId,
          record.failureClass,
          record.updatedAt,
          JSON.stringify(record.secretRequirements),
        );
      this.audit.append("model.saved", actorId, record.companyId, {
        modelId: record.id,
        engine: record.engine,
      });
    });
    return record;
  }

  recordVerification(
    companyId: string,
    id: string,
    healthy: boolean,
    details: Record<string, unknown>,
    actorId: string,
  ): ModelRecord {
    const current = this.get(companyId, id);
    if (!current) throw new Error(`Unknown model: ${id}`);
    const receiptId = randomUUID();
    const record = this.save(
      {
        ...current,
        health: healthy ? "healthy" : "unavailable",
        verifiedAt: new Date().toISOString(),
        verificationReceiptId: receiptId,
        failureClass: healthy ? null : failureClass(details),
      },
      actorId,
    );
    this.audit.append("model.verification-recorded", actorId, companyId, {
      modelId: id,
      receiptId,
      healthy,
      details,
    });
    return record;
  }

  list(companyId: string, limit = 50, offset = 0): ModelRecord[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM models WHERE company_id=? ORDER BY priority DESC,id LIMIT ? OFFSET ?")
      .all(companyId, Math.min(Math.max(limit, 1), 100), Math.max(offset, 0)) as Record<
      string,
      unknown
    >[];
    return rows.map(mapModel);
  }

  get(companyId: string, id: string): ModelRecord | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM models WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    return row ? mapModel(row) : undefined;
  }
}

function failureClass(details: Record<string, unknown>): string {
  return typeof details.failureClass === "string" ? details.failureClass : "probe-failed";
}

function mapModel(row: Record<string, unknown>): ModelRecord {
  return {
    companyId: String(row.company_id),
    id: String(row.id),
    engine: String(row.engine) as ModelRecord["engine"],
    model: String(row.model),
    provider: String(row.provider),
    capabilities: parseJson(row.capabilities_json),
    supportedRoles: parseJson(row.supported_roles_json),
    secretRequirements: parseJson(row.secret_requirements_json),
    contextLimit: typeof row.context_limit === "number" ? row.context_limit : null,
    freePreferred: Boolean(row.free_preferred),
    localModel: Boolean(row.local_model),
    priority: Number(row.priority),
    health: String(row.health) as ModelRecord["health"],
    verifiedAt: typeof row.verified_at === "string" ? row.verified_at : null,
    verificationReceiptId:
      typeof row.verification_receipt_id === "string" ? row.verification_receipt_id : null,
    failureClass: typeof row.failure_class === "string" ? row.failure_class : null,
    updatedAt: String(row.updated_at),
  };
}
