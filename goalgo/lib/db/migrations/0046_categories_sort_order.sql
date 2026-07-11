ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_exclusive_site_sort
  ON categories (exclusive_site_id, sort_order)
  WHERE exclusive_site_id IS NOT NULL;

UPDATE categories
SET sort_order = id
WHERE exclusive_site_id IS NOT NULL AND sort_order = 0;
