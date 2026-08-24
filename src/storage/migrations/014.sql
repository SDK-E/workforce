CREATE TABLE agent_profiles (
 company_id TEXT NOT NULL,
 employee_id TEXT NOT NULL,
 persona_name TEXT NOT NULL,
 identity_summary TEXT NOT NULL,
 communication_style TEXT NOT NULL,
 autonomy_policy_json TEXT NOT NULL,
 active_revision INTEGER NOT NULL CHECK(active_revision > 0),
 updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,employee_id),
 FOREIGN KEY(company_id,employee_id) REFERENCES employees(company_id,id)
);

CREATE TABLE agent_instruction_versions (
 company_id TEXT NOT NULL,
 employee_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision > 0),
 system_prompt TEXT NOT NULL,
 instructions_json TEXT NOT NULL,
 constraints_json TEXT NOT NULL,
 context_sources_json TEXT NOT NULL,
 model_policy_json TEXT NOT NULL,
 changed_by TEXT NOT NULL,
 change_reason TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(company_id,employee_id,revision),
 FOREIGN KEY(company_id,employee_id) REFERENCES agent_profiles(company_id,employee_id)
);

ALTER TABLE attempts ADD COLUMN instruction_revision INTEGER;
ALTER TABLE attempts ADD COLUMN instruction_digest TEXT;
