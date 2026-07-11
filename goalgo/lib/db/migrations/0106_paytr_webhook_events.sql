CREATE TABLE IF NOT EXISTS "paytr_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"paytr_event_hash" text NOT NULL,
	"merchant_oid" text NOT NULL,
	"paytr_status" text NOT NULL,
	"total_amount" text,
	"outcome" text NOT NULL,
	"detail" text,
	"related_order_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paytr_webhook_events_paytr_event_hash_unique" UNIQUE("paytr_event_hash")
);
CREATE INDEX IF NOT EXISTS "paytr_webhook_events_merchant_oid_idx" ON "paytr_webhook_events" ("merchant_oid");
