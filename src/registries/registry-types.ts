type RegistryHealth = "unknown" | "healthy" | "degraded" | "unavailable";

export interface ToolRecord {
  companyId: string;
  id: string;
  version: string;
  provider: string;
  capabilities: string[];
  risk: "low" | "medium" | "high" | "critical";
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  requiredEnvironment: string | null;
  networkPolicy: Record<string, unknown>;
  secretRequirements: string[];
  sandboxProfiles: string[];
  permissionPolicy: Record<string, unknown>;
  health: RegistryHealth;
  testReceiptId: string | null;
  auditBehavior: string;
  updatedAt: string;
}

export interface EnvironmentRecord {
  companyId: string;
  id: string;
  name: string;
  sandboxImage: string;
  runtime: Record<string, unknown>;
  buildToolchain: string[];
  browser: Record<string, unknown>;
  networkPolicy: Record<string, unknown>;
  inputContract: Record<string, unknown>;
  secretsPolicy: Record<string, unknown>;
  resourcePolicy: Record<string, unknown>;
  outputContract: Record<string, unknown>;
  cleanupPolicy: Record<string, unknown>;
  supportedProfiles: string[];
  health: RegistryHealth;
  healthReceiptId: string | null;
  updatedAt: string;
}

export interface ModelRecord {
  companyId: string;
  id: string;
  engine: "kilo" | "opencode";
  model: string;
  provider: string;
  capabilities: string[];
  supportedRoles: string[];
  secretRequirements: string[];
  contextLimit: number | null;
  freePreferred: boolean;
  localModel: boolean;
  priority: number;
  health: RegistryHealth | "circuit-open";
  verifiedAt: string | null;
  verificationReceiptId: string | null;
  failureClass: string | null;
  updatedAt: string;
}
