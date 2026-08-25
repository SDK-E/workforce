import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StateStore } from "../src/storage/state-store.js";
import { EncryptedSecretStore } from "../src/secrets/encrypted-secret-store.js";
import type { AttemptRecord, AttemptRequest } from "../src/supervision/attempt-types.js";
import { AttemptMcpTokenService } from "../src/workforce-mcp/attempt-mcp-token-service.js";
import { WorkforceMcpHttpService } from "../src/workforce-mcp/workforce-mcp-http-service.js";

function request(companyId = "acme"): AttemptRequest {
  return {
    id: `attempt-${companyId}`,
    companyId,
    taskId: "task-1",
    employeeId: "ceo",
    sandbox: {
      jobId: "job-1",
      profile: "engineering",
      image: "workforce-agent:0.1.0",
      engine: "opencode",
      networkMode: "inference-only",
      allowedHosts: [],
      readOnlyRoot: true,
      nonRoot: true,
      capDropAll: true,
      noNewPrivileges: true,
      workspace: { type: "volume", name: "workforce-job-1" },
      inputs: [],
      tmpfs: [],
      cpu: 1,
      memoryMb: 512,
      pids: 64,
      timeoutSeconds: 60,
      tools: [],
      decisions: [],
      rejectedCapabilities: [],
    },
    command: ["opencode", "run", "--model", "openai/gpt-5", "Work"],
    secretNames: [],
    ephemeralSecretNames: ["WORKFORCE_MCP_TOKEN"],
  };
}

function activate(store: StateStore, input: AttemptRequest): AttemptRecord {
  const queued = store.attempts.enqueue(input);
  store.attempts.acquire(queued, "test-owner");
  store.attempts.setStatus(input.id, "running");
  return store.attempts.get(input.id);
}

test("agent uses authenticated Streamable HTTP with its attempt principal", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-http-"));
  const store = new StateStore(root);
  const tokens = new AttemptMcpTokenService("http-test-key");
  const secrets = new EncryptedSecretStore(root);
  let service: WorkforceMcpHttpService | undefined;
  try {
    store.initialize();
    const company = store.createCompany({ id: "acme", name: "Acme" });
    secrets.initialize();
    secrets.set("acme", "HTTP_TEST_TOKEN", "transport-secret", {
      employeeIds: ["ceo"],
      taskIds: ["task-1"],
    });
    const attempt = activate(store, request());
    const token = tokens.issue(attempt);
    service = new WorkforceMcpHttpService(
      store,
      tokens,
      {
        host: "127.0.0.1",
        port: 0,
        allowedHosts: ["127.0.0.1"],
      },
      secrets,
    );
    const endpoint = await service.start();
    const client = new Client({ name: "agent-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { authorization: `Bearer ${token}` } },
    });
    await client.connect(transport as Transport);
    const result = await client.callTool({
      name: "company_overview",
      arguments: { companyId: company.id },
    });
    assert.match(JSON.stringify(result), /Acme/);
    const secret = await client.callTool({
      name: "get_secret",
      arguments: { companyId: company.id, name: "HTTP_TEST_TOKEN" },
    });
    assert.match(JSON.stringify(secret), /transport-secret/);
    await client.close();
  } finally {
    await service?.close();
    secrets.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("HTTP transport denies missing, forged, cross-company, ended, oversized, and hostile-host requests", async () => {
  const root = mkdtempSync(join(tmpdir(), "workforce-mcp-http-denial-"));
  const store = new StateStore(root);
  const tokens = new AttemptMcpTokenService("http-test-key");
  let service: WorkforceMcpHttpService | undefined;
  try {
    store.initialize();
    store.createCompany({ id: "acme", name: "Acme" });
    store.createCompany({ id: "other", name: "Other" });
    const attempt = activate(store, request());
    const token = tokens.issue(attempt);
    service = new WorkforceMcpHttpService(store, tokens, {
      host: "127.0.0.1",
      port: 0,
      allowedHosts: ["127.0.0.1"],
      maxBodyBytes: 64,
    });
    const endpoint = await service.start();
    assert.equal((await fetch(endpoint, { method: "POST", body: "{}" })).status, 401);
    assert.equal((await post(endpoint, `${token}x`, "{}")).status, 401);
    assert.equal((await post(endpoint, token, "x".repeat(65))).status, 413);
    assert.equal(await hostileHostPost(endpoint, token), 421);
    store.attempts.setStatus(attempt.id, "succeeded");
    assert.equal((await post(endpoint, token, "{}")).status, 401);
    const crossCompany = tokens.issue({ ...attempt, companyId: "other" });
    assert.equal((await post(endpoint, crossCompany, "{}")).status, 401);
  } finally {
    await service?.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function post(endpoint: URL, token: string, body: string, headers: Record<string, string> = {}) {
  return fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, ...headers },
    body,
  });
}

function hostileHostPost(endpoint: URL, token: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      endpoint,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, host: "attacker.invalid" },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      },
    );
    request.once("error", reject);
    request.end("{}");
  });
}
