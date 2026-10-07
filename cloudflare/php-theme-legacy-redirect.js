/**
 * Ön yüzü VPS/Hostinger PHP temasında olan siteler için eski SPA bağlantıları
 * (/tr/:slug/haber/:s?siteId=3 gibi) PHP tema adres şekline 301 ile taşınır.
 *
 * Köşe yazarı paneli SPA'da kalır: /tr/:slug/yazar/giris, /yazar/haberler,
 * /yazar/haber/yeni, /yazar/sifre … yönlendirilmez (YazarPanelNav / YazarGiris yolları).
 * kirsehirhaber.org ailesi bilerek yok: kamu sayfaları askı kapısındadır (hm-public-suspended.js).
 *
 * Kurumsal PHP (VKD / TGD — vatankahramanlari.org, trafikdernegi.com, tgd.tc):
 * Hostinger `hostinger/php-kurumsal` paketi; Worker catch-all bilinçli yok.
 * Eski /tr|/hm yolları apex PHP sayfa yollarına 301 gider.
 *
 * Yeni panel siteleri: layout_json `phpTheme:true` / `frontend:"php"` ile işaretlenir;
 * Neon’dan host set’i birleştirilir (wrangler.toml’a site eklemeye gerek yok).
 * Zone catch-all / DNS hâlâ Cloudflare ops gerektirir — bakınız hostinger/php-kurumsal/DEPLOY.md.
 */

/** Apex host → kanonik PHP tema hostu (www zaten VPS'te apex'e 301; tek sıçrama için burada da apex). */
const PHP_THEME_PUBLIC_APEX = Object.freeze([
  "ankarasehirgazetesi.com",
  "ankarahabergundemi.com",
  "vatanhaber.net",
  "suhaber.net",
  "turkatahaber.com",
  "sehitgazi.org.tr",
  "yerel.net.tr",
  "turksav.org",
  "dunyasaglik.org",
  "yesilvatan.gen.tr",
]);

/** Kurumsal (Vatan) PHP — Hostinger php-kurumsal; haber Yenişafak twin değil. */
const PHP_CORPORATE_THEME_APEX = Object.freeze([
  "vatankahramanlari.org",
  "trafikdernegi.com",
  "tgd.tc",
]);

/**
 * Alias / kısa domain → kanonik apex.
 * tgd.tc → trafikdernegi.com; vatankahramanlari.org.tr → vatankahramanlari.org.
 */
const PHP_THEME_ALIAS_TO_APEX = Object.freeze({
  "vatankahramanlari.org.tr": "vatankahramanlari.org",
  "www.vatankahramanlari.org.tr": "vatankahramanlari.org",
  "tgd.tc": "trafikdernegi.com",
  "www.tgd.tc": "trafikdernegi.com",
});

/** host → kanonik PHP tema hostu (static seed) */
const PHP_THEME_PUBLIC_HOSTS = new Map(
  [
    ...PHP_THEME_PUBLIC_APEX.flatMap((apex) => [
      [apex, apex],
      [`www.${apex}`, apex],
    ]),
    ...PHP_CORPORATE_THEME_APEX.filter((apex) => apex !== "tgd.tc").flatMap((apex) => [
      [apex, apex],
      [`www.${apex}`, apex],
    ]),
    ...Object.entries(PHP_THEME_ALIAS_TO_APEX),
  ],
);

const PHP_CORPORATE_THEME_HOSTS = new Set(
  [
    ...PHP_CORPORATE_THEME_APEX.flatMap((apex) => [apex, `www.${apex}`]),
    ...Object.keys(PHP_THEME_ALIAS_TO_APEX),
  ].map((h) => normalizeHostname(h)),
);

/** PHP origin siteleri — /yazar/giris* Worker rotası var, /koseyazari/* henüz yok. */
const PHP_KOSE_ORIGIN_HOSTS = new Set([...PHP_THEME_PUBLIC_APEX, ...PHP_CORPORATE_THEME_APEX]);

/** Neon layout_json phpTheme bayrağından gelen host → apex (www + bare). */
const DYNAMIC_PHP_THEME_HOSTS = new Map();

const DYNAMIC_HOSTS_CACHE_MS = 60_000;
let dynamicHostsCache = { at: 0, promise: /** @type {Promise<void> | null} */ (null) };

/** Eski SPA yollarında site slug'ından önce gelen önekler. */
const LEGACY_PREFIXES = new Set(["tr", "hm"]);

function normalizeHostname(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
}

function apexOfHostname(hostname) {
  return normalizeHostname(hostname).replace(/^www\./, "");
}

/** layout_json phpTheme / frontend alanından PHP şablon mu? */
export function layoutMarksPhpTheme(layout) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return false;
  if (layout.phpTheme === false) return false;
  if (layout.phpTheme === true) return true;
  const frontend = String(layout.frontend ?? "")
    .trim()
    .toLowerCase();
  if (frontend === "spa" || frontend === "react" || frontend === "worker") return false;
  return frontend === "php";
}

