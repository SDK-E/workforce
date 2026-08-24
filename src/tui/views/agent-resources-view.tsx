import { Box, Text } from "ink";
import type { HiringProposal } from "../../governance/governance-types.js";

export function AgentResourcesView({ proposals }: { proposals: HiringProposal[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Agent Resources</Text>
      <Text dimColor>
        Gap-led hiring, probation, reassignment, and preserved offboarding records
      </Text>
      {proposals.length === 0 ? (
        <Text>No hiring proposals.</Text>
      ) : (
        proposals.map((proposal) => (
          <Box key={proposal.id} flexDirection="column" marginTop={1}>
            <Text>
              [{proposal.status}] {proposal.blueprint.employee.title}
            </Text>
            <Text dimColor>
              job {proposal.jobId} · {proposal.probationCriteria.length} probation gates · proposed
              by {proposal.proposedBy}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
