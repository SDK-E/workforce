import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { requireRoom } from "./conversation-guards.js";
import type { RoomMembership, RoomRecord } from "./conversation-types.js";

export class RoomRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  create(companyId: string, name: string, kind: string, actorId: string): RoomRecord {
    this.companies.require(companyId);
    const now = new Date().toISOString();
    const room: RoomRecord = {
      id: randomUUID(),
      companyId,
      name: sanitizeTerminal(name, 200),
      kind: sanitizeTerminal(kind, 80),
      retentionDays: null,
      announcement: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    if (!room.name || !room.kind) throw new Error("Room name and kind are required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO rooms VALUES (?, ?, ?, ?, ?)")
        .run(room.id, companyId, room.name, room.kind, now);
      this.database.connection
        .prepare("INSERT INTO room_settings VALUES (?, ?, ?, ?, ?, ?)")
        .run(companyId, room.id, null, "", "active", now);
      this.audit.append("room.created", actorId, companyId, { roomId: room.id, kind: room.kind });
    });
    return room;
  }

  configure(
    companyId: string,
    roomId: string,
    input: { retentionDays: number | null; announcement: string; status: RoomRecord["status"] },
    actorId: string,
  ): void {
    requireRoom(this.database, companyId, roomId);
    if (input.retentionDays !== null && input.retentionDays < 1)
      throw new Error("Retention must be at least one day");
    const announcement = sanitizeTerminal(input.announcement, 2_000);
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE room_settings SET retention_days = ?, announcement = ?, status = ?, updated_at = ?
           WHERE company_id = ? AND room_id = ?`,
        )
        .run(
          input.retentionDays,
          announcement,
          input.status,
          new Date().toISOString(),
          companyId,
          roomId,
        );
      this.audit.append("room.configured", actorId, companyId, { roomId, ...input });
    });
  }

  update(
    companyId: string,
    roomId: string,
    input: {
      name: string;
      kind: string;
      retentionDays: number | null;
      announcement: string;
    },
    actorId: string,
  ): RoomRecord {
    requireRoom(this.database, companyId, roomId);
    const name = sanitizeTerminal(input.name, 200);
    const kind = sanitizeTerminal(input.kind, 80);
    if (!name || !kind) throw new Error("Room name and kind are required");
    if (input.retentionDays !== null && input.retentionDays < 1)
      throw new Error("Retention must be at least one day");
    const announcement = sanitizeTerminal(input.announcement, 2_000);
    const current = this.list(companyId).find((item) => item.id === roomId);
    if (!current) throw new Error(`Unknown room in company: ${roomId}`);
    this.database.transaction(() => {
      this.database.connection
        .prepare("UPDATE rooms SET name=?,kind=? WHERE company_id=? AND id=?")
        .run(name, kind, companyId, roomId);
      this.database.connection
        .prepare(
          "UPDATE room_settings SET retention_days=?,announcement=?,updated_at=? WHERE company_id=? AND room_id=?",
        )
        .run(input.retentionDays, announcement, new Date().toISOString(), companyId, roomId);
      this.audit.append("room.updated", actorId, companyId, { roomId, name, kind });
    });
    const updated = this.list(companyId).find((item) => item.id === roomId);
    if (!updated) throw new Error(`Unknown room in company: ${roomId}`);
    return updated;
  }

  addMember(
    companyId: string,
    roomId: string,
    employeeId: string,
    role: RoomMembership["role"],
    actorId: string,
  ): RoomMembership {
    requireRoom(this.database, companyId, roomId);
    const employee = this.database.connection
      .prepare("SELECT 1 FROM employees WHERE company_id = ? AND id = ?")
      .get(companyId, employeeId);
    if (!employee) throw new Error(`Unknown employee in company: ${employeeId}`);
    const membership = { companyId, roomId, employeeId, role, joinedAt: new Date().toISOString() };
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          `INSERT INTO room_memberships VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(company_id,room_id,employee_id) DO UPDATE SET role = excluded.role`,
        )
        .run(companyId, roomId, employeeId, role, membership.joinedAt);
      this.audit.append("room.membership-upserted", actorId, companyId, {
        roomId,
        employeeId,
        role,
      });
    });
    return membership;
  }

  list(companyId: string): RoomRecord[] {
    const rows = this.database.connection
      .prepare(
        `SELECT r.*, s.retention_days, s.announcement, s.status, s.updated_at
         FROM rooms r JOIN room_settings s ON s.company_id=r.company_id AND s.room_id=r.id
         WHERE r.company_id = ? ORDER BY r.name`,
      )
      .all(companyId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      companyId: String(row.company_id),
      name: String(row.name),
      kind: String(row.kind),
      retentionDays: typeof row.retention_days === "number" ? row.retention_days : null,
      announcement: String(row.announcement),
      status: String(row.status) as RoomRecord["status"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  memberships(companyId: string, employeeId: string): RoomMembership[] {
    const rows = this.database.connection
      .prepare(
        "SELECT * FROM room_memberships WHERE company_id=? AND employee_id=? ORDER BY joined_at",
      )
      .all(companyId, employeeId) as Record<string, unknown>[];
    return rows.map((row) => ({
      companyId: String(row.company_id),
      roomId: String(row.room_id),
      employeeId: String(row.employee_id),
      role: String(row.role) as RoomMembership["role"],
      joinedAt: String(row.joined_at),
    }));
  }
}
