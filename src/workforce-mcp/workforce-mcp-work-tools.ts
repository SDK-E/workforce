import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StateStore } from "../storage/state-store.js";
import { AutomationTriggerSchema } from "../automations/automation-contracts.js";
import { jsonResult, type CapabilityTool } from "./mcp-registration.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { WorkforceMcpWorkService } from "./workforce-mcp-work-service.js";

const scope = {
  companyId: z.string().min(1).max(64),
  taskId: z.string().min(1).max(100),
  idempotencyKey: z.string().min(8).max(200),
};
const evidenceIds = z.array(z.string().min(1).max(100)).max(100);

export function registerWorkTools(
  server: McpServer,
  store: StateStore,
  principal: WorkforceMcpPrincipal,
): CapabilityTool[] {
  const service = new WorkforceMcpWorkService(store);
  return [
    tool(
      server.registerTool(
        "submit_claim",
        {
          description: "Submit an evidence-backed claim to the company claim ledger",
          inputSchema: {
            ...scope,
            subjectId: z.string().min(1).max(200),
            predicate: z.string().min(1).max(200),
            value: z.unknown(),
            evidenceIds: evidenceIds.min(1),
            confidence: z.number().min(0).max(1),
          },
        },
        (input) => jsonResult(service.submitClaim(principal, input)),
      ),
    ),
    tool(
      server.registerTool(
        "attach_artifact_reference",
        {
          description: "Attach a validated artifact from this attempt to its task",
          inputSchema: {
            ...scope,
            artifactId: z.string().min(1).max(100),
            note: z.string().max(2_000),
          },
        },
        (input) => jsonResult(service.attachArtifact(principal, input)),
      ),
    ),
    tool(
      server.registerTool(
        "request_approval",
        {
          description: "Request a durable governance decision for the current task",
          inputSchema: { ...scope, rationale: z.string().min(1).max(4_000) },
        },
        (input) => jsonResult(service.requestApproval(principal, input)),
      ),
    ),
    tool(
      server.registerTool(
        "request_automation",
        {
          description: "Propose replacing repetitive agent work with a reviewed automation",
          inputSchema: {
            ...scope,
            title: z.string().min(1).max(200),
            trigger: AutomationTriggerSchema,
            objective: z.string().min(1).max(10_000),
            acceptanceCriteria: z.array(z.string().min(1).max(2_000)).min(1).max(50),
            rationale: z.string().min(1).max(2_000),
            estimatedRunsSaved: z.number().int().min(1).max(1_000_000),
          },
        },
        (input) => jsonResult(service.requestAutomation(principal, input)),
      ),
    ),
    tool(
      server.registerTool(
        "request_help",
        {
          description: "Request help or hand off the current task with durable context",
          inputSchema: {
            ...scope,
            kind: z.enum(["help-request", "handoff"]),
            toEmployeeId: z.string().min(1).max(100).optional(),
            summary: z.string().min(1).max(4_000),
            context: z.record(z.string(), z.unknown()),
            evidenceIds,
          },
        },
        (input) => jsonResult(service.requestHelp(principal, input)),
      ),
    ),
  ];
}

function tool(value: CapabilityTool["tool"]): CapabilityTool {
  return { capability: "participation:write", tool: value };
}
