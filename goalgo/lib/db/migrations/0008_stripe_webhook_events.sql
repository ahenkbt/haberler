CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"outcome" text NOT NULL,
	"detail" text,
	"related_order_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_webhook_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_event_type_idx" ON "stripe_webhook_events" ("event_type");
