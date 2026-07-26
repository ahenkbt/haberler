import { sql } from "drizzle-orm";
import { db, getNewsDbInstance, isNewsDatabaseConfigured, newsDb } from "@workspace/db";

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
 * /tr/su (kanonik en düşük id) → suhaberajansi.com.
 * Sahte çift kayıt ve domain çakışmalarını temizler.
 */
export async function repairSuHaberDomainOwnership(opts?: {
  dryRun?: boolean;
}): Promise<SuDomainRepairResult> {
  const dryRun = opts?.dryRun === true;
  const actions: string[] = [];

  const result = await db.execute(sql`
    SELECT id, slug, domain, domain2, domain3, display_name
    FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
    ORDER BY id ASC
  `);
  const suList = (result.rows ?? []) as Array<{ id: number; slug: string }>;
  const canonicalSiteId = suList.length ? Number(suList[0]!.id) : null;
  if (!canonicalSiteId) {
    actions.push("no-su-site");
    return { dryRun, actions, canonicalSiteId: null };
  }
  actions.push(`canonical-su-id=${canonicalSiteId}`);

  if (dryRun) {
    actions.push("dry-run-skip-writes");
    return { dryRun, actions, canonicalSiteId };
  }

  // 1) suhaber* alanlarını slug≠su sitelerinden temizle
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
    WHERE lower(trim(both '/' from slug)) NOT IN ('su', 'suhaber')
      AND (
        lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
        OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
        OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
      )
  `);
  actions.push("cleared-suhaber-from-non-su");

  // 2) Kanonik /tr/su satırına domainleri yaz
  await runOnAllNewsDatabases(sql`
    UPDATE hm_news_sites
    SET
      domain = 'suhaberajansi.com',
      domain2 = 'www.suhaberajansi.com',
      domain3 = COALESCE(NULLIF(trim(both from domain3), ''), 'suhaberajansi.com.tr'),
      display_name = CASE
        WHEN trim(both from coalesce(display_name, '')) = '' THEN 'Su Haber Ajansı'
        ELSE display_name
      END,
      active = true,
      updated_at = NOW()
    WHERE id = ${canonicalSiteId}
      AND lower(trim(both '/' from slug)) IN ('su', 'suhaber')
  `);
  actions.push(`bound-suhaberajansi.com→id=${canonicalSiteId}`);

  // 3) Daha yüksek id’li sahte slug=su satırlarını sil
  await runOnAllNewsDatabases(sql`
    DELETE FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
      AND id > ${canonicalSiteId}
  `);
  actions.push("deleted-phantom-su-rows");

  return { dryRun, actions, canonicalSiteId };
}
