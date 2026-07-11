CREATE TABLE IF NOT EXISTS "driver_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer,
  "courier_id" integer,
  "courier_phone" text NOT NULL,
  "lat" real NOT NULL,
  "lng" real NOT NULL,
  "accuracy" real,
  "heading" real,
  "speed" real,
  "source" text DEFAULT 'courier_panel' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "driver_locations_order_id_idx" ON "driver_locations" ("order_id");
CREATE INDEX IF NOT EXISTS "driver_locations_courier_phone_idx" ON "driver_locations" ("courier_phone");
CREATE INDEX IF NOT EXISTS "driver_locations_created_at_idx" ON "driver_locations" ("created_at");
