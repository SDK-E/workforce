import { Box, Text } from "ink";
import type { ApprovalRecord } from "../../storage/approval-repository.js";

export function ApprovalView({
  approvals,
  selectedRow,
}: {
  approvals: ApprovalRecord[];
  selectedRow: number;
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Approvals</Text>
      {approvals.length === 0 ? (
        <Text dimColor>No approval decisions.</Text>
      ) : (
        approvals.map((approval, index) => (
          <Box key={approval.id} flexDirection="column" marginTop={1}>
            <Text inverse={index === selectedRow}>
              [{approval.status}] {approval.subjectType}: {approval.subjectId}
            </Text>
            <Text dimColor>
              requested by {approval.requestedBy} · decided by {approval.decidedBy ?? "pending"}
            </Text>
          </Box>
        ))
      )}
      <Text dimColor>e decide selected pending approval · [ ] select</Text>
    </Box>
  );
}
