-- RSS / dış kaynak tekrarını önlemek için makale kaynak URL’si (site başına benzersiz kontrol)
ALTER TABLE news ADD COLUMN IF NOT EXISTS rss_source_url text;
CREATE INDEX IF NOT EXISTS news_rss_source_site_idx ON news (site_id, rss_source_url) WHERE rss_source_url IS NOT NULL AND length(trim(rss_source_url)) > 0;
