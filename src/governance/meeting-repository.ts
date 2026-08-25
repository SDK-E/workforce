import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { nextMeetingStatus, type MeetingEvent, type MeetingStatus } from "./meeting-machine.js";

export interface MeetingRecord {
  id: string;
  companyId: string;
  title: string;
  organizerId: string;
  participantIds: string[];
  agenda: string[];
  status: MeetingStatus;
  minutes: string;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
}
export interface ActionItemRecord {
  id: string;
  companyId: string;
  meetingId: string;
  ownerId: string;
  description: string;
  dueAt: string | null;
  status: "open" | "completed" | "cancelled";
  createdAt: string;
  completedAt: string | null;
}

export class MeetingRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(input: {
    companyId: string;
    title: string;
    organizerId: string;
    participantIds: string[];
    agenda: string[];
    scheduledAt: string;
  }): MeetingRecord {
    this.companies.require(input.companyId);
    for (const id of [input.organizerId, ...input.participantIds])
      this.requireEmployee(input.companyId, id);
    const now = new Date().toISOString();
    const meeting: MeetingRecord = {
      ...input,
      id: randomUUID(),
      title: sanitizeTerminal(input.title, 200),
      agenda: input.agenda.map((item) => sanitizeTerminal(item, 500)),
      status: "planned",
      minutes: "",
      createdAt: now,
      updatedAt: now,
    };
    if (!meeting.title || meeting.agenda.length === 0)
      throw new Error("Meeting title and agenda are required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO meetings VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          meeting.id,
          meeting.companyId,
          meeting.title,
          meeting.organizerId,
          JSON.stringify(meeting.participantIds),
          JSON.stringify(meeting.agenda),
          meeting.status,
          meeting.minutes,
          meeting.scheduledAt,
          now,
          now,
        );
      this.audit.append("meeting.created", input.organizerId, input.companyId, {
        meetingId: meeting.id,
      });
    });
    return meeting;
  }

  transition(
    companyId: string,
    meetingId: string,
    event: MeetingEvent,
    actorId: string,
    minutes?: string,
  ): MeetingRecord {
    const current = this.require(companyId, meetingId);
    const status = nextMeetingStatus(current.status, event);
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "UPDATE meetings SET status=?, minutes=?, updated_at=? WHERE company_id=? AND id=?",
        )
        .run(
          status,
          sanitizeTerminal(minutes ?? current.minutes),
          new Date().toISOString(),
          companyId,
          meetingId,
        );
      this.audit.append("meeting.transitioned", actorId, companyId, {
        meetingId,
        from: current.status,
        to: status,
      });
    });
    return this.require(companyId, meetingId);
  }

  archive(companyId: string, meetingId: string, actorId: string): MeetingRecord {
    const current = this.require(companyId, meetingId);
    if (current.status === "archived") return current;
    if (current.status === "planned" || current.status === "active")
      this.transition(companyId, meetingId, "CANCEL", actorId);
    return this.transition(companyId, meetingId, "ARCHIVE", actorId);
  }

  restore(companyId: string, meetingId: string, actorId: string): MeetingRecord {
    return this.transition(companyId, meetingId, "RESTORE", actorId);
  }

  update(input: {
    companyId: string;
    meetingId: string;
    title: string;
    organizerId: string;
    participantIds: string[];
    agenda: string[];
    scheduledAt: string;
    actorId: string;
  }): MeetingRecord {
    const current = this.require(input.companyId, input.meetingId);
    if (current.status !== "planned") throw new Error("Only planned meetings can be edited");
    for (const id of [input.organizerId, ...input.participantIds])
      this.requireEmployee(input.companyId, id);
    const title = sanitizeTerminal(input.title, 200);
    const agenda = input.agenda.map((item) => sanitizeTerminal(item, 500)).filter(Boolean);
    if (!title || agenda.length === 0) throw new Error("Meeting title and agenda are required");
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE meetings SET title=?,organizer_id=?,participant_ids_json=?,agenda_json=?,scheduled_at=?,updated_at=?
           WHERE company_id=? AND id=?`,
        )
        .run(
          title,
          input.organizerId,
          JSON.stringify(input.participantIds),
          JSON.stringify(agenda),
          input.scheduledAt,
          new Date().toISOString(),
          input.companyId,
          input.meetingId,
        );
      this.audit.append("meeting.updated", input.actorId, input.companyId, {
        meetingId: input.meetingId,
      });
    });
    return this.require(input.companyId, input.meetingId);
  }

  addActionItem(input: {
    companyId: string;
    meetingId: string;
    ownerId: string;
    description: string;
    dueAt?: string | null;
    actorId: string;
  }): ActionItemRecord {
    this.require(input.companyId, input.meetingId);
    this.requireEmployee(input.companyId, input.ownerId);
    const item: ActionItemRecord = {
      id: randomUUID(),
      companyId: input.companyId,
      meetingId: input.meetingId,
      ownerId: input.ownerId,
      description: sanitizeTerminal(input.description, 1_000),
      dueAt: input.dueAt ?? null,
      status: "open",
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    if (!item.description) throw new Error("Action item description is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO meeting_action_items VALUES (?,?,?,?,?,?,?,?,NULL)")
        .run(
          item.id,
          item.companyId,
          item.meetingId,
          item.ownerId,
          item.description,
          item.dueAt,
          item.status,
          item.createdAt,
        );
      this.audit.append("meeting.action-created", input.actorId, input.companyId, {
        meetingId: input.meetingId,
        actionItemId: item.id,
      });
    });
    return item;
  }

  list(companyId: string): MeetingRecord[] {
    return (
      this.database.connection
        .prepare("SELECT * FROM meetings WHERE company_id=? ORDER BY scheduled_at DESC")
        .all(companyId) as Record<string, unknown>[]
    ).map((row) => this.map(row));
  }

  private require(companyId: string, id: string): MeetingRecord {
    const row = this.database.connection
      .prepare("SELECT * FROM meetings WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown meeting in company: ${id}`);
    return this.map(row);
  }

  private requireEmployee(companyId: string, id: string): void {
    if (!this.companies.employees(companyId).some((employee) => employee.id === id))
      throw new Error(`Unknown employee in company: ${id}`);
  }

  private map(row: Record<string, unknown>): MeetingRecord {
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      title: String(row.title),
      organizerId: String(row.organizer_id),
      participantIds: parseJson(row.participant_ids_json),
      agenda: parseJson(row.agenda_json),
      status: String(row.status) as MeetingStatus,
      minutes: String(row.minutes),
      scheduledAt: String(row.scheduled_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
