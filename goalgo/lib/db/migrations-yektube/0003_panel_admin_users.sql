-- Faz 1: Yektube Studio (/yp/admin) panel auth — YEKTUBE DB üzerinde panel_admin_users.
-- İdempotent. Düz metin şifre YOK — seed için bkz. scripts/seed-yektube-panel-admin.example.sql
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

COMMENT ON COLUMN panel_admin_users.permissions_json IS 'NULL = tam yetkili; JSON dizi = alt yönetici izin anahtarları.';
