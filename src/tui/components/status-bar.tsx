import { Box, Text } from "ink";
import { useWorkforceTheme } from "../themes/theme-context.js";
import { bindingsFor } from "../keybindings.js";

export function StatusBar({
  message,
  focus,
  sidebarVisible,
  section,
}: {
  message: string;
  focus: "sidebar" | "content";
  sidebarVisible: boolean;
  section: string;
}) {
  const theme = useWorkforceTheme();
  const guidance =
    focus === "sidebar"
      ? `${bindingsFor("previous")}/${bindingsFor("next")} choose page · ${bindingsFor("previousPanel")}/${bindingsFor("nextPanel")} change area · ${bindingsFor("activate")} use dashboard`
      : `${bindingsFor("previous")}/${bindingsFor("next")} choose item · ${sidebarVisible ? `${bindingsFor("focusNext")} return to sidebar` : `${bindingsFor("toggleSidebar")} show sidebar`} · ${bindingsFor("help")} help`;
  return (
    <Box paddingX={1} flexDirection="column" backgroundColor={theme.colors.surface}>
      <Text>{message}</Text>
      <Text bold>
        {focus === "sidebar" ? "NAVIGATION" : section.toUpperCase()}: {guidance}
      </Text>
    </Box>
  );
}
