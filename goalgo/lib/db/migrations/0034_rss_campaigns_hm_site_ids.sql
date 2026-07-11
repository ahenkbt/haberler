-- RSS kampanyası: üretilen haberlerin atanacağı HM site kimlikleri (boş dizi = merkez / site_id null)
ALTER TABLE rss_campaigns
  ADD COLUMN IF NOT EXISTS hm_site_ids integer[] NOT NULL DEFAULT '{}';
