import { Box, Text } from "ink";
import type { StrategyItem, StrategyItemKind } from "../../strategy/strategy-types.js";
import type { NameDirectory } from "../names.js";

export function StrategyView({
  title,
  kind,
  items,
  selectedRow,
  names,
}: {
  title: string;
  kind: StrategyItemKind;
  items: StrategyItem[];
  selectedRow: number;
  names: NameDirectory;
}) {
  const matching = items.filter((item) => item.kind === kind);
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{title}</Text>
      {matching.length === 0 ? (
        <Text dimColor>No {kind}s configured.</Text>
      ) : (
        matching.map((item, index) => (
          <Text key={item.id} inverse={index === selectedRow}>
            [{item.status}] {item.name} · owner {names.employee(item.ownerId)} · measures{" "}
            {item.successMeasures.length}
          </Text>
        ))
      )}
    </Box>
  );
}
