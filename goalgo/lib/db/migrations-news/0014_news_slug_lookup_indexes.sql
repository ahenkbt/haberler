-- PHP tema haber detay: slug + site_id ile arama (seq scan → 30s timeout riski).
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS news_site_slug_idx ON news (site_id, slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS news_slug_lower_idx ON news (lower(slug));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS news_owner_site_slug_idx
  ON news (owner_site_id, slug)
  WHERE site_only IS TRUE;
