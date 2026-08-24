CREATE TABLE company_runtime (
 company_id TEXT PRIMARY KEY REFERENCES companies(id), enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 cadence_seconds INTEGER NOT NULL CHECK(cadence_seconds>=10), monthly_budget_cents INTEGER NOT NULL CHECK(monthly_budget_cents>=0),
 max_concurrent_attempts INTEGER NOT NULL CHECK(max_concurrent_attempts BETWEEN 1 AND 32),
 state TEXT NOT NULL CHECK(state IN ('idle','running','blocked','stopped')),
 last_cycle_at TEXT, next_cycle_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE operating_cycles (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), leader_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('leased','completed','blocked','failed')),
 lease_owner TEXT NOT NULL, lease_expires_at TEXT NOT NULL, observation_json TEXT NOT NULL,
 decision_json TEXT, spawned_task_id TEXT, started_at TEXT NOT NULL, finished_at TEXT,
 failure_reason TEXT
);
CREATE INDEX operating_cycles_company ON operating_cycles(company_id,started_at DESC);
