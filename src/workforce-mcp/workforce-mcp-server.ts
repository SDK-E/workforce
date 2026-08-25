import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EncryptedSecretStore } from "../secrets/encrypted-secret-store.js";
import type { StateStore } from "../storage/state-store.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { registerParticipationTools } from "./workforce-mcp-participation-tools.js";
import { registerQueryResources, registerQueryTools } from "./workforce-mcp-query-tools.js";
import { registerSecretTools } from "./workforce-mcp-secret-tools.js";

export function createWorkforceMcpServer(
  store: StateStore,
  principal: WorkforceMcpPrincipal,
  secrets?: EncryptedSecretStore,
) {
  const server = new McpServer({ name: "workforce-mcp", version: "0.1.0" });
  const registered = [
    ...registerQueryTools(server, store, principal),
    ...registerParticipationTools(server, store, principal),
    ...(secrets ? registerSecretTools(server, store, secrets, principal) : []),
  ];
  for (const { capability, tool } of registered)
    if (!principal.capabilities.includes(capability)) tool.disable();
  registerQueryResources(server, store, principal);
  return server;
}
