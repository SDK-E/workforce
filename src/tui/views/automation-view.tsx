import { Box, Text } from "ink";
import type { AutomationRecord } from "../../automations/automation-types.js";

export function AutomationView({ automations }: { automations: AutomationRecord[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Automations</Text>
      <Text dimColor>Agents propose repetitive deterministic work for governed activation.</Text>
      {automations.length === 0 ? (
        <Text dimColor>No automation proposals.</Text>
      ) : (
        automations.map((automation) => (
          <Text key={automation.id}>
            [{automation.status}] {automation.title} · requested by {automation.requestedBy} · saves{" "}
            {automation.estimatedRunsSaved} runs
          </Text>
        ))
      )}
      <Text dimColor>n propose · e decide/configure · d disable · u restore</Text>
    </Box>
  );
}
