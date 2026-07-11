-- Legacy cleanup: seri-ilanlar / sari-sayfalar artifacts and orphan map records

-- 1) Fully retire seri-ilanlar
DROP TABLE IF EXISTS "seri_ilanlar";

-- 2) Remove old placement key from pricing
DELETE FROM "map_feature_placement_pricing" WHERE "placement_key" = 'seri_ilanlar';

-- 3) Drop unused legacy support tables
DROP TABLE IF EXISTS "map_notifications";
DROP TABLE IF EXISTS "map_otps";
DROP TABLE IF EXISTS "emlak_listings";

-- 4) Remove emlak vendor remnants (fresh DB: vendor_id kolonu henüz yoksa atla)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_businesses' AND column_name = 'vendor_id'
  ) THEN
    UPDATE "map_businesses"
    SET "vendor_id" = NULL
    WHERE "vendor_id" IN (SELECT "id" FROM "vendors" WHERE "vendor_type" = 'emlak');
  END IF;
END $$;

DELETE FROM "vendors" WHERE "vendor_type" = 'emlak';

-- 5) Keep only vendor-linked map businesses (public map should list service providers only)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'map_business_images',
    'map_products',
    'map_campaigns',
    'map_reservations',
    'map_orders',
    'map_premium_payments',
    'map_user_reviews',
    'map_feature_promotion_requests',
    'map_contact_messages',
    'map_reviews',
    'map_favorites',
    'map_ownership_claims',
    'map_business_applications'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_businesses' AND column_name = 'vendor_id'
  ) THEN
    RETURN;
  END IF;
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format(
        'DELETE FROM %I WHERE business_id IN (SELECT id FROM map_businesses WHERE vendor_id IS NULL)',
        t
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'map_businesses' AND column_name = 'vendor_id'
  ) THEN
    DELETE FROM "map_businesses" WHERE "vendor_id" IS NULL;
  END IF;
END $$;
