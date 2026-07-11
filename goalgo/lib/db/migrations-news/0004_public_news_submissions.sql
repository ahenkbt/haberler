ALTER TABLE "news"
  ADD COLUMN IF NOT EXISTS "sender_full_name" text,
  ADD COLUMN IF NOT EXISTS "sender_email" text,
  ADD COLUMN IF NOT EXISTS "sender_phone" text;

CREATE INDEX IF NOT EXISTS "news_site_sender_draft_idx"
  ON "news" ("site_id", "status", "created_at" DESC)
  WHERE "sender_full_name" IS NOT NULL OR "sender_email" IS NOT NULL OR "sender_phone" IS NOT NULL;
