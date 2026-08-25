import assert from "node:assert/strict";
import test from "node:test";
import type { AttemptRecord } from "../src/supervision/attempt-types.js";
import {
  AttemptMcpTokenService,
  WORKFORCE_MCP_TOKEN_ENV,
} from "../src/workforce-mcp/attempt-mcp-token-service.js";

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: "attempt-1",
    companyId: "acme",
    taskId: "task-1",
    employeeId: "worker-1",
    sandbox: {} as AttemptRecord["sandbox"],
    command: [],
    secretNames: [],
    ephemeralSecretNames: [WORKFORCE_MCP_TOKEN_ENV],
    environment: {},
    instructionRevision: null,
    instructionDigest: null,
    status: "running",
    containerName: "workforce-attempt-1",
    exitCode: null,
    failureReason: null,
    queuedAt: "2026-01-01T00:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("attempt MCP tokens are scoped, expiring, tamper-evident, and revocable", () => {
  let now = Date.parse("2026-01-01T00:00:00.000Z");
  const service = new AttemptMcpTokenService("test-signing-key", 60, () => now);
  const token = service.issue(attempt());
  const principal = service.verify(token, { attemptId: "attempt-1", companyId: "acme" });
  assert.deepEqual(principal.companyIds, ["acme"]);
  assert.equal(principal.employeeId, "worker-1");
  assert.ok(principal.capabilities.includes("message:write"));
  assert.ok(principal.capabilities.includes("secret:read"));
  assert.ok(principal.capabilities.includes("secret:write"));
  assert.ok(!principal.capabilities.includes("workforce:manage"));
  assert.throws(() => service.verify(token, { companyId: "other" }), /company mismatch/);
  assert.throws(() => service.verify(token, { attemptId: "attempt-2" }), /attempt mismatch/);
  const [payload, signature] = token.split(".");
  assert.throws(() => service.verify(`${payload}x.${signature}`), /signature/);
  service.revoke(token);
  assert.throws(() => service.verify(token), /revoked/);
  const expiring = service.issue(attempt({ id: "attempt-2" }));
  now += 61_000;
  assert.throws(() => service.verify(expiring), /expired/);
});

test("CEO receives company-owner authority while ARM receives workforce authority", () => {
  const service = new AttemptMcpTokenService("test-signing-key");
  const ceo = service.verify(service.issue(attempt({ employeeId: "ceo" })));
  const arm = service.verify(service.issue(attempt({ employeeId: "arm" })));
  assert.ok(ceo.capabilities.includes("company:manage"));
  assert.ok(ceo.capabilities.includes("secret:manage"));
  assert.ok(ceo.capabilities.includes("workforce:manage"));
  assert.ok(ceo.capabilities.includes("emergency:stop"));
  assert.ok(arm.capabilities.includes("workforce:manage"));
  assert.ok(!arm.capabilities.includes("company:manage"));
});

test("replacement and attempt completion revoke active credentials", () => {
  const service = new AttemptMcpTokenService("test-signing-key");
  const first = service.issue(attempt());
  const replacement = service.issue(attempt());
  assert.throws(() => service.verify(first), /revoked/);
  assert.doesNotThrow(() => service.verify(replacement));
  service.revokeAttempt("attempt-1");
  assert.throws(() => service.verify(replacement), /revoked/);
});
