import type {
  ConversationThread,
  MessageRecord,
  RoomRecord,
} from "../../conversations/conversation-types.js";
import type { CompanyRecord } from "../../storage/records.js";
import type { OrganizationUnit } from "../../organizations/organization-types.js";
import type { StrategyItem, StrategyItemKind } from "../../strategy/strategy-types.js";
import type { TaskRecord } from "../../tasks/task-types.js";
import type { Employee } from "../../domain.js";
import type { HiringProposal } from "../../governance/governance-types.js";
import type { ApprovalRecord } from "../../storage/approval-repository.js";
import type { MeetingRecord } from "../../governance/meeting-repository.js";
import type {
  CorrectiveActionRecord,
  IncidentRecord,
} from "../../governance/incident-repository.js";
import type { ClaimRecord, PerformanceRecord } from "../../governance/performance-repository.js";
import type { AttemptEventRecord, AttemptRecord } from "../../supervision/attempt-types.js";
import type { ArtifactRecord } from "../../acceptance/artifact-types.js";
import type { WorkforceEvent } from "../../domain.js";
import type { DockerStatus } from "../../docker-runtime.js";
import { AgentResourcesView } from "./agent-resources-view.js";
import { ApprovalView } from "./approval-view.js";
import { CompanyView } from "./company-view.js";
import { ConversationView } from "./conversation-view.js";
import { OrganizationView } from "./organization-view.js";
import { StrategyView } from "./strategy-view.js";
import { TaskView } from "./task-view.js";
import { EmployeeView } from "./employee-view.js";
import { MeetingView } from "./meeting-view.js";
import { PerformanceView } from "./performance-view.js";
import { IncidentView } from "./incident-view.js";
import { ClaimView } from "./claim-view.js";
import { DeliverableView } from "./execution-view.js";
import { WorkflowTimelineView } from "./workflow-timeline-view.js";
import { RuntimeView } from "./runtime-view.js";
import { AuditView, DiagnosticsView } from "./audit-view.js";
import { SettingsView } from "./settings-view.js";
import type {
  EnvironmentRecord,
  ModelRecord,
  ToolRecord,
} from "../../registries/registry-types.js";
import type { AgentProfile } from "../../employees/agent-profile-types.js";
import type {
  MailRecord,
  McpServerRecord,
  ProjectIntegrationRecord,
} from "../../integrations/integration-types.js";
import type { AutomationRecord } from "../../automations/automation-types.js";
import type { CompanyRuntime } from "../../autonomy/autonomy-types.js";
import { McpServerView } from "./mcp-server-view.js";
import { ProjectIntegrationView } from "./project-integration-view.js";
import { MailView } from "./mail-view.js";
import { AutomationView } from "./automation-view.js";
import { ExecutionReadinessView } from "./execution-readiness-view.js";
import { executionReadiness } from "../../execution/execution-readiness.js";

interface WorkspaceViewProps {
  section: string;
  company: CompanyRecord;
  organizationUnits: OrganizationUnit[];
  strategyItems: StrategyItem[];
  tasks: TaskRecord[];
  messages: MessageRecord[];
  rooms: RoomRecord[];
  threads: ConversationThread[];
  employees: Employee[];
  hiringProposals: HiringProposal[];
  approvals: ApprovalRecord[];
  meetings: MeetingRecord[];
  performanceRecords: PerformanceRecord[];
  incidents: IncidentRecord[];
  correctiveActions: CorrectiveActionRecord[];
  claims: ClaimRecord[];
  attempts: AttemptRecord[];
  attemptEvents: AttemptEventRecord[];
  artifacts: ArtifactRecord[];
  events: WorkforceEvent[];
  auditVerified: boolean;
  docker: DockerStatus;
  tools: ToolRecord[];
  environments: EnvironmentRecord[];
  models: ModelRecord[];
  agentProfiles: AgentProfile[];
  mcpServers: McpServerRecord[];
  projectIntegrations: ProjectIntegrationRecord[];
  mail: MailRecord[];
  automations: AutomationRecord[];
  runtime: CompanyRuntime | undefined;
  compact: boolean;
  companies: CompanyRecord[];
  selectedRow: number;
}

const STRATEGY_SECTIONS: Record<string, StrategyItemKind> = {
  Objectives: "objective",
  Initiatives: "initiative",
  Projects: "project",
  Goals: "goal",
  Milestones: "milestone",
};

