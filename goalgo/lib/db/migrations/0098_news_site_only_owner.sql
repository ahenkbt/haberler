ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "site_only" boolean NOT NULL DEFAULT false;
ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "owner_site_id" integer;

CREATE INDEX IF NOT EXISTS "news_site_only_owner_idx"
  ON "news" ("owner_site_id", "site_only");
