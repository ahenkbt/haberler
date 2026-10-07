/**
 * gundemi.org apex + *.gundemi.org → HM editor slug (Worker hm-html-boot ile senkron).
 * Katalog: goalgo/.../hm-gundemi-regional-sites.ts
 */

const GUNDEMI_ZONE = "gundemi.org";
const GUNDEMI_APEX_SLUG = "gundemi";

/** Seed bölgesel host → slug (yeni alt alanlar `{label}-gundemi` kuralı). */
const GUNDEMI_REGIONAL_HOST_SLUG = Object.freeze({
  "ege.gundemi.org": "ege-gundemi",
  "marmara.gundemi.org": "marmara-gundemi",
  "karadeniz.gundemi.org": "karadeniz-gundemi",
  "icanadolu.gundemi.org": "icanadolu-gundemi",
  "doguanadolu.gundemi.org": "doguanadolu-gundemi",
  "guneydogu.gundemi.org": "guneydogu-gundemi",
  "akdeniz.gundemi.org": "akdeniz-gundemi",
  "kibris.gundemi.org": "kibris-gundemi",
});

function normalizeGundemiHost(hostname) {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

/**
 * @param {string} hostname
 * @returns {string} HM slug or ""
 */
export function gundemiHmSlugFromHost(hostname) {
  const host = normalizeGundemiHost(hostname);
  if (!host) return "";
  if (host === GUNDEMI_ZONE) return GUNDEMI_APEX_SLUG;
  if (!host.endsWith(`.${GUNDEMI_ZONE}`)) return "";
  const known = GUNDEMI_REGIONAL_HOST_SLUG[host];
  if (known) return known;
  const label = host.slice(0, -(GUNDEMI_ZONE.length + 1)).split(".")[0] || "";
  if (/^[a-z0-9-]+$/.test(label)) return `${label}-gundemi`;
  return "";
}
