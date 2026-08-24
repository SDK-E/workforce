import { Box, Text } from "ink";
import type { CompanyRecord } from "../../storage/records.js";
import { Panel } from "../components/panel.js";

export function CompanyView({ company }: { company: CompanyRecord }) {
  const networkPolicy =
    typeof company.policies.network === "string" ? company.policies.network : "deny-by-default";
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Company profile</Text>
      <Panel title={company.displayName} width="100%">
        <Text>Operating name: {company.name}</Text>
        <Text>Mission: {company.mission || "Not configured"}</Text>
        <Text>Vision: {company.vision || "Not configured"}</Text>
        <Text>
          Values: {company.values.length > 0 ? company.values.join(" · ") : "Not configured"}
        </Text>
        <Text>Budget: {(company.budgetCents / 100).toFixed(2)}</Text>
        <Text>Network policy: {networkPolicy}</Text>
      </Panel>
      <Text dimColor>Press n to edit through the company form.</Text>
    </Box>
  );
}
