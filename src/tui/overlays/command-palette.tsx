import { Box, Text } from "ink";
import { paletteMatches } from "../command-palette-input.js";
import { ModalBackdrop } from "../components/modal-backdrop.js";
import { useWorkforceTheme } from "../themes/theme-context.js";

interface CommandPaletteProps {
  query: string;
  terminalWidth: number;
  selectedIndex: number;
}

export function CommandPalette({ query, terminalWidth, selectedIndex }: CommandPaletteProps) {
  const theme = useWorkforceTheme();
  const matches = paletteMatches(query);

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
        {matches.map((section, index) => (
          <Text key={section} inverse={index === selectedIndex}>
            {index === selectedIndex ? "›" : " "} {section}
          </Text>
        ))}
        <Text dimColor>Type to filter · Enter to open · Esc to close</Text>
      </Box>
    </ModalBackdrop>
  );
}
