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
import { neonNewsSqlClient, neonSqlClient, shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import { isNeonServerlessUrl } from "./neon-edge-url.js";

export const NEWS_SITES_LIST_PATH = "/api/hm/public/news-sites";
/** Bump to bust every grid logo URL at once (browser + edge caches). */
const LOGO_RULES_REV = "lg2";
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

/**
 * logogrid 2026-10-09 (user 00:41): gundemi.org = "Gündem İstanbul" (plaka 34). It stays a general news site but is
 * listed FIRST in the "İl Siteleri" group of every logo grid (and not twice in the main group).
 */
export const IL_FEATURED = Object.freeze({ "gundemi.org": { il: "İstanbul", plate: "34", region: "marmara", name: "Gündem İstanbul" } });

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

/**
 * ASG / AHG public identity (2026-10-09): ankarasehirgazetesi.com → ankara.fix.tc,
 * ankarahabergundemi.com → gundem.fix.tc. Tanıtım and referans grids show only the new host.
 * Rows stay listed even when the panel `active` flag is off, so the logo does not vanish.
 */
const REPLACED_PUBLIC_HOST_BY_SLUG = new Map([
  ["asg", "ankara.fix.tc"],
  ["ankarasehirgazetesi", "ankara.fix.tc"],
  ["ankarahabergundemi", "gundem.fix.tc"],
  ["ahg", "gundem.fix.tc"],
]);
const RETIRED_PUBLIC_HOSTS = new Map([
  ["ankarasehirgazetesi.com", "ankara.fix.tc"],
  ["ankarahabergundemi.com", "gundem.fix.tc"],
]);

export function replacedPublicHost(row, host) {
  const slug = String(row?.slug ?? "").trim().toLowerCase();
  if (REPLACED_PUBLIC_HOST_BY_SLUG.has(slug)) return REPLACED_PUBLIC_HOST_BY_SLUG.get(slug);
  return RETIRED_PUBLIC_HOSTS.get(host) || "";
}

/**
 * PHP canonical is the first domain. ankara.fix.tc and gundem.fix.tc stay first.
 * The old apexes stay on domain2/domain3 so the VPS does not fall back to TurkAta.
 */
export const ASG_AHG_REBRAND_ROWS = Object.freeze([
  {
    slugs: ["asg", "ankarasehirgazetesi"],
    domain: "ankara.fix.tc",
    domain2: "ankarasehirgazetesi.com",
    domain3: null,
    displayName: "Ankara Şehir Gazetesi",
  },
  {
    slugs: ["ankarahabergundemi", "ahg"],
    domain: "gundem.fix.tc",
    domain2: "ankarahabergundemi.com",
    domain3: "ankara.gundemi.org",
    displayName: "Ankara Haber Gündemi",
  },
]);

export function rebrandAssignmentForSlug(slug) {
  const key = String(slug ?? "").trim().toLowerCase();
  return ASG_AHG_REBRAND_ROWS.find((row) => row.slugs.includes(key)) || null;
}

/** @type {Promise<void> | null} */
let rebrandEnsure = null;

/**
 * Reassert on every list request. A once-per-isolate write loses to a later
 * panel save that puts a retired host back in front of the fix.tc canonical.
 */
export function ensureAsgAhgRebrandDomains(env) {
  if (!rebrandEnsure) {
    rebrandEnsure = applyAsgAhgRebrandDomains(env).finally(() => {
      rebrandEnsure = null;
    });
  }
  return rebrandEnsure;
}

async function applyAsgAhgRebrandDomains(env) {
  const clients = [];
  const panel = neonSqlClient(env);
  if (panel) clients.push(panel);
  if (shouldEdgeDualWriteNewsDb(env)) {
    const news = neonNewsSqlClient(env);
    if (news) clients.push(news);
  }
  for (const sql of clients) {
    for (const spec of ASG_AHG_REBRAND_ROWS) {
      const hosts = [spec.domain, spec.domain2, spec.domain3].filter(Boolean);
      for (const host of hosts) {
        await sql`
          UPDATE hm_news_sites
          SET domain = CASE WHEN lower(btrim(domain)) = ${host} THEN NULL ELSE domain END,
              domain2 = CASE WHEN lower(btrim(domain2)) = ${host} THEN NULL ELSE domain2 END,
              domain3 = CASE WHEN lower(btrim(domain3)) = ${host} THEN NULL ELSE domain3 END,
              updated_at = now()
          WHERE lower(slug) <> ${spec.slugs[0]}
            AND lower(slug) <> ${spec.slugs[1]}
            AND (
              lower(btrim(coalesce(domain, ''))) = ${host}
              OR lower(btrim(coalesce(domain2, ''))) = ${host}
              OR lower(btrim(coalesce(domain3, ''))) = ${host}
            )
        `;
      }
      await sql`
        UPDATE hm_news_sites
        SET domain = ${spec.domain},
            domain2 = ${spec.domain2},
            domain3 = ${spec.domain3},
            display_name = ${spec.displayName},
            active = true,
            layout_json = CASE
              WHEN layout_json IS NULL OR btrim(layout_json) = '' THEN layout_json
              ELSE (((layout_json::jsonb) - 'hmDisplayNameOverride' - 'hmIl81' - 'hmPublicSuspended' - 'hmCorporateSite')
                - CASE WHEN (layout_json::jsonb)->>'hmSiteKind' = 'kurumsal' THEN 'hmSiteKind' ELSE '' END)::text
            END,
            updated_at = now()
        WHERE lower(slug) = ${spec.slugs[0]}
           OR lower(slug) = ${spec.slugs[1]}
      `;
    }
  }
  rowsCache = { at: 0, rows: null };
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
    if (!row) continue;
    const storedHost = normalizeSiteHost(row.domain);
    const movedHost = replacedPublicHost(row, storedHost);
    if ((row.active === false || row.active === "f") && !movedHost) continue;
    const host = movedHost || storedHost;
    if (!host) continue;
    if (isCorporate(row, host)) continue;
    const layout = parseLayout(row.layout_json ?? row.layoutJson);
    if (layout.hmPublicSuspended === true && !movedHost) continue;
    if (!movedHost && (layout.hmCorporateSite === true || layout.hmSiteKind === "kurumsal")) continue;
    const featured = movedHost ? null : IL_FEATURED[host] || null;
    const isIl = Boolean(!movedHost && (featured || (layout.hmIl81 && typeof layout.hmIl81 === "object")));
    if (group === "il" ? !isIl : isIl) continue;
    const logoRaw = String(layout.logoUrl ?? "").trim() || String(layout.faviconUrl ?? "").trim();
    const rebrandName = rebrandAssignmentForSlug(row.slug)?.displayName || "";
    const site = {
      id: Number(row.id),
      slug: String(row.slug ?? "").trim(),
      // 81il 2026-10-09: layout hmDisplayNameOverride wins (gundemi.org = "Gündem İstanbul"; the panel->TP sync rewrites display_name).
      // ASG / AHG keep the original names even when a Fix Haber override is stored.
      name:
        rebrandName ||
        (typeof layout.hmDisplayNameOverride === "string" && layout.hmDisplayNameOverride.trim()) ||
        (featured ? featured.name : "") ||
        String(row.display_name ?? row.displayName ?? row.slug ?? host).trim() ||
        host,
      domain: host,
      url: `https://${host}/`,
      logoRaw,
      logoBg: safeColor(layout.hmLogoBarBackground),
      color: safeColor(layout.hmPrimaryColor) || safeColor(layout.hmNewsAccentColor) || "",
      ...(featured
        ? { il: featured.il, plate: featured.plate, region: featured.region, featured: true }
        : isIl
          ? { il: String(layout.hmIl81.il || ""), plate: String(layout.hmIl81.plate || ""), region: String(layout.hmIl81.region || "") }
          : {}),
    };
    const prev = byHost.get(host);
    // One tile per domain: keep the lowest id that has a logo (duplicate rows such as marmara.gundemi.org).
    if (!prev || (!prev.logoRaw && site.logoRaw) || (Boolean(prev.logoRaw) === Boolean(site.logoRaw) && site.id < prev.id)) {
      byHost.set(host, site);
    }
  }
  const out = [...byHost.values()];
  // İl siteleri plaka sırasıyla (01 Adana … 81 Düzce), ana liste id sırasıyla.
  if (group === "il")
    return out.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(a.plate) - Number(b.plate) || a.id - b.id);
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
      // logogrid 2026-10-09: always an image URL — the endpoint falls back to the site's header logo, then a text logo.
      logo: `${o}${NEWS_SITES_LIST_PATH}/${s.id}/logo?v=${logoVersion(`${s.logoRaw}|${s.name}|${LOGO_RULES_REV}`)}`,
      logoBg: s.logoBg,
      ...(s.il ? { il: s.il, plate: s.plate, region: s.region } : {}),
      ...(s.featured ? { featured: true } : {}),
    }));
}

