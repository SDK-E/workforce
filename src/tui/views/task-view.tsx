import { Box, Text } from "ink";
import type { TaskRecord } from "../../tasks/task-types.js";
import type { NameDirectory } from "../names.js";

export function TaskView({
  tasks,
  selectedRow = -1,
  names,
}: {
  tasks: TaskRecord[];
  selectedRow?: number;
  names: NameDirectory;
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Tasks</Text>
      {tasks.length === 0 ? (
        <Text dimColor>No tasks configured.</Text>
      ) : (
        tasks.map((task, index) => (
          <Text key={task.id} inverse={index === selectedRow}>
            [{task.status}] P{task.priority} · {task.objective} · {task.risk} risk ·{" "}
            {task.assigneeId ? `assigned to ${names.employee(task.assigneeId)}` : "awaiting ARM"}
            {task.dueAt ? ` · due ${task.dueAt}` : ""}
          </Text>
        ))
      )}
    </Box>
  );
}
