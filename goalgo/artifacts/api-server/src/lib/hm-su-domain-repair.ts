import { sql } from "drizzle-orm";
import { db, getNewsDbInstance, isNewsDatabaseConfigured, newsDb } from "@workspace/db";

/** Eski belediyehizmet/Kırşehir satırı — editör haberleri siteId=2'de. */
export const SU_CANONICAL_SITE_ID = 2;

export type SuDomainRepairResult = {
  dryRun: boolean;
  actions: string[];
  canonicalSiteId: number | null;
};

async function runOnAllNewsDatabases(query: ReturnType<typeof sql>): Promise<void> {
  await db.execute(query);
  if (isNewsDatabaseConfigured && newsDb) {
    try {
      await (newsDb as typeof db).execute(query);
    } catch {
      /* mirror best-effort */
    }
  }
  try {
    const primary = getNewsDbInstance();
    if (primary !== db) await primary.execute(query);
  } catch {
    /* ignore */
  }
}

/**
 * Eski belediyehizmet.com sitesi → id=2 /tr/su + suhaberajansi.com.
 * Sahte slug=su satırlarını ve belediyehizmet domainini temizler.
 */
export async function repairSuHaberDomainOwnership(opts?: {
  dryRun?: boolean;
}): Promise<SuDomainRepairResult> {
  const dryRun = opts?.dryRun === true;
  const actions: string[] = [];

  const byId2 = await db.execute(sql`
    SELECT id, slug FROM hm_news_sites WHERE id = ${SU_CANONICAL_SITE_ID} LIMIT 1
  `);
  const id2Rows = ((byId2 as { rows?: unknown[] }).rows ?? []) as Array<{ id: number }>;
  const suFallback = await db.execute(sql`
    SELECT id FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
    ORDER BY id ASC
    LIMIT 1
  `);
  const suRows = ((suFallback as { rows?: unknown[] }).rows ?? []) as Array<{ id: number }>;

  const canonicalSiteId = id2Rows.length
    ? SU_CANONICAL_SITE_ID
    : suRows.length
      ? Number(suRows[0]!.id)
      : null;

  if (!canonicalSiteId) {
    actions.push("no-su-site");
    return { dryRun, actions, canonicalSiteId: null };
  }
  actions.push(`canonical-su-id=${canonicalSiteId}${id2Rows.length ? " (forced-id-2)" : ""}`);

  if (dryRun) {
    actions.push("dry-run-skip-writes");
    return { dryRun, actions, canonicalSiteId };
  }

  // 0) belediyehizmet.com her siteden kaldır
  await runOnAllNewsDatabases(sql`
    UPDATE hm_news_sites
    SET
      domain = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          IN ('belediyehizmet.com', 'belediyehizzmet.com') THEN NULL
        ELSE domain
      END,
      domain2 = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
          IN ('belediyehizmet.com', 'belediyehizzmet.com') THEN NULL
        ELSE domain2
      END,
      domain3 = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
          IN ('belediyehizmet.com', 'belediyehizzmet.com') THEN NULL
        ELSE domain3
      END,
      updated_at = NOW()
    WHERE
      lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
        IN ('belediyehizmet.com', 'belediyehizzmet.com')
      OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
        IN ('belediyehizmet.com', 'belediyehizzmet.com')
      OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
        IN ('belediyehizmet.com', 'belediyehizzmet.com')
  `);
  actions.push("removed-belediyehizmet-from-all-sites");

  // 1) suhaber* alanlarını TÜM sitelerden temizle (unique çakışmasın)
  await runOnAllNewsDatabases(sql`
    UPDATE hm_news_sites
    SET
      domain = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr') THEN NULL
        ELSE domain
      END,
      domain2 = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr') THEN NULL
        ELSE domain2
      END,
      domain3 = CASE
        WHEN lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr') THEN NULL
        ELSE domain3
      END,
      updated_at = NOW()
    WHERE
      lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
        IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
      OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
        IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
      OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
        IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
  `);
  actions.push("cleared-suhaber-from-all-sites");

  // 2) Sahte slug=su satırlarını sil
  await runOnAllNewsDatabases(sql`
    DELETE FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
      AND id <> ${canonicalSiteId}
  `);
  actions.push("deleted-phantom-su-rows");

  // 3) Kanonik satır = /tr/su + suhaberajansi.com
  await runOnAllNewsDatabases(sql`
    UPDATE hm_news_sites
    SET
      slug = 'su',
      domain = 'suhaberajansi.com',
      domain2 = 'www.suhaberajansi.com',
      domain3 = 'suhaberajansi.com.tr',
      display_name = CASE
        WHEN trim(both from coalesce(display_name, '')) = '' THEN 'Su Haber Ajansı'
        WHEN lower(trim(both from display_name)) LIKE '%kırşehir%' THEN 'Su Haber Ajansı'
        WHEN lower(trim(both from display_name)) LIKE '%kirsehir%' THEN 'Su Haber Ajansı'
        ELSE display_name
      END,
      active = true,
      updated_at = NOW()
    WHERE id = ${canonicalSiteId}
  `);
  actions.push(`bound-suhaberajansi.com→id=${canonicalSiteId}`);

  return { dryRun, actions, canonicalSiteId };
}
