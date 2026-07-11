-- yatport.com tekne/yat kiralama importları (map_businesses, import_source = 'yatport')

-- Fresh DB: kolonlar runtime seed'de ekleniyordu; migrasyon zincirinde de garanti et
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS store_type TEXT;
ALTER TABLE map_businesses ADD COLUMN IF NOT EXISTS city_id INTEGER;

CREATE INDEX IF NOT EXISTS map_businesses_import_source_yatport_idx
  ON map_businesses (import_source, is_active)
  WHERE import_source = 'yatport';

CREATE INDEX IF NOT EXISTS map_businesses_turizm_yat_idx
  ON map_businesses (store_type, homepage_super_category, city_id)
  WHERE store_type = 'turizm_yat' AND homepage_super_category = 'turizm';

CREATE INDEX IF NOT EXISTS map_businesses_yatport_place_id_idx
  ON map_businesses (google_place_id)
  WHERE google_place_id LIKE 'yatport:%';
