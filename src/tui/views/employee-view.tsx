import { Box, Text } from "ink";
import type { Employee } from "../../domain.js";
import { truncate } from "../navigation.js";

export function EmployeeView({ employees }: { employees: Employee[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Employee directory</Text>
      <Text dimColor>{employees.length} durable employment records</Text>
      {employees.map((employee) => (
        <Box key={employee.id} flexDirection="column" marginTop={1}>
          <Text>
            [{employee.status}] {employee.name} · {employee.title}
          </Text>
          <Text dimColor>
            {employee.department} · manager {employee.manager ?? "board"} ·{" "}
            {truncate(employee.capabilityTags.join(", ") || "no capability tags", 70)}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
