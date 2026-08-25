export const NAVIGATION_GROUPS = [
  { label: "Overview", sections: ["Executive overview", "CEO office", "Companies"] },
  {
    label: "Organization",
    sections: [
      "Organization",
      "Departments",
      "Teams",
      "Offices & rooms",
      "Employees",
      "Agent Resources",
    ],
  },
  {
    label: "Strategy & work",
    sections: [
      "Projects",
      "Objectives",
      "Initiatives",
      "Goals",
      "Milestones",
      "Tasks",
      "Live work",
      "Deliverables",
      "Automations",
    ],
  },
  {
    label: "Business",
    sections: ["Opportunities", "Leads", "Clients", "Engagements"],
  },
  { label: "Collaboration", sections: ["Meetings", "Conversations", "Mail", "Approvals"] },
  {
    label: "Governance",
    sections: ["Performance", "Recognition", "Warnings & incidents", "Critics & reviews", "Audit"],
  },
  {
    label: "Platform",
    sections: [
      "Execution readiness",
      "Tools",
      "MCP servers",
      "Project integrations",
      "Environments",
      "Models & engines",
      "Docker & resources",
    ],
  },
  { label: "System", sections: ["Settings", "Advanced diagnostics"] },
] as const;

export const DEFAULT_SECTION = "Executive overview";
export const NAVIGATION_SECTIONS: readonly string[] = NAVIGATION_GROUPS.flatMap(
  ({ sections }) => sections,
);

export function navigationGroup(section: string) {
  return (
    NAVIGATION_GROUPS.find(({ sections }) => sections.some((item) => item === section)) ??
    NAVIGATION_GROUPS[0]
  );
}

export function moveWithinGroup(current: number, offset: number): number {
  const section = NAVIGATION_SECTIONS[current] ?? DEFAULT_SECTION;
  const group = navigationGroup(section);
  const local = group.sections.findIndex((item) => item === section);
  const next = (local + offset + group.sections.length) % group.sections.length;
  return NAVIGATION_SECTIONS.indexOf(group.sections[next] ?? group.sections[0]);
}

export function moveGroup(current: number, offset: number): number {
  const section = NAVIGATION_SECTIONS[current] ?? DEFAULT_SECTION;
  const groupIndex = NAVIGATION_GROUPS.indexOf(navigationGroup(section));
  const next = (groupIndex + offset + NAVIGATION_GROUPS.length) % NAVIGATION_GROUPS.length;
  const nextGroup = NAVIGATION_GROUPS[next] ?? NAVIGATION_GROUPS[0];
  return NAVIGATION_SECTIONS.indexOf(nextGroup.sections[0]);
}

export function truncate(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, Math.max(1, maximumLength - 1))}…`;
}
