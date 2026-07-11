ALTER TABLE hm_ai_jobs
  ADD COLUMN IF NOT EXISTS result_news_id integer REFERENCES news (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hm_ai_jobs_result_news_id ON hm_ai_jobs (result_news_id);
