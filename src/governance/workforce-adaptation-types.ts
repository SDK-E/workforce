export interface ReinforcementPlan {
  id: string;
  companyId: string;
  employeeId: string;
  status: "active" | "succeeded" | "failed" | "cancelled";
  rationale: string;
  criteria: string[];
  evidenceIds: string[];
  createdBy: string;
  reviewAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArmDecision {
  id: string;
  companyId: string;
  action: string;
  subjectType: string;
  subjectId: string;
  referenceId: string;
  rationale: string;
  evidenceIds: string[];
  createdAt: string;
}
