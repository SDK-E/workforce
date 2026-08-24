import type { ReactNode } from "react";
import { Box, useStdout } from "ink";

export function ModalBackdrop({ children, width }: { children: ReactNode; width: number }) {
  const { stdout } = useStdout();
  return (
    <Box
      position="absolute"
      width={stdout.columns}
      height={stdout.rows}
      backgroundColor="black"
      alignItems="center"
      justifyContent="center"
    >
      <Box width={Math.min(width, Math.max(36, stdout.columns - 4))} backgroundColor="black">
        {children}
      </Box>
    </Box>
  );
}
