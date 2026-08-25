export type AutomationStatus = "proposed" | "approved" | "rejected" | "disabled" | "archived";

export interface AutomationRecord {
  id: string;
  companyId: string;
  requestedBy: string;
  title: string;
  trigger: Record<string, unknown>;
  action: Record<string, unknown>;
  rationale: string;
  estimatedRunsSaved: number;
  status: AutomationStatus;
  decidedBy: string | null;
  decisionReason: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRunRecord {
  id: string;
  automationId: string;
  companyId: string;
  scheduledFor: string;
  status: "running" | "succeeded" | "failed" | "skipped";
  taskId: string | null;
  attemptId: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ProposeAutomationInput {
  companyId: string;
  requestedBy: string;
  title: string;
  trigger: Record<string, unknown>;
  action: Record<string, unknown>;
  rationale: string;
  estimatedRunsSaved: number;
}
