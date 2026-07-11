CREATE TABLE IF NOT EXISTS "portal_rss_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "feed_id" text NOT NULL,
  "site_id" integer,
  "category_slug" text NOT NULL,
  "item_key" text NOT NULL,
  "dedupe_key" text NOT NULL,
  "title" text NOT NULL,
  "title_key" text NOT NULL DEFAULT '',
  "link" text NOT NULL DEFAULT '',
  "spot" text,
  "content_html" text,
  "image_url" text,
  "source_name" text,
  "lang" text NOT NULL DEFAULT 'tr',
  "published_at" timestamptz NOT NULL DEFAULT now(),
  "geo_lat" double precision,
  "geo_lng" double precision,
  "region_key" text,
  "region_label" text,
  "country_code" text,
  "cached_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "portal_rss_items_feed_dedupe_unique"
  ON "portal_rss_items" ("feed_id", "dedupe_key");

CREATE INDEX IF NOT EXISTS "portal_rss_items_category_published_idx"
  ON "portal_rss_items" ("category_slug", "published_at");

CREATE INDEX IF NOT EXISTS "portal_rss_items_site_published_idx"
  ON "portal_rss_items" ("site_id", "published_at");

CREATE INDEX IF NOT EXISTS "portal_rss_items_published_idx"
  ON "portal_rss_items" ("published_at");
