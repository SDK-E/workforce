import { Box, Text } from "ink";
import type { CompanyRecord } from "../../storage/records.js";
import { Panel } from "../components/panel.js";

export function CompanyView({
  company,
  companies,
  compact,
  selectedRow,
}: {
  company: CompanyRecord;
  companies: CompanyRecord[];
  compact: boolean;
  selectedRow: number;
}) {
  const inspected = companies[selectedRow] ?? company;
  const networkPolicy =
    typeof inspected.policies.network === "string" ? inspected.policies.network : "deny-by-default";
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Companies</Text>
      <Text dimColor>n create · e edit · [] select · Enter activate · d archive · u restore</Text>
      <Box marginTop={1} gap={1} flexDirection={compact ? "column" : "row"}>
        <Panel title="COMPANY LIST" width={compact ? "100%" : "36%"}>
          {companies.map((item, index) => (
            <Text key={item.id} inverse={index === selectedRow}>
              {item.id === company.id ? "●" : " "} [{item.status}] {item.displayName}
            </Text>
          ))}
        </Panel>
        <Panel title={inspected.displayName} width={compact ? "100%" : "64%"}>
          <Text>Operating name: {inspected.name}</Text>
          <Text>Mission: {inspected.mission || "Not configured"}</Text>
          <Text>Vision: {inspected.vision || "Not configured"}</Text>
          <Text>
            Values: {inspected.values.length ? inspected.values.join(" · ") : "Not configured"}
          </Text>
          <Text>Budget: {(inspected.budgetCents / 100).toFixed(2)}</Text>
          <Text>Network policy: {networkPolicy}</Text>
        </Panel>
      </Box>
    </Box>
  );
}
