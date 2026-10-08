/**
 * Yenişafak PHP siteleri — konsept chrome renkleri.
 * --ys-nav / --ys-navy ← primary (bars), --ys-accent ← secondary (son dakika / CTA).
 * Katalog: goalgo/artifacts/api-server/src/lib/hm-php-concept-colors.ts ile hizalı.
 */

export const HM_PHP_CONCEPT_PALETTES = Object.freeze({
  "yesilvatan.gen.tr": Object.freeze({
    slug: "yesilvatan",
    primary: "#0b6e4f",
    secondary: "#2e7d32",
  }),
  "yerel.net.tr": Object.freeze({
    slug: "yerelnet",
    primary: "#0b6e4f",
    secondary: "#c45c00",
  }),
  "turkatahaber.com": Object.freeze({
    slug: "turkatahaber",
    primary: "#0b3362",
    secondary: "#c00005",
  }),
  "sehitgazi.org.tr": Object.freeze({
    slug: "sehitgazi",
    primary: "#a50e1e",
    secondary: "#7a0b16",
  }),
  "turksav.org": Object.freeze({
    slug: "turksav",
    primary: "#1f3b63",
    secondary: "#c8102e",
  }),
  "dunyasaglik.org": Object.freeze({
    slug: "dunyasaglik",
    primary: "#0a7ea4",
    secondary: "#0d6b5c",
  }),
  "fix.tc": Object.freeze({
    slug: "fixhaber",
    primary: "#002B5C",
    secondary: "#D20000",
  }),
});

export function normalizePhpConceptHost(raw) {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

export function phpConceptPaletteForHost(hostname) {
  const host = normalizePhpConceptHost(hostname);
  return HM_PHP_CONCEPT_PALETTES[host] || null;
}

export function phpConceptPaletteForSlug(slug) {
  const key = String(slug ?? "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  for (const palette of Object.values(HM_PHP_CONCEPT_PALETTES)) {
    if (palette.slug === key) return palette;
  }
  return null;
}

/** theme.css başına eklenecek host chrome override (Worker /assets bridge). */
export function phpThemeChromeCssPrefix(hostname) {
  const palette = phpConceptPaletteForHost(hostname);
  if (!palette) return "";
  const accent = palette.secondary || palette.primary;
  return (
    `/* hm-php-concept-colors:${palette.slug} */` +
    `:root,body.ys{` +
    `--ys-navy:${palette.primary};` +
    `--ys-nav:${palette.primary};` +
    `--ys-accent:${accent};` +
    `--ys-secondary:${palette.secondary || palette.primary}` +
    `}\n`
  );
}

/** layout_json üzerine kanonik primary/secondary yazar. */
export function applyPhpConceptColorsToLayout(layout, palette) {
  const next =
    layout && typeof layout === "object" && !Array.isArray(layout) ? { ...layout } : {};
  if (!palette?.primary) return { layout: next, changed: false };
  let changed = false;
  const primary = String(next.hmPrimaryColor ?? "")
    .trim()
    .toLowerCase();
  const secondary = String(next.hmSecondaryColor ?? "")
    .trim()
    .toLowerCase();
  const wantPrimary = palette.primary.toLowerCase();
  const wantSecondary = String(palette.secondary || palette.primary).toLowerCase();
  if (primary !== wantPrimary) {
    next.hmPrimaryColor = palette.primary;
    changed = true;
  }
  if (secondary !== wantSecondary) {
    next.hmSecondaryColor = palette.secondary || palette.primary;
    changed = true;
  }
  return { layout: next, changed };
}

/** PHP body style="..." — primary→nav/navy, secondary→accent. */
export function buildPhpYsChromeBodyStyle(primaryHex, secondaryHex) {
  const primary = normalizeHex(primaryHex) || "#0b2a5b";
  const secondary = normalizeHex(secondaryHex) || primary;
  return `--ys-accent: ${secondary}; --ys-navy: ${primary}; --ys-nav: ${primary}; --ys-secondary: ${secondary}`;
}

function normalizeHex(raw) {
  const s = String(raw ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : "";
}
