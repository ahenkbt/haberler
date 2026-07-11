-- Şehir kartları için önbelleğe alınmış kapak görseli
ALTER TABLE "map_cities" ADD COLUMN IF NOT EXISTS "image_url" text;