function parseLayoutJson(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw || ""));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * DB satırlarından dinamik host haritası üretir (test + runtime).
 * @param {Array<{domain?:string|null,domain2?:string|null,domain3?:string|null,layout_json?:unknown,layoutJson?:unknown}>} rows
 * @returns {Map<string, string>}
 */
export function buildPhpThemeHostsFromSiteRows(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const layout = parseLayoutJson(row?.layout_json ?? row?.layoutJson);
    if (!layoutMarksPhpTheme(layout)) continue;
    const domains = [row.domain, row.domain2, row.domain3]
      .map((d) => apexOfHostname(d))
      .filter(Boolean);
    const canonical = domains[0];
    if (!canonical) continue;
    for (const apex of domains) {
      map.set(apex, canonical);
      map.set(`www.${apex}`, canonical);
    }
  }
  return map;
}

/** Test / hot-reload: dinamik host setini temizle. */
export function clearPhpThemeDynamicHosts() {
  DYNAMIC_PHP_THEME_HOSTS.clear();
  dynamicHostsCache = { at: 0, promise: null };
  PHP_KOSE_ORIGIN_HOSTS.clear();
  for (const apex of [...PHP_THEME_PUBLIC_APEX, ...PHP_CORPORATE_THEME_APEX]) {
    PHP_KOSE_ORIGIN_HOSTS.add(apex);
  }
}

/**
 * Neon’dan gelen PHP şablon hostlarını belleğe yazar (static seed üzerine).
 * @param {Iterable<[string, string]> | Map<string, string>} entries
 */
export function registerPhpThemeDynamicHosts(entries) {
  const list = entries instanceof Map ? entries.entries() : entries;
  for (const [host, apex] of list) {
    const h = normalizeHostname(host);
    const a = apexOfHostname(apex || host);
    if (!h || !a) continue;
    DYNAMIC_PHP_THEME_HOSTS.set(h, a);
    DYNAMIC_PHP_THEME_HOSTS.set(`www.${a}`, a);
    DYNAMIC_PHP_THEME_HOSTS.set(a, a);
    PHP_KOSE_ORIGIN_HOSTS.add(a);
  }
}

export function listPhpThemePublicApexHosts() {
  const set = new Set([...PHP_THEME_PUBLIC_APEX, ...PHP_CORPORATE_THEME_APEX]);
  for (const apex of DYNAMIC_PHP_THEME_HOSTS.values()) set.add(apex);
  return [...set];
}

export function listPhpCorporateThemeApexHosts() {
  return [...PHP_CORPORATE_THEME_APEX];
}

export function isPhpThemePublicHost(hostname) {
  const h = normalizeHostname(hostname);
  if (PHP_THEME_PUBLIC_HOSTS.has(h)) return true;
  if (DYNAMIC_PHP_THEME_HOSTS.has(h)) return true;
  const apex = apexOfHostname(h);
  return DYNAMIC_PHP_THEME_HOSTS.has(apex);
}

export function isPhpCorporateThemeHost(hostname) {
  return PHP_CORPORATE_THEME_HOSTS.has(normalizeHostname(hostname));
}

export function phpThemeCanonicalHost(hostname) {
  const h = normalizeHostname(hostname);
  return (
    PHP_THEME_PUBLIC_HOSTS.get(h) ||
    DYNAMIC_PHP_THEME_HOSTS.get(h) ||
    DYNAMIC_PHP_THEME_HOSTS.get(apexOfHostname(h)) ||
    null
  );
}

/**
 * Neon’dan phpTheme bayraklı sitelerin domainlerini yükler (60s cache).
 * @param {object} env
 */
export async function ensurePhpThemeHostsFromDb(env) {
  const now = Date.now();
  if (dynamicHostsCache.at && now - dynamicHostsCache.at < DYNAMIC_HOSTS_CACHE_MS) {
    return;
  }
  if (dynamicHostsCache.promise) {
    await dynamicHostsCache.promise;
    return;
  }
  dynamicHostsCache.promise = (async () => {
    try {
      const { neonSqlClient } = await import("./neon-edge-db.js");
      const sql = neonSqlClient(env);
      if (!sql) {
        dynamicHostsCache.at = Date.now();
        return;
      }
      const rows = await Promise.race([
        sql`
          SELECT domain, domain2, domain3, layout_json
          FROM hm_news_sites
          WHERE active IS DISTINCT FROM false
          LIMIT 80
        `,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
      ]);
      const map = buildPhpThemeHostsFromSiteRows(rows);
      DYNAMIC_PHP_THEME_HOSTS.clear();
      registerPhpThemeDynamicHosts(map);
      dynamicHostsCache.at = Date.now();
    } catch {
      dynamicHostsCache.at = Date.now();
    } finally {
      dynamicHostsCache.promise = null;
    }
  })();
  await dynamicHostsCache.promise;
}

