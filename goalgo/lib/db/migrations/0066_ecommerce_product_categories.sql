CREATE TABLE IF NOT EXISTS ecommerce_product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_product_categories_parent
  ON ecommerce_product_categories (parent_id, position);

ALTER TABLE vendor_menu_items
  ADD COLUMN IF NOT EXISTS ecommerce_category_id INTEGER
  REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL;

ALTER TABLE vendor_menu_categories
  ADD COLUMN IF NOT EXISTS ecommerce_category_id INTEGER
  REFERENCES ecommerce_product_categories(id) ON DELETE SET NULL;

ALTER TABLE vendor_menu_categories
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;
