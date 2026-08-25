import { Box, Text } from "ink";
import type { ApprovalRecord } from "../../storage/approval-repository.js";
import type { NameDirectory } from "../names.js";

export function ApprovalView({
  approvals,
  selectedRow,
  names,
}: {
  approvals: ApprovalRecord[];
  selectedRow: number;
  names: NameDirectory;
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
              [{approval.status}] {approval.subjectType}: {names.subject(approval.subjectId)}
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
