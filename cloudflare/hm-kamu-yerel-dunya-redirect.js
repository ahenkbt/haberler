/**
 * turkatahaber.com / yerel.net.tr — /kategori/nato|bm|ab|uluslararasi → /kategori/dunya
 */

const KAMU_YEREL_HOSTS = new Set([
  "turkatahaber.com",
  "www.turkatahaber.com",
  "yerel.net.tr",
  "www.yerel.net.tr",
]);

const DUNYA_CHILD_SLUGS = new Set([
  "nato",
  "uluslararasi-kuruluslar",
  "birlesmis-milletler",
  "avrupa-birligi",
]);

function normalizeHost(hostname) {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    ?.replace(/\.$/, "");
}

export function isKamuYerelDunyaRedirectHost(hostname) {
  return KAMU_YEREL_HOSTS.has(normalizeHost(hostname));
}

/** @returns {string|null} child slug when path is /kategori/{nato|…} */
export function kamuYerelDunyaChildSlugFromPath(pathname) {
  const path = String(pathname || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
  const m = path.match(/^\/kategori\/([^/]+)$/);
  if (!m?.[1]) return null;
  const slug = m[1];
  return DUNYA_CHILD_SLUGS.has(slug) ? slug : null;
}

export function kamuYerelDunyaRedirectResponse(request, incoming) {
  if (!isKamuYerelDunyaRedirectHost(incoming.hostname)) return null;
  const child = kamuYerelDunyaChildSlugFromPath(incoming.pathname);
  if (!child) return null;
  const dest = new URL(request.url);
  dest.pathname = "/kategori/dunya";
  dest.search = "";
  dest.hash = "";
  return new Response(null, {
    status: 301,
    headers: {
      Location: dest.toString(),
      "x-yekpare-frontend": "kamu-yerel-dunya-redirect",
      "x-kamu-yerel-dunya-from": child,
      "cache-control": "public, max-age=300",
    },
  });
}
