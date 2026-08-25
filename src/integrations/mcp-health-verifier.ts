import { randomUUID } from "node:crypto";
import { execa } from "execa";
import type { McpServerRecord } from "./integration-types.js";
import type { McpServerRepository } from "./mcp-server-repository.js";

export interface McpProbeResult {
  healthy: boolean;
  details: Record<string, unknown>;
}

export interface McpProbeRunner {
  probe(server: McpServerRecord, secrets: Record<string, string>): Promise<McpProbeResult>;
}

export class DockerMcpProbeRunner implements McpProbeRunner {
  constructor(
    private readonly image = "workforce-agent:0.1.0",
    private readonly network = "workforce-egress-internal",
    private readonly proxyUrl = "http://workforce-egress-proxy:3128",
  ) {}

  async probe(server: McpServerRecord, secrets: Record<string, string>): Promise<McpProbeResult> {
    const config = JSON.stringify({
      transport: server.transport,
      endpoint: server.endpoint,
      command: server.command,
      credentialBindings: server.credentialBindings,
    });
    const secretNames = Object.keys(secrets);
    const result = await execa(
      "docker",
      [
        "run",
        "--rm",
        "--name",
        `workforce-mcp-probe-${randomUUID()}`,
        "--label",
        "workforce.managed=true",
        "--read-only",
        "--user",
        "10001:10001",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges:true",
        "--network",
        this.network,
        "--env",
        "WORKFORCE_MCP_PROBE_CONFIG",
        "--env",
        "HTTPS_PROXY",
        "--env",
        "HTTP_PROXY",
        ...secretNames.flatMap((name) => ["--env", name]),
        this.image,
        "workforce-mcp-probe",
      ],
      {
        reject: false,
        timeout: 15_000,
        env: {
          ...process.env,
          WORKFORCE_MCP_PROBE_CONFIG: config,
          HTTPS_PROXY: this.proxyUrl,
          HTTP_PROXY: this.proxyUrl,
          ...secrets,
        },
      },
    );
    return {
      healthy: result.exitCode === 0,
      details: {
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        output: result.exitCode === 0 ? result.stdout.slice(-2_000) : result.stderr.slice(-2_000),
      },
    };
  }
}

export class McpHealthVerifier {
  constructor(
    private readonly servers: McpServerRepository,
    private readonly runner: McpProbeRunner,
    private readonly secrets: (server: McpServerRecord) => Record<string, string>,
  ) {}

  async verify(companyId: string, serverId: string, actorId: string): Promise<McpServerRecord> {
    const server = this.servers.get(companyId, serverId);
    if (!server) throw new Error(`Unknown MCP server: ${serverId}`);
    const result = await this.runner.probe(server, this.secrets(server));
    return this.servers.recordHealth(
      companyId,
      serverId,
      result.healthy ? "healthy" : "unavailable",
      result.details,
      actorId,
    );
  }
}
