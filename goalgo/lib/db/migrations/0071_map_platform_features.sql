CREATE TABLE IF NOT EXISTS map_saved_places (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar,
  device_id text,
  business_id varchar,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'place',
  category text,
  address text,
  phone text,
  website text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  source text NOT NULL DEFAULT 'map_center',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_saved_places_user_created_idx
  ON map_saved_places (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS map_saved_places_device_created_idx
  ON map_saved_places (device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS map_user_place_drafts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar,
  device_id text,
  business_id varchar,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'business',
  category text,
  address text,
  phone text,
  website text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  source text NOT NULL DEFAULT 'user_added',
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_user_place_drafts_status_created_idx
  ON map_user_place_drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS map_user_place_drafts_device_created_idx
  ON map_user_place_drafts (device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS map_share_states (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  user_id varchar,
  device_id text,
  title text,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  zoom integer NOT NULL DEFAULT 6,
  base_layer text NOT NULL DEFAULT 'temel',
  layers jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_share_states_device_created_idx
  ON map_share_states (device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS map_layer_definitions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text,
  kind text NOT NULL DEFAULT 'overlay',
  source_type text NOT NULL DEFAULT 'internal',
  source_url text,
  is_enabled boolean NOT NULL DEFAULT true,
  requires_external_data boolean NOT NULL DEFAULT false,
  empty_state text,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_layer_definitions_enabled_sort_idx
  ON map_layer_definitions (is_enabled, sort_order);

INSERT INTO map_layer_definitions (key, label, icon, kind, source_type, source_url, is_enabled, requires_external_data, empty_state, sort_order, metadata)
VALUES
  ('base-temel', 'Temel Harita', '🗺️', 'base', 'tile', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', true, false, NULL, 10, '{"baseLayer":"temel"}'::jsonb),
  ('base-hava', 'Uydu / Hava Fotoğrafı', '🛰️', 'base', 'tile', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', true, false, NULL, 20, '{"baseLayer":"hava_fotografi"}'::jsonb),
  ('base-gece', 'Gece Haritası', '🌙', 'base', 'tile', 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', true, false, NULL, 30, '{"baseLayer":"gece"}'::jsonb),
  ('server-cluster', 'Sunucu Tarafı İşaretleyici Kümeleme', '📍', 'overlay', 'api', '/api/map/businesses/cluster', true, false, NULL, 40, '{"feature":"cluster"}'::jsonb),
  ('road-status', 'Yol Durumu', '🚦', 'overlay', 'kgm', '/api/map/kgm/route-analysis', true, true, 'Canlı trafik kaynağı bağlanmadıysa KGM yol çalışması/kapalı yol bağlamı gösterilir.', 50, '{"feature":"roadStatus"}'::jsonb),
  ('photos', 'Fotoğraflar', '📷', 'media', 'business-media', '/api/map/businesses/:id/google-details', true, true, 'Seçili yer veya işletme fotoğrafı olduğunda gösterilir.', 60, '{"feature":"photos"}'::jsonb),
  ('panorama', 'Panorama', '👁️', 'media', 'managed-media', NULL, true, true, 'Panorama medyası bağlandığında gösterilir; sahte canlı panorama üretilmez.', 70, '{"feature":"panorama"}'::jsonb),
  ('map-edit', 'Haritayı Düzenle', '✏️', 'edit', 'api', '/api/map/user-place-drafts', true, false, NULL, 80, '{"feature":"edit"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
