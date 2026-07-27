/**
 * HM sitelerinde aynı id ile farklı slug (dual-write / sequence sapması / bozulmuş PK).
 * Panel `key={id}` ve API dedupe yüzünden siteler kaybolur; çakışan satırlara yeni id verir.
 * Kök siteler (tr, su, …) korunur; `kirsehirhaber` taşınır — `kh` yeniden yaratılmaz.
 */
import { sql } from "drizzle-orm";
import {
  db,
  executeNewsDbWrite,
  getNewsDbForRead,
  getNewsDbInstance,
  hmNewsSitesTable,
  isNewsDatabaseConfigured,
  newsDb,
} from "@workspace/db";

export type HmSiteIdCollisionRepairResult = {
  scanned: number;
  reassigned: Array<{ slug: string; fromId: number; toId: number; db: string }>;
  detail?: string;
};

type AppDb = ReturnType<typeof getNewsDbForRead>;

function normSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

/** Bilinen “kök” siteler — id’leri koru; çakışan yenileri taşı. */
const KEEP_SLUG_PRIORITY = new Set([
  "su",
  "tr",
  "vkd",
  "asg",
  "vatanhaber",
  "ankarahabergundemi",
  "trafik",
]);

type SiteIdRow = { id: number; slug: string | null };

async function loadSiteRows(target: AppDb): Promise<SiteIdRow[]> {
  return target
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
    })
    .from(hmNewsSitesTable)
    .orderBy(hmNewsSitesTable.id);
}

async function reassignSiteId(opts: {
  fromId: number;
  toId: number;
  slug: string;
  dryRun: boolean;
  writeSql: (q: ReturnType<typeof sql>) => Promise<unknown>;
}): Promise<void> {
  const { fromId, toId, slug, dryRun, writeSql } = opts;
  if (dryRun) return;

  await writeSql(sql`
    UPDATE hm_news_sites
    SET id = ${toId}, updated_at = NOW()
    WHERE lower(trim(both '/' from slug)) = ${slug}
      AND id = ${fromId}
  `);

  // KH editörlerini yeni id'ye taşı (kök site editörlerine dokunma).
  if (slug === "kirsehirhaber" || slug === "kirsehir" || slug === "kh") {
    await writeSql(sql`
      UPDATE hm_site_editors e
      SET site_id = ${toId}
      WHERE e.site_id = ${fromId}
        AND (
          lower(e.email) LIKE '%kirsehirhaber%'
          OR lower(coalesce(e.display_name, '')) LIKE '%kırşehir%'
          OR lower(coalesce(e.display_name, '')) LIKE '%kirsehir%'
        )
    `).catch(() => undefined);
  } else {
    // fromId'de başka site kalmadıysa tüm editörleri taşı.
    await writeSql(sql`
      UPDATE hm_site_editors e
      SET site_id = ${toId}
      WHERE e.site_id = ${fromId}
        AND NOT EXISTS (SELECT 1 FROM hm_news_sites s WHERE s.id = ${fromId})
        AND EXISTS (
          SELECT 1 FROM hm_news_sites s
          WHERE s.id = ${toId}
            AND lower(trim(both '/' from s.slug)) = ${slug}
        )
    `).catch(() => undefined);
  }

  await writeSql(sql`
    UPDATE news
    SET site_id = ${toId}
    WHERE site_id = ${fromId}
      AND NOT EXISTS (SELECT 1 FROM hm_news_sites s WHERE s.id = ${fromId})
      AND EXISTS (
        SELECT 1 FROM hm_news_sites s
        WHERE s.id = ${toId}
          AND lower(trim(both '/' from s.slug)) = ${slug}
      )
  `).catch(() => undefined);

  await writeSql(sql`
    UPDATE news
    SET owner_site_id = ${toId}
    WHERE owner_site_id = ${fromId}
      AND NOT EXISTS (SELECT 1 FROM hm_news_sites s WHERE s.id = ${fromId})
      AND EXISTS (
        SELECT 1 FROM hm_news_sites s
        WHERE s.id = ${toId}
          AND lower(trim(both '/' from s.slug)) = ${slug}
      )
  `).catch(() => undefined);
}

