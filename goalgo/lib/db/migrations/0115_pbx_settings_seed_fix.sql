-- PBX login bootstrap: avoid ON CONFLICT when id PK missing; backfill demo_mode on drifted schemas
CREATE TABLE IF NOT EXISTS pbx_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  demo_mode BOOLEAN NOT NULL DEFAULT true,
  sip_bridge_url TEXT,
  sip_bridge_ws_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pbx_settings
  ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sip_bridge_url TEXT,
  ADD COLUMN IF NOT EXISTS sip_bridge_ws_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO pbx_settings (id, demo_mode)
SELECT 1, true
WHERE NOT EXISTS (SELECT 1 FROM pbx_settings WHERE id = 1);
