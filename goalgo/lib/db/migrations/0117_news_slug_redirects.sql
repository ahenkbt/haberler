CREATE TABLE IF NOT EXISTS "news_slug_redirects" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "site_id" integer,
  "title" text,
  "category_slug" text,
  "search_query" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "news_slug_redirects_slug_site_unique"
  ON "news_slug_redirects" ("slug", "site_id");

CREATE INDEX IF NOT EXISTS "news_slug_redirects_slug_idx"
  ON "news_slug_redirects" ("slug");
