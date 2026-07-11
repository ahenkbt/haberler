CREATE TABLE IF NOT EXISTS "global_map_news_feeds" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "continent" text NOT NULL,
  "country_code" text,
  "country_name" text,
  "category" text NOT NULL DEFAULT 'news',
  "scope" text NOT NULL DEFAULT 'country',
  "enabled" boolean NOT NULL DEFAULT true,
  "priority" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "global_map_news_feeds_url_unique"
  ON "global_map_news_feeds" (lower(trim("url")));

CREATE INDEX IF NOT EXISTS "global_map_news_feeds_continent_idx"
  ON "global_map_news_feeds" ("continent", "enabled", "priority" DESC);

CREATE INDEX IF NOT EXISTS "global_map_news_feeds_country_idx"
  ON "global_map_news_feeds" ("country_code", "enabled", "priority" DESC);
