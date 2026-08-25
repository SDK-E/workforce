import { Box, Text } from "ink";
import { DEFAULT_SECTION, NAVIGATION_SECTIONS, navigationGroup, truncate } from "../navigation.js";
import { useWorkforceTheme } from "../themes/theme-context.js";
import { bindingsFor } from "../keybindings.js";

interface SidebarProps {
  compact: boolean;
  height: number;
  selectedIndex: number;
  focused: boolean;
}

export function Sidebar({ compact, height, selectedIndex, focused }: SidebarProps) {
  const theme = useWorkforceTheme();
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
    <Box
      width={width}
      borderStyle="single"
      borderColor={theme.colors.border}
      flexDirection="column"
      paddingX={1}
    >
      <Text bold color={theme.colors.accent}>
        {truncate(group.label.toUpperCase(), labelWidth)}
      </Text>
      {focused ? (
        <Text color={theme.colors.success}>● FOCUSED</Text>
      ) : (
        <Text>○ {bindingsFor("focusNext")} to focus</Text>
      )}
      {start > 0 && <Text dimColor> ↑ more</Text>}
      {visibleItems.map((item) =>
        item === selected ? (
          <Text key={item} inverse color={theme.colors.accent}>
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
