-- Verimor softphone (API'siz): dahili domain + agent kampanya oturumu
ALTER TABLE pbx_extensions
  ADD COLUMN IF NOT EXISTS sip_domain TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sip_wss_url TEXT;

ALTER TABLE pbx_agents
  ADD COLUMN IF NOT EXISTS active_campaign_id UUID REFERENCES pbx_campaigns(id) ON DELETE SET NULL;

ALTER TABLE pbx_settings
  ADD COLUMN IF NOT EXISTS verimor_softphone_enabled BOOLEAN NOT NULL DEFAULT false;
