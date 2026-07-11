/**
 * Vitrin tema renkleri — **kilitle**.
 * `src/styles/hmVitrinThemes.css` içindeki `[data-hm-vitrin-theme="…"]` bloklarıyla aynı hex/rgb kullanılmalı.
 */
export const HM_VITRIN_THEME = {
  ankara: {
    accent: "#c40021",
    accent2: "#8e0018",
    brandLabel: "#ff6b6b",
    pageBg: "#ffffff",
    pageMuted: "#ffffff",
  },
  gold: {
    accent: "#b8941e",
    accent2: "#735a0e",
    brandLabel: "#e6d4a0",
    pageBg: "#ffffff",
    pageMuted: "#ffffff",
    tickerLabelHi: "#d4af37",
  },
  corporate: {
    accent: "#0d63b6",
    accent2: "#0f766e",
    brandLabel: "#d4af37",
    pageBg: "#ffffff",
    pageMuted: "#ffffff",
    tickerLabelHi: "#d4af37",
  },
  classic: {
    accent: "#b00020",
    accent2: "#071b34",
    brandLabel: "#ffffff",
    pageBg: "#f4f5f7",
    pageMuted: "#eef1f5",
    tickerLabelHi: "#facc15",
  },
  portal3: {
    accent: "#e30613",
    accent2: "#111111",
    brandLabel: "#e30613",
    pageBg: "#e9e9e9",
    pageMuted: "#f4f4f4",
    tickerLabelHi: "#22c55e",
  },
  esen: {
    accent: "#e30613",
    accent2: "#080808",
    brandLabel: "#e30613",
    pageBg: "#ffffff",
    pageMuted: "#f5f5f5",
    tickerLabelHi: "#16a34a",
  },
  manset24: {
    accent: "#e11d48",
    accent2: "#0f172a",
    brandLabel: "#ffffff",
    pageBg: "#f3f4f6",
    pageMuted: "#e5e7eb",
    tickerLabelHi: "#facc15",
  },
  renkli: {
    accent: "#f97316",
    accent2: "#111827",
    brandLabel: "#f97316",
    pageBg: "#ffffff",
    pageMuted: "#f8fafc",
    tickerLabelHi: "#22c55e",
  },
  ahenkhaber: {
    accent: "#cc0000",
    accent2: "#1a4a8a",
    brandLabel: "#cc0000",
    pageBg: "#f5f5f5",
    pageMuted: "#ffffff",
    tickerLabelHi: "#facc15",
  },
  modern: {
    accent: "#38bdf8",
    accent2: "#0369a1",
    brandLabel: "#38bdf8",
    pageBg: "#ffffff",
    pageMuted: "#f8fafc",
    tickerLabelHi: "#22c55e",
  },
  sumbul: {
    accent: "#0ea5e9",
    accent2: "#0284c7",
    brandLabel: "#0ea5e9",
    pageBg: "#ffffff",
    pageMuted: "#f8fafc",
    tickerLabelHi: "#16a34a",
  },
} as const;

export type HmVitrinThemeKey = keyof typeof HM_VITRIN_THEME;
export type HmResolvedColorPalette = "red" | "gold" | "blue";

/**
 * Vitrin tema anahtarı → Türkçe çiçek adı (baskın accent rengine göre).
 * `hmVitrinTheme` depolama/API anahtarları değişmez; yalnızca editör ve vitrin etiketleri.
 *
 * | Anahtar    | Accent (HM_VITRIN_THEME) | Çiçek      |
 * |------------|--------------------------|------------|
 * | news       | site birincil / nötr     | Papatya    |
 * | default    | news ile aynı            | Papatya    |
 * | classic    | #b00020 kırmızı          | Karanfil   |
 * | portal3    | #e30613 kırmızı          | Lale       |
 * | esen       | #e30613 kırmızı          | Gül        |
 * | manset24   | #e11d48 pembe-kırmızı    | Kardelen   |
 * | renkli     | #f97316 turuncu          | Zambak     |
 * | ahenkhaber | #cc0000 kırmızı          | Begonya    |
 * | modern     | dinamik / site rengi     | Yasemin    |
 * | corporate  | #0d63b6 mavi             | Orkide     |
 * | ankara     | #c40021 kırmızı          | Kızıl Lale |
 * | gold       | #b8941e altın            | Sarı Lale  |
 */
