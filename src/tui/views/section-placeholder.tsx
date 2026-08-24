import { Box, Text } from "ink";

interface SectionPlaceholderProps {
  section: string;
  mission: string;
}

export function SectionPlaceholder({ section, mission }: SectionPlaceholderProps) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{section}</Text>
      <Text dimColor>{mission}</Text>
      <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text>This workspace is ready for its domain-specific view.</Text>
      </Box>
    </Box>
  );
}
