-- Footer yasal linkleri (JSON), iletişim formu ekleri, platform duyuruları
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_legal_links_json TEXT;

-- Fresh DB: tablo runtime seed'de oluşturuluyordu; migrasyon zincirinde de garanti et
CREATE TABLE IF NOT EXISTS site_contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS page_source TEXT DEFAULT 'iletisim';
ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS image_data TEXT;

CREATE TABLE IF NOT EXISTS platform_broadcasts (
  id SERIAL PRIMARY KEY,
  audience TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  whatsapp_requested BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_broadcast_reads (
  broadcast_id INTEGER NOT NULL REFERENCES platform_broadcasts(id) ON DELETE CASCADE,
  recipient_kind TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (broadcast_id, recipient_kind, recipient_key)
);

CREATE INDEX IF NOT EXISTS idx_platform_broadcasts_created ON platform_broadcasts(created_at DESC);
