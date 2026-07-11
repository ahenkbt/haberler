-- Haber kayıtlarını Haber Merkezi (HM) sitesine bağlar; null = merkez / eski içerik.
ALTER TABLE "news"
  ADD COLUMN IF NOT EXISTS "site_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'news_site_id_hm_news_sites_id_fk'
  ) THEN
    ALTER TABLE "news"
      ADD CONSTRAINT "news_site_id_hm_news_sites_id_fk"
      FOREIGN KEY ("site_id") REFERENCES "hm_news_sites"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "news_site_id_idx" ON "news" ("site_id");
