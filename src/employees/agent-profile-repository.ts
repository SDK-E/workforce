import { createHash } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import type {
  AgentInstructionVersion,
  AgentProfile,
  UpdateAgentInstructionsInput,
} from "./agent-profile-types.js";

export class AgentProfileRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  update(input: UpdateAgentInstructionsInput): AgentProfile {
    this.requireEmployee(input.companyId, input.employeeId);
    const current = this.profile(input.companyId, input.employeeId);
    const revision = (current?.activeRevision ?? 0) + 1;
    const now = new Date().toISOString();
    const profile: AgentProfile = {
      companyId: input.companyId,
      employeeId: input.employeeId,
      personaName: sanitizeTerminal(input.personaName, 200),
      identitySummary: sanitizeTerminal(input.identitySummary, 4_000),
      communicationStyle: sanitizeTerminal(input.communicationStyle, 1_000),
      autonomyPolicy: input.autonomyPolicy,
      activeRevision: revision,
      updatedAt: now,
    };
    if (!profile.personaName || !input.systemPrompt.trim() || !input.changeReason.trim())
      throw new Error("Persona, system prompt, and change rationale are required");
    this.database.transaction(() => {
      this.saveProfile(profile);
      this.database.connection
        .prepare("INSERT INTO agent_instruction_versions VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          profile.companyId,
          profile.employeeId,
          revision,
          sanitizeTerminal(input.systemPrompt, 20_000),
          JSON.stringify(input.instructions.map((item) => sanitizeTerminal(item, 4_000))),
          JSON.stringify(input.constraints.map((item) => sanitizeTerminal(item, 4_000))),
          JSON.stringify(input.contextSources.map((item) => sanitizeTerminal(item, 1_000))),
          JSON.stringify(input.modelPolicy),
          sanitizeTerminal(input.changedBy, 200),
          sanitizeTerminal(input.changeReason, 2_000),
          now,
        );
      this.audit.append("agent.instructions-versioned", input.changedBy, input.companyId, {
        employeeId: input.employeeId,
        revision,
      });
    });
    return profile;
  }

  profile(companyId: string, employeeId: string): AgentProfile | undefined {
    const row = this.database.connection
      .prepare("SELECT * FROM agent_profiles WHERE company_id=? AND employee_id=?")
      .get(companyId, employeeId) as Record<string, unknown> | undefined;
    return row ? mapProfile(row) : undefined;
  }

  list(companyId: string): AgentProfile[] {
    return (
      this.database.connection
        .prepare("SELECT * FROM agent_profiles WHERE company_id=? ORDER BY employee_id")
        .all(companyId) as Record<string, unknown>[]
    ).map(mapProfile);
  }

  active(companyId: string, employeeId: string): AgentInstructionVersion {
    const profile = this.profile(companyId, employeeId);
    if (!profile) throw new Error(`No agent profile for employee: ${employeeId}`);
    const row = this.database.connection
      .prepare(
        `SELECT * FROM agent_instruction_versions
         WHERE company_id=? AND employee_id=? AND revision=?`,
      )
      .get(companyId, employeeId, profile.activeRevision) as Record<string, unknown>;
    return mapInstructions(row);
  }

  history(companyId: string, employeeId: string): AgentInstructionVersion[] {
    return (
      this.database.connection
        .prepare(
          `SELECT * FROM agent_instruction_versions
           WHERE company_id=? AND employee_id=? ORDER BY revision DESC`,
        )
        .all(companyId, employeeId) as Record<string, unknown>[]
    ).map(mapInstructions);
  }

  digest(version: AgentInstructionVersion): string {
    return createHash("sha256").update(JSON.stringify(version)).digest("hex");
  }

  render(version: AgentInstructionVersion, objective: string): string {
    return [
      version.systemPrompt,
      `Identity: ${version.employeeId} (instruction revision ${version.revision})`,
      `Operating instructions:\n${version.instructions.map((item) => `- ${item}`).join("\n")}`,
      `Constraints:\n${version.constraints.map((item) => `- ${item}`).join("\n")}`,
      `Current objective:\n${objective}`,
    ].join("\n\n");
  }

  private saveProfile(profile: AgentProfile): void {
    this.database.connection
      .prepare(
        `INSERT INTO agent_profiles VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT(company_id,employee_id) DO UPDATE SET persona_name=excluded.persona_name,
         identity_summary=excluded.identity_summary,communication_style=excluded.communication_style,
         autonomy_policy_json=excluded.autonomy_policy_json,
         active_revision=excluded.active_revision,updated_at=excluded.updated_at`,
      )
      .run(
        profile.companyId,
        profile.employeeId,
        profile.personaName,
        profile.identitySummary,
        profile.communicationStyle,
        JSON.stringify(profile.autonomyPolicy),
        profile.activeRevision,
        profile.updatedAt,
      );
  }

  private requireEmployee(companyId: string, employeeId: string): void {
    const row = this.database.connection
      .prepare("SELECT 1 FROM employees WHERE company_id=? AND id=?")
      .get(companyId, employeeId);
    if (!row) throw new Error(`Unknown employee: ${employeeId}`);
  }
}

function mapProfile(row: Record<string, unknown>): AgentProfile {
  return {
    companyId: String(row.company_id),
    employeeId: String(row.employee_id),
    personaName: String(row.persona_name),
    identitySummary: String(row.identity_summary),
    communicationStyle: String(row.communication_style),
    autonomyPolicy: parseJson(row.autonomy_policy_json),
    activeRevision: Number(row.active_revision),
    updatedAt: String(row.updated_at),
  };
}

function mapInstructions(row: Record<string, unknown>): AgentInstructionVersion {
  return {
    companyId: String(row.company_id),
    employeeId: String(row.employee_id),
    revision: Number(row.revision),
    systemPrompt: String(row.system_prompt),
    instructions: parseJson(row.instructions_json),
    constraints: parseJson(row.constraints_json),
    contextSources: parseJson(row.context_sources_json),
    modelPolicy: parseJson(row.model_policy_json),
    changedBy: String(row.changed_by),
    changeReason: String(row.change_reason),
    createdAt: String(row.created_at),
  };
}
