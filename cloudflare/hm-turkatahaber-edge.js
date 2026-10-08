/**
 * turkatahaber.com — PHP Neon (twilight-pine) layout onarımı.
 * Panel Neon'daki güncel layout_json → PHP site satırına kopyalanır.
 */
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";

export const TURKATAHABER_SLUG = "turkatahaber";
export const TURKATAHABER_DOMAIN = "turkatahaber.com";

const NAV_TOP = Object.freeze([
  "yerel",
  "cumhurbaskanligi",
  "bakanliklar",
  "tbmm",
  "siyasi-partiler",
  "yerel-yonetimler",
  "mulki-idare",
  "toplum-ve-yasam",
  "daha",
  "sivil-toplum-kuruluslari",
  "kamu-kurumlari",
]);

function normalizeHost(raw) {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

export function turkataLayoutNeedsRepair(layoutJsonRaw) {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw);
    const nav = layout?.hmNavOnlyCategorySlugs;
    // Page allowlist must include tepe menü + at least one bolge-* (PHP /kategori gate).
    if (!Array.isArray(nav) || nav.length < NAV_TOP.length) return true;
    const set = new Set(nav.map((s) => String(s ?? "").trim().toLowerCase()).filter(Boolean));
    for (const slug of NAV_TOP) {
      if (!set.has(slug)) return true;
    }
    if (![...set].some((s) => s.startsWith("bolge-"))) return true;
    const logo = String(layout?.logoUrl ?? "").trim();
    if (!logo || logo.toLowerCase().startsWith("data:image/")) return true;
    if (logo.startsWith("/brand/turkata/")) return true;
    if (logo !== "/turkata/turkata-logo.webp") return true;
    return false;
  } catch {
    return true;
  }
}

async function fetchTurkataLayoutFromSql(sql) {
  const rows = await sql`
    SELECT id, layout_json FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${TURKATAHABER_SLUG}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${TURKATAHABER_DOMAIN}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${TURKATAHABER_DOMAIN}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${TURKATAHABER_DOMAIN}
    ORDER BY
      CASE
        WHEN lower(trim(both '/' from coalesce(slug, ''))) = ${TURKATAHABER_SLUG} THEN 0
        WHEN lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${TURKATAHABER_DOMAIN} THEN 1
        ELSE 2
      END,
      id ASC
    LIMIT 1
  `;
  const row = rows?.[0];
  if (!row?.id) return null;
  const layoutRaw = row.layout_json;
  const layoutStr =
    layoutRaw == null ? "" : typeof layoutRaw === "string" ? layoutRaw : JSON.stringify(layoutRaw);
  if (!layoutStr.trim()) return null;
  return { siteId: Number(row.id), layoutStr };
}

async function applyLayoutToPhpSite(newsSql, layoutStr) {
  const phpRows = await newsSql`
    SELECT id, layout_json FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${TURKATAHABER_SLUG}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${TURKATAHABER_DOMAIN}
    ORDER BY id ASC
    LIMIT 1
  `;
  const phpId = phpRows?.[0]?.id;
  if (!phpId) return { ok: false, reason: "php-site-missing" };
  if (!turkataLayoutNeedsRepair(phpRows[0].layout_json) && !turkataLayoutNeedsRepair(layoutStr)) {
    return { ok: true, action: "unchanged", phpSiteId: phpId };
  }
  try {
    await newsSql`
      UPDATE hm_news_sites
      SET layout_json = ${layoutStr}::jsonb, updated_at = NOW()
      WHERE id = ${phpId}
    `;
  } catch {
    await newsSql`
      UPDATE hm_news_sites
      SET layout_json = ${layoutStr}, updated_at = NOW()
      WHERE id = ${phpId}
    `;
  }
  return { ok: true, action: "layout_mirrored", phpSiteId: Number(phpId) };
}

/**
 * DATABASE_URL layout → NEWS_DATABASE_URL (PHP twilight-pine #230).
 */
export async function syncTurkatahaberLayoutMainToPhpNeon(env) {
  const mainSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  if (!mainSql || !newsSql) return { ok: false, reason: "db-missing" };
  const fromMain = await fetchTurkataLayoutFromSql(mainSql);
  const source = fromMain ?? (await fetchTurkataLayoutFromSql(newsSql));
  if (!source?.layoutStr) return { ok: false, reason: "layout-missing" };
  const applied = await applyLayoutToPhpSite(newsSql, source.layoutStr);
  return { ...applied, workerSiteId: source.siteId };
}

export function isTurkatahaberHost(hostname) {
  return normalizeHost(hostname) === TURKATAHABER_DOMAIN;
}
