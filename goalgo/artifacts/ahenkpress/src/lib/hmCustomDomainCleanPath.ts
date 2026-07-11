import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { normalizeHmSlugSegment } from "@/lib/hmNestedMetaStorage";
import { isHmCustomDomainInfrastructurePath } from "@/lib/hmCustomDomainTrPath";

function stripHmPublicSiteIdQuery(query: string): string {
  if (!query) return "";
  const raw = query.startsWith("?") ? query.slice(1) : query;
  if (!raw) return "";
  const sp = new URLSearchParams(raw);
  if (!sp.has("siteId") && !sp.has("hmSiteId")) return query;
  sp.delete("siteId");
  sp.delete("hmSiteId");
  const rest = sp.toString();
  return rest ? `?${rest}` : "";
}

function splitPathQuery(pathWithQuery: string): { pathname: string; query: string } {
  const raw = String(pathWithQuery ?? "").trim() || "/";
  const i = raw.indexOf("?");
  if (i === -1) return { pathname: raw, query: "" };
  return { pathname: raw.slice(0, i), query: raw.slice(i) };
}

function decodeSeg(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function trPrefixForSlug(siteSlug: string): string {
  return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(siteSlug)}`;
}

/** Wouter iç yolu → ziyaretçi adres çubuğu (özel alan). */
export function toHmCustomDomainCleanPath(pathWithQuery: string, siteSlugRaw: string): string {
  const siteSlug = String(siteSlugRaw ?? "").trim();
  const normSlug = normalizeHmSlugSegment(siteSlug);
  if (!normSlug) return pathWithQuery;

  const { pathname: pathIn, query: queryIn } = splitPathQuery(
    pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`,
  );
  let pathname = pathIn || "/";
  const query = stripHmPublicSiteIdQuery(queryIn);
  if (isHmCustomDomainInfrastructurePath(pathname)) return pathWithQuery;

  const trPrefix = trPrefixForSlug(siteSlug);
  const trRe = new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/([^/]+)(/.*)?$`, "i");
  const trMatch = pathname.match(trRe);
  if (trMatch) {
    const pathSlug = normalizeHmSlugSegment(decodeSeg(trMatch[1] ?? ""));
    if (pathSlug === normSlug) {
      const rest = trMatch[2] ?? "";
      if (!rest || rest === "/") return query ? `/${query}` : "/";
      return `${rest}${query}`;
    }
  }

  return `${pathname}${query}`;
}

/** Tarayıcı yolu → wouter iç `/tr/{slug}/...` yolu (özel alan). */
export function toHmInternalTrPath(pathWithQuery: string, siteSlugRaw: string): string | null {
  const siteSlug = String(siteSlugRaw ?? "").trim();
  const normSlug = normalizeHmSlugSegment(siteSlug);
  if (!normSlug) return null;

  const { pathname: pathIn, query: queryIn } = splitPathQuery(
    pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`,
  );
  let pathname = pathIn || "/";
  const query = stripHmPublicSiteIdQuery(queryIn);
  if (isHmCustomDomainInfrastructurePath(pathname)) return null;

  const trPrefix = trPrefixForSlug(siteSlug);

  const trRe = new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/([^/]+)(/.*)?$`, "i");
  const trMatch = pathname.match(trRe);
  if (trMatch) {
    const pathSlug = normalizeHmSlugSegment(decodeSeg(trMatch[1] ?? ""));
    if (pathSlug === normSlug) {
      const rest = trMatch[2] ?? "";
      return `${trPrefix}${rest}${query}`;
    }
    return `${trPrefix}${pathname.slice(pathname.indexOf(trMatch[0]) + trMatch[0].length)}${query}`;
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 1 && normalizeHmSlugSegment(decodeSeg(parts[0] ?? "")) === normSlug) {
    const rest = parts.slice(1).join("/");
    return `${trPrefix}${rest ? `/${rest}` : ""}${query}`;
  }

  if (pathname === "/" || pathname === "") return `${trPrefix}${query}`;
  return `${trPrefix}${pathname}${query}`;
}

/** Eski `/tr/{slug}` adresini kök veya kısa yola çevirir (replaceState). */
export function hmCustomDomainCanonicalizeBrowserUrl(siteSlugRaw: string): string | null {
  if (typeof window === "undefined") return null;
  const siteSlug = String(siteSlugRaw ?? "").trim();
  if (!siteSlug) return null;
  const { pathname, search, hash } = window.location;
  const strippedSearch = stripHmPublicSiteIdQuery(search);
  const current = pathname + search + hash;
  const clean = toHmCustomDomainCleanPath(pathname + strippedSearch + hash, siteSlug);
  if (!clean || clean === current) {
    const queryOnly = pathname + strippedSearch + hash;
    if (queryOnly !== current) return queryOnly;
    return null;
  }
  return clean;
}
