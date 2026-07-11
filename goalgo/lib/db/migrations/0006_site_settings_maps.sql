ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "maps_google_browser_key" text;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "maps_google_enabled" boolean DEFAULT false NOT NULL;
