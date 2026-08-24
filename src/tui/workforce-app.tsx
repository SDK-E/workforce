import { useState } from "react";
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
import { CommandPalette } from "./overlays/command-palette.js";
import { HelpOverlay } from "./overlays/help-overlay.js";
import {
  CreateOverlay,
  createFormForSection,
  type CreateFormKind,
} from "./overlays/create-overlay.js";
import { ExecutiveOverview } from "./views/executive-overview.js";
import { WorkspaceView } from "./views/workspace-view.js";

interface WorkforceAppProps {
  store: StateStore;
  docker: DockerStatus;
  initialCompany: CompanyRecord;
}

function loadWorkspaceData(store: StateStore, companyId: string) {
  return {
    employees: store.employees(companyId),
    pendingApprovals: store.pendingApprovals(companyId),
    organizationUnits: store.organizationUnits(companyId),
    strategyItems: store.strategyItems(companyId),
    tasks: store.tasks(companyId),
    messages: store.messages(companyId, "ceo-office"),
    rooms: store.conversations.roomList(companyId),
    threads: store.conversations.threads.list(companyId, "ceo-office"),
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
  };
}

export function WorkforceApp({ store, docker, initialCompany }: WorkforceAppProps) {
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

  const width = stdout.columns;
  const height = stdout.rows;
  const compact = width < 88;
  const selectedSection = NAVIGATION_SECTIONS[selectedIndex] ?? NAVIGATION_SECTIONS[0];
  const data = loadWorkspaceData(store, company.id);

  useInput((input, key) => {
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
    if (input === "n") openCreateForm();
    if (input === "?") setHelpVisible(true);
    else if (input === "p" || input === "/") setPaletteVisible(true);
    else if (key.upArrow || input === "k") moveSelection(-1);
    else if (key.downArrow || input === "j") moveSelection(1);
    else if (key.return) setStatusMessage(`Opened ${selectedSection}`);
  });

  function moveSelection(offset: number): void {
    setSelectedIndex(
      (current) => (current + offset + NAVIGATION_SECTIONS.length) % NAVIGATION_SECTIONS.length,
    );
  }

  function openCreateForm(): void {
    setActiveForm(createFormForSection(selectedSection));
  }

  function handlePaletteInput(
    input: string,
    key: {
      escape: boolean;
      return: boolean;
      backspace: boolean;
      delete: boolean;
      ctrl: boolean;
      meta: boolean;
    },
  ): void {
    if (key.escape) {
      closePalette();
      return;
    }

    if (key.return) {
      const match = NAVIGATION_SECTIONS.findIndex((section) =>
        section.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      if (match >= 0) {
        setSelectedIndex(match);
        setStatusMessage(`Opened ${NAVIGATION_SECTIONS[match]}`);
      }
      closePalette();
      return;
    }

    if (key.backspace || key.delete) {
      setSearchQuery((current) => current.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setSearchQuery((current) => sanitizeTerminal(current + input, 60));
    }
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

      <Box flexGrow={1} flexDirection="row">
        <Sidebar compact={compact} height={height} selectedIndex={selectedIndex} />
        {selectedIndex === 0 ? (
          <ExecutiveOverview
            company={company}
            docker={docker}
            compact={compact}
            activeEmployees={data.employees.filter(({ status }) => status === "active").length}
            pendingApprovals={data.pendingApprovals}
            eventCount={store.eventCount(company.id)}
            auditVerified={store.verifyAuditChain()}
            strategyItems={data.strategyItems}
          />
        ) : (
          <WorkspaceView
            section={selectedSection}
            company={company}
            auditVerified={store.verifyAuditChain()}
            docker={docker}
            compact={compact}
            {...data}
          />
        )}
      </Box>

      <StatusBar message={statusMessage} />
      {paletteVisible && <CommandPalette query={searchQuery} terminalWidth={width} />}
      {helpVisible && <HelpOverlay compact={compact} terminalWidth={width} />}
      {activeForm && (
        <CreateOverlay
          kind={activeForm}
          section={selectedSection}
          company={company}
          store={store}
          terminalWidth={width}
          onCompanyChange={setCompany}
          onClose={() => {
            setActiveForm(null);
          }}
          onStatus={setStatusMessage}
        />
      )}
    </Box>
  );
}
