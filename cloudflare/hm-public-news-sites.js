/**
 * Public news-site list + live logos (2026-10-08, user request).
 *
 *   GET /api/hm/public/news-sites[?exclude=<host>]   → { sites: [{ id, slug, name, domain, url, logo, logoBg }] }
 *   GET /api/hm/public/news-sites/<id>/logo          → the site's CURRENT layout_json.logoUrl
 *                                                       (data: URI decoded; path/URL → 302), short cache.
 *
 * Used by turkatahaber.com/daha (server-rendered grid, hm-kamu-yerel-extra-pages-edge.js) and
 * ahenk.net.tr/turkata-haber-ajansi (SPA). Rules: only active news sites; corporate sites
 * (TÜRKATA Vakfı 61, Vatan Kahramanları Derneği 7, Trafik Güvenliği Derneği 11) and publicly
 * suspended sites (layout_json.hmPublicSuspended = true, e.g. kirsehirhaber.org) never appear.
 * A new row in hm_news_sites shows up automatically (≤ 60 s isolate cache + short HTTP cache).
 *
 * 81 İl Haber Ağı (2026-10-09): il siteleri (<il>.fix.tc, layout_json.hmIl81) ana `sites` listesine GİRMEZ
 * (25 ana logo kalır); ayrı `ilSites` listesinde döner ve /daha + ajans sayfasında ayrı "İl Siteleri" grubu olur.
 */
import { neon } from "@neondatabase/serverless";
import { isNeonServerlessUrl } from "./neon-edge-url.js";

export const NEWS_SITES_LIST_PATH = "/api/hm/public/news-sites";
const LOGO_PATH_RE = /^\/api\/hm\/public\/news-sites\/(\d{1,9})\/logo$/;

/** Corporate (kurumsal) sites — never in the news-site grid. */
export const CORPORATE_SITE_IDS = new Set([7, 11, 61]);
const CORPORATE_SLUGS = new Set(["vkd", "vatankahramanlari", "trafik", "tr", "tukav", "turkatav"]);
const CORPORATE_HOSTS = new Set([
  "vatankahramanlari.org",
  "vatankahramanlari.org.tr",
  "trafik.gd",
  "trafikdernegi.com",
  "tgd.tc",
  "tukav.org",
  "turkatav.org",
]);

const CACHE_MS = 60_000;
let rowsCache = { at: 0, rows: /** @type {any[] | null} */ (null) };

