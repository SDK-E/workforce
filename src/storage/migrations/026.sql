CREATE TABLE secrets (
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  nonce TEXT NOT NULL,
  tag TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, name)
);

CREATE INDEX secrets_company_updated ON secrets(company_id, updated_at DESC);
