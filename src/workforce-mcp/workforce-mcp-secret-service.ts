import type { EncryptedSecretStore } from "../secrets/encrypted-secret-store.js";
import type { SecretAccessContext, SecretMetadata } from "../secrets/secret-types.js";
import type { StateStore } from "../storage/state-store.js";
import { authorizeMcp, type WorkforceMcpPrincipal } from "./mcp-principal.js";

export class WorkforceMcpSecretService {
  constructor(
    private readonly store: StateStore,
    private readonly secrets: EncryptedSecretStore,
  ) {}

  list(principal: WorkforceMcpPrincipal, companyId: string): SecretMetadata[] {
    authorizeMcp(principal, companyId, "secret:read");
    const records = this.secrets.list(companyId);
    const visible = this.isOwner(principal)
      ? records
      : records.filter(({ scope }) => allowed(scope, this.context(principal, companyId)));
    this.audit(principal, companyId, "list_secrets", { count: visible.length });
    return visible;
  }

  get(principal: WorkforceMcpPrincipal, companyId: string, name: string) {
    authorizeMcp(principal, companyId, "secret:read");
    const value = this.isOwner(principal)
      ? this.secrets.getForCompanyOwner(companyId, name, principal.employeeId ?? principal.id)
      : this.secrets.get(name, this.context(principal, companyId));
    this.audit(principal, companyId, "get_secret", { name });
    return { name, value };
  }

  set(
    principal: WorkforceMcpPrincipal,
    input: {
      companyId: string;
      name: string;
      value: string;
      employeeIds?: string[] | undefined;
      taskIds?: string[] | undefined;
    },
  ): SecretMetadata {
    authorizeMcp(principal, input.companyId, "secret:write");
    const owner = this.isOwner(principal);
    let scope: { employeeIds: string[]; taskIds: string[] };
    if (owner)
      scope = {
        employeeIds: input.employeeIds?.length ? input.employeeIds : ["*"],
        taskIds: input.taskIds?.length ? input.taskIds : ["*"],
      };
    else {
      const context = this.context(principal, input.companyId);
      this.requireExistingAccessIfPresent(input.companyId, input.name, context);
      scope = { employeeIds: [context.employeeId], taskIds: [context.taskId] };
    }
    const record = this.secrets.set(input.companyId, input.name, input.value, scope);
    this.audit(principal, input.companyId, "set_secret", { name: input.name, scope });
    return record;
  }

  remove(principal: WorkforceMcpPrincipal, companyId: string, name: string): void {
    authorizeMcp(principal, companyId, "secret:write");
    if (!this.isOwner(principal)) void this.secrets.get(name, this.context(principal, companyId));
    this.secrets.remove(companyId, name, principal.employeeId ?? principal.id);
    this.audit(principal, companyId, "remove_secret", { name });
  }

  private requireExistingAccessIfPresent(
    companyId: string,
    name: string,
    context: SecretAccessContext,
  ): void {
    if (!this.secrets.list(companyId).some((record) => record.name === name)) return;
    void this.secrets.get(name, context);
  }

  private context(principal: WorkforceMcpPrincipal, companyId: string): SecretAccessContext {
    if (!principal.employeeId || !principal.taskId)
      throw new Error("Scoped secret access requires an attempt employee and task identity");
    return { companyId, employeeId: principal.employeeId, taskId: principal.taskId };
  }

  private isOwner(principal: WorkforceMcpPrincipal): boolean {
    return (
      ["ceo", "human-admin"].includes(principal.role) &&
      principal.capabilities.includes("secret:manage")
    );
  }

  private audit(
    principal: WorkforceMcpPrincipal,
    companyId: string,
    operation: string,
    data: Record<string, unknown>,
  ): void {
    this.store.audit.append("workforce-mcp.secret", principal.id, companyId, {
      operation,
      employeeId: principal.employeeId,
      ...data,
    });
  }
}

function allowed(
  scope: { employeeIds: string[]; taskIds: string[] },
  context: SecretAccessContext,
): boolean {
  return (
    (scope.employeeIds.includes("*") || scope.employeeIds.includes(context.employeeId)) &&
    (scope.taskIds.includes("*") || scope.taskIds.includes(context.taskId))
  );
}
