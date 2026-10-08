/**
 * gundemi.org apex + bölgesel siteler — logoUrl/faviconUrl ASSETS yolu Neon onarımı.
 * Katalog: goalgo/.../hm-gundemi-regional-sites.ts + hm-gundemi-domain-slug.js
 */
import { gundemiHmSlugFromHost } from "./hm-gundemi-domain-slug.js";
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";

export const GUNDEMI_APEX_DOMAIN = "gundemi.org";
export const GUNDEMI_APEX_SLUG = "gundemi";
export const GUNDEMI_APEX_LOGO_PATH = "/gundemi/logos/gundemi-org.png";

/** Known regional hosts → logo path (slug-gundemi.png). */
export const GUNDEMI_REGIONAL_LOGO_BY_HOST = Object.freeze({
  "ege.gundemi.org": "/gundemi/logos/ege-gundemi.png",
  "marmara.gundemi.org": "/gundemi/logos/marmara-gundemi.png",
  "karadeniz.gundemi.org": "/gundemi/logos/karadeniz-gundemi.png",
  "icanadolu.gundemi.org": "/gundemi/logos/icanadolu-gundemi.png",
  "doguanadolu.gundemi.org": "/gundemi/logos/doguanadolu-gundemi.png",
  "guneydogu.gundemi.org": "/gundemi/logos/guneydogu-gundemi.png",
  "akdeniz.gundemi.org": "/gundemi/logos/akdeniz-gundemi.png",
  "kibris.gundemi.org": "/gundemi/logos/kibris-gundemi.png",
});

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

export function isGundemiBrandHost(hostname) {
  const host = normalizeHost(hostname);
  if (!host) return false;
  if (host === GUNDEMI_APEX_DOMAIN) return true;
  return host.endsWith(`.${GUNDEMI_APEX_DOMAIN}`);
}

/** Expected logo ASSETS path for host, or "". */
export function gundemiLogoPathForHost(hostname) {
  const host = normalizeHost(hostname);
  if (!host) return "";
  if (host === GUNDEMI_APEX_DOMAIN) return GUNDEMI_APEX_LOGO_PATH;
  const known = GUNDEMI_REGIONAL_LOGO_BY_HOST[host];
  if (known) return known;
  const slug = gundemiHmSlugFromHost(host);
  if (!slug || slug === GUNDEMI_APEX_SLUG) return "";
  return `/gundemi/logos/${slug}.png`;
}

/**
 * Wrong / missing logo → force catalog path.
 * Rejects other brand paths (e.g. /sh/sosyal-hizmetler-logo.png on marmara).
 */
export function applyGundemiLogoToLayout(layout, hostname) {
  const logoPath = gundemiLogoPathForHost(hostname);
  const next =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  if (!logoPath) return { layout: next, changed: false, logoPath: "" };

  let changed = false;
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const logoOk = logo === logoPath || logo.endsWith(logoPath);
  const favOk = favicon === logoPath || favicon.endsWith(logoPath);
  const bad =
    !logo ||
    logo.toLowerCase().startsWith("data:image/") ||
    logo.includes("/sh/") ||
    logo.includes("/sosyalhizmetler/") ||
    logo.includes("/turkata/") ||
    !logoOk;
  const badFav =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon.includes("/sh/") ||
    favicon.includes("/sosyalhizmetler/") ||
    !favOk;
  if (bad) {
    next.logoUrl = logoPath;
    changed = true;
  }
  if (badFav) {
    next.faviconUrl = logoPath;
    changed = true;
  }
  return { layout: next, changed, logoPath };
}

export function gundemiLayoutNeedsLogoRepair(layoutJsonRaw, hostname) {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    return applyGundemiLogoToLayout(JSON.parse(raw), hostname).changed;
  } catch {
    return true;
  }
}

async function fetchGundemiRow(sql, hostname) {
  const host = normalizeHost(hostname);
  const slug = gundemiHmSlugFromHost(host) || GUNDEMI_APEX_SLUG;
  const rows = await sql`
    SELECT id, slug, domain, layout_json FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${slug}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host}
    ORDER BY
      CASE
        WHEN lower(trim(both '/' from coalesce(slug, ''))) = ${slug} THEN 0
        WHEN lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host} THEN 1
        ELSE 2
      END,
      id ASC
    LIMIT 1
  `;
  return rows?.[0] || null;
}

async function patchLogoOnSql(sql, hostname) {
  const row = await fetchGundemiRow(sql, hostname);
  if (!row?.id) return { ok: false, reason: "site-missing", host: normalizeHost(hostname) };
  let layout = {};
  try {
    const raw = row.layout_json;
    const str = raw == null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw);
    layout = str.trim() ? JSON.parse(str) : {};
  } catch {
    layout = {};
  }
  const { layout: next, changed, logoPath } = applyGundemiLogoToLayout(layout, hostname);
  if (!changed) {
    return { ok: true, action: "unchanged", siteId: Number(row.id), logoPath };
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
  return { ok: true, action: "updated", siteId: Number(row.id), logoPath, layout: next };
}

/**
 * DATABASE_URL + NEWS_DATABASE_URL (PHP) — tek host logo hizala.
 */
export async function ensureGundemiLogoOnNeon(env, hostname) {
  const host = normalizeHost(hostname);
  if (!isGundemiBrandHost(host)) return { ok: false, reason: "not-gundemi-host" };
  const mainSql = neonSqlClient(env);
  const newsSql = neonNewsSqlClient(env);
  if (!mainSql && !newsSql) return { ok: false, reason: "db-missing" };

  let main = null;
  let php = null;
  if (mainSql) {
    try {
      main = await patchLogoOnSql(mainSql, host);
    } catch (err) {
      console.error("[hm-gundemi-edge] main", String(err?.message || err).slice(0, 180));
      main = { ok: false, reason: String(err?.message || err).slice(0, 120) };
    }
  }
  if (newsSql) {
    try {
      php = await patchLogoOnSql(newsSql, host);
    } catch (err) {
      console.error("[hm-gundemi-edge] php", String(err?.message || err).slice(0, 180));
      php = { ok: false, reason: String(err?.message || err).slice(0, 120) };
    }
  }
  return {
    ok: !!(main?.ok || php?.ok),
    main,
    php,
    host,
    slug: gundemiHmSlugFromHost(host),
    logoPath: gundemiLogoPathForHost(host),
  };
}

/** Apex + 8 bölgesel — idempotent logo pass (edge / ensure). */
export async function ensureAllGundemiLogosOnNeon(env) {
  const hosts = [GUNDEMI_APEX_DOMAIN, ...Object.keys(GUNDEMI_REGIONAL_LOGO_BY_HOST)];
  const results = [];
  for (const host of hosts) {
    results.push(await ensureGundemiLogoOnNeon(env, host));
  }
  return {
    ok: results.some((r) => r.ok),
    results,
  };
}
