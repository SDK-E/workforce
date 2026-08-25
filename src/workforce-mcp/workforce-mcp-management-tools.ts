import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { StateStore } from "../storage/state-store.js";
import { jsonResult, type CapabilityTool } from "./mcp-registration.js";
import type { WorkforceMcpCapability, WorkforceMcpPrincipal } from "./mcp-principal.js";
import { WorkforceMcpManagementService } from "./workforce-mcp-management-service.js";
import { JobRequirementsSchema } from "../domain.js";

const scope = {
  companyId: z.string().min(1).max(64),
  idempotencyKey: z.string().min(8).max(200),
};
const boundedList = z.array(z.string().min(1).max(2_000)).max(100);

export function registerManagementTools(
  server: McpServer,
  store: StateStore,
  principal: WorkforceMcpPrincipal,
): CapabilityTool[] {
  const service = new WorkforceMcpManagementService(store);
  return [
    wrap(
      "work:mutate",
      server.registerTool(
        "create_objective",
        {
          description: "Create a company objective with measurable success criteria",
          inputSchema: {
            ...scope,
            name: z.string().min(1).max(300),
            ownerId: z.string().min(1).max(100),
            managerId: z.string().min(1).max(100),
            successMeasures: boundedList.min(1),
            requirements: boundedList.default([]),
            constraints: boundedList.default([]),
            risks: boundedList.default([]),
            targetAt: z.iso.datetime().optional(),
          },
        },
        (input) => jsonResult(service.createObjective(principal, input)),
      ),
    ),
    wrap(
      "work:mutate",
      server.registerTool(
        "create_task",
        {
          description: "Create governed company work with explicit acceptance criteria",
          inputSchema: {
            ...scope,
            id: z.string().min(1).max(100).optional(),
            projectId: z.string().min(1).max(100).nullable().optional(),
            parentTaskId: z.string().min(1).max(100).nullable().optional(),
            objective: z.string().min(1).max(10_000),
            nonGoals: boundedList.default([]),
            acceptanceCriteria: boundedList.min(1),
            risk: z.enum(["low", "medium", "high", "critical"]),
            dataSensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
            capabilities: z.array(z.string().min(1).max(100)).max(100).default([]),
            tools: z.array(z.string().min(1).max(100)).max(100).default([]),
            networkPolicy: z.record(z.string(), z.unknown()).default({ mode: "inference-only" }),
            resourcePolicy: z.record(z.string(), z.unknown()).default({
              cpu: 1,
              memoryMb: 768,
              pids: 128,
              timeoutSeconds: 1_800,
            }),
            managerId: z.string().min(1).max(100),
            assigneeId: z.string().min(1).max(100).nullable().optional(),
            reviewerId: z.string().min(1).max(100).nullable().optional(),
            priority: z.number().int().min(0).max(100).default(50),
            dueAt: z.iso.datetime().nullable().optional(),
          },
        },
        (input) => jsonResult(service.createTask(principal, input)),
      ),
    ),
    wrap(
      "workforce:manage",
      server.registerTool(
        "assign_task",
        {
          description: "Assign a task to an active company employee",
          inputSchema: {
            ...scope,
            taskId: z.string().min(1).max(100),
            employeeId: z.string().min(1).max(100),
          },
        },
        (input) => jsonResult(service.assignTask(principal, input)),
      ),
    ),
    wrap(
      "work:mutate",
      server.registerTool(
        "decide_approval",
        {
          description: "Approve or reject a pending company decision",
          inputSchema: {
            ...scope,
            approvalId: z.string().min(1).max(100),
            event: z.enum(["APPROVE", "REJECT"]),
            rationale: z.string().min(1).max(4_000),
          },
        },
        (input) => jsonResult(service.decideApproval(principal, input)),
      ),
    ),
    wrap(
      "workforce:manage",
      server.registerTool(
        "propose_hire",
        {
          description: "Analyze a capability gap and propose a probationary dynamic employee",
          inputSchema: { ...scope, job: JobRequirementsSchema },
        },
        (input) => jsonResult(service.proposeHire(principal, input)),
      ),
    ),
    wrap(
      "workforce:manage",
      server.registerTool(
        "transition_employment",
        {
          description: "Reinforce, suspend, reassign, terminate, or reinstate an employee",
          inputSchema: {
            ...scope,
            employeeId: z.string().min(1).max(100),
            event: z.enum([
              "PROMOTE",
              "COACH",
              "RESTRICT",
              "SUSPEND",
              "REASSIGN",
              "ACTIVATE",
              "TERMINATE",
              "REINSTATE",
              "ARCHIVE",
            ]),
            rationale: z.string().min(1).max(4_000),
            managerId: z.string().min(1).max(100).optional(),
            department: z.string().min(1).max(200).optional(),
          },
        },
        (input) => jsonResult(service.transitionEmployment(principal, input)),
      ),
    ),
  ];
}

function wrap(capability: WorkforceMcpCapability, tool: CapabilityTool["tool"]): CapabilityTool {
  return { capability, tool };
}
