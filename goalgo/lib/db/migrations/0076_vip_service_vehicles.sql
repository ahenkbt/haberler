-- VIP transfer araçları (map_businesses üzerine, yacht_listing_extras deseni)

CREATE TABLE IF NOT EXISTS vip_service_vehicles (
  id SERIAL PRIMARY KEY,
  map_business_id VARCHAR NOT NULL REFERENCES map_businesses(id) ON DELETE CASCADE,
  segment TEXT NOT NULL DEFAULT 'Premium Sedan',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  max_passengers INTEGER NOT NULL DEFAULT 4,
  max_luggage INTEGER NOT NULL DEFAULT 2,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  hourly_price NUMERIC(12, 2),
  daily_price NUMERIC(12, 2),
  zone_price NUMERIC(12, 2),
  kdv_dahil BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (map_business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_vip_service_vehicles_business
  ON vip_service_vehicles (map_business_id);

-- tourism_listings tipine vip ekle (fresh DB: tablo runtime seed'de oluşur, yoksa atla)
DO $$
BEGIN
  IF to_regclass('public.tourism_listings') IS NOT NULL THEN
    ALTER TABLE tourism_listings DROP CONSTRAINT IF EXISTS tourism_listings_type_check;
    ALTER TABLE tourism_listings ADD CONSTRAINT tourism_listings_type_check
      CHECK (type IN ('hotel', 'car', 'villa', 'tour', 'boat', 'vip'));
  END IF;
END $$;
