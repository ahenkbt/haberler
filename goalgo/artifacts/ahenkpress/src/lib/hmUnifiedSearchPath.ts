import { UNIFIED_SEARCH_PATH } from "@/lib/kesfetDiscoverHub";
import { isConfiguredPortalHost } from "@/lib/hmPortalHosts";
import { readHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

const HM_UNIFIED_SEARCH_RE = new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/([^/]+)/ara$`, "i");

function pathOnly(pathname: string): string {
  return (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
}

/** `/tr/{siteSlug}/ara` tabanı veya portal `/ara`. */
export function parseHmUnifiedSearchBasePath(pathname: string): string | null {
  const m = pathOnly(pathname).match(HM_UNIFIED_SEARCH_RE);
  if (!m?.[1]) return null;
  return `/${HM_SITE_PUBLIC_PREFIX}/${m[1]}/ara`;
}

function parseHmSiteTrPrefix(pathname: string): string | null {
  const m = pathOnly(pathname).match(new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/([^/]+)(?:/|$)`, "i"));
  if (!m?.[1]) return null;
  return `/${HM_SITE_PUBLIC_PREFIX}/${m[1]}`;
}

export function resolveUnifiedSearchBasePath(pathname?: string): string {
  const p =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : UNIFIED_SEARCH_PATH);
  const onHmAra = parseHmUnifiedSearchBasePath(p);
  if (onHmAra) return onHmAra;
  const hmSite = parseHmSiteTrPrefix(p);
  if (hmSite) return `${hmSite}/ara`;
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
    if (host && !isConfiguredPortalHost(host)) {
      const cachedSlug = readHmDomainSlugCache(host);
      if (cachedSlug) {
        return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(cachedSlug)}/ara`;
      }
    }
  }
  return UNIFIED_SEARCH_PATH;
}

export function isUnifiedSearchPath(pathname: string): boolean {
  const p = pathOnly(pathname);
  return p === UNIFIED_SEARCH_PATH || parseHmUnifiedSearchBasePath(p) !== null;
}

export function buildUnifiedSearchHref(params: {
  q?: string;
  tab?: string;
  city?: string;
  basePath?: string;
}): string {
  const base = params.basePath ?? resolveUnifiedSearchBasePath();
  const sp = new URLSearchParams();
  const q = params.q?.trim();
  if (q) sp.set("q", q);
  if (params.city) sp.set("city", params.city);
  if (params.tab && params.tab !== "all") sp.set("tab", params.tab);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
