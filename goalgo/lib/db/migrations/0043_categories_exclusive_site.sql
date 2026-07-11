ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS exclusive_site_id integer REFERENCES hm_news_sites (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_exclusive_site_id ON categories (exclusive_site_id);
