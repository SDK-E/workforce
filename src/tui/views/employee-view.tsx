import { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Employee } from "../../domain.js";
import type { AgentProfile } from "../../employees/agent-profile-types.js";
import { Panel } from "../components/panel.js";
import { truncate } from "../navigation.js";

export function EmployeeView({
  employees,
  profiles,
  compact,
}: {
  employees: Employee[];
  profiles: AgentProfile[];
  compact: boolean;
}) {
  const [selected, setSelected] = useState(0);
  useInput((input) => {
    if (employees.length === 0) return;
    if (input === "[")
      setSelected((current) => (current + employees.length - 1) % employees.length);
    if (input === "]") setSelected((current) => (current + 1) % employees.length);
  });
  const employee = employees[selected];
  const profile = profiles.find((item) => item.employeeId === employee?.id);
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Employee directory</Text>
      <Text dimColor>{employees.length} durable identities · [/] select employee</Text>
      <Box marginTop={1} gap={1} flexDirection={compact ? "column" : "row"}>
        <Panel title="DIRECTORY" width={compact ? "100%" : "40%"}>
          {employees.slice(0, 10).map((item, index) => (
            <Text key={item.id} inverse={index === selected}>
              {index === selected ? "›" : " "} [{item.status}] {truncate(item.name, 26)}
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
