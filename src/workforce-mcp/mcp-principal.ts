type WorkforceMcpRole = "human-admin" | "ceo" | "arm" | "manager" | "employee" | "reviewer";

export type WorkforceMcpCapability =
  | "company:read"
  | "task:read"
  | "message:read"
  | "message:write"
  | "mail:read"
  | "mail:write"
  | "meeting:read"
  | "meeting:write"
  | "checkpoint:write"
  | "participation:write"
  | "attempt:read"
  | "deliverable:read"
  | "decision:read"
  | "audit:read"
  | "work:mutate"
  | "workforce:manage"
  | "company:manage"
  | "emergency:stop"
  | "secret:read"
  | "secret:write"
  | "secret:manage";

export interface WorkforceMcpPrincipal {
  id: string;
  role: WorkforceMcpRole;
  companyIds: string[];
  employeeId: string | null;
  taskId?: string | null | undefined;
  attemptId?: string | null | undefined;
  capabilities: WorkforceMcpCapability[];
}

export function authorizeMcp(
  principal: WorkforceMcpPrincipal,
  companyId: string,
  capability: WorkforceMcpCapability,
): void {
  if (!principal.companyIds.includes(companyId)) throw new Error("MCP company access denied");
  if (!principal.capabilities.includes(capability))
    throw new Error(`MCP capability denied: ${capability}`);
}

export function isCompanyManager(principal: WorkforceMcpPrincipal): boolean {
  return ["human-admin", "ceo", "arm"].includes(principal.role);
}
