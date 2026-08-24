CREATE TABLE meetings (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), title TEXT NOT NULL,
 organizer_id TEXT NOT NULL, participant_ids_json TEXT NOT NULL, agenda_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('planned','active','adjourned','cancelled','archived')),
 minutes TEXT NOT NULL DEFAULT '', scheduled_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id)
);
CREATE TABLE meeting_action_items (
 id TEXT NOT NULL, company_id TEXT NOT NULL, meeting_id TEXT NOT NULL, owner_id TEXT NOT NULL,
 description TEXT NOT NULL, due_at TEXT, status TEXT NOT NULL CHECK(status IN ('open','completed','cancelled')),
 created_at TEXT NOT NULL, completed_at TEXT, PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,meeting_id) REFERENCES meetings(company_id,id)
);
CREATE TABLE incidents (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), title TEXT NOT NULL,
 severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
 status TEXT NOT NULL CHECK(status IN ('reported','triaged','investigating','contained','resolved','closed')),
 reporter_id TEXT NOT NULL, owner_id TEXT, evidence_json TEXT NOT NULL, summary TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(company_id,id)
);
CREATE TABLE corrective_actions (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), employee_id TEXT NOT NULL,
 incident_id TEXT, kind TEXT NOT NULL CHECK(kind IN ('coaching','warning','restriction','suspension')),
 status TEXT NOT NULL CHECK(status IN ('drafted','issued','acknowledged','challenged','resolved','archived')),
 rationale TEXT NOT NULL, evidence_ids_json TEXT NOT NULL, issued_by TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,employee_id) REFERENCES employees(company_id,id),
 FOREIGN KEY(company_id,incident_id) REFERENCES incidents(company_id,id)
);
CREATE TABLE performance_records (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), employee_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('observation','recognition','warning','review','challenge')),
 summary TEXT NOT NULL, evidence_ids_json TEXT NOT NULL, author_id TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,employee_id) REFERENCES employees(company_id,id)
);
CREATE TABLE claims (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), subject_id TEXT NOT NULL,
 predicate TEXT NOT NULL, value_json TEXT NOT NULL, evidence_ids_json TEXT NOT NULL,
 confidence REAL NOT NULL CHECK(confidence>=0 AND confidence<=1), status TEXT NOT NULL CHECK(status IN ('asserted','disputed','retracted')),
 author_id TEXT NOT NULL, contradicted_by TEXT, created_at TEXT NOT NULL, PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,contradicted_by) REFERENCES claims(company_id,id)
);
CREATE INDEX claims_subject ON claims(company_id,subject_id,predicate,status,created_at DESC);
