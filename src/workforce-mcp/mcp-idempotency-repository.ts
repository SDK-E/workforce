import type { WorkforceDatabase } from "../storage/database.js";
import { createHash } from "node:crypto";

export class McpIdempotencyRepository {
  constructor(private readonly database: WorkforceDatabase) {}

  execute<T>(scope: {
    companyId: string;
    principalId: string;
    operation: string;
    key: string;
    request: unknown;
    perform: () => T;
  }): T {
    const digest = createHash("sha256").update(JSON.stringify(scope.request)).digest("hex");
    const existing = this.database.connection
      .prepare(
        `SELECT request_digest,result_json FROM mcp_idempotency
         WHERE company_id=? AND principal_id=? AND operation=? AND idempotency_key=?`,
      )
      .get(scope.companyId, scope.principalId, scope.operation, scope.key) as
      | { request_digest: string; result_json: string }
      | undefined;
    if (existing) {
      if (existing.request_digest !== digest)
        throw new Error("Idempotency key was already used with a different request");
      return JSON.parse(existing.result_json) as T;
    }
    const result = scope.perform();
    this.database.connection
      .prepare("INSERT INTO mcp_idempotency VALUES (?,?,?,?,?,?,?)")
      .run(
        scope.companyId,
        scope.principalId,
        scope.operation,
        scope.key,
        digest,
        JSON.stringify(result),
        new Date().toISOString(),
      );
    return result;
  }
}
