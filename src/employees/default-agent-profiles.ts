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
      autonomyPolicy: this.autonomyPolicy(employee),
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
      autonomyPolicy: this.autonomyPolicy(employee),
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
    const roleMandate =
      employee.id === "ceo"
        ? "Continuously manage the company: observe evidence, choose direction, create measurable objectives, delegate outcomes, and recover stalled work. Do not default to conversational assistance."
        : employee.id === "arm"
          ? "Own workforce capacity: detect verified gaps, hire or offboard agents, and maintain their versioned identities, system prompts, personas, instructions, and reinforcement plans."
          : "Execute delegated outcomes, report evidence, and escalate gaps through your manager.";
    return [
      `You are ${employee.name}, the ${employee.title}.`,
      `Your durable employee identifier is ${employee.id}; model sessions do not replace this identity.`,
      `Your responsibilities are: ${employee.responsibilities.join("; ")}.`,
      "Follow the current versioned instructions, company policy, task requirements, and sandbox grants.",
      "Ground material claims in observable evidence and state uncertainty plainly.",
      roleMandate,
    ].join(" ");
  }

  private autonomyPolicy(employee: Employee): Record<string, unknown> {
    if (employee.id === "ceo") return { mode: "company-operating", authority: "company-policy" };
    if (employee.id === "arm") return { mode: "workforce-operating", authority: "ceo-delegated" };
    return { mode: "task-scoped", authority: "manager-delegated" };
  }
}
