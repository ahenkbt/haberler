import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { OTOMOTIV_SERVICE_CATEGORY_ROWS } from "./otomotiv-service-categories-data.js";

/** otomotiv_service_categories tablosunu taksonomi ile doldurur / günceller */
export async function seedOtomotivServiceCategoriesIfNeeded(logger?: {
  info: (msg: string, obj?: object) => void;
  error: (obj: object, msg: string) => void;
}) {
  const log = (msg: string, obj?: object) => (logger ? logger.info(msg, obj ?? {}) : console.log(msg, obj ?? ""));
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS otomotiv_service_categories (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        group_slug TEXT NOT NULL,
        group_name TEXT NOT NULL,
        store_type TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        group_sort_order INTEGER NOT NULL DEFAULT 0,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        icon TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      ALTER TABLE otomotiv_businesses ADD COLUMN IF NOT EXISTS servis_category_slug TEXT
    `);

    let upserted = 0;
    for (const row of OTOMOTIV_SERVICE_CATEGORY_ROWS) {
      await db.execute(sql`
        INSERT INTO otomotiv_service_categories (
          slug, name, group_slug, group_name, store_type, sort_order, group_sort_order, tags, icon, is_active
        ) VALUES (
          ${row.slug},
          ${row.name},
          ${row.group_slug},
          ${row.group_name},
          ${row.store_type},
          ${row.sort_order},
          ${row.group_sort_order},
          ${JSON.stringify(row.tags)}::jsonb,
          ${row.icon},
          true
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          group_slug = EXCLUDED.group_slug,
          group_name = EXCLUDED.group_name,
          store_type = EXCLUDED.store_type,
          sort_order = EXCLUDED.sort_order,
          group_sort_order = EXCLUDED.group_sort_order,
          tags = EXCLUDED.tags,
          icon = EXCLUDED.icon,
          is_active = true,
          updated_at = NOW()
      `);
      upserted += 1;
    }
    log(`seedOtomotivServiceCategories: ${upserted} categories upserted`);
  } catch (err) {
    logger ? logger.error({ err }, "seedOtomotivServiceCategories failed") : console.error("seedOtomotivServiceCategories failed", err);
  }
}
