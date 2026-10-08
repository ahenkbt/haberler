/**
 * Şehit Gazi (sehitgazi.org.tr) — marka sabitleri (Yenişafak PHP tema).
 * Logo Worker ASSETS: `public/sehitgazi/*`.
 */

import { applyPhpConceptColorsToLayout } from "./hm-php-concept-colors.js";

export const SEHITGAZI_SLUG = "sehitgazi";
export const SEHITGAZI_DOMAIN = "sehitgazi.org.tr";

/** Statik logo (SPA assets + Worker ASSETS). */
export const SEHITGAZI_LOGO_PATH = "/sehitgazi/sehitgazi-logo.png";
/** Aynı marka dosyası favicon / apple-touch için. */
export const SEHITGAZI_FAVICON_PATH = "/sehitgazi/sehitgazi-logo.png";

export const SEHITGAZI_PRIMARY_COLOR = "#a50e1e";
export const SEHITGAZI_SECONDARY_COLOR = "#7a0b16";

export function listSehitGaziDomains(): string[] {
  return [SEHITGAZI_DOMAIN, `www.${SEHITGAZI_DOMAIN}`];
}

export function isSehitGaziHost(raw: string | null | undefined): boolean {
  const host = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "");
  return host === SEHITGAZI_DOMAIN;
}

export function isSehitGaziSlug(raw: string | null | undefined): boolean {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase() === SEHITGAZI_SLUG
  );
}

/** layout_json üzerine logo/favicon + konsept renkleri yazar. */
export function applySehitGaziLogoToLayout(
  layout: Record<string, unknown> | null | undefined,
): { layout: Record<string, unknown>; changed: boolean } {
  const next: Record<string, unknown> =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  let changed = false;
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const needsLogo =
    !logo || logo.toLowerCase().startsWith("data:image/") || logo !== SEHITGAZI_LOGO_PATH;
  const needsFavicon =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon !== SEHITGAZI_FAVICON_PATH;
  if (needsLogo) {
    next.logoUrl = SEHITGAZI_LOGO_PATH;
    changed = true;
  }
  if (needsFavicon) {
    next.faviconUrl = SEHITGAZI_FAVICON_PATH;
    changed = true;
  }
  const colors = applyPhpConceptColorsToLayout(next, {
    primary: SEHITGAZI_PRIMARY_COLOR,
    secondary: SEHITGAZI_SECONDARY_COLOR,
  });
  return { layout: colors.layout, changed: changed || colors.changed };
}

export function sehitGaziLayoutNeedsLogoRepair(layoutJsonRaw: string | null | undefined): boolean {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw) as Record<string, unknown>;
    return applySehitGaziLogoToLayout(layout).changed;
  } catch {
    return true;
  }
}
