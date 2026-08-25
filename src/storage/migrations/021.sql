ALTER TABLE mcp_servers ADD COLUMN health_receipt_id TEXT;

CREATE TABLE mcp_health_receipts (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL REFERENCES companies(id),
 server_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('healthy','degraded','unavailable')),
 transport TEXT NOT NULL,
 details_json TEXT NOT NULL,
 checked_at TEXT NOT NULL,
 FOREIGN KEY(company_id,server_id) REFERENCES mcp_servers(company_id,id)
);
CREATE INDEX mcp_health_receipts_server
 ON mcp_health_receipts(company_id,server_id,checked_at DESC);

