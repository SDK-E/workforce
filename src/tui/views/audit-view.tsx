import { Box, Text } from "ink";
import type { WorkforceEvent } from "../../domain.js";

export function AuditView({ events, verified }: { events: WorkforceEvent[]; verified: boolean }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Audit ledger</Text>
      <Text color={verified ? "green" : "red"}>
        Hash chain {verified ? "verified" : "FAILED"} · {events.length} recent events
      </Text>
      {events
        .slice(-20)
        .reverse()
        .map((event) => (
          <Text key={event.id}>
            {event.at.slice(0, 19)} · {event.type} · {event.actor}
          </Text>
        ))}
    </Box>
  );
}

export function DiagnosticsView({ events }: { events: WorkforceEvent[] }) {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Advanced diagnostics</Text>
      {[...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 20)
        .map(([kind, count]) => (
          <Text key={kind}>
            {kind} · {count}
          </Text>
        ))}
    </Box>
  );
}
