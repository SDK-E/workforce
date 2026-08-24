import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface SqlMigration {
  version: number;
  sql: string;
}

export function loadMigrations(
  directory = resolve(dirname(fileURLToPath(import.meta.url)), "migrations"),
): SqlMigration[] {
  const migrations = readdirSync(directory)
    .filter((name) => /^\d{3}\.sql$/.test(name))
    .sort()
    .map((name) => ({
      version: Number(name.slice(0, 3)),
      sql: readFileSync(resolve(directory, name), "utf8"),
    }));
  for (const [index, migration] of migrations.entries()) {
    if (migration.version !== index + 1)
      throw new Error("Migrations must be ordered and contiguous");
  }
  return migrations;
}
