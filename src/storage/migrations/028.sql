CREATE TABLE opportunities (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), name TEXT NOT NULL,
 source TEXT NOT NULL, problem TEXT NOT NULL, hypothesis TEXT NOT NULL,
 score INTEGER NOT NULL CHECK(score>=0 AND score<=100),
 stage TEXT NOT NULL CHECK(stage IN ('discovered','researching','validated','rejected','converted','archived')),
 discovered_by TEXT NOT NULL, owner_id TEXT, evidence_ids_json TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(company_id,id)
);
CREATE INDEX opportunities_pipeline ON opportunities(company_id,stage,score DESC,updated_at DESC);

CREATE TABLE leads (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), opportunity_id TEXT,
 name TEXT NOT NULL, organization TEXT NOT NULL, email TEXT, website TEXT, source TEXT NOT NULL,
 qualification_score INTEGER NOT NULL CHECK(qualification_score>=0 AND qualification_score<=100),
 status TEXT NOT NULL CHECK(status IN ('new','qualified','contacted','nurturing','won','lost','archived')),
 owner_id TEXT, notes TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,opportunity_id) REFERENCES opportunities(company_id,id)
);
CREATE INDEX leads_pipeline ON leads(company_id,status,qualification_score DESC,updated_at DESC);

CREATE TABLE clients (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), lead_id TEXT,
 name TEXT NOT NULL, primary_contact TEXT NOT NULL, email TEXT,
 status TEXT NOT NULL CHECK(status IN ('prospect','active','paused','former','archived')),
 owner_id TEXT, notes TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,lead_id) REFERENCES leads(company_id,id)
);
CREATE INDEX clients_status ON clients(company_id,status,updated_at DESC);

CREATE TABLE engagements (
 id TEXT NOT NULL, company_id TEXT NOT NULL REFERENCES companies(id), client_id TEXT NOT NULL,
 project_id TEXT, name TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('proposed','active','paused','completed','cancelled','archived')),
 scope TEXT NOT NULL, success_criteria_json TEXT NOT NULL, owner_id TEXT,
 starts_at TEXT, ends_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,client_id) REFERENCES clients(company_id,id)
);
CREATE INDEX engagements_status ON engagements(company_id,status,updated_at DESC);
