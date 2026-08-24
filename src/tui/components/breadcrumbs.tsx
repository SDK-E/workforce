import { Box, Text } from "ink";

export function Breadcrumbs({ section }: { section: string }) {
  return (
    <Box paddingX={1}>
      <Text dimColor>Home › {section} │ Project: All │ Search /</Text>
    </Box>
  );
}
