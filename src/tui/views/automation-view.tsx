import { Box, Text } from "ink";
import type { AutomationRecord } from "../../automations/automation-types.js";

export function AutomationView({
  automations,
  selectedRow,
}: {
  automations: AutomationRecord[];
  selectedRow: number;
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Automations</Text>
      <Text dimColor>Agents propose repetitive deterministic work for governed activation.</Text>
      {automations.length === 0 ? (
        <Text dimColor>No automation proposals.</Text>
      ) : (
        automations.map((automation, index) => (
          <Text key={automation.id} inverse={index === selectedRow}>
            [{automation.status}] {automation.title} · requested by {automation.requestedBy} · saves{" "}
            {automation.estimatedRunsSaved} runs · next {automation.nextRunAt ?? "not scheduled"}
          </Text>
        ))
      )}
      <Text dimColor>n propose · e decide/configure · [] select · d archive · u restore</Text>
    </Box>
  );
}
