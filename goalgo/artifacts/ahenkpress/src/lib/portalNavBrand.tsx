import { normalizePortalDisplayName, PORTAL_BRAND_SHORT } from "@/lib/portalBrand";

type SiteBrandSettings = {
  siteName?: string | null;
  logoText1?: string | null;
  logoText2?: string | null;
};

/** Üst bar / footer metin logosu — site adı öncelikli. */
export function portalNavBrandText(settings: SiteBrandSettings | null | undefined): string {
  if (settings?.siteName?.trim()) return normalizePortalDisplayName(settings.siteName);
  return PORTAL_BRAND_SHORT;
}

export function portalNavBrandParts(settings: SiteBrandSettings | null | undefined): {
  single: boolean;
  text: string;
  part1: string;
  part2: string;
} {
  const text = portalNavBrandText(settings);
  return { single: true, text, part1: "", part2: text };
}

export function portalCopyrightFallback(settings: SiteBrandSettings | null | undefined): string {
  const name = portalNavBrandText(settings) || PORTAL_BRAND_SHORT;
  return `© ${new Date().getFullYear()} ${name}. Tüm hakları saklıdır.`;
}
