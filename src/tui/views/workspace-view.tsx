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
import { AgentResourcesView } from "./agent-resources-view.js";
import { ApprovalView } from "./approval-view.js";
import { CompanyView } from "./company-view.js";
import { ConversationView } from "./conversation-view.js";
import { OrganizationView } from "./organization-view.js";
import { StrategyView } from "./strategy-view.js";
import { TaskView } from "./task-view.js";
import { UnavailableView } from "./unavailable-view.js";
import { EmployeeView } from "./employee-view.js";
import { MeetingView } from "./meeting-view.js";
import { PerformanceView } from "./performance-view.js";
import { IncidentView } from "./incident-view.js";
import { ClaimView } from "./claim-view.js";

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
}

const STRATEGY_SECTIONS: Record<string, StrategyItemKind> = {
  Objectives: "objective",
  Initiatives: "initiative",
  Projects: "project",
  Goals: "goal",
  Milestones: "milestone",
};

export function WorkspaceView(props: WorkspaceViewProps) {
  if (props.section === "Companies") return <CompanyView company={props.company} />;
  if (["Organization", "Departments", "Teams", "Offices & rooms"].includes(props.section)) {
    return <OrganizationView units={props.organizationUnits} />;
  }
  const strategyKind = STRATEGY_SECTIONS[props.section];
  if (strategyKind) {
    return <StrategyView title={props.section} kind={strategyKind} items={props.strategyItems} />;
  }
  if (props.section === "Tasks") return <TaskView tasks={props.tasks} />;
  if (props.section === "Employees") return <EmployeeView employees={props.employees} />;
  if (props.section === "Agent Resources")
    return <AgentResourcesView proposals={props.hiringProposals} />;
  if (props.section === "Approvals") return <ApprovalView approvals={props.approvals} />;
  if (props.section === "Meetings") return <MeetingView meetings={props.meetings} />;
  if (props.section === "Performance")
    return <PerformanceView records={props.performanceRecords} />;
  if (props.section === "Recognition")
    return <PerformanceView records={props.performanceRecords} kind="recognition" />;
  if (props.section === "Warnings & incidents")
    return <IncidentView incidents={props.incidents} actions={props.correctiveActions} />;
  if (props.section === "Critics & reviews") return <ClaimView claims={props.claims} />;
  if (["CEO office", "Conversations"].includes(props.section)) {
    return (
      <ConversationView messages={props.messages} rooms={props.rooms} threads={props.threads} />
    );
  }
  return <UnavailableView section={props.section} />;
}
