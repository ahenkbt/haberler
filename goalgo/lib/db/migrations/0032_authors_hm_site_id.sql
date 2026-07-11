-- Köşe yazarlarını haber merkezi (HM) sitesine bağla; public liste hmSiteId ile filtrelenir.
ALTER TABLE authors ADD COLUMN IF NOT EXISTS hm_site_id INTEGER;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'authors_hm_site_id_fkey'
  ) THEN
    ALTER TABLE authors
      ADD CONSTRAINT authors_hm_site_id_fkey
      FOREIGN KEY (hm_site_id) REFERENCES hm_news_sites(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS authors_hm_site_id_idx ON authors(hm_site_id);
