CREATE TABLE IF NOT EXISTS "vkd_msb_sehitler" (
  "id" serial PRIMARY KEY NOT NULL,
  "msb_id" text NOT NULL,
  "name" text NOT NULL,
  "rank" text DEFAULT '' NOT NULL,
  "registry" text DEFAULT '' NOT NULL,
  "notice" text DEFAULT '' NOT NULL,
  "martyrdom_date" text DEFAULT '' NOT NULL,
  "year" integer,
  "image_path" text DEFAULT '' NOT NULL,
  "search_text" text DEFAULT '' NOT NULL,
  "first_seen_at" text DEFAULT '' NOT NULL,
  "updated_at" text DEFAULT '' NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "vkd_msb_sehitler_msb_id_idx" ON "vkd_msb_sehitler" ("msb_id");
CREATE INDEX IF NOT EXISTS "vkd_msb_sehitler_year_idx" ON "vkd_msb_sehitler" ("year");
CREATE INDEX IF NOT EXISTS "vkd_msb_sehitler_search_idx" ON "vkd_msb_sehitler" ("search_text");
