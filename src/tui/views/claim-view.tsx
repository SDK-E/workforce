import { Box, Text } from "ink";
import { useWorkforceTheme } from "../themes/theme-context.js";
import type { ClaimRecord } from "../../governance/performance-repository.js";

export function ClaimView({ claims }: { claims: ClaimRecord[] }) {
  const theme = useWorkforceTheme();
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Critics, reviews, and claim ledger</Text>
      {claims.length === 0 ? (
        <Text dimColor>No review claims.</Text>
      ) : (
        claims.map((claim) => (
          <Box key={claim.id} flexDirection="column" marginTop={1}>
            <Text color={claim.status === "disputed" ? theme.colors.warning : theme.colors.text}>
              [{claim.status}] {claim.subjectId} · {claim.predicate}
            </Text>
            <Text dimColor>
              confidence {Math.round(claim.confidence * 100)}% · {claim.evidenceIds.length} evidence
              references{claim.contradictedBy ? ` · contradicts ${claim.contradictedBy}` : ""}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
