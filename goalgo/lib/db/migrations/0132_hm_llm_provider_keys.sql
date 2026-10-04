-- Haber Merkezi + haber sitesi LLM anahtarları (eklemeli).
-- Eski ai_settings / site_settings kolonları silinmez; OpenAI ve Gemini global satıra kopyalanır.
-- Evren için bu repoda ayrı bir kolon yoktu; boş satır varsayılan model "auto" ile açılır.

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

UPDATE hm_llm_provider_keys k
SET
  api_key_enc = 'plain:' || src.key,
  api_key_last4 = right(src.key, 4),
  enabled = true,
  model = COALESCE(NULLIF(src.model, ''), k.model),
  updated_at = now()
FROM (
  SELECT
    COALESCE(
      NULLIF(btrim((SELECT openai_api_key FROM ai_settings ORDER BY id ASC LIMIT 1)), ''),
      NULLIF(btrim((SELECT openai_api_key FROM site_settings ORDER BY id ASC LIMIT 1)), '')
    ) AS key,
    COALESCE(
      NULLIF(btrim((SELECT openai_model FROM ai_settings ORDER BY id ASC LIMIT 1)), ''),
      NULLIF(btrim((SELECT openai_model FROM site_settings ORDER BY id ASC LIMIT 1)), ''),
      'gpt-4o-mini'
    ) AS model
) src
WHERE k.site_id IS NULL
  AND k.provider = 'openai'
  AND btrim(COALESCE(k.api_key_enc, '')) = ''
  AND src.key IS NOT NULL;

UPDATE hm_llm_provider_keys k
SET
  api_key_enc = 'plain:' || src.key,
  api_key_last4 = right(src.key, 4),
  enabled = true,
  model = COALESCE(NULLIF(k.model, ''), 'gemini-2.0-flash-lite'),
  updated_at = now()
FROM (
  SELECT NULLIF(btrim((SELECT gemini_api_key FROM site_settings ORDER BY id ASC LIMIT 1)), '') AS key
) src
WHERE k.site_id IS NULL
  AND k.provider = 'gemini'
  AND btrim(COALESCE(k.api_key_enc, '')) = ''
  AND src.key IS NOT NULL;
