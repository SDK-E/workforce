import { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { DockerStatus } from "../../docker-runtime.js";
import type { CompanyRecord } from "../../storage/records.js";
import type { StrategyItem } from "../../strategy/strategy-types.js";
import { DEFAULT_AGENT_CONCURRENCY } from "../../supervision/capacity-controller.js";
import { Panel } from "../components/panel.js";
import { truncate } from "../navigation.js";
import { SectionTabs } from "../components/section-tabs.js";
import { matchesKeybinding } from "../keybindings.js";
import type { OnboardingStep } from "../onboarding-steps.js";
import { onboardingComplete } from "../onboarding-steps.js";
import { useWorkforceTheme } from "../themes/theme-context.js";

interface ExecutiveOverviewProps {
  company: CompanyRecord;
  docker: DockerStatus;
  compact: boolean;
  activeEmployees: number;
  activeAttempts: number;
  queuedAttempts: number;
  pendingApprovals: number;
  acceptedDeliverables: number;
  eventCount: number;
  auditVerified: boolean;
  strategyItems: StrategyItem[];
  onboarding: OnboardingStep[];
  active: boolean;
}

export function ExecutiveOverview(props: ExecutiveOverviewProps) {
  const theme = useWorkforceTheme();
  const tabs = ["Priorities", "System & risk", "Decisions"];
  const [selectedTab, setSelectedTab] = useState(0);
  useInput(
    (input, key) => {
      if (matchesKeybinding("previousPanel", input, key))
        setSelectedTab((current) => (current + tabs.length - 1) % tabs.length);
      if (matchesKeybinding("nextPanel", input, key))
        setSelectedTab((current) => (current + 1) % tabs.length);
    },
    { isActive: props.active },
  );
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Executive overview</Text>
      <Text dimColor>
        {props.company.mission || "Define a mission in Companies to focus the workforce."}
      </Text>

      <Box marginTop={1} gap={1} flexWrap="wrap">
        <Panel title="WORKFORCE" width={props.compact ? 24 : 28}>
          <Text color={theme.colors.success}>● {props.activeEmployees} registered identities</Text>
          <Text>
            {props.activeAttempts} active Docker attempts · {props.queuedAttempts} queued
          </Text>
          <Text dimColor>Identities persist; containers run only during attempts.</Text>
        </Panel>
        <Panel title="EXECUTION" width={props.compact ? 24 : 30}>
          <Text color={props.docker.available ? theme.colors.success : theme.colors.warning}>
            {props.docker.available ? "● Docker available" : "! Docker unavailable"}
          </Text>
          <Text>Host execution disabled</Text>
        </Panel>
        <Panel title="DECISIONS" width={props.compact ? 24 : 28}>
          <Text>{props.pendingApprovals} pending approvals</Text>
          <Text>{props.acceptedDeliverables} validated deliverables</Text>
        </Panel>
      </Box>

      {!onboardingComplete(props.onboarding) && (
        <Box marginTop={1} flexDirection="column">
          <Panel title="GETTING STARTED" width="100%">
            {props.onboarding.map((step) => (
              <Text key={step.label} {...(step.done ? { color: theme.colors.success } : {})}>
                [{step.done ? "✓" : " "}] {step.label}
                {step.done ? "" : ` — ${step.hint}`}
              </Text>
            ))}
          </Panel>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <SectionTabs labels={tabs} selected={selectedTab} />
      </Box>
      <Box marginTop={1} flexGrow={1}>
        {selectedTab === 0 && (
          <Panel title="PRIORITIES & PROGRESS" width="100%">
            {props.strategyItems.length === 0 ? (
              <>
                <Text dimColor>No active objectives or projects.</Text>
                <Text>Use Companies and Projects to begin.</Text>
              </>
            ) : (
              props.strategyItems.slice(0, 6).map((item) => (
                <Text key={item.id}>
                  [{item.status}] {item.kind}: {truncate(item.name, 36)}
                </Text>
              ))
            )}
          </Panel>
        )}
        {selectedTab === 1 && (
          <Panel title="SYSTEM & RISK" width="100%">
            <Text>
              {props.docker.available ? "No execution alerts" : "Docker sleeping or unavailable"}
            </Text>
            <Text>Audit chain: {props.auditVerified ? "verified" : "FAILED"}</Text>
            <Text>Raw events: {props.eventCount}</Text>
            <Text>
              Agent concurrency: up to {DEFAULT_AGENT_CONCURRENCY} containers, reduced under memory
              pressure
            </Text>
            <Text>Network: deny by default</Text>
          </Panel>
        )}
        {selectedTab === 2 && (
          <Panel title="DECISIONS & DELIVERABLES" width="100%">
            <Text>{props.pendingApprovals} decisions require review</Text>
            <Text>Open Approvals to inspect rationale and evidence.</Text>
            <Text dimColor>Accepted deliverables appear only after deterministic validation.</Text>
          </Panel>
        )}
      </Box>
    </Box>
  );
}
