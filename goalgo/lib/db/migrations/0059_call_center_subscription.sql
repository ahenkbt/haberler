ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS call_center_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS call_center_subscription_plan TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS call_center_subscription_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS call_center_subscription_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS call_center_subscription_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  plan_id TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  hm_site_id INTEGER,
  hm_site_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS call_center_subscription_requests_status_created_idx
  ON call_center_subscription_requests (status, created_at DESC);
