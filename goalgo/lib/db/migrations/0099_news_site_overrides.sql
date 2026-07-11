CREATE TABLE IF NOT EXISTS "news_site_overrides" (
  "id" serial PRIMARY KEY NOT NULL,
  "article_id" integer NOT NULL,
  "site_id" integer NOT NULL,
  "title" text,
  "spot" text,
  "content" text,
  "image_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "news_site_overrides_article_site_unique"
  ON "news_site_overrides" ("article_id", "site_id");
