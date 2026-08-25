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
import { AutomationMutationOverlay } from "./automation-mutation-overlay.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { ResourceMutationOverlay } from "./resource-mutation-overlay.js";
import { EmployeeMutationOverlay } from "./employee-mutation-overlay.js";
import { ConversationMutationOverlay } from "./conversation-mutation-overlay.js";
import { ModelMutationOverlay } from "./model-mutation-overlay.js";
import { RegistryMutationOverlay } from "./registry-mutation-overlay.js";
import { GovernanceMutationOverlay } from "./governance-mutation-overlay.js";
import { IncidentMutationOverlay } from "./incident-mutation-overlay.js";
import { BusinessMutationOverlay } from "./business-mutation-overlay.js";

export type CreateFormKind =
  | "company-create"
  | "company-edit"
  | "organization"
  | "strategy"
  | "task"
  | "employee-hire"
  | "hiring-decision"
  | "agent-profile"
  | "message"
  | "room"
  | "model"
  | "meeting"
  | "approval-decision"
  | "mcp-server"
  | "project-integration"
  | "mail"
  | "automation"
  | "automation-decision"
  | "tool"
  | "environment"
  | "performance"
  | "recognition"
  | "incident"
  | "incident-decision"
  | "claim"
  | "opportunity"
  | "lead"
  | "client"
  | "engagement";

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
  if (props.kind === "automation" || props.kind === "automation-decision")
    return <AutomationMutationOverlay {...props} kind={props.kind} finish={finish} />;
  if (["mcp-server", "project-integration", "mail"].includes(props.kind))
    return <CapabilityMutationOverlay {...props} finish={finish} />;
  if (["organization", "strategy", "task"].includes(props.kind))
    return (
      <ResourceMutationOverlay
        {...props}
        kind={props.kind as "organization" | "strategy" | "task"}
        finish={finish}
      />
    );
  if (
    props.kind === "employee-hire" ||
    props.kind === "agent-profile" ||
    props.kind === "hiring-decision"
  )
    return <EmployeeMutationOverlay {...props} kind={props.kind} finish={finish} />;
  if (props.kind === "room") return <ConversationMutationOverlay {...props} finish={finish} />;
  if (props.kind === "model") return <ModelMutationOverlay {...props} finish={finish} />;
  if (props.kind === "tool" || props.kind === "environment")
    return <RegistryMutationOverlay {...props} kind={props.kind} finish={finish} />;
  if (["performance", "recognition", "incident", "claim"].includes(props.kind))
    return (
      <GovernanceMutationOverlay
        {...props}
        kind={props.kind as "performance" | "recognition" | "incident" | "claim"}
        finish={finish}
      />
    );
  if (props.kind === "incident-decision")
    return <IncidentMutationOverlay {...props} finish={finish} />;
  if (["opportunity", "lead", "client", "engagement"].includes(props.kind))
    return (
      <BusinessMutationOverlay
        {...props}
        kind={props.kind as "opportunity" | "lead" | "client" | "engagement"}
        finish={finish}
      />
    );
  if (props.kind === "message")
    return (
      <MessageForm
        rooms={props.store.conversations.rooms.list(props.company.id)}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          finish(() => {
            props.store.addMessage(
              props.company.id,
              input.roomId,
              input.authorId,
              input.body,
              null,
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
        {...(props.selectedTarget?.kind === "approval"
          ? { initialApprovalId: props.selectedTarget.id }
          : {})}
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
        employees={props.store.employees(props.company.id)}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          props.finish(() => {
            props.store.mail.send(input);
          }, "Mail sent and audited");
        }}
      />
    );
  return null;
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