export const HM_VITRIN_THEME_FLOWER_LABELS = {
  news: "Papatya",
  default: "Papatya",
  classic: "Karanfil",
  portal3: "Lale",
  esen: "Gül",
  manset24: "Kardelen",
  renkli: "Zambak",
  ahenkhaber: "Begonya",
  modern: "Yasemin",
  corporate: "Orkide",
  ankara: "Kızıl Lale",
  gold: "Sarı Lale",
  sumbul: "Sümbül",
} as const;

export type HmVitrinThemeFlowerLabelId = keyof typeof HM_VITRIN_THEME_FLOWER_LABELS;

/** Editör / UI için çiçek adı; bilinmeyen anahtarlarda Papatya. */
export function hmVitrinThemeFlowerLabel(theme: string | null | undefined): string {
  const key = String(theme ?? "news").trim().toLowerCase() as HmVitrinThemeFlowerLabelId;
  return HM_VITRIN_THEME_FLOWER_LABELS[key] ?? HM_VITRIN_THEME_FLOWER_LABELS.news;
}

/** `hmPrimaryColor` yokken sekme / accent için */
export function hmVitrinAccentHex(theme: string | null | undefined): string {
  if (theme === "ankara") return HM_VITRIN_THEME.ankara.accent;
  if (theme === "gold") return HM_VITRIN_THEME.gold.accent;
  if (theme === "corporate") return HM_VITRIN_THEME.corporate.accent;
  if (theme === "classic") return HM_VITRIN_THEME.classic.accent;
  if (theme === "portal3") return HM_VITRIN_THEME.portal3.accent;
  if (theme === "esen") return HM_VITRIN_THEME.esen.accent;
  if (theme === "manset24") return HM_VITRIN_THEME.manset24.accent;
  if (theme === "renkli") return HM_VITRIN_THEME.renkli.accent;
  if (theme === "ahenkhaber") return HM_VITRIN_THEME.ahenkhaber.accent;
  if (theme === "sumbul") return HM_VITRIN_THEME.sumbul.accent;
  if (theme === "modern") return HM_VITRIN_THEME.modern.accent;
  return "";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const t = hex.trim().replace(/^#/, "");
  const full = t.length === 3 ? t.split("").map((c) => `${c}${c}`).join("") : t;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHue({ r, g, b }: { r: number; g: number; b: number }): number {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === rr) hue = ((gg - bb) / delta) % 6;
  else if (max === gg) hue = (bb - rr) / delta + 2;
  else hue = (rr - gg) / delta + 4;
  return (hue * 60 + 360) % 360;
}

export function resolveHmColorPalette(
  palette: string | null | undefined,
  primaryHex: string | null | undefined,
  theme: string | null | undefined,
): HmResolvedColorPalette {
  if (palette === "red" || palette === "gold" || palette === "blue") return palette;
  if (theme === "gold") return "gold";
  if (theme === "corporate") return "blue";
  if (theme === "classic") return "red";
  if (theme === "portal3") return "red";
  if (theme === "esen") return "red";
  if (theme === "manset24") return "red";
  if (theme === "renkli") return "gold";
  if (theme === "ahenkhaber") return "red";
  if (theme === "ankara") return "red";

  const rgb = primaryHex ? hexToRgb(primaryHex) : null;
  if (!rgb) return "red";
  const hue = rgbToHue(rgb);
  if (hue >= 35 && hue <= 65) return "gold";
  if (hue >= 165 && hue <= 250) return "blue";
  return "red";
}

/** Editör kategori renk satırları — çiçek teması preset'leriyle aynı slug seti. */
export const HM_CATEGORY_COLOR_SLUGS = [
  "gundem",
  "ekonomi",
  "spor",
  "dunya",
  "teknoloji",
  "kultur",
  "yasam",
  "saglik",
  "magazin",
] as const;

export type HmCategoryColorSlug = (typeof HM_CATEGORY_COLOR_SLUGS)[number];

export type HmFlowerThemeColorPreset = {
  hmPrimaryColor: string;
  hmSecondaryColor: string;
  hmColorPalette: HmResolvedColorPalette;
  hmCategoryColors: Record<HmCategoryColorSlug, string>;
};

const HEX6 = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeEditorHex(hex: string | null | undefined): string | null {
  const normalized = normalizeHexForCompare(hex);
  return normalized && HEX6.test(normalized) ? normalized : null;
}

/** Kategori slug → vitrin rengi; yoksa accent. */
export function resolveHmCategoryColor(
  slug: string | null | undefined,
  categoryColors: Record<string, string> | null | undefined,
  fallback: string,
): string {
  const key = String(slug ?? "").trim().toLowerCase();
  const raw = key ? categoryColors?.[key] : null;
  const editor = normalizeEditorHex(raw);
  if (editor) return editor;
  const builtin = key ? normalizeEditorHex(HM_BUILTIN_CATEGORY_DEFAULT_COLORS[key]) : null;
  return builtin ?? fallback;
}

/** `:root` / vitrin kabuğuna enjekte edilecek kategori CSS değişkenleri. */
export function resolveHmCategoryColorCssVars(
  categoryColors: Record<string, string> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!categoryColors) return out;
  for (const slug of HM_CATEGORY_COLOR_SLUGS) {
    const hex = normalizeEditorHex(categoryColors[slug]);
    if (hex) out[`--hm-cat-${slug}`] = hex;
  }
  for (const [slug, raw] of Object.entries(categoryColors)) {
    const hex = normalizeEditorHex(raw);
    if (hex && !out[`--hm-cat-${slug}`]) out[`--hm-cat-${slug}`] = hex;
  }
  for (const [slug, hexRaw] of Object.entries(HM_BUILTIN_CATEGORY_DEFAULT_COLORS)) {
    const hex = normalizeEditorHex(hexRaw);
    if (hex && !out[`--hm-cat-${slug}`]) out[`--hm-cat-${slug}`] = hex;
  }
  return out;
}

