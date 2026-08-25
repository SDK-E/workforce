CREATE TABLE task_checkpoints (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  task_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  progress_percent INTEGER NOT NULL CHECK(progress_percent BETWEEN 0 AND 100),
  blockers_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id, task_id) REFERENCES tasks(company_id, id),
  FOREIGN KEY(company_id, employee_id) REFERENCES employees(company_id, id)
);

CREATE INDEX task_checkpoints_task_idx ON task_checkpoints(company_id, task_id, created_at);

CREATE TABLE meeting_contributions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  meeting_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id, meeting_id) REFERENCES meetings(company_id, id),
  FOREIGN KEY(company_id, employee_id) REFERENCES employees(company_id, id)
);

CREATE INDEX meeting_contributions_meeting_idx
  ON meeting_contributions(company_id, meeting_id, created_at);
