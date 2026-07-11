ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS seo_updated_at timestamptz;
