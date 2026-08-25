import type { StateStore } from "../storage/state-store.js";
import type { TaskRecord } from "../tasks/task-types.js";
import type { CeoCommercialDecision } from "./ceo-commercial-planner.js";

export class CeoTaskFactory {
  constructor(private readonly store: StateStore) {}

  create(companyId: string, decision: CeoCommercialDecision): TaskRecord {
    const company = this.store.companiesRepository.require(companyId);
    this.ensureObjective(companyId);
    const task = this.store.createTask({
      companyId,
      objective: objectiveFor(decision, company.displayName, company.mission),
      nonGoals: [
        "Conversational small talk",
        "Unsupported claims or fabricated evidence",
        "Actions outside company policy or granted authority",
      ],
      acceptanceCriteria: acceptanceFor(decision),
      outputs: [{ path: "ceo-decision.json", required: true, validator: "json" }],
      risk: decision.authority === "approval-required" ? "high" : "medium",
      dataSensitivity: "internal",
      capabilities: ["strategy", "delegation", "business:read", "business:mutate"],
      managerId: "ceo",
      assigneeId: "ceo",
      reviewerId: "arm",
      escalationPath: ["ceo", "human"],
      networkPolicy: {
        mode: "audited-internet",
        reason: `CEO commercial action: ${decision.action}`,
      },
    });
    this.store.transitionTask(companyId, task.id, "REQUEST_APPROVAL", "ceo", decision.rationale);
    if (decision.authority === "approval-required") {
      this.store.approvalsRepository.request(
        companyId,
        "ceo-task",
        task.id,
        "ceo",
        `${decision.action}: ${decision.rationale}`,
      );
      return this.store.tasksRepository.get(companyId, task.id) ?? task;
    }
    return this.store.transitionTask(
      companyId,
      task.id,
      "APPROVE",
      "ceo",
      "Within configured delegated CEO authority",
    );
  }

  private ensureObjective(companyId: string): void {
    const existing = this.store
      .strategyItems(companyId, "objective")
      .some(({ status }) => !["cancelled", "completed", "archived"].includes(status));
    if (existing) return;
    const company = this.store.companiesRepository.require(companyId);
    this.store.strategyRepository.create(
      {
        companyId,
        kind: "objective",
        name: `Advance ${company.displayName}'s mission`,
        ownerId: "ceo",
        managerId: "ceo",
        requirements: [company.mission],
        constraints: ["Respect configured company policy and approval boundaries"],
        successMeasures: ["At least one independently accepted mission-aligned outcome"],
        risks: ["Unsupported market assumptions", "Unapproved external commitments"],
      },
      "ceo",
    );
  }
}

function objectiveFor(
  decision: CeoCommercialDecision,
  companyName: string,
  mission: string,
): string {
  const subject = decision.subjectId ? ` Durable subject: ${decision.subjectId}.` : "";
  return [
    `Act as the durable CEO of ${companyName}. Mission: ${mission}.`,
    `Commercial action: ${decision.action}.${subject}`,
    decision.rationale,
    "Use Workforce MCP to inspect current evidence, maintain authorized company records, delegate concrete work, and record a concise decision with cited evidence.",
  ].join("\n");
}

function acceptanceFor(decision: CeoCommercialDecision): string[] {
  return [
    `The ${decision.action} decision is persisted through authorized Workforce services`,
    "Claims cite current evidence and unknowns remain explicit",
    "Any delegated work has an owner and independently verifiable exit criteria",
    "No external commitment exceeds the recorded company authority",
  ];
}
