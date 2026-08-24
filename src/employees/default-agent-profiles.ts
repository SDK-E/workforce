import type { AgentBlueprint } from "../agent-designer.js";
import type { Employee } from "../domain.js";
import type { AgentProfileRepository } from "./agent-profile-repository.js";

export class DefaultAgentProfiles {
  constructor(private readonly profiles: AgentProfileRepository) {}

  ensure(companyId: string, employees: Employee[]): void {
    for (const employee of employees) {
      if (!this.profiles.profile(companyId, employee.id)) this.create(companyId, employee);
    }
  }

  fromBlueprint(companyId: string, blueprint: AgentBlueprint, changedBy: string): void {
    const employee = blueprint.employee;
    this.profiles.update({
      companyId,
      employeeId: employee.id,
      personaName: employee.name,
      identitySummary: `${employee.title} in ${employee.department}; durable workforce identity ${employee.id}.`,
      communicationStyle: "Concise, evidence-led, explicit about uncertainty and blockers.",
      autonomyPolicy: { mode: "task-scoped", consequentialActionsRequireApproval: true },
      systemPrompt: this.systemPrompt(employee),
      instructions: blueprint.instructions,
      constraints: [
        "Run agent work only inside the assigned Docker sandbox.",
        "Use only approved tools, network policy, resources, and scoped secrets.",
        "Never treat process exit as acceptance or fabricate evidence.",
      ],
      contextSources: ["company-policy", "task-requirements", "relevant-room", "safe-checkpoint"],
      modelPolicy: blueprint.enginePolicy,
      changedBy,
      changeReason: "Initialize adaptive persona and instructions from approved hiring blueprint",
    });
  }

  private create(companyId: string, employee: Employee): void {
    this.profiles.update({
      companyId,
      employeeId: employee.id,
      personaName: employee.name,
      identitySummary: `${employee.title} in ${employee.department}; durable workforce identity ${employee.id}.`,
      communicationStyle: "Direct, concise, evidence-led, and explicit about uncertainty.",
      autonomyPolicy: { mode: "task-scoped", consequentialActionsRequireApproval: true },
      systemPrompt: this.systemPrompt(employee),
      instructions: employee.responsibilities.map((item) => `Own ${item.toLowerCase()}.`),
      constraints: [
        "Run agent work only inside an assigned Docker sandbox.",
        "Do not exceed approved task capabilities or claim unsupported completion.",
        "Preserve audit evidence and escalate consequential decisions.",
      ],
      contextSources: ["company-policy", "employee-role", "task-requirements", "relevant-chat"],
      modelPolicy: { preferred: "task-selected", fallbacks: [], hiddenSwitching: false },
      changedBy: "system",
      changeReason: "Initialize durable agent identity",
    });
  }

  private systemPrompt(employee: Employee): string {
    return [
      `You are ${employee.name}, the ${employee.title}.`,
      `Your durable employee identifier is ${employee.id}; model sessions do not replace this identity.`,
      `Your responsibilities are: ${employee.responsibilities.join("; ")}.`,
      "Follow the current versioned instructions, company policy, task requirements, and sandbox grants.",
      "Ground material claims in observable evidence and state uncertainty plainly.",
    ].join(" ");
  }
}
