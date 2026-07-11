ALTER TABLE "global_map_news_feeds"
  ADD COLUMN IF NOT EXISTS "lat" double precision,
  ADD COLUMN IF NOT EXISTS "lng" double precision,
  ADD COLUMN IF NOT EXISTS "region_key" text,
  ADD COLUMN IF NOT EXISTS "region_label" text;

CREATE INDEX IF NOT EXISTS "global_map_news_feeds_region_key_idx"
  ON "global_map_news_feeds" ("region_key", "enabled", "priority" DESC);

CREATE INDEX IF NOT EXISTS "global_map_news_feeds_geo_idx"
  ON "global_map_news_feeds" ("lat", "lng")
  WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL;
