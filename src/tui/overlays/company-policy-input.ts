export function parseCompanyPolicies(value: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.trim() ? value : "{}");
  } catch {
    throw new Error("Policies and governance must be a valid JSON object");
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
    throw new Error("Policies and governance must be a JSON object");
  return parsed as Record<string, unknown>;
}