/** logogrid 2026-10-09: live total of active news sites (main + il), for the Tanıtım text. */
export async function countPublicNewsSites(env) {
  const rows = await loadRows(env);
  return publicNewsSitesFromRows(rows).length + publicNewsSitesFromRows(rows, { group: "il" }).length;
}

function escapeHtml(raw) {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const NEWS_SITES_GRID_STYLE = `<style>
.hm-ns-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
.hm-ns-sites + .hm-ns-sites{margin-top:28px}
@media (max-width:1100px){.hm-ns-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:860px){.hm-ns-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
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
        ? `<img src="${escapeHtml(s.logo)}" alt="${escapeHtml(s.name)} logosu" loading="eager" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="hm-ns-initial" style="display:none">${escapeHtml(s.name)}</span>`
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
    await ensureAsgAhgRebrandDomains(env).catch((err) => {
      console.error("[public-news-sites] rebrand", String(err?.message || err).slice(0, 160));
    });
    const opts = {
      origin: `${incoming.protocol}//${incoming.host}`,
      exclude: incoming.searchParams.get("exclude") || "",
    };
    const sites = await listPublicNewsSites(env, opts);
    const ilSites = await listPublicNewsSites(env, { ...opts, group: "il" });
    // total = every active news site incl. il siteleri (Tanıtım metnindeki canlı sayı).
    const body = JSON.stringify({ count: sites.length, sites, ilCount: ilSites.length, ilSites, total: sites.length + ilSites.length });
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
  if (!site) {
    return new Response("logo yok", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=60" },
    });
  }
  const raw = site.logoRaw;
  const imgHeaders = (type, cache) => ({
    "content-type": type,
    "cache-control": cache,
    "access-control-allow-origin": "*",
    "x-content-type-options": "nosniff",
    "x-yekpare-frontend": "hm-public-news-sites-logo",
  });
  if (/^data:/i.test(raw)) {
    const d = decodeDataUri(raw);
    if (d) return new Response(request.method === "HEAD" ? null : d.bytes, { status: 200, headers: imgHeaders(d.type, shortCache) });
  }
  // logogrid 2026-10-09: serve the image bytes from here (same origin for every grid) instead of a 302 to the
  // site's own host — a slow/missing file on that host used to leave the tile with only the site name.
  // Chain: layout logo → logo the site shows in its own header → generated text logo in the site colour.
  const longCache = "public, max-age=3600, s-maxage=86400";
  const target = absoluteLogoUrl(raw, site.domain);
  const selfHost = normalizeSiteHost(incoming.host);
  if (target && normalizeSiteHost(new URL(target).host) === selfHost) {
    // Same zone: a Worker subrequest would skip the Worker (assets), so let the browser load it directly.
    return new Response(null, { status: 302, headers: { location: target, "cache-control": shortCache, "access-control-allow-origin": "*", "x-yekpare-frontend": "hm-public-news-sites-logo" } });
  }
  const tried = new Set();
  for (const url of [target, null]) {
    let u = url;
    if (u === null) u = await headerLogoUrl(site.domain).catch(() => "");
    if (!u || tried.has(u)) continue;
    tried.add(u);
    const img = await fetchImage(u);
    if (img) return new Response(request.method === "HEAD" ? null : img.body, { status: 200, headers: imgHeaders(img.type, longCache) });
  }
  const svg = textLogoSvg(site.name, site.color || site.logoBg || "#0b3362", site.domain);
  return new Response(request.method === "HEAD" ? null : svg, {
    status: 200,
    headers: { ...imgHeaders("image/svg+xml; charset=utf-8", shortCache), "x-hm-logo-fallback": "text" },
  });
}

