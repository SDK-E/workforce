import { Box, Text } from "ink";
import type { OrganizationUnit } from "../../organizations/organization-types.js";

export function OrganizationView({ units }: { units: OrganizationUnit[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Organization</Text>
      {units.length === 0 ? (
        <Text dimColor>No departments, teams, offices, or rooms configured.</Text>
      ) : (
        units.map((unit) => (
          <Text key={unit.id}>
            [{unit.kind}] {unit.name} · manager {unit.managerId ?? "unassigned"}
          </Text>
        ))
      )}
      <Text dimColor>Press n to create an organization unit.</Text>
    </Box>
  );
}
