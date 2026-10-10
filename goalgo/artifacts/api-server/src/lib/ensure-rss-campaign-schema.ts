import { sql } from "drizzle-orm";
import { db, executeNewsDbWrite, getNewsDbForRead } from "@workspace/db";

let ensurePromise: Promise<void> | null = null;

/** Production'da drizzle migrate gecikse bile RSS kampanya sütunlarını ekler. */
export function ensureRssCampaignSchema(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    await db.execute(sql`
      ALTER TABLE rss_campaigns
        ADD COLUMN IF NOT EXISTS hm_site_ids integer[] NOT NULL DEFAULT '{}';
    `);
    await db.execute(sql`
      ALTER TABLE rss_campaigns
        ADD COLUMN IF NOT EXISTS include_yekpare_haber boolean NOT NULL DEFAULT false;
    `);
    await db.execute(sql`
      ALTER TABLE rss_campaigns
        ADD COLUMN IF NOT EXISTS haberler_filter_by_tags boolean NOT NULL DEFAULT false;
    `);
    await db.execute(sql`
      ALTER TABLE rss_campaigns
        ADD COLUMN IF NOT EXISTS kaynak_yonelim text;
    `);
    const readDb = getNewsDbForRead();
    if (readDb !== db) {
      await readDb.execute(sql`
        ALTER TABLE rss_campaigns
          ADD COLUMN IF NOT EXISTS kaynak_yonelim text;
      `).catch(() => undefined);
    }
    await executeNewsDbWrite(sql`
      ALTER TABLE rss_campaigns
        ADD COLUMN IF NOT EXISTS kaynak_yonelim text;
    `).catch(() => undefined);
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });
  return ensurePromise;
}
