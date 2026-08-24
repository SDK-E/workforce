ALTER TABLE attempts ADD COLUMN environment_json TEXT NOT NULL DEFAULT '{}';

DROP INDEX agent_mail_recipient;
ALTER TABLE agent_mail RENAME TO agent_mail_legacy;
CREATE TABLE agent_mail (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 sender_kind TEXT NOT NULL CHECK(sender_kind IN ('agent','human')),
 sender_id TEXT NOT NULL, recipient_kind TEXT NOT NULL CHECK(recipient_kind IN ('agent','human')),
 recipient_id TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('sent','read','archived')), created_at TEXT NOT NULL,
 read_at TEXT, updated_at TEXT NOT NULL
);
INSERT INTO agent_mail
 (id,company_id,sender_kind,sender_id,recipient_kind,recipient_id,subject,body,status,created_at,read_at,updated_at)
 SELECT id,company_id,'agent',sender_id,'agent',recipient_id,subject,body,status,created_at,read_at,updated_at
 FROM agent_mail_legacy;
DROP TABLE agent_mail_legacy;
CREATE INDEX agent_mail_recipient
 ON agent_mail(company_id,recipient_kind,recipient_id,status,created_at DESC);
