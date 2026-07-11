ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_allowed boolean NOT NULL DEFAULT true;
