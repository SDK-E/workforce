import React from "react";
import { Box, Text } from "ink";
import { useWorkforceTheme } from "../themes/theme-context.js";

interface PanelProps {
  title: string;
  children: React.ReactNode;
  width?: number | string;
}

export function Panel({ title, children, width }: PanelProps) {
  const theme = useWorkforceTheme();
  return (
    <Box
      width={width}
      borderStyle="round"
      borderColor={theme.colors.border}
      flexDirection="column"
      paddingX={1}
    >
      <Text bold>{title}</Text>
      {children}
    </Box>
  );
}
