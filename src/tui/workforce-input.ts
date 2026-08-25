import type { CompanyRecord } from "../storage/records.js";
import type { useFormController } from "./use-form-controller.js";
import type { useLifecycleController } from "./use-lifecycle-controller.js";
import { moveGroup, moveWithinGroup } from "./navigation.js";
import type { WorkspaceData } from "./workspace-data.js";
import { matchesKeybinding } from "./keybindings.js";

export function handleSidebarInput(
  input: string,
  key: {
    upArrow: boolean;
    downArrow: boolean;
    leftArrow?: boolean;
    rightArrow: boolean;
    return: boolean;
  },
  select: (update: (current: number) => number) => void,
  focusContent: () => void,
): void {
  if (isPrevious(input, key)) select((current) => moveWithinGroup(current, -1));
  else if (isNext(input, key)) select((current) => moveWithinGroup(current, 1));
  else if (matchesKeybinding("previousPanel", input, key))
    select((current) => moveGroup(current, -1));
  else if (matchesKeybinding("nextPanel", input, key)) select((current) => moveGroup(current, 1));
  else if (matchesKeybinding("activate", input, key)) focusContent();
}

export function handleContentInput(
  input: string,
  key: { upArrow: boolean; downArrow: boolean; return: boolean },
  context: ContentInputContext,
): void {
  if (matchesKeybinding("create", input, key)) context.forms.openCreate(context.section);
  else if (matchesKeybinding("edit", input, key))
    context.forms.openEdit(context.section, Boolean(context.lifecycle.selected));
  else if (context.lifecycle.handleKey(input)) return;
  else if (isPrevious(input, key)) context.lifecycle.moveSelection(-1);
  else if (isNext(input, key)) context.lifecycle.moveSelection(1);
  else if (matchesKeybinding("run", input, key) && context.section === "Tasks")
    requestTaskExecution(context);
  else if (matchesKeybinding("verify", input, key) && context.section === "MCP servers")
    verifyFirstMcp(context);
  else if (matchesKeybinding("verify", input, key) && context.section === "Models & engines")
    verifySelectedModel(context);
  else if (matchesKeybinding("nextTheme", input, key) && context.section === "Settings")
    context.cycleTheme();
  else if (matchesKeybinding("activate", input, key) && context.section === "Companies")
    activateSelectedCompany(context);
  else if (matchesKeybinding("activate", input, key) && context.lifecycle.selected)
    context.setStatusMessage(`Inspecting ${context.lifecycle.selected.label}`);
}

function isPrevious(input: string, key: Parameters<typeof matchesKeybinding>[2]): boolean {
  return matchesKeybinding("previous", input, key) || matchesKeybinding("previousVim", input, key);
}

function isNext(input: string, key: Parameters<typeof matchesKeybinding>[2]): boolean {
  return matchesKeybinding("next", input, key) || matchesKeybinding("nextVim", input, key);
}

interface ContentInputContext {
  section: string;
  lifecycle: ReturnType<typeof useLifecycleController>;
  forms: ReturnType<typeof useFormController>;
  data: WorkspaceData;
  company: CompanyRecord;
  onVerifyMcp: (companyId: string, serverId: string) => Promise<void>;
  onVerifyModel: (companyId: string, modelId: string) => Promise<void>;
  setExecutionTaskId: (id: string) => void;
  setCompany: (company: CompanyRecord) => void;
  setStatusMessage: (message: string) => void;
  cycleTheme: () => void;
}

function requestTaskExecution(context: ContentInputContext): void {
  const selected = context.lifecycle.selected;
  const task =
    selected?.kind === "task" ? context.data.tasks.find(({ id }) => id === selected.id) : undefined;
  if (!task) context.setStatusMessage("Select a task before requesting execution");
  else if (!["ready", "assigned"].includes(task.status))
    context.setStatusMessage(`Selected task cannot run while ${task.status}`);
  else context.setExecutionTaskId(task.id);
}

function verifyFirstMcp(context: ContentInputContext): void {
  const selected = context.lifecycle.selected;
  const server =
    selected?.kind === "mcp"
      ? context.data.mcpServers.find(({ id }) => id === selected.id)
      : undefined;
  if (!server) {
    context.setStatusMessage("Select an MCP server before verification");
    return;
  }
  if (server.status !== "active") {
    context.setStatusMessage("Restore the selected MCP server before verification");
    return;
  }
  context.setStatusMessage(`Verifying ${server.name} in Docker…`);
  void context
    .onVerifyMcp(context.company.id, server.id)
    .then(() => {
      context.setStatusMessage(`${server.name} passed its Docker MCP probe`);
    })
    .catch((error: unknown) => {
      context.setStatusMessage(error instanceof Error ? error.message : "MCP verification failed");
    });
}

function verifySelectedModel(context: ContentInputContext): void {
  if (context.lifecycle.selected?.kind !== "model") {
    context.setStatusMessage("Select a configured model before verification");
    return;
  }
  context.setStatusMessage(
    `Verifying ${context.lifecycle.selected.label} through Docker inference…`,
  );
  void context
    .onVerifyModel(context.company.id, context.lifecycle.selected.id)
    .then(() => {
      context.setStatusMessage("Model inference verification receipt recorded");
    })
    .catch((error: unknown) => {
      context.setStatusMessage(
        error instanceof Error ? error.message : "Model verification failed",
      );
    });
}

function activateSelectedCompany(context: ContentInputContext): void {
  const selected = context.data.companies[context.lifecycle.rowIndex];
  if (!selected) context.setStatusMessage("No company is selected");
  else if (selected.status !== "active")
    context.setStatusMessage("Restore the company before activating it");
  else {
    context.setCompany(selected);
    context.setStatusMessage(`Activated ${selected.displayName}`);
  }
}
