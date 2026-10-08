-- twilight-pine (NEWS_DATABASE_URL) — turkatahaber.com PHP haber detay hızlandırma.
-- Uygula: psql "$NEWS_DATABASE_URL" -f hostinger/turkatahaber/php-neon-indexes.sql

CREATE INDEX IF NOT EXISTS news_site_slug_idx ON news (site_id, slug);
CREATE INDEX IF NOT EXISTS news_slug_lower_idx ON news (lower(slug));
CREATE INDEX IF NOT EXISTS news_owner_site_slug_idx
  ON news (owner_site_id, slug)
  WHERE site_only IS TRUE;
