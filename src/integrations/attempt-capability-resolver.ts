import type { SandboxSpec } from "../domain.js";
import type { TaskRecord } from "../tasks/task-types.js";
import type { McpServerRecord, ProjectIntegrationRecord } from "./integration-types.js";
import type { McpServerRepository } from "./mcp-server-repository.js";
import type { ProjectIntegrationRepository } from "./project-integration-repository.js";

export interface AttemptCapabilities {
  environment: Record<string, string>;
  secretNames: string[];
}

export class AttemptCapabilityResolver {
  constructor(
    private readonly mcpServers: McpServerRepository,
    private readonly projectIntegrations: ProjectIntegrationRepository,
  ) {}

  resolve(task: TaskRecord, engine: SandboxSpec["engine"]): AttemptCapabilities {
    const grants = task.tools.filter((tool) => tool.startsWith("mcp:")).map(parseMcpGrant);
    const servers = new Map<string, { record: McpServerRecord; tools: Set<string> }>();
    for (const grant of grants) {
      const record = this.mcpServers.get(task.companyId, grant.serverId);
      if (record?.status !== "active")
        throw new Error(`Task MCP server is not active: ${grant.serverId}`);
      if (record.health !== "healthy" && record.health !== "degraded")
        throw new Error(`Task MCP server is not verified: ${grant.serverId}`);
      const selected = servers.get(record.id) ?? { record, tools: new Set<string>() };
      const requestedTools = grant.tool ? [grant.tool] : record.toolAllowlist;
      for (const tool of requestedTools) {
        if (!record.toolAllowlist.includes("*") && !record.toolAllowlist.includes(tool))
          throw new Error(`MCP tool is not allowlisted: ${record.id}/${tool}`);
        selected.tools.add(tool);
      }
      servers.set(record.id, selected);
    }
    const integrations = this.resolveIntegrations(task);
    const config = renderMcpConfig([...servers.values()]);
    const environment: Record<string, string> = {};
    if (servers.size > 0)
      environment[engine === "kilo" ? "KILO_CONFIG_CONTENT" : "OPENCODE_CONFIG_CONTENT"] =
        JSON.stringify(config);
    if (integrations.length > 0)
      environment.WORKFORCE_PROJECT_INTEGRATIONS = JSON.stringify(
        integrations.map(({ provider, config: integrationConfig }) => ({
          provider,
          config: integrationConfig,
        })),
      );
    const secretNames = new Set<string>();
    for (const { record } of servers.values())
      for (const name of record.secretRequirements) secretNames.add(name);
    for (const integration of integrations)
      for (const name of integration.secretRequirements) secretNames.add(name);
    return { environment, secretNames: [...secretNames].sort() };
  }

  private resolveIntegrations(task: TaskRecord): ProjectIntegrationRecord[] {
    const requested = task.tools
      .filter((tool) => tool.startsWith("integration:"))
      .map((tool) => tool.slice("integration:".length));
    if (requested.length === 0) return [];
    if (!task.projectId) throw new Error("Project integrations require a project-scoped task");
    const projectId = task.projectId;
    return requested.map((provider) => {
      const integration = this.projectIntegrations.get(task.companyId, projectId, provider);
      if (integration?.status !== "active")
        throw new Error(`Task project integration is not active: ${provider}`);
      return integration;
    });
  }
}

function parseMcpGrant(value: string): { serverId: string; tool?: string } {
  const match = /^mcp:([a-z][a-z0-9_-]{1,63})(?:\/(.+))?$/.exec(value);
  if (!match?.[1]) throw new Error(`Invalid MCP task grant: ${value}`);
  return { serverId: match[1], ...(match[2] ? { tool: match[2] } : {}) };
}

function renderMcpConfig(
  servers: { record: McpServerRecord; tools: Set<string> }[],
): Record<string, unknown> {
  const mcp: Record<string, unknown> = {};
  const permission: Record<string, "allow" | "deny"> = {};
  for (const { record, tools } of servers) {
    const environment = Object.fromEntries(
      record.secretRequirements.map((name) => [name, `{env:${name}}`]),
    );
    mcp[record.id] =
      record.transport === "stdio"
        ? { type: "local", command: record.command, environment, enabled: true }
        : {
            type: "remote",
            url: record.endpoint,
            headers: environment,
            oauth: false,
            enabled: true,
          };
    permission[`${record.id}_*`] = "deny";
    for (const tool of tools) permission[`${record.id}_${normalizeTool(tool)}`] = "allow";
  }
  return { mcp, permission };
}

function normalizeTool(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}
