import { Box, Text } from "ink";
import type { ApprovalRecord } from "../../storage/approval-repository.js";

export function ApprovalView({ approvals }: { approvals: ApprovalRecord[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Approvals</Text>
      {approvals.length === 0 ? (
        <Text dimColor>No approval decisions.</Text>
      ) : (
        approvals.map((approval) => (
          <Box key={approval.id} flexDirection="column" marginTop={1}>
            <Text>
              [{approval.status}] {approval.subjectType}: {approval.subjectId}
            </Text>
            <Text dimColor>
              requested by {approval.requestedBy} · decided by {approval.decidedBy ?? "pending"}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
