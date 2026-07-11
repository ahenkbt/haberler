-- HM editör site panelleri: site başına SMTP/IMAP posta kutusu

CREATE TABLE IF NOT EXISTS hm_site_mail_settings (
  site_id INTEGER PRIMARY KEY REFERENCES hm_news_sites(id) ON DELETE CASCADE,
  smtp_host TEXT,
  smtp_port TEXT DEFAULT '587',
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_from TEXT,
  imap_host TEXT,
  imap_port TEXT DEFAULT '993',
  imap_user TEXT,
  imap_pass TEXT,
  imap_folder TEXT DEFAULT 'INBOX',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE mailbox_messages ADD COLUMN IF NOT EXISTS hm_site_id INTEGER REFERENCES hm_news_sites(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_mailbox_messages_hm_site_created
  ON mailbox_messages (hm_site_id, created_at DESC)
  WHERE hm_site_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mailbox_messages_hm_site_imap_uid
  ON mailbox_messages (hm_site_id, imap_uid)
  WHERE hm_site_id IS NOT NULL AND imap_uid IS NOT NULL AND imap_uid <> '';
