import { Text } from "ink";
import { useWorkforceTheme } from "../themes/theme-context.js";

export function PromptMarker() {
  const theme = useWorkforceTheme();
  return <Text color={theme.colors.accent}>› </Text>;
}
