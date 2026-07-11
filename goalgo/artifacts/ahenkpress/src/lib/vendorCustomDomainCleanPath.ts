import {
  isVendorCustomDomainInfrastructurePath,
  vendorCustomDomainRedirectTo,
} from "@/lib/vendorCustomDomainPath";

function splitPathQuery(pathWithQuery: string): { pathname: string; query: string } {
  const raw = String(pathWithQuery ?? "").trim() || "/";
  const i = raw.indexOf("?");
  if (i === -1) return { pathname: raw, query: "" };
  return { pathname: raw.slice(0, i), query: raw.slice(i) };
}

/** Wouter iç vitrin yolu → ziyaretçi adres çubuğu (özel mağaza alanı). */
export function toVendorCustomDomainCleanPath(pathWithQuery: string, storefrontPath: string): string {
  const base = String(storefrontPath ?? "").trim();
  if (!base.startsWith("/")) return pathWithQuery;

  const { pathname: pathIn, query } = splitPathQuery(
    pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`,
  );
  const pathname = pathIn || "/";
  if (isVendorCustomDomainInfrastructurePath(pathname)) return pathWithQuery;

  if (pathname === base || pathname.startsWith(`${base}/`)) {
    const rest = pathname.slice(base.length) || "/";
    const cleanPath = rest === "/" || rest === "" ? "/" : rest;
    return `${cleanPath}${query}`;
  }

  return pathWithQuery;
}

/** Tarayıcı yolu → wouter iç vitrin yolu (`/siparis/satici/...` vb.). */
export function toVendorInternalStorefrontPath(
  pathWithQuery: string,
  storefrontPath: string,
): string | null {
  const base = String(storefrontPath ?? "").trim();
  if (!base.startsWith("/")) return null;

  const normalized = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const { pathname } = splitPathQuery(normalized);

  if (isVendorCustomDomainInfrastructurePath(pathname)) return null;

  if (pathname === base || pathname.startsWith(`${base}/`)) {
    return normalized;
  }

  const mapped = vendorCustomDomainRedirectTo(normalized, base, null);
  if (!mapped) return normalized;
  if (/^https?:\/\//i.test(mapped)) return null;
  return mapped;
}

/** Eski tam vitrin yolunu kısa adrese çevirir (replaceState). */
export function vendorCustomDomainCanonicalizeBrowserUrl(storefrontPath: string): string | null {
  if (typeof window === "undefined") return null;
  const base = String(storefrontPath ?? "").trim();
  if (!base.startsWith("/")) return null;
  const { pathname, search, hash } = window.location;
  const current = pathname + search + hash;
  const clean = toVendorCustomDomainCleanPath(pathname + search + hash, base);
  if (!clean || clean === current) return null;
  return clean;
}
