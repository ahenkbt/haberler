-- Haber cluster: LLM anahtar tablosu (ana migration 0132 ile aynı şema).
-- ai_settings bu kümede olmayabilir; anahtar kopyası uygulama açılışında ana DB'den yapılır.

CREATE TABLE IF NOT EXISTS hm_llm_provider_keys (
  id serial PRIMARY KEY,
  site_id integer REFERENCES hm_news_sites (id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key_enc text NOT NULL DEFAULT '',
  api_key_last4 text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  model text NOT NULL DEFAULT '',
  priority integer NOT NULL DEFAULT 100,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hm_llm_provider_keys_scope_provider_uidx
  ON hm_llm_provider_keys ((COALESCE(site_id, 0)), provider);

INSERT INTO hm_llm_provider_keys (site_id, provider, api_key_enc, api_key_last4, enabled, model, priority)
SELECT NULL, v.provider, '', '', true, v.model, v.priority
FROM (
  VALUES
    ('evren', 'auto', 10),
    ('nvidia', 'meta/llama-3.1-8b-instruct', 20),
    ('gemini', 'gemini-2.0-flash-lite', 30),
    ('openai', 'gpt-4o-mini', 40)
) AS v(provider, model, priority)
WHERE NOT EXISTS (
  SELECT 1 FROM hm_llm_provider_keys k
  WHERE k.site_id IS NULL AND k.provider = v.provider
);
