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
  createdAt: string;
  updatedAt: string;
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
