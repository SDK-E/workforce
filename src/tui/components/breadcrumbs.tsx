import { Box, Text } from "ink";
import { navigationGroup } from "../navigation.js";

export function Breadcrumbs({ section }: { section: string }) {
  return (
    <Box paddingX={1}>
      <Text dimColor>
        {navigationGroup(section).label} › {section} │ Search /
      </Text>
    </Box>
  );
}
