/**
 * TürkSav (turksav.org) — Worker kenarı logo/favicon layout onarımı.
 * Katalog: goalgo/artifacts/api-server/src/lib/hm-turksav-site.ts ile hizalı.
 * Yerel / Yeşil Vatan satırlarına dokunmaz.
 */
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";

export const TURKSAV_SLUG = "turksav";
export const TURKSAV_DOMAIN = "turksav.org";
export const TURKSAV_LOGO_PATH = "/turksav/turksav-logo.png";
export const TURKSAV_FAVICON_PATH = "/turksav/turksav-logo.png";
export const TURKSAV_PRIMARY_COLOR = "#1f3b63";

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

export function applyTurksavLogoToLayout(layout) {
  const next =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const needsLogo =
    !logo || logo.toLowerCase().startsWith("data:image/") || logo !== TURKSAV_LOGO_PATH;
  const needsFavicon =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon !== TURKSAV_FAVICON_PATH;
  if (!needsLogo && !needsFavicon) {
    return { layout: next, changed: false };
  }
  next.logoUrl = TURKSAV_LOGO_PATH;
  next.faviconUrl = TURKSAV_FAVICON_PATH;
  if (!next.hmPrimaryColor) next.hmPrimaryColor = TURKSAV_PRIMARY_COLOR;
  return { layout: next, changed: true };
}

export function turksavLayoutNeedsLogoRepair(layoutJsonRaw) {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw);
    return applyTurksavLogoToLayout(layout).changed;
  } catch {
    return true;
  }
}

async function fetchTurksavRow(sql) {
  const rows = await sql`
    SELECT id, slug, domain, layout_json FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${TURKSAV_SLUG}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${TURKSAV_DOMAIN}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${TURKSAV_DOMAIN}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${TURKSAV_DOMAIN}
    ORDER BY
      CASE
        WHEN lower(trim(both '/' from coalesce(slug, ''))) = ${TURKSAV_SLUG} THEN 0
        WHEN lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${TURKSAV_DOMAIN} THEN 1
        ELSE 2
      END,
      id ASC
    LIMIT 1
  `;
  return rows?.[0] || null;
}

async function patchLogoOnSql(sql) {
  const row = await fetchTurksavRow(sql);
  if (!row?.id) return { ok: false, reason: "site-missing" };
  let layout = {};
  try {
    const raw = row.layout_json;
    const str = raw == null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw);
    layout = str.trim() ? JSON.parse(str) : {};
  } catch {
    layout = {};
  }
  const { layout: next, changed } = applyTurksavLogoToLayout(layout);
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
export async function ensureTurksavLogoOnNeon(env) {
  const mainSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  if (!mainSql && !newsSql) return { ok: false, reason: "db-missing" };

  let main = null;
  let php = null;
  if (mainSql) {
    try {
      main = await patchLogoOnSql(mainSql);
    } catch (err) {
      console.error("[hm-turksav-edge] main", String(err?.message || err).slice(0, 180));
      main = { ok: false, reason: String(err?.message || err).slice(0, 120) };
    }
  }
  if (newsSql) {
    try {
      php = await patchLogoOnSql(newsSql);
    } catch (err) {
      console.error("[hm-turksav-edge] php", String(err?.message || err).slice(0, 180));
      php = { ok: false, reason: String(err?.message || err).slice(0, 120) };
    }
  }
  return {
    ok: !!(main?.ok || php?.ok),
    main,
    php,
    host: TURKSAV_DOMAIN,
    slug: TURKSAV_SLUG,
  };
}

export function isTurksavHost(hostname) {
  return normalizeHost(hostname) === TURKSAV_DOMAIN;
}
