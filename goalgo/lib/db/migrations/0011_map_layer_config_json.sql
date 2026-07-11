ALTER TABLE "map_system_settings"
  ADD COLUMN IF NOT EXISTS "map_layer_config_json" text;
