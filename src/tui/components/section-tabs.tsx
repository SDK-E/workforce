import { Box, Text } from "ink";

export function SectionTabs({ labels, selected }: { labels: string[]; selected: number }) {
  return (
    <Box gap={1}>
      {labels.map((label, index) => (
        <Text key={label} inverse={index === selected} bold={index === selected}>
          {index === selected ? ` ${label} ` : label}
        </Text>
      ))}
      <Text dimColor>←/→</Text>
    </Box>
  );
}
