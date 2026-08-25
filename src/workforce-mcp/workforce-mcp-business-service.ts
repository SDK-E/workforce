import type { StateStore } from "../storage/state-store.js";
import { authorizeMcp, type WorkforceMcpPrincipal } from "./mcp-principal.js";
import { McpIdempotencyRepository } from "./mcp-idempotency-repository.js";

interface Scope {
  companyId: string;
  idempotencyKey: string;
}

interface RecordIdentity {
  id?: string | undefined;
}

export class WorkforceMcpBusinessService {
  private readonly idempotency: McpIdempotencyRepository;
  constructor(private readonly store: StateStore) {
    this.idempotency = new McpIdempotencyRepository(store.database);
  }

  list(
    principal: WorkforceMcpPrincipal,
    input: { companyId: string; query?: string | undefined; limit: number; offset: number },
  ) {
    authorizeMcp(principal, input.companyId, "business:read");
    const options = {
      ...(input.query === undefined ? {} : { query: input.query }),
      limit: input.limit,
      offset: input.offset,
    };
    this.audit(principal, input.companyId, "list_business_pipeline", "business:read");
    return {
      opportunities: this.store.opportunities.list(input.companyId, options),
      leads: this.store.leads.list(input.companyId, options),
      clients: this.store.clients.list(input.companyId, options),
      engagements: this.store.engagements.list(input.companyId, options),
    };
  }

  saveOpportunity(
    principal: WorkforceMcpPrincipal,
    input: Scope & {
      id?: string | undefined;
      name: string;
      source: string;
      problem: string;
      hypothesis: string;
      score: number;
      stage: "discovered" | "researching" | "validated" | "rejected" | "converted" | "archived";
      ownerId: string | null;
      evidenceIds: string[];
    },
  ) {
    return this.mutate(principal, input, "save_opportunity", () => {
      const values = businessValues(input);
      if (input.id)
        return this.store.opportunities.update(input.companyId, input.id, values, principal.id);
      const created = this.store.opportunities.create(
        {
          ...values,
          companyId: input.companyId,
          discoveredBy: principal.employeeId ?? principal.id,
        },
        principal.id,
      );
      return input.stage === created.stage
        ? created
        : this.store.opportunities.update(
            input.companyId,
            created.id,
            { stage: input.stage },
            principal.id,
          );
    });
  }

  saveLead(
    principal: WorkforceMcpPrincipal,
    input: Scope & {
      id?: string | undefined;
      opportunityId: string | null;
      name: string;
      organization: string;
      email: string | null;
      website: string | null;
      source: string;
      qualificationScore: number;
      status: "new" | "qualified" | "contacted" | "nurturing" | "won" | "lost" | "archived";
      ownerId: string | null;
      notes: string;
    },
  ) {
    return this.mutate(principal, input, "save_lead", () => {
      const values = businessValues(input);
      if (input.id) return this.store.leads.update(input.companyId, input.id, values, principal.id);
      const created = this.store.leads.create(
        { ...values, companyId: input.companyId },
        principal.id,
      );
      return input.status === created.status
        ? created
        : this.store.leads.update(
            input.companyId,
            created.id,
            { status: input.status },
            principal.id,
          );
    });
  }

  saveClient(
    principal: WorkforceMcpPrincipal,
    input: Scope & {
      id?: string | undefined;
      leadId: string | null;
      name: string;
      primaryContact: string;
      email: string | null;
      status: "prospect" | "active" | "paused" | "former" | "archived";
      ownerId: string | null;
      notes: string;
    },
  ) {
    return this.mutate(principal, input, "save_client", () => {
      const values = businessValues(input);
      if (input.id)
        return this.store.clients.update(input.companyId, input.id, values, principal.id);
      const created = this.store.clients.create(
        { ...values, companyId: input.companyId },
        principal.id,
      );
      return input.status === created.status
        ? created
        : this.store.clients.update(
            input.companyId,
            created.id,
            { status: input.status },
            principal.id,
          );
    });
  }

  saveEngagement(
    principal: WorkforceMcpPrincipal,
    input: Scope & {
      id?: string | undefined;
      clientId: string;
      projectId: string | null;
      name: string;
      status: "proposed" | "active" | "paused" | "completed" | "cancelled" | "archived";
      scope: string;
      successCriteria: string[];
      ownerId: string | null;
      startsAt: string | null;
      endsAt: string | null;
    },
  ) {
    return this.mutate(principal, input, "save_engagement", () => {
      const values = businessValues(input);
      if (input.id)
        return this.store.engagements.update(input.companyId, input.id, values, principal.id);
      const created = this.store.engagements.create(
        { ...values, companyId: input.companyId },
        principal.id,
      );
      return input.status === created.status
        ? created
        : this.store.engagements.update(
            input.companyId,
            created.id,
            { status: input.status },
            principal.id,
          );
    });
  }

  setArchived(
    principal: WorkforceMcpPrincipal,
    input: Scope & {
      recordType: "opportunity" | "lead" | "client" | "engagement";
      id: string;
      archived: boolean;
    },
  ) {
    return this.mutate(principal, input, "set_business_record_archived", () => {
      const method = input.archived ? "archive" : "restore";
      if (input.recordType === "opportunity")
        return this.store.opportunities[method](input.companyId, input.id, principal.id);
      if (input.recordType === "lead")
        return this.store.leads[method](input.companyId, input.id, principal.id);
      if (input.recordType === "client")
        return this.store.clients[method](input.companyId, input.id, principal.id);
      return this.store.engagements[method](input.companyId, input.id, principal.id);
    });
  }

  private mutate<T>(
    principal: WorkforceMcpPrincipal,
    input: Scope,
    operation: string,
    perform: () => T,
  ): T {
    authorizeMcp(principal, input.companyId, "business:mutate");
    return this.idempotency.execute({
      companyId: input.companyId,
      principalId: principal.id,
      operation,
      key: input.idempotencyKey,
      request: input,
      perform: () => {
        const result = perform();
        this.audit(principal, input.companyId, operation, "business:mutate");
        return result;
      },
    });
  }

  private audit(
    principal: WorkforceMcpPrincipal,
    companyId: string,
    operation: string,
    capability: string,
  ): void {
    this.store.audit.append("workforce-mcp.business", principal.id, companyId, {
      operation,
      capability,
    });
  }
}

function businessValues<T extends Scope & RecordIdentity>(
  input: T,
): Omit<T, "companyId" | "id" | "idempotencyKey"> {
  const values = { ...input };
  Reflect.deleteProperty(values, "companyId");
  Reflect.deleteProperty(values, "id");
  Reflect.deleteProperty(values, "idempotencyKey");
  return values;
}
