/**
 * Dünya Sağlık (dunyasaglik.org) — marka sabitleri (Yenişafak PHP tema).
 * Logo Worker ASSETS: `public/dunyasaglik/*`.
 */

export const DUNYASAGLIK_SLUG = "dunyasaglik";
export const DUNYASAGLIK_DOMAIN = "dunyasaglik.org";

/** Statik logo (SPA assets + Worker ASSETS). */
export const DUNYASAGLIK_LOGO_PATH = "/dunyasaglik/dunyasaglik-logo.png";
/** Aynı marka dosyası favicon / apple-touch için. */
export const DUNYASAGLIK_FAVICON_PATH = "/dunyasaglik/dunyasaglik-logo.png";

export const DUNYASAGLIK_PRIMARY_COLOR = "#0a7ea4";

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

/** layout_json üzerine logo/favicon yazar (mevcut alanları korur). */
export function applyDunyaSaglikLogoToLayout(
  layout: Record<string, unknown> | null | undefined,
): { layout: Record<string, unknown>; changed: boolean } {
  const next: Record<string, unknown> =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  const logo = String(next.logoUrl ?? "").trim();
  const favicon = String(next.faviconUrl ?? "").trim();
  const needsLogo =
    !logo || logo.toLowerCase().startsWith("data:image/") || logo !== DUNYASAGLIK_LOGO_PATH;
  const needsFavicon =
    !favicon ||
    favicon.toLowerCase().startsWith("data:image/") ||
    favicon !== DUNYASAGLIK_FAVICON_PATH;
  if (!needsLogo && !needsFavicon) {
    return { layout: next, changed: false };
  }
  next.logoUrl = DUNYASAGLIK_LOGO_PATH;
  next.faviconUrl = DUNYASAGLIK_FAVICON_PATH;
  if (!next.hmPrimaryColor) next.hmPrimaryColor = DUNYASAGLIK_PRIMARY_COLOR;
  return { layout: next, changed: true };
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
