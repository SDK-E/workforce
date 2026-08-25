import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";

export interface MeetingContributionRecord {
  id: string;
  companyId: string;
  meetingId: string;
  employeeId: string;
  body: string;
  createdAt: string;
}

export class MeetingContributionRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly audit: AuditRepository,
  ) {}

  create(
    companyId: string,
    meetingId: string,
    employeeId: string,
    body: string,
  ): MeetingContributionRecord {
    const meeting = this.database.connection
      .prepare("SELECT organizer_id,participant_ids_json FROM meetings WHERE company_id=? AND id=?")
      .get(companyId, meetingId) as
      | { organizer_id: string; participant_ids_json: string }
      | undefined;
    const participants = meeting ? parseJson<string[]>(meeting.participant_ids_json) : [];
    if (!meeting || (meeting.organizer_id !== employeeId && !participants.includes(employeeId)))
      throw new Error("Only meeting participants can contribute");
    const record = {
      id: randomUUID(),
      companyId,
      meetingId,
      employeeId,
      body: sanitizeTerminal(body, 4_000),
      createdAt: new Date().toISOString(),
    };
    if (!record.body) throw new Error("Meeting contribution body is required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO meeting_contributions VALUES (?,?,?,?,?,?)")
        .run(record.id, companyId, meetingId, employeeId, record.body, record.createdAt);
      this.audit.append("meeting.contribution-added", employeeId, companyId, {
        meetingId,
        contributionId: record.id,
      });
    });
    return record;
  }

  list(companyId: string, meetingId: string): MeetingContributionRecord[] {
    const rows = this.database.connection
      .prepare(
        "SELECT * FROM meeting_contributions WHERE company_id=? AND meeting_id=? ORDER BY created_at",
      )
      .all(companyId, meetingId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      meetingId: String(row.meeting_id),
      employeeId: String(row.employee_id),
      body: String(row.body),
      createdAt: String(row.created_at),
    }));
  }
}
