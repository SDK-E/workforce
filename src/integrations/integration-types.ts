export type ManagedStatus = "active" | "disabled" | "archived";

interface CredentialBinding {
  target: string;
  secretName: string;
}

export interface McpServerRecord {
  companyId: string;
  id: string;
  name: string;
  transport: "stdio" | "http" | "sse";
  endpoint: string | null;
  command: string[];
  toolAllowlist: string[];
  secretRequirements: string[];
  credentialBindings: CredentialBinding[];
  status: ManagedStatus;
  health: "unknown" | "healthy" | "degraded" | "unavailable";
  createdAt: string;
  updatedAt: string;
}

export interface ProjectIntegrationRecord {
  companyId: string;
  projectId: string;
  provider: string;
  config: Record<string, unknown>;
  secretRequirements: string[];
  status: ManagedStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MailRecord {
  id: string;
  companyId: string;
  senderKind: "agent" | "human";
  senderId: string;
  recipientKind: "agent" | "human";
  recipientId: string;
  subject: string;
  body: string;
  status: "sent" | "read" | "archived";
  createdAt: string;
  readAt: string | null;
  updatedAt: string;
}
