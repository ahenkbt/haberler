import { sql } from "drizzle-orm";
import { db, getNewsDbInstance, isNewsDatabaseConfigured, newsDb } from "@workspace/db";

/** Eski belediyehizmet/Kırşehir satırı — editör haberleri siteId=2'de. */
export const SU_CANONICAL_SITE_ID = 2;

export const SU_DEFAULT_EDITOR_EMAIL = "editor@suhaberajansi.com";

export type SuDomainRepairResult = {
  dryRun: boolean;
  actions: string[];
  canonicalSiteId: number | null;
};

export type SuOrphanedNewsRepairResult = {
  dryRun: boolean;
  restored: number;
  actions: string[];
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

function normSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function isSuSlug(raw: unknown): boolean {
  const s = normSlug(raw);
  return s === "su" || s === "suhaber";
}

async function nextHmSiteId(): Promise<number> {
  const maxIdResult = await db.execute(sql`SELECT COALESCE(MAX(id), 1) AS max_id FROM hm_news_sites`);
  const maxRows = ((maxIdResult as { rows?: unknown[] }).rows ?? []) as Array<{ max_id: number }>;
  return Number(maxRows[0]?.max_id ?? 0) + 1;
}

/**
 * hm_news_sites satırı silinince FK ON DELETE SET NULL → haberler merkez havuzuna düşer.
 * Su Haber manuel içeriklerini siteId=2'ye geri bağlar.
 */
export async function repairSuHaberOrphanedNews(opts?: {
  dryRun?: boolean;
}): Promise<SuOrphanedNewsRepairResult> {
  const dryRun = opts?.dryRun === true;
  const actions: string[] = [];
  const canonicalSiteId = SU_CANONICAL_SITE_ID;

  if (dryRun) {
    actions.push("dry-run-skip-writes");
    return { dryRun, restored: 0, actions };
  }

  let restored = 0;
  const bump = async (label: string, query: ReturnType<typeof sql>) => {
    const result = await db.execute(query);
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
    const n = Number((result as { rowCount?: number }).rowCount ?? 0);
    if (n > 0) {
      restored += n;
      actions.push(`${label}=${n}`);
    }
  };

  await bump(
    "sync-provenance",
    sql`
      UPDATE news
      SET
        site_id = ${canonicalSiteId},
        owner_site_id = COALESCE(owner_site_id, ${canonicalSiteId}),
        site_only = true,
        updated_at = NOW()
      WHERE site_id IS NULL
        AND status = 'published'
        AND (
          coalesce(rss_source_url, '') LIKE 'yekpare-hm-sync:2:%'
          OR coalesce(rss_source_url, '') LIKE 'yekpare-hm-sync:24:%'
          OR owner_site_id IN (2, 24)
        )
    `,
  );

  await bump(
    "author-provenance",
    sql`
      UPDATE news n
      SET
        site_id = ${canonicalSiteId},
        owner_site_id = ${canonicalSiteId},
        site_only = true,
        updated_at = NOW()
      FROM authors a
      WHERE n.site_id IS NULL
        AND n.status = 'published'
        AND n.author_id = a.id
        AND a.hm_site_id = ${canonicalSiteId}
    `,
  );

  await bump(
    "override-provenance",
    sql`
      UPDATE news n
      SET
        site_id = ${canonicalSiteId},
        owner_site_id = ${canonicalSiteId},
        site_only = true,
        updated_at = NOW()
      FROM news_site_overrides o
      WHERE n.site_id IS NULL
        AND n.status = 'published'
        AND o.site_id = ${canonicalSiteId}
        AND o.article_id = n.id
    `,
  );

  await bump(
    "editor-manset-local",
    sql`
      UPDATE news
      SET
        site_id = ${canonicalSiteId},
        owner_site_id = ${canonicalSiteId},
        site_only = true,
        updated_at = NOW()
      WHERE site_id IS NULL
        AND status = 'published'
        AND (is_featured = true OR is_site_manset = true OR is_breaking = true OR is_editor_manual = true)
        AND (
          coalesce(image_url, '') LIKE '%/api/media/uploads/%'
          OR coalesce(image_url, '') LIKE '/api/media/uploads/%'
        )
        AND coalesce(rss_source_url, '') NOT LIKE 'yekpare-hm-sync:%'
        AND title ~ '[çğıöşüÇĞİÖŞÜ]'
    `,
  );

  return { dryRun, restored, actions };
}

/**
 * Eski belediyehizmet.com sitesi → id=2 /tr/su + suhaberajansi.com.
 * Çakışma onarımı su'yu başka id'ye taşırsa haberleri siteId=2'de bırakır; burada birleştirir.
 */
export async function repairSuHaberDomainOwnership(opts?: {
  dryRun?: boolean;
}): Promise<SuDomainRepairResult> {
  const dryRun = opts?.dryRun === true;
  const actions: string[] = [];
  const canonicalSiteId = SU_CANONICAL_SITE_ID;

  const allSu = await db.execute(sql`
    SELECT id, slug FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
    ORDER BY id ASC
  `);
  const suRows = ((allSu as { rows?: unknown[] }).rows ?? []) as Array<{ id: number; slug: string }>;

  const byId2 = await db.execute(sql`
    SELECT id, slug FROM hm_news_sites WHERE id = ${canonicalSiteId} LIMIT 1
  `);
  const id2Rows = ((byId2 as { rows?: unknown[] }).rows ?? []) as Array<{ id: number; slug: string }>;
  const id2Row = id2Rows[0] ?? null;

  if (!id2Row && suRows.length === 0) {
    actions.push("no-su-site");
    return { dryRun, actions, canonicalSiteId: null };
  }

  const phantomSuIds = suRows.map((r) => Number(r.id)).filter((id) => id !== canonicalSiteId);
  actions.push(`target-canonical-id=${canonicalSiteId}`);
  if (phantomSuIds.length) actions.push(`phantom-su-ids=${phantomSuIds.join(",")}`);

  if (dryRun) {
    actions.push("dry-run-skip-writes");
    return { dryRun, actions, canonicalSiteId };
  }

  // id=2 başka slug'taysa yeni id'ye taşı — su kanonik id=2'yi alsın.
  if (id2Row && !isSuSlug(id2Row.slug)) {
    const newId = await nextHmSiteId();
    const displacedSlug = normSlug(id2Row.slug);
    await runOnAllNewsDatabases(sql`
      UPDATE hm_news_sites SET id = ${newId}, updated_at = NOW()
      WHERE id = ${canonicalSiteId}
    `);
    await runOnAllNewsDatabases(sql`
      UPDATE hm_site_editors SET site_id = ${newId} WHERE site_id = ${canonicalSiteId}
    `).catch(() => undefined);
    await runOnAllNewsDatabases(sql`
      UPDATE news SET site_id = ${newId} WHERE site_id = ${canonicalSiteId}
    `).catch(() => undefined);
    await runOnAllNewsDatabases(sql`
      UPDATE news SET owner_site_id = ${newId} WHERE owner_site_id = ${canonicalSiteId}
    `).catch(() => undefined);
    actions.push(`displaced-id-2-slug=${displacedSlug}→id=${newId}`);
  }

  // Sahte su satırını (ör. id=24) id=2'ye taşı.
  const suAtCanonical = suRows.some((r) => Number(r.id) === canonicalSiteId);
  const primaryPhantom = phantomSuIds[0];
  if (!suAtCanonical && primaryPhantom != null) {
    await runOnAllNewsDatabases(sql`
      UPDATE hm_news_sites SET id = ${canonicalSiteId}, updated_at = NOW()
      WHERE id = ${primaryPhantom}
    `);
    actions.push(`reassigned-su-id=${primaryPhantom}→${canonicalSiteId}`);
  }

  // Kalan sahte su id'lerindeki haber/editörleri kanonik siteye al.
  for (const phantomId of phantomSuIds) {
    if (phantomId === primaryPhantom && !suAtCanonical) continue;
    await runOnAllNewsDatabases(sql`
      UPDATE news SET site_id = ${canonicalSiteId} WHERE site_id = ${phantomId}
    `).catch(() => undefined);
    await runOnAllNewsDatabases(sql`
      UPDATE news SET owner_site_id = ${canonicalSiteId} WHERE owner_site_id = ${phantomId}
    `).catch(() => undefined);
    await runOnAllNewsDatabases(sql`
      UPDATE hm_site_editors SET site_id = ${canonicalSiteId} WHERE site_id = ${phantomId}
    `).catch(() => undefined);
    actions.push(`merged-from-id=${phantomId}`);
  }

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
    WHERE id <> ${canonicalSiteId}
      AND (
        lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
        OR lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
        OR lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
          IN ('suhaberajansi.com', 'suhaberajansi.com.tr')
      )
  `);
  actions.push("cleared-suhaber-from-other-sites");

  const suDomains = ["suhaberajansi.com", "www.suhaberajansi.com", "suhaberajansi.com.tr"] as const;
  for (const host of suDomains) {
    await runOnAllNewsDatabases(sql`
      UPDATE hm_news_sites
      SET
        domain = CASE WHEN lower(regexp_replace(regexp_replace(coalesce(domain, ''), '^www\\.', ''), '\\.$', ''))
          = lower(regexp_replace(${host}, '^www\\.', '')) THEN NULL ELSE domain END,
        domain2 = CASE WHEN lower(regexp_replace(regexp_replace(coalesce(domain2, ''), '^www\\.', ''), '\\.$', ''))
          = lower(regexp_replace(${host}, '^www\\.', '')) THEN NULL ELSE domain2 END,
        domain3 = CASE WHEN lower(regexp_replace(regexp_replace(coalesce(domain3, ''), '^www\\.', ''), '\\.$', ''))
          = lower(regexp_replace(${host}, '^www\\.', '')) THEN NULL ELSE domain3 END,
        updated_at = NOW()
      WHERE id <> ${canonicalSiteId}
    `);
  }

  for (const phantomId of phantomSuIds) {
    await runOnAllNewsDatabases(sql`
      UPDATE news
      SET site_id = ${canonicalSiteId}, owner_site_id = ${canonicalSiteId}, site_only = true, updated_at = NOW()
      WHERE site_id = ${phantomId}
    `).catch(() => undefined);
  }

  await runOnAllNewsDatabases(sql`
    DELETE FROM hm_news_sites
    WHERE lower(trim(both '/' from slug)) IN ('su', 'suhaber')
      AND id <> ${canonicalSiteId}
  `);
  actions.push("deleted-phantom-su-rows");

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
      contact_json = CASE
        WHEN coalesce(contact_json::text, '') IN ('', '{}', 'null')
          OR coalesce((contact_json::jsonb)->>'email', '') = ''
        THEN (jsonb_build_object(
          'phone', coalesce((contact_json::jsonb)->>'phone', ''),
          'email', ${SU_DEFAULT_EDITOR_EMAIL},
          'address', coalesce((contact_json::jsonb)->>'address', '')
        ))::text
        ELSE contact_json
      END,
      active = true,
      updated_at = NOW()
    WHERE id = ${canonicalSiteId}
  `);
  actions.push(`bound-suhaberajansi.com→id=${canonicalSiteId}`);

  const orphan = await repairSuHaberOrphanedNews({ dryRun: false });
  if (orphan.restored > 0) {
    actions.push(`restored-orphan-news=${orphan.restored}`);
    actions.push(...orphan.actions);
  }

  return { dryRun, actions, canonicalSiteId };
}
