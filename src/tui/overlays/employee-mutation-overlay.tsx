import { designAgentForJob } from "../../agent-designer.js";
import { JobRequirementsSchema } from "../../domain.js";
import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import type { LifecycleTarget } from "../lifecycle-actions.js";
import { AgentProfileForm } from "./agent-profile-form.js";
import { EmployeeHireForm, type EmployeeHireInput } from "./employee-hire-form.js";
import { HiringDecisionForm } from "./hiring-decision-form.js";
import { FormFrame } from "./form-frame.js";
import { Text, useInput } from "ink";
import { matchesKeybinding } from "../keybindings.js";

interface Props {
  kind: "employee-hire" | "agent-profile" | "hiring-decision";
  company: CompanyRecord;
  store: StateStore;
  terminalWidth: number;
  selectedTarget: LifecycleTarget | null;
  onClose: () => void;
  finish: (action: () => void, success: string) => void;
}

export function EmployeeMutationOverlay(props: Props) {
  if (props.kind === "hiring-decision") {
    if (props.selectedTarget?.kind !== "hiring-proposal") return null;
    const proposalId = props.selectedTarget.id;
    return (
      <HiringDecisionForm
        proposalId={proposalId}
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(decision, rationale) => {
          props.finish(() => {
            props.store.employment.decide(
              props.company.id,
              proposalId,
              decision,
              "human",
              rationale,
            );
          }, `Hiring proposal ${decision} and audited`);
        }}
      />
    );
  }
  if (props.kind === "employee-hire")
    return (
      <EmployeeHireForm
        terminalWidth={props.terminalWidth}
        onCancel={props.onClose}
        onSubmit={(input) => {
          hire(props, input);
        }}
      />
    );
  const employeeId =
    props.selectedTarget?.kind === "employee" ? props.selectedTarget.id : undefined;
  if (!employeeId)
    return <SelectionRequired terminalWidth={props.terminalWidth} onCancel={props.onClose} />;
  const profile = employeeId
    ? props.store.agentProfiles.profile(props.company.id, employeeId)
    : undefined;
  const instructions = profile
    ? props.store.agentProfiles.active(props.company.id, profile.employeeId)
    : undefined;
  return (
    <AgentProfileForm
      companyId={props.company.id}
      employeeId={employeeId}
      terminalWidth={props.terminalWidth}
      initial={
        profile && instructions
          ? {
              companyId: props.company.id,
              employeeId: profile.employeeId,
              personaName: profile.personaName,
              identitySummary: profile.identitySummary,
              communicationStyle: profile.communicationStyle,
              autonomyPolicy: profile.autonomyPolicy,
              systemPrompt: instructions.systemPrompt,
              instructions: instructions.instructions,
              constraints: instructions.constraints,
              contextSources: instructions.contextSources,
              modelPolicy: instructions.modelPolicy,
              changedBy: "human",
              changeReason: "Update selected employee persona and instructions",
            }
          : undefined
      }
      onCancel={props.onClose}
      onSubmit={(input) => {
        props.finish(() => {
          props.store.agentProfiles.update(input);
        }, `Instruction revision activated for ${input.employeeId}`);
      }}
    />
  );
}

function SelectionRequired(props: { terminalWidth: number; onCancel: () => void }) {
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
  });
  return (
    <FormFrame
      title="Version agent identity and instructions"
      terminalWidth={props.terminalWidth}
      footer="Esc cancel"
    >
      <Text>Select an employee before editing an agent profile.</Text>
    </FormFrame>
  );
}

function hire(props: Props, input: EmployeeHireInput): void {
  props.finish(() => {
    const requirements = requirementsForHire(input);
    const proposal = props.store.employment.propose(
      props.company.id,
      designAgentForJob(requirements, "arm"),
      "human",
    );
    props.store.employment.decide(
      props.company.id,
      proposal.id,
      "approved",
      "human",
      "Human-approved capability and probation requirements",
    );
  }, "Probationary employee hired with versioned identity and instructions");
}

function requirementsForHire(input: EmployeeHireInput) {
  const capabilities = new Set(input.capabilities.map((item) => item.toLowerCase()));
  return JobRequirementsSchema.parse({
    id: `manual-${Date.now().toString(36)}`,
    title: input.objective.slice(0, 200),
    objective: input.objective,
    risk: "medium",
    dataSensitivity: "internal",
    capabilities: {
      filesystemWrite: true,
      shell:
        capabilities.has("shell") || [...capabilities].some((item) => item.startsWith("language:")),
      sourceControl: capabilities.has("git") || capabilities.has("source-control"),
      browser: capabilities.has("browser"),
      publicInternet: capabilities.has("public-internet") || capabilities.has("research"),
      packageInstall: capabilities.has("package-manager"),
      buildTools: valuesAfterPrefix(capabilities, "build:"),
      languages: valuesAfterPrefix(capabilities, "language:"),
    },
    inputs: [],
    outputs: [{ path: "handoff.json", required: true, validator: "json" }],
    network: {
      mode: capabilities.has("public-internet") ? "audited-internet" : "inference-only",
      allowedHosts: [],
      reason: "Agent inference and declared role capabilities",
      approvedBy: "human",
    },
    resources: { cpu: 1, memoryMb: 768, pids: 128, timeoutSeconds: 1800 },
    enginePreference: ["opencode", "kilo"],
    acceptanceCriteria: input.acceptanceCriteria,
  });
}

function valuesAfterPrefix(values: Set<string>, prefix: string): string[] {
  return [...values]
    .filter((item) => item.startsWith(prefix))
    .map((item) => item.slice(prefix.length));
}
