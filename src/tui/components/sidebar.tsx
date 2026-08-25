import { Box, Text } from "ink";
import { DEFAULT_SECTION, NAVIGATION_SECTIONS, navigationGroup, truncate } from "../navigation.js";

interface SidebarProps {
  compact: boolean;
  height: number;
  selectedIndex: number;
}

export function Sidebar({ compact, height, selectedIndex }: SidebarProps) {
  const width = compact ? 24 : 28;
  const labelWidth = compact ? 18 : 22;
  const selected = NAVIGATION_SECTIONS[selectedIndex] ?? DEFAULT_SECTION;
  const group = navigationGroup(selected);
  const capacity = Math.max(4, height - 10);
  const localIndex = group.sections.findIndex((item) => item === selected);
  const maximumStart = Math.max(0, group.sections.length - capacity);
  const start = Math.min(maximumStart, Math.max(0, localIndex - Math.floor(capacity / 2)));
  const visibleItems = group.sections.slice(start, start + capacity);

  return (
    <Box width={width} borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        {truncate(group.label.toUpperCase(), labelWidth)}
      </Text>
      <Text dimColor>Tab change area</Text>
      {start > 0 && <Text dimColor> ↑ more</Text>}
      {visibleItems.map((item) =>
        item === selected ? (
          <Text key={item} inverse color="cyan">
            › {truncate(item, labelWidth).padEnd(labelWidth)}
          </Text>
        ) : (
          <Text key={item}> {truncate(item, labelWidth).padEnd(labelWidth)}</Text>
        ),
      )}
      {start + visibleItems.length < group.sections.length && <Text dimColor> ↓ more</Text>}
    </Box>
  );
}
