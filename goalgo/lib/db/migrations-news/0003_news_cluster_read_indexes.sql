-- Haber cluster: public editör site okumalarını hızlandıran idempotent indexler
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS news_site_status_created_idx
  ON news (site_id, status, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS news_site_breaking_status_created_idx
  ON news (site_id, is_breaking, status, created_at DESC)
  WHERE is_breaking = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS news_site_author_status_created_idx
  ON news (site_id, author_id, status, created_at DESC)
  WHERE author_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS hm_makaleler_author_status_created_idx
  ON hm_makaleler (author_id, status, created_at DESC)
  WHERE author_id IS NOT NULL;
