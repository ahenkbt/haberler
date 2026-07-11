CREATE TABLE IF NOT EXISTS "portal_rss_item_views" (
  "item_key" text PRIMARY KEY NOT NULL,
  "views" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
