/**
 * TürkSav (turksav.org) — marka sabitleri (Yenişafak PHP tema).
 * Logo Worker ASSETS: `public/turksav/*`.
 */

export const TURKSAV_SLUG = "turksav";
export const TURKSAV_DOMAIN = "turksav.org";

/** Statik logo (SPA assets + Worker ASSETS). */
export const TURKSAV_LOGO_PATH = "/turksav/turksav-logo.png";
/** Aynı marka dosyası favicon / apple-touch için. */
export const TURKSAV_FAVICON_PATH = "/turksav/turksav-logo.png";

export const TURKSAV_PRIMARY_COLOR = "#1f3b63";

export function listTurksavDomains(): string[] {
  return [TURKSAV_DOMAIN, `www.${TURKSAV_DOMAIN}`];
}

export function isTurksavHost(raw: string | null | undefined): boolean {
  const host = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "");
  return host === TURKSAV_DOMAIN;
}

export function isTurksavSlug(raw: string | null | undefined): boolean {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase() === TURKSAV_SLUG
  );
}

/** layout_json üzerine logo/favicon yazar (mevcut alanları korur). */
export function applyTurksavLogoToLayout(
  layout: Record<string, unknown> | null | undefined,
): { layout: Record<string, unknown>; changed: boolean } {
  const next: Record<string, unknown> =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const needsLogo =
    !logo || logo.toLowerCase().startsWith("data:image/") || logo !== TURKSAV_LOGO_PATH;
  const needsFavicon =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon !== TURKSAV_FAVICON_PATH;
  if (!needsLogo && !needsFavicon) {
    return { layout: next, changed: false };
  }
  next.logoUrl = TURKSAV_LOGO_PATH;
  next.faviconUrl = TURKSAV_FAVICON_PATH;
  if (!next.hmPrimaryColor) next.hmPrimaryColor = TURKSAV_PRIMARY_COLOR;
  return { layout: next, changed: true };
}

export function turksavLayoutNeedsLogoRepair(layoutJsonRaw: string | null | undefined): boolean {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return true;
  try {
    const layout = JSON.parse(raw) as Record<string, unknown>;
    return applyTurksavLogoToLayout(layout).changed;
  } catch {
    return true;
  }
}
