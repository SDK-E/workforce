import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EncryptedSecretStore } from "../secrets/encrypted-secret-store.js";
import type { StateStore } from "../storage/state-store.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { registerParticipationTools } from "./workforce-mcp-participation-tools.js";
import { registerQueryResources, registerQueryTools } from "./workforce-mcp-query-tools.js";
import { registerSecretTools } from "./workforce-mcp-secret-tools.js";
import { registerWorkTools } from "./workforce-mcp-work-tools.js";
import { registerManagementTools } from "./workforce-mcp-management-tools.js";
import { registerConfigurationTools } from "./workforce-mcp-configuration-tools.js";
import { registerEmergencyTool } from "./workforce-mcp-emergency-tool.js";
import type { WorkforceMcpRuntimeActions } from "./workforce-mcp-runtime-actions.js";
import { registerBusinessTools } from "./workforce-mcp-business-tools.js";

export function createWorkforceMcpServer(
  store: StateStore,
  principal: WorkforceMcpPrincipal,
  secrets?: EncryptedSecretStore,
  actions?: WorkforceMcpRuntimeActions,
) {
  const server = new McpServer({ name: "workforce-mcp", version: "0.1.0" });
  const registered = [
    ...registerQueryTools(server, store, principal),
    ...registerParticipationTools(server, store, principal),
    ...registerWorkTools(server, store, principal),
    ...registerManagementTools(server, store, principal),
    ...registerBusinessTools(server, store, principal),
    ...registerConfigurationTools(server, store, principal),
    ...registerEmergencyTool(server, store, principal, actions),
    ...(secrets ? registerSecretTools(server, store, secrets, principal) : []),
  ];
  for (const { capability, tool } of registered)
    if (!principal.capabilities.includes(capability)) tool.disable();
  registerQueryResources(server, store, principal);
  return server;
}
