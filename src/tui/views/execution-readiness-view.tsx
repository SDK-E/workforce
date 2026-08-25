import { Box, Text } from "ink";
import type { ExecutionReadiness } from "../../execution/execution-readiness.js";
import { Panel } from "../components/panel.js";
import { useWorkforceTheme } from "../themes/theme-context.js";

export function ExecutionReadinessView({ readiness }: { readiness: ExecutionReadiness }) {
  const theme = useWorkforceTheme();
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Execution readiness</Text>
      <Text color={readiness.ready ? theme.colors.success : theme.colors.danger}>
        {readiness.ready ? "READY" : "BLOCKED"} · {readiness.activeAttempts} active ·{" "}
        {readiness.queuedAttempts} queued
      </Text>
      <Box marginTop={1} flexDirection="column" gap={1}>
        {readiness.checks.map((item) => (
          <Panel key={item.id} title={item.label.toUpperCase()} width="100%">
            <Text color={statusColor(item.status, theme.colors)}>
              {statusIcon(item.status)} {item.status.toUpperCase()} · {item.detail}
            </Text>
          </Panel>
        ))}
      </Box>
      <Text dimColor>Resolve every BLOCKED check before an agent attempt can start.</Text>
    </Box>
  );
}

function statusIcon(status: "ready" | "warning" | "blocked"): string {
  return status === "ready" ? "●" : status === "warning" ? "▲" : "■";
}

function statusColor(
  status: "ready" | "warning" | "blocked",
  colors: ReturnType<typeof useWorkforceTheme>["colors"],
) {
  return status === "ready"
    ? colors.success
    : status === "warning"
      ? colors.warning
      : colors.danger;
}
