import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  SecretAccessContext,
  SecretAuditSink,
  SecretMetadata,
  SecretScope,
} from "./secret-types.js";

const KEY_BYTES = 32;
const NONCE_BYTES = 12;

export class EncryptedSecretStore {
  readonly directory: string;
  readonly databasePath: string;
  readonly keyPath: string;
  #database: DatabaseSync | null = null;
  #key: Buffer | null = null;

  constructor(
    stateRoot: string,
    private readonly audit?: SecretAuditSink,
  ) {
    this.directory = resolve(stateRoot, "secrets");
    this.databasePath = resolve(this.directory, "secrets.sqlite");
    this.keyPath = resolve(this.directory, "master.key");
  }

  initialize(): void {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    this.#key = this.loadOrCreateKey();
    this.#database = new DatabaseSync(this.databasePath);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS secrets (
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        nonce TEXT NOT NULL,
        tag TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        scope_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (company_id, name)
      );
    `);
  }

  close(): void {
    this.#database?.close();
    this.#database = null;
    this.#key?.fill(0);
    this.#key = null;
  }

  set(companyId: string, name: string, value: string, scope: SecretScope): SecretMetadata {
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(name)) throw new Error("Invalid secret name");
    if (!value) throw new Error("Secret value must not be empty");
    const now = new Date().toISOString();
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.key, nonce);
    cipher.setAAD(Buffer.from(`${companyId}\0${name}`, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const existing = this.database
      .prepare("SELECT created_at FROM secrets WHERE company_id = ? AND name = ?")
      .get(companyId, name) as { created_at: string } | undefined;
    const createdAt = existing?.created_at ?? now;
    this.database
      .prepare(
        `INSERT INTO secrets
      (company_id, name, nonce, tag, ciphertext, scope_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(company_id, name) DO UPDATE SET
        nonce = excluded.nonce, tag = excluded.tag, ciphertext = excluded.ciphertext,
        scope_json = excluded.scope_json, updated_at = excluded.updated_at`,
      )
      .run(
        companyId,
        name,
        nonce.toString("base64"),
        tag.toString("base64"),
        ciphertext.toString("base64"),
        JSON.stringify(scope),
        createdAt,
        now,
      );
    this.audit?.("secret.stored", { companyId, name });
    return { companyId, name, scope, createdAt, updatedAt: now };
  }

  get(name: string, context: SecretAccessContext): string {
    const row = this.database
      .prepare("SELECT * FROM secrets WHERE company_id = ? AND name = ?")
      .get(context.companyId, name) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Secret not found: ${name}`);
    const scope = JSON.parse(String(row.scope_json)) as SecretScope;
    if (!this.isAllowed(scope, context)) {
      this.audit?.("secret.denied", {
        companyId: context.companyId,
        name,
        employeeId: context.employeeId,
        taskId: context.taskId,
      });
      throw new Error(`Secret access denied: ${name}`);
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(String(row.nonce), "base64"),
    );
    decipher.setAAD(Buffer.from(`${context.companyId}\0${name}`, "utf8"));
    decipher.setAuthTag(Buffer.from(String(row.tag), "base64"));
    const value = Buffer.concat([
      decipher.update(Buffer.from(String(row.ciphertext), "base64")),
      decipher.final(),
    ]).toString("utf8");
    this.audit?.("secret.accessed", {
      companyId: context.companyId,
      name,
      employeeId: context.employeeId,
      taskId: context.taskId,
    });
    return value;
  }

  list(companyId: string): SecretMetadata[] {
    const rows = this.database
      .prepare(
        "SELECT company_id, name, scope_json, created_at, updated_at FROM secrets WHERE company_id = ? ORDER BY name",
      )
      .all(companyId) as Record<string, unknown>[];
    return rows.map((row) => ({
      companyId: String(row.company_id),
      name: String(row.name),
      scope: JSON.parse(String(row.scope_json)) as SecretScope,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  private isAllowed(scope: SecretScope, context: SecretAccessContext): boolean {
    const employeeAllowed =
      scope.employeeIds.includes("*") || scope.employeeIds.includes(context.employeeId);
    const taskAllowed = scope.taskIds.includes("*") || scope.taskIds.includes(context.taskId);
    return employeeAllowed && taskAllowed;
  }

  private loadOrCreateKey(): Buffer {
    try {
      return readFileSync(this.keyPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const key = randomBytes(KEY_BYTES);
      try {
        writeFileSync(this.keyPath, key, { mode: 0o600, flag: "wx" });
        return key;
      } catch (writeError) {
        if ((writeError as NodeJS.ErrnoException).code !== "EEXIST") throw writeError;
        key.fill(0);
        return readFileSync(this.keyPath);
      }
    }
  }

  private get database(): DatabaseSync {
    if (!this.#database) throw new Error("EncryptedSecretStore is not initialized");
    return this.#database;
  }

  private get key(): Buffer {
    if (!this.#key || this.#key.length !== KEY_BYTES)
      throw new Error("Secret master key is unavailable or invalid");
    return this.#key;
  }
}
