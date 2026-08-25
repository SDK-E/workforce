import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StateStore } from "../storage/state-store.js";
import { jsonResult, type CapabilityTool } from "./mcp-registration.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { WorkforceMcpConfigurationService } from "./workforce-mcp-configuration-service.js";

const scope = {
  companyId: z.string().min(1).max(64),
  idempotencyKey: z.string().min(8).max(200),
};
const jsonObject = z.record(z.string(), z.unknown());
const strings = z.array(z.string().min(1).max(200)).max(100);

const roomMutation = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().min(1).max(200),
    kind: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal("configure"),
    roomId: z.string().min(1).max(100),
    retentionDays: z.number().int().min(1).nullable(),
    announcement: z.string().max(2_000),
    status: z.enum(["active", "archived"]),
  }),
  z.object({
    action: z.literal("add-member"),
    roomId: z.string().min(1).max(100),
    employeeId: z.string().min(1).max(100),
    role: z.enum(["member", "moderator", "owner"]),
  }),
]);

const toolRecord = z.object({
  id: z.string().min(1).max(100),
  version: z.string().min(1).max(100),
  provider: z.string().min(1).max(200),
  capabilities: strings,
  risk: z.enum(["low", "medium", "high", "critical"]),
  inputSchema: jsonObject,
  outputSchema: jsonObject,
  requiredEnvironment: z.string().min(1).max(100).nullable(),
  networkPolicy: jsonObject,
  secretRequirements: strings,
  sandboxProfiles: strings,
  permissionPolicy: jsonObject,
  auditBehavior: z.string().min(1).max(500),
});

const environmentRecord = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  sandboxImage: z.string().min(1).max(300),
  runtime: jsonObject,
  buildToolchain: strings,
  browser: jsonObject,
  networkPolicy: jsonObject,
  inputContract: jsonObject,
  secretsPolicy: jsonObject,
  resourcePolicy: jsonObject,
  outputContract: jsonObject,
  cleanupPolicy: jsonObject,
  supportedProfiles: strings,
});

const modelRecord = z.object({
  id: z.string().min(1).max(100),
  engine: z.enum(["kilo", "opencode"]),
  model: z.string().min(1).max(300),
  provider: z.string().min(1).max(200),
  capabilities: strings,
  supportedRoles: strings,
  secretRequirements: strings,
  contextLimit: z.number().int().positive().nullable(),
  freePreferred: z.boolean(),
  localModel: z.boolean(),
  priority: z.number().int().min(0).max(1_000),
});

const registryMutation = z.discriminatedUnion("registry", [
  z.object({ registry: z.literal("tool"), record: toolRecord }),
  z.object({ registry: z.literal("environment"), record: environmentRecord }),
  z.object({ registry: z.literal("model"), record: modelRecord }),
]);

export function registerConfigurationTools(
  server: McpServer,
  store: StateStore,
  principal: WorkforceMcpPrincipal,
): CapabilityTool[] {
  const service = new WorkforceMcpConfigurationService(store);
  const room = server.registerTool(
    "configure_room",
    {
      description: "Create or configure a room or membership",
      inputSchema: { ...scope, mutation: roomMutation },
    },
    ({ companyId, idempotencyKey, mutation }) =>
      jsonResult(service.configureRoom(principal, { companyId, idempotencyKey, ...mutation })),
  );
  const registry = server.registerTool(
    "configure_registry",
    {
      description: "Configure an unverified tool, environment, or model registry entry",
      inputSchema: { ...scope, mutation: registryMutation },
    },
    ({ companyId, idempotencyKey, mutation }) =>
      jsonResult(service.configureRegistry(principal, { companyId, idempotencyKey, ...mutation })),
  );
  return [
    { capability: "company:manage", tool: room },
    { capability: "company:manage", tool: registry },
  ];
}
