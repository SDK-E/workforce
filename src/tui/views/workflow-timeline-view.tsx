import { Box, Text } from "ink";
import type { AttemptEventRecord, AttemptRecord } from "../../supervision/attempt-types.js";
import { truncate } from "../navigation.js";
import { useWorkforceTheme } from "../themes/theme-context.js";

export function WorkflowTimelineView(props: {
  attempts: AttemptRecord[];
  events: AttemptEventRecord[];
  compact: boolean;
}) {
  const theme = useWorkforceTheme();
  const latest = props.events.slice(-30).reverse();
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Agent workflow timeline</Text>
      <Text dimColor>
        {props.attempts.length} durable attempts · {props.events.length} recent workflow events
      </Text>
      {props.attempts.slice(0, props.compact ? 4 : 8).map((attempt) => (
        <Text key={attempt.id} color={statusColor(attempt.status, theme.colors)}>
          {statusMarker(attempt.status)} {attempt.employeeId} · {truncate(attempt.taskId, 24)} ·{" "}
          {attempt.status}
        </Text>
      ))}
      <Text bold>Recent progression</Text>
      {latest.length === 0 ? (
        <Text dimColor>○ No workflow transitions have been recorded.</Text>
      ) : (
        latest.map((event, index) => (
          <Box key={event.sequence} flexDirection="column">
            <Text color={theme.colors.accent}>
              {index === latest.length - 1 ? "└─" : "├─"} {time(event.at)} · {event.employeeId} ·{" "}
              {event.kind}
            </Text>
            {!props.compact && (
              <Text dimColor>
                │ task {truncate(event.taskId, 30)} · attempt {event.attemptId.slice(0, 8)} ·{" "}
                {eventSummary(event.data)}
              </Text>
            )}
          </Box>
        ))
      )}
    </Box>
  );
}

function statusMarker(status: AttemptRecord["status"]): string {
  if (["running", "starting"].includes(status)) return "●";
  if (status === "queued") return "◷";
  if (status === "succeeded") return "✓";
  return "×";
}

function statusColor(
  status: AttemptRecord["status"],
  colors: ReturnType<typeof useWorkforceTheme>["colors"],
) {
  if (["running", "starting"].includes(status)) return colors.accent;
  if (status === "succeeded") return colors.success;
  if (["failed", "timed-out", "infrastructure-blocked"].includes(status)) return colors.danger;
  return colors.text;
}

function time(value: string): string {
  return new Date(value).toISOString().slice(11, 19);
}

function eventSummary(data: Record<string, unknown>): string {
  const summary = Object.entries(data)
    .slice(0, 3)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" · ");
  return truncate(summary || "state recorded", 80);
}
