import { useMemo } from "react";

import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useHmVideoTvLayout } from "@/contexts/HmVideoTvContext";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { isHmNewsVideoTvFlagEnabled } from "@/lib/newsSiteLayout";

export type HmVideoTvSiteBrand = {
  /** HM haber sitesi Video TV bağlamında site markası kullan */
  useSiteBranding: boolean;
  siteName: string;
  siteLogoUrl: string | null;
  moduleTitle: string;
  moduleSubtitle: string;
};

export function resolveHmVideoTvSiteLogoUrl(logoUrl?: string | null, faviconUrl?: string | null): string | null {
  const logo = typeof logoUrl === "string" ? logoUrl.trim() : "";
  if (logo) return resolveClientMediaSrc(logo) || logo;
  const fav = typeof faviconUrl === "string" ? faviconUrl.trim() : "";
  if (fav) return resolveClientMediaSrc(fav) || fav;
  return null;
}

/** HM Video TV vitrin başlığı — site adı ile markalama. */
export function hmVideoTvModuleTitle(siteName: string): string {
  const name = siteName.trim();
  if (!name) return "Videolar";
  return `${name} Videoları`;
}

export function useHmVideoTvSiteBrand(): HmVideoTvSiteBrand {
  const hmTv = useHmVideoTvLayout();
  const ctx = useHmPublicLinkContextOptional();
  const siteName = (hmTv?.displayName ?? ctx?.displayName ?? "").trim() || "Haber";
  const enabled = isHmNewsVideoTvFlagEnabled(ctx?.layoutPrefs);
  const useSiteBranding = Boolean(hmTv) && enabled;
  const siteLogoUrl = useMemo(
    () =>
      useSiteBranding
        ? resolveHmVideoTvSiteLogoUrl(ctx?.layoutPrefs?.logoUrl, ctx?.layoutPrefs?.faviconUrl)
        : null,
    [useSiteBranding, ctx?.layoutPrefs?.logoUrl, ctx?.layoutPrefs?.faviconUrl],
  );

  return {
    useSiteBranding,
    siteName,
    siteLogoUrl,
    moduleTitle: useSiteBranding ? hmVideoTvModuleTitle(siteName) : "Video TV",
    moduleSubtitle: useSiteBranding
      ? `Güncel haber videoları — ${siteName}`
      : "Güncel haber videoları — canlı yayın ve haber kanallarından karma akış.",
  };
}
