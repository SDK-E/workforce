CREATE TABLE artifacts (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 task_id TEXT NOT NULL,
 attempt_id TEXT NOT NULL,
 relative_path TEXT NOT NULL,
 media_type TEXT NOT NULL,
 size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
 sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
 storage_path TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(attempt_id, relative_path),
 FOREIGN KEY(attempt_id) REFERENCES attempts(id)
);
CREATE INDEX artifacts_company_task_idx ON artifacts(company_id, task_id, created_at);

CREATE TABLE validator_receipts (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 task_id TEXT NOT NULL,
 attempt_id TEXT NOT NULL,
 artifact_id TEXT,
 validator TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('passed','failed','blocked')),
 details_json TEXT NOT NULL,
 observed_at TEXT NOT NULL,
 FOREIGN KEY(attempt_id) REFERENCES attempts(id),
 FOREIGN KEY(artifact_id) REFERENCES artifacts(id)
);
CREATE INDEX validator_receipts_attempt_idx ON validator_receipts(attempt_id, observed_at);

CREATE TABLE raw_attempt_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 attempt_id TEXT NOT NULL,
 observed_at TEXT NOT NULL,
 source TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 FOREIGN KEY(attempt_id) REFERENCES attempts(id)
);

CREATE TABLE normalized_activities (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 task_id TEXT NOT NULL,
 attempt_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 summary TEXT NOT NULL,
 evidence_ids_json TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 FOREIGN KEY(attempt_id) REFERENCES attempts(id)
);
CREATE INDEX normalized_activities_company_idx
 ON normalized_activities(company_id, occurred_at);

CREATE TABLE acceptance_decisions (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 task_id TEXT NOT NULL,
 attempt_id TEXT NOT NULL,
 accepted INTEGER NOT NULL CHECK(accepted IN (0,1)),
 reasons_json TEXT NOT NULL,
 criterion_results_json TEXT NOT NULL,
 decided_by TEXT NOT NULL,
 decided_at TEXT NOT NULL,
 FOREIGN KEY(attempt_id) REFERENCES attempts(id)
);
CREATE INDEX acceptance_decisions_task_idx
 ON acceptance_decisions(company_id, task_id, decided_at);
