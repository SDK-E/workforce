ALTER TABLE companies ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
 CHECK(status IN ('active','archived'));
ALTER TABLE companies ADD COLUMN autonomy_enabled_before_archive INTEGER;

CREATE INDEX companies_status_created ON companies(status,created_at);
