import { Box, Text } from "ink";
import type { Employee } from "../../domain.js";
import type { AgentProfile } from "../../employees/agent-profile-types.js";
import { Panel } from "../components/panel.js";
import { truncate } from "../navigation.js";

export function EmployeeView({
  employees,
  profiles,
  compact,
  selectedRow,
}: {
  employees: Employee[];
  profiles: AgentProfile[];
  compact: boolean;
  selectedRow: number;
}) {
  const employee = employees[selectedRow];
  const profile = profiles.find((item) => item.employeeId === employee?.id);
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Employee directory</Text>
      <Text dimColor>
        {employees.length} durable identities · n hire · e persona · [] select · d terminate · u
        reinstate
      </Text>
      <Box marginTop={1} gap={1} flexDirection={compact ? "column" : "row"}>
        <Panel title="DIRECTORY" width={compact ? "100%" : "40%"}>
          {employees.slice(0, 10).map((item, index) => (
            <Text key={item.id} inverse={index === selectedRow}>
              {index === selectedRow ? "›" : " "} [{item.status}] {truncate(item.name, 26)}
            </Text>
          ))}
        </Panel>
        <Panel title="IDENTITY & ACTIVE PERSONA" width={compact ? "100%" : "60%"}>
          {employee ? (
            <>
              <Text>
                {employee.name} · {employee.title}
              </Text>
              <Text>
                Identity: {employee.id} · manager {employee.manager ?? "board"}
              </Text>
              <Text>Department: {employee.department}</Text>
              <Text>Persona: {profile?.personaName ?? "not configured"}</Text>
              <Text>Instruction revision: {profile?.activeRevision ?? "none"}</Text>
              <Text>Style: {profile?.communicationStyle ?? "not configured"}</Text>
              <Text dimColor>{truncate(profile?.identitySummary ?? "", 80)}</Text>
            </>
          ) : (
            <Text>No employee selected.</Text>
          )}
        </Panel>
      </Box>
    </Box>
  );
}
