import { useMemo } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";

import { resolvePortalFaviconSrc, resolvePortalLogoSrc } from "@/lib/portalBrandAssets";

export { resolvePortalFaviconSrc, resolvePortalLogoSrc } from "@/lib/portalBrandAssets";

/** Portal kökü / arama motoru teması: site_settings logo + favicon. */
export function usePortalBrandVisuals() {
  const { data: settings } = useGetSiteSettings();
  const logoSrc = useMemo(() => resolvePortalLogoSrc(settings?.logoUrl), [settings?.logoUrl]);
  const faviconSrc = useMemo(
    () => resolvePortalFaviconSrc(settings?.faviconUrl, settings?.logoUrl),
    [settings?.faviconUrl, settings?.logoUrl],
  );
  return { logoSrc, faviconSrc, settings };
}
