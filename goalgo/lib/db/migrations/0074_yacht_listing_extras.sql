-- Yatport / yat kiralama ilanları için admin düzenlenebilir ek alanlar (map_businesses)

CREATE TABLE IF NOT EXISTS yacht_listing_extras (
  id SERIAL PRIMARY KEY,
  map_business_id VARCHAR NOT NULL UNIQUE REFERENCES map_businesses(id) ON DELETE CASCADE,
  kaptanli BOOLEAN,
  kabin_sayisi INTEGER,
  yatak_sayisi INTEGER,
  wc_sayisi INTEGER,
  uzunluk_m NUMERIC(8, 2),
  yapim_yili INTEGER,
  ilan_no TEXT,
  feature_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  sunulan_hizmetler JSONB NOT NULL DEFAULT '[]'::jsonb,
  ekstra_hizmetler JSONB NOT NULL DEFAULT '[]'::jsonb,
  teknik_detaylar JSONB NOT NULL DEFAULT '{}'::jsonb,
  limanlar JSONB NOT NULL DEFAULT '[]'::jsonb,
  faq_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  saatlik_fiyat NUMERIC(12, 2),
  gunluk_fiyat NUMERIC(12, 2),
  min_sure_saat INTEGER DEFAULT 2,
  kdv_dahil BOOLEAN NOT NULL DEFAULT true,
  kapora_orani INTEGER,
  rental_type_default TEXT DEFAULT 'saatlik',
  related_map_business_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  cancellation_policy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yacht_listing_extras_business
  ON yacht_listing_extras (map_business_id);
