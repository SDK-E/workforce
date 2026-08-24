import React from "react";
import { Box, Text } from "ink";
import { NAVIGATION_SECTIONS } from "../navigation.js";

interface CommandPaletteProps {
  query: string;
  terminalWidth: number;
}

export function CommandPalette({ query, terminalWidth }: CommandPaletteProps) {
  const matches = NAVIGATION_SECTIONS.filter((section) =>
    section.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 6);

  return (
    <Box
      position="absolute"
      marginTop={4}
      marginLeft={Math.max(2, Math.floor(terminalWidth / 4))}
      width={Math.max(36, Math.floor(terminalWidth / 2))}
      borderStyle="double"
      borderColor="cyan"
      flexDirection="column"
      paddingX={1}
    >
      <Text bold>Command palette</Text>
      <Text>
        › {query}
        <Text inverse> </Text>
      </Text>
      {matches.map((section) => (
        <Text key={section}> {section}</Text>
      ))}
      <Text dimColor>Type to filter · Enter to open · Esc to close</Text>
    </Box>
  );
}
