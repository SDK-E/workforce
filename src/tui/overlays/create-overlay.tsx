import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import { CompanyForm } from "./company-form.js";
import { CompanyCreateForm } from "./company-create-form.js";
import { MessageForm } from "./message-form.js";
import { MeetingForm } from "./meeting-form.js";
import { ApprovalDecisionForm } from "./approval-decision-form.js";
import { McpServerForm } from "./mcp-server-form.js";
import { ProjectIntegrationForm } from "./project-integration-form.js";
import { MailForm } from "./mail-form.js";
import { AutomationForm } from "./automation-form.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { ResourceMutationOverlay } from "./resource-mutation-overlay.js";
import { EmployeeMutationOverlay } from "./employee-mutation-overlay.js";
import { ConversationMutationOverlay } from "./conversation-mutation-overlay.js";
import { ModelMutationOverlay } from "./model-mutation-overlay.js";

export type CreateFormKind =
  | "company-create"
  | "company-edit"
  | "organization"
  | "strategy"
  | "task"
  | "employee-hire"
  | "agent-profile"
  | "message"
  | "room"
  | "model"
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
  selectedTarget: LifecycleTarget | null;
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
  if (["organization", "strategy", "task"].includes(props.kind))
    return (
      <ResourceMutationOverlay
        {...props}
        kind={props.kind as "organization" | "strategy" | "task"}
        finish={finish}
      />
    );
  if (props.kind === "employee-hire" || props.kind === "agent-profile")
    return <EmployeeMutationOverlay {...props} kind={props.kind} finish={finish} />;
  if (props.kind === "room") return <ConversationMutationOverlay {...props} finish={finish} />;
  if (props.kind === "model") return <ModelMutationOverlay {...props} finish={finish} />;
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
  if (props.kind === "meeting") return <MeetingMutationOverlay {...props} finish={finish} />;
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
  return null;
}

type MutationOverlayProps = CreateOverlayProps & {
  finish: (action: () => void, success: string) => void;
};

function CapabilityMutationOverlay(props: MutationOverlayProps) {
  if (props.kind === "mcp-server") {
    const current =
      props.selectedTarget?.kind === "mcp"
        ? props.store.mcpServers.get(props.company.id, props.selectedTarget.id)
        : undefined;
    return (
      <McpServerForm
        companyId={props.company.id}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        initial={current}
        onSubmit={(input) => {
          props.finish(
            () => {
              props.store.mcpServers.save(input, "human");
            },
            `MCP server ${current ? "updated" : "registered"} and ${current ? "audited" : "awaiting verification"}`,
          );
        }}
      />
    );
  }
  if (props.kind === "project-integration") {
    const current =
      props.selectedTarget?.kind === "integration"
        ? props.store.projectIntegrations.get(
            props.company.id,
            props.selectedTarget.projectId ?? "",
            props.selectedTarget.id,
          )
        : undefined;
    return (
      <ProjectIntegrationForm
        companyId={props.company.id}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        initial={current}
        onSubmit={(input) => {
          props.finish(() => {
            props.store.projectIntegrations.save(input, "human");
          }, "Project integration configured and audited");
        }}
      />
    );
  }
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

function MeetingMutationOverlay(props: MutationOverlayProps) {
  const current =
    props.selectedTarget?.kind === "meeting"
      ? props.store.meetings
          .list(props.company.id)
          .find((item) => item.id === props.selectedTarget?.id)
      : undefined;
  return (
    <MeetingForm
      terminalWidth={props.terminalWidth}
      {...(current ? { initial: current } : {})}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(
          () => {
            if (current)
              props.store.meetings.update({
                companyId: props.company.id,
                meetingId: current.id,
                ...input,
                actorId: "human",
              });
            else props.store.meetings.create({ companyId: props.company.id, ...input });
          },
          `Meeting ${current ? "updated" : "scheduled"} and audited`,
        );
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
  const selectedCompany =
    props.selectedTarget?.kind === "company"
      ? props.store.company(props.selectedTarget.id)
      : undefined;
  const company = selectedCompany ?? props.company;
  return (
    <CompanyForm
      company={company}
      terminalWidth={props.terminalWidth}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(() => {
          const updated = props.store.updateCompany(input);
          if (updated.id === props.company.id) props.onCompanyChange(updated);
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
  if (section === "Employees") return "employee-hire";
  if (section === "CEO office") return "message";
  if (section === "Conversations") return "room";
  if (section === "Meetings") return "meeting";
  if (section === "Models & engines") return "model";
  if (section === "MCP servers") return "mcp-server";
  if (section === "Project integrations") return "project-integration";
  if (section === "Mail") return "mail";
  if (section === "Automations") return "automation";
  return section === "Tasks" ? "task" : null;
}

export function editFormForSection(section: string): CreateFormKind | null {
  if (section === "Companies") return "company-edit";
  if (section === "Employees") return "agent-profile";
  if (section === "Meetings") return "meeting";
  if (section === "Models & engines") return "model";
  if (section === "Conversations") return "room";
  if (section === "Approvals") return "approval-decision";
  if (["Organization", "Departments", "Teams", "Offices & rooms"].includes(section))
    return "organization";
  if (["Projects", "Objectives", "Initiatives", "Goals", "Milestones"].includes(section))
    return "strategy";
  if (section === "Tasks") return "task";
  if (section === "MCP servers") return "mcp-server";
  if (section === "Project integrations") return "project-integration";
  return null;
}
