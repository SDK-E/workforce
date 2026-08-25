import { Box, Text } from "ink";
import type { CompanyRuntime, OperatingCycle } from "../../autonomy/autonomy-types.js";
import type { MessageRecord, RoomRecord } from "../../conversations/conversation-types.js";
import { Panel } from "../components/panel.js";
import { truncate } from "../navigation.js";

export function CeoOfficeView(props: {
  runtime: CompanyRuntime | undefined;
  cycle: OperatingCycle | undefined;
  rooms: RoomRecord[];
  messages: MessageRecord[];
}) {
  const decision = props.cycle?.decision;
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>CEO office</Text>
      <Text dimColor>
        The CEO operates continuously; this page shows its latest durable decision.
      </Text>
      <Box marginTop={1} gap={1} flexWrap="wrap">
        <Panel title="AUTONOMY" width={34}>
          <Text>{props.runtime?.enabled ? "● enabled" : "○ stopped"}</Text>
          <Text>State: {props.runtime?.state ?? "not configured"}</Text>
          <Text>Cadence: {props.runtime?.cadenceSeconds ?? "—"} seconds</Text>
        </Panel>
        <Panel title="LATEST OPERATING CYCLE" width={60}>
          <Text>Status: {props.cycle?.status ?? "No cycle recorded"}</Text>
          <Text>Action: {text(decision?.action, "No decision yet")}</Text>
          <Text>
            Reason: {truncate(text(decision?.rationale, props.cycle?.failureReason ?? "—"), 78)}
          </Text>
          <Text>Task: {props.cycle?.spawnedTaskId ?? "none"}</Text>
        </Panel>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Leadership communication</Text>
        <Text>
          {props.rooms.length} joined rooms · {props.messages.length} visible messages
        </Text>
        <Text dimColor>Open Conversations or Mail to communicate with the CEO and company.</Text>
      </Box>
    </Box>
  );
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}
