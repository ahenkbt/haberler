-- Verimor Bulutsantralim entegrasyonu
ALTER TABLE pbx_settings
  ADD COLUMN IF NOT EXISTS verimor_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verimor_api_key_enc TEXT,
  ADD COLUMN IF NOT EXISTS verimor_domain TEXT,
  ADD COLUMN IF NOT EXISTS verimor_webhook_secret TEXT;

ALTER TABLE pbx_extensions
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS external_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verimor_queue_numbers JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS pbx_verimor_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verimor_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  call_type TEXT NOT NULL DEFAULT 'queue',
  queue_number INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pbx_verimor_campaigns_ext_id_idx
  ON pbx_verimor_campaigns (verimor_campaign_id);

CREATE TABLE IF NOT EXISTS pbx_verimor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL DEFAULT '',
  caller_id TEXT NOT NULL DEFAULT '',
  extension TEXT NOT NULL DEFAULT '',
  call_uuid TEXT NOT NULL DEFAULT '',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pbx_verimor_events_created_idx ON pbx_verimor_events (created_at DESC);
