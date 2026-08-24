import React from "react";
import { Box, Text } from "ink";

interface HelpOverlayProps {
  compact: boolean;
  terminalWidth: number;
}

export function HelpOverlay({ compact, terminalWidth }: HelpOverlayProps) {
  return (
    <Box
      position="absolute"
      marginTop={3}
      marginLeft={compact ? 4 : Math.floor(terminalWidth / 4)}
      width={compact ? Math.max(40, terminalWidth - 8) : Math.floor(terminalWidth / 2)}
      borderStyle="double"
      borderColor="cyan"
      flexDirection="column"
      paddingX={2}
    >
      <Text bold>Keyboard help</Text>
      <Text>↑/k, ↓/j Navigate</Text>
      <Text>Enter Open selected area</Text>
      <Text>/ or p Command palette / search</Text>
      <Text>? Toggle this help</Text>
      <Text>q Quit safely</Text>
      <Text dimColor>Consequential actions always require confirmation.</Text>
    </Box>
  );
}
