CREATE TABLE workforce_gaps (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), job_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('capability','capacity','temporary')), missing_json TEXT NOT NULL,
 alternatives_json TEXT NOT NULL, recommendation TEXT NOT NULL, created_by TEXT NOT NULL,
 created_at TEXT NOT NULL, resolved_at TEXT
);
CREATE INDEX workforce_gaps_company ON workforce_gaps(company_id,resolved_at,created_at DESC);
CREATE TABLE hiring_proposals (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), job_id TEXT NOT NULL,
 employee_id TEXT NOT NULL, blueprint_json TEXT NOT NULL, probation_criteria_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('proposed','approved','rejected','withdrawn')),
 proposed_by TEXT NOT NULL, decided_by TEXT, rationale TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, decided_at TEXT, UNIQUE(company_id,employee_id)
);
CREATE INDEX hiring_proposals_company ON hiring_proposals(company_id,status,created_at DESC);
CREATE TABLE employment_transitions (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL, employee_id TEXT NOT NULL,
 from_status TEXT NOT NULL, to_status TEXT NOT NULL, event TEXT NOT NULL, actor_id TEXT NOT NULL,
 rationale TEXT NOT NULL, occurred_at TEXT NOT NULL,
 FOREIGN KEY(company_id,employee_id) REFERENCES employees(company_id,id)
);
CREATE INDEX employment_transitions_employee ON employment_transitions(company_id,employee_id,sequence);
