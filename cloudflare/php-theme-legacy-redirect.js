/**
 * Ön yüzü VPS PHP temasında olan siteler için eski SPA bağlantıları
 * (/tr/:slug/haber/:s?siteId=3 gibi) PHP tema adres şekline 301 ile taşınır.
 *
 * Köşe yazarı paneli SPA'da kalır: /tr/:slug/yazar/giris, /yazar/haberler,
 * /yazar/haber/yeni, /yazar/sifre … yönlendirilmez (YazarPanelNav / YazarGiris yolları).
 * kirsehirhaber.org ailesi bilerek yok: kamu sayfaları askı kapısındadır (hm-public-suspended.js).
 */

/** host → kanonik PHP tema hostu (www zaten VPS'te apex'e 301; tek sıçrama için burada da apex). */
const PHP_THEME_PUBLIC_HOSTS = new Map([
  ["ankarasehirgazetesi.com", "ankarasehirgazetesi.com"],
  ["www.ankarasehirgazetesi.com", "ankarasehirgazetesi.com"],
]);

/** Eski SPA yollarında site slug'ından önce gelen önekler. */
const LEGACY_PREFIXES = new Set(["tr", "hm"]);

function normalizeHostname(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
}

export function isPhpThemePublicHost(hostname) {
  return PHP_THEME_PUBLIC_HOSTS.has(normalizeHostname(hostname));
}

export function phpThemeCanonicalHost(hostname) {
  return PHP_THEME_PUBLIC_HOSTS.get(normalizeHostname(hostname)) || null;
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
 * @returns {string | null}
 */
export function phpThemeLegacyRedirectPath(pathname) {
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
 * Worker girişinde, SPA varlıkları sunulmadan önce çağrılır.
 * @param {Request} request
 * @param {URL} incoming
 * @returns {Response | null}
 */
export function phpThemeLegacyRedirectResponse(request, incoming) {
  const method = String(request?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  const canonicalHost = phpThemeCanonicalHost(incoming.hostname);
  if (!canonicalHost) return null;
  const nextPath = phpThemeLegacyRedirectPath(incoming.pathname);
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
