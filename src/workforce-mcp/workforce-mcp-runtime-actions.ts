export interface WorkforceMcpRuntimeActions {
  emergencyStopCompany(companyId: string, actorId: string): Promise<void>;
}