export function WorkspaceView(props: WorkspaceViewProps) {
  if (props.section === "Execution readiness")
    return (
      <ExecutionReadinessView
        readiness={executionReadiness({
          docker: props.docker,
          environments: props.environments,
          models: props.models,
          attempts: props.attempts,
          runtime: props.runtime,
        })}
      />
    );
  if (props.section === "Companies")
    return (
      <CompanyView
        company={props.company}
        companies={props.companies}
        compact={props.compact}
        selectedRow={props.selectedRow}
      />
    );
  if (props.section === "Organization")
    return <OrganizationView units={props.organizationUnits} selectedRow={props.selectedRow} />;
  if (props.section === "Departments")
    return (
      <OrganizationView
        units={props.organizationUnits}
        kind="department"
        selectedRow={props.selectedRow}
      />
    );
  if (props.section === "Teams")
    return (
      <OrganizationView
        units={props.organizationUnits}
        kind="team"
        selectedRow={props.selectedRow}
      />
    );
  if (props.section === "Offices & rooms")
    return (
      <OrganizationView
        units={props.organizationUnits}
        kind={["office", "room"]}
        selectedRow={props.selectedRow}
      />
    );
  const strategyKind = STRATEGY_SECTIONS[props.section];
  if (strategyKind) {
    return (
      <StrategyView
        title={props.section}
        kind={strategyKind}
        items={props.strategyItems}
        selectedRow={props.selectedRow}
      />
    );
  }
  if (props.section === "Tasks")
    return <TaskView tasks={props.tasks} selectedRow={props.selectedRow} />;
  if (props.section === "Employees")
    return (
      <EmployeeView
        employees={props.employees}
        profiles={props.agentProfiles}
        compact={props.compact}
        selectedRow={props.selectedRow}
      />
    );
  if (props.section === "Agent Resources")
    return <AgentResourcesView proposals={props.hiringProposals} selectedRow={props.selectedRow} />;
  if (props.section === "Approvals")
    return <ApprovalView approvals={props.approvals} selectedRow={props.selectedRow} />;
  if (props.section === "Meetings")
    return <MeetingView meetings={props.meetings} selectedRow={props.selectedRow} />;
  if (props.section === "Performance")
    return <PerformanceView records={props.performanceRecords} />;
  if (props.section === "Recognition")
    return <PerformanceView records={props.performanceRecords} kind="recognition" />;
  if (props.section === "Warnings & incidents")
    return (
      <IncidentView
        incidents={props.incidents}
        actions={props.correctiveActions}
        selectedRow={props.selectedRow}
      />
    );
  if (props.section === "Critics & reviews")
    return <ClaimView claims={props.claims} selectedRow={props.selectedRow} />;
  if (["CEO office", "Conversations"].includes(props.section)) {
    return (
      <ConversationView
        messages={props.messages}
        rooms={props.rooms}
        threads={props.threads}
        selectedRow={props.selectedRow}
      />
    );
  }
  if (props.section === "Mail")
    return <MailView mail={props.mail} selectedRow={props.selectedRow} />;
  if (props.section === "Live work")
    return (
      <WorkflowTimelineView
        attempts={props.attempts}
        events={props.attemptEvents}
        compact={props.compact}
      />
    );
  if (props.section === "Deliverables") return <DeliverableView artifacts={props.artifacts} />;
  if (["Tools", "Environments", "Models & engines", "Docker & resources"].includes(props.section))
    return (
      <RuntimeView
        section={props.section}
        docker={props.docker}
        tools={props.tools}
        environments={props.environments}
        models={props.models}
        selectedRow={props.selectedRow}
      />
    );
  if (props.section === "MCP servers")
    return <McpServerView servers={props.mcpServers} selectedRow={props.selectedRow} />;
  if (props.section === "Project integrations")
    return (
      <ProjectIntegrationView
        integrations={props.projectIntegrations}
        selectedRow={props.selectedRow}
      />
    );
  if (props.section === "Automations")
    return <AutomationView automations={props.automations} selectedRow={props.selectedRow} />;
  if (props.section === "Audit")
    return <AuditView events={props.events} verified={props.auditVerified} />;
  if (props.section === "Settings")
    return <SettingsView company={props.company} runtime={props.runtime} />;
  return <DiagnosticsView events={props.events} />;
}
