import { useMemo, useState } from "react";
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
import { CompanyForm } from "./overlays/company-form.js";
import { ExecutiveOverview } from "./views/executive-overview.js";
import { WorkspaceView } from "./views/workspace-view.js";

interface WorkforceAppProps {
  store: StateStore;
  docker: DockerStatus;
  initialCompany: CompanyRecord;
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
  const [companyFormVisible, setCompanyFormVisible] = useState(false);

  const width = stdout.columns;
  const height = stdout.rows;
  const compact = width < 88;
  const selectedSection = NAVIGATION_SECTIONS[selectedIndex] ?? NAVIGATION_SECTIONS[0];
  const employees = useMemo(() => store.employees(company.id), [store, company.id]);
  const pendingApprovals = store.pendingApprovals(company.id);
  const organizationUnits = store.organizationUnits(company.id);
  const strategyItems = store.strategyItems(company.id);
  const tasks = store.tasks(company.id);
  const messages = store.messages(company.id, "ceo-office");

  useInput((input, key) => {
    if (companyFormVisible) return;
    if (helpVisible) {
      if (input === "?" || key.escape) setHelpVisible(false);
      return;
    }

    if (paletteVisible) {
      handlePaletteInput(input, key);
      return;
    }

    if (input === "q") process.exit(0);
    if (input === "n" && selectedSection === "Companies") setCompanyFormVisible(true);
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
        pendingApprovals={pendingApprovals}
      />
      <Breadcrumbs section={selectedSection} />

      <Box flexGrow={1} flexDirection="row">
        <Sidebar compact={compact} height={height} selectedIndex={selectedIndex} />
        {selectedIndex === 0 ? (
          <ExecutiveOverview
            company={company}
            docker={docker}
            compact={compact}
            activeEmployees={employees.filter(({ status }) => status === "active").length}
            pendingApprovals={pendingApprovals}
            eventCount={store.eventCount(company.id)}
            auditVerified={store.verifyAuditChain()}
            strategyItems={strategyItems}
          />
        ) : (
          <WorkspaceView
            section={selectedSection}
            company={company}
            organizationUnits={organizationUnits}
            strategyItems={strategyItems}
            tasks={tasks}
            messages={messages}
          />
        )}
      </Box>

      <StatusBar message={statusMessage} />
      {paletteVisible && <CommandPalette query={searchQuery} terminalWidth={width} />}
      {helpVisible && <HelpOverlay compact={compact} terminalWidth={width} />}
      {companyFormVisible && (
        <CompanyForm
          company={company}
          terminalWidth={width}
          onCancel={() => {
            setCompanyFormVisible(false);
          }}
          onSubmit={(input) => {
            setCompany(store.updateCompany(input));
            setCompanyFormVisible(false);
            setStatusMessage("Company configuration saved and audited");
          }}
        />
      )}
    </Box>
  );
}
