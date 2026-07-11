-- İkinci özel alan adı (haber + kurumsal HM siteleri)
ALTER TABLE hm_news_sites ADD COLUMN IF NOT EXISTS domain2 text;
CREATE UNIQUE INDEX IF NOT EXISTS hm_news_sites_domain2_key ON hm_news_sites (domain2) WHERE domain2 IS NOT NULL;
