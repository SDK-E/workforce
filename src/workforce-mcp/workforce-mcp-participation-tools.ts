import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StateStore } from "../storage/state-store.js";
import { jsonResult, type CapabilityTool } from "./mcp-registration.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { WorkforceMcpParticipationService } from "./workforce-mcp-participation-service.js";

const companyInput = { companyId: z.string().min(1).max(64) };

export function registerParticipationTools(
  server: McpServer,
  store: StateStore,
  principal: WorkforceMcpPrincipal,
): CapabilityTool[] {
  const service = new WorkforceMcpParticipationService(store);
  return [
    wrap(
      "message:read",
      server.registerTool(
        "list_rooms",
        { description: "List rooms joined by this agent", inputSchema: companyInput },
        ({ companyId }) => jsonResult(service.listRooms(principal, companyId)),
      ),
    ),
    wrap(
      "message:write",
      server.registerTool(
        "send_message",
        {
          description: "Send a message to an authorized room",
          inputSchema: {
            ...companyInput,
            roomId: z.string().min(1).max(100),
            body: z.string().min(1).max(20_000),
            threadId: z.string().min(1).max(100).optional(),
          },
        },
        (input) => jsonResult(service.sendMessage(principal, input)),
      ),
    ),
    wrap(
      "mail:read",
      server.registerTool(
        "list_mail",
        { description: "Read the authenticated agent inbox", inputSchema: companyInput },
        ({ companyId }) => jsonResult(service.inbox(principal, companyId)),
      ),
    ),
    wrap(
      "mail:write",
      server.registerTool(
        "send_mail",
        {
          description: "Send internal mail as the authenticated agent",
          inputSchema: {
            ...companyInput,
            recipientId: z.string().min(1).max(100),
            subject: z.string().min(1).max(300),
            body: z.string().min(1).max(20_000),
          },
        },
        (input) => jsonResult(service.sendMail(principal, input)),
      ),
    ),
    wrap(
      "meeting:read",
      server.registerTool(
        "list_meetings",
        { description: "List meetings visible to the agent", inputSchema: companyInput },
        ({ companyId }) => jsonResult(service.listMeetings(principal, companyId)),
      ),
    ),
    wrap(
      "meeting:write",
      server.registerTool(
        "contribute_meeting",
        {
          description: "Add a durable meeting contribution",
          inputSchema: {
            ...companyInput,
            meetingId: z.string().min(1).max(100),
            body: z.string().min(1).max(4_000),
          },
        },
        (input) => jsonResult(service.contributeMeeting(principal, input)),
      ),
    ),
    wrap(
      "checkpoint:write",
      server.registerTool(
        "update_task_checkpoint",
        {
          description: "Record progress for the agent's assigned task",
          inputSchema: {
            ...companyInput,
            taskId: z.string().min(1).max(100),
            summary: z.string().min(1).max(4_000),
            progressPercent: z.number().int().min(0).max(100),
            blockers: z.array(z.string().min(1).max(1_000)).max(20),
          },
        },
        (input) => jsonResult(service.checkpoint(principal, input)),
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
