import { useState } from "react";
import { Box, useInput, useStdout } from "ink";
import type { DockerStatus } from "../docker-runtime.js";
import type { CompanyRecord } from "../storage/records.js";
import type { StateStore } from "../storage/state-store.js";
import { Breadcrumbs } from "./components/breadcrumbs.js";
import { Sidebar } from "./components/sidebar.js";
import { StatusBar } from "./components/status-bar.js";
import { TopBar } from "./components/top-bar.js";
import { DEFAULT_SECTION, moveGroup, moveWithinGroup, NAVIGATION_SECTIONS } from "./navigation.js";
import { ExecutiveOverview } from "./views/executive-overview.js";
import { WorkspaceView } from "./views/workspace-view.js";
import { WorkforceOverlays } from "./overlays/workforce-overlays.js";
import { useLifecycleController } from "./use-lifecycle-controller.js";
import { loadWorkspaceData, type WorkspaceData } from "./workspace-data.js";
import { useFormController } from "./use-form-controller.js";
import { processPaletteInput } from "./command-palette-input.js";
import { applicationShortcut } from "./application-shortcuts.js";

interface WorkforceAppProps {
  store: StateStore;
  docker: DockerStatus;
  initialCompany: CompanyRecord;
  onEmergencyStop: () => Promise<void>;
  onStartTask: (companyId: string, taskId: string) => Promise<void>;
  onVerifyMcp: (companyId: string, serverId: string) => Promise<void>;
}

const READY_STATUS = "Ready — no agent work starts without an approved task";

