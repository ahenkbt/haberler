--> statement-breakpoint
ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_title text;
--> statement-breakpoint
ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_description text;
--> statement-breakpoint
ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_updated_at timestamptz;
