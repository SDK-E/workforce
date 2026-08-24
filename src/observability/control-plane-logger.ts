import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import pino, { type Logger } from "pino";

const REDACTED_PATHS = [
  "secret",
  "token",
  "password",
  "authorization",
  "credential",
  "*.secret",
  "*.token",
  "*.password",
  "*.authorization",
  "*.credential",
  "headers.authorization",
  "headers.cookie",
];

export function createControlPlaneLogger(stateRoot: string): Logger {
  const logsDirectory = resolve(stateRoot, "logs");
  mkdirSync(logsDirectory, { recursive: true, mode: 0o700 });
  const destination = pino.destination({
    dest: resolve(logsDirectory, "control-plane.jsonl"),
    mkdir: true,
    sync: true,
  });
  return pino(
    {
      name: "workforce-control-plane",
      level: process.env.WORKFORCE_LOG_LEVEL ?? "info",
      redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
      base: { component: "control-plane" },
    },
    destination,
  );
}
