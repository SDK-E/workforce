import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { OrganizationUnitKind } from "../../organizations/organization-types.js";
import type { StrategyItemKind } from "../../strategy/strategy-types.js";
import { CompanyForm } from "./company-form.js";
import { OrganizationForm } from "./organization-form.js";
import { StrategyForm } from "./strategy-form.js";
import { TaskForm } from "./task-form.js";
import { AgentProfileForm } from "./agent-profile-form.js";
import { CompanyCreateForm } from "./company-create-form.js";
import { MessageForm } from "./message-form.js";
import { MeetingForm } from "./meeting-form.js";
import { ApprovalDecisionForm } from "./approval-decision-form.js";
import { McpServerForm } from "./mcp-server-form.js";
import { ProjectIntegrationForm } from "./project-integration-form.js";
import { MailForm } from "./mail-form.js";
import { AutomationForm } from "./automation-form.js";

export type CreateFormKind =
  | "company-create"
  | "company-edit"
  | "organization"
  | "strategy"
  | "task"
  | "agent-profile"
  | "message"
  | "meeting"
  | "approval-decision"
  | "mcp-server"
  | "project-integration"
  | "mail"
  | "automation";

interface CreateOverlayProps {
  kind: CreateFormKind;
  section: string;
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  onCompanyChange: (company: CompanyRecord) => void;
  onClose: () => void;
  onStatus: (message: string) => void;
}

export function CreateOverlay(props: CreateOverlayProps) {
  function finish(action: () => void, success: string): void {
    try {
      action();
      props.onStatus(success);
      props.onClose();
    } catch (error) {
      props.onStatus(error instanceof Error ? error.message : "Mutation failed");
    }
  }
  if (props.kind === "company-create" || props.kind === "company-edit")
    return <CompanyMutationOverlay {...props} finish={finish} />;
  if (["mcp-server", "project-integration", "mail", "automation"].includes(props.kind))
    return <CapabilityMutationOverlay {...props} finish={finish} />;
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
  if (props.kind === "message")
    return (
      <MessageForm
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          finish(() => {
            props.store.addMessage(
              props.company.id,
              input.roomId,
              input.authorId,
              input.body,
              input.threadId,
            );
          }, "Message persisted and audited");
        }}
      />
    );
  if (props.kind === "meeting")
    return (
      <MeetingForm
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          finish(() => {
            props.store.meetings.create({ companyId: props.company.id, ...input });
          }, "Meeting scheduled and audited");
        }}
      />
    );
  if (props.kind === "approval-decision")
    return (
      <ApprovalDecisionForm
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          finish(() => {
            props.store.approvalsRepository.decide(
              props.company.id,
              input.approvalId,
              input.event,
              "human",
              input.rationale,
            );
          }, "Approval decision persisted and audited");
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

type MutationOverlayProps = CreateOverlayProps & {
  finish: (action: () => void, success: string) => void;
};

function CapabilityMutationOverlay(props: MutationOverlayProps) {
  if (props.kind === "mcp-server")
    return (
      <McpServerForm
        companyId={props.company.id}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          props.finish(() => {
            props.store.mcpServers.save(input, "human");
          }, "MCP server registered and awaiting verification");
        }}
      />
    );
  if (props.kind === "project-integration")
    return (
      <ProjectIntegrationForm
        companyId={props.company.id}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          props.finish(() => {
            props.store.projectIntegrations.save(input, "human");
          }, "Project integration configured and audited");
        }}
      />
    );
  if (props.kind === "mail")
    return (
      <MailForm
        companyId={props.company.id}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          props.finish(() => {
            props.store.mail.send(input);
          }, "Mail sent and audited");
        }}
      />
    );
  return (
    <AutomationForm
      companyId={props.company.id}
      terminalWidth={props.terminalWidth}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(() => {
          props.store.automations.propose(input);
        }, "Automation proposed for governed approval");
      }}
    />
  );
}

function CompanyMutationOverlay(
  props: CreateOverlayProps & { finish: (action: () => void, success: string) => void },
) {
  if (props.kind === "company-create")
    return (
      <CompanyCreateForm
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          props.finish(() => {
            props.onCompanyChange(props.store.createCompany(input));
          }, "Company created, isolated, and audited");
        }}
      />
    );
  return (
    <CompanyForm
      company={props.company}
      terminalWidth={props.terminalWidth}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(() => {
          props.onCompanyChange(props.store.updateCompany(input));
        }, "Company configuration saved and audited");
      }}
    />
  );
}

export function createFormForSection(section: string): CreateFormKind | null {
  if (section === "Companies") return "company-create";
  if (["Organization", "Departments", "Teams", "Offices & rooms"].includes(section))
    return "organization";
  if (["Projects", "Objectives", "Initiatives", "Goals", "Milestones"].includes(section))
    return "strategy";
  if (section === "Employees") return "agent-profile";
  if (section === "CEO office" || section === "Conversations") return "message";
  if (section === "Meetings") return "meeting";
  if (section === "MCP servers") return "mcp-server";
  if (section === "Project integrations") return "project-integration";
  if (section === "Mail") return "mail";
  if (section === "Automations") return "automation";
  return section === "Tasks" ? "task" : null;
}

export function editFormForSection(section: string): CreateFormKind | null {
  if (section === "Companies") return "company-edit";
  if (section === "Employees") return "agent-profile";
  if (section === "Approvals") return "approval-decision";
  return null;
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
