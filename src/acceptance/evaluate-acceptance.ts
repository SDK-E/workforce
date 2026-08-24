import type { AcceptanceResult, CriterionResult } from "./types.js";

export function evaluateAcceptance(
  processExitCode: number | null,
  requiredOutputs: string[],
  observedOutputs: Set<string>,
  criteria: CriterionResult[],
  independentReviewRequired = false,
  independentReviewApproved = false,
): AcceptanceResult {
  const reasons: string[] = [];
  if (processExitCode !== 0) {
    reasons.push(`Process exit was ${processExitCode === null ? "unavailable" : processExitCode}`);
  }
  for (const output of requiredOutputs) {
    if (!observedOutputs.has(output)) reasons.push(`Missing required output: ${output}`);
  }
  for (const criterion of criteria) {
    if (!criterion.passed || criterion.evidenceIds.length === 0) {
      reasons.push(`Criterion not evidenced: ${criterion.criterion}`);
    }
  }
  if (independentReviewRequired && !independentReviewApproved) {
    reasons.push("Independent review is required");
  }
  return { accepted: reasons.length === 0, reasons };
}
