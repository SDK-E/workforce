import type { Employee, JobRequirements } from "../domain.js";

export interface GapAnalysis {
  kind: "capability" | "capacity" | "temporary";
  missing: string[];
  alternatives: string[];
  recommendation: "assign" | "reassign" | "coach" | "temporary-session" | "hire";
  employeeId: string | null;
}

export function analyzeWorkforceGap(job: JobRequirements, employees: Employee[]): GapAnalysis {
  const required = new Set([
    ...job.capabilities.languages.map((item) => `language:${item.toLowerCase()}`),
    ...job.capabilities.buildTools.map((item) => `tool:${item.toLowerCase()}`),
    ...(job.capabilities.browser ? ["browser-automation"] : []),
    ...(job.capabilities.publicInternet ? ["evidence-research"] : []),
    ...(job.capabilities.sourceControl ? ["source-control"] : []),
  ]);
  const eligible = employees.filter(({ status }) => ["active", "probation"].includes(status));
  const scored = eligible
    .map((employee) => ({
      employee,
      matched: [...required].filter((skill) => employee.capabilityTags.includes(skill)),
    }))
    .sort((left, right) => right.matched.length - left.matched.length);
  const best = scored[0];
  const missing = [...required].filter((skill) => !best?.matched.includes(skill));
  if (best && missing.length === 0)
    return {
      kind: "capacity",
      missing: [],
      alternatives: ["assign existing employee"],
      recommendation: "assign",
      employeeId: best.employee.id,
    };
  if (best && missing.length <= 2)
    return {
      kind: "capability",
      missing,
      alternatives: ["coach existing employee", "split task"],
      recommendation: "coach",
      employeeId: best.employee.id,
    };
  if (job.resources.timeoutSeconds <= 900)
    return {
      kind: "temporary",
      missing,
      alternatives: ["temporary isolated session", "defer"],
      recommendation: "temporary-session",
      employeeId: null,
    };
  return {
    kind: "capability",
    missing,
    alternatives: ["reassign capacity", "decompose task", "temporary session"],
    recommendation: "hire",
    employeeId: null,
  };
}
