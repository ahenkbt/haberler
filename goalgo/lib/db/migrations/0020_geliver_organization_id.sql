-- Geliver bakiye API'si organizationId ister; panelden kaydedilir.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS geliver_organization_id TEXT;
