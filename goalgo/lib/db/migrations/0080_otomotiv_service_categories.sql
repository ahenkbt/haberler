-- Otomotiv servis taksonomisi — 6 ana grup + alt kategoriler

CREATE TABLE IF NOT EXISTS otomotiv_service_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_slug TEXT NOT NULL,
  group_name TEXT NOT NULL,
  store_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  group_sort_order INTEGER NOT NULL DEFAULT 0,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otomotiv_service_categories_group
  ON otomotiv_service_categories(group_slug, sort_order);

CREATE INDEX IF NOT EXISTS idx_otomotiv_service_categories_tags
  ON otomotiv_service_categories USING GIN (tags);

ALTER TABLE otomotiv_businesses
  ADD COLUMN IF NOT EXISTS servis_category_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_otomotiv_businesses_servis_category
  ON otomotiv_businesses(servis_category_slug)
  WHERE servis_category_slug IS NOT NULL;
