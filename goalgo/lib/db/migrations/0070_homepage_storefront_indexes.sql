-- Fresh DB: kolonlar runtime seed'de ekleniyordu; migrasyon zincirinde de garanti et
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS linked_map_business_id TEXT;
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS homepage_super_category TEXT;

CREATE INDEX IF NOT EXISTS vendors_linked_map_business_id_active_idx
  ON vendors (linked_map_business_id, active);

CREATE INDEX IF NOT EXISTS map_businesses_homepage_super_active_created_idx
  ON map_businesses (homepage_super_category, is_active, created_at DESC);
