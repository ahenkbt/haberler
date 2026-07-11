-- Logo URL, footer menü, modül açık/kapalı, anasayfa blok sırası
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_nav_json text;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS modules_enabled_json text;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS home_sections_json text;
