-- Otomotiv Phase 2 — araç pazarı filtre indeksleri ve Haritalar import bayrağı

CREATE INDEX IF NOT EXISTS idx_otomotiv_listings_active_vehicle
  ON otomotiv_listings (status, listing_kind, is_zero_km, created_at DESC)
  WHERE status = 'active' AND listing_kind = 'vehicle';

CREATE INDEX IF NOT EXISTS idx_otomotiv_listings_price ON otomotiv_listings (price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_otomotiv_listings_year ON otomotiv_listings (year) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_otomotiv_listings_km ON otomotiv_listings (km) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_otomotiv_businesses_map ON otomotiv_businesses (map_business_id)
  WHERE map_business_id IS NOT NULL;
