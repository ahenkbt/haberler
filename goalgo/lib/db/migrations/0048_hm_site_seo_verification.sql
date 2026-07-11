ALTER TABLE hm_news_sites
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS verification_json text;
