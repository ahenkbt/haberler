-- Yekpare PBX — bağımsız çağrı merkezi (Asterisk/FreePBX yok)

CREATE TABLE IF NOT EXISTS pbx_trunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '',
  host TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password_enc TEXT,
  register BOOLEAN NOT NULL DEFAULT true,
  outbound_caller_id TEXT NOT NULL DEFAULT '',
  max_channels INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pbx_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  sip_secret TEXT NOT NULL,
  voicemail BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pbx_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'ringall',
  timeout_sec INTEGER NOT NULL DEFAULT 30,
  maxlen INTEGER NOT NULL DEFAULT 50,
  music_on_hold TEXT NOT NULL DEFAULT 'default',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pbx_queue_members (
  queue_id UUID NOT NULL REFERENCES pbx_queues(id) ON DELETE CASCADE,
  extension_id UUID NOT NULL REFERENCES pbx_extensions(id) ON DELETE CASCADE,
  PRIMARY KEY (queue_id, extension_id)
);

CREATE TABLE IF NOT EXISTS pbx_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  extension_id UUID REFERENCES pbx_extensions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'offline',
  last_login_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pbx_agent_queues (
  agent_id UUID NOT NULL REFERENCES pbx_agents(id) ON DELETE CASCADE,
  queue_id UUID NOT NULL REFERENCES pbx_queues(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, queue_id)
);

CREATE TABLE IF NOT EXISTS pbx_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'manual',
  queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  dial_ratio INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  schedule_json JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pbx_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES pbx_campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pbx_ivr_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  flow_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pbx_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL DEFAULT 'outbound',
  from_number TEXT NOT NULL DEFAULT '',
  to_number TEXT NOT NULL DEFAULT '',
  agent_id UUID REFERENCES pbx_agents(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES pbx_queues(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES pbx_campaigns(id) ON DELETE SET NULL,
  trunk_id UUID REFERENCES pbx_trunks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  duration_sec INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  recording_url TEXT,
  metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS pbx_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  demo_mode BOOLEAN NOT NULL DEFAULT true,
  sip_bridge_url TEXT,
  sip_bridge_ws_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO pbx_settings (id, demo_mode) VALUES (1, true) ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_pbx_call_logs_started_at ON pbx_call_logs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pbx_campaign_contacts_campaign ON pbx_campaign_contacts (campaign_id, status);
