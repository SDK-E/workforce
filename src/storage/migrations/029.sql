CREATE TABLE reinforcement_plans (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), employee_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('active','succeeded','failed','cancelled')),
 rationale TEXT NOT NULL, criteria_json TEXT NOT NULL, evidence_ids_json TEXT NOT NULL,
 created_by TEXT NOT NULL, review_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id)
);
CREATE INDEX reinforcement_plans_employee
 ON reinforcement_plans(company_id,employee_id,status,created_at DESC);

CREATE TABLE arm_decisions (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id),
 action TEXT NOT NULL, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL,
 reference_id TEXT NOT NULL, rationale TEXT NOT NULL, evidence_ids_json TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(company_id,id),
 UNIQUE(company_id,action,reference_id)
);
CREATE INDEX arm_decisions_company ON arm_decisions(company_id,created_at DESC);
