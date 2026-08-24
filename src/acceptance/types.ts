export interface CriterionResult {
  criterion: string;
  passed: boolean;
  evidenceIds: string[];
}
export interface AcceptanceResult {
  accepted: boolean;
  reasons: string[];
}
