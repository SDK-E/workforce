export interface CompanyRuntime {
  companyId: string;
  enabled: boolean;
  cadenceSeconds: number;
  monthlyBudgetCents: number;
  maxConcurrentAttempts: number;
  state: "idle" | "running" | "blocked" | "stopped";
  lastCycleAt: string | null;
  nextCycleAt: string;
  updatedAt: string;
}

export interface OperatingCycle {
  id: string;
  companyId: string;
  leaderId: string;
  status: "leased" | "completed" | "blocked" | "failed";
  leaseOwner: string;
  leaseExpiresAt: string;
  observation: Record<string, unknown>;
  decision: Record<string, unknown> | null;
  spawnedTaskId: string | null;
  startedAt: string;
  finishedAt: string | null;
  failureReason: string | null;
}
