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
  // gundemi.org apex — kendi HM sitesi (slug gundemi); bölgesel alt alanlar ayrı siteler
  "gundemi.org",
  // gundemi.org bölgesel Yenişafak siteleri (her alt alan kendi kanonik hostu)
  "ege.gundemi.org",
  "marmara.gundemi.org",
  "karadeniz.gundemi.org",
  "icanadolu.gundemi.org",
  "doguanadolu.gundemi.org",
  "guneydogu.gundemi.org",
  "akdeniz.gundemi.org",
  "kibris.gundemi.org",
  "fix.tc",
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

/** host → kanonik PHP tema hostu */
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

/** PHP origin siteleri — /koseyazari/giris PHP temada; /koseyazari/haber*|sifre* Worker (SPA panel). */
const PHP_KOSE_ORIGIN_HOSTS = new Set([...PHP_THEME_PUBLIC_APEX, ...PHP_CORPORATE_THEME_APEX]);

/** Eski SPA yollarında site slug'ından önce gelen önekler. */
const LEGACY_PREFIXES = new Set(["tr", "hm"]);

function normalizeHostname(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
}

export function listPhpThemePublicApexHosts() {
  return [...PHP_THEME_PUBLIC_APEX, ...PHP_CORPORATE_THEME_APEX];
}

export function listPhpCorporateThemeApexHosts() {
  return [...PHP_CORPORATE_THEME_APEX];
}

export function isPhpThemePublicHost(hostname) {
  const host = normalizeHostname(hostname);
  if (PHP_THEME_PUBLIC_HOSTS.has(host)) return true;
  // Admin-created *.gundemi.org (katalog dışı) — PHP tema, SPA değil.
  const apex = host.replace(/^www\./, "");
  if (apex !== "gundemi.org" && apex.endsWith(".gundemi.org")) return true;
  return false;
}

export function isPhpCorporateThemeHost(hostname) {
  return PHP_CORPORATE_THEME_HOSTS.has(normalizeHostname(hostname));
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
  // PHP tema siteleri: /koseyazari/giris artık PHP temada (Worker rotası yok, 2026-10-09).
  // Eski /yazar/giris bağlantısı oraya gider; panelin geri kalanı (/yazar/haber*, /yazar/sifre*) SPA'da kalır.
  if (PHP_KOSE_ORIGIN_HOSTS.has(host) && nextPath !== "/koseyazari/giris") return null;
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
