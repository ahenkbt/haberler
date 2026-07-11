CREATE TABLE IF NOT EXISTS "delivery_order_status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"source" text DEFAULT 'api' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "delivery_order_status_events_order_id_idx" ON "delivery_order_status_events" ("order_id");
