/**
 * turkatahaber.com & yerel.net.tr — Panel Neon layout_json → PHP twilight-pine.
 */
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";
import { KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS } from "./hm-kamu-yerel-layout-lock.js";

const SITES = Object.freeze([
  {
    slug: "turkatahaber",
    domain: "turkatahaber.com",
    logoUrl: "/turkata/turkata-logo.webp",
  },
  {
    slug: "yerelnet",
    domain: "yerel.net.tr",
    logoUrl: "/yerel/yerel-logo.png",
  },
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

export function kamuYerelLayoutNeedsRepair(layoutJsonRaw, expectLogoUrl) {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw);
    const nav = layout?.hmNavOnlyCategorySlugs;
    if (!Array.isArray(nav) || nav.length < KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS.length) return true;
    const set = new Set(nav.map((s) => String(s ?? "").trim().toLowerCase()).filter(Boolean));
    for (const slug of KAMU_YEREL_NAV_TOP_CATEGORY_SLUGS) {
      if (!set.has(slug)) return true;
    }
    if (![...set].some((s) => s.startsWith("bolge-"))) return true;
    const logo = String(layout?.logoUrl ?? "").trim();
    if (!logo || logo.toLowerCase().startsWith("data:image/")) return true;
    if (expectLogoUrl && logo !== expectLogoUrl) return true;
    return false;
  } catch {
    return true;
  }
}

async function fetchLayoutFromSql(sql, { slug, domain }) {
  const rows = await sql`
    SELECT id, layout_json FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${slug}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${domain}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${domain}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${domain}
    ORDER BY
      CASE
        WHEN lower(trim(both '/' from coalesce(slug, ''))) = ${slug} THEN 0
        WHEN lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${domain} THEN 1
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

async function applyLayoutToPhpSite(newsSql, site, layoutStr) {
  const phpRows = await newsSql`
    SELECT id, layout_json FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${site.slug}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${site.domain}
    ORDER BY id ASC
    LIMIT 1
  `;
  const phpId = phpRows?.[0]?.id;
  if (!phpId) return { ok: false, reason: "php-site-missing", slug: site.slug };
  const phpNeeds = kamuYerelLayoutNeedsRepair(phpRows[0].layout_json, site.logoUrl);
  const srcNeeds = kamuYerelLayoutNeedsRepair(layoutStr, site.logoUrl);
  if (!phpNeeds && !srcNeeds) {
    return { ok: true, action: "unchanged", phpSiteId: phpId, slug: site.slug };
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
  return { ok: true, action: "layout_mirrored", phpSiteId: Number(phpId), slug: site.slug };
}

/** Panel → PHP for one kamu-yerel site. */
export async function syncKamuYerelSiteLayoutMainToPhpNeon(env, siteKey) {
  const site =
    SITES.find((s) => s.slug === siteKey || s.domain === normalizeHost(siteKey)) || null;
  if (!site) return { ok: false, reason: "unknown-site" };
  const mainSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  if (!mainSql || !newsSql) return { ok: false, reason: "db-missing", slug: site.slug };
  const fromMain = await fetchLayoutFromSql(mainSql, site);
  const source = fromMain ?? (await fetchLayoutFromSql(newsSql, site));
  if (!source?.layoutStr) return { ok: false, reason: "layout-missing", slug: site.slug };
  const applied = await applyLayoutToPhpSite(newsSql, site, source.layoutStr);
  return { ...applied, workerSiteId: source.siteId };
}

/** Panel → PHP for turkatahaber + yerelnet. */
export async function syncAllKamuYerelLayoutsMainToPhpNeon(env) {
  const out = [];
  for (const site of SITES) {
    try {
      out.push(await syncKamuYerelSiteLayoutMainToPhpNeon(env, site.slug));
    } catch (err) {
      out.push({
        ok: false,
        slug: site.slug,
        reason: String(err?.message || err).slice(0, 160),
      });
    }
  }
  return out;
}

export function isKamuYerelHost(hostname) {
  const h = normalizeHost(hostname);
  return SITES.some((s) => s.domain === h);
}
