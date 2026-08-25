import { Box, Text } from "ink";
import { useWorkforceTheme } from "../themes/theme-context.js";
import { bindingsFor } from "../keybindings.js";

export function StatusBar({ message }: { message: string }) {
  const theme = useWorkforceTheme();
  return (
    <Box paddingX={1} justifyContent="space-between" backgroundColor={theme.colors.surface}>
      <Text>{message}</Text>
      <Text>
        {bindingsFor("previous")}/{bindingsFor("next")} Navigate · {bindingsFor("activate")} Open ·{" "}
        {bindingsFor("commandPalette")} Palette
      </Text>
    </Box>
  );
}
