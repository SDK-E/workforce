import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { StateStore } from "../storage/state-store.js";
import type { EncryptedSecretStore } from "../secrets/encrypted-secret-store.js";
import type { AttemptMcpTokenService } from "./attempt-mcp-token-service.js";
import { createWorkforceMcpServer } from "./workforce-mcp-server.js";
import type { WorkforceMcpRuntimeActions } from "./workforce-mcp-runtime-actions.js";

export interface WorkforceMcpHttpConfiguration {
  host: string;
  port: number;
  path?: string;
  allowedHosts: string[];
  maxBodyBytes?: number;
  maxConcurrentRequests?: number;
  requestsPerMinute?: number;
}

export class WorkforceMcpHttpService {
  private server: Server | undefined;
  private activeRequests = 0;
  private readonly rateWindows = new Map<string, number[]>();

  constructor(
    private readonly store: StateStore,
    private readonly tokens: AttemptMcpTokenService,
    private readonly configuration: WorkforceMcpHttpConfiguration,
    private readonly secrets?: EncryptedSecretStore,
    private readonly actions?: WorkforceMcpRuntimeActions,
  ) {
    if (!configuration.host.trim()) throw new Error("Workforce MCP bind host is required");
    if (!configuration.allowedHosts.length)
      throw new Error("Workforce MCP allowed hosts are required");
    if (
      !Number.isInteger(configuration.port) ||
      configuration.port < 0 ||
      configuration.port > 65_535
    )
      throw new Error("Workforce MCP port is invalid");
  }

  async start(): Promise<URL> {
    if (this.server) throw new Error("Workforce MCP HTTP service is already running");
    this.server = createServer((request, response) => {
      void this.handle(request, response);
    });
    this.server.requestTimeout = 30_000;
    this.server.headersTimeout = 10_000;
    this.server.keepAliveTimeout = 5_000;
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.configuration.port, this.configuration.host, () => {
        resolve();
      });
    });
    const address = this.server.address();
    if (!address || typeof address === "string")
      throw new Error("Workforce MCP listener unavailable");
    return new URL(`http://${formatHost(this.configuration.host)}:${address.port}${this.path}`);
  }

  async close(): Promise<void> {
    const current = this.server;
    this.server = undefined;
    if (!current) return;
    await new Promise<void>((resolve, reject) => {
      current.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (request.url !== this.path) {
        respond(response, 404, "Not found");
        return;
      }
      if (request.method !== "POST") {
        respond(response, 405, "Method not allowed");
        return;
      }
      if (!this.hostAllowed(request.headers.host)) {
        respond(response, 421, "Misdirected request");
        return;
      }
      if (this.activeRequests >= (this.configuration.maxConcurrentRequests ?? 32)) {
        respond(response, 503, "MCP request capacity reached");
        return;
      }
      const token = bearerToken(request.headers.authorization);
      if (!token) {
        unauthorized(response);
        return;
      }
      const principal = this.tokens.verify(token);
      const attemptId = principal.id.replace(/^attempt:/, "");
      const attempt = this.store.attempts.get(attemptId);
      if (
        !["starting", "running"].includes(attempt.status) ||
        attempt.companyId !== principal.companyIds[0] ||
        attempt.employeeId !== principal.employeeId
      ) {
        unauthorized(response);
        return;
      }
      if (!this.withinRateLimit(attemptId)) {
        respond(response, 429, "Rate limit exceeded");
        return;
      }
      const body = await readJson(request, this.configuration.maxBodyBytes ?? 262_144);
      this.activeRequests += 1;
      try {
        const transport = new StreamableHTTPServerTransport();
        const mcp = createWorkforceMcpServer(this.store, principal, this.secrets, this.actions);
        await mcp.connect(transport as Transport);
        try {
          await transport.handleRequest(request, response, body);
        } finally {
          await mcp.close();
        }
      } finally {
        this.activeRequests -= 1;
      }
    } catch (error) {
      if (!response.headersSent) respond(response, classifyError(error), safeError(error));
      else response.destroy();
    }
  }

  private hostAllowed(host: string | undefined): boolean {
    if (!host) return false;
    try {
      const hostname = new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
      return this.configuration.allowedHosts.map((value) => value.toLowerCase()).includes(hostname);
    } catch {
      return false;
    }
  }

  private withinRateLimit(attemptId: string): boolean {
    const now = Date.now();
    const current = (this.rateWindows.get(attemptId) ?? []).filter((at) => now - at < 60_000);
    if (current.length >= (this.configuration.requestsPerMinute ?? 120)) return false;
    current.push(now);
    this.rateWindows.set(attemptId, current);
    return true;
  }

  private get path(): string {
    return this.configuration.path ?? "/mcp";
  }
}

function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(header ?? "");
  return match?.[1];
}

async function readJson(request: IncomingMessage, maximum: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > maximum) throw new RequestError(413, "MCP request exceeds body limit");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "Invalid JSON request");
  }
}

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function classifyError(error: unknown): number {
  if (error instanceof RequestError) return error.status;
  if (error instanceof Error && /token|attempt/i.test(error.message)) return 401;
  return 500;
}

function safeError(error: unknown): string {
  if (error instanceof RequestError) return error.message;
  if (error instanceof Error && /token|attempt/i.test(error.message)) return "Unauthorized";
  return "Internal MCP error";
}

function unauthorized(response: ServerResponse): void {
  response.setHeader("WWW-Authenticate", "Bearer");
  respond(response, 401, "Unauthorized");
}

function respond(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: message }));
}

function formatHost(host: string): string {
  return host.includes(":") ? `[${host}]` : host;
}
