type WorkforceMcpRole = "human-admin" | "ceo" | "arm" | "manager" | "employee" | "reviewer";

export type WorkforceMcpCapability =
  | "company:read"
  | "task:read"
  | "message:read"
  | "attempt:read"
  | "audit:read"
  | "work:mutate"
  | "workforce:manage"
  | "company:manage"
  | "emergency:stop";

export interface WorkforceMcpPrincipal {
  id: string;
  role: WorkforceMcpRole;
  companyIds: string[];
  employeeId: string | null;
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
