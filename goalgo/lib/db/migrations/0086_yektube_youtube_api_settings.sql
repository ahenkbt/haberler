-- YekTube: YouTube Data API anahtarı (admin entegrasyonlar) + kaynak bazlı API tercihi
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS youtube_api_key text;
ALTER TABLE video_sources ADD COLUMN IF NOT EXISTS use_youtube_api boolean NOT NULL DEFAULT true;
