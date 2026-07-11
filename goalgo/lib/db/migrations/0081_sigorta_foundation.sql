-- Otomotiv Sigorta modülü — Faz 5 iskelet (lead yönlendirme, acente listeleme)
-- Poliçe düzenleme ve ödeme lisanslı acente sorumluluğunda; Yekpare tahsilat yapmaz.

CREATE TABLE IF NOT EXISTS sigorta_agents (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  license_no TEXT,
  city TEXT,
  district TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  documents_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  broker_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  commission_rate_pct NUMERIC(5, 2),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'deleted')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sigorta_agents_status ON sigorta_agents(status);
CREATE INDEX IF NOT EXISTS idx_sigorta_agents_city ON sigorta_agents(city);

CREATE TABLE IF NOT EXISTS sigorta_leads (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES sigorta_agents(id) ON DELETE SET NULL,
  listing_id INTEGER REFERENCES otomotiv_listings(id) ON DELETE SET NULL,
  lead_type TEXT NOT NULL DEFAULT 'kasko'
    CHECK (lead_type IN ('trafik', 'kasko', 'trafik_kasko', 'genel')),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  vehicle_plate TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'closed', 'spam')),
  broker_quote_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sigorta_leads_agent ON sigorta_leads(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_sigorta_leads_listing ON sigorta_leads(listing_id);

CREATE TABLE IF NOT EXISTS sigorta_policies (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES sigorta_agents(id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES sigorta_leads(id) ON DELETE SET NULL,
  policy_type TEXT NOT NULL DEFAULT 'kasko'
    CHECK (policy_type IN ('trafik', 'kasko')),
  policy_no TEXT,
  vehicle_plate TEXT,
  start_date DATE,
  end_date DATE,
  premium_try NUMERIC(12, 2),
  pdf_url TEXT,
  reminder_sent_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sigorta_policies_agent ON sigorta_policies(agent_id);
CREATE INDEX IF NOT EXISTS idx_sigorta_policies_end_date ON sigorta_policies(end_date) WHERE status = 'active';

-- Platform broker API ayarları (admin — gerçek anahtarlar env/secret store'da tutulmalı)
CREATE TABLE IF NOT EXISTS sigorta_platform_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  broker_provider TEXT,
  broker_api_key_placeholder TEXT,
  broker_sandbox BOOLEAN NOT NULL DEFAULT true,
  default_commission_pct NUMERIC(5, 2),
  cross_sell_campaigns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sigorta_platform_config (id, broker_provider, broker_sandbox)
VALUES (1, NULL, true)
ON CONFLICT (id) DO NOTHING;
