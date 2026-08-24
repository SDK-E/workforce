import { Box, Text } from "ink";
import type {
  OrganizationUnit,
  OrganizationUnitKind,
} from "../../organizations/organization-types.js";

export function OrganizationView({
  units,
  kind,
}: {
  units: OrganizationUnit[];
  kind?: OrganizationUnitKind | OrganizationUnitKind[];
}) {
  const kinds = Array.isArray(kind) ? kind : kind ? [kind] : undefined;
  const visible = kinds ? units.filter((unit) => kinds.includes(unit.kind)) : units;
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Organization</Text>
      {visible.length === 0 ? (
        <Text dimColor>No departments, teams, offices, or rooms configured.</Text>
      ) : (
        visible.map((unit) => (
          <Text key={unit.id}>
            [{unit.kind}] {unit.name} · manager {unit.managerId ?? "unassigned"}
          </Text>
        ))
      )}
      <Text dimColor>Press n to create an organization unit.</Text>
    </Box>
  );
}
