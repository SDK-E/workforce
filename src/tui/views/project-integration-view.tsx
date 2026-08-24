import { Box, Text } from "ink";
import type { ProjectIntegrationRecord } from "../../integrations/integration-types.js";

export function ProjectIntegrationView({
  integrations,
}: {
  integrations: ProjectIntegrationRecord[];
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Project integrations</Text>
      <Text dimColor>Beads and other providers are granted only to tasks in their project.</Text>
      {integrations.length === 0 ? (
        <Text dimColor>No project integrations configured.</Text>
      ) : (
        integrations.map((integration) => (
          <Text key={`${integration.projectId}:${integration.provider}`}>
            [{integration.status}] {integration.provider} · project {integration.projectId}
          </Text>
        ))
      )}
      <Text dimColor>n configure · e edit · d archive · u restore</Text>
    </Box>
  );
}
