/**
 * Yeşil Vatan (yesilvatan.gen.tr) — Worker kenarı logo/favicon layout onarımı.
 * Katalog: goalgo/artifacts/api-server/src/lib/hm-yesilvatan-site.ts ile hizalı.
 */
import { applyPhpConceptColorsToLayout } from "./hm-php-concept-colors.js";
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";

export const YESILVATAN_SLUG = "yesilvatan";
export const YESILVATAN_DOMAIN = "yesilvatan.gen.tr";
export const YESILVATAN_LOGO_PATH = "/yesilvatan/yesilvatan-logo.png";
export const YESILVATAN_FAVICON_PATH = "/yesilvatan/yesilvatan-logo.png";
export const YESILVATAN_PRIMARY_COLOR = "#0b6e4f";
export const YESILVATAN_SECONDARY_COLOR = "#2e7d32";

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

export function applyYesilVatanLogoToLayout(layout) {
  const next =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  let changed = false;
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const needsLogo =
    !logo || logo.toLowerCase().startsWith("data:image/") || logo !== YESILVATAN_LOGO_PATH;
  const needsFavicon =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon !== YESILVATAN_FAVICON_PATH;
  if (needsLogo) {
    next.logoUrl = YESILVATAN_LOGO_PATH;
    changed = true;
  }
  if (needsFavicon) {
    next.faviconUrl = YESILVATAN_FAVICON_PATH;
    changed = true;
  }
  const colors = applyPhpConceptColorsToLayout(next, {
    primary: YESILVATAN_PRIMARY_COLOR,
    secondary: YESILVATAN_SECONDARY_COLOR,
  });
  return { layout: colors.layout, changed: changed || colors.changed };
}

export function yesilVatanLayoutNeedsLogoRepair(layoutJsonRaw) {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw);
    return applyYesilVatanLogoToLayout(layout).changed;
  } catch {
    return true;
  }
}

async function fetchYesilVatanRow(sql) {
  const rows = await sql`
    SELECT id, slug, domain, layout_json FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${YESILVATAN_SLUG}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${YESILVATAN_DOMAIN}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${YESILVATAN_DOMAIN}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${YESILVATAN_DOMAIN}
    ORDER BY
      CASE
        WHEN lower(trim(both '/' from coalesce(slug, ''))) = ${YESILVATAN_SLUG} THEN 0
        WHEN lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${YESILVATAN_DOMAIN} THEN 1
        ELSE 2
      END,
      id ASC
    LIMIT 1
  `;
  return rows?.[0] || null;
}

async function patchLogoOnSql(sql) {
  const row = await fetchYesilVatanRow(sql);
  if (!row?.id) return { ok: false, reason: "site-missing" };
  let layout = {};
  try {
    const raw = row.layout_json;
    const str = raw == null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw);
    layout = str.trim() ? JSON.parse(str) : {};
  } catch {
    layout = {};
  }
  const { layout: next, changed } = applyYesilVatanLogoToLayout(layout);
  if (!changed) {
    return { ok: true, action: "unchanged", siteId: Number(row.id) };
  }
  const layoutStr = JSON.stringify(next);
  try {
    await sql`
      UPDATE hm_news_sites
      SET layout_json = ${layoutStr}::jsonb, updated_at = NOW()
      WHERE id = ${row.id}
    `;
  } catch {
    await sql`
      UPDATE hm_news_sites
      SET layout_json = ${layoutStr}, updated_at = NOW()
      WHERE id = ${row.id}
    `;
  }
  return { ok: true, action: "updated", siteId: Number(row.id), layout: next };
}

/**
 * DATABASE_URL + NEWS_DATABASE_URL (PHP) logoUrl/faviconUrl hizala.
 */
export async function ensureYesilVatanLogoOnNeon(env) {
  const mainSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  if (!mainSql && !newsSql) return { ok: false, reason: "db-missing" };

  let main = null;
  let php = null;
  if (mainSql) {
    try {
      main = await patchLogoOnSql(mainSql);
    } catch (err) {
      console.error("[hm-yesilvatan-edge] main", String(err?.message || err).slice(0, 180));
      main = { ok: false, reason: String(err?.message || err).slice(0, 120) };
    }
  }
  if (newsSql) {
    try {
      php = await patchLogoOnSql(newsSql);
    } catch (err) {
      console.error("[hm-yesilvatan-edge] php", String(err?.message || err).slice(0, 180));
      php = { ok: false, reason: String(err?.message || err).slice(0, 120) };
    }
  }
  return {
    ok: !!(main?.ok || php?.ok),
    main,
    php,
    host: YESILVATAN_DOMAIN,
    slug: YESILVATAN_SLUG,
  };
}

export function isYesilVatanHost(hostname) {
  return normalizeHost(hostname) === YESILVATAN_DOMAIN;
}
