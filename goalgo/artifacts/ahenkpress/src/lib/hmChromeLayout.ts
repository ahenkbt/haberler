const HEX3_OR_6 = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export type HmChromeColorMode = "light" | "dark" | "auto";

export function normalizeHmChromeColorMode(raw: string | null | undefined): HmChromeColorMode {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "light" || v === "dark") return v;
  return "auto";
}

type ChromeModePrefs = {
  hmChromeColorMode?: string | null;
  hmLogoBarBackground?: string | null;
  hmNavBarBackground?: string | null;
  hmVitrinTheme?: string | null;
};

/** Tema + özel renklere göre otomatik açık krom (açık zemin, koyu metin). */
export function resolveHmAutoChromeLight(layoutPrefs: ChromeModePrefs | null | undefined): boolean {
  const theme = String(layoutPrefs?.hmVitrinTheme ?? "");
  const logoBgHex = normalizeHmChromeHex(layoutPrefs?.hmLogoBarBackground ?? null);
  if (logoBgHex) return isLightBackgroundHex(logoBgHex);
  if (HM_LIGHT_CHROME_THEMES.has(theme)) return true;
  const navBgHex = normalizeHmChromeHex(layoutPrefs?.hmNavBarBackground ?? null);
  if (navBgHex) return isLightBackgroundHex(navBgHex);
  const defaultNav = HM_THEME_DEFAULT_NAV_BG[theme];
  if (defaultNav) return isLightBackgroundHex(defaultNav);
  return false;
}

/** Editör `hmChromeColorMode` + vitrin heuristikleri (ziyaretçi tercihi yok). */
export function resolveEditorHmEffectiveChromeColorMode(
  layoutPrefs: ChromeModePrefs | null | undefined,
): "light" | "dark" {
  const mode = normalizeHmChromeColorMode(layoutPrefs?.hmChromeColorMode);
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return resolveHmAutoChromeLight(layoutPrefs) ? "light" : "dark";
}

/** `data-hm-chrome-mode` için çözümlenmiş açık/koyu — editör ayarı. */
export function resolveHmEffectiveChromeColorMode(
  layoutPrefs: ChromeModePrefs | null | undefined,
): "light" | "dark" {
  return resolveEditorHmEffectiveChromeColorMode(layoutPrefs);
}

/** Nav / ticker yardımcıları için editör krom modu uygulanmış layout prefs. */
export function mergeHmLayoutPrefsWithUserTheme<T extends ChromeModePrefs>(
  layoutPrefs: T | null | undefined,
): T | null {
  if (!layoutPrefs) return null;
  const effective = resolveHmEffectiveChromeColorMode(layoutPrefs);
  return { ...layoutPrefs, hmChromeColorMode: effective };
}

