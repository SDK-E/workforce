import { Box, Text } from "ink";
import type { HiringProposal } from "../../governance/governance-types.js";
import type {
  ArmDecision,
  ReinforcementPlan,
} from "../../governance/workforce-adaptation-types.js";
import type { NameDirectory } from "../names.js";
import { Panel } from "../components/panel.js";
import { truncate } from "../navigation.js";

export function AgentResourcesView({
  proposals,
  plans,
  decisions,
  selectedRow,
  names,
}: {
  proposals: HiringProposal[];
  plans: ReinforcementPlan[];
  decisions: ArmDecision[];
  selectedRow: number;
  names: NameDirectory;
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Agent Resources</Text>
      <Text dimColor>
        Gap-led hiring, probation, reassignment, and preserved offboarding records
      </Text>
      <Box marginTop={1} gap={1} flexWrap="wrap">
        <Panel title="REINFORCEMENT" width={48}>
          {plans.length === 0 ? (
            <Text dimColor>No evidence-backed reinforcement plans.</Text>
          ) : (
            plans.slice(0, 4).map((plan) => (
              <Text key={plan.id}>
                [{plan.status}] {names.employee(plan.employeeId)} · review{" "}
                {plan.reviewAt.slice(0, 10)}
              </Text>
            ))
          )}
        </Panel>
        <Panel title="LATEST ARM DECISIONS" width={58}>
          {decisions.length === 0 ? (
            <Text dimColor>No autonomous workforce decision recorded.</Text>
          ) : (
            decisions.slice(0, 4).map((decision) => (
              <Text key={decision.id}>
                {decision.action} · {names.subject(decision.subjectId)} ·{" "}
                {truncate(decision.rationale, 46)}
              </Text>
            ))
          )}
        </Panel>
      </Box>
      <Text bold>Hiring proposals</Text>
      {proposals.length === 0 ? (
        <Text>No hiring proposals.</Text>
      ) : (
        proposals.map((proposal, index) => (
          <Box key={proposal.id} flexDirection="column" marginTop={1}>
            <Text inverse={index === selectedRow}>
              [{proposal.status}] {proposal.blueprint.employee.title}
            </Text>
            <Text dimColor>
              {proposal.probationCriteria.length} probation gates · proposed by{" "}
              {proposal.proposedBy}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
