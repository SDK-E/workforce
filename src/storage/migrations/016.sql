CREATE TABLE mcp_servers (
 company_id TEXT NOT NULL REFERENCES companies(id), id TEXT NOT NULL, name TEXT NOT NULL,
 transport TEXT NOT NULL CHECK(transport IN ('stdio','http','sse')), endpoint TEXT,
 command_json TEXT NOT NULL, tool_allowlist_json TEXT NOT NULL, secret_requirements_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('active','disabled','archived')), health TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(company_id,id)
);
CREATE INDEX mcp_servers_status ON mcp_servers(company_id,status,name);

CREATE TABLE project_integrations (
 company_id TEXT NOT NULL REFERENCES companies(id), project_id TEXT NOT NULL, provider TEXT NOT NULL,
 config_json TEXT NOT NULL, secret_requirements_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('active','disabled','archived')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,project_id,provider),
 FOREIGN KEY(company_id,project_id) REFERENCES strategy_items(company_id,id)
);

CREATE TABLE automation_requests (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), requested_by TEXT NOT NULL,
 title TEXT NOT NULL, trigger_json TEXT NOT NULL, action_json TEXT NOT NULL, rationale TEXT NOT NULL,
 estimated_runs_saved INTEGER NOT NULL CHECK(estimated_runs_saved>=0),
 status TEXT NOT NULL CHECK(status IN ('proposed','approved','rejected','disabled','archived')),
 decided_by TEXT, decision_reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX automation_requests_status ON automation_requests(company_id,status,updated_at DESC);

CREATE TABLE agent_mail (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), sender_id TEXT NOT NULL,
 recipient_id TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('sent','read','archived')), created_at TEXT NOT NULL,
 read_at TEXT, updated_at TEXT NOT NULL,
 FOREIGN KEY(company_id,sender_id) REFERENCES employees(company_id,id),
 FOREIGN KEY(company_id,recipient_id) REFERENCES employees(company_id,id)
);
CREATE INDEX agent_mail_recipient ON agent_mail(company_id,recipient_id,status,created_at DESC);
