export const CURRENT_SCHEMA_VERSION = 1;

// The schema is intentionally centralized: migrations are infrastructure,
// while queries and domain behavior live in repositories/the state store.
export const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  mission TEXT NOT NULL DEFAULT '',
  vision TEXT NOT NULL DEFAULT '',
  values_json TEXT NOT NULL DEFAULT '[]',
  policies_json TEXT NOT NULL DEFAULT '{}',
  budget_cents INTEGER NOT NULL DEFAULT 0 CHECK (budget_cents >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  manager_id TEXT,
  status TEXT NOT NULL,
  responsibilities_json TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  hired_at TEXT NOT NULL,
  PRIMARY KEY (company_id, id),
  FOREIGN KEY (company_id, manager_id) REFERENCES employees(company_id, id)
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, id),
  FOREIGN KEY (company_id, parent_id) REFERENCES entities(company_id, id)
);
CREATE INDEX IF NOT EXISTS entities_company_kind
  ON entities(company_id, kind, status);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (company_id, id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  thread_id TEXT,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id, room_id) REFERENCES rooms(company_id, id)
);
CREATE INDEX IF NOT EXISTS messages_room_time
  ON messages(company_id, room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT UNIQUE NOT NULL,
  at TEXT NOT NULL,
  type TEXT NOT NULL,
  actor TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  data_json TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  hash TEXT UNIQUE NOT NULL
);
CREATE INDEX IF NOT EXISTS events_company_sequence
  ON events(company_id, sequence DESC);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  rationale TEXT NOT NULL DEFAULT '',
  decided_by TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS approvals_pending
  ON approvals(company_id, status, created_at);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  uri TEXT NOT NULL,
  digest TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  validator TEXT,
  valid INTEGER
);
CREATE INDEX IF NOT EXISTS evidence_subject
  ON evidence(company_id, subject_type, subject_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
`;

export const TASKS_SCHEMA_VERSION = 2;
export const TASKS_SCHEMA = `
CREATE TABLE tasks (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  project_id TEXT,
  parent_task_id TEXT,
  objective TEXT NOT NULL,
  non_goals_json TEXT NOT NULL,
  acceptance_criteria_json TEXT NOT NULL,
  status TEXT NOT NULL,
  risk TEXT NOT NULL,
  data_sensitivity TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  network_policy_json TEXT NOT NULL,
  resource_policy_json TEXT NOT NULL,
  manager_id TEXT NOT NULL,
  assignee_id TEXT,
  reviewer_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, id),
  FOREIGN KEY (company_id, parent_task_id) REFERENCES tasks(company_id, id)
);
CREATE INDEX tasks_company_status ON tasks(company_id, status, updated_at DESC);
CREATE INDEX tasks_project ON tasks(company_id, project_id, updated_at DESC);

CREATE TABLE task_transitions (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  event TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  rationale TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (company_id, task_id) REFERENCES tasks(company_id, id)
);
CREATE INDEX task_transitions_task ON task_transitions(company_id, task_id, sequence);
`;

export const ORGANIZATION_SCHEMA_VERSION = 3;
export const ORGANIZATION_SCHEMA = `
CREATE TABLE organization_units (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('department', 'team', 'office', 'room')),
  parent_id TEXT,
  name TEXT NOT NULL,
  manager_id TEXT,
  status TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, id),
  FOREIGN KEY (company_id, parent_id) REFERENCES organization_units(company_id, id)
);
CREATE INDEX organization_units_kind ON organization_units(company_id, kind, status);

CREATE TABLE strategy_items (
  id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('objective', 'initiative', 'project', 'goal', 'milestone')),
  parent_id TEXT,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  manager_id TEXT NOT NULL,
  status TEXT NOT NULL,
  requirements_json TEXT NOT NULL,
  constraints_json TEXT NOT NULL,
  success_measures_json TEXT NOT NULL,
  dependencies_json TEXT NOT NULL,
  risks_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  target_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, id),
  FOREIGN KEY (company_id, parent_id) REFERENCES strategy_items(company_id, id)
);
CREATE INDEX strategy_items_kind ON strategy_items(company_id, kind, status, updated_at DESC);
`;