export function WorkforceApp({
  store,
  docker,
  initialCompany,
  onEmergencyStop,
  onStartTask,
  onVerifyMcp,
}: WorkforceAppProps) {
  const { stdout } = useStdout();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [helpVisible, setHelpVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState(READY_STATUS);
  const [company, setCompany] = useState(initialCompany);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [executionTaskId, setExecutionTaskId] = useState<string | null>(null);

  const width = stdout.columns;
  const height = stdout.rows;
  const compact = width < 88;
  const selectedSection = NAVIGATION_SECTIONS[selectedIndex] ?? DEFAULT_SECTION;
  const data = loadWorkspaceData(store, company.id);
  const lifecycle = useLifecycleController({
    section: selectedSection,
    companyId: company.id,
    data,
    store,
    onStatus: setStatusMessage,
  });
  const forms = useFormController(setStatusMessage);

  useInput((input, key) => {
    if (emergencyVisible) return;
    if (executionTaskId) return;
    if (lifecycle.target) return;
    if (forms.active) return;
    if (helpVisible) {
      if (input === "?" || key.escape) setHelpVisible(false);
      return;
    }

    if (paletteVisible) {
      processPaletteInput(input, key, searchQuery, {
        close: () => {
          setPaletteVisible(false);
          setSearchQuery("");
        },
        select: setSelectedIndex,
        status: setStatusMessage,
        query: setSearchQuery,
      });
      return;
    }

    const shortcut = applicationShortcut(input, key);
    if (shortcut === "toggle-sidebar") setSidebarVisible((visible) => !visible);
    else if (shortcut === "open-settings")
      setSelectedIndex(NAVIGATION_SECTIONS.indexOf("Settings"));
    else if (shortcut === "open-palette") setPaletteVisible(true);
    if (shortcut) return;

    if (input === "q" && !key.ctrl && !key.meta) process.exit(0);
    if (input === "n") forms.openCreate(selectedSection);
    if (input === "e") forms.openEdit(selectedSection, Boolean(lifecycle.selected));
    lifecycle.handleKey(input);
    if (input === "!") setEmergencyVisible(true);
    if (input === "r" && selectedSection === "Tasks") {
      const task = data.tasks.find(({ status }) => status === "ready" || status === "assigned");
      if (task) setExecutionTaskId(task.id);
      else setStatusMessage("No ready or assigned task is available to run");
    }
    if (input === "v" && selectedSection === "MCP servers") {
      verifyFirstMcp(data.mcpServers, company.id, onVerifyMcp, setStatusMessage);
    }
    if (input === "?") setHelpVisible(true);
    else if (input === "p" || input === "/") setPaletteVisible(true);
    else if (key.tab) setSelectedIndex((current) => moveGroup(current, key.shift ? -1 : 1));
    else if (key.upArrow || input === "k")
      setSelectedIndex((current) => moveWithinGroup(current, -1));
    else if (key.downArrow || input === "j")
      setSelectedIndex((current) => moveWithinGroup(current, 1));
    else if (key.return && selectedSection === "Companies")
      activateSelectedCompany(data.companies[lifecycle.rowIndex], setCompany, setStatusMessage);
    else if (key.return) setStatusMessage(`Opened ${selectedSection}`);
  });

  return (
    <Box width={width} height={height} flexDirection="column">
      <TopBar
        companyName={company.displayName}
        docker={docker}
        pendingApprovals={data.pendingApprovals}
      />
      <Breadcrumbs section={selectedSection} />

      <WorkforceContent
        selectedIndex={selectedIndex}
        section={selectedSection}
        store={store}
        company={company}
        docker={docker}
        compact={compact}
        height={height}
        data={data}
        rowIndex={lifecycle.rowIndex}
        sidebarVisible={sidebarVisible}
      />

      <StatusBar message={statusMessage} />
      <WorkforceOverlays
        paletteVisible={paletteVisible}
        helpVisible={helpVisible}
        emergencyVisible={emergencyVisible}
        executionTask={data.tasks.find(({ id }) => id === executionTaskId) ?? null}
        lifecycleTarget={lifecycle.target}
        activeForm={forms.active}
        selectedTarget={forms.editing ? lifecycle.selected : null}
        query={searchQuery}
        compact={compact}
        terminalWidth={width}
        section={selectedSection}
        company={company}
        store={store}
        onCompanyChange={setCompany}
        onCloseForm={() => {
          forms.close();
        }}
        onCloseEmergency={() => {
          setEmergencyVisible(false);
        }}
        onStatus={setStatusMessage}
        onEmergencyStop={onEmergencyStop}
        onCancelExecution={() => {
          setExecutionTaskId(null);
        }}
        onCancelLifecycle={lifecycle.cancel}
        onConfirmLifecycle={lifecycle.confirm}
        onConfirmExecution={() => {
          const taskId = executionTaskId;
          setExecutionTaskId(null);
          startTaskExecution(taskId, company.id, onStartTask, setStatusMessage);
        }}
      />
    </Box>
  );
}

function verifyFirstMcp(
  servers: ReturnType<typeof loadWorkspaceData>["mcpServers"],
  companyId: string,
  verify: (companyId: string, serverId: string) => Promise<void>,
  status: (message: string) => void,
): void {
  const server = servers.find((candidate) => candidate.status === "active");
  if (!server) {
    status("No active MCP server is available to verify");
    return;
  }
  status(`Verifying ${server.name} in Docker…`);
  void verify(companyId, server.id)
    .then(() => {
      status(`${server.name} passed its Docker MCP probe`);
    })
    .catch((error: unknown) => {
      status(error instanceof Error ? error.message : "MCP verification failed");
    });
}

function startTaskExecution(
  taskId: string | null,
  companyId: string,
  start: (companyId: string, taskId: string) => Promise<void>,
  status: (message: string) => void,
): void {
  if (!taskId) return;
  status("Validating and queueing agent execution…");
  void start(companyId, taskId)
    .then(() => {
      status("Agent attempt queued through Docker supervisor");
    })
    .catch((error: unknown) => {
      status(error instanceof Error ? error.message : "Task execution failed");
    });
}

function WorkforceContent(props: {
  selectedIndex: number;
  section: string;
  store: StateStore;
  company: CompanyRecord;
  docker: DockerStatus;
  compact: boolean;
  height: number;
  data: WorkspaceData;
  rowIndex: number;
  sidebarVisible: boolean;
}) {
  return (
    <Box flexGrow={1} flexDirection="row">
      {props.sidebarVisible && (
        <Sidebar
          compact={props.compact}
          height={props.height}
          selectedIndex={props.selectedIndex}
        />
      )}
      {props.selectedIndex === 0 ? (
        <ExecutiveOverview
          company={props.company}
          docker={props.docker}
          compact={props.compact}
          activeEmployees={props.data.employees.filter(({ status }) => status === "active").length}
          pendingApprovals={props.data.pendingApprovals}
          eventCount={props.store.eventCount(props.company.id)}
          auditVerified={props.store.verifyAuditChain()}
          strategyItems={props.data.strategyItems}
        />
      ) : (
        <WorkspaceView
          section={props.section}
          company={props.company}
          auditVerified={props.store.verifyAuditChain()}
          docker={props.docker}
          compact={props.compact}
          selectedRow={props.rowIndex}
          {...props.data}
        />
      )}
    </Box>
  );
}

function activateSelectedCompany(
  selected: CompanyRecord | undefined,
  activate: (company: CompanyRecord) => void,
  status: (message: string) => void,
): void {
  if (!selected) status("No company is selected");
  else if (selected.status !== "active") status("Restore the company before activating it");
  else {
    activate(selected);
    status(`Activated ${selected.displayName}`);
  }
}
