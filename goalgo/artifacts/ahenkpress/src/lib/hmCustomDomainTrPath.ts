import { HM_SITE_PUBLIC_PREFIX, hmLegacyPublicPathToTr } from "@/lib/hmSitePublicPath";
import { normalizeHmSlugSegment } from "@/lib/hmNestedMetaStorage";
import { isYekpareFullscreenMapPath } from "@/lib/hmHaritalarRoutes";

const HM_CUSTOM_DOMAIN_SKIP_PREFIXES = [
  "/api/",
  "/admin/",
  "/editor/",
  "/embed/",
  "/@vite",
  "/@react-refresh",
  "/src/",
  "/node_modules/",
] as const;

function splitPathQuery(pathWithQuery: string): { pathname: string; query: string } {
  const raw = String(pathWithQuery ?? "").trim() || "/";
  const i = raw.indexOf("?");
  if (i === -1) return { pathname: raw, query: "" };
  return { pathname: raw.slice(0, i), query: raw.slice(i) };
}

/** Özel alanda kök seviyede kalması gereken harita yolları (`vatanhaber.net/maps` vb.).
 * `/newsmap` ve `/haritalar` burada YOK — editör sitesinin kendi header/logosuyla
 * `/tr/{slug}/newsmap` rotasında açılır (adres çubuğu yine kısa `/newsmap` kalır). */
function isHmCustomDomainRootMapPath(pathname: string): boolean {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  if (isYekpareFullscreenMapPath(p)) {
    return true;
  }
  const lower = p.toLowerCase();
  return lower.startsWith("/maps/") || lower.startsWith("/map/");
}

/** Özel alanda `/tr/...` yönlendirmesi yapılmayacak altyapı yolları. */
export function isHmCustomDomainInfrastructurePath(pathname: string): boolean {
  const p = (pathname || "/").toLowerCase();
  for (const prefix of HM_CUSTOM_DOMAIN_SKIP_PREFIXES) {
    if (p === prefix.slice(0, -1) || p.startsWith(prefix)) return true;
  }
  if (isHmCustomDomainRootMapPath(pathname)) return true;
  if (/\.(js|mjs|css|png|jpe?g|gif|svg|ico|woff2?|json|map|txt|webp|wasm)$/i.test(p)) return true;
  return false;
}

/**
 * HM özel alanında `/{sayfa}` → `/tr/{siteSlug}/{sayfa}` hedef yolu.
 * Zaten doğru `/tr/{slug}/…` ise null döner.
 */
export function hmCustomDomainTrRedirectTo(pathWithQuery: string, siteSlugRaw: string): string | null {
  const siteSlug = String(siteSlugRaw ?? "").trim();
  const normSlug = normalizeHmSlugSegment(siteSlug);
  if (!normSlug) return null;

  const { pathname: pathIn, query } = splitPathQuery(
    pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`,
  );
  let pathname = pathIn || "/";

  if (isHmCustomDomainInfrastructurePath(pathname)) return null;

  const encSlug = encodeURIComponent(siteSlug);
  const trPrefix = `/${HM_SITE_PUBLIC_PREFIX}/${encSlug}`;

  if (pathname.startsWith("/hm/")) {
    pathname = hmLegacyPublicPathToTr(pathname);
  }

  const trRe = new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/([^/]+)(/.*)?$`, "i");
  const trMatch = pathname.match(trRe);
  if (trMatch) {
    let pathSlugRaw = trMatch[1] ?? "";
    try {
      pathSlugRaw = decodeURIComponent(pathSlugRaw);
    } catch {
      /* raw */
    }
    if (normalizeHmSlugSegment(pathSlugRaw) === normSlug) return null;
    const rest = trMatch[2] ?? "";
    return `${trPrefix}${rest}${query}`;
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 1) {
    let first = parts[0] ?? "";
    try {
      first = decodeURIComponent(first);
    } catch {
      /* raw */
    }
    if (normalizeHmSlugSegment(first) === normSlug) {
      const rest = parts.slice(1).join("/");
      return `${trPrefix}${rest ? `/${rest}` : ""}${query}`;
    }
  }

  if (pathname === "/" || pathname === "") return `${trPrefix}${query}`;

  return `${trPrefix}${pathname}${query}`;
}
