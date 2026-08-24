import type { ReactNode } from "react";
import { Box, Text } from "ink";
import { ModalBackdrop } from "../components/modal-backdrop.js";

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
    <ModalBackdrop width={Math.max(44, Math.floor((terminalWidth * 3) / 5))}>
      <Box
        width="100%"
        backgroundColor="black"
        borderStyle="double"
        borderColor="cyan"
        flexDirection="column"
        paddingX={2}
      >
        <Text bold>{title}</Text>
        {children}
        <Text dimColor>{footer}</Text>
      </Box>
    </ModalBackdrop>
  );
}