function mixCssVar(hex: string, amount: number, other: string): string {
  return `color-mix(in srgb, ${hex} ${amount}%, ${other})`;
}

/**
 * Editör `hmPrimaryColor` / `hmSecondaryColor` — yalnızca accent token'ları;
 * vitrin CSS dosyasındaki layout/zemin kurallarını ezmez.
 */
export function resolveHmEditorAccentCssVars(
  primaryHex: string | null | undefined,
  secondaryHex: string | null | undefined,
  theme: string | null | undefined,
): Record<string, string> {
  const primary = normalizeEditorHex(primaryHex);
  if (!primary) return {};
  const themeKey = String(theme ?? "").trim().toLowerCase();
  const themeTokens = themeKey in HM_VITRIN_THEME ? HM_VITRIN_THEME[themeKey as keyof typeof HM_VITRIN_THEME] : null;
  const secondary =
    normalizeEditorHex(secondaryHex) ??
    (themeTokens ? themeTokens.accent2 : null) ??
    mixCssVar(primary, 72, "#020617");
  return {
    "--hm-accent": primary,
    "--hm-accent-2": secondary,
    "--hm-accent-soft": mixCssVar(primary, 12, "#ffffff"),
    "--hm-brand-label": primary,
    "--hm-header-accent-line": mixCssVar(primary, 58, "transparent"),
    "--hm-nav-strip-border": mixCssVar(primary, 28, "rgba(255,255,255,0.1)"),
    "--hm-section-line": mixCssVar(primary, 20, "rgba(15,23,42,0.08)"),
    "--hm-section-accent-glow": mixCssVar(primary, 36, "transparent"),
    "--hm-cat-hover-bg": mixCssVar(primary, 12, "transparent"),
    "--hm-cat-hover-text": secondary,
  };
}

type HmCategoryPaletteVariant = "warm" | "cool" | "colorful" | "neutral" | "gold";

const HM_DEFAULT_NEWS_PRIMARY = "#e61e25";

const HM_DEFAULT_CATEGORY_COLORS: Record<HmCategoryColorSlug, string> = {
  gundem: "#e61e25",
  ekonomi: "#f97316",
  spor: "#16a34a",
  dunya: "#2563eb",
  teknoloji: "#7c3aed",
  kultur: "#9333ea",
  yasam: "#0d9488",
  saglik: "#059669",
  magazin: "#a855f7",
};

/** Editör renk tanımı yoksa kategori kutusu / sayfa başlığı için yerleşik vurgular. */
export const HM_BUILTIN_CATEGORY_DEFAULT_COLORS: Record<string, string> = {
  ...HM_DEFAULT_CATEGORY_COLORS,
  asayis: "#b91c1c",
  turkiye: "#dc2626",
  avrupa: "#1e40af",
  politika: "#7f1d1d",
  "dunyadan-kisa-kisa": "#1d4ed8",
  "dunya-kisa": "#1d4ed8",
  son_dakika: "#ea580c",
  "son-dakika": "#ea580c",
  egitim: "#0369a1",
  bilim: "#4f46e5",
  otomobil: "#0f766e",
  kadin: "#db2777",
  yazarlar: "#475569",
};

