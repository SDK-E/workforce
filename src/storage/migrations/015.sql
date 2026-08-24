ALTER TABLE tasks ADD COLUMN inputs_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN outputs_json TEXT NOT NULL DEFAULT '[{"path":"deliverable.md","required":true}]';
ALTER TABLE tasks ADD COLUMN tools_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN model_policy_json TEXT NOT NULL DEFAULT '{"enginePreference":["opencode","kilo"],"preferredModels":[],"fallbackModels":[]}';
ALTER TABLE tasks ADD COLUMN escalation_path_json TEXT NOT NULL DEFAULT '["manager","ceo"]';
ALTER TABLE tasks ADD COLUMN completion_evidence_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE task_requirement_versions ADD COLUMN inputs_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE task_requirement_versions ADD COLUMN outputs_json TEXT NOT NULL DEFAULT '[{"path":"deliverable.md","required":true}]';
ALTER TABLE task_requirement_versions ADD COLUMN tools_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE task_requirement_versions ADD COLUMN model_policy_json TEXT NOT NULL DEFAULT '{"enginePreference":["opencode","kilo"],"preferredModels":[],"fallbackModels":[]}';
ALTER TABLE task_requirement_versions ADD COLUMN escalation_path_json TEXT NOT NULL DEFAULT '["manager","ceo"]';
