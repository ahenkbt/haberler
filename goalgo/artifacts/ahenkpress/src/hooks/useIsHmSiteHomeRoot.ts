import { useLocation } from "wouter";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";

/** HM vitrin anasayfa kökü: özel alan `/` veya portal `/tr/{slug}`. */
export function resolveIsHmSiteHomeRoot(pathRaw: string, slug?: string | null): boolean {
  const path = (pathRaw.split("?")[0] ?? "/").replace(/\/+$/, "") || "/";
  const isRootPath = (value: string) => value === "/" || value === "" || value === "/index.html";

  const siteSlug = String(slug ?? "").trim();
  const internalHomePath = siteSlug ? `/${HM_SITE_PUBLIC_PREFIX}/${siteSlug}` : "";

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
    if (host && !isDefaultPortalHost(host)) {
      const browserPath = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
      if (isRootPath(path) || isRootPath(browserPath)) return true;
      // Özel alanda wouter iç yolu `/tr/{slug}` — adres çubuğu `/` kalır.
      if (internalHomePath && (path === internalHomePath || path === `${internalHomePath}/index.html`)) {
        return true;
      }
      return false;
    }
  }

  if (siteSlug) {
    return path === internalHomePath;
  }

  return false;
}

/** HM vitrin anasayfa kökü: özel alan `/` veya portal `/tr/{slug}`. */
export function useIsHmSiteHomeRoot(): boolean {
  const [location] = useLocation();
  const ctx = useHmPublicLinkContextOptional();
  return resolveIsHmSiteHomeRoot(location, ctx?.slug ?? null);
}
