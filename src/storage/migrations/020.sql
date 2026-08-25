ALTER TABLE automation_requests ADD COLUMN next_run_at TEXT;
ALTER TABLE automation_requests ADD COLUMN last_run_at TEXT;

CREATE TABLE automation_runs (
 id TEXT PRIMARY KEY,
 automation_id TEXT NOT NULL REFERENCES automation_requests(id),
 company_id TEXT NOT NULL REFERENCES companies(id),
 scheduled_for TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('running','succeeded','failed','skipped')),
 task_id TEXT,
 attempt_id TEXT,
 error TEXT,
 started_at TEXT NOT NULL,
 finished_at TEXT,
 UNIQUE(automation_id,scheduled_for)
);
CREATE INDEX automation_runs_company_status
 ON automation_runs(company_id,status,started_at DESC);

