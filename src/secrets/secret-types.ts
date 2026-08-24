export interface SecretScope {
  employeeIds: string[];
  taskIds: string[];
}

export interface SecretAccessContext {
  companyId: string;
  employeeId: string;
  taskId: string;
}

export interface SecretMetadata {
  companyId: string;
  name: string;
  scope: SecretScope;
  createdAt: string;
  updatedAt: string;
}

export type SecretAuditSink = (
  event: "secret.stored" | "secret.accessed" | "secret.denied",
  data: { companyId: string; name: string; employeeId?: string; taskId?: string },
) => void;
