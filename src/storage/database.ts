import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  CURRENT_SCHEMA_VERSION,
  INITIAL_SCHEMA,
  TASKS_SCHEMA,
  TASKS_SCHEMA_VERSION,
  ORGANIZATION_SCHEMA,
  ORGANIZATION_SCHEMA_VERSION,
} from "./schema.js";

export class WorkforceDatabase {
  readonly root: string;
  readonly path: string;
  #connection: DatabaseSync | null = null;

  constructor(root = resolve(process.cwd(), ".workforce")) {
    this.root = root;
    this.path = resolve(root, "workforce.sqlite");
  }

  get connection(): DatabaseSync {
    if (!this.#connection) throw new Error("WorkforceDatabase is not initialized");
    return this.#connection;
  }

  initialize(): void {
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    mkdirSync(resolve(this.root, "artifacts"), { recursive: true, mode: 0o700 });
    this.#connection ??= new DatabaseSync(this.path);
    this.connection.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
    `);
    this.transaction(() => {
      this.applyMigrations();
    });
  }

  close(): void {
    this.#connection?.close();
    this.#connection = null;
  }

  transaction<T>(operation: () => T): T {
    this.connection.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.connection.exec("COMMIT");
      return result;
    } catch (error) {
      this.connection.exec("ROLLBACK");
      throw error;
    }
  }

  backup(target: string): void {
    const targetPath = resolve(target);
    if (targetPath === this.path) throw new Error("Backup target must differ from database");
    this.connection.exec("PRAGMA wal_checkpoint(FULL)");
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, readFileSync(this.path), { mode: 0o600 });
  }

  private applyMigrations(): void {
    const exists = this.connection
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .get();
    if (!exists) {
      this.connection.exec(INITIAL_SCHEMA);
      this.recordMigration(CURRENT_SCHEMA_VERSION);
    }
    const row = this.connection
      .prepare("SELECT max(version) AS version FROM schema_migrations")
      .get() as { version: number };
    if (row.version < TASKS_SCHEMA_VERSION) {
      this.connection.exec(TASKS_SCHEMA);
      this.recordMigration(TASKS_SCHEMA_VERSION);
    }
    const afterTasks = this.connection
      .prepare("SELECT max(version) AS version FROM schema_migrations")
      .get() as { version: number };
    if (afterTasks.version < ORGANIZATION_SCHEMA_VERSION) {
      this.connection.exec(ORGANIZATION_SCHEMA);
      this.recordMigration(ORGANIZATION_SCHEMA_VERSION);
    }
  }

  private recordMigration(version: number): void {
    this.connection
      .prepare("INSERT INTO schema_migrations VALUES (?, ?)")
      .run(version, new Date().toISOString());
  }
}
