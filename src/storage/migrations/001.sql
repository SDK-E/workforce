CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE companies (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, display_name TEXT NOT NULL, mission TEXT NOT NULL DEFAULT '',
 vision TEXT NOT NULL DEFAULT '', values_json TEXT NOT NULL DEFAULT '[]', policies_json TEXT NOT NULL DEFAULT '{}',
 budget_cents INTEGER NOT NULL DEFAULT 0 CHECK (budget_cents >= 0), created_at TEXT NOT NULL
);
CREATE TABLE employees (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL, title TEXT NOT NULL,
 role TEXT NOT NULL, department TEXT NOT NULL, manager_id TEXT, status TEXT NOT NULL,
 responsibilities_json TEXT NOT NULL, capabilities_json TEXT NOT NULL, hired_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,manager_id) REFERENCES employees(company_id,id)
);
CREATE TABLE rooms (id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(company_id,id));
CREATE TABLE messages (id TEXT PRIMARY KEY, company_id TEXT NOT NULL, room_id TEXT NOT NULL, thread_id TEXT, author_id TEXT NOT NULL, body TEXT NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, FOREIGN KEY(company_id,room_id) REFERENCES rooms(company_id,id));
CREATE INDEX messages_room_time ON messages(company_id,room_id,created_at DESC);
CREATE TABLE events (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, at TEXT NOT NULL, type TEXT NOT NULL, actor TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), data_json TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT UNIQUE NOT NULL);
CREATE INDEX events_company_sequence ON events(company_id,sequence DESC);
CREATE TABLE approvals (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, requested_by TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')), rationale TEXT NOT NULL DEFAULT '', decided_by TEXT, created_at TEXT NOT NULL, decided_at TEXT);
CREATE INDEX approvals_pending ON approvals(company_id,status,created_at);
CREATE TABLE evidence (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, kind TEXT NOT NULL, uri TEXT NOT NULL, digest TEXT NOT NULL, observed_at TEXT NOT NULL, validator TEXT, valid INTEGER);
CREATE INDEX evidence_subject ON evidence(company_id,subject_type,subject_id);
CREATE TABLE settings (key TEXT PRIMARY KEY,value_json TEXT NOT NULL);
