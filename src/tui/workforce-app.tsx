import { useState } from "react";
import { Box, useStdout } from "ink";
import type { DockerStatus } from "../docker-runtime.js";
import type { CompanyRecord } from "../storage/records.js";
import type { StateStore } from "../storage/state-store.js";
import { Breadcrumbs } from "./components/breadcrumbs.js";
import { Sidebar } from "./components/sidebar.js";
import { StatusBar } from "./components/status-bar.js";
import { TopBar } from "./components/top-bar.js";
import { DEFAULT_SECTION, NAVIGATION_SECTIONS } from "./navigation.js";
import { ExecutiveOverview } from "./views/executive-overview.js";
import { WorkspaceView } from "./views/workspace-view.js";
import { WorkforceOverlays } from "./overlays/workforce-overlays.js";
import { useLifecycleController } from "./use-lifecycle-controller.js";
import { loadWorkspaceData, type WorkspaceData } from "./workspace-data.js";
import { useFormController } from "./use-form-controller.js";
import { nextTheme, themeById } from "./themes/index.js";
import { WorkforceThemeProvider } from "./themes/theme-context.js";
import { useWorkforceInput } from "./use-workforce-input.js";

interface WorkforceAppProps {
  store: StateStore;
  docker: DockerStatus;
  initialCompany: CompanyRecord;
  onEmergencyStop: () => Promise<void>;
  onStartTask: (companyId: string, taskId: string) => Promise<void>;
  onVerifyMcp: (companyId: string, serverId: string) => Promise<void>;
  onVerifyModel: (companyId: string, modelId: string) => Promise<void>;
}

const READY_STATUS = "Ready — no agent work starts without an approved task";

export function WorkforceApp({
  store,
  docker,
  initialCompany,
  onEmergencyStop,
  onStartTask,
  onVerifyMcp,
  onVerifyModel,
}: WorkforceAppProps) {
  const { stdout } = useStdout();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [focus, setFocus] = useState<"sidebar" | "content">("sidebar");
  const [theme, setTheme] = useState(() => themeById(process.env.WORKFORCE_THEME));
  const [helpVisible, setHelpVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState(READY_STATUS);
  const [company, setCompany] = useState(initialCompany);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [executionTaskId, setExecutionTaskId] = useState<string | null>(null);

  const { columns: width, rows: height } = stdout;
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
  const inputBlocked = hasActiveOverlay(
    emergencyVisible,
    executionTaskId,
    lifecycle.target,
    forms.active,
  );

  useWorkforceInput({
    blocked: inputBlocked,
    helpVisible,
    paletteVisible,
    paletteIndex,
    searchQuery,
    sidebarVisible,
    focus,
    selectedSection,
    lifecycle,
    forms,
    data,
    company,
    onVerifyMcp,
    onVerifyModel,
    setSelectedIndex,
    setPaletteVisible,
    setPaletteIndex,
    setSidebarVisible,
    setFocus,
    setHelpVisible,
    setSearchQuery,
    setStatusMessage,
    setEmergencyVisible,
    setExecutionTaskId,
    setCompany,
    cycleTheme: () => {
      setTheme((current) => nextTheme(current));
    },
  });

  return (
    <WorkforceThemeProvider theme={theme}>
      <Box
        width={width}
        height={height}
        flexDirection="column"
        backgroundColor={theme.colors.canvas}
      >
        <WorkforceHeader {...{ company, docker, data, section: selectedSection, focus }} />

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
          focus={focus}
          contentInteractive={
            focus === "content" && !inputBlocked && !helpVisible && !paletteVisible
          }
        />

        <StatusBar
          message={statusMessage}
          focus={focus}
          sidebarVisible={sidebarVisible}
          section={selectedSection}
        />
        <WorkforceOverlays
          paletteVisible={paletteVisible}
          helpVisible={helpVisible}
          emergencyVisible={emergencyVisible}
          executionTask={data.tasks.find(({ id }) => id === executionTaskId) ?? null}
          lifecycleTarget={lifecycle.target}
          activeForm={forms.active}
          selectedTarget={forms.editing ? lifecycle.selected : null}
          query={searchQuery}
          paletteIndex={paletteIndex}
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
    </WorkforceThemeProvider>
  );
}

function WorkforceHeader(props: {
  company: CompanyRecord;
  docker: DockerStatus;
  data: WorkspaceData;
  section: string;
  focus: "sidebar" | "content";
}) {
  return (
    <>
      <TopBar
        companyName={props.company.displayName}
        docker={props.docker}
        pendingApprovals={props.data.pendingApprovals}
        {...attemptMetricsFor(props.data)}
      />
      <Breadcrumbs section={props.section} focus={props.focus} />
    </>
  );
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

function attemptMetricsFor(data: WorkspaceData) {
  return {
    activeAttempts: data.attempts.filter(({ status }) => ["starting", "running"].includes(status))
      .length,
    queuedAttempts: data.attempts.filter(({ status }) => status === "queued").length,
    capacity: data.runtime?.maxConcurrentAttempts ?? 2,
  };
}

function hasActiveOverlay(...values: unknown[]): boolean {
  return values.some(Boolean);
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
  focus: "sidebar" | "content";
  contentInteractive: boolean;
}) {
  return (
    <Box flexGrow={1} flexDirection="row">
      {props.sidebarVisible && (
        <Sidebar
          compact={props.compact}
          height={props.height}
          selectedIndex={props.selectedIndex}
          focused={props.focus === "sidebar"}
        />
      )}
      {props.selectedIndex === 0 ? (
        <ExecutiveOverview
          company={props.company}
          docker={props.docker}
          compact={props.compact}
          activeEmployees={props.data.employees.filter(({ status }) => status === "active").length}
          {...attemptMetricsFor(props.data)}
          pendingApprovals={props.data.pendingApprovals}
          eventCount={props.store.eventCount(props.company.id)}
          auditVerified={props.store.verifyAuditChain()}
          strategyItems={props.data.strategyItems}
          active={props.contentInteractive}
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
