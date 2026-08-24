export interface CriterionResult {
  criterion: string;
  passed: boolean;
  evidenceIds: string[];
}
export interface AcceptanceResult {
  accepted: boolean;
  reasons: string[];
}

export interface AcceptanceGateEvidence {
  manifestValidated: boolean;
  validatorReceipts: { validator: string; status: "passed" | "failed" | "blocked" }[];
  unresolvedCriticalFindings: string[];
  permissionDenied: boolean;
  executionExhausted: boolean;
}
