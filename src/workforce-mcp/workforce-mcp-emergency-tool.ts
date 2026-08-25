import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StateStore } from "../storage/state-store.js";
import { jsonResult, type CapabilityTool } from "./mcp-registration.js";
import { authorizeMcp, type WorkforceMcpPrincipal } from "./mcp-principal.js";
import { McpIdempotencyRepository } from "./mcp-idempotency-repository.js";
import type { WorkforceMcpRuntimeActions } from "./workforce-mcp-runtime-actions.js";

export function registerEmergencyTool(
  server: McpServer,
  store: StateStore,
  principal: WorkforceMcpPrincipal,
  actions?: WorkforceMcpRuntimeActions,
): CapabilityTool[] {
  if (!actions) return [];
  const idempotency = new McpIdempotencyRepository(store.database);
  const tool = server.registerTool(
    "emergency_stop",
    {
      description: "Interrupt every active attempt in the authorized company",
      inputSchema: {
        companyId: z.string().min(1).max(64),
        idempotencyKey: z.string().min(8).max(200),
        rationale: z.string().min(1).max(4_000),
      },
    },
    async (input) => {
      authorizeMcp(principal, input.companyId, "emergency:stop");
      const result = await idempotency.executeAsync({
        companyId: input.companyId,
        principalId: principal.id,
        operation: "emergency_stop",
        key: input.idempotencyKey,
        request: input,
        perform: async () => {
          await actions.emergencyStopCompany(input.companyId, principal.id);
          store.audit.append("workforce-mcp.management", principal.id, input.companyId, {
            operation: "emergency_stop",
            rationale: input.rationale,
          });
          return { stopped: true };
        },
      });
      return jsonResult(result);
    },
  );
  return [{ capability: "emergency:stop", tool }];
}
