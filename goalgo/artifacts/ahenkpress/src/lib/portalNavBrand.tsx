import { normalizePortalDisplayName, PORTAL_BRAND_SHORT } from "@/lib/portalBrand";

type SiteBrandSettings = {
  siteName?: string | null;
  logoText1?: string | null;
  logoText2?: string | null;
};

/** Üst bar / footer metin logosu — site adı öncelikli. */
export function portalNavBrandText(settings: SiteBrandSettings | null | undefined): string {
  const name = normalizePortalDisplayName(settings?.siteName);
  if (settings?.siteName?.trim()) return name;
  const t1 = settings?.logoText1?.trim() || "Yek";
  const t2 = settings?.logoText2?.trim() || "pare";
  return `${t1}${t2}`;
}

export function portalNavBrandParts(settings: SiteBrandSettings | null | undefined): {
  single: boolean;
  text: string;
  part1: string;
  part2: string;
} {
  const name = settings?.siteName?.trim();
  if (name) {
    const display = normalizePortalDisplayName(name);
    return { single: true, text: display, part1: "", part2: display };
  }
  return {
    single: false,
    text: portalNavBrandText(settings),
    part1: settings?.logoText1?.trim() || "Yek",
    part2: settings?.logoText2?.trim() || "pare",
  };
}

export function portalCopyrightFallback(settings: SiteBrandSettings | null | undefined): string {
  const name = normalizePortalDisplayName(settings?.siteName) || PORTAL_BRAND_SHORT;
  return `© ${new Date().getFullYear()} ${name}. Tüm hakları saklıdır.`;
}
