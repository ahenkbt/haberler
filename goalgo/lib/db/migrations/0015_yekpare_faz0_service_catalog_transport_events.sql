-- Faz 0: birleşik hizmet/talep tipi kataloğu + ulaşım talebi durum günlüğü (delivery ile aynı desen)

CREATE TABLE IF NOT EXISTS "yekpare_service_types" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "domain" TEXT NOT NULL,
  "label_tr" TEXT NOT NULL,
  "description_tr" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "transport_request_status_events" (
  "id" SERIAL PRIMARY KEY,
  "request_id" INTEGER NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'api',
  "note" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "transport_request_status_events_request_id_idx"
  ON "transport_request_status_events" ("request_id");

INSERT INTO "yekpare_service_types" ("code", "domain", "label_tr", "description_tr", "sort_order", "active")
VALUES
  ('delivery.order', 'delivery', 'Sipariş (teslimat)', 'Restoran / işletme siparişi', 10, true),
  ('transport.taxi', 'transport', 'Taksi', 'Anında taksi talebi', 20, true),
  ('transport.courier', 'transport', 'Kurye', 'Motosiklet / bisiklet kurye', 30, true),
  ('transport.tow', 'transport', 'Çekici', 'Yol yardım / çekici', 40, true),
  ('transport.moving', 'transport', 'Nakliyat', 'Ev / ofis taşıma', 50, true),
  ('transport.cargo', 'transport', 'Kargo', 'Paket / kargo taşıma', 60, true),
  ('transport.rideshare', 'transport', 'Araç paylaşımı', 'Sefer ilanı ve rezervasyon', 70, true),
  ('map.premium', 'map', 'Premium işletme', 'Haritalar premium aboneliği', 80, true),
  ('shop.order', 'ecommerce', 'Mağaza siparişi', 'E-ticaret siparişi', 90, true),
  ('tourism.booking', 'tourism', 'Turizm rezervasyonu', 'Tur / etkinlik rezervasyonu', 100, true)
ON CONFLICT ("code") DO NOTHING;
