-- Mağaza SMTP/IMAP, gelen kutusu, vitrin duyuruları, site anasayfa duyuruları

CREATE TABLE IF NOT EXISTS vendor_mail_settings (
  vendor_id INTEGER PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS mailbox_messages (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  imap_uid TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mailbox_messages_vendor_created
  ON mailbox_messages (vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailbox_messages_scope_created
  ON mailbox_messages (scope, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS mailbox_messages_vendor_imap_uid
  ON mailbox_messages (vendor_id, imap_uid)
  WHERE vendor_id IS NOT NULL AND imap_uid IS NOT NULL AND imap_uid <> '';

CREATE UNIQUE INDEX IF NOT EXISTS mailbox_messages_site_imap_uid
  ON mailbox_messages (scope, imap_uid)
  WHERE scope = 'site' AND imap_uid IS NOT NULL AND imap_uid <> '';

CREATE TABLE IF NOT EXISTS vendor_public_announcements (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  announcement_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  show_on_home BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_announcements_vendor_active
  ON vendor_public_announcements (vendor_id, active, sort_order);

CREATE TABLE IF NOT EXISTS site_home_announcements (
  id SERIAL PRIMARY KEY,
  announcement_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_host TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_port TEXT DEFAULT '993';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_user TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_pass TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_folder TEXT DEFAULT 'INBOX';
