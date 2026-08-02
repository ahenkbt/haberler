/** Portal turk.eco marka görselleri — site_settings ile uyumlu (ahenkpress portalBrand). */

export const PORTAL_DEFAULT_LOGO_PATH = "/portal-brand/logo1.png?v=3";
export const PORTAL_DEFAULT_FAVICON_PATH = "/portal-brand/icon.png?v=3";

export function isLegacyPortalBrandAssetUrl(url: string | null | undefined): boolean {
  const t = String(url ?? "").trim().toLowerCase();
  if (!t) return false;
  return (
    t.includes("yekpare-super-app") ||
    t.includes("yekpare_super_app") ||
    t.includes("turknet.app") ||
    t.includes("/yekpare-logo") ||
    t.includes("icon-512.png") ||
    t.includes("apple-touch-icon") ||
    t.includes("/opengraph.jpg") ||
    (t.includes("yekpare") && t.includes("logo") && !t.includes("portal-brand")) ||
    (t.includes("goalgo") && (t.includes("logo") || t.includes("brand"))) ||
    (t.includes("turknet") && t.includes("logo"))
  );
}

export function sanitizePortalBrandLogoUrl(logoUrl: string | null | undefined): string | null {
  const t = typeof logoUrl === "string" ? logoUrl.trim() : "";
  if (!t || isLegacyPortalBrandAssetUrl(t)) return null;
  return t;
}

export function sanitizePortalBrandFaviconUrl(
  faviconUrl: string | null | undefined,
  logoUrl?: string | null,
): string | null {
  const fav = typeof faviconUrl === "string" ? faviconUrl.trim() : "";
  if (fav && !isLegacyPortalBrandAssetUrl(fav)) return fav;
  const logo = typeof logoUrl === "string" ? logoUrl.trim() : "";
  if (logo && !isLegacyPortalBrandAssetUrl(logo)) return logo;
  return null;
}
