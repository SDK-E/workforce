ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 50 CHECK(priority BETWEEN 0 AND 100);
ALTER TABLE tasks ADD COLUMN due_at TEXT;
CREATE TABLE task_requirement_versions (
 company_id TEXT NOT NULL, task_id TEXT NOT NULL, version INTEGER NOT NULL,
 objective TEXT NOT NULL, non_goals_json TEXT NOT NULL, acceptance_criteria_json TEXT NOT NULL,
 capabilities_json TEXT NOT NULL, network_policy_json TEXT NOT NULL, resource_policy_json TEXT NOT NULL,
 changed_by TEXT NOT NULL, change_reason TEXT NOT NULL, checkpoint_id TEXT, created_at TEXT NOT NULL,
 PRIMARY KEY(company_id,task_id,version), FOREIGN KEY(company_id,task_id) REFERENCES tasks(company_id,id)
);
CREATE TABLE task_dependencies (
 company_id TEXT NOT NULL, task_id TEXT NOT NULL, depends_on_task_id TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(company_id,task_id,depends_on_task_id),
 FOREIGN KEY(company_id,task_id) REFERENCES tasks(company_id,id),
 FOREIGN KEY(company_id,depends_on_task_id) REFERENCES tasks(company_id,id),
 CHECK(task_id != depends_on_task_id)
);
