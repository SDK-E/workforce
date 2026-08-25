import type { StateStore } from "../storage/state-store.js";
import { authorizeMcp, isCompanyManager, type WorkforceMcpPrincipal } from "./mcp-principal.js";

export class WorkforceMcpParticipationService {
  constructor(private readonly store: StateStore) {}

  listRooms(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "message:read");
    const rooms = this.store.conversations.rooms.list(companyId);
    this.recordUse(principal, companyId, "list_rooms", false);
    if (isCompanyManager(principal)) return rooms;
    const employeeId = requireEmployee(principal);
    const joined = new Set(
      this.store.conversations.rooms.memberships(companyId, employeeId).map(({ roomId }) => roomId),
    );
    return rooms.filter(({ id }) => joined.has(id));
  }

  sendMessage(
    principal: WorkforceMcpPrincipal,
    input: { companyId: string; roomId: string; body: string; threadId?: string | undefined },
  ) {
    authorizeMcp(principal, input.companyId, "message:write");
    const employeeId = requireEmployee(principal);
    if (!isCompanyManager(principal)) {
      const joined = this.store.conversations.rooms
        .memberships(input.companyId, employeeId)
        .some(({ roomId }) => roomId === input.roomId);
      if (!joined) throw new Error("MCP room access denied");
    }
    const message = this.store.conversations.addMessage(
      input.companyId,
      input.roomId,
      employeeId,
      input.body,
      input.threadId ?? null,
    );
    this.recordUse(principal, input.companyId, "send_message", true);
    return message;
  }

  inbox(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "mail:read");
    const inbox = this.store.mail.inbox(companyId, "agent", requireEmployee(principal));
    this.recordUse(principal, companyId, "list_mail", false);
    return inbox;
  }

  sendMail(
    principal: WorkforceMcpPrincipal,
    input: { companyId: string; recipientId: string; subject: string; body: string },
  ) {
    authorizeMcp(principal, input.companyId, "mail:write");
    const mail = this.store.mail.send({
      companyId: input.companyId,
      senderKind: "agent",
      senderId: requireEmployee(principal),
      recipientKind: "agent",
      recipientId: input.recipientId,
      subject: input.subject,
      body: input.body,
    });
    this.recordUse(principal, input.companyId, "send_mail", true);
    return mail;
  }

  listMeetings(principal: WorkforceMcpPrincipal, companyId: string) {
    authorizeMcp(principal, companyId, "meeting:read");
    const meetings = this.store.meetings.list(companyId);
    this.recordUse(principal, companyId, "list_meetings", false);
    if (isCompanyManager(principal)) return meetings;
    const employeeId = requireEmployee(principal);
    return meetings.filter(
      ({ organizerId, participantIds }) =>
        organizerId === employeeId || participantIds.includes(employeeId),
    );
  }

  contributeMeeting(
    principal: WorkforceMcpPrincipal,
    input: { companyId: string; meetingId: string; body: string },
  ) {
    authorizeMcp(principal, input.companyId, "meeting:write");
    const contribution = this.store.meetingContributions.create(
      input.companyId,
      input.meetingId,
      requireEmployee(principal),
      input.body,
    );
    this.recordUse(principal, input.companyId, "contribute_meeting", true);
    return contribution;
  }

  checkpoint(
    principal: WorkforceMcpPrincipal,
    input: {
      companyId: string;
      taskId: string;
      summary: string;
      progressPercent: number;
      blockers: string[];
    },
  ) {
    authorizeMcp(principal, input.companyId, "checkpoint:write");
    const employeeId = requireEmployee(principal);
    const task = this.store.tasksRepository.get(input.companyId, input.taskId);
    if (task?.assigneeId !== employeeId)
      throw new Error("Only the assigned employee can checkpoint this task");
    const checkpoint = this.store.taskCheckpoints.create({ ...input, employeeId });
    this.recordUse(principal, input.companyId, "update_task_checkpoint", true);
    return checkpoint;
  }

  private recordUse(
    principal: WorkforceMcpPrincipal,
    companyId: string,
    operation: string,
    mutation: boolean,
  ): void {
    this.store.audit.append(
      mutation ? "workforce-mcp.mutation" : "workforce-mcp.read",
      principal.id,
      companyId,
      { operation, role: principal.role, employeeId: principal.employeeId },
    );
  }
}

function requireEmployee(principal: WorkforceMcpPrincipal): string {
  if (!principal.employeeId) throw new Error("MCP operation requires an employee identity");
  return principal.employeeId;
}