export function normalizeHmChromeHex(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!HEX3_OR_6.test(t)) return null;
  if (/^#[0-9a-f]{6}$/i.test(t)) return t.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(t)) {
    const x = t.slice(1);
    return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`.toLowerCase();
  }
  return null;
}

/** Açık arka planlarda koyu metin; koyu zeminde açık metin. */
export function isLightBackgroundHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.62;
}

/** Haber + kurumsal: editörde “Ortalı” seçiliyken true (1280px). */
export function isHmSiteLayoutContained(
  layoutPrefs: { hmCorporateLayoutWidth?: string | null; hmVitrinTheme?: string | null } | null | undefined,
): boolean {
  return layoutPrefs?.hmCorporateLayoutWidth !== "full";
}

/** @deprecated isHmSiteLayoutContained kullanın */
export function isHmCorporateLayoutContained(
  layoutPrefs: { hmCorporateLayoutWidth?: string | null; hmVitrinTheme?: string | null } | null | undefined,
): boolean {
  return isHmSiteLayoutContained(layoutPrefs);
}

export const HM_CONTAINED_LAYOUT_MAX_PX = 1280;

export function hmContainedPageShellClass(extra?: string): string {
  return ["hm-contained-page-shell mx-auto w-full max-w-[1280px] px-3 md:px-4", extra].filter(Boolean).join(" ");
}

/** Üst/alt krom (logo, menü, footer): gövde kabuğuyla aynı 1280px + yatay padding. */
export function hmChromeContainedShellClass(extra?: string): string {
  return ["hm-chrome-contained-shell mx-auto w-full max-w-[1280px] px-3 md:px-4", extra].filter(Boolean).join(" ");
}

export function hmFullWidthPageShellClass(extra?: string): string {
  return ["mx-auto w-full min-w-0 px-4 md:px-8", extra].filter(Boolean).join(" ");
}

/** Sayfa gövdesi: site genişliği ayarına göre 1280px kabuk veya tam genişlik padding. */
export function hmSiteContentShellClass(
  layoutPrefs: { hmCorporateLayoutWidth?: string | null; hmVitrinTheme?: string | null } | null | undefined,
  extra?: string,
): string {
  return isHmSiteLayoutContained(layoutPrefs) ? hmContainedPageShellClass(extra) : hmFullWidthPageShellClass(extra);
}

/** Ortalı layout: editör/kurumsal alt sayfa gövdesi — header ile aynı 1280px (padding içerikte). */
export function hmEditorContainedPageHostClass(extra?: string): string {
  return ["hm-editor-contained-page-host mx-auto w-full min-w-0 max-w-[1280px]", extra].filter(Boolean).join(" ");
}

const HM_CONTAINED_HOST_NEWS_SEGMENTS = new Set([
  "haber",
  "kategori",
  "yazar",
  "yazarlar",
  "tum-haberler",
  "sondakika",
  "kisa-kisa",
  "ara",
  "etiket",
  "etiketler",
  "foto-galeri",
  "embed",
  "video-tv",
]);

/** Anasayfa / haber akışı hariç — ortalı sitede 1280px host ile sarılır. */
export function isHmEditorPageForContainedHost(pathname: string, isHomeRoot: boolean): boolean {
  if (isHomeRoot) return false;
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  if (path === "/") return false;
  const parts = path.split("/").filter(Boolean);
  let head = parts[0] ?? "";
  if (head === "tr" && parts.length >= 3) head = parts[2] ?? "";
  else if (head === "tr") return false;
  if (!head || HM_CONTAINED_HOST_NEWS_SEGMENTS.has(head)) return false;
  return true;
}

/** Logo + menü şeritleri: site “Ortalı” iken gövdeyle aynı genişlikte (1280px). */
export function isHmHeaderChromeContained(
  layoutPrefs:
    | { hmHeaderChromeFullBleed?: boolean; hmCorporateLayoutWidth?: string | null; hmVitrinTheme?: string | null }
    | null
    | undefined,
): boolean {
  if (layoutPrefs?.hmCorporateLayoutWidth === "full") return false;
  if (layoutPrefs?.hmHeaderChromeFullBleed === true) return false;
  return true;
}

const HM_LIGHT_CHROME_THEMES = new Set(["portal3", "esen", "modern"]);

/** `hmVitrinThemes.css` nav şeridi varsayılanları — özel renk yoksa kontrast için. */
const HM_THEME_DEFAULT_NAV_BG: Partial<Record<string, string>> = {
  esen: "#ffffff",
  portal3: "#e30613",
  classic: "#12172a",
  ankara: "#222222",
  gold: "#1c1710",
  corporate: "#08294f",
  manset24: "#e11d48",
  renkli: "#111827",
  ahenkhaber: "#1a1a1a",
  modern: "#0f172a",
};

/** `hmVitrinThemes.css` footer arka plan varsayılanları — açık logo çubuğunda bile koyu footer. */
export const HM_THEME_DEFAULT_FOOTER_BG: Partial<Record<string, string>> = {
  portal3: "#111111",
  modern: "#0f172a",
  corporate: "#071f3d",
  classic: "#121212",
  ankara: "#222222",
  gold: "#111111",
  esen: "#111111",
  manset24: "#111827",
  renkli: "#111827",
  ahenkhaber: "#1a1a1a",
};

/** `hmVitrinThemes.css` footer başlık vurgu renkleri. */
export const HM_THEME_DEFAULT_FOOTER_HEADING: Partial<Record<string, string>> = {
  portal3: "#e30613",
  modern: "#38bdf8",
  corporate: "#38bdf8",
  classic: "#ff6b6b",
  ankara: "#ff6b6b",
  gold: "#d4af37",
  esen: "#e30613",
  manset24: "#f87171",
  renkli: "#f97316",
  ahenkhaber: "#facc15",
};

/** `hmVitrinThemes.css` ticker rail varsayılanları — son dakika / piyasa metin rengi için. */
const HM_THEME_DEFAULT_TICKER_RAIL: Partial<Record<string, string>> = {
  portal3: "#e30613",
  esen: "#0ea5e9",
  classic: "#050f1f",
  ankara: "#0a0a0a",
  gold: "#060504",
  corporate: "#08294f",
  manset24: "#020617",
  renkli: "#0f172a",
  ahenkhaber: "#cc0000",
};

/** Menü şeridi açık zemin (beyaz) kullanan vitrin temaları — yalnızca CSS'te beyaz nav tanımlı olanlar. */
const HM_LIGHT_NAV_STRIP_THEMES = new Set(["esen"]);

type HmFooterPalette = "red" | "gold" | "blue";

const HM_PALETTE_HEADER: Record<HmFooterPalette, string> = {
  red: "#0d0b0b",
  gold: "#0f0c08",
  blue: "#061a33",
};

function mixHmFooterCss(hex: string, amount: number, other: string): string {
  return `color-mix(in srgb, ${hex} ${amount}%, ${other})`;
}

/** Özel logo/nav renkleri varken footer arka planı — açık logoda tema koyu footer'ını korur. */
export function resolveHmFooterBackgroundHex(
  palette: HmFooterPalette,
  logoBgHex: string | null,
  navBgHex: string | null,
  vitrinTheme: string | null | undefined,
): string {
  const theme = String(vitrinTheme ?? "");
  const themeDefault = HM_THEME_DEFAULT_FOOTER_BG[theme];
  const paletteHeader = HM_PALETTE_HEADER[palette];

  if (navBgHex) {
    if (isLightBackgroundHex(navBgHex)) {
      return themeDefault ?? paletteHeader;
    }
    return mixHmFooterCss(navBgHex, 55, "#020617");
  }
  if (logoBgHex && !isLightBackgroundHex(logoBgHex)) {
    return mixHmFooterCss(logoBgHex, 50, "#020617");
  }
  if (themeDefault) return themeDefault;
  return paletteHeader;
}

export function resolveHmFooterHeadingHex(
  vitrinTheme: string | null | undefined,
  brandFallback: string,
): string {
  const theme = String(vitrinTheme ?? "");
  return HM_THEME_DEFAULT_FOOTER_HEADING[theme] ?? brandFallback;
}

export function isHmLightChromeTheme(
  layoutPrefs: { hmVitrinTheme?: string | null } | null | undefined,
): boolean {
  return HM_LIGHT_CHROME_THEMES.has(String(layoutPrefs?.hmVitrinTheme ?? ""));
}

/** Menü şeridi arka plan rengi (özel veya tema varsayılanı). */
export function resolveHmNavStripBackgroundHex(
  layoutPrefs:
    | {
        hmNavBarBackground?: string | null;
        hmVitrinTheme?: string | null;
      }
    | null
    | undefined,
): string | null {
  const navBgHex = normalizeHmChromeHex(layoutPrefs?.hmNavBarBackground ?? null);
  if (navBgHex) return navBgHex;
  const theme = String(layoutPrefs?.hmVitrinTheme ?? "");
  const defaultNav = HM_THEME_DEFAULT_NAV_BG[theme];
  return defaultNav ?? null;
}

/**
 * Menü şeridi metin rengi: nav zemin parlaklığı + hmChromeColorMode (auto/light/dark).
 * Özel nav rengi veya tema varsayılanı varsa luminance önceliklidir.
 */
export function resolveHmNavStripOnLight(
  layoutPrefs:
    | {
        hmChromeColorMode?: string | null;
        hmNavBarBackground?: string | null;
        hmVitrinTheme?: string | null;
      }
    | null
    | undefined,
): boolean {
  const mode = normalizeHmChromeColorMode(layoutPrefs?.hmChromeColorMode);
  if (mode === "light") return true;
  if (mode === "dark") return false;
  const navBgHex = normalizeHmChromeHex(layoutPrefs?.hmNavBarBackground ?? null);
  if (navBgHex) return isLightBackgroundHex(navBgHex);
  const theme = String(layoutPrefs?.hmVitrinTheme ?? "");
  return HM_LIGHT_NAV_STRIP_THEMES.has(theme);
}

/** Editör `hmChromeColorMode` uygulanmış layout prefs ile logo bandı açık zemin mi? */
export function resolveHmHeaderBandBackgroundStyle(
  layoutPrefs: ChromeModePrefs | null | undefined,
  logoBgHex: string | null,
): { background?: string; backgroundColor?: string } {
  if (logoBgHex) return { backgroundColor: logoBgHex };
  if (resolveEditorHmEffectiveChromeColorMode(layoutPrefs) === "light") {
    return { background: "#ffffff" };
  }
  return { background: "var(--hm-header-bg,#0f172a)" };
}

/** Menü şeridi inline arka plan — açık krom modunda tema varsayılanını geçersiz kılar. */
export function resolveHmNavStripBackgroundStyle(
  layoutPrefs:
    | {
        hmChromeColorMode?: string | null;
        hmNavBarBackground?: string | null;
        hmVitrinTheme?: string | null;
        hmPrimaryColor?: string | null;
      }
    | null
    | undefined,
  opts?: { trabzonikNavHex?: string; trabzonik?: boolean },
): string {
  if (opts?.trabzonik) return opts.trabzonikNavHex ?? "#6b0f1a";
  if (resolveEditorHmEffectiveChromeColorMode(layoutPrefs) === "light") return "#ffffff";
  const navBgHex = normalizeHmChromeHex(layoutPrefs?.hmNavBarBackground ?? null);
  if (navBgHex) return navBgHex;
  return "var(--hm-nav-strip-bg, var(--hm-strip-bg, #0f172a))";
}

export type HmNavLinkColorTokens = {
  onLight: boolean;
  muted: string;
  active: string;
  pillIdleBg: string;
  pillText: string;
  activePillText: string;
  linkHover: string;
};

/** Nav menü link/pill renkleri — nav zemin luminance + accent kontrastı. */
export function resolveHmNavLinkColor(
  layoutPrefs:
    | {
        hmChromeColorMode?: string | null;
        hmNavBarBackground?: string | null;
        hmVitrinTheme?: string | null;
        hmPrimaryColor?: string | null;
      }
    | null
    | undefined,
  accent?: string | null,
): HmNavLinkColorTokens {
  const onLight = resolveHmNavStripOnLight(layoutPrefs);
  const accentHex = normalizeHmChromeHex(accent ?? layoutPrefs?.hmPrimaryColor ?? null);
  const accentOnLight = accentHex ? isLightBackgroundHex(accentHex) : false;
  return {
    onLight,
    muted: onLight ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.72)",
    active: onLight ? "#0f172a" : "#fff",
    pillIdleBg: onLight ? "rgba(15,23,42,0.07)" : "var(--hm-nav-pill-bg, rgba(255,255,255,0.08))",
    pillText: onLight ? "#0f172a" : "#fff",
    activePillText: accentOnLight ? "#0f172a" : "#fff",
    linkHover: onLight ? "#0f172a" : "var(--hm-text-on-dark, #fff)",
  };
}

/** Cam ticker yüzeyi: `light` = buzlu açık cam + koyu metin; `dark` = koyu header üstü + açık metin. */
export type HmTickerGlassSurface = "light" | "dark";

export function resolveHmTickerGlassSurface(
  layoutPrefs: ChromeModePrefs | null | undefined,
  band: "breaking" | "finance" = "finance",
): HmTickerGlassSurface {
  if (band === "breaking") return "light";
  return resolveHmTickerRailLightText(layoutPrefs) ? "dark" : "light";
}

/** Ticker bileşenleri `variantLight` prop'u için cam yüzey → açık metin bayrağı. */
export function hmTickerVariantLightFromGlassSurface(surface: HmTickerGlassSurface): boolean {
  return surface === "dark";
}

/** @deprecated resolveHmTickerGlassSurface(..., "breaking") kullanın */
export function resolveHmSonDakikaChromeBandOnLightGlass(): boolean {
  return true;
}

/** Logo bandı metin rengi: koyu zemin → açık metin; açık özel logo arka planı → koyu metin. */
export function resolveHmHeaderChromeLightText(
  layoutPrefs:
    | {
        hmChromeColorMode?: string | null;
        hmLogoBarBackground?: string | null;
        hmVitrinTheme?: string | null;
      }
    | null
    | undefined,
): boolean {
  const mode = normalizeHmChromeColorMode(layoutPrefs?.hmChromeColorMode);
  if (mode === "light") return false;
  if (mode === "dark") return true;
  const logoBgHex = normalizeHmChromeHex(layoutPrefs?.hmLogoBarBackground ?? null);
  if (logoBgHex) return !isLightBackgroundHex(logoBgHex);
  return !HM_LIGHT_CHROME_THEMES.has(String(layoutPrefs?.hmVitrinTheme ?? ""));
}

/**
 * Son dakika / piyasa şeridi kaydırma alanı (--hm-ticker-rail) üzerinde açık metin kullanılsın mı?
 * Açık logo bandı temalarında rail genelde doygun renk (mavi/kırmızı); koyu header temalarında koyu rail.
 */
export function resolveHmTickerRailLightText(
  layoutPrefs:
    | {
        hmChromeColorMode?: string | null;
        hmLogoBarBackground?: string | null;
        hmNavBarBackground?: string | null;
        hmVitrinTheme?: string | null;
      }
    | null
    | undefined,
): boolean {
  const mode = normalizeHmChromeColorMode(layoutPrefs?.hmChromeColorMode);
  if (mode === "light") return false;
  if (mode === "dark") return true;
  const navBgHex = normalizeHmChromeHex(layoutPrefs?.hmNavBarBackground ?? null);
  if (navBgHex) return !isLightBackgroundHex(navBgHex);
  const logoBgHex = normalizeHmChromeHex(layoutPrefs?.hmLogoBarBackground ?? null);
  if (logoBgHex) return !isLightBackgroundHex(logoBgHex);
  const theme = String(layoutPrefs?.hmVitrinTheme ?? "");
  const defaultRail = HM_THEME_DEFAULT_TICKER_RAIL[theme];
  if (defaultRail) return !isLightBackgroundHex(defaultRail);
  return true;
}

/** Logo bandındaki piyasa-hava şeridi: ticker rail zeminine göre metin rengi. */
export function resolveHmFinanceStripLightText(
  layoutPrefs:
    | {
        hmLogoBarBackground?: string | null;
        hmNavBarBackground?: string | null;
        hmVitrinTheme?: string | null;
      }
    | null
    | undefined,
): boolean {
  return resolveHmTickerRailLightText(layoutPrefs);
}
