-- Featured promotion requests + home showcase slots

CREATE TABLE IF NOT EXISTS "map_feature_placement_pricing" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "placement_key" text NOT NULL UNIQUE,
  "label_tr" text NOT NULL,
  "price_day" double precision NOT NULL DEFAULT 0,
  "price_week" double precision NOT NULL DEFAULT 0,
  "price_month" double precision NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "map_feature_promotion_requests" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" varchar NOT NULL,
  "owner_user_id" varchar,
  "placement_key" text NOT NULL,
  "billing_period" text NOT NULL,
  "units" integer NOT NULL DEFAULT 1,
  "total_try" double precision NOT NULL,
  "payment_method" text NOT NULL,
  "receipt_url" text,
  "category_super" text,
  "status" text NOT NULL DEFAULT 'pending',
  "admin_note" text,
  "target_type" text NOT NULL DEFAULT 'business',
  "product_id" varchar,
  "campaign_id" varchar,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "map_products"
  ADD COLUMN IF NOT EXISTS "home_featured" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "home_featured_until" timestamp;

ALTER TABLE "map_campaigns"
  ADD COLUMN IF NOT EXISTS "home_featured" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "home_featured_until" timestamp;

ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "home_recent_business_limit" integer NOT NULL DEFAULT 15;

ALTER TABLE "site_settings"
  ALTER COLUMN "home_recent_business_limit" SET DEFAULT 15;

INSERT INTO "map_feature_placement_pricing"
  ("placement_key","label_tr","price_day","price_week","price_month","sort_order")
VALUES
  ('homepage', 'Anasayfa Öne Çıkan İşletme', 199, 999, 2999, 10),
  ('category_home', 'Kategori Vitrini Öne Çıkarma', 99, 599, 1799, 20),
  ('kesfet_harita', 'Haritalarda Premium Görünürlük', 149, 899, 2499, 30),
  ('product_home', 'Anasayfada Öne Çıkan Ürün', 79, 449, 1299, 40),
  ('campaign_home', 'Anasayfada Öne Çıkan Kampanya', 79, 449, 1299, 50)
ON CONFLICT ("placement_key") DO NOTHING;
