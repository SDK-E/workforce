import { Box, Text } from "ink";

interface UnavailableViewProps {
  section: string;
}

export function UnavailableView({ section }: UnavailableViewProps) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{section}</Text>
      <Text color="yellow">This workflow is not available in the current build.</Text>
    </Box>
  );
}