function buildHarmonizedCategoryColors(
  accent: string,
  accent2: string,
  tickerHi: string | undefined,
  variant: HmCategoryPaletteVariant,
): Record<HmCategoryColorSlug, string> {
  const hi = tickerHi ?? accent2;
  if (variant === "colorful") {
    return { ...HM_DEFAULT_CATEGORY_COLORS, gundem: accent, ekonomi: hi };
  }
  if (variant === "cool") {
    return {
      gundem: accent,
      ekonomi: hi,
      spor: "#16a34a",
      dunya: accent2,
      teknoloji: accent,
      kultur: accent2,
      yasam: "#0ea5e9",
      saglik: "#059669",
      magazin: hi,
    };
  }
  if (variant === "neutral") {
    return {
      gundem: accent,
      ekonomi: accent2,
      spor: "#475569",
      dunya: accent2,
      teknoloji: accent,
      kultur: accent2,
      yasam: "#64748b",
      saglik: "#059669",
      magazin: accent,
    };
  }
  if (variant === "gold") {
    return {
      gundem: accent,
      ekonomi: hi,
      spor: "#16a34a",
      dunya: accent2,
      teknoloji: "#92400e",
      kultur: accent,
      yasam: "#0d9488",
      saglik: "#059669",
      magazin: hi,
    };
  }
  return {
    gundem: accent,
    ekonomi: hi,
    spor: "#16a34a",
    dunya: accent2,
    teknoloji: "#7c3aed",
    kultur: "#9333ea",
    yasam: "#0d9488",
    saglik: "#059669",
    magazin: "#a855f7",
  };
}

function presetFromThemeTokens(
  themeKey: string,
  accent: string,
  accent2: string,
  tickerHi: string | undefined,
  variant: HmCategoryPaletteVariant,
): HmFlowerThemeColorPreset {
  return {
    hmPrimaryColor: accent,
    hmSecondaryColor: accent2,
    hmColorPalette: resolveHmColorPalette(null, accent, themeKey),
    hmCategoryColors: buildHarmonizedCategoryColors(accent, accent2, tickerHi, variant),
  };
}

/** Vitrin çiçek adına göre site vurgu + kategori renk preset'i. */
export function hmFlowerThemeColorPreset(theme: string | null | undefined): HmFlowerThemeColorPreset {
  const themeKey = String(theme ?? "news").trim().toLowerCase();

  if (themeKey === "news" || themeKey === "default" || themeKey === "modern") {
    return {
      hmPrimaryColor: HM_DEFAULT_NEWS_PRIMARY,
      hmSecondaryColor: "#7f1d1d",
      hmColorPalette: "red",
      hmCategoryColors: { ...HM_DEFAULT_CATEGORY_COLORS },
    };
  }

  if (themeKey === "gold") {
    const t = HM_VITRIN_THEME.gold;
    return presetFromThemeTokens(
      themeKey,
      t.accent,
      t.accent2,
      "tickerLabelHi" in t ? t.tickerLabelHi : undefined,
      "gold",
    );
  }

  const vitrinKey = themeKey as keyof typeof HM_VITRIN_THEME;
  if (vitrinKey in HM_VITRIN_THEME) {
    const t = HM_VITRIN_THEME[vitrinKey];
    const variant: HmCategoryPaletteVariant =
      vitrinKey === "renkli" ? "colorful" : vitrinKey === "corporate" ? "cool" : "warm";
    return presetFromThemeTokens(
      themeKey,
      t.accent,
      t.accent2,
      "tickerLabelHi" in t ? t.tickerLabelHi : undefined,
      variant,
    );
  }

  return {
    hmPrimaryColor: HM_DEFAULT_NEWS_PRIMARY,
    hmSecondaryColor: "#7f1d1d",
    hmColorPalette: "red",
    hmCategoryColors: { ...HM_DEFAULT_CATEGORY_COLORS },
  };
}

