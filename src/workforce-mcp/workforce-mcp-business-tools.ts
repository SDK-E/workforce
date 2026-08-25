import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StateStore } from "../storage/state-store.js";
import { jsonResult, type CapabilityTool } from "./mcp-registration.js";
import type { WorkforceMcpCapability, WorkforceMcpPrincipal } from "./mcp-principal.js";
import { WorkforceMcpBusinessService } from "./workforce-mcp-business-service.js";

const companyId = z.string().min(1).max(64);
const id = z.string().min(1).max(100);
const idempotencyKey = z.string().min(8).max(200);
const nullableId = id.nullable();
const nullableText = z.string().max(2_000).nullable();
const score = z.number().int().min(0).max(100);
const boundedList = z.array(z.string().min(1).max(2_000)).max(100);
const listSchema = {
  companyId,
  query: z.string().max(500).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
};
const opportunitySchema = {
  companyId,
  idempotencyKey,
  id: id.optional(),
  name: z.string().min(1).max(300),
  source: z.string().min(1).max(500),
  problem: z.string().min(1).max(5_000),
  hypothesis: z.string().min(1).max(5_000),
  score,
  stage: z.enum(["discovered", "researching", "validated", "rejected", "converted", "archived"]),
  ownerId: nullableId,
  evidenceIds: boundedList,
};
const leadSchema = {
  companyId,
  idempotencyKey,
  id: id.optional(),
  opportunityId: nullableId,
  name: z.string().min(1).max(300),
  organization: z.string().min(1).max(300),
  email: nullableText,
  website: nullableText,
  source: z.string().min(1).max(500),
  qualificationScore: score,
  status: z.enum(["new", "qualified", "contacted", "nurturing", "won", "lost", "archived"]),
  ownerId: nullableId,
  notes: z.string().max(10_000),
};
const clientSchema = {
  companyId,
  idempotencyKey,
  id: id.optional(),
  leadId: nullableId,
  name: z.string().min(1).max(300),
  primaryContact: z.string().min(1).max(300),
  email: nullableText,
  status: z.enum(["prospect", "active", "paused", "former", "archived"]),
  ownerId: nullableId,
  notes: z.string().max(10_000),
};
const engagementSchema = {
  companyId,
  idempotencyKey,
  id: id.optional(),
  clientId: id,
  projectId: nullableId,
  name: z.string().min(1).max(300),
  status: z.enum(["proposed", "active", "paused", "completed", "cancelled", "archived"]),
  scope: z.string().min(1).max(10_000),
  successCriteria: boundedList.min(1),
  ownerId: nullableId,
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
};
const archiveSchema = {
  companyId,
  idempotencyKey,
  recordType: z.enum(["opportunity", "lead", "client", "engagement"]),
  id,
  archived: z.boolean(),
};

export function registerBusinessTools(
  server: McpServer,
  store: StateStore,
  principal: WorkforceMcpPrincipal,
): CapabilityTool[] {
  const service = new WorkforceMcpBusinessService(store);
  return [
    wrap(
      "business:read",
      server.registerTool(
        "list_business_pipeline",
        {
          description: "Search the authorized opportunity, lead, client, and engagement pipeline",
          inputSchema: listSchema,
        },
        (input) => jsonResult(service.list(principal, input)),
      ),
    ),
    wrap(
      "business:mutate",
      server.registerTool(
        "save_opportunity",
        {
          description: "Create or update an evidence-backed company opportunity",
          inputSchema: opportunitySchema,
        },
        (input) => jsonResult(service.saveOpportunity(principal, input)),
      ),
    ),
    wrap(
      "business:mutate",
      server.registerTool(
        "save_lead",
        {
          description: "Create or update a qualified company lead",
          inputSchema: leadSchema,
        },
        (input) => jsonResult(service.saveLead(principal, input)),
      ),
    ),
    wrap(
      "business:mutate",
      server.registerTool(
        "save_client",
        {
          description: "Create or update a company client relationship",
          inputSchema: clientSchema,
        },
        (input) => jsonResult(service.saveClient(principal, input)),
      ),
    ),
    wrap(
      "business:mutate",
      server.registerTool(
        "save_engagement",
        {
          description: "Create or update measurable client delivery engagement",
          inputSchema: engagementSchema,
        },
        (input) => jsonResult(service.saveEngagement(principal, input)),
      ),
    ),
    wrap(
      "business:mutate",
      server.registerTool(
        "set_business_record_archived",
        {
          description: "Archive or restore a retained company business record",
          inputSchema: archiveSchema,
        },
        (input) => jsonResult(service.setArchived(principal, input)),
      ),
    ),
  ];
}

function wrap(capability: WorkforceMcpCapability, tool: CapabilityTool["tool"]): CapabilityTool {
  return { capability, tool };
}
