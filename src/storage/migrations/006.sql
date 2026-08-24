CREATE TABLE room_settings (
 company_id TEXT NOT NULL, room_id TEXT NOT NULL, retention_days INTEGER CHECK(retention_days IS NULL OR retention_days > 0),
 announcement TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
 updated_at TEXT NOT NULL, PRIMARY KEY(company_id,room_id),
 FOREIGN KEY(company_id,room_id) REFERENCES rooms(company_id,id)
);
INSERT INTO room_settings(company_id,room_id,retention_days,announcement,status,updated_at)
 SELECT company_id,id,NULL,'','active',created_at FROM rooms;
