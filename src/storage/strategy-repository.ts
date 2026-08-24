import { randomUUID } from "node:crypto";
import type {
  CreateStrategyItemInput,
  StrategyItem,
  StrategyItemKind,
} from "../strategy/strategy-types.js";
import type { AuditRepository } from "./audit-repository.js";
import type { CompanyRepository } from "./company-repository.js";
import type { WorkforceDatabase } from "./database.js";
import { parseJson } from "./serialization.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";

const REQUIRED_PARENT: Partial<Record<StrategyItemKind, StrategyItemKind>> = {
  initiative: "objective",
  project: "initiative",
  goal: "project",
  milestone: "goal",
};

export class StrategyRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(input: CreateStrategyItemInput): StrategyItem {
    this.companies.require(input.companyId);
    if (input.successMeasures.length === 0)
      throw new Error("Strategy items require measurable success criteria");
    this.validateParent(input.companyId, input.kind, input.parentId ?? null);
    const now = new Date().toISOString();
    const item: StrategyItem = {
      id: input.id ?? randomUUID(),
      companyId: input.companyId,
      kind: input.kind,
      parentId: input.parentId ?? null,
      name: sanitizeTerminal(input.name, 300),
      ownerId: input.ownerId,
      managerId: input.managerId,
      status: "draft",
      requirements: input.requirements ?? [],
      constraints: input.constraints ?? [],
      successMeasures: input.successMeasures,
      dependencies: input.dependencies ?? [],
      risks: input.risks ?? [],
      evidence: [],
      targetAt: input.targetAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "INSERT INTO strategy_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          item.id,
          item.companyId,
          item.kind,
          item.parentId,
          item.name,
          item.ownerId,
          item.managerId,
          item.status,
          JSON.stringify(item.requirements),
          JSON.stringify(item.constraints),
          JSON.stringify(item.successMeasures),
          JSON.stringify(item.dependencies),
          JSON.stringify(item.risks),
          JSON.stringify(item.evidence),
          item.targetAt,
          now,
          now,
        );
      this.audit.append("strategy-item.created", "human", item.companyId, {
        itemId: item.id,
        kind: item.kind,
        name: item.name,
      });
    });
    return item;
  }

  get(companyId: string, itemId: string): StrategyItem | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM strategy_items WHERE company_id = ? AND id = ?")
      .get(companyId, itemId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : undefined;
  }

  list(companyId: string, kind?: StrategyItemKind): StrategyItem[] {
    const rows = (
      kind
        ? this.database.connection
            .prepare(
              "SELECT * FROM strategy_items WHERE company_id = ? AND kind = ? ORDER BY updated_at DESC",
            )
            .all(companyId, kind)
        : this.database.connection
            .prepare("SELECT * FROM strategy_items WHERE company_id = ? ORDER BY updated_at DESC")
            .all(companyId)
    ) as Record<string, unknown>[];
    return rows.map((row) => this.map(row));
  }

  private validateParent(companyId: string, kind: StrategyItemKind, parentId: string | null): void {
    const expected = REQUIRED_PARENT[kind];
    if (!expected && parentId) throw new Error(`${kind} cannot have a parent`);
    if (expected && !parentId) throw new Error(`${kind} requires a ${expected} parent`);
    if (expected && this.get(companyId, parentId ?? "")?.kind !== expected)
      throw new Error(`${kind} parent must be a ${expected} in the same company`);
  }

  private map(row: Record<string, unknown>): StrategyItem {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      kind: String(row.kind) as StrategyItemKind,
      parentId: typeof row.parent_id === "string" ? row.parent_id : null,
      name: String(row.name),
      ownerId: String(row.owner_id),
      managerId: String(row.manager_id),
      status: String(row.status) as StrategyItem["status"],
      requirements: parseJson(row.requirements_json),
      constraints: parseJson(row.constraints_json),
      successMeasures: parseJson(row.success_measures_json),
      dependencies: parseJson(row.dependencies_json),
      risks: parseJson(row.risks_json),
      evidence: parseJson(row.evidence_json),
      targetAt: typeof row.target_at === "string" ? row.target_at : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
