import { Box, Text } from "ink";
import type { CompanyRecord } from "../../storage/records.js";
import type { CompanyRuntime } from "../../autonomy/autonomy-types.js";

export function SettingsView({
  company,
  runtime,
}: {
  company: CompanyRecord;
  runtime: CompanyRuntime | undefined;
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Company settings</Text>
      <Text>Policies: {JSON.stringify(company.policies)}</Text>
      <Text>
        Autonomy: {runtime?.enabled ? "enabled" : "stopped"} · cadence{" "}
        {runtime?.cadenceSeconds ?? "not configured"}s
      </Text>
      <Text>Consequential mutations: confirmation and audit required</Text>
      <Text>Secret access: company, employee, and task scoped</Text>
      <Text>Budget: {(company.budgetCents / 100).toFixed(2)}</Text>
      <Text dimColor>Company identity and policy changes are managed from Companies.</Text>
    </Box>
  );
}
