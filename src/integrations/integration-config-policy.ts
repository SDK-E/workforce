const SECRET_NAME = /^[A-Z][A-Z0-9_]{1,63}$/;
const ENV_REFERENCE = /^\{env:([A-Z][A-Z0-9_]{1,63})\}$/;
const SENSITIVE_KEY = /(authorization|credential|password|secret|token|api[_-]?key)/i;

export function validateSecretName(name: string, label: string): void {
  if (!SECRET_NAME.test(name)) throw new Error(`Invalid ${label} secret name: ${name}`);
}

export function validateIntegrationConfig(
  config: Record<string, unknown>,
  secretRequirements: string[],
): void {
  const declared = new Set(secretRequirements);
  inspectValue(config, declared, "config");
}

function inspectValue(value: unknown, declared: Set<string>, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      inspectValue(item, declared, `${path}[${index}]`);
    });
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) validateSensitiveValue(child, declared, `${path}.${key}`);
      else inspectValue(child, declared, `${path}.${key}`);
    }
    return;
  }
  if (typeof value !== "string") return;
  const reference = ENV_REFERENCE.exec(value)?.[1];
  if (reference && !declared.has(reference))
    throw new Error(`Undeclared secret reference at ${path}: ${reference}`);
  if (looksLikeCredentialUrl(value))
    throw new Error(`Embedded URL credentials are forbidden at ${path}`);
}

function validateSensitiveValue(value: unknown, declared: Set<string>, path: string): void {
  if (typeof value !== "string")
    throw new Error(`Secret material must be an env reference at ${path}`);
  const reference = ENV_REFERENCE.exec(value)?.[1];
  if (!reference || !declared.has(reference))
    throw new Error(`Secret material must reference a declared secret at ${path}`);
}

function looksLikeCredentialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return Boolean(url.username || url.password);
  } catch {
    return false;
  }
}
