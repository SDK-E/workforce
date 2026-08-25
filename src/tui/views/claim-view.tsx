import { Box, Text } from "ink";
import { useWorkforceTheme } from "../themes/theme-context.js";
import type { ClaimRecord } from "../../governance/performance-repository.js";
import type { NameDirectory } from "../names.js";

export function ClaimView({
  claims,
  selectedRow,
  names,
}: {
  claims: ClaimRecord[];
  selectedRow: number;
  names: NameDirectory;
}) {
  const theme = useWorkforceTheme();
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Critics, reviews, and claim ledger</Text>
      {claims.length === 0 ? (
        <Text dimColor>No review claims.</Text>
      ) : (
        claims.map((claim, index) => (
          <Box key={claim.id} flexDirection="column" marginTop={1}>
            <Text
              inverse={index === selectedRow}
              color={claim.status === "disputed" ? theme.colors.warning : theme.colors.text}
              dimColor={claim.status === "retracted"}
            >
              [{claim.status}] {names.subject(claim.subjectId)} · {claim.predicate}
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
