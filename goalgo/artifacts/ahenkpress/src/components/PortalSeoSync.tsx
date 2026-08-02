import { useGetSiteSettings } from "@workspace/api-client-react";
import { useEffect } from "react";
import { isEffectivePortalHost } from "@/lib/hmPortalHosts";
import { applyPortalSiteSeo, applyPortalSiteBranding, cachePortalSeoSettings } from "@/lib/pageSeo";

/** Portal kökünde site adı / slogan ile sekme başlığı ve OG meta. */
export function PortalSeoSync() {
  const { data: settings } = useGetSiteSettings();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
    if (!isEffectivePortalHost(host)) return;
    const payload = {
      siteName: settings?.siteName ?? null,
      tagline: settings?.tagline ?? null,
      logoUrl: settings?.logoUrl ?? null,
      faviconUrl: settings?.faviconUrl ?? null,
    };
    cachePortalSeoSettings(payload);
    applyPortalSiteSeo(payload);
    applyPortalSiteBranding({
      logoUrl: settings?.logoUrl ?? null,
      faviconUrl: settings?.faviconUrl ?? null,
    });
  }, [settings?.siteName, settings?.tagline, settings?.logoUrl, settings?.faviconUrl]);

  return null;
}
