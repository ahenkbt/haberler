-- Etkinlik.io mekan → map_businesses (Haritalar + Sarı Sayfalar) bağlantısı

ALTER TABLE etkinlik_event_cache
  ADD COLUMN IF NOT EXISTS map_business_id VARCHAR REFERENCES map_businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_etkinlik_event_cache_map_business
  ON etkinlik_event_cache (map_business_id)
  WHERE map_business_id IS NOT NULL;
