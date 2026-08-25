import { useState, type Dispatch, type SetStateAction } from "react";
import { Box, useInput, useStdout } from "ink";
import type { DockerStatus } from "../docker-runtime.js";
import type { CompanyRecord } from "../storage/records.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import type { StateStore } from "../storage/state-store.js";
import { Breadcrumbs } from "./components/breadcrumbs.js";
import { Sidebar } from "./components/sidebar.js";
import { StatusBar } from "./components/status-bar.js";
import { TopBar } from "./components/top-bar.js";
import { NAVIGATION_SECTIONS } from "./navigation.js";
import {
  createFormForSection,
  editFormForSection,
  type CreateFormKind,
} from "./overlays/create-overlay.js";
import { ExecutiveOverview } from "./views/executive-overview.js";
import { WorkspaceView } from "./views/workspace-view.js";
import { WorkforceOverlays } from "./overlays/workforce-overlays.js";

interface WorkforceAppProps {
  store: StateStore;
  docker: DockerStatus;
  initialCompany: CompanyRecord;
  onEmergencyStop: () => Promise<void>;
  onStartTask: (companyId: string, taskId: string) => Promise<void>;
  onVerifyMcp: (companyId: string, serverId: string) => Promise<void>;
}

function loadWorkspaceData(store: StateStore, companyId: string) {
  const rooms = store.conversations.roomList(companyId);
  const primaryRoom = rooms[0];
  return {
    employees: store.employees(companyId),
    pendingApprovals: store.pendingApprovals(companyId),
    organizationUnits: store.organizationUnits(companyId),
    strategyItems: store.strategyItems(companyId),
    tasks: store.tasks(companyId),
    messages: primaryRoom ? store.messages(companyId, primaryRoom.id) : [],
    rooms,
    threads: primaryRoom ? store.conversations.threads.list(companyId, primaryRoom.id) : [],
    hiringProposals: store.employment.proposalList(companyId),
    approvals: store.approvalsRepository.list(companyId),
    meetings: store.meetings.list(companyId),
    performanceRecords: store.performance.listPerformance(companyId),
    incidents: store.incidents.listIncidents(companyId),
    correctiveActions: store.incidents.listCorrective(companyId),
    claims: store.performance.listClaims(companyId),
    attempts: store.attempts.list(companyId),
    artifacts: store.artifacts.listCompany(companyId),
    events: store.events(companyId, 200),
    tools: store.tools.list(companyId),
    environments: store.environments.list(companyId),
    models: store.models.list(companyId),
    agentProfiles: store.agentProfiles.list(companyId),
    mcpServers: store.mcpServers.list(companyId),
    projectIntegrations: store.projectIntegrations.list(companyId),
    mail: store.mail.listCompany(companyId),
    automations: store.automations.list(companyId),
    runtime: store.autonomy.get(companyId),
    companies: store.companies(),
  };
}

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
  const [helpVisible, setHelpVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "Ready — no agent work starts without an approved task",
  );
  const [company, setCompany] = useState(initialCompany);
  const [activeForm, setActiveForm] = useState<CreateFormKind | null>(null);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [executionTaskId, setExecutionTaskId] = useState<string | null>(null);

  const width = stdout.columns;
  const height = stdout.rows;
  const compact = width < 88;
  const selectedSection = NAVIGATION_SECTIONS[selectedIndex] ?? NAVIGATION_SECTIONS[0];
  const data = loadWorkspaceData(store, company.id);

  useInput((input, key) => {
    if (emergencyVisible) return;
    if (executionTaskId) return;
    if (activeForm) return;
    if (helpVisible) {
      if (input === "?" || key.escape) setHelpVisible(false);
      return;
    }

    if (paletteVisible) {
      handlePaletteInput(input, key);
      return;
    }

    if (input === "q") process.exit(0);
    if (input === "n") setActiveForm(createFormForSection(selectedSection));
    if (input === "e") setActiveForm(editFormForSection(selectedSection));
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
    else if (key.upArrow || input === "k") moveSelection(-1);
    else if (key.downArrow || input === "j") moveSelection(1);
    else if (key.return) setStatusMessage(`Opened ${selectedSection}`);
  });

  function moveSelection(offset: number): void {
    setSelectedIndex((current) => moveNavigation(current, offset));
  }

  function handlePaletteInput(input: string, key: PaletteKey): void {
    processPaletteInput(input, key, searchQuery, {
      close: closePalette,
      select: setSelectedIndex,
      status: setStatusMessage,
      query: setSearchQuery,
    });
  }

  function closePalette(): void {
    setPaletteVisible(false);
    setSearchQuery("");
  }

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
        onCompanySelect={setCompany}
      />

      <StatusBar message={statusMessage} />
      <WorkforceOverlays
        paletteVisible={paletteVisible}
        helpVisible={helpVisible}
        emergencyVisible={emergencyVisible}
        executionTask={data.tasks.find(({ id }) => id === executionTaskId) ?? null}
        activeForm={activeForm}
        query={searchQuery}
        compact={compact}
        terminalWidth={width}
        section={selectedSection}
        company={company}
        store={store}
        onCompanyChange={setCompany}
        onCloseForm={() => {
          setActiveForm(null);
        }}
        onCloseEmergency={() => {
          setEmergencyVisible(false);
        }}
        onStatus={setStatusMessage}
        onEmergencyStop={onEmergencyStop}
        onCancelExecution={() => {
          setExecutionTaskId(null);
        }}
        onConfirmExecution={() => {
          const taskId = executionTaskId;
          setExecutionTaskId(null);
          if (!taskId) return;
          setStatusMessage("Validating and queueing agent execution…");
          void onStartTask(company.id, taskId)
            .then(() => {
              setStatusMessage("Agent attempt queued through Docker supervisor");
            })
            .catch((error: unknown) => {
              setStatusMessage(error instanceof Error ? error.message : "Task execution failed");
            });
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

interface PaletteKey {
  escape: boolean;
  return: boolean;
  backspace: boolean;
  delete: boolean;
  ctrl: boolean;
  meta: boolean;
}

function processPaletteInput(
  input: string,
  key: PaletteKey,
  searchQuery: string,
  actions: {
    close: () => void;
    select: (index: number) => void;
    status: (message: string) => void;
    query: Dispatch<SetStateAction<string>>;
  },
): void {
  if (key.escape) {
    actions.close();
    return;
  }
  if (key.return) {
    const match = NAVIGATION_SECTIONS.findIndex((section) =>
      section.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    if (match >= 0) {
      actions.select(match);
      actions.status(`Opened ${NAVIGATION_SECTIONS[match]}`);
    }
    actions.close();
  } else if (key.backspace || key.delete) {
    actions.query((current) => current.slice(0, -1));
  } else if (input && !key.ctrl && !key.meta) {
    actions.query((current) => sanitizeTerminal(current + input, 60));
  }
}

function WorkforceContent(props: {
  selectedIndex: number;
  section: string;
  store: StateStore;
  company: CompanyRecord;
  docker: DockerStatus;
  compact: boolean;
  height: number;
  data: ReturnType<typeof loadWorkspaceData>;
  onCompanySelect: (company: CompanyRecord) => void;
}) {
  return (
    <Box flexGrow={1} flexDirection="row">
      <Sidebar compact={props.compact} height={props.height} selectedIndex={props.selectedIndex} />
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
          onCompanySelect={props.onCompanySelect}
          {...props.data}
        />
      )}
    </Box>
  );
}

function moveNavigation(current: number, offset: number): number {
  return (current + offset + NAVIGATION_SECTIONS.length) % NAVIGATION_SECTIONS.length;
}
