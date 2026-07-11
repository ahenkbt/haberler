-- Etkinlik.io etkinlik detay önbelleği (API + sayfa scrape zenginleştirmesi)

CREATE TABLE IF NOT EXISTS etkinlik_event_cache (
  etkinlik_id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  description_html TEXT,
  poster_url TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  venue_name TEXT,
  venue_city TEXT,
  venue_address TEXT,
  venue_lat NUMERIC,
  venue_lng NUMERIC,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  is_free BOOLEAN NOT NULL DEFAULT false,
  min_price NUMERIC,
  max_price NUMERIC,
  currency TEXT DEFAULT 'TRY',
  category_json JSONB,
  format_json JSONB,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ticket_url TEXT,
  external_url TEXT NOT NULL,
  api_payload JSONB,
  scraped_payload JSONB,
  scraped_at TIMESTAMPTZ,
  api_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etkinlik_event_cache_slug ON etkinlik_event_cache (slug);
CREATE INDEX IF NOT EXISTS idx_etkinlik_event_cache_updated ON etkinlik_event_cache (updated_at DESC);
