import { Box, Text } from "ink";
import type { StrategyItem, StrategyItemKind } from "../../strategy/strategy-types.js";

export function StrategyView({
  title,
  kind,
  items,
}: {
  title: string;
  kind: StrategyItemKind;
  items: StrategyItem[];
}) {
  const matching = items.filter((item) => item.kind === kind);
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{title}</Text>
      {matching.length === 0 ? (
        <Text dimColor>No {kind}s configured.</Text>
      ) : (
        matching.map((item) => (
          <Text key={item.id}>
            [{item.status}] {item.name} · owner {item.ownerId} · measures{" "}
            {item.successMeasures.length}
          </Text>
        ))
      )}
      <Text dimColor>Press n to create a {kind} with measurable exit criteria.</Text>
    </Box>
  );
}
