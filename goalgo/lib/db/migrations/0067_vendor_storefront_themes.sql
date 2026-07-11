-- Mağaza vitrin teması ve özel alan adları
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS theme_key TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS theme_config JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS vendor_custom_domains (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  position SMALLINT NOT NULL DEFAULT 1,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_custom_domains_domain_uq
  ON vendor_custom_domains (lower(trim(domain)));

CREATE INDEX IF NOT EXISTS vendor_custom_domains_vendor_id_idx
  ON vendor_custom_domains (vendor_id);
