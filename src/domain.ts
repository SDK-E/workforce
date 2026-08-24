import { z } from "zod";

const EngineSchema = z.enum(["kilo", "opencode"]);

export const JobRequirementsSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{2,63}$/),
  title: z.string().min(1).max(200),
  objective: z.string().min(1).max(20_000),
  risk: z.enum(["low", "medium", "high", "critical"]),
  dataSensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
  capabilities: z.object({
    filesystemWrite: z.boolean(),
    shell: z.boolean(),
    sourceControl: z.boolean(),
    browser: z.boolean(),
    publicInternet: z.boolean(),
    packageInstall: z.boolean(),
    buildTools: z.array(z.string()).max(30),
    languages: z.array(z.string()).max(20),
  }),
  inputs: z
    .array(
      z.object({
        name: z.string(),
        source: z.string(),
        access: z.enum(["read-only", "copy"]),
      }),
    )
    .max(50),
  outputs: z
    .array(
      z.object({
        path: z.string().regex(/^[A-Za-z0-9._/-]+$/),
        required: z.boolean(),
        validator: z.string().optional(),
      }),
    )
    .min(1),
  network: z.object({
    mode: z.enum(["inference-only", "search-only", "allowlisted", "audited-internet"]).optional(),
    allowedHosts: z.array(z.string()).max(100),
    reason: z.string().max(2_000),
    approvedBy: z.string().min(1).max(200).optional(),
  }),
  resources: z.object({
    cpu: z.number().positive().max(8),
    memoryMb: z.number().int().min(256).max(16_384),
    pids: z.number().int().min(32).max(1_024),
    timeoutSeconds: z.number().int().min(30).max(14_400),
  }),
  enginePreference: z.array(EngineSchema).min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
});
export type JobRequirements = z.infer<typeof JobRequirementsSchema>;

export const SandboxSpecSchema = z.object({
  jobId: z.string(),
  profile: z.enum(["document", "research", "engineering", "browser", "restricted-review"]),
  image: z.string(),
  engine: EngineSchema,
  networkMode: z.enum(["inference-only", "search-only", "allowlisted", "audited-internet"]),
  allowedHosts: z.array(z.string()),
  readOnlyRoot: z.literal(true),
  nonRoot: z.literal(true),
  capDropAll: z.literal(true),
  noNewPrivileges: z.literal(true),
  workspace: z.object({ type: z.literal("volume"), name: z.string() }),
  inputs: z.array(
    z.object({ source: z.string(), containerPath: z.string(), readOnly: z.boolean() }),
  ),
  tmpfs: z.array(z.string()),
  cpu: z.number(),
  memoryMb: z.number(),
  pids: z.number(),
  timeoutSeconds: z.number(),
  tools: z.array(z.string()),
  decisions: z.array(z.string()),
  rejectedCapabilities: z.array(z.string()),
});
export type SandboxSpec = z.infer<typeof SandboxSpecSchema>;

type EmploymentStatus =
  | "candidate"
  | "proposed"
  | "probation"
  | "active"
  | "coaching"
  | "restricted"
  | "suspended"
  | "reassigned"
  | "terminated"
  | "archived";
export interface Employee {
  id: string;
  name: string;
  title: string;
  role?: string;
  department: string;
  team?: string | null;
  manager: string | null;
  status: EmploymentStatus;
  responsibilities: string[];
  capabilityTags: string[];
  hiredAt: string;
}

export interface WorkforceEvent {
  id: string;
  at: string;
  type: string;
  actor: string;
  organizationId: string;
  data: Record<string, unknown>;
}
