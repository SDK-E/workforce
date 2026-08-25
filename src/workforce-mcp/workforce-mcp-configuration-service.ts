import type { StateStore } from "../storage/state-store.js";
import type { EnvironmentRecord, ModelRecord, ToolRecord } from "../registries/registry-types.js";
import type { WorkforceMcpPrincipal } from "./mcp-principal.js";
import { authorizeMcp } from "./mcp-principal.js";
import { McpIdempotencyRepository } from "./mcp-idempotency-repository.js";

interface Scope {
  companyId: string;
  idempotencyKey: string;
}

type RoomMutation = Scope &
  (
    | { action: "create"; name: string; kind: string }
    | {
        action: "configure";
        roomId: string;
        retentionDays: number | null;
        announcement: string;
        status: "active" | "archived";
      }
    | {
        action: "add-member";
        roomId: string;
        employeeId: string;
        role: "member" | "moderator" | "owner";
      }
  );

type RegistryMutation = Scope &
  (
    | {
        registry: "tool";
        record: Omit<ToolRecord, "companyId" | "updatedAt" | "health" | "testReceiptId">;
      }
    | {
        registry: "environment";
        record: Omit<EnvironmentRecord, "companyId" | "updatedAt" | "health" | "healthReceiptId">;
      }
    | {
        registry: "model";
        record: Omit<
          ModelRecord,
          | "companyId"
          | "updatedAt"
          | "health"
          | "verifiedAt"
          | "verificationReceiptId"
          | "failureClass"
        >;
      }
  );

export class WorkforceMcpConfigurationService {
  private readonly idempotency: McpIdempotencyRepository;

  constructor(private readonly store: StateStore) {
    this.idempotency = new McpIdempotencyRepository(store.database);
  }

  configureRoom(principal: WorkforceMcpPrincipal, input: RoomMutation) {
    return this.mutate(principal, input, "configure_room", () => {
      if (input.action === "create")
        return this.store.conversations.rooms.create(
          input.companyId,
          input.name,
          input.kind,
          principal.id,
        );
      if (input.action === "add-member")
        return this.store.conversations.rooms.addMember(
          input.companyId,
          input.roomId,
          input.employeeId,
          input.role,
          principal.id,
        );
      this.store.conversations.rooms.configure(
        input.companyId,
        input.roomId,
        {
          retentionDays: input.retentionDays,
          announcement: input.announcement,
          status: input.status,
        },
        principal.id,
      );
      return this.store.conversations.rooms
        .list(input.companyId)
        .find(({ id }) => id === input.roomId);
    });
  }

  configureRegistry(principal: WorkforceMcpPrincipal, input: RegistryMutation) {
    return this.mutate(principal, input, "configure_registry", () => {
      if (input.registry === "tool")
        return this.store.tools.save(
          {
            ...input.record,
            companyId: input.companyId,
            health: "unknown",
            testReceiptId: null,
          },
          principal.id,
        );
      if (input.registry === "environment")
        return this.store.environments.save(
          {
            ...input.record,
            companyId: input.companyId,
            health: "unknown",
            healthReceiptId: null,
          },
          principal.id,
        );
      return this.store.models.save(
        {
          ...input.record,
          companyId: input.companyId,
          health: "unknown",
          verifiedAt: null,
          verificationReceiptId: null,
          failureClass: null,
        },
        principal.id,
      );
    });
  }

  private mutate<T>(
    principal: WorkforceMcpPrincipal,
    input: Scope,
    operation: string,
    perform: () => T,
  ): T {
    authorizeMcp(principal, input.companyId, "company:manage");
    return this.idempotency.execute({
      companyId: input.companyId,
      principalId: principal.id,
      operation,
      key: input.idempotencyKey,
      request: input,
      perform: () => {
        const result = perform();
        this.store.audit.append("workforce-mcp.management", principal.id, input.companyId, {
          operation,
          capability: "company:manage",
        });
        return result;
      },
    });
  }
}
