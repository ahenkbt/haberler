-- Üçüncü özel alan adı (haber + kurumsal HM siteleri)
ALTER TABLE hm_news_sites ADD COLUMN IF NOT EXISTS domain3 text;
CREATE UNIQUE INDEX IF NOT EXISTS hm_news_sites_domain3_key ON hm_news_sites (domain3) WHERE domain3 IS NOT NULL;
