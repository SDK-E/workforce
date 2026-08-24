import { cpSync, mkdirSync } from "node:fs";

mkdirSync("dist/src/storage/migrations", { recursive: true });
cpSync("src/storage/migrations", "dist/src/storage/migrations", { recursive: true });
