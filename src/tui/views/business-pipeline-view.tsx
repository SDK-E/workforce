import { Box, Text } from "ink";
import type {
  ClientRecord,
  EngagementRecord,
  LeadRecord,
  OpportunityRecord,
} from "../../business/business-types.js";

export function BusinessPipelineView(props: {
  section: "Opportunities" | "Leads" | "Clients" | "Engagements";
  opportunities: OpportunityRecord[];
  leads: LeadRecord[];
  clients: ClientRecord[];
  engagements: EngagementRecord[];
  selectedRow: number;
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{props.section}</Text>
      <Text dimColor>n create · e edit · ↑/↓ select · d archive · u restore</Text>
      {rows(props).map((row, index) => (
        <Text key={row.id} inverse={index === props.selectedRow} dimColor={row.archived}>
          {row.label}
        </Text>
      ))}
      {rows(props).length === 0 && <Text dimColor>No {props.section.toLowerCase()} recorded.</Text>}
    </Box>
  );
}

function rows(props: Parameters<typeof BusinessPipelineView>[0]): {
  id: string;
  label: string;
  archived: boolean;
}[] {
  if (props.section === "Opportunities")
    return props.opportunities.map((item) => ({
      id: item.id,
      label: `[${item.stage}] ${item.name} · score ${item.score} · ${item.source}`,
      archived: item.stage === "archived",
    }));
  if (props.section === "Leads")
    return props.leads.map((item) => ({
      id: item.id,
      label: `[${item.status}] ${item.name} · ${item.organization} · score ${item.qualificationScore}`,
      archived: item.status === "archived",
    }));
  if (props.section === "Clients")
    return props.clients.map((item) => ({
      id: item.id,
      label: `[${item.status}] ${item.name} · contact ${item.primaryContact}`,
      archived: item.status === "archived",
    }));
  return props.engagements.map((item) => ({
    id: item.id,
    label: `[${item.status}] ${item.name} · client ${item.clientId} · ${item.successCriteria.length} success criteria`,
    archived: item.status === "archived",
  }));
}
