/**
 * Dünya Sağlık (dunyasaglik.org) — marka sabitleri (Yenişafak PHP tema).
 * Logo Worker ASSETS: `public/dunyasaglik/*`.
 */

import { applyPhpConceptColorsToLayout } from "./hm-php-concept-colors.js";

export const DUNYASAGLIK_SLUG = "dunyasaglik";
export const DUNYASAGLIK_DOMAIN = "dunyasaglik.org";

/** Statik logo (SPA assets + Worker ASSETS). */
export const DUNYASAGLIK_LOGO_PATH = "/dunyasaglik/dunyasaglik-logo.png";
/** Aynı marka dosyası favicon / apple-touch için. */
export const DUNYASAGLIK_FAVICON_PATH = "/dunyasaglik/dunyasaglik-logo.png";

export const DUNYASAGLIK_PRIMARY_COLOR = "#0a7ea4";
export const DUNYASAGLIK_SECONDARY_COLOR = "#0d6b5c";

export function listDunyaSaglikDomains(): string[] {
  return [DUNYASAGLIK_DOMAIN, `www.${DUNYASAGLIK_DOMAIN}`];
}

export function isDunyaSaglikHost(raw: string | null | undefined): boolean {
  const host = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "");
  return host === DUNYASAGLIK_DOMAIN;
}

export function isDunyaSaglikSlug(raw: string | null | undefined): boolean {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase() === DUNYASAGLIK_SLUG
  );
}

/** layout_json üzerine logo/favicon + konsept renkleri yazar. */
export function applyDunyaSaglikLogoToLayout(
  layout: Record<string, unknown> | null | undefined,
): { layout: Record<string, unknown>; changed: boolean } {
  const next: Record<string, unknown> =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  let changed = false;
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const needsLogo =
    !logo || logo.toLowerCase().startsWith("data:image/") || logo !== DUNYASAGLIK_LOGO_PATH;
  const needsFavicon =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon !== DUNYASAGLIK_FAVICON_PATH;
  if (needsLogo) {
    next.logoUrl = DUNYASAGLIK_LOGO_PATH;
    changed = true;
  }
  if (needsFavicon) {
    next.faviconUrl = DUNYASAGLIK_FAVICON_PATH;
    changed = true;
  }
  const colors = applyPhpConceptColorsToLayout(next, {
    primary: DUNYASAGLIK_PRIMARY_COLOR,
    secondary: DUNYASAGLIK_SECONDARY_COLOR,
  });
  return { layout: colors.layout, changed: changed || colors.changed };
}

export function dunyaSaglikLayoutNeedsLogoRepair(layoutJsonRaw: string | null | undefined): boolean {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw) as Record<string, unknown>;
    return applyDunyaSaglikLogoToLayout(layout).changed;
  } catch {
    return true;
  }
}
