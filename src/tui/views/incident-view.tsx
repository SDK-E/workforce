import { Box, Text } from "ink";
import type {
  CorrectiveActionRecord,
  IncidentRecord,
} from "../../governance/incident-repository.js";

export function IncidentView({
  incidents,
  actions,
}: {
  incidents: IncidentRecord[];
  actions: CorrectiveActionRecord[];
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Warnings and incidents</Text>
      <Text dimColor>
        {incidents.length} incidents · {actions.length} corrective actions
      </Text>
      {incidents.map((incident) => (
        <Text key={incident.id}>
          [{incident.status}] {incident.severity}: {incident.title}
        </Text>
      ))}
      {actions.map((action) => (
        <Text key={action.id}>
          [{action.status}] {action.kind} for {action.employeeId}
        </Text>
      ))}
      <Text dimColor>n report an evidence-backed incident</Text>
    </Box>
  );
}
