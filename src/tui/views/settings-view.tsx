import { Box, Text } from "ink";
import type { CompanyRecord } from "../../storage/records.js";

export function SettingsView({ company }: { company: CompanyRecord }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Company settings</Text>
      <Text>Network default: deny</Text>
      <Text>Consequential mutations: confirmation and audit required</Text>
      <Text>Secret access: company, employee, and task scoped</Text>
      <Text>Budget: {(company.budgetCents / 100).toFixed(2)}</Text>
      <Text dimColor>Company identity and policy changes are managed from Companies.</Text>
    </Box>
  );
}
