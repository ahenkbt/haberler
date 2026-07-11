import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { isLikelyHmExtraPagePublicPath } from "@/lib/hmExtraPageLookup";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { isHmCustomDomainInfrastructurePath } from "@/lib/hmCustomDomainTrPath";

/** HM özel alanında siteye özel PWA manifest API yolu (`?domain=` vekili için). */
export function hmPwaManifestApiPath(domainOrHost?: string | null): string {
  const pageHost =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const domain = String(domainOrHost ?? pageHost).trim().replace(/^www\./, "");
  const guard =
    domain && pageHost && !isDefaultPortalHost(pageHost)
      ? `?domain=${encodeURIComponent(domain)}`
      : "";
  return `/api/hm/pwa-manifest.json${guard}`;
}

function normalizeHmHostKey(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/:\d+$/, "");
}

export type HmSiteDomainFields = {
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
};

/** Siteye kayıtlı tüm alan adları (www normalizasyonlu). */
export function hmSiteRegisteredHosts(site: HmSiteDomainFields): string[] {
  return [site.domain, site.domain2, site.domain3].map(normalizeHmHostKey).filter(Boolean);
}

/** Ziyaretçi portal veya bu siteye kayıtlı bir alan adında mı? */
export function isHmPublicHostForSite(pageHost: string, site: HmSiteDomainFields): boolean {
  const h = normalizeHmHostKey(pageHost);
  if (!h) return false;
  if (isDefaultPortalHost(h)) return true;
  return hmSiteRegisteredHosts(site).includes(h);
}

/**
 * Vitrin bağlantıları: ziyaretçi ikinci/üçüncü alan adındaysa o kök kullanılır; aksi halde birincil domain.
 */
export function resolveHmPublicDomainFromSite(site: HmSiteDomainFields, pageHost?: string): string | null {
  const host = normalizeHmHostKey(
    pageHost ?? (typeof window !== "undefined" ? window.location.hostname : ""),
  );
  const pairs: Array<[string, string | null | undefined]> = [
    [normalizeHmHostKey(site.domain2), site.domain2],
    [normalizeHmHostKey(site.domain3), site.domain3],
    [normalizeHmHostKey(site.domain), site.domain],
  ];
  for (const [key, raw] of pairs) {
    if (host && key && host === key) return raw?.trim() || key;
  }
  const primary = site.domain?.trim();
  return primary || null;
}

/** Özel alan adı → köken (sonunda / yok), geçersizse null. */
export function hmPublicSiteOrigin(domain: string | null | undefined): string | null {
  const raw = String(domain ?? "").trim();
  if (!raw) return null;
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}

function isFullyQualifiedHttpHref(href: string): boolean {
  return /^(?:https?:)?\/\//i.test(href);
}

