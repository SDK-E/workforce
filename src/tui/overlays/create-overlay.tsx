import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { OrganizationUnitKind } from "../../organizations/organization-types.js";
import type { StrategyItemKind } from "../../strategy/strategy-types.js";
import { CompanyForm } from "./company-form.js";
import { OrganizationForm } from "./organization-form.js";
import { StrategyForm } from "./strategy-form.js";
import { TaskForm } from "./task-form.js";
import { AgentProfileForm } from "./agent-profile-form.js";

export type CreateFormKind = "company" | "organization" | "strategy" | "task" | "agent-profile";

export function CreateOverlay(props: {
  kind: CreateFormKind;
  section: string;
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  onCompanyChange: (company: CompanyRecord) => void;
  onClose: () => void;
  onStatus: (message: string) => void;
}) {
  function finish(action: () => void, success: string): void {
    try {
      action();
      props.onStatus(success);
      props.onClose();
    } catch (error) {
      props.onStatus(error instanceof Error ? error.message : "Mutation failed");
    }
  }
  if (props.kind === "company")
    return (
      <CompanyForm
        company={props.company}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          finish(() => {
            props.onCompanyChange(props.store.updateCompany(input));
          }, "Company configuration saved and audited");
        }}
      />
    );
  if (props.kind === "organization")
    return (
      <OrganizationForm
        companyId={props.company.id}
        kind={organizationKind(props.section)}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          finish(() => {
            props.store.createOrganizationUnit(input);
          }, `${input.kind} created and audited`);
        }}
      />
    );
  if (props.kind === "strategy")
    return (
      <StrategyForm
        companyId={props.company.id}
        kind={strategyKind(props.section)}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          finish(() => {
            props.store.createStrategyItem(input);
          }, `${input.kind} created and audited`);
        }}
      />
    );
  if (props.kind === "agent-profile")
    return (
      <AgentProfileForm
        companyId={props.company.id}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          finish(() => {
            props.store.agentProfiles.update(input);
          }, `Instruction revision activated for ${input.employeeId}`);
        }}
      />
    );
  return (
    <TaskForm
      companyId={props.company.id}
      terminalWidth={props.terminalWidth}
      onCancel={props.onClose}
      onSubmit={(input) => {
        finish(() => {
          props.store.createTask(input);
        }, "Task created and audited");
      }}
    />
  );
}

export function createFormForSection(section: string): CreateFormKind | null {
  if (section === "Companies") return "company";
  if (["Organization", "Departments", "Teams", "Offices & rooms"].includes(section))
    return "organization";
  if (["Projects", "Objectives", "Initiatives", "Goals", "Milestones"].includes(section))
    return "strategy";
  if (section === "Employees") return "agent-profile";
  return section === "Tasks" ? "task" : null;
}

function organizationKind(section: string): OrganizationUnitKind {
  if (section === "Teams") return "team";
  if (section === "Offices & rooms") return "office";
  return "department";
}

function strategyKind(section: string): StrategyItemKind {
  const kinds: Record<string, StrategyItemKind> = {
    Projects: "project",
    Objectives: "objective",
    Initiatives: "initiative",
    Goals: "goal",
    Milestones: "milestone",
  };
  return kinds[section] ?? "project";
}
