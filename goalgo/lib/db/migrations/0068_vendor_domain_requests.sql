-- Servis sağlayıcı özel domain talep/onay akışı
ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

UPDATE vendor_custom_domains
SET status = 'approved',
    approved_at = COALESCE(approved_at, verified_at, updated_at, NOW())
WHERE status IS NULL OR status = '';
