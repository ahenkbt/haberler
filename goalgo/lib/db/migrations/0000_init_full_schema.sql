CREATE TYPE "public"."map_business_app_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."map_notification_status" AS ENUM('ACTIVE', 'RESOLVED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."map_notification_type" AS ENUM('TRAFFIC_ACCIDENT', 'ROAD_CLOSED', 'OTHER');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text DEFAULT '#CC0000' NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"avatar_url" text,
	"bio" text
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"spot" text,
	"content" text,
	"image_url" text,
	"category_id" integer,
	"author_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_breaking" boolean DEFAULT false NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rss_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"post_type" text DEFAULT 'news' NOT NULL,
	"category_slug" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"feeds" text[] DEFAULT '{}' NOT NULL,
	"source_type" text DEFAULT 'rss' NOT NULL,
	"interval_minutes" integer DEFAULT 30 NOT NULL,
	"days_window" integer DEFAULT 0 NOT NULL,
	"daily_limit" integer DEFAULT 0 NOT NULL,
	"download_images" boolean DEFAULT true NOT NULL,
	"headline" boolean DEFAULT false NOT NULL,
	"breaking_keywords" text[] DEFAULT '{}' NOT NULL,
	"min_words" integer DEFAULT 0 NOT NULL,
	"translate_enabled" boolean DEFAULT false NOT NULL,
	"source_lang" text,
	"target_lang" text,
	"translate_engine" text,
	"added_count" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rss_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"action" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"platform" text DEFAULT 'youtube' NOT NULL,
	"source_type" text DEFAULT 'channel' NOT NULL,
	"channel_id" text NOT NULL,
	"url" text,
	"logo_url" text,
	"category_slug" text DEFAULT 'haberler' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"video_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"platform" text DEFAULT 'youtube' NOT NULL,
	"video_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail" text,
	"channel_name" text,
	"channel_id" text,
	"published_at" text,
	"duration" text,
	"category_slug" text DEFAULT 'haberler' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_headline" boolean DEFAULT false NOT NULL,
	"is_story" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"accent_color" text,
	CONSTRAINT "homepage_modules_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ad_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"html" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ad_slots_slot_key_unique" UNIQUE("slot_key")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_name" text DEFAULT 'AhenkPress' NOT NULL,
	"tagline" text DEFAULT 'Kırşehir Haber' NOT NULL,
	"logo_text_1" text DEFAULT 'Ahenk' NOT NULL,
	"logo_text_2" text DEFAULT 'Press' NOT NULL,
	"primary_color" text DEFAULT '#CC0000' NOT NULL,
	"secondary_color" text DEFAULT '#1F2937' NOT NULL,
	"navbar_bg" text DEFAULT '#FFFFFF' NOT NULL,
	"navbar_text" text DEFAULT '#111827' NOT NULL,
	"breaking_bg" text DEFAULT '#CC0000' NOT NULL,
	"finance_bg" text DEFAULT '#0F172A' NOT NULL,
	"footer_text" text DEFAULT 'AhenkPress haber portalı.' NOT NULL,
	"copyright_text" text DEFAULT '© AhenkPress. Tüm hakları saklıdır.' NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"whatsapp" text,
	"facebook" text,
	"twitter" text,
	"instagram" text,
	"youtube" text,
	"telegram" text
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"openai_api_key" text DEFAULT '' NOT NULL,
	"openai_model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"language" text DEFAULT 'tr' NOT NULL,
	"auto_uniquify" boolean DEFAULT false NOT NULL,
	"word_count" integer DEFAULT 600 NOT NULL,
	"post_status" text DEFAULT 'draft' NOT NULL,
	"rss_urls" text DEFAULT '' NOT NULL,
	"max_per_source" integer DEFAULT 5 NOT NULL,
	"interval_hours" integer DEFAULT 24 NOT NULL,
	"auto_run_enabled" boolean DEFAULT false NOT NULL,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"total_ai_runs" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"tracking_code" text,
	"user_id" integer,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"customer_address" text,
	"customer_city" text,
	"customer_postal" text,
	"customer_district" text,
	"billing_name" text,
	"billing_address" text,
	"billing_city" text,
	"billing_tax_id" text,
	"subtotal" numeric(10, 2),
	"tax_amount" numeric(10, 2),
	"total_amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text DEFAULT 'credit_card' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" text,
	"cargo_company" text,
	"cargo_tracking_number" text,
	"cargo_tracking_url" text,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"estimated_delivery" text,
	"notes" text,
	"admin_note" text,
	"items" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_tracking_code_unique" UNIQUE("tracking_code")
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_enabled" boolean DEFAULT false NOT NULL,
	"stripe_publishable_key" text,
	"stripe_secret_key" text,
	"stripe_webhook_secret" text,
	"bank_transfer_enabled" boolean DEFAULT false NOT NULL,
	"bank_name" text,
	"bank_iban" text,
	"bank_account_name" text,
	"bank_branch" text,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '20' NOT NULL,
	"order_email_from" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"parent_id" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"short_description" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sale_price" numeric(10, 2),
	"sku" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"images" text[],
	"category_id" integer,
	"tags" text[],
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shop_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_name" text DEFAULT 'Mağaza',
	"store_description" text,
	"banner_image_url" text,
	"return_policy" text DEFAULT 'Ürünü teslim aldıktan sonra 14 gün içinde iade edebilirsiniz. İade edilecek ürünlerin kullanılmamış, orijinal ambalajında ve fatura ile birlikte gönderilmesi gerekmektedir.',
	"shipping_info" text DEFAULT 'Siparişleriniz 1-3 iş günü içinde kargoya verilir. 500₺ ve üzeri siparişlerde kargo ücretsizdir.',
	"contact_phone" text,
	"contact_email" text,
	"contact_address" text,
	"working_hours" text DEFAULT 'Pazartesi - Cuma: 09:00 - 18:00',
	"whatsapp" text,
	"featured_category_slug" text,
	"banner_subtext" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"city" text,
	"district" text,
	"postal" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "photo_galleries" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_gallery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"gallery_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resmi_ilanlar" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"institution" text DEFAULT '' NOT NULL,
	"deadline" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"pdf_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seri_ilanlar" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"price" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_galleries" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_gallery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"gallery_id" integer NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"phone" text,
	"domain" text,
	"activation_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"plan" text DEFAULT 'pro' NOT NULL,
	"price" integer DEFAULT 0,
	"payment_method" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"activated_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "licenses_activation_code_unique" UNIQUE("activation_code")
);
--> statement-breakpoint
CREATE TABLE "site_activation" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"activation_code" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"domain" text,
	"activated_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "map_business_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_businesses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" text,
	"name" text NOT NULL,
	"category_id" varchar,
	"city_id" varchar,
	"district_id" varchar,
	"neighborhood_id" varchar,
	"address" text,
	"email" text,
	"phone" text,
	"whatsapp_number" text,
	"website" text,
	"instagram_url" text,
	"facebook_url" text,
	"twitter_url" text,
	"youtube_url" text,
	"menu_url" text,
	"rating" double precision,
	"user_ratings_total" integer,
	"photo_url" text,
	"cover_photo_url" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"premium_expires_at" timestamp,
	"owner_id" varchar,
	"stripe_customer_id" text,
	"social_media" jsonb,
	"description" text,
	"working_hours" jsonb,
	"popular_hours" jsonb,
	"price_level" integer,
	"has_delivery" boolean DEFAULT false NOT NULL,
	"has_reservation" boolean DEFAULT false NOT NULL,
	"has_online_order" boolean DEFAULT false NOT NULL,
	"tags" text[],
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "map_businesses_google_place_id_unique" UNIQUE("google_place_id")
);
--> statement-breakpoint
CREATE TABLE "map_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"discount_percent" integer,
	"discount_amount" double precision,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"google_place_type" text,
	"icon" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "map_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "map_cities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "map_cities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "map_device_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fcm_token" text NOT NULL,
	"device_id" text,
	"user_id" varchar,
	"phone" text,
	"platform" text,
	"app_version" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "map_device_tokens_fcm_token_unique" UNIQUE("fcm_token")
);
--> statement-breakpoint
CREATE TABLE "map_districts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"google_place_id" text NOT NULL,
	"business_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_neighborhoods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"district_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "map_notification_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"user_id" varchar,
	"status" "map_notification_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"user_id" varchar,
	"guest_name" text,
	"guest_phone" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_amount" double precision DEFAULT 0 NOT NULL,
	"delivery_address" text,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_otps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_ownership_claims" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" text NOT NULL,
	"business_id" varchar,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"message" text,
	"status" "map_business_app_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_popular_locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_tr" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"zoom_level" integer DEFAULT 13 NOT NULL,
	"image_url" text,
	"description" text,
	"business_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_premium_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"amount" double precision,
	"currency" text DEFAULT 'try' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"plan_months" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "map_premium_payments_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "map_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" double precision,
	"discounted_price" double precision,
	"image_url" text,
	"category" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_deliverable" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_reservations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar NOT NULL,
	"user_id" varchar,
	"guest_name" text,
	"guest_phone" text,
	"guest_email" text,
	"reservation_date" timestamp NOT NULL,
	"party_size" integer DEFAULT 1 NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"google_place_id" text NOT NULL,
	"business_id" varchar,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_system_settings" (
	"id" text PRIMARY KEY DEFAULT 'system' NOT NULL,
	"google_places_api_key" text,
	"automatic_google_data_fetch" boolean DEFAULT false NOT NULL,
	"firebase_project_id" text,
	"eczane_api_key" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text,
	"email" text,
	"password_hash" text,
	"first_name" text,
	"last_name" text,
	"display_name" text,
	"photo_url" text,
	"phone" text,
	"provider" text DEFAULT 'google' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"city_id" varchar,
	"district_id" varchar,
	"fcm_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "map_users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "map_users_email_unique" UNIQUE("email"),
	CONSTRAINT "map_users_phone_unique" UNIQUE("phone")
);
