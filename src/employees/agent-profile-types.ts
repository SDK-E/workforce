export interface AgentProfile {
  companyId: string;
  employeeId: string;
  personaName: string;
  identitySummary: string;
  communicationStyle: string;
  autonomyPolicy: Record<string, unknown>;
  activeRevision: number;
  updatedAt: string;
}

export interface AgentInstructionVersion {
  companyId: string;
  employeeId: string;
  revision: number;
  systemPrompt: string;
  instructions: string[];
  constraints: string[];
  contextSources: string[];
  modelPolicy: Record<string, unknown>;
  changedBy: string;
  changeReason: string;
  createdAt: string;
}

export interface UpdateAgentInstructionsInput {
  companyId: string;
  employeeId: string;
  personaName: string;
  identitySummary: string;
  communicationStyle: string;
  autonomyPolicy: Record<string, unknown>;
  systemPrompt: string;
  instructions: string[];
  constraints: string[];
  contextSources: string[];
  modelPolicy: Record<string, unknown>;
  changedBy: string;
  changeReason: string;
}
