import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { parseJson } from "../storage/serialization.js";
import { validateSecretName } from "./integration-config-policy.js";
import type { ManagedStatus, McpServerRecord } from "./integration-types.js";
import { randomUUID } from "node:crypto";

export class McpServerRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  save(input: Omit<McpServerRecord, "createdAt" | "updatedAt">, actorId: string): McpServerRecord {
    this.companies.require(input.companyId);
    validateMcp(input);
    const existing = this.get(input.companyId, input.id);
    if (input.health !== "unknown" && input.health !== existing?.health)
      throw new Error("MCP health can only be changed by a verified probe");
    const now = new Date().toISOString();
    const record: McpServerRecord = {
      ...input,
      name: sanitizeTerminal(input.name, 200),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO mcp_servers
           (company_id,id,name,transport,endpoint,command_json,tool_allowlist_json,
            secret_requirements_json,status,health,created_at,updated_at,credential_bindings_json,
            health_receipt_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(company_id,id) DO UPDATE SET name=excluded.name,transport=excluded.transport,
           endpoint=excluded.endpoint,command_json=excluded.command_json,
           tool_allowlist_json=excluded.tool_allowlist_json,
           secret_requirements_json=excluded.secret_requirements_json,status=excluded.status,
           credential_bindings_json=excluded.credential_bindings_json,
           updated_at=excluded.updated_at`,
        )
        .run(
          record.companyId,
          record.id,
          record.name,
          record.transport,
          record.endpoint,
          JSON.stringify(record.command),
          JSON.stringify(record.toolAllowlist),
          JSON.stringify(record.secretRequirements),
          record.status,
          record.health,
          record.createdAt,
          record.updatedAt,
          JSON.stringify(record.credentialBindings),
          record.healthReceiptId,
        );
      this.audit.append("mcp-server.saved", actorId, record.companyId, {
        serverId: record.id,
        transport: record.transport,
        status: record.status,
      });
    });
    return record;
  }

  get(companyId: string, id: string): McpServerRecord | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM mcp_servers WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    return row ? mapMcp(row) : undefined;
  }

  list(companyId: string, includeArchived = true): McpServerRecord[] {
    const rows = this.database.connection
      .prepare(
        `SELECT * FROM mcp_servers WHERE company_id=? ${includeArchived ? "" : "AND status!='archived'"} ORDER BY name`,
      )
      .all(companyId) as Record<string, unknown>[];
    return rows.map(mapMcp);
  }

  setStatus(
    companyId: string,
    id: string,
    status: ManagedStatus,
    actorId: string,
  ): McpServerRecord {
    const current = this.get(companyId, id);
    if (!current) throw new Error(`Unknown MCP server: ${id}`);
    return this.save({ ...current, status }, actorId);
  }

  recordHealth(
    companyId: string,
    id: string,
    status: "healthy" | "degraded" | "unavailable",
    details: Record<string, unknown>,
    actorId: string,
  ): McpServerRecord {
    const current = this.get(companyId, id);
    if (!current) throw new Error(`Unknown MCP server: ${id}`);
    const receiptId = randomUUID();
    const now = new Date().toISOString();
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO mcp_health_receipts VALUES (?,?,?,?,?,?,?)")
        .run(receiptId, companyId, id, status, current.transport, JSON.stringify(details), now);
      this.database.connection
        .prepare(
          "UPDATE mcp_servers SET health=?,health_receipt_id=?,updated_at=? WHERE company_id=? AND id=?",
        )
        .run(status, receiptId, now, companyId, id);
      this.audit.append("mcp-server.health-verified", actorId, companyId, {
        serverId: id,
        status,
        receiptId,
      });
    });
    const updated = this.get(companyId, id);
    if (!updated) throw new Error(`MCP server disappeared after health update: ${id}`);
    return updated;
  }
}

function validateMcp(input: Omit<McpServerRecord, "createdAt" | "updatedAt">): void {
  if (!/^[a-z][a-z0-9_-]{1,63}$/.test(input.id)) throw new Error("Invalid MCP server id");
  if (!input.name.trim()) throw new Error("MCP server name is required");
  if (input.transport === "stdio" && input.command.length === 0)
    throw new Error("Stdio MCP servers require an argv command");
  if (input.transport !== "stdio") {
    if (!input.endpoint) throw new Error("Remote MCP servers require an endpoint");
    const endpoint = new URL(input.endpoint);
    if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password)
      throw new Error("MCP endpoint must be an HTTP URL without embedded credentials");
  }
  for (const name of input.secretRequirements) validateSecretName(name, "MCP");
  const targets = new Set<string>();
  for (const binding of input.credentialBindings) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(binding.target))
      throw new Error(`Invalid MCP credential target: ${binding.target}`);
    validateSecretName(binding.secretName, "MCP binding");
    if (!input.secretRequirements.includes(binding.secretName))
      throw new Error(`MCP binding references undeclared secret: ${binding.secretName}`);
    if (targets.has(binding.target))
      throw new Error(`Duplicate MCP credential target: ${binding.target}`);
    targets.add(binding.target);
  }
  if (
    input.secretRequirements.some(
      (name) => !input.credentialBindings.some((item) => item.secretName === name),
    )
  )
    throw new Error("Every MCP secret requirement must have a credential binding");
}

function mapMcp(row: Record<string, unknown>): McpServerRecord {
  return {
    companyId: String(row.company_id),
    id: String(row.id),
    name: String(row.name),
    transport: String(row.transport) as McpServerRecord["transport"],
    endpoint: typeof row.endpoint === "string" ? row.endpoint : null,
    command: parseJson(row.command_json),
    toolAllowlist: parseJson(row.tool_allowlist_json),
    secretRequirements: parseJson(row.secret_requirements_json),
    credentialBindings: parseJson(row.credential_bindings_json),
    status: String(row.status) as ManagedStatus,
    health: String(row.health) as McpServerRecord["health"],
    healthReceiptId: typeof row.health_receipt_id === "string" ? row.health_receipt_id : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
