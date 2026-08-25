import { Box, Text } from "ink";
import { NAVIGATION_SECTIONS } from "../navigation.js";
import { ModalBackdrop } from "../components/modal-backdrop.js";
import { useWorkforceTheme } from "../themes/theme-context.js";

interface CommandPaletteProps {
  query: string;
  terminalWidth: number;
}

export function CommandPalette({ query, terminalWidth }: CommandPaletteProps) {
  const theme = useWorkforceTheme();
  const matches = NAVIGATION_SECTIONS.filter((section) =>
    section.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 6);

  return (
    <ModalBackdrop width={Math.max(36, Math.floor(terminalWidth / 2))}>
      <Box
        width="100%"
        backgroundColor={theme.colors.canvas}
        borderStyle="double"
        borderColor={theme.colors.accent}
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
    </ModalBackdrop>
  );
}
