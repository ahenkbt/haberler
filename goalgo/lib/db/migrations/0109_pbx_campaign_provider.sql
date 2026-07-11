-- Kampanya ve dahili: VoIP sağlayıcı / trunk / Verimor domain bağlantısı
ALTER TABLE pbx_campaigns
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS trunk_id UUID REFERENCES pbx_trunks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sip_domain TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_label TEXT NOT NULL DEFAULT '';

ALTER TABLE pbx_extensions
  ADD COLUMN IF NOT EXISTS trunk_id UUID REFERENCES pbx_trunks(id) ON DELETE SET NULL;
