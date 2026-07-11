ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS preferred_provider TEXT NOT NULL DEFAULT 'auto';
