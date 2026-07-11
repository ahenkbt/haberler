ALTER TABLE yektube_member_prefs ADD COLUMN IF NOT EXISTS avatar_url text;
--> statement-breakpoint
ALTER TABLE yektube_member_prefs ADD COLUMN IF NOT EXISTS linked_channel_url text;
--> statement-breakpoint
ALTER TABLE yektube_member_prefs ADD COLUMN IF NOT EXISTS push_subscription_json text;