async function syncSequence(writeSql: (q: ReturnType<typeof sql>) => Promise<unknown>): Promise<void> {
  await writeSql(sql`
    SELECT setval(
      pg_get_serial_sequence('hm_news_sites', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM hm_news_sites), 1)
    )
  `).catch(() => undefined);
}

async function repairOneDb(opts: {
  label: string;
  target: AppDb;
  dryRun: boolean;
  writeSql: (q: ReturnType<typeof sql>) => Promise<unknown>;
}): Promise<{ scanned: number; reassigned: HmSiteIdCollisionRepairResult["reassigned"] }> {
  const { label, target, dryRun, writeSql } = opts;
  const rows = await loadSiteRows(target);
  const byId = new Map<number, SiteIdRow[]>();
  let maxId = 0;

  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (id > maxId) maxId = id;
    const arr = byId.get(id) ?? [];
    arr.push(row);
    byId.set(id, arr);
  }

  const reassigned: HmSiteIdCollisionRepairResult["reassigned"] = [];

  for (const [id, group] of byId) {
    if (group.length < 2) continue;
    const keep =
      group.find((r) => KEEP_SLUG_PRIORITY.has(normSlug(r.slug))) ?? group[0];
    for (const row of group) {
      if (row === keep) continue;
      const slug = normSlug(row.slug);
      if (!slug) continue;
      maxId += 1;
      const toId = maxId;
      await reassignSiteId({ fromId: id, toId, slug, dryRun, writeSql });
      reassigned.push({ slug, fromId: id, toId, db: label });
    }
  }

  // kirsehirhaber ile tr aynı id (tek satırlık mirror overwrite sonrası sapma)
  if (!reassigned.some((r) => r.db === label && r.slug === "kirsehirhaber")) {
    const kirsehir = rows.find((r) => normSlug(r.slug) === "kirsehirhaber");
    const tr = rows.find((r) => normSlug(r.slug) === "tr");
    if (kirsehir && tr && Number(kirsehir.id) === Number(tr.id)) {
      maxId += 1;
      const toId = maxId;
      await reassignSiteId({
        fromId: Number(kirsehir.id),
        toId,
        slug: "kirsehirhaber",
        dryRun,
        writeSql,
      });
      reassigned.push({
        slug: "kirsehirhaber",
        fromId: Number(kirsehir.id),
        toId,
        db: label,
      });
    }
  }

  if (!dryRun && reassigned.length > 0) {
    await syncSequence(writeSql);
  }

  return { scanned: rows.length, reassigned };
}

export async function repairHmSiteIdCollisions(opts?: {
  dryRun?: boolean;
}): Promise<HmSiteIdCollisionRepairResult> {
  const dryRun = opts?.dryRun === true;
  const reassigned: HmSiteIdCollisionRepairResult["reassigned"] = [];
  let scanned = 0;

  if (isNewsDatabaseConfigured && newsDb) {
    const mainResult = await repairOneDb({
      label: "main",
      target: db as AppDb,
      dryRun,
      writeSql: async (q) => (db as AppDb).execute(q),
    });
    scanned += mainResult.scanned;
    reassigned.push(...mainResult.reassigned);

    const newsTarget = getNewsDbInstance();
    const newsResult = await repairOneDb({
      label: "news",
      target: newsTarget,
      dryRun,
      writeSql: async (q) => newsTarget.execute(q),
    });
    scanned += newsResult.scanned;
    reassigned.push(...newsResult.reassigned);
  } else {
    const readDb = getNewsDbForRead();
    const result = await repairOneDb({
      label: "primary",
      target: readDb,
      dryRun,
      writeSql: (q) => executeNewsDbWrite(q),
    });
    scanned += result.scanned;
    reassigned.push(...result.reassigned);
  }

  const uniq = new Map<string, (typeof reassigned)[number]>();
  for (const r of reassigned) {
    uniq.set(`${r.db}:${r.slug}:${r.fromId}->${r.toId}`, r);
  }
  const list = Array.from(uniq.values());

  return {
    scanned,
    reassigned: list,
    detail: list.length ? `${list.length} site id yeniden atandı` : "çakışma yok",
  };
}
