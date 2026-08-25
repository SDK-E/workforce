import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { OrganizationUnitKind } from "../../organizations/organization-types.js";
import type { StrategyItemKind } from "../../strategy/strategy-types.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { OrganizationForm } from "./organization-form.js";
import { StrategyForm } from "./strategy-form.js";
import { TaskForm } from "./task-form.js";

interface Props {
  kind: "organization" | "strategy" | "task";
  section: string;
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  onClose: () => void;
  selectedTarget: LifecycleTarget | null;
  finish: (action: () => void, success: string) => void;
}

export function ResourceMutationOverlay(props: Props) {
  if (props.kind === "organization") return <OrganizationMutation {...props} />;
  if (props.kind === "strategy") return <StrategyMutation {...props} />;
  return <TaskMutation {...props} />;
}

function OrganizationMutation(props: Props) {
  const current =
    props.selectedTarget?.kind === "organization"
      ? props.store.organizationRepository.get(props.company.id, props.selectedTarget.id)
      : undefined;
  return (
    <OrganizationForm
      companyId={props.company.id}
      kind={organizationKind(props.section)}
      terminalWidth={props.terminalWidth}
      initial={current}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(
          () => {
            if (current)
              props.store.organizationRepository.update({
                companyId: input.companyId,
                unitId: current.id,
                name: input.name,
                parentId: input.parentId ?? null,
                managerId: input.managerId ?? null,
              });
            else props.store.createOrganizationUnit(input);
          },
          `${input.kind} ${current ? "updated" : "created"} and audited`,
        );
      }}
    />
  );
}

function StrategyMutation(props: Props) {
  const current =
    props.selectedTarget?.kind === "strategy"
      ? props.store.strategyRepository.get(props.company.id, props.selectedTarget.id)
      : undefined;
  return (
    <StrategyForm
      companyId={props.company.id}
      kind={strategyKind(props.section)}
      terminalWidth={props.terminalWidth}
      initial={current}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(
          () => {
            if (current)
              props.store.strategyRepository.update({
                companyId: input.companyId,
                itemId: current.id,
                name: input.name,
                parentId: input.parentId ?? null,
                ownerId: input.ownerId,
                managerId: input.managerId,
                successMeasures: input.successMeasures,
              });
            else props.store.createStrategyItem(input);
          },
          `${input.kind} ${current ? "updated" : "created"} and audited`,
        );
      }}
    />
  );
}

function TaskMutation(props: Props) {
  const current =
    props.selectedTarget?.kind === "task"
      ? props.store.tasksRepository.get(props.company.id, props.selectedTarget.id)
      : undefined;
  return (
    <TaskForm
      companyId={props.company.id}
      employees={props.store.employees(props.company.id)}
      terminalWidth={props.terminalWidth}
      initial={current}
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(
          () => {
            if (current) updateTask(props.store, current, input);
            else createApprovedTask(props.store, input);
          },
          `Task ${current ? "updated" : "created and approved"} and audited`,
        );
      }}
    />
  );
}

function updateTask(
  store: StateStore,
  current: NonNullable<ReturnType<StateStore["tasksRepository"]["get"]>>,
  input: Parameters<StateStore["createTask"]>[0],
): void {
  store.tasksRepository.requirements.update({
    companyId: current.companyId,
    taskId: current.id,
    objective: input.objective,
    nonGoals: current.nonGoals,
    acceptanceCriteria: input.acceptanceCriteria,
    capabilities: current.capabilities,
    inputs: current.inputs,
    outputs: current.outputs,
    tools: current.tools,
    modelPolicy: current.modelPolicy,
    escalationPath: current.escalationPath,
    networkPolicy: current.networkPolicy,
    resourcePolicy: current.resourcePolicy,
    changedBy: "human",
    changeReason: "Edited through confirmed TUI form",
  });
  store.tasksRepository.setRisk(current.companyId, current.id, input.risk, "human");
  if (input.assigneeId && input.assigneeId !== current.assigneeId)
    store.tasksRepository.assign(current.companyId, current.id, input.assigneeId, "human");
}

function createApprovedTask(
  store: StateStore,
  input: Parameters<StateStore["createTask"]>[0],
): void {
  const task = store.createTask(input);
  store.transitionTask(
    task.companyId,
    task.id,
    "REQUEST_APPROVAL",
    "human",
    "Confirmed through the task creation workflow",
  );
  store.transitionTask(
    task.companyId,
    task.id,
    "APPROVE",
    "human",
    "Human approved the displayed objective, risk, assignment, and acceptance criteria",
  );
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
