export const NAVIGATION_SECTIONS = [
  "Executive overview",
  "CEO office",
  "Companies",
  "Organization",
  "Departments",
  "Teams",
  "Offices & rooms",
  "Employees",
  "Agent Resources",
  "Projects",
  "Objectives",
  "Initiatives",
  "Goals",
  "Milestones",
  "Tasks",
  "Live work",
  "Meetings",
  "Conversations",
  "Deliverables",
  "Performance",
  "Recognition",
  "Warnings & incidents",
  "Approvals",
  "Critics & reviews",
  "Tools",
  "Environments",
  "Models & engines",
  "Docker & resources",
  "Audit",
  "Settings",
  "Advanced diagnostics",
] as const;

export function truncate(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, Math.max(1, maximumLength - 1))}…`;
}
