import { randomUUID } from "node:crypto";
import type { Employee } from "../domain.js";
import type { AuditRepository } from "./audit-repository.js";
import type { WorkforceDatabase } from "./database.js";
import type { CompanyRecord, CreateCompanyInput } from "./records.js";
import { parseJson } from "./serialization.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";

const COMPANY_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

export class CompanyRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  create(input: CreateCompanyInput): CompanyRecord {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    if (!COMPANY_ID_PATTERN.test(id))
      throw new Error("Company id must be 2-64 lowercase letters, numbers, or hyphens");
    const company = this.build(id, input, now);
    if (!company.name) throw new Error("Company name is required");
    this.database.transaction(() => {
      this.insert(company);
      for (const employee of this.durableEmployees(now)) this.insertEmployee(id, employee);
      this.insertRooms(id, now);
      this.audit.append("company.created", "human", id, { name: company.name });
    });
    return company;
  }

  get(id: string): CompanyRecord | undefined {
    const row = this.database.connection.prepare("SELECT * FROM companies WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.map(row) : undefined;
  }

  list(): CompanyRecord[] {
    const rows = this.database.connection
      .prepare("SELECT id FROM companies ORDER BY created_at")
      .all() as { id: string }[];
    return rows.flatMap(({ id }) => {
      const company = this.get(id);
      return company ? [company] : [];
    });
  }

  employees(companyId: string): Employee[] {
    const rows = this.database.connection
      .prepare("SELECT * FROM employees WHERE company_id = ? ORDER BY hired_at")
      .all(companyId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      title: String(row.title),
      role: String(row.role),
      department: String(row.department),
      team: null,
      manager: typeof row.manager_id === "string" ? row.manager_id : null,
      status: String(row.status) as Employee["status"],
      responsibilities: parseJson(row.responsibilities_json),
      capabilityTags: parseJson(row.capabilities_json),
      hiredAt: String(row.hired_at),
    }));
  }

  require(id: string): CompanyRecord {
    const company = this.get(id);
    if (!company) throw new Error(`Unknown company: ${id}`);
    return company;
  }

  private build(id: string, input: CreateCompanyInput, createdAt: string): CompanyRecord {
    return {
      id,
      name: sanitizeTerminal(input.name, 200),
      displayName: sanitizeTerminal(input.displayName ?? input.name, 200),
      mission: sanitizeTerminal(input.mission ?? ""),
      vision: sanitizeTerminal(input.vision ?? ""),
      values: (input.values ?? []).map((value) => sanitizeTerminal(value, 200)),
      policies: input.policies ?? { network: "deny-by-default", terminationApproval: "ceo" },
      budgetCents: input.budgetCents ?? 0,
      createdAt,
    };
  }

  private insert(company: CompanyRecord): void {
    this.database.connection
      .prepare("INSERT INTO companies VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        company.id,
        company.name,
        company.displayName,
        company.mission,
        company.vision,
        JSON.stringify(company.values),
        JSON.stringify(company.policies),
        company.budgetCents,
        company.createdAt,
      );
  }

  private insertEmployee(companyId: string, employee: Employee): void {
    this.database.connection
      .prepare("INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        employee.id,
        companyId,
        employee.name,
        employee.title,
        employee.role ?? "contributor",
        employee.department,
        employee.manager,
        employee.status,
        JSON.stringify(employee.responsibilities),
        JSON.stringify(employee.capabilityTags),
        employee.hiredAt,
      );
  }

  private insertRooms(companyId: string, createdAt: string): void {
    const insert = this.database.connection.prepare("INSERT INTO rooms VALUES (?, ?, ?, ?, ?)");
    for (const [id, name, kind] of [
      ["ceo-office", "CEO Office", "private-office"],
      ["arm-office", "ARM Office", "private-office"],
      ["company-lobby", "Company Lobby", "company"],
    ] as const)
      insert.run(id, companyId, name, kind, createdAt);
  }

  private durableEmployees(hiredAt: string): Employee[] {
    return [
      {
        id: "ceo",
        name: "Chief Executive",
        title: "CEO Agent",
        role: "executive",
        department: "executive",
        team: null,
        manager: null,
        status: "active",
        responsibilities: ["Strategy", "priorities", "delegation", "approvals"],
        capabilityTags: ["strategy", "delegation", "approval"],
        hiredAt,
      },
      {
        id: "arm",
        name: "Agent Resources Manager",
        title: "Agent Resources Manager",
        role: "manager",
        department: "people-operations",
        team: null,
        manager: "ceo",
        status: "active",
        responsibilities: [
          "Capacity planning",
          "adaptive hiring",
          "evidence-based performance",
          "safe offboarding",
        ],
        capabilityTags: ["workforce-planning", "hiring", "governance"],
        hiredAt,
      },
    ];
  }

  private map(row: Record<string, unknown>): CompanyRecord {
    return {
      id: String(row.id),
      name: String(row.name),
      displayName: String(row.display_name),
      mission: String(row.mission),
      vision: String(row.vision),
      values: parseJson(row.values_json),
      policies: parseJson(row.policies_json),
      budgetCents: Number(row.budget_cents),
      createdAt: String(row.created_at),
    };
  }
}
