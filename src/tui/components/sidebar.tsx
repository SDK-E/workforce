import React from "react";
import { Box, Text } from "ink";
import { NAVIGATION_SECTIONS, truncate } from "../navigation.js";

interface SidebarProps {
  compact: boolean;
  height: number;
  selectedIndex: number;
}

export function Sidebar({ compact, height, selectedIndex }: SidebarProps) {
  const width = compact ? 24 : 28;
  const visibleItems = NAVIGATION_SECTIONS.slice(0, Math.max(8, height - 7));

  return (
    <Box width={width} borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1}>
      {visibleItems.map((item, index) =>
        index === selectedIndex ? (
          <Text key={item} inverse color="cyan">
            › {truncate(item, compact ? 18 : 22)}
          </Text>
        ) : (
          <Text key={item}> {truncate(item, compact ? 18 : 22)}</Text>
        ),
      )}
    </Box>
  );
}
