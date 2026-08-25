CREATE TABLE task_handoffs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  task_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('help-request','handoff')),
  from_employee_id TEXT NOT NULL,
  to_employee_id TEXT,
  summary TEXT NOT NULL,
  context_json TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open','acknowledged','resolved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id,task_id) REFERENCES tasks(company_id,id),
  FOREIGN KEY(company_id,from_employee_id) REFERENCES employees(company_id,id),
  FOREIGN KEY(company_id,to_employee_id) REFERENCES employees(company_id,id)
);
CREATE INDEX task_handoffs_task ON task_handoffs(company_id,task_id,status,created_at DESC);

CREATE TABLE artifact_references (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  task_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES attempts(id),
  artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  created_by TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(company_id,task_id,artifact_id,created_by),
  FOREIGN KEY(company_id,task_id) REFERENCES tasks(company_id,id)
);
CREATE INDEX artifact_references_task ON artifact_references(company_id,task_id,created_at DESC);

CREATE TABLE mcp_idempotency (
  company_id TEXT NOT NULL REFERENCES companies(id),
  principal_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(company_id,principal_id,operation,idempotency_key)
);
