-- Güvenlik ağı (Railway healthcheck): 0035 bazı ortamlarda tam uygulanmadan düşmüş olabilir.
-- Tamamen idempotent — tablo ve kolon zaten varsa no-op.
CREATE TABLE IF NOT EXISTS panel_admin_users (
  id varchar PRIMARY KEY DEFAULT (gen_random_uuid()::text) NOT NULL,
  username text NOT NULL UNIQUE,
  email text,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE panel_admin_users
  ADD COLUMN IF NOT EXISTS permissions_json TEXT;

COMMENT ON COLUMN panel_admin_users.permissions_json IS 'NULL = tam yetkili; JSON dizi = alt yönetici izin anahtarları (panel-permissions.ts).';
