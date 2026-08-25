import type { AttemptRecord } from "../supervision/attempt-types.js";

export type WorkforceFailureClass =
  | "provider"
  | "infrastructure"
  | "permission"
  | "requirements"
  | "acceptance"
  | "unknown";

export function classifyWorkforceFailure(attempt: AttemptRecord): WorkforceFailureClass {
  const reason = (attempt.failureReason ?? "").toLowerCase();
  if (
    attempt.status === "infrastructure-blocked" ||
    matches(reason, [
      "docker",
      "daemon",
      "image",
      "volume",
      "network",
      "proxy",
      "resource pressure",
    ])
  )
    return "infrastructure";
  if (matches(reason, ["provider", "model", "rate limit", "quota", "inference", "circuit breaker"]))
    return "provider";
  if (matches(reason, ["permission", "denied", "policy", "secret", "credential", "not authorized"]))
    return "permission";
  if (
    matches(reason, [
      "requirement",
      "contradict",
      "unsupported capability",
      "missing input",
      "unclear",
    ])
  )
    return "requirements";
  if (
    matches(reason, [
      "acceptance",
      "validator",
      "missing artifact",
      "false completion",
      "test failed",
    ])
  )
    return "acceptance";
  return "unknown";
}

function matches(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}
