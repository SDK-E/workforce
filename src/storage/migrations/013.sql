CREATE TABLE tools (
 company_id TEXT NOT NULL,
 id TEXT NOT NULL,
 version TEXT NOT NULL,
 provider TEXT NOT NULL,
 capabilities_json TEXT NOT NULL,
 risk TEXT NOT NULL CHECK(risk IN ('low','medium','high','critical')),
 input_schema_json TEXT NOT NULL,
 output_schema_json TEXT NOT NULL,
 required_environment TEXT,
 network_policy_json TEXT NOT NULL,
 secret_requirements_json TEXT NOT NULL,
 sandbox_profiles_json TEXT NOT NULL,
 permission_policy_json TEXT NOT NULL,
 health TEXT NOT NULL CHECK(health IN ('unknown','healthy','degraded','unavailable')),
 test_receipt_id TEXT,
 audit_behavior TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE INDEX tools_company_health_idx ON tools(company_id,health,id);

CREATE TABLE environments (
 company_id TEXT NOT NULL,
 id TEXT NOT NULL,
 name TEXT NOT NULL,
 sandbox_image TEXT NOT NULL,
 runtime_json TEXT NOT NULL,
 build_toolchain_json TEXT NOT NULL,
 browser_json TEXT NOT NULL,
 network_policy_json TEXT NOT NULL,
 input_contract_json TEXT NOT NULL,
 secrets_policy_json TEXT NOT NULL,
 resource_policy_json TEXT NOT NULL,
 output_contract_json TEXT NOT NULL,
 cleanup_policy_json TEXT NOT NULL,
 supported_profiles_json TEXT NOT NULL,
 health TEXT NOT NULL CHECK(health IN ('unknown','healthy','degraded','unavailable')),
 health_receipt_id TEXT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE INDEX environments_company_health_idx ON environments(company_id,health,id);

CREATE TABLE models (
 company_id TEXT NOT NULL,
 id TEXT NOT NULL,
 engine TEXT NOT NULL CHECK(engine IN ('kilo','opencode')),
 model TEXT NOT NULL,
 provider TEXT NOT NULL,
 capabilities_json TEXT NOT NULL,
 supported_roles_json TEXT NOT NULL,
 context_limit INTEGER,
 free_preferred INTEGER NOT NULL CHECK(free_preferred IN (0,1)),
 local_model INTEGER NOT NULL CHECK(local_model IN (0,1)),
 priority INTEGER NOT NULL CHECK(priority BETWEEN 0 AND 100),
 health TEXT NOT NULL CHECK(health IN ('unknown','healthy','degraded','unavailable','circuit-open')),
 verified_at TEXT,
 verification_receipt_id TEXT,
 failure_class TEXT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id),
 UNIQUE(company_id,engine,model),
 FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE INDEX models_company_health_idx ON models(company_id,health,priority DESC);
