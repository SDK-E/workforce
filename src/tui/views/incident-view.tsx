import { Box, Text } from "ink";
import type {
  CorrectiveActionRecord,
  IncidentRecord,
} from "../../governance/incident-repository.js";

export function IncidentView({
  incidents,
  actions,
  selectedRow,
}: {
  incidents: IncidentRecord[];
  actions: CorrectiveActionRecord[];
  selectedRow: number;
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Warnings and incidents</Text>
      <Text dimColor>
        {incidents.length} incidents · {actions.length} corrective actions
      </Text>
      {incidents.map((incident, index) => (
        <Text key={incident.id} inverse={index === selectedRow}>
          [{incident.status}] {incident.severity}: {incident.title}
        </Text>
      ))}
      {actions.map((action, index) => (
        <Text key={action.id} inverse={incidents.length + index === selectedRow}>
          [{action.status}] {action.kind} for {action.employeeId}
        </Text>
      ))}
    </Box>
  );
}
