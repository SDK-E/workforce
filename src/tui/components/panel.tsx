import React from "react";
import { Box, Text } from "ink";

interface PanelProps {
  title: string;
  children: React.ReactNode;
  width?: number | string;
}

export function Panel({ title, children, width }: PanelProps) {
  return (
    <Box width={width} borderStyle="round" borderColor="gray" flexDirection="column" paddingX={1}>
      <Text bold>{title}</Text>
      {children}
    </Box>
  );
}
