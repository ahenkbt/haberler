/**
 * Yeşil Vatan (yesilvatan.gen.tr) — marka sabitleri (Yenişafak PHP tema).
 * Logo Worker ASSETS: `public/yesilvatan/*`.
 */

import { applyPhpConceptColorsToLayout } from "./hm-php-concept-colors.js";

export const YESILVATAN_SLUG = "yesilvatan";
export const YESILVATAN_DOMAIN = "yesilvatan.gen.tr";

/** Statik logo (SPA assets + Worker ASSETS). */
export const YESILVATAN_LOGO_PATH = "/yesilvatan/yesilvatan-logo.png";
/** Aynı marka dosyası favicon / apple-touch için. */
export const YESILVATAN_FAVICON_PATH = "/yesilvatan/yesilvatan-logo.png";

export const YESILVATAN_PRIMARY_COLOR = "#0b6e4f";
export const YESILVATAN_SECONDARY_COLOR = "#2e7d32";

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

/** layout_json üzerine logo/favicon + konsept renkleri yazar. */
export function applyYesilVatanLogoToLayout(
  layout: Record<string, unknown> | null | undefined,
): { layout: Record<string, unknown>; changed: boolean } {
  const next: Record<string, unknown> =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  let changed = false;
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const needsLogo =
    !logo || logo.toLowerCase().startsWith("data:image/") || logo !== YESILVATAN_LOGO_PATH;
  const needsFavicon =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon !== YESILVATAN_FAVICON_PATH;
  if (needsLogo) {
    next.logoUrl = YESILVATAN_LOGO_PATH;
    changed = true;
  }
  if (needsFavicon) {
    next.faviconUrl = YESILVATAN_FAVICON_PATH;
    changed = true;
  }
  const colors = applyPhpConceptColorsToLayout(next, {
    primary: YESILVATAN_PRIMARY_COLOR,
    secondary: YESILVATAN_SECONDARY_COLOR,
  });
  return { layout: colors.layout, changed: changed || colors.changed };
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
