-- Faz 5: AI Call ↔ PBX hibrit entegrasyonu
-- Global hibrit ayarları, AI kampanya yönlendirme, kuyruk eşlemesi, bekleyen aktarımlar

ALTER TABLE pbx_settings
  ADD COLUMN IF NOT EXISTS hybrid_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_routing_mode TEXT NOT NULL DEFAULT 'hybrid',
  ADD COLUMN IF NOT EXISTS default_pbx_queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_webhook_secret TEXT;

ALTER TABLE pbx_campaigns
  ADD COLUMN IF NOT EXISTS routing_mode TEXT NOT NULL DEFAULT 'human_only';

CREATE TABLE IF NOT EXISTS pbx_ai_campaign_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_campaign_id TEXT NOT NULL UNIQUE,
  ai_campaign_name TEXT NOT NULL DEFAULT '',
  routing_mode TEXT NOT NULL DEFAULT 'hybrid',
  pbx_queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pbx_ai_campaign_config_queue ON pbx_ai_campaign_config(pbx_queue_id);

CREATE TABLE IF NOT EXISTS pbx_pending_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_call_id TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  ai_campaign_id TEXT NOT NULL DEFAULT '',
  ai_campaign_name TEXT NOT NULL DEFAULT '',
  queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES pbx_agents(id) ON DELETE SET NULL,
  summary TEXT NOT NULL DEFAULT '',
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pbx_pending_transfers_status ON pbx_pending_transfers(status);
CREATE INDEX IF NOT EXISTS idx_pbx_pending_transfers_queue ON pbx_pending_transfers(queue_id);