function splitLegacyPath(pathname) {
  const m = /^\/([^/]+)\/([^/]+)(\/.*)?$/.exec(String(pathname || ""));
  if (!m) return null;
  const prefix = m[1].toLowerCase();
  if (!LEGACY_PREFIXES.has(prefix)) return null;
  const siteSlug = m[2];
  if (!siteSlug || siteSlug === "." || siteSlug === "..") return null;
  const rest = (m[3] || "").replace(/\/+$/, "");
  return { prefix, siteSlug, rest };
}

/**
 * Eski SPA yolu → PHP tema yolu. Yönlendirme gerekmiyorsa null (SPA kendisi sunar).
 * @param {string} pathname
 * @param {{ corporate?: boolean }} [opts]
 * @returns {string | null}
 */
export function phpThemeLegacyRedirectPath(pathname, opts = {}) {
  const parts = splitLegacyPath(pathname);
  if (!parts) return null;
  const { rest } = parts;

  if (rest === "") return "/";

  let m = /^\/(?:haber|makale)\/([^/]+)$/.exec(rest);
  if (m) return `/haber/${m[1]}`;

  m = /^\/kategori\/([^/]+)$/.exec(rest);
  if (m) return `/kategori/${m[1]}`;

  if (rest === "/yazarlar") return "/yazarlar";

  // Yalnızca sayısal yazar kimliği (526 veya a526). giris/haberler/haber/yeni/sifre… panel yollarıdır.
  m = /^\/yazar\/a?(\d+)$/.exec(rest);
  if (m) return `/yazar/a${m[1]}`;

  // Kurumsal: /tr/vkd/hakkimizda → /hakkimizda (tek veya çok segmentli sayfa slug'ı).
  if (opts.corporate === true) {
    if (/^\/[a-z0-9][a-z0-9\-_/]*$/i.test(rest) && !rest.includes("//")) {
      return rest;
    }
  }

  return null;
}

/**
 * `/yazar/giris|sifre*|haber*` → `/koseyazari/...` (kamu `/yazar/a{id}` dokunulmaz).
 * @param {string} pathname
 * @returns {string | null}
 */
export function koseyazariPanelRedirectPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  const m = p.match(
    /^((?:\/(?:tr|hm)\/[^/]+)?)\/yazar\/(giris|sifremi-unuttum|sifre-yenile|sifre|haberler|haber(?:\/.*)?)$/i,
  );
  if (!m) return null;
  return `${m[1]}/koseyazari/${m[2]}`;
}

/**
 * @param {Request} request
 * @param {URL} incoming
 * @returns {Response | null}
 */
export function koseyazariPanelRedirectResponse(request, incoming) {
  const method = String(request?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  const nextPath = koseyazariPanelRedirectPath(incoming.pathname);
  if (!nextPath) return null;
  const host = normalizeHostname(incoming.hostname).replace(/^www\./, "");
  // PHP tema origin'inde /koseyazari/* henüz Worker rotası değil — 301 origin 404 yapar.
  if (PHP_KOSE_ORIGIN_HOSTS.has(host)) return null;
  const dest = new URL(incoming.href);
  dest.pathname = nextPath;
  return new Response(null, {
    status: 301,
    headers: {
      Location: dest.toString(),
      "cache-control": "public, max-age=300",
      "x-yekpare-frontend": "koseyazari-panel-redirect",
    },
  });
}

/**
 * Sync redirect — static + bellekteki dinamik hostlar (test / cache ısınmış isolate).
 * @param {Request} request
 * @param {URL} incoming
 * @returns {Response | null}
 */
export function phpThemeLegacyRedirectResponse(request, incoming) {
  const method = String(request?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  const canonicalHost = phpThemeCanonicalHost(incoming.hostname);
  if (!canonicalHost) return null;
  const corporate = isPhpCorporateThemeHost(incoming.hostname);
  const nextPath = phpThemeLegacyRedirectPath(incoming.pathname, { corporate });
  if (!nextPath) return null;

  const dest = new URL(`https://${canonicalHost}${nextPath}`);
  const params = new URLSearchParams(incoming.search);
  params.delete("siteId");
  params.delete("site_id");
  const qs = params.toString();
  if (qs) dest.search = `?${qs}`;

  return new Response(null, {
    status: 301,
    headers: {
      Location: dest.toString(),
      "cache-control": "public, max-age=3600",
      "x-yekpare-frontend": "php-theme-legacy-redirect",
    },
  });
}

/**
 * Worker girişi: önce Neon phpTheme hostlarını birleştir, sonra redirect.
 * @param {Request} request
 * @param {URL} incoming
 * @param {object} [env]
 * @returns {Promise<Response | null>}
 */
export async function phpThemeLegacyRedirectResponseAsync(request, incoming, env) {
  if (env) {
    try {
      await ensurePhpThemeHostsFromDb(env);
    } catch {
      /* static seed yeterli */
    }
  }
  return phpThemeLegacyRedirectResponse(request, incoming);
}
