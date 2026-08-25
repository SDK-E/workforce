ALTER TABLE mcp_servers
  ADD COLUMN credential_bindings_json TEXT NOT NULL DEFAULT '[]';

