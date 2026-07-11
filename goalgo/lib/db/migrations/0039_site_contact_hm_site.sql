ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS hm_site_id INTEGER;
ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS hm_site_slug TEXT;