function absoluteLogoUrl(raw, domain) {
  const r = String(raw || "").trim();
  if (!r || /^data:/i.test(r)) return "";
  if (/^https?:\/\//i.test(r)) return r;
  if (r.startsWith("//")) return `https:${r}`;
  if (r.startsWith("/")) return `https://${domain}${r}`;
  return "";
}

const IMG_MAX_BYTES = 2_500_000;

/** @returns {Promise<{ body: ArrayBuffer, type: string } | null>} */
async function fetchImage(url) {
  try {
    const res = await fetch(url, {
      headers: { accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8", "user-agent": "TurkataLogoGrid/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return null;
    const type = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!/^image\//.test(type)) return null;
    const body = await res.arrayBuffer();
    if (!body.byteLength || body.byteLength > IMG_MAX_BYTES) return null;
    return { body, type };
  } catch {
    return null;
  }
}

/** The <img> inside the site's header logo link (PHP theme: a.ys-logo img). */
async function headerLogoUrl(domain) {
  const res = await fetch(`https://${domain}/`, {
    headers: { accept: "text/html", "user-agent": "TurkataLogoGrid/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(6000),
    cf: { cacheTtl: 600, cacheEverything: true },
  });
  if (!res.ok) return "";
  const html = (await res.text()).slice(0, 400_000);
  const m =
    /<a[^>]+class=["'][^"']*\bys-logo\b[^"']*["'][^>]*>[\s\S]{0,600}?<img[^>]+src=["']([^"']+)["']/i.exec(html) ||
    /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i.exec(html) ||
    /<img[^>]+src=["']([^"']+)["'][^>]*class=["'][^"']*logo[^"']*["']/i.exec(html);
  if (!m) return "";
  const src = m[1].replace(/&amp;/g, "&");
  if (/^data:/i.test(src)) return "";
  try {
    return new URL(src, `https://${domain}/`).toString();
  } catch {
    return "";
  }
}

/** Clean text logo (site colour), same proportions as the network logos (~3.2:1). */
export function textLogoSvg(name, color, domain) {
  const c = safeColor(color) || "#0b3362";
  const words = String(name || domain || "").trim().split(/\s+/).filter(Boolean);
  const first = words.length > 1 ? words.slice(0, -1).join(" ") : words[0] || "";
  const second = words.length > 1 ? words[words.length - 1] : "";
  const up = (v) => v.toLocaleUpperCase("tr-TR");
  const fs1 = Math.max(54, Math.min(120, Math.floor(880 / Math.max(4, up(first).length * 0.62))));
  const fs2 = Math.max(40, Math.min(76, Math.floor(560 / Math.max(4, up(second).length * 0.62))));
  const t = (v) => escapeHtml(v);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 320" width="1024" height="320" role="img" aria-label="${t(name)}">
<rect x="14" y="20" width="250" height="250" rx="40" fill="${c}"/><path d="M70 270 L60 312 L120 270 Z" fill="${c}"/>
<text x="139" y="200" text-anchor="middle" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="150" fill="#fff">${t(up(first).charAt(0))}</text>
<text x="300" y="${second ? 165 : 200}" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="${fs1}" fill="${c}">${t(up(first))}</text>
${second ? `<text x="300" y="262" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${fs2}" fill="${c}" opacity=".85">${t(up(second))}</text>` : ""}
<text x="1010" y="300" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="34" fill="#5b6474">${t(domain || "")}</text>
</svg>`;
}
