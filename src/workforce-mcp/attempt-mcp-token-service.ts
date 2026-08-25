import { createHmac, randomBytes, randomUUID, timingSafeEqual, type BinaryLike } from "node:crypto";
import type { AttemptRecord } from "../supervision/attempt-types.js";
import type { WorkforceMcpCapability, WorkforceMcpPrincipal } from "./mcp-principal.js";

const TOKEN_VERSION = 1;
export const WORKFORCE_MCP_TOKEN_ENV = "WORKFORCE_MCP_TOKEN";

interface AttemptTokenClaims {
  version: number;
  nonce: string;
  attemptId: string;
  companyId: string;
  taskId: string;
  employeeId: string;
  role: WorkforceMcpPrincipal["role"];
  capabilities: WorkforceMcpCapability[];
  issuedAt: number;
  expiresAt: number;
}

export class AttemptMcpTokenService {
  private readonly revoked = new Set<string>();
  private readonly activeNonceByAttempt = new Map<string, string>();

  constructor(
    private readonly signingKey: BinaryLike = randomBytes(32),
    private readonly lifetimeSeconds = 900,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (lifetimeSeconds < 1) throw new Error("Attempt MCP token lifetime must be positive");
  }

  issue(attempt: AttemptRecord): string {
    const issuedAt = Math.floor(this.now() / 1_000);
    const claims: AttemptTokenClaims = {
      version: TOKEN_VERSION,
      nonce: randomUUID(),
      attemptId: attempt.id,
      companyId: attempt.companyId,
      taskId: attempt.taskId,
      employeeId: attempt.employeeId,
      role:
        attempt.employeeId === "ceo" ? "ceo" : attempt.employeeId === "arm" ? "arm" : "employee",
      capabilities: attemptCapabilities(attempt.employeeId),
      issuedAt,
      expiresAt: issuedAt + this.lifetimeSeconds,
    };
    const previous = this.activeNonceByAttempt.get(attempt.id);
    if (previous) this.revoked.add(previous);
    this.activeNonceByAttempt.set(attempt.id, claims.nonce);
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${payload}.${this.sign(payload)}`;
  }

  verify(
    token: string,
    expected?: { attemptId?: string; companyId?: string },
  ): WorkforceMcpPrincipal {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) throw new Error("Invalid attempt MCP token");
    const actual = Buffer.from(signature, "base64url");
    const wanted = Buffer.from(this.sign(payload), "base64url");
    if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted))
      throw new Error("Invalid attempt MCP token signature");
    const claims = parseClaims(payload);
    if (claims.version !== TOKEN_VERSION) throw new Error("Unsupported attempt MCP token version");
    if (claims.expiresAt <= Math.floor(this.now() / 1_000))
      throw new Error("Attempt MCP token expired");
    if (this.revoked.has(claims.nonce)) throw new Error("Attempt MCP token revoked");
    if (expected?.attemptId && claims.attemptId !== expected.attemptId)
      throw new Error("Attempt MCP token attempt mismatch");
    if (expected?.companyId && claims.companyId !== expected.companyId)
      throw new Error("Attempt MCP token company mismatch");
    return {
      id: `attempt:${claims.attemptId}`,
      role: claims.role,
      companyIds: [claims.companyId],
      employeeId: claims.employeeId,
      taskId: claims.taskId,
      attemptId: claims.attemptId,
      capabilities: claims.capabilities,
    };
  }

  revoke(token: string): void {
    this.revoked.add(parseClaims(token.split(".")[0] ?? "").nonce);
  }

  revokeAttempt(attemptId: string): void {
    const nonce = this.activeNonceByAttempt.get(attemptId);
    if (!nonce) return;
    this.revoked.add(nonce);
    this.activeNonceByAttempt.delete(attemptId);
  }

  secretProvider(attempt: AttemptRecord): Record<string, string> {
    return attempt.ephemeralSecretNames.includes(WORKFORCE_MCP_TOKEN_ENV)
      ? { [WORKFORCE_MCP_TOKEN_ENV]: this.issue(attempt) }
      : {};
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.signingKey).update(payload).digest("base64url");
  }
}

function parseClaims(payload: string): AttemptTokenClaims {
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AttemptTokenClaims;
    if (
      !claims.nonce ||
      !claims.attemptId ||
      !claims.companyId ||
      !claims.taskId ||
      !claims.employeeId ||
      !Array.isArray(claims.capabilities) ||
      !Number.isInteger(claims.expiresAt)
    )
      throw new Error("invalid claims");
    return claims;
  } catch {
    throw new Error("Invalid attempt MCP token payload");
  }
}

function attemptCapabilities(employeeId: string): WorkforceMcpCapability[] {
  const participation: WorkforceMcpCapability[] = [
    "company:read",
    "task:read",
    "message:read",
    "message:write",
    "mail:read",
    "mail:write",
    "meeting:read",
    "meeting:write",
    "checkpoint:write",
    "attempt:read",
    "deliverable:read",
    "decision:read",
    "secret:read",
    "secret:write",
  ];
  if (employeeId === "ceo")
    return [
      ...participation,
      "audit:read",
      "work:mutate",
      "workforce:manage",
      "company:manage",
      "emergency:stop",
      "secret:manage",
    ];
  if (employeeId === "arm") return [...participation, "work:mutate", "workforce:manage"];
  return participation;
}
