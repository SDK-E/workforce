import type { ReactNode } from "react";
import { Box, useStdout } from "ink";
import { useWorkforceTheme } from "../themes/theme-context.js";

export function ModalBackdrop({ children, width }: { children: ReactNode; width: number }) {
  const { stdout } = useStdout();
  const theme = useWorkforceTheme();
  return (
    <Box
      position="absolute"
      width={stdout.columns}
      height={stdout.rows}
      backgroundColor={theme.colors.canvas}
      alignItems="center"
      justifyContent="center"
    >
      <Box
        width={Math.min(width, Math.max(36, stdout.columns - 4))}
        backgroundColor={theme.colors.canvas}
      >
        {children}
      </Box>
    </Box>
  );
}
