import { Box, Text } from "ink";
import type { CompanyRecord } from "../../storage/records.js";
import type { CompanyRuntime } from "../../autonomy/autonomy-types.js";
import { THEMES } from "../themes/index.js";
import { useWorkforceTheme } from "../themes/theme-context.js";
import { bindingsFor } from "../keybindings.js";

export function SettingsView({
  company,
  runtime,
}: {
  company: CompanyRecord;
  runtime: CompanyRuntime | undefined;
}) {
  const theme = useWorkforceTheme();
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
      <Text bold>Theme</Text>
      {THEMES.map((candidate) => (
        <Text key={candidate.id} inverse={candidate.id === theme.id}>
          {candidate.id === theme.id ? "●" : "○"} {candidate.name} ({candidate.id})
        </Text>
      ))}
      <Text dimColor>{bindingsFor("nextTheme")} select next available theme</Text>
      <Text dimColor>Company identity and policy changes are managed from Companies.</Text>
    </Box>
  );
}