export function normalizeHmPublicExternalHref(href: string): string | null {
  const raw = String(href ?? "").trim();
  if (isFullyQualifiedHttpHref(raw)) return raw;
  if (/^\/https?:\/\//i.test(raw)) return raw.slice(1);
  return null;
}

/**
 * wouter `Link` yalnızca göreli yolları güvenle işler.
 * Editörün özel bağlantı alanına tam URL girildiyse onu site içi yola çevirmeyiz.
 */
export function isHmPublicNavExternal(href: string): boolean {
  const raw = String(href ?? "").trim();
  if (!raw || raw === "#") return false;
  if (normalizeHmPublicExternalHref(raw)) return true;
  return /^(mailto:|tel:)/i.test(raw);
}

function splitPathQuery(pathWithQuery: string): { pathname: string; query: string } {
  const i = pathWithQuery.indexOf("?");
  if (i === -1) return { pathname: pathWithQuery, query: "" };
  return { pathname: pathWithQuery.slice(0, i), query: pathWithQuery.slice(i) };
}

/** Özel alanda vitrin `/tr/{slug}` altında; kısa yol slug önek ister (ör. `/isbirligi` → `/tr/{slug}/isbirligi`). */
function shouldPrefixTrSlugOnCustomDomain(pathname: string): boolean {
  const p = pathname || "/";
  if (p === "/" || p === "") return true;
  if (isHmCustomDomainInfrastructurePath(p)) return false;
  return true;
}

function normalizeHmPublicContentPath(pathname: string): string {
  if (pathname.startsWith("/sayfa/")) {
    const rest = pathname.slice("/sayfa/".length);
    return rest ? `/${rest}` : pathname;
  }
  return pathname;
}

/** Özel alan veya portal için SEO canonical yolu. */
export function hmPublicSeoPath(
  segmentPath: string,
  opts: HmSiteDomainFields & { slug?: string | null },
): string {
  const path = segmentPath.startsWith("/") ? segmentPath : `/${segmentPath}`;
  const pageHost =
    typeof window !== "undefined" ? normalizeHmHostKey(window.location.hostname) : "";
  if (pageHost && isHmPublicHostForSite(pageHost, opts) && !isDefaultPortalHost(pageHost)) {
    return path;
  }
  const slug = String(opts.slug ?? "").trim();
  if (!slug) return path;
  const enc = encodeURIComponent(slug);
  if (path === "/") return `/${HM_SITE_PUBLIC_PREFIX}/${enc}`;
  return `/${HM_SITE_PUBLIC_PREFIX}/${enc}${path}`;
}

/**
 * Haber merkezi vitrin linkleri: özel alan varsa tam URL; yoksa `/tr/{slug}/...`.
 * Yekpare üzerinde slug yolu kullanılırken `siteId` sorgu parametresi eklenir (API / doğru site).
 */
export function hmPublicHref(
  pathWithQuery: string,
  opts: HmSiteDomainFields & { slug?: string | null; siteId?: number | null; forceAbsolute?: boolean },
): string {
  const raw = String(pathWithQuery ?? "").trim() || "/";
  const externalHref = normalizeHmPublicExternalHref(raw);
  if (externalHref) return externalHref;
  const { pathname: pathIn, query: queryIn } = splitPathQuery(raw.startsWith("/") ? raw : `/${raw}`);
  const pathname = normalizeHmPublicContentPath(pathIn || "/");
  const query = queryIn;

  const siteId = opts.siteId != null && opts.siteId > 0 ? opts.siteId : null;
  const slug = String(opts.slug ?? "").trim();
  const pageHost =
    typeof window !== "undefined" ? normalizeHmHostKey(window.location.hostname) : "";
  const useRelative =
    !opts.forceAbsolute && pageHost && isHmPublicHostForSite(pageHost, opts);
  const origin = useRelative
    ? null
    : hmPublicSiteOrigin(resolveHmPublicDomainFromSite(opts, pageHost));

  const needsSiteIdOnNested =
    siteId != null &&
    slug.length > 0 &&
    !useRelative &&
    !origin &&
    !query.includes("siteId=") &&
    !query.includes("hmSiteId=") &&
    (pathname.startsWith("/haber/") ||
      pathname.startsWith("/haberler/rss/") ||
      pathname.startsWith("/kategori/") ||
      pathname === "/tum-haberler" ||
      pathname.startsWith("/tum-haberler") ||
      pathname === "/sondakika" ||
      pathname.startsWith("/sondakika") ||
      pathname === "/kisa-kisa" ||
      pathname.startsWith("/kisa-kisa") ||
      pathname.startsWith("/sitene-ekle") ||
      pathname === "/yazarlar" ||
      pathname.startsWith("/yazarlar") ||
      (pathname.startsWith("/yazar/") && pathname !== "/yazarlar") ||
      pathname === "/foto-galeri" ||
      pathname.startsWith("/foto-galeri") ||
      pathname.startsWith("/sayfa/") ||
      isLikelyHmExtraPagePublicPath(pathname));

  const appendSiteId = (base: string): string => {
    if (!needsSiteIdOnNested) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}siteId=${encodeURIComponent(String(siteId))}`;
  };

  if (origin) {
    if (!slug) {
      if (pathname === "/" || pathname === "") return `${origin}/`;
      return `${origin}${pathname}${query}`;
    }

    const encSlug = encodeURIComponent(slug);
    const trBase = `/${HM_SITE_PUBLIC_PREFIX}/${encSlug}`;
    const shortSitePrefix = `/${encSlug}`;

    if (pathname === shortSitePrefix || pathname.startsWith(`${shortSitePrefix}/`)) {
      const rest = pathname.slice(shortSitePrefix.length);
      return appendSiteId(`${origin}${trBase}${rest}${query}`);
    }

    if (pathname === trBase || pathname.startsWith(`${trBase}/`)) {
      return appendSiteId(`${origin}${pathname}${query}`);
    }

    if (pathname.startsWith("/hm/")) {
      const after = pathname.slice("/hm/".length);
      const slash = after.indexOf("/");
      const firstSeg = slash === -1 ? after : after.slice(0, slash);
      const rest = slash === -1 ? "" : after.slice(slash);
      let dec = firstSeg;
      try {
        dec = decodeURIComponent(firstSeg);
      } catch {
        /* firstSeg olduğu gibi */
      }
      if (dec === slug || firstSeg === encSlug) {
        const normalized = `${trBase}${rest}`;
        return appendSiteId(`${origin}${normalized}${query}`);
      }
    }

    if (shouldPrefixTrSlugOnCustomDomain(pathname)) {
      if (pathname === "/" || pathname === "") {
        return appendSiteId(`${origin}${trBase}${query}`);
      }
      return appendSiteId(`${origin}${trBase}${pathname}${query}`);
    }

    if (pathname === "/" || pathname === "") return `${origin}/`;
    return `${origin}${pathname}${query}`;
  }

  if (slug) {
    if (isHmCustomDomainInfrastructurePath(pathname)) {
      return `${pathname}${query}`;
    }
    const trRoot = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}`;
    /** Özel alanda ziyaretçi adresi: `/haber/...` — `/tr/{slug}` gizlenir. */
    if (useRelative) {
      let cleanPath = pathname;
      if (pathname === trRoot || pathname.startsWith(`${trRoot}/`)) {
        cleanPath = pathname.slice(trRoot.length) || "/";
      }
      const base = cleanPath === "/" || cleanPath === "" ? "/" : cleanPath;
      return appendSiteId(`${base}${query}`);
    }
    if (pathname.startsWith("/hm/")) {
      return appendSiteId(`${trRoot}${pathname.slice("/hm/".length)}${query}`);
    }
    if (pathname.startsWith(`${trRoot}/`) || pathname === trRoot) {
      return appendSiteId(`${pathname}${query}`);
    }
    if (pathname === "/" || pathname === "") {
      return appendSiteId(`${trRoot}${query}`);
    }
    return appendSiteId(`${trRoot}${pathname}${query}`);
  }

  return appendSiteId(`${pathname}${query}`);
}
