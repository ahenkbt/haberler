-- Yerel (native) Yekpare AI Call Center — Goalgo PostgreSQL
-- AgentLabs/call.yekpare.net bağımlılığı olmadan çalışır

CREATE TABLE IF NOT EXISTS ai_call_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openai_api_key_enc TEXT,
  gemini_api_key_enc TEXT,
  default_provider TEXT NOT NULL DEFAULT 'openai',
  default_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  demo_mode BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_call_settings (default_provider, default_model, demo_mode)
SELECT 'openai', 'gpt-4o-mini', true
WHERE NOT EXISTS (SELECT 1 FROM ai_call_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS ai_call_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT '',
  voice TEXT NOT NULL DEFAULT 'alloy',
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_call_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  assistant_id UUID REFERENCES ai_call_assistants(id) ON DELETE SET NULL,
  trunk_id UUID REFERENCES pbx_trunks(id) ON DELETE SET NULL,
  contact_list_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule_json JSONB,
  routing_mode TEXT NOT NULL DEFAULT 'ai_only',
  status TEXT NOT NULL DEFAULT 'draft',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_call_campaigns_status ON ai_call_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ai_call_campaigns_assistant ON ai_call_campaigns(assistant_id);

CREATE TABLE IF NOT EXISTS ai_call_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ai_call_campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_called_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_call_contacts_campaign ON ai_call_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_contacts_status ON ai_call_contacts(status);

CREATE TABLE IF NOT EXISTS ai_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ai_call_campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES ai_call_contacts(id) ON DELETE SET NULL,
  assistant_id UUID REFERENCES ai_call_assistants(id) ON DELETE SET NULL,
  phone TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'completed',
  duration_sec INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '',
  ai_summary TEXT NOT NULL DEFAULT '',
  transferred BOOLEAN NOT NULL DEFAULT false,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_call_logs_campaign ON ai_call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_started ON ai_call_logs(started_at DESC);

CREATE TABLE IF NOT EXISTS ai_call_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  flow_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
