import { Box, Text } from "ink";
import type { TaskRecord } from "../../tasks/task-types.js";

export function TaskView({ tasks }: { tasks: TaskRecord[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Tasks</Text>
      {tasks.length === 0 ? (
        <Text dimColor>No tasks configured.</Text>
      ) : (
        tasks.map((task) => (
          <Text key={task.id}>
            [{task.status}] P{task.priority} · {task.objective} · {task.risk} risk ·{" "}
            {task.assigneeId ?? "unassigned"}
            {task.dueAt ? ` · due ${task.dueAt}` : ""}
          </Text>
        ))
      )}
      <Text dimColor>
        n create · e edit · r run first ready/assigned task (confirmation required)
      </Text>
    </Box>
  );
}
