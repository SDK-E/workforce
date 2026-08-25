import { Box, Text } from "ink";
import type {
  OrganizationUnit,
  OrganizationUnitKind,
} from "../../organizations/organization-types.js";

export function OrganizationView({
  units,
  kind,
  selectedRow,
}: {
  units: OrganizationUnit[];
  kind?: OrganizationUnitKind | OrganizationUnitKind[];
  selectedRow: number;
}) {
  const kinds = Array.isArray(kind) ? kind : kind ? [kind] : undefined;
  const visible = kinds ? units.filter((unit) => kinds.includes(unit.kind)) : units;
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Organization</Text>
      {visible.length === 0 ? (
        <Text dimColor>No departments, teams, offices, or rooms configured.</Text>
      ) : (
        visible.map((unit, index) => (
          <Text key={unit.id} inverse={index === selectedRow}>
            [{unit.kind}] {unit.name} · manager {unit.managerId ?? "unassigned"}
          </Text>
        ))
      )}
      <Text dimColor>n create · e edit · [] select · d archive · u restore</Text>
    </Box>
  );
}
