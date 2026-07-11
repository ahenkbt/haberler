-- Çağrı sonlandırma (disposition / wrap-up) kodları ve Google Sheets raporlama
CREATE TABLE IF NOT EXISTS pbx_disposition_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label_tr TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pbx_disposition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disposition_id UUID NOT NULL REFERENCES pbx_disposition_codes(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'global',
  scope_key TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (disposition_id, scope_type, scope_key)
);

CREATE TABLE IF NOT EXISTS pbx_call_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES pbx_agents(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES pbx_campaigns(id) ON DELETE SET NULL,
  disposition_code_id UUID REFERENCES pbx_disposition_codes(id) ON DELETE SET NULL,
  code TEXT NOT NULL DEFAULT '',
  label_tr TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL DEFAULT 'outbound',
  call_uuid TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  scope_key TEXT NOT NULL DEFAULT '',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sheets_synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pbx_settings
  ADD COLUMN IF NOT EXISTS google_sheets_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_sheets_spreadsheet_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_sheets_sheet_name TEXT NOT NULL DEFAULT 'PBX Rapor',
  ADD COLUMN IF NOT EXISTS google_sheets_webhook_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_sheets_connected_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verimor_default_wss_url TEXT NOT NULL DEFAULT '';
