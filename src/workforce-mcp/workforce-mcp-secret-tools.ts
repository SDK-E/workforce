import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { EncryptedSecretStore } from "../secrets/encrypted-secret-store.js";
import type { StateStore } from "../storage/state-store.js";
import { jsonResult, type CapabilityTool } from "./mcp-registration.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { WorkforceMcpSecretService } from "./workforce-mcp-secret-service.js";

const companyId = z.string().min(1).max(64);
const name = z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/);

export function registerSecretTools(
  server: McpServer,
  store: StateStore,
  secrets: EncryptedSecretStore,
  principal: WorkforceMcpPrincipal,
): CapabilityTool[] {
  const service = new WorkforceMcpSecretService(store, secrets);
  return [
    wrap(
      "secret:read",
      server.registerTool(
        "list_secrets",
        {
          description: "List credential metadata allowed for this identity",
          inputSchema: { companyId },
        },
        (input) => jsonResult(service.list(principal, input.companyId)),
      ),
    ),
    wrap(
      "secret:read",
      server.registerTool(
        "get_secret",
        { description: "Fetch an allowed credential value", inputSchema: { companyId, name } },
        (input) => jsonResult(service.get(principal, input.companyId, input.name)),
      ),
    ),
    wrap(
      "secret:write",
      server.registerTool(
        "set_secret",
        {
          description: "Create or update an allowed credential",
          inputSchema: {
            companyId,
            name,
            value: z.string().min(1).max(65_536),
            employeeIds: z.array(z.string().min(1).max(100)).max(100).optional(),
            taskIds: z.array(z.string().min(1).max(100)).max(100).optional(),
          },
        },
        (input) => jsonResult(service.set(principal, input)),
      ),
    ),
    wrap(
      "secret:write",
      server.registerTool(
        "remove_secret",
        {
          description: "Revoke and remove an allowed credential",
          inputSchema: { companyId, name },
        },
        (input) => {
          service.remove(principal, input.companyId, input.name);
          return jsonResult({ removed: true, name: input.name });
        },
      ),
    ),
  ];
}

function wrap(
  capability: CapabilityTool["capability"],
  tool: CapabilityTool["tool"],
): CapabilityTool {
  return { capability, tool };
}
