import { Box, Text } from "ink";
import { ModalBackdrop } from "../components/modal-backdrop.js";

interface HelpOverlayProps {
  compact: boolean;
  terminalWidth: number;
}

export function HelpOverlay({ compact, terminalWidth }: HelpOverlayProps) {
  return (
    <ModalBackdrop
      width={compact ? Math.max(40, terminalWidth - 8) : Math.floor(terminalWidth / 2)}
    >
      <Box
        width="100%"
        backgroundColor="black"
        borderStyle="double"
        borderColor="cyan"
        flexDirection="column"
        paddingX={2}
      >
        <Text bold>Keyboard help</Text>
        <Text>↑/k, ↓/j Navigate</Text>
        <Text>←/→ Change page or detail panel</Text>
        <Text>n New record where available</Text>
        <Text>e Edit or decide where available</Text>
        <Text>! Global emergency stop</Text>
        <Text>/ or p Command palette / search</Text>
        <Text>? Toggle this help</Text>
        <Text>q Quit safely</Text>
        <Text dimColor>Consequential actions always require confirmation.</Text>
      </Box>
    </ModalBackdrop>
  );
}
