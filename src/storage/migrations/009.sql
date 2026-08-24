CREATE TABLE attempts (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), task_id TEXT NOT NULL,
 employee_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('queued','starting','running','succeeded','failed','timed-out','interrupted','infrastructure-blocked')),
 sandbox_json TEXT NOT NULL, command_json TEXT NOT NULL, container_name TEXT NOT NULL,
 exit_code INTEGER, failure_reason TEXT, queued_at TEXT NOT NULL, started_at TEXT, finished_at TEXT,
 updated_at TEXT NOT NULL
);
CREATE INDEX attempts_queue ON attempts(status,queued_at);
CREATE UNIQUE INDEX attempts_employee_active ON attempts(company_id,employee_id)
 WHERE status IN ('starting','running');
CREATE TABLE attempt_leases (
 attempt_id TEXT PRIMARY KEY REFERENCES attempts(id), company_id TEXT NOT NULL, employee_id TEXT NOT NULL,
 owner_id TEXT NOT NULL, acquired_at TEXT NOT NULL, expires_at TEXT NOT NULL,
 UNIQUE(company_id,employee_id)
);
CREATE TABLE attempt_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id TEXT NOT NULL REFERENCES attempts(id),
 at TEXT NOT NULL, kind TEXT NOT NULL, data_json TEXT NOT NULL
);
CREATE INDEX attempt_events_attempt ON attempt_events(attempt_id,sequence DESC);
