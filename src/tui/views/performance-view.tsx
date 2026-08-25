import { Box, Text } from "ink";
import type { PerformanceRecord } from "../../governance/performance-repository.js";

export function PerformanceView({
  records,
  kind,
}: {
  records: PerformanceRecord[];
  kind?: PerformanceRecord["kind"];
}) {
  const visible = kind ? records.filter((record) => record.kind === kind) : records;
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{kind === "recognition" ? "Recognition" : "Evidence-based performance"}</Text>
      {visible.length === 0 ? (
        <Text dimColor>No evidence-backed records.</Text>
      ) : (
        visible.map((record) => (
          <Box key={record.id} flexDirection="column" marginTop={1}>
            <Text>
              [{record.kind}] {record.employeeId}: {record.summary}
            </Text>
            <Text dimColor>
              {record.evidenceIds.length} evidence references · by {record.authorId}
            </Text>
          </Box>
        ))
      )}
      <Text dimColor>
        n record evidence-backed {kind === "recognition" ? "recognition" : "performance"}
      </Text>
    </Box>
  );
}
