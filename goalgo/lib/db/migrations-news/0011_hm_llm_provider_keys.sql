-- Haber cluster: LLM anahtar tablosu (ana migration 0132 ile aynı şema).
-- ai_settings bu kümede olmayabilir; anahtar kopyası uygulama açılışında ana DB'den yapılır.
-- Canlı hm_news_sites birincil anahtarsız ve yinelenen id içerdiği için site_id FK eklenmez.

CREATE TABLE IF NOT EXISTS hm_llm_provider_keys (
  id serial PRIMARY KEY,
  site_id integer,
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

ALTER TABLE hm_llm_provider_keys DROP CONSTRAINT IF EXISTS hm_llm_provider_keys_site_id_fkey;

CREATE UNIQUE INDEX IF NOT EXISTS hm_llm_provider_keys_scope_provider_uidx
  ON hm_llm_provider_keys ((COALESCE(site_id, 0)), provider);

INSERT INTO hm_llm_provider_keys (site_id, provider, api_key_enc, api_key_last4, enabled, model, priority)
SELECT NULL, v.provider, '', '', true, v.model, v.priority
FROM (
  VALUES
    ('evren', 'deepseek-v4-flash', 10),
    ('nvidia', 'nvidia/nemotron-3.5-lightning', 20),
    ('gemini', 'gemini-3.1-flash-lite', 30),
    ('openai', 'gpt-5-nano', 40)
) AS v(provider, model, priority)
WHERE NOT EXISTS (
  SELECT 1 FROM hm_llm_provider_keys k
  WHERE k.site_id IS NULL AND k.provider = v.provider
);

UPDATE hm_llm_provider_keys
SET
  model = CASE provider
    WHEN 'evren' THEN 'deepseek-v4-flash'
    WHEN 'nvidia' THEN 'nvidia/nemotron-3.5-lightning'
    WHEN 'gemini' THEN 'gemini-3.1-flash-lite'
    WHEN 'openai' THEN 'gpt-5-nano'
    ELSE model
  END,
  updated_at = now()
WHERE btrim(COALESCE(api_key_enc, '')) = ''
  AND (
    (provider = 'evren' AND btrim(COALESCE(model, '')) IN ('auto', ''))
    OR (provider = 'nvidia' AND btrim(COALESCE(model, '')) IN ('meta/llama-3.1-8b-instruct', ''))
    OR (provider = 'gemini' AND btrim(COALESCE(model, '')) IN ('gemini-2.0-flash-lite', ''))
    OR (provider = 'openai' AND btrim(COALESCE(model, '')) IN ('gpt-4o-mini', ''))
  );
