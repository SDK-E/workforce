import { bindingsFor } from "./keybindings.js";
import { createFormForSection, editFormForSection } from "./overlays/form-routing.js";

const LIFECYCLE_SECTIONS = new Set([
  "Companies",
  "Employees",
  "Organization",
  "Departments",
  "Teams",
  "Offices & rooms",
  "Projects",
  "Objectives",
  "Initiatives",
  "Goals",
  "Milestones",
  "Tasks",
  "Meetings",
  "Conversations",
  "Mail",
  "Critics & reviews",
  "MCP servers",
  "Project integrations",
  "Automations",
]);

const SELECTABLE_SECTIONS = new Set([
  ...LIFECYCLE_SECTIONS,
  "Agent Resources",
  "Approvals",
  "Models & engines",
  "Tools",
  "Environments",
  "Warnings & incidents",
]);

export function contentGuidance(section: string, sidebarVisible: boolean): string {
  const actions: string[] = [];
  if (SELECTABLE_SECTIONS.has(section))
    actions.push(`${bindingsFor("previous")}/${bindingsFor("next")} select`);
  if (createFormForSection(section)) actions.push(`${bindingsFor("create")} new`);
  if (editFormForSection(section)) actions.push(`${bindingsFor("edit")} edit/decide`);
  if (LIFECYCLE_SECTIONS.has(section))
    actions.push(`${bindingsFor("archive")}/${bindingsFor("restore")} archive/restore`);
  if (section === "Tasks") actions.push(`${bindingsFor("run")} run`);
  if (["MCP servers", "Models & engines"].includes(section))
    actions.push(`${bindingsFor("verify")} verify`);
  if (section === "Settings") actions.push(`${bindingsFor("nextTheme")} next theme`);
  actions.push(
    sidebarVisible
      ? `${bindingsFor("focusNext")} sidebar`
      : `${bindingsFor("toggleSidebar")} show sidebar`,
    `${bindingsFor("help")} all keys`,
  );
  return actions.join(" · ");
}
