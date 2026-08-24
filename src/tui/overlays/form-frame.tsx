import type { ReactNode } from "react";
import { Box, Text } from "ink";

export function FormFrame({
  title,
  terminalWidth,
  children,
  footer,
}: {
  title: string;
  terminalWidth: number;
  children: ReactNode;
  footer: string;
}) {
  return (
    <Box
      position="absolute"
      marginTop={4}
      marginLeft={Math.max(2, Math.floor(terminalWidth / 5))}
      width={Math.max(44, Math.floor((terminalWidth * 3) / 5))}
      borderStyle="double"
      borderColor="cyan"
      flexDirection="column"
      paddingX={2}
    >
      <Text bold>{title}</Text>
      {children}
      <Text dimColor>{footer}</Text>
    </Box>
  );
}
