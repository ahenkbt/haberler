-- Konum bazlı Bilgi Ağacı / Vikipedi özet önbelleği (cache-through).
-- İdempotent: mevcut kurulumlarda tekrar çalışabilir.
CREATE TABLE IF NOT EXISTS "location_wiki_cache" (
  "id" serial PRIMARY KEY,
  "slug" text NOT NULL,
  "place_type" text NOT NULL DEFAULT 'il',
  "lang" text NOT NULL DEFAULT 'tr',
  "title" text NOT NULL,
  "extract" text NOT NULL DEFAULT '',
  "image_url" text,
  "source_url" text,
  "lat" double precision,
  "lng" double precision,
  "resolved_lang" text,
  "hit_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "refreshed_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "location_wiki_cache_key_unique"
  ON "location_wiki_cache" ("lang", "place_type", "slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "location_wiki_cache_refreshed_idx"
  ON "location_wiki_cache" ("refreshed_at");
