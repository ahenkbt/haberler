-- 3CX Configuration API integration settings
ALTER TABLE pbx_settings
  ADD COLUMN IF NOT EXISTS threecx_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS threecx_fqdn TEXT,
  ADD COLUMN IF NOT EXISTS threecx_client_id_enc TEXT,
  ADD COLUMN IF NOT EXISTS threecx_client_secret_enc TEXT;
