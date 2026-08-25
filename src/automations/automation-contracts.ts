import { z } from "zod";

export const AutomationTriggerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("interval"), everySeconds: z.number().int().min(10) }),
  z.object({
    kind: z.literal("cron"),
    expression: z.string().min(1).max(200),
    timezone: z.string().min(1).max(100).default("UTC"),
  }),
]);

export const AutomationActionSchema = z.object({
  kind: z.literal("task"),
  objective: z.string().min(1).max(10_000),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
  assigneeId: z.string().min(1).max(100).default("ceo"),
  managerId: z.string().min(1).max(100).default("ceo"),
  reviewerId: z.string().min(1).max(100).nullable().default("arm"),
  risk: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dataSensitivity: z.enum(["public", "internal", "confidential", "restricted"]).default("internal"),
  capabilities: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  projectId: z.string().nullable().default(null),
});

export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>;
