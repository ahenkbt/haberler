ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS portal_rss_ai_meta_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS portal_rss_ai_meta_hourly_limit INTEGER;

CREATE TABLE IF NOT EXISTS portal_rss_meta_rewrite_jobs (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  source_title TEXT NOT NULL,
  source_spot TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_rss_meta_rewrite_jobs_news_id_unique
  ON portal_rss_meta_rewrite_jobs (news_id);

CREATE INDEX IF NOT EXISTS portal_rss_meta_rewrite_jobs_status_created_idx
  ON portal_rss_meta_rewrite_jobs (status, created_at);
