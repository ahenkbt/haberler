/**
 * brand-shift 2026-10-11: panel (main DB) hm_news_sites.id ≠ PHP (twilight-pine, newsDb) hm_news_sites.id.
 * Example: panel 1134 = sosyalhizmetler.tr, PHP 1134 = an inactive Marmara duplicate, PHP 1145 = sosyalhizmetler.tr.
 * Mirroring a panel save "by id" wrote one site's layout into another site's live row (03:14–03:37 TRT shift).
 *
 * Rule: a panel row maps to a PHP row ONLY by a stable key — the canonical domain (then domain2/domain3), and by
 * slug only when the panel row has no domain at all. The match must be unique. There is NO numeric-id fallback.
 * When nothing (or more than one row) matches, callers must refuse the PHP write.
 */
import { eq, or, sql } from "drizzle-orm";
import { db } from "./connection";
import { newsDb } from "./newsDb";
import { hmNewsSitesTable } from "./schema/hm";

import { hostsOf, matchPhpSiteRow, type PanelSiteKeys, type PhpSiteResolution } from "./phpSiteMatch";
export { matchPhpSiteRow, normalizeSiteHost, type PanelSiteKeys, type PhpSiteCandidate, type PhpSiteResolution } from "./phpSiteMatch";

/** Load PHP candidates that could match this panel row (by any of its hosts, or slug). */
export async function resolvePhpSiteForPanelRow(panel: PanelSiteKeys): Promise<PhpSiteResolution> {
  if (!newsDb) return { ok: false, reason: "NEWS_DATABASE_URL yok" };
  const hosts = hostsOf(panel);
  const conds = hosts.flatMap((h) => [
    sql`lower(regexp_replace(coalesce(${hmNewsSitesTable.domain}, ''), '^www\\.', '')) = ${h}`,
    sql`lower(regexp_replace(coalesce(${hmNewsSitesTable.domain2}, ''), '^www\\.', '')) = ${h}`,
    sql`lower(regexp_replace(coalesce(${hmNewsSitesTable.domain3}, ''), '^www\\.', '')) = ${h}`,
  ]);
  const slug = String(panel.slug ?? "").trim().toLowerCase();
  if (hosts.length === 0 && slug) conds.push(eq(hmNewsSitesTable.slug, slug));
  if (conds.length === 0) return { ok: false, reason: "PHP satırı eşlenemedi: alan adı ve slug yok" };
  const rows = await newsDb
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      active: hmNewsSitesTable.active,
    })
    .from(hmNewsSitesTable)
    .where(or(...conds));
  return matchPhpSiteRow(panel, rows.map((r) => ({ ...r, id: Number(r.id) })));
}

/** Panel (main DB) id → PHP id, resolved by the panel row's domain/slug. */
export async function resolvePhpSiteIdForPanelId(panelSiteId: number): Promise<PhpSiteResolution> {
  const sid = Math.trunc(Number(panelSiteId));
  if (!Number.isFinite(sid) || sid <= 0) return { ok: false, reason: "geçersiz site id" };
  const [w] = await db
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, sid))
    .limit(1);
  if (!w) return { ok: false, reason: "panel sitesi bulunamadı" };
  return resolvePhpSiteForPanelRow(w);
}
