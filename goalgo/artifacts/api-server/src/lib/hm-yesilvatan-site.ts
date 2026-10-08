/**
 * Yeşil Vatan (yesilvatan.gen.tr) — marka sabitleri (Yenişafak PHP tema).
 * Logo Worker ASSETS: `public/yesilvatan/*`.
 */

export const YESILVATAN_SLUG = "yesilvatan";
export const YESILVATAN_DOMAIN = "yesilvatan.gen.tr";

/** Statik logo (SPA assets + Worker ASSETS). */
export const YESILVATAN_LOGO_PATH = "/yesilvatan/yesilvatan-logo.png";
/** Aynı marka dosyası favicon / apple-touch için. */
export const YESILVATAN_FAVICON_PATH = "/yesilvatan/yesilvatan-logo.png";

export const YESILVATAN_PRIMARY_COLOR = "#2e7d32";

export function listYesilVatanDomains(): string[] {
  return [YESILVATAN_DOMAIN, `www.${YESILVATAN_DOMAIN}`];
}

export function isYesilVatanHost(raw: string | null | undefined): boolean {
  const host = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "");
  return host === YESILVATAN_DOMAIN;
}

export function isYesilVatanSlug(raw: string | null | undefined): boolean {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase() === YESILVATAN_SLUG
  );
}

/** layout_json üzerine logo/favicon yazar (mevcut alanları korur). */
export function applyYesilVatanLogoToLayout(
  layout: Record<string, unknown> | null | undefined,
): { layout: Record<string, unknown>; changed: boolean } {
  const next: Record<string, unknown> =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const broken = (u: string, brand: string) => {
    if (!u) return true;
    if (u === brand) return false;
    const lower = u.toLowerCase();
    if (lower.startsWith("data:image/")) return true;
    if (u.includes("/api/media")) return true;
    if (/^https?:\/\/[^/]+\/data:image\//i.test(u)) return true;
    if (u.startsWith("/turkata/") || u.startsWith("/brand/turkata/")) return true;
    return false;
  };
  const needsLogo = broken(logo, YESILVATAN_LOGO_PATH);
  const needsFavicon = broken(favicon, YESILVATAN_FAVICON_PATH);
  if (!needsLogo && !needsFavicon) {
    return { layout: next, changed: false };
  }
  if (needsLogo) next.logoUrl = YESILVATAN_LOGO_PATH;
  if (needsFavicon) next.faviconUrl = YESILVATAN_FAVICON_PATH;
  if (!next.hmPrimaryColor) next.hmPrimaryColor = YESILVATAN_PRIMARY_COLOR;
  return { layout: next, changed: true };
}

export function yesilVatanLayoutNeedsLogoRepair(layoutJsonRaw: string | null | undefined): boolean {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw) as Record<string, unknown>;
    return applyYesilVatanLogoToLayout(layout).changed;
  } catch {
    return true;
  }
}
