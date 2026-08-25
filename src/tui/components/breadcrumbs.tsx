import { Box, Text } from "ink";
import { navigationGroup } from "../navigation.js";

export function Breadcrumbs({ section, focus }: { section: string; focus: "sidebar" | "content" }) {
  return (
    <Box paddingX={1}>
      <Text dimColor>
        {navigationGroup(section).label} › {section} │{" "}
        {focus === "content" ? "Content" : "Navigation"} focused │ Search /
      </Text>
    </Box>
  );
}
