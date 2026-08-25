import { createHash, randomUUID } from "node:crypto";
import type { AgentProfileRepository } from "../employees/agent-profile-repository.js";
import { engineAdapter } from "../engines/engine-adapter.js";
import type { SandboxSpec } from "../domain.js";
import type { TaskRecord } from "../tasks/task-types.js";
import type { AttemptRequest } from "./attempt-types.js";
import type { OrganizationalBriefingBuilder } from "../employees/organizational-briefing-service.js";

export class AttemptFactory {
  constructor(
    private readonly profiles: AgentProfileRepository,
    private readonly briefings?: OrganizationalBriefingBuilder,
  ) {}

  create(input: {
    task: TaskRecord;
    employeeId: string;
    sandbox: SandboxSpec;
    model: string;
    attemptId?: string;
    secretNames?: string[];
    ephemeralSecretNames?: string[];
    environment?: Record<string, string>;
  }): AttemptRequest {
    if (input.task.companyId.length === 0) throw new Error("Task company is required");
    const version = this.profiles.active(input.task.companyId, input.employeeId);
    const toolchainCommand = input.environment?.WORKFORCE_TOOLCHAIN_COMMAND;
    const briefing = this.briefings?.render(input.task, input.employeeId) ?? "";
    const objective = this.profiles.render(
      version,
      `${briefing}${briefing ? "\n\n" : ""}${
        toolchainCommand
          ? `${input.task.objective}\nProvision the approved mixed toolchain when needed: ${toolchainCommand}`
          : input.task.objective
      }`,
    );
    const adapter = engineAdapter(input.sandbox.engine);
    return {
      id: input.attemptId ?? randomUUID(),
      companyId: input.task.companyId,
      taskId: input.task.id,
      employeeId: input.employeeId,
      sandbox: input.sandbox,
      command: adapter.executionCommand({
        engine: input.sandbox.engine,
        model: input.model,
        objective,
      }),
      secretNames: input.secretNames ?? [],
      ephemeralSecretNames: input.ephemeralSecretNames ?? [],
      environment: input.environment ?? {},
      instructionRevision: version.revision,
      instructionDigest: createHash("sha256")
        .update(this.profiles.digest(version))
        .update("\0")
        .update(briefing)
        .digest("hex"),
    };
  }
}
