import React from "react";
import { Box, Text } from "ink";
import type { DockerStatus } from "../../docker-runtime.js";
import type { CompanyRecord, EntityRecord } from "../../storage/records.js";
import { Panel } from "../components/panel.js";
import { truncate } from "../navigation.js";

interface ExecutiveOverviewProps {
  company: CompanyRecord;
  docker: DockerStatus;
  compact: boolean;
  activeEmployees: number;
  pendingApprovals: number;
  eventCount: number;
  auditVerified: boolean;
  entities: EntityRecord[];
}

export function ExecutiveOverview(props: ExecutiveOverviewProps) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Executive overview</Text>
      <Text dimColor>
        {props.company.mission || "Define a mission in Companies to focus the workforce."}
      </Text>

      <Box marginTop={1} gap={1} flexWrap="wrap">
        <Panel title="WORKFORCE" width={props.compact ? 24 : 28}>
          <Text color="green">● {props.activeEmployees} durable identities healthy</Text>
          <Text>0 working · 0 blocked · 0 stale</Text>
        </Panel>
        <Panel title="EXECUTION" width={props.compact ? 24 : 30}>
          <Text color={props.docker.available ? "green" : "yellow"}>
            {props.docker.available ? "● Docker available" : "! Docker unavailable"}
          </Text>
          <Text>Host execution disabled</Text>
        </Panel>
        <Panel title="DECISIONS" width={props.compact ? 24 : 28}>
          <Text>{props.pendingApprovals} pending approvals</Text>
          <Text>0 deliverables ready</Text>
        </Panel>
      </Box>

      <Box marginTop={1} flexGrow={1} gap={1}>
        <Panel title="PRIORITIES & PROGRESS" width="58%">
          {props.entities.length === 0 ? (
            <>
              <Text dimColor>No active objectives or projects.</Text>
              <Text>Use Companies and Projects to begin.</Text>
            </>
          ) : (
            props.entities.slice(0, 6).map((entity) => (
              <Text key={entity.id}>
                [{entity.status}] {entity.kind}: {truncate(entity.name, 36)}
              </Text>
            ))
          )}
        </Panel>

        {!props.compact && (
          <Panel title="SYSTEM & RISK" width="42%">
            <Text>
              {props.docker.available ? "No execution alerts" : "Docker sleeping or unavailable"}
            </Text>
            <Text>Audit chain: {props.auditVerified ? "verified" : "FAILED"}</Text>
            <Text>Raw events: {props.eventCount}</Text>
            <Text>Memory policy: 2 containers default</Text>
            <Text>Network: deny by default</Text>
          </Panel>
        )}
      </Box>
    </Box>
  );
}
