-- Otomotiv modülü — Phase 1 veri iskeleti
-- Phase 2: ilan detay, filtre, public API
-- Phase 3: randevu motoru, kargo webhook
-- Phase 4: sağlayıcı paneli, abonelik
-- Phase 5: Haritalar senkron, toplu import

CREATE TABLE IF NOT EXISTS otomotiv_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT,
  logo_url TEXT,
  vehicle_class TEXT NOT NULL DEFAULT 'otomobil'
    CHECK (vehicle_class IN ('otomobil', 'ticari', 'arazi', 'minibus', 'kamyon', 'otobus', 'motosiklet', 'diger')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_models (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  year_from INTEGER,
  year_to INTEGER,
  vehicle_class TEXT NOT NULL DEFAULT 'otomobil'
    CHECK (vehicle_class IN ('otomobil', 'ticari', 'arazi', 'minibus', 'kamyon', 'otobus', 'motosiklet', 'diger')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand ON vehicle_models(brand_id);

CREATE TABLE IF NOT EXISTS otomotiv_businesses (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  map_business_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  business_type TEXT NOT NULL DEFAULT 'genel'
    CHECK (business_type IN ('galeri', 'yedek_parca', 'cikma', 'servis', 'yikama', 'lastik', 'genel')),
  city TEXT,
  district TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  image_url TEXT,
  description TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'deleted')),
  google_place_id TEXT,
  working_hours_json JSONB DEFAULT '{}'::jsonb,
  cargo_settings_json JSONB DEFAULT '{}'::jsonb,
  documents_json JSONB DEFAULT '[]'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  listing_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otomotiv_businesses_type ON otomotiv_businesses(business_type, status);
CREATE INDEX IF NOT EXISTS idx_otomotiv_businesses_city ON otomotiv_businesses(city);

CREATE TABLE IF NOT EXISTS otomotiv_listings (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES otomotiv_businesses(id) ON DELETE CASCADE,
  listing_kind TEXT NOT NULL DEFAULT 'vehicle'
    CHECK (listing_kind IN ('vehicle', 'part', 'service_package', 'tire')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  brand_id INTEGER REFERENCES vehicle_brands(id) ON DELETE SET NULL,
  model_id INTEGER REFERENCES vehicle_models(id) ON DELETE SET NULL,
  year INTEGER,
  km INTEGER,
  fuel TEXT,
  transmission TEXT,
  condition TEXT,
  price NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'TRY',
  stock INTEGER,
  sku TEXT,
  compatibility_json JSONB DEFAULT '[]'::jsonb,
  photos_json JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  is_zero_km BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'sold', 'inactive', 'deleted')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_otomotiv_listings_business ON otomotiv_listings(business_id, listing_kind, status);
CREATE INDEX IF NOT EXISTS idx_otomotiv_listings_brand ON otomotiv_listings(brand_id, model_id);

CREATE TABLE IF NOT EXISTS otomotiv_services (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES otomotiv_businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  price NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'TRY',
  service_category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otomotiv_appointment_slots (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES otomotiv_businesses(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES otomotiv_services(id) ON DELETE SET NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, service_id, slot_date, slot_time)
);

-- Varsayılan kategori vitrinleri
INSERT INTO otomotiv_categories (slug, label, description, sort_order) VALUES
  ('galeri', 'Oto Galeri', 'Sıfır ve 2. el araç ilanları', 1),
  ('sifir', 'Sıfır Araç', 'Yetkili bayi ve galeri sıfır km araçları', 2),
  ('ikinci-el', '2. El', 'İkinci el araç ilanları', 3),
  ('yedek-parca', 'Yedek Parça', 'Orijinal ve yan sanayi yedek parça', 4),
  ('cikma', 'Çıkma Parça', 'Söküm ve çıkma parça ilanları', 5),
  ('servis', 'Oto Servis', 'Tamir, bakım ve onarım randevuları', 6),
  ('yikama', 'Oto Yıkama', 'İç/dış yıkama ve detay paketleri', 7),
  ('lastik', 'Lastik', 'Lastik ürünleri ve montaj randevusu', 8)
ON CONFLICT (slug) DO NOTHING;

-- Örnek markalar (Phase 2'de genişletilecek)
INSERT INTO vehicle_brands (name, slug, country, sort_order) VALUES
  ('Toyota', 'toyota', 'JP', 1),
  ('Volkswagen', 'volkswagen', 'DE', 2),
  ('Ford', 'ford', 'US', 3),
  ('Renault', 'renault', 'FR', 4),
  ('Fiat', 'fiat', 'IT', 5),
  ('Hyundai', 'hyundai', 'KR', 6),
  ('Mercedes-Benz', 'mercedes-benz', 'DE', 7),
  ('BMW', 'bmw', 'DE', 8)
ON CONFLICT (slug) DO NOTHING;
