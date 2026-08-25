import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StateStore } from "../storage/state-store.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { WorkforceMcpQueryService } from "./workforce-mcp-query-service.js";

export function createWorkforceMcpServer(store: StateStore, principal: WorkforceMcpPrincipal) {
  const server = new McpServer({ name: "workforce-mcp", version: "0.1.0" });
  const queries = new WorkforceMcpQueryService(store);
  const companyInput = { companyId: z.string().min(1).max(64) };

  server.registerTool(
    "company_overview",
    { description: "Read an authorized Workforce company overview", inputSchema: companyInput },
    ({ companyId }) => jsonResult(queries.companyOverview(principal, companyId)),
  );
  server.registerTool(
    "list_tasks",
    { description: "List tasks in an authorized Workforce company", inputSchema: companyInput },
    ({ companyId }) => jsonResult(queries.listTasks(principal, companyId)),
  );
  return server;
}

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}
