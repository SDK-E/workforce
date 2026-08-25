import { Box, Text } from "ink";
import { ModalBackdrop } from "../components/modal-backdrop.js";
import { useWorkforceTheme } from "../themes/theme-context.js";
import { bindingsFor } from "../keybindings.js";

interface HelpOverlayProps {
  compact: boolean;
  terminalWidth: number;
}

export function HelpOverlay({ compact, terminalWidth }: HelpOverlayProps) {
  const theme = useWorkforceTheme();
  return (
    <ModalBackdrop
      width={compact ? Math.max(40, terminalWidth - 8) : Math.floor(terminalWidth / 2)}
    >
      <Box
        width="100%"
        backgroundColor={theme.colors.canvas}
        borderStyle="double"
        borderColor={theme.colors.accent}
        flexDirection="column"
        paddingX={2}
      >
        <Text bold>Keyboard help</Text>
        <Text>{bindingsFor("focusNext")} Move focus between navigation and content</Text>
        <Text>
          {bindingsFor("areaNext")} / {bindingsFor("areaPrevious")} Change area
        </Text>
        <Text>
          {bindingsFor("previous")} / {bindingsFor("next")} or {bindingsFor("previousVim")} /{" "}
          {bindingsFor("nextVim")} Move in focused surface
        </Text>
        <Text>
          {bindingsFor("previousRecord")} / {bindingsFor("nextRecord")} Select record
        </Text>
        <Text>
          {bindingsFor("previousPanel")} / {bindingsFor("nextPanel")} Change panel
        </Text>
        <Text>{bindingsFor("commandPalette")} Command palette</Text>
        <Text>{bindingsFor("toggleSidebar")} Toggle sidebar</Text>
        <Text>{bindingsFor("openSettings")} Open settings</Text>
        <Text>
          {bindingsFor("create")} New · {bindingsFor("edit")} Edit
        </Text>
        <Text>{bindingsFor("emergencyStop")} Global emergency stop</Text>
        <Text>
          {bindingsFor("help")} Help · {bindingsFor("quit")} Quit safely
        </Text>
        <Text dimColor>Consequential actions always require confirmation.</Text>
      </Box>
    </ModalBackdrop>
  );
}
