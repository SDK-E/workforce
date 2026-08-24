import { Box, Text } from "ink";

export function StatusBar({ message }: { message: string }) {
  return (
    <Box paddingX={1} justifyContent="space-between" backgroundColor="gray">
      <Text>{message}</Text>
      <Text>↑↓ Navigate ↵ Open / Palette ? Help q Quit</Text>
    </Box>
  );
}
