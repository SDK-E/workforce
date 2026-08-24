import { randomUUID } from "node:crypto";
import type { AuditRepository } from "../storage/audit-repository.js";
import type { CompanyRepository } from "../storage/company-repository.js";
import type { WorkforceDatabase } from "../storage/database.js";
import { parseJson } from "../storage/serialization.js";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import {
  nextCorrectiveStatus,
  nextIncidentStatus,
  type CorrectiveEvent,
  type CorrectiveStatus,
  type IncidentEvent,
  type IncidentStatus,
} from "./incident-machines.js";

export interface IncidentRecord {
  id: string;
  companyId: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: IncidentStatus;
  reporterId: string;
  ownerId: string | null;
  evidenceIds: string[];
  summary: string;
  createdAt: string;
  updatedAt: string;
}
export interface CorrectiveActionRecord {
  id: string;
  companyId: string;
  employeeId: string;
  incidentId: string | null;
  kind: "coaching" | "warning" | "restriction" | "suspension";
  status: CorrectiveStatus;
  rationale: string;
  evidenceIds: string[];
  issuedBy: string;
  createdAt: string;
  updatedAt: string;
}

export class IncidentRepository {
  constructor(
    private readonly database: WorkforceDatabase,
    private readonly companies: CompanyRepository,
    private readonly audit: AuditRepository,
  ) {}

  report(input: {
    companyId: string;
    title: string;
    severity: IncidentRecord["severity"];
    reporterId: string;
    summary: string;
    evidenceIds: string[];
  }): IncidentRecord {
    this.companies.require(input.companyId);
    const now = new Date().toISOString();
    const incident: IncidentRecord = {
      ...input,
      id: randomUUID(),
      title: sanitizeTerminal(input.title, 200),
      summary: sanitizeTerminal(input.summary, 5_000),
      status: "reported",
      ownerId: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!incident.title || !incident.summary || incident.evidenceIds.length === 0)
      throw new Error("Incident title, summary, and evidence are required");
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO incidents VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          incident.id,
          incident.companyId,
          incident.title,
          incident.severity,
          incident.status,
          incident.reporterId,
          null,
          JSON.stringify(incident.evidenceIds),
          incident.summary,
          now,
          now,
        );
      this.audit.append("incident.reported", input.reporterId, input.companyId, {
        incidentId: incident.id,
        severity: incident.severity,
      });
    });
    return incident;
  }

  transition(
    companyId: string,
    incidentId: string,
    event: IncidentEvent,
    actorId: string,
  ): IncidentRecord {
    const current = this.requireIncident(companyId, incidentId);
    const status = nextIncidentStatus(current.status, event);
    this.database.transaction(() => {
      this.database.connection
        .prepare(
          "UPDATE incidents SET status=?, owner_id=?, updated_at=? WHERE company_id=? AND id=?",
        )
        .run(status, current.ownerId ?? actorId, new Date().toISOString(), companyId, incidentId);
      this.audit.append("incident.transitioned", actorId, companyId, {
        incidentId,
        from: current.status,
        to: status,
      });
    });
    return this.requireIncident(companyId, incidentId);
  }

  draftCorrective(input: {
    companyId: string;
    employeeId: string;
    incidentId?: string | null;
    kind: CorrectiveActionRecord["kind"];
    rationale: string;
    evidenceIds: string[];
    issuedBy: string;
  }): CorrectiveActionRecord {
    this.requireEmployee(input.companyId, input.employeeId);
    if (input.incidentId) this.requireIncident(input.companyId, input.incidentId);
    if (input.evidenceIds.length === 0) throw new Error("Corrective action requires evidence");
    const now = new Date().toISOString();
    const action: CorrectiveActionRecord = {
      ...input,
      id: randomUUID(),
      incidentId: input.incidentId ?? null,
      status: "drafted",
      rationale: sanitizeTerminal(input.rationale, 5_000),
      createdAt: now,
      updatedAt: now,
    };
    this.database.transaction(() => {
      this.database.connection
        .prepare("INSERT INTO corrective_actions VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          action.id,
          action.companyId,
          action.employeeId,
          action.incidentId,
          action.kind,
          action.status,
          action.rationale,
          JSON.stringify(action.evidenceIds),
          action.issuedBy,
          now,
          now,
        );
      this.audit.append("corrective-action.drafted", input.issuedBy, input.companyId, {
        actionId: action.id,
        employeeId: input.employeeId,
      });
    });
    return action;
  }

  transitionCorrective(
    companyId: string,
    actionId: string,
    event: CorrectiveEvent,
    actorId: string,
  ): CorrectiveActionRecord {
    const current = this.requireCorrective(companyId, actionId);
    const status = nextCorrectiveStatus(current.status, event);
    this.database.transaction(() => {
      this.database.connection
        .prepare("UPDATE corrective_actions SET status=?, updated_at=? WHERE company_id=? AND id=?")
        .run(status, new Date().toISOString(), companyId, actionId);
      this.audit.append("corrective-action.transitioned", actorId, companyId, {
        actionId,
        from: current.status,
        to: status,
      });
    });
    return this.requireCorrective(companyId, actionId);
  }

  listIncidents(companyId: string): IncidentRecord[] {
    const rows = this.database.connection
      .prepare("SELECT id FROM incidents WHERE company_id=? ORDER BY created_at DESC")
      .all(companyId) as { id: string }[];
    return rows.map(({ id }) => this.requireIncident(companyId, id));
  }

  listCorrective(companyId: string): CorrectiveActionRecord[] {
    const rows = this.database.connection
      .prepare("SELECT id FROM corrective_actions WHERE company_id=? ORDER BY created_at DESC")
      .all(companyId) as { id: string }[];
    return rows.map(({ id }) => this.requireCorrective(companyId, id));
  }

  private requireEmployee(companyId: string, id: string): void {
    if (!this.companies.employees(companyId).some((employee) => employee.id === id))
      throw new Error(`Unknown employee in company: ${id}`);
  }
  private requireIncident(companyId: string, id: string): IncidentRecord {
    const row = this.database.connection
      .prepare("SELECT * FROM incidents WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown incident in company: ${id}`);
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      title: String(row.title),
      severity: String(row.severity) as IncidentRecord["severity"],
      status: String(row.status) as IncidentStatus,
      reporterId: String(row.reporter_id),
      ownerId: typeof row.owner_id === "string" ? row.owner_id : null,
      evidenceIds: parseJson(row.evidence_json),
      summary: String(row.summary),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
  private requireCorrective(companyId: string, id: string): CorrectiveActionRecord {
    const row = this.database.connection
      .prepare("SELECT * FROM corrective_actions WHERE company_id=? AND id=?")
      .get(companyId, id) as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Unknown corrective action in company: ${id}`);
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      employeeId: String(row.employee_id),
      incidentId: typeof row.incident_id === "string" ? row.incident_id : null,
      kind: String(row.kind) as CorrectiveActionRecord["kind"],
      status: String(row.status) as CorrectiveStatus,
      rationale: String(row.rationale),
      evidenceIds: parseJson(row.evidence_ids_json),
      issuedBy: String(row.issued_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
