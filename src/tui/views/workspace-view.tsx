import type { MessageRecord } from "../../conversations/conversation-types.js";
import type { CompanyRecord } from "../../storage/records.js";
import type { OrganizationUnit } from "../../organizations/organization-types.js";
import type { StrategyItem, StrategyItemKind } from "../../strategy/strategy-types.js";
import type { TaskRecord } from "../../tasks/task-types.js";
import { CompanyView } from "./company-view.js";
import { ConversationView } from "./conversation-view.js";
import { OrganizationView } from "./organization-view.js";
import { StrategyView } from "./strategy-view.js";
import { TaskView } from "./task-view.js";
import { UnavailableView } from "./unavailable-view.js";

interface WorkspaceViewProps {
  section: string;
  company: CompanyRecord;
  organizationUnits: OrganizationUnit[];
  strategyItems: StrategyItem[];
  tasks: TaskRecord[];
  messages: MessageRecord[];
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
  if (["CEO office", "Conversations"].includes(props.section)) {
    return <ConversationView messages={props.messages} />;
  }
  return <UnavailableView section={props.section} />;
}
