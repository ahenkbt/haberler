-- Yekpare platform destek talepleri
CREATE TABLE IF NOT EXISTS platform_support_tickets (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open',
  author_kind TEXT NOT NULL,
  member_id TEXT,
  customer_user_id INTEGER,
  vendor_id INTEGER,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_support_tickets_created ON platform_support_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_support_tickets_status ON platform_support_tickets (status);

CREATE TABLE IF NOT EXISTS platform_support_ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES platform_support_tickets(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_support_ticket_messages_ticket ON platform_support_ticket_messages (ticket_id);

-- Mesafeli satış / ön bilgilendirme onayı (e-ticaret siparişleri)
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS legal_distance_sales_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS legal_preinfo_accepted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS legal_distance_sales_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS legal_preinfo_accepted BOOLEAN NOT NULL DEFAULT false;
