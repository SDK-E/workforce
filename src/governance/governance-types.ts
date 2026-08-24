import type { AgentBlueprint } from "../agent-designer.js";

export interface GapFinding {
  id: string;
  companyId: string;
  jobId: string;
  kind: "capability" | "capacity" | "temporary";
  missing: string[];
  alternatives: string[];
  recommendation: string;
  createdBy: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface HiringProposal {
  id: string;
  companyId: string;
  jobId: string;
  employeeId: string;
  blueprint: AgentBlueprint;
  probationCriteria: string[];
  status: "proposed" | "approved" | "rejected" | "withdrawn";
  proposedBy: string;
  decidedBy: string | null;
  rationale: string;
  createdAt: string;
  decidedAt: string | null;
}
