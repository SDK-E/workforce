import { Box, Text } from "ink";
import { NAVIGATION_SECTIONS, truncate } from "../navigation.js";

interface SidebarProps {
  compact: boolean;
  height: number;
  selectedIndex: number;
}

export function Sidebar({ compact, height, selectedIndex }: SidebarProps) {
  const width = compact ? 24 : 28;
  const labelWidth = compact ? 18 : 22;
  const capacity = Math.max(8, height - 7);
  const maximumStart = Math.max(0, NAVIGATION_SECTIONS.length - capacity);
  const start = Math.min(maximumStart, Math.max(0, selectedIndex - Math.floor(capacity / 2)));
  const visibleItems = NAVIGATION_SECTIONS.slice(start, start + capacity);

  return (
    <Box width={width} borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1}>
      {start > 0 && <Text dimColor> ↑ more</Text>}
      {visibleItems.map((item, index) =>
        index + start === selectedIndex ? (
          <Text key={item} inverse color="cyan">
            › {truncate(item, labelWidth).padEnd(labelWidth)}
          </Text>
        ) : (
          <Text key={item}> {truncate(item, labelWidth).padEnd(labelWidth)}</Text>
        ),
      )}
      {start + visibleItems.length < NAVIGATION_SECTIONS.length && <Text dimColor> ↓ more</Text>}
    </Box>
  );
}