/** Genel ayarlar editöründe seçilebilir çiçek temaları (Papatya tek kart). */
export const HM_FLOWER_THEME_EDITOR_OPTIONS = [
  { themeKey: "news", flower: HM_VITRIN_THEME_FLOWER_LABELS.news, description: "Beyaz zemin, kırmızı vurgu" },
  { themeKey: "classic", flower: HM_VITRIN_THEME_FLOWER_LABELS.classic, description: "Karanfil kırmızı + lacivert" },
  { themeKey: "portal3", flower: HM_VITRIN_THEME_FLOWER_LABELS.portal3, description: "Gazete kırmızısı" },
  { themeKey: "esen", flower: HM_VITRIN_THEME_FLOWER_LABELS.esen, description: "Magazin kırmızısı" },
  { themeKey: "manset24", flower: HM_VITRIN_THEME_FLOWER_LABELS.manset24, description: "Pembe-kırmızı son dakika" },
  { themeKey: "renkli", flower: HM_VITRIN_THEME_FLOWER_LABELS.renkli, description: "Turuncu, renkli kategoriler" },
  { themeKey: "ahenkhaber", flower: HM_VITRIN_THEME_FLOWER_LABELS.ahenkhaber, description: "Ahenk Haber kırmızısı" },
  { themeKey: "modern", flower: HM_VITRIN_THEME_FLOWER_LABELS.modern, description: "Modern haber vitrini" },
  { themeKey: "sumbul", flower: HM_VITRIN_THEME_FLOWER_LABELS.sumbul, description: "Yekpare haber teması (mavi)" },
  { themeKey: "corporate", flower: HM_VITRIN_THEME_FLOWER_LABELS.corporate, description: "Kurumsal mavi" },
  { themeKey: "ankara", flower: HM_VITRIN_THEME_FLOWER_LABELS.ankara, description: "Ankara kırmızısı" },
  { themeKey: "gold", flower: HM_VITRIN_THEME_FLOWER_LABELS.gold, description: "Altın premium" },
] as const;

export type HmFlowerThemeEditorOption = (typeof HM_FLOWER_THEME_EDITOR_OPTIONS)[number];

function normalizeHexForCompare(hex: string | null | undefined): string {
  const t = String(hex ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(t)) {
    const x = t.slice(1);
    return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`;
  }
  return t;
}

/** Mevcut site renkleri hangi çiçek preset'ine denk geliyor (yoksa null). */
export function resolveActiveFlowerThemeKey(
  primaryHex: string | null | undefined,
  secondaryHex: string | null | undefined,
  categoryColors: Record<string, string> | null | undefined,
): string | null {
  const primary = normalizeHexForCompare(primaryHex);
  if (!primary) return null;
  const secondary = normalizeHexForCompare(secondaryHex);

  for (const opt of HM_FLOWER_THEME_EDITOR_OPTIONS) {
    const preset = hmFlowerThemeColorPreset(opt.themeKey);
    if (normalizeHexForCompare(preset.hmPrimaryColor) !== primary) continue;
    if (secondary && normalizeHexForCompare(preset.hmSecondaryColor) !== secondary) continue;
    const cats = categoryColors ?? {};
    const allMatch = HM_CATEGORY_COLOR_SLUGS.every(
      (slug) => normalizeHexForCompare(cats[slug]) === normalizeHexForCompare(preset.hmCategoryColors[slug]),
    );
    if (allMatch) return opt.themeKey;
  }
  return null;
}

/** Editör renk seçicisi için uyumlu 2. renk varsayılanı (vitrin teması veya birincil renk). */
export function resolveHmEditorSecondaryFallback(
  primaryHex: string | null | undefined,
  vitrinTheme: string | null | undefined,
): string {
  const preset = hmFlowerThemeColorPreset(vitrinTheme);
  if (primaryHex && normalizeHexForCompare(primaryHex) === normalizeHexForCompare(preset.hmPrimaryColor)) {
    return preset.hmSecondaryColor;
  }
  const themeKey = String(vitrinTheme ?? "").trim().toLowerCase();
  const themeTokens = themeKey in HM_VITRIN_THEME ? HM_VITRIN_THEME[themeKey as keyof typeof HM_VITRIN_THEME] : null;
  if (themeTokens) return themeTokens.accent2;
  return preset.hmSecondaryColor;
}

/** Aktif vitrin temasından çiçek preset anahtarı (corporate/news ayrımı dahil). */
export function resolveFlowerThemeKeyFromVitrin(vitrinTheme: string | null | undefined): string {
  const key = String(vitrinTheme ?? "news").trim().toLowerCase();
  if (key === "default") return "news";
  if (key === "corporate") return "corporate";
  if (HM_FLOWER_THEME_EDITOR_OPTIONS.some((opt) => opt.themeKey === key)) return key;
  return "news";
}
