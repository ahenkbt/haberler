/**
 * Yenişafak PHP siteleri — konsept chrome renkleri.
 * --ys-nav / --ys-navy ← primary, --ys-accent ← secondary.
 * Worker: cloudflare/hm-php-concept-colors.js ile hizalı tut.
 */

export type PhpConceptPalette = {
  slug: string;
  domain: string;
  primary: string;
  secondary: string;
};

export const HM_PHP_CONCEPT_PALETTES: readonly PhpConceptPalette[] = [
  {
    slug: "yesilvatan",
    domain: "yesilvatan.gen.tr",
    primary: "#0b6e4f",
    secondary: "#2e7d32",
  },
  {
    slug: "yerelnet",
    domain: "yerel.net.tr",
    primary: "#0b6e4f",
    secondary: "#c45c00",
  },
  {
    slug: "turkatahaber",
    domain: "turkatahaber.com",
    primary: "#0b3362",
    secondary: "#c00005",
  },
  {
    slug: "sehitgazi",
    domain: "sehitgazi.org.tr",
    primary: "#a50e1e",
    secondary: "#7a0b16",
  },
  {
    slug: "turksav",
    domain: "turksav.org",
    primary: "#1f3b63",
    secondary: "#c8102e",
  },
  {
    slug: "dunyasaglik",
    domain: "dunyasaglik.org",
    primary: "#0a7ea4",
    secondary: "#0d6b5c",
  },
  {
    slug: "fixhaber",
    domain: "fix.tc",
    primary: "#002B5C",
    secondary: "#D20000",
  },
] as const;

export function normalizePhpConceptHost(raw: string | null | undefined): string {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

export function phpConceptPaletteForHost(
  hostname: string | null | undefined,
): PhpConceptPalette | undefined {
  const host = normalizePhpConceptHost(hostname);
  return HM_PHP_CONCEPT_PALETTES.find((p) => p.domain === host);
}

export function phpConceptPaletteForSlug(
  slug: string | null | undefined,
): PhpConceptPalette | undefined {
  const key = String(slug ?? "")
    .trim()
    .toLowerCase();
  return HM_PHP_CONCEPT_PALETTES.find((p) => p.slug === key);
}

/** layout_json üzerine kanonik primary/secondary yazar (seed/ensure drift kilidi). */
export function applyPhpConceptColorsToLayout(
  layout: Record<string, unknown> | null | undefined,
  palette: Pick<PhpConceptPalette, "primary" | "secondary">,
): { layout: Record<string, unknown>; changed: boolean } {
  const next: Record<string, unknown> =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  let changed = false;
  const primary = String(next.hmPrimaryColor ?? "")
    .trim()
    .toLowerCase();
  const secondary = String(next.hmSecondaryColor ?? "")
    .trim()
    .toLowerCase();
  const wantPrimary = palette.primary.toLowerCase();
  const wantSecondary = palette.secondary.toLowerCase();
  if (primary !== wantPrimary) {
    next.hmPrimaryColor = palette.primary;
    changed = true;
  }
  if (secondary !== wantSecondary) {
    next.hmSecondaryColor = palette.secondary;
    changed = true;
  }
  return { layout: next, changed };
}

/** PHP body inline style — primary chrome + secondary accent. */
export function buildPhpYsChromeBodyStyle(primaryHex: string, secondaryHex?: string | null): string {
  const primary = normalizeHex(primaryHex) || "#0b2a5b";
  const secondary = normalizeHex(secondaryHex) || primary;
  return `--ys-accent: ${secondary}; --ys-navy: ${primary}; --ys-nav: ${primary}; --ys-secondary: ${secondary}`;
}

function normalizeHex(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : "";
}
