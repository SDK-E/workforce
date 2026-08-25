import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StateStore } from "../storage/state-store.js";
import { jsonResult, registerJsonResource, type CapabilityTool } from "./mcp-registration.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { WorkforceMcpQueryService } from "./workforce-mcp-query-service.js";

const companyInput = { companyId: z.string().min(1).max(64) };

export function registerQueryTools(
  server: McpServer,
  store: StateStore,
  principal: WorkforceMcpPrincipal,
): CapabilityTool[] {
  const queries = new WorkforceMcpQueryService(store);
  const taskInput = { ...companyInput, taskId: z.string().min(1).max(100) };
  return [
    wrap(
      "company:read",
      server.registerTool(
        "company_overview",
        { description: "Read an authorized company overview", inputSchema: companyInput },
        ({ companyId }) => jsonResult(queries.companyOverview(principal, companyId)),
      ),
    ),
    wrap(
      "task:read",
      server.registerTool(
        "list_tasks",
        { description: "List visible company tasks", inputSchema: companyInput },
        ({ companyId }) => jsonResult(queries.listTasks(principal, companyId)),
      ),
    ),
    wrap(
      "task:read",
      server.registerTool(
        "get_task",
        { description: "Read one visible task", inputSchema: taskInput },
        ({ companyId, taskId }) => jsonResult(queries.getTask(principal, companyId, taskId)),
      ),
    ),
    wrap(
      "message:read",
      server.registerTool(
        "list_messages",
        {
          description: "List bounded messages from an authorized room",
          inputSchema: { ...companyInput, roomId: z.string().min(1).max(100) },
        },
        ({ companyId, roomId }) => jsonResult(queries.listMessages(principal, companyId, roomId)),
      ),
    ),
    wrap(
      "attempt:read",
      server.registerTool(
        "get_attempt",
        {
          description: "Read a visible attempt without command or environment",
          inputSchema: { ...companyInput, attemptId: z.string().min(1).max(100) },
        },
        ({ companyId, attemptId }) =>
          jsonResult(queries.getAttempt(principal, companyId, attemptId)),
      ),
    ),
    wrap(
      "deliverable:read",
      server.registerTool(
        "list_deliverables",
        {
          description: "List visible artifact metadata without host paths",
          inputSchema: companyInput,
        },
        ({ companyId }) => jsonResult(queries.listDeliverables(principal, companyId)),
      ),
    ),
    wrap(
      "decision:read",
      server.registerTool(
        "list_pending_decisions",
        { description: "List pending authorized decisions", inputSchema: companyInput },
        ({ companyId }) => jsonResult(queries.listPendingDecisions(principal, companyId)),
      ),
    ),
  ];
}

export function registerQueryResources(
  server: McpServer,
  store: StateStore,
  principal: WorkforceMcpPrincipal,
): void {
  if (!principal.capabilities.includes("company:read")) return;
  const queries = new WorkforceMcpQueryService(store);
  for (const companyId of principal.companyIds) {
    const root = `workforce://companies/${companyId}`;
    registerJsonResource(server, `${companyId}-overview`, `${root}/overview`, () =>
      queries.companyOverview(principal, companyId),
    );
    registerJsonResource(server, `${companyId}-organization`, `${root}/organization`, () =>
      queries.organization(principal, companyId),
    );
    registerJsonResource(server, `${companyId}-strategy`, `${root}/strategy`, () =>
      queries.strategy(principal, companyId),
    );
  }
}

function wrap(
  capability: CapabilityTool["capability"],
  tool: CapabilityTool["tool"],
): CapabilityTool {
  return { capability, tool };
}
