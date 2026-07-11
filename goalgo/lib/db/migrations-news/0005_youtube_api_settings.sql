-- YekTube: kaynak bazlı YouTube Data API tercihi (haber cluster DB)
ALTER TABLE video_sources ADD COLUMN IF NOT EXISTS use_youtube_api boolean NOT NULL DEFAULT true;
