import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Employee, WorkforceEvent } from "../domain.js";
import type { CompanyRecord, CreateCompanyInput, EntityRecord, MessageRecord } from "./records.js";
import { CURRENT_SCHEMA_VERSION, INITIAL_SCHEMA } from "./schema.js";
import { parseJson } from "./serialization.js";
import { sanitizeTerminal } from "./sanitize-terminal.js";

const COMPANY_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const GENESIS_HASH = "GENESIS";

export class StateStore {
  readonly root: string;
  readonly path: string;

  #database: DatabaseSync | null = null;

  constructor(root = resolve(process.cwd(), ".workforce")) {
    this.root = root;
    this.path = resolve(root, "workforce.sqlite");
  }

  get db(): DatabaseSync {
    if (!this.#database) {
      throw new Error("StateStore is not initialized");
    }
    return this.#database;
  }

  async initialize(): Promise<void> {
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    mkdirSync(resolve(this.root, "artifacts"), { recursive: true, mode: 0o700 });

    this.#database ??= new DatabaseSync(this.path);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
    `);

    this.transaction(() => this.applyInitialMigration());
  }

  close(): void {
    this.#database?.close();
    this.#database = null;
  }

  transaction<T>(operation: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  createCompany(input: CreateCompanyInput): CompanyRecord {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();

    if (!COMPANY_ID_PATTERN.test(id)) {
      throw new Error("Company id must be 2-64 lowercase letters, numbers, or hyphens");
    }

    const company = this.buildCompanyRecord(id, input, now);
    if (!company.name) {
      throw new Error("Company name is required");
    }

    this.transaction(() => {
      this.insertCompany(company);
      this.insertDurableEmployees(company.id, now);
      this.insertDefaultRooms(company.id, now);
      this.appendEvent("company.created", "human", company.id, {
        name: company.name,
      });
    });

    return company;
  }

  /** Compatibility bridge for callers from the original foundation. */
  async bootstrapOrganization(id: string, name: string): Promise<Employee[]> {
    if (!this.company(id)) {
      this.createCompany({ id, name });
    }
    return this.employees(id);
  }

  company(id: string): CompanyRecord | undefined {
    const row = this.db.prepare("SELECT * FROM companies WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;

    return row ? this.mapCompany(row) : undefined;
  }

  companies(): CompanyRecord[] {
    const rows = this.db.prepare("SELECT id FROM companies ORDER BY created_at").all() as Array<{
      id: string;
    }>;

    return rows.map(({ id }) => this.company(id)!);
  }

  employees(companyId: string): Employee[] {
    const rows = this.db
      .prepare("SELECT * FROM employees WHERE company_id = ? ORDER BY hired_at")
      .all(companyId) as Array<Record<string, unknown>>;

    return rows.map((row) => this.mapEmployee(row));
  }

  createEntity(
    companyId: string,
    kind: string,
    name: string,
    data: Record<string, unknown> = {},
    parentId: string | null = null,
  ): EntityRecord {
    this.requireCompany(companyId);
    const now = new Date().toISOString();
    const entity: EntityRecord = {
      id: randomUUID(),
      companyId,
      kind: sanitizeTerminal(kind, 40),
      parentId,
      name: sanitizeTerminal(name, 200),
      status: "active",
      data,
      createdAt: now,
      updatedAt: now,
    };

    this.transaction(() => {
      this.db
        .prepare("INSERT INTO entities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          entity.id,
          companyId,
          entity.kind,
          parentId,
          entity.name,
          entity.status,
          JSON.stringify(data),
          now,
          now,
        );
      this.appendEvent(`${entity.kind}.created`, "human", companyId, {
        id: entity.id,
        name: entity.name,
      });
    });

    return entity;
  }

  entities(companyId: string, kind?: string, limit = 100): EntityRecord[] {
    const rows = (
      kind
        ? this.db
            .prepare(
              "SELECT * FROM entities WHERE company_id = ? AND kind = ? ORDER BY updated_at DESC LIMIT ?",
            )
            .all(companyId, kind, limit)
        : this.db
            .prepare("SELECT * FROM entities WHERE company_id = ? ORDER BY updated_at DESC LIMIT ?")
            .all(companyId, limit)
    ) as Array<Record<string, unknown>>;

    return rows.map((row) => this.mapEntity(row));
  }

  addMessage(
    companyId: string,
    roomId: string,
    authorId: string,
    body: string,
    threadId: string | null = null,
  ): MessageRecord {
    this.requireCompany(companyId);
    const message: MessageRecord = {
      id: randomUUID(),
      companyId,
      roomId,
      threadId,
      authorId: sanitizeTerminal(authorId, 100),
      body: sanitizeTerminal(body),
      createdAt: new Date().toISOString(),
      pinned: false,
    };

    this.transaction(() => {
      this.db
        .prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          message.id,
          companyId,
          roomId,
          threadId,
          message.authorId,
          message.body,
          0,
          message.createdAt,
        );
      this.appendEvent("message.created", message.authorId, companyId, {
        messageId: message.id,
        roomId,
        threadId,
      });
    });

    return message;
  }

  messages(companyId: string, roomId: string, limit = 100): MessageRecord[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM messages WHERE company_id = ? AND room_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(companyId, roomId, limit) as Array<Record<string, unknown>>;

    return rows.reverse().map((row) => this.mapMessage(row));
  }

  requestApproval(
    companyId: string,
    subjectType: string,
    subjectId: string,
    requestedBy: string,
  ): string {
    this.requireCompany(companyId);
    const id = randomUUID();
    const now = new Date().toISOString();

    this.transaction(() => {
      this.db
        .prepare(
          `
          INSERT INTO approvals (
            id, company_id, subject_type, subject_id,
            requested_by, status, created_at
          ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
        `,
        )
        .run(id, companyId, subjectType, subjectId, requestedBy, now);
      this.appendEvent("approval.requested", requestedBy, companyId, {
        id,
        subjectType,
        subjectId,
      });
    });

    return id;
  }

  pendingApprovals(companyId: string): number {
    const row = this.db
      .prepare(
        "SELECT count(*) AS count FROM approvals WHERE company_id = ? AND status = 'pending'",
      )
      .get(companyId) as { count: number };
    return Number(row.count);
  }

  eventCount(companyId: string): number {
    const row = this.db
      .prepare("SELECT count(*) AS count FROM events WHERE company_id = ?")
      .get(companyId) as { count: number };
    return Number(row.count);
  }

  async append(
    type: string,
    actor: string,
    organizationId: string,
    data: Record<string, unknown>,
  ): Promise<WorkforceEvent> {
    return this.appendEvent(type, actor, organizationId, data);
  }

  async events(companyId?: string, limit = 500): Promise<WorkforceEvent[]> {
    const rows = (
      companyId
        ? this.db
            .prepare("SELECT * FROM events WHERE company_id = ? ORDER BY sequence DESC LIMIT ?")
            .all(companyId, limit)
        : this.db.prepare("SELECT * FROM events ORDER BY sequence DESC LIMIT ?").all(limit)
    ) as Array<Record<string, unknown>>;

    return rows.reverse().map((row) => this.mapEvent(row));
  }

  verifyAuditChain(): boolean {
    const rows = this.db.prepare("SELECT * FROM events ORDER BY sequence").all() as Array<
      Record<string, unknown>
    >;
    let previousHash = GENESIS_HASH;

    for (const row of rows) {
      const event = this.mapEvent(row);
      const expectedHash = this.hashEvent(previousHash, event);
      if (row.previous_hash !== previousHash || row.hash !== expectedHash) {
        return false;
      }
      previousHash = String(row.hash);
    }

    return true;
  }

  backup(target: string): void {
    const targetPath = resolve(target);
    if (targetPath === this.path) {
      throw new Error("Backup target must differ from database");
    }

    this.db.exec("PRAGMA wal_checkpoint(FULL)");
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, readFileSync(this.path), { mode: 0o600 });
  }

  private applyInitialMigration(): void {
    const migrationTable = this.db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .get();
    if (migrationTable) return;

    this.db.exec(INITIAL_SCHEMA);
    this.db
      .prepare("INSERT INTO schema_migrations VALUES (?, ?)")
      .run(CURRENT_SCHEMA_VERSION, new Date().toISOString());
  }

  private buildCompanyRecord(
    id: string,
    input: CreateCompanyInput,
    createdAt: string,
  ): CompanyRecord {
    return {
      id,
      name: sanitizeTerminal(input.name, 200),
      displayName: sanitizeTerminal(input.displayName ?? input.name, 200),
      mission: sanitizeTerminal(input.mission ?? ""),
      vision: sanitizeTerminal(input.vision ?? ""),
      values: (input.values ?? []).map((value) => sanitizeTerminal(value, 200)),
      policies: input.policies ?? {
        network: "deny-by-default",
        terminationApproval: "ceo",
      },
      budgetCents: input.budgetCents ?? 0,
      createdAt,
    };
  }

  private insertCompany(company: CompanyRecord): void {
    this.db
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

  private insertDurableEmployees(companyId: string, hiredAt: string): void {
    const employees: Employee[] = [
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

    for (const employee of employees) {
      this.insertEmployee(companyId, employee);
    }
  }

  private insertEmployee(companyId: string, employee: Employee): void {
    this.db
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

  private insertDefaultRooms(companyId: string, createdAt: string): void {
    const rooms = [
      ["ceo-office", "CEO Office", "private-office"],
      ["arm-office", "ARM Office", "private-office"],
      ["company-lobby", "Company Lobby", "company"],
    ] as const;

    const insert = this.db.prepare("INSERT INTO rooms VALUES (?, ?, ?, ?, ?)");
    for (const [id, name, kind] of rooms) {
      insert.run(id, companyId, name, kind, createdAt);
    }
  }

  private appendEvent(
    type: string,
    actor: string,
    companyId: string,
    data: Record<string, unknown>,
  ): WorkforceEvent {
    const previous = this.db
      .prepare("SELECT hash FROM events ORDER BY sequence DESC LIMIT 1")
      .get() as { hash: string } | undefined;
    const event: WorkforceEvent = {
      id: randomUUID(),
      at: new Date().toISOString(),
      type: sanitizeTerminal(type, 100),
      actor: sanitizeTerminal(actor, 100),
      organizationId: companyId,
      data,
    };
    const previousHash = previous?.hash ?? GENESIS_HASH;
    const hash = this.hashEvent(previousHash, event);

    this.db
      .prepare(
        `
        INSERT INTO events (
          id, at, type, actor, company_id, data_json, previous_hash, hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        event.id,
        event.at,
        event.type,
        event.actor,
        companyId,
        JSON.stringify(data),
        previousHash,
        hash,
      );

    return event;
  }

  private hashEvent(previousHash: string, event: WorkforceEvent): string {
    return createHash("sha256")
      .update(`${previousHash}\n${JSON.stringify(event)}`)
      .digest("hex");
  }

  private requireCompany(id: string): void {
    if (!this.company(id)) {
      throw new Error(`Unknown company: ${id}`);
    }
  }

  private mapCompany(row: Record<string, unknown>): CompanyRecord {
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

  private mapEmployee(row: Record<string, unknown>): Employee {
    return {
      id: String(row.id),
      name: String(row.name),
      title: String(row.title),
      role: String(row.role),
      department: String(row.department),
      team: null,
      manager: row.manager_id === null ? null : String(row.manager_id),
      status: String(row.status) as Employee["status"],
      responsibilities: parseJson(row.responsibilities_json),
      capabilityTags: parseJson(row.capabilities_json),
      hiredAt: String(row.hired_at),
    };
  }

  private mapEntity(row: Record<string, unknown>): EntityRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      kind: String(row.kind),
      parentId: row.parent_id === null ? null : String(row.parent_id),
      name: String(row.name),
      status: String(row.status),
      data: parseJson(row.data_json),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapMessage(row: Record<string, unknown>): MessageRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      roomId: String(row.room_id),
      threadId: row.thread_id === null ? null : String(row.thread_id),
      authorId: String(row.author_id),
      body: String(row.body),
      createdAt: String(row.created_at),
      pinned: Number(row.pinned) === 1,
    };
  }

  private mapEvent(row: Record<string, unknown>): WorkforceEvent {
    return {
      id: String(row.id),
      at: String(row.at),
      type: String(row.type),
      actor: String(row.actor),
      organizationId: String(row.company_id),
      data: parseJson(row.data_json),
    };
  }
}
