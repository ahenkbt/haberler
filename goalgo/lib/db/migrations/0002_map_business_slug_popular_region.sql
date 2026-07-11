ALTER TABLE "map_businesses" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "map_businesses_slug_unique" ON "map_businesses" ("slug");
--> statement-breakpoint
ALTER TABLE "map_businesses" ADD COLUMN IF NOT EXISTS "scraped_photos" jsonb;
--> statement-breakpoint
ALTER TABLE "map_businesses" ADD COLUMN IF NOT EXISTS "scraped_reviews" jsonb;
--> statement-breakpoint
ALTER TABLE "map_businesses" ADD COLUMN IF NOT EXISTS "scraped_at" timestamp;
--> statement-breakpoint
ALTER TABLE "map_businesses" ADD COLUMN IF NOT EXISTS "homepage_featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "map_businesses" ADD COLUMN IF NOT EXISTS "homepage_super_category" text;
--> statement-breakpoint
ALTER TABLE "map_businesses" ADD COLUMN IF NOT EXISTS "store_type" text;
--> statement-breakpoint
ALTER TABLE "map_popular_locations" ADD COLUMN IF NOT EXISTS "region" text;
--> statement-breakpoint
ALTER TABLE "map_popular_locations" ADD COLUMN IF NOT EXISTS "districts" jsonb;
