import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { CompanyRecord } from "../../storage/records.js";
import { Panel } from "../components/panel.js";

export function CompanyView({
  company,
  companies,
  compact,
  onSelect,
}: {
  company: CompanyRecord;
  companies: CompanyRecord[];
  compact: boolean;
  onSelect: (company: CompanyRecord) => void;
}) {
  const initial = Math.max(
    0,
    companies.findIndex(({ id }) => id === company.id),
  );
  const [selected, setSelected] = useState(initial);
  useEffect(() => {
    setSelected(
      Math.max(
        0,
        companies.findIndex(({ id }) => id === company.id),
      ),
    );
  }, [companies, company.id]);
  useInput((input, key) => {
    if (companies.length === 0) return;
    if (input === "[")
      setSelected((current) => (current + companies.length - 1) % companies.length);
    if (input === "]") setSelected((current) => (current + 1) % companies.length);
    if (key.return) {
      const selectedCompany = companies[selected];
      if (selectedCompany) onSelect(selectedCompany);
    }
  });
  const inspected = companies[selected] ?? company;
  const networkPolicy =
    typeof inspected.policies.network === "string" ? inspected.policies.network : "deny-by-default";
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Companies</Text>
      <Text dimColor>n create · e edit active · [/] inspect · Enter activate</Text>
      <Box marginTop={1} gap={1} flexDirection={compact ? "column" : "row"}>
        <Panel title="COMPANY LIST" width={compact ? "100%" : "36%"}>
          {companies.map((item, index) => (
            <Text key={item.id} inverse={index === selected}>
              {item.id === company.id ? "●" : " "} {item.displayName}
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
