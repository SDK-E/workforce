import { Box, Text } from "ink";
import type { PerformanceRecord } from "../../governance/performance-repository.js";
import type { NameDirectory } from "../names.js";

export function PerformanceView({
  records,
  kind,
  names,
}: {
  records: PerformanceRecord[];
  kind?: PerformanceRecord["kind"];
  names: NameDirectory;
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
              [{record.kind}] {names.employee(record.employeeId)}: {record.summary}
            </Text>
            <Text dimColor>
              {record.evidenceIds.length} evidence references · by {names.employee(record.authorId)}
            </Text>
          </Box>
        ))
      )}
      <Text dimColor>
        {visible.length} evidence-backed {kind === "recognition" ? "recognition" : "performance"}{" "}
        records
      </Text>
    </Box>
  );
}
