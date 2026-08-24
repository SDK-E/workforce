CREATE TABLE tasks (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), project_id TEXT, parent_task_id TEXT,
 objective TEXT NOT NULL, non_goals_json TEXT NOT NULL, acceptance_criteria_json TEXT NOT NULL, status TEXT NOT NULL,
 risk TEXT NOT NULL, data_sensitivity TEXT NOT NULL, capabilities_json TEXT NOT NULL, network_policy_json TEXT NOT NULL,
 resource_policy_json TEXT NOT NULL, manager_id TEXT NOT NULL, assignee_id TEXT, reviewer_id TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,parent_task_id) REFERENCES tasks(company_id,id)
);
CREATE INDEX tasks_company_status ON tasks(company_id,status,updated_at DESC);
CREATE INDEX tasks_project ON tasks(company_id,project_id,updated_at DESC);
CREATE TABLE task_transitions (sequence INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL, task_id TEXT NOT NULL, from_status TEXT NOT NULL, to_status TEXT NOT NULL, event TEXT NOT NULL, actor_id TEXT NOT NULL, rationale TEXT NOT NULL, occurred_at TEXT NOT NULL, FOREIGN KEY(company_id,task_id) REFERENCES tasks(company_id,id));
CREATE INDEX task_transitions_task ON task_transitions(company_id,task_id,sequence);