export function normalizeSiteHost(raw) {
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

function parseLayout(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(String(raw || ""));
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function isCorporate(row, host) {
  const id = Number(row?.id);
  if (CORPORATE_SITE_IDS.has(id)) return true;
  const slug = String(row?.slug ?? "").trim().toLowerCase();
  if (CORPORATE_SLUGS.has(slug)) return true;
  if (slug.includes("vatankahramanlari") || slug.includes("trafikdernegi")) return true;
  return CORPORATE_HOSTS.has(host);
}

/** Small fast hash (FNV-1a) so the logo URL changes whenever the logo setting changes. */
export function logoVersion(value) {
  let h = 0x811c9dc5;
  const s = String(value || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function safeColor(v) {
  const s = String(v ?? "").trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : "";
}

/**
 * Pure filter/shape step (tested). rows: hm_news_sites rows (id, slug, domain, display_name, active, layout_json).
 * @returns {{ id:number, slug:string, name:string, domain:string, url:string, logoRaw:string, logoBg:string }[]}
 */
export function publicNewsSitesFromRows(rows, { group = "main" } = {}) {
  const byHost = new Map();
  for (const row of rows || []) {
    if (!row || row.active === false || row.active === "f") continue;
    const host = normalizeSiteHost(row.domain);
    if (!host) continue;
    if (isCorporate(row, host)) continue;
    const layout = parseLayout(row.layout_json ?? row.layoutJson);
    if (layout.hmPublicSuspended === true) continue;
    if (layout.hmCorporateSite === true || layout.hmSiteKind === "kurumsal") continue;
    const isIl = Boolean(layout.hmIl81 && typeof layout.hmIl81 === "object");
    if (group === "il" ? !isIl : isIl) continue;
    const logoRaw = String(layout.logoUrl ?? "").trim() || String(layout.faviconUrl ?? "").trim();
    const site = {
      id: Number(row.id),
      slug: String(row.slug ?? "").trim(),
      name: String(row.display_name ?? row.displayName ?? row.slug ?? host).trim() || host,
      domain: host,
      url: `https://${host}/`,
      logoRaw,
      logoBg: safeColor(layout.hmLogoBarBackground),
      ...(isIl ? { il: String(layout.hmIl81.il || ""), plate: String(layout.hmIl81.plate || ""), region: String(layout.hmIl81.region || "") } : {}),
    };
    const prev = byHost.get(host);
    // One tile per domain: keep the lowest id that has a logo (duplicate rows such as marmara.gundemi.org).
    if (!prev || (!prev.logoRaw && site.logoRaw) || (Boolean(prev.logoRaw) === Boolean(site.logoRaw) && site.id < prev.id)) {
      byHost.set(host, site);
    }
  }
  const out = [...byHost.values()];
  // İl siteleri plaka sırasıyla (01 Adana … 81 Düzce), ana liste id sırasıyla.
  if (group === "il") return out.sort((a, b) => Number(a.plate) - Number(b.plate) || a.id - b.id);
  return out.sort((a, b) => a.id - b.id);
}

function readClients(env) {
  const out = [];
  for (const key of ["NEWS_DATABASE_URL", "DATABASE_URL"]) {
    const url = String(env?.[key] || "").trim();
    if (url && isNeonServerlessUrl(url)) {
      try {
        out.push(neon(url));
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

async function loadRows(env) {
  const now = Date.now();
  if (rowsCache.rows && now - rowsCache.at < CACHE_MS) return rowsCache.rows;
  for (const sql of readClients(env)) {
    try {
      const rows = await Promise.race([
        sql`SELECT id, slug, domain, display_name, active, layout_json FROM hm_news_sites ORDER BY id ASC`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
      ]);
      if (Array.isArray(rows) && rows.length) {
        rowsCache = { at: now, rows };
        return rows;
      }
    } catch (err) {
      console.error("[public-news-sites]", String(err?.message || err).slice(0, 160));
    }
  }
  return rowsCache.rows || [];
}

/** Live list for server-side renderers (e.g. /daha). logo = absolute URL on `origin`. */
export async function listPublicNewsSites(env, { origin = "", exclude = "", group = "main" } = {}) {
  const ex = normalizeSiteHost(exclude);
  const o = String(origin || "").replace(/\/+$/, "");
  return publicNewsSitesFromRows(await loadRows(env), { group })
    .filter((s) => !ex || s.domain !== ex)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      domain: s.domain,
      url: s.url,
      logo: s.logoRaw ? `${o}${NEWS_SITES_LIST_PATH}/${s.id}/logo?v=${logoVersion(s.logoRaw)}` : "",
      logoBg: s.logoBg,
      ...(s.il ? { il: s.il, plate: s.plate, region: s.region } : {}),
    }));
}

function escapeHtml(raw) {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const NEWS_SITES_GRID_STYLE = `<style>
.hm-ns-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}
.hm-ns-grid li{margin:0;padding:0}
.hm-ns-card{display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:10px;height:100%;padding:16px 12px 12px;border:1px solid var(--ys-line,rgba(0,0,0,.12));border-radius:12px;background:#fff;color:inherit;text-decoration:none;transition:box-shadow .15s,transform .15s,border-color .15s}
.hm-ns-card:hover{box-shadow:0 8px 22px rgba(0,0,0,.12);transform:translateY(-2px);border-color:rgba(0,0,0,.2)}
.hm-ns-logo{display:flex;align-items:center;justify-content:center;width:100%;height:72px;border-radius:8px;padding:6px 8px;box-sizing:border-box}
.hm-ns-logo img{display:block;max-width:100%;max-height:60px;width:auto;height:auto;object-fit:contain}
.hm-ns-logo .hm-ns-initial{font-weight:800;font-size:1.1rem;line-height:1.2;text-align:center;color:#0b3362}
.hm-ns-name{font-size:.92rem;font-weight:700;line-height:1.25;text-align:center}
.hm-ns-domain{font-size:.78rem;opacity:.65;line-height:1.2;text-align:center;word-break:break-all}
@media (max-width:560px){.hm-ns-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.hm-ns-logo{height:60px}.hm-ns-logo img{max-height:48px}}
</style>`;

/** Server-rendered grid HTML (same data as the JSON endpoint). */
export function renderNewsSitesGrid(sites, { heading = "Haber sitelerimiz", sectionId = "daha-haber-siteleri", footerHtml = "" } = {}) {
  const items = (sites || [])
    .map((s) => {
      const bg = s.logoBg ? ` style="background:${escapeHtml(s.logoBg)}"` : "";
      // Logo henüz yüklenmemişse (404) kart boş kalmasın: site adı görünür.
      const img = s.logo
        ? `<img src="${escapeHtml(s.logo)}" alt="${escapeHtml(s.name)} logosu" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="hm-ns-initial" style="display:none">${escapeHtml(s.name)}</span>`
        : `<span class="hm-ns-initial">${escapeHtml(s.name)}</span>`;
      return `<li><a class="hm-ns-card hm-daha-site-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener" title="${escapeHtml(s.name)}"><span class="hm-ns-logo"${bg}>${img}</span><span class="hm-ns-name hm-daha-site-name">${escapeHtml(s.name)}</span><span class="hm-ns-domain">${escapeHtml(s.domain)}</span></a></li>`;
    })
    .join("");
  return `<section id="${escapeHtml(sectionId)}" class="hm-daha-sites hm-ns-sites" data-count="${(sites || []).length}">${NEWS_SITES_GRID_STYLE}<h2 class="hm-daha-section-title">${escapeHtml(heading)}</h2><ul class="hm-ns-grid hm-daha-site-grid">${items}</ul>${footerHtml}</section>`;
}

export const IL_SITES_HEADING = "İl Siteleri";

/** /daha "İl Siteleri" grubu (81 İl Haber Ağı). Tam liste ve "yakında" iller her haber sitesinin /iller sayfasında. */
export function renderIlSitesGrid(sites) {
  return renderNewsSitesGrid(sites, {
    heading: IL_SITES_HEADING,
    sectionId: "daha-il-siteleri",
    footerHtml: `<p class="hm-ns-more"><a href="https://gundemi.org/iller" target="_blank" rel="noopener">81 İl Haber Ağı — tüm iller</a></p>`,
  });
}

function decodeDataUri(uri) {
  const m = /^data:([a-z0-9.+/-]+)?(;charset=[^;,]+)?(;base64)?,(.*)$/is.exec(uri);
  if (!m) return null;
  const type = (m[1] || "application/octet-stream").toLowerCase();
  if (!/^image\//.test(type)) return null;
  try {
    if (m[3]) {
      const bin = atob(m[4].replace(/\s+/g, ""));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { type, bytes };
    }
    return { type, bytes: new TextEncoder().encode(decodeURIComponent(m[4])) };
  } catch {
    return null;
  }
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=120",
  "access-control-allow-origin": "*",
  "x-yekpare-frontend": "hm-public-news-sites",
};

/**
 * @returns {Promise<Response|null>}
 */
export async function handlePublicNewsSites(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = String(incoming.pathname || "").replace(/\/+$/, "");
  if (path === NEWS_SITES_LIST_PATH) {
    const opts = {
      origin: `${incoming.protocol}//${incoming.host}`,
      exclude: incoming.searchParams.get("exclude") || "",
    };
    const sites = await listPublicNewsSites(env, opts);
    const ilSites = await listPublicNewsSites(env, { ...opts, group: "il" });
    const body = JSON.stringify({ count: sites.length, sites, ilCount: ilSites.length, ilSites });
    return new Response(request.method === "HEAD" ? null : body, { status: 200, headers: JSON_HEADERS });
  }
  const m = LOGO_PATH_RE.exec(path);
  if (!m) return null;
  const id = Number(m[1]);
  const rows = await loadRows(env);
  const site =
    publicNewsSitesFromRows(rows).find((s) => s.id === id) ||
    publicNewsSitesFromRows(rows, { group: "il" }).find((s) => s.id === id);
  const shortCache = "public, max-age=300, s-maxage=300";
  if (!site || !site.logoRaw) {
    return new Response("logo yok", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=60" },
    });
  }
  const raw = site.logoRaw;
  if (/^data:/i.test(raw)) {
    const d = decodeDataUri(raw);
    if (d) {
      return new Response(request.method === "HEAD" ? null : d.bytes, {
        status: 200,
        headers: {
          "content-type": d.type,
          "cache-control": shortCache,
          "access-control-allow-origin": "*",
          "x-content-type-options": "nosniff",
          "x-yekpare-frontend": "hm-public-news-sites-logo",
        },
      });
    }
  }
  let target = "";
  if (/^https?:\/\//i.test(raw)) target = raw;
  else if (raw.startsWith("//")) target = `https:${raw}`;
  else if (raw.startsWith("/")) target = `https://${site.domain}${raw}`;
  if (!target) {
    return new Response("logo yok", { status: 404, headers: { "cache-control": "public, max-age=60" } });
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: target,
      "cache-control": shortCache,
      "access-control-allow-origin": "*",
      "x-yekpare-frontend": "hm-public-news-sites-logo",
    },
  });
}
