/**
 * Yeni site açılışı — tema varsayılanı.
 *
 * Yalnızca oluşturma (POST /hm/sites) bu modülü kullanır. Kayıtlı sitelerin
 * layout_json değeri okunmaz ve yazılmaz.
 *
 * "Portal" mevcut vitrin temasıdır: layout anahtarı `portal`, SPA
 * `normalizeHmVitrinTheme` ile klasik haber portalına (`classic`) çözülür.
 * Kullanıcı oluştururken Yenişafak / Gazete Portal / Esen veya kurumsalda
 * VKD / VATAN seçebilir. Konsept site temayı Portal'a kilitler ve rengi
 * hmPrimaryColor / hmSecondaryColor olarak saklar (Portal vurgusu).
 */

export const HM_NEW_SITE_PORTAL_THEME = "portal";

/**
 * Portal teması ailesi (PHP tema, 2026-10-10): yeni.tc / Okul / Muhtar / Sendika portallarının varsayılan temaları.
 * Kayıtta SPA tarafı Portal (`hmVitrinTheme: portal`) kalır; seçim `hmPortalTheme` anahtarına yazılır.
 * `yeni` = yeni.tc'nin mevcut teması (görsel değişiklik yok, yalnız ad/seçenek).
 * Yeni açılan sitelerin varsayılanı yine "Portal" (`portal`).
 */
export const HM_PORTAL_SKIN_THEME_IDS = ["yeni", "okul", "muhtar", "sendika"] as const;
export type HmPortalSkinThemeId = (typeof HM_PORTAL_SKIN_THEME_IDS)[number];
export const HM_PORTAL_SKIN_LABELS: Record<HmPortalSkinThemeId, string> = {
  yeni: "Yeni Portal Teması",
  okul: "Okul Portal Teması",
  muhtar: "Muhtar Portal Teması",
  sendika: "Sendika Portal Teması",
};
const PORTAL_SKIN_SET = new Set<string>(HM_PORTAL_SKIN_THEME_IDS);

export function portalSkinThemeOf(raw: unknown): HmPortalSkinThemeId | null {
  const t = String(raw ?? "").trim().toLowerCase();
  return PORTAL_SKIN_SET.has(t) ? (t as HmPortalSkinThemeId) : null;
}

export const HM_NEWS_CREATE_THEME_IDS = ["portal", "yenisafak", "portal3", "esen", ...HM_PORTAL_SKIN_THEME_IDS] as const;
export const HM_CORPORATE_CREATE_THEME_IDS = ["portal", "corporate", "vatan"] as const;

export type HmNewsCreateThemeId = (typeof HM_NEWS_CREATE_THEME_IDS)[number];
export type HmCorporateCreateThemeId = (typeof HM_CORPORATE_CREATE_THEME_IDS)[number];

export type HmNewSiteColorPalette = {
  id: string;
  label: string;
  /** Portal vurgusu — SPA `--hm-accent` ve PHP `--ys-accent` (hmPrimaryColor). */
  primary: string;
  /** İkinci renk — nav / accent-2 (hmSecondaryColor). */
  secondary: string;
};

/** Konsept site renk seçici. `portal` klasik haber portalının kendi kırmızısı + lacivertidir. */
export const HM_NEW_SITE_COLOR_PALETTES: readonly HmNewSiteColorPalette[] = [
  { id: "portal", label: "Portal", primary: "#b00020", secondary: "#071b34" },
  { id: "kirmizi", label: "Kırmızı", primary: "#c40021", secondary: "#8e0018" },
  { id: "lacivert", label: "Lacivert", primary: "#0b3362", secondary: "#c8102e" },
  { id: "yesil", label: "Yeşil", primary: "#0b6e4f", secondary: "#2e7d32" },
  { id: "mavi", label: "Mavi", primary: "#0d63b6", secondary: "#0f766e" },
  { id: "bordo", label: "Bordo", primary: "#a50e1e", secondary: "#7a0b16" },
  { id: "turkuaz", label: "Turkuaz", primary: "#0a7ea4", secondary: "#0d6b5c" },
];

const NEWS_THEME_SET = new Set<string>(HM_NEWS_CREATE_THEME_IDS);
const CORPORATE_THEME_SET = new Set<string>(HM_CORPORATE_CREATE_THEME_IDS);

export function normalizeNewSiteHex(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(s);
  if (!m) return null;
  const hex = m[1] ?? "";
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((c) => `${c}${c}`)
      .join("")
      .toLowerCase()}`;
  }
  return `#${hex.toLowerCase()}`;
}

/** Özel renk için ikinci ton: vurguyu koyulaştırır, Portal lacivert zeminine yaklaştırır. */
export function companionHexForPrimary(primary: string): string {
  const hex = normalizeNewSiteHex(primary);
  if (!hex) return HM_NEW_SITE_COLOR_PALETTES[0]!.secondary;
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.max(0, Math.min(255, Math.round(channel * 0.42)));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  const to = (c: number) => c.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function findNewSiteColorPalette(raw: unknown): HmNewSiteColorPalette | null {
  const id = String(raw ?? "").trim().toLowerCase();
  if (!id || id === "ozel" || id === "custom") return null;
  return HM_NEW_SITE_COLOR_PALETTES.find((p) => p.id === id) ?? null;
}

/**
 * Boş / bilinmeyen değer null. `classic` ve `klasik` Portal'dır (mevcut takma ad).
 * Türün izin vermediği bir kimlik de null sayılır; çağıran Portal'a düşer.
 */
export function normalizeNewSiteVitrinTheme(
  raw: unknown,
  kind: "news" | "corporate",
): string | null {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!t) return null;
  if (t === "classic" || t === "klasik" || t === "portal") return HM_NEW_SITE_PORTAL_THEME;
  if (t === "kurumsal") return kind === "corporate" ? "corporate" : null;
  if (t === "yeni-safak" || t === "yenişafak" || t === "yenisafak") {
    return kind === "news" ? "yenisafak" : null;
  }
  if (kind === "news" && NEWS_THEME_SET.has(t)) return t;
  if (kind === "corporate" && CORPORATE_THEME_SET.has(t)) return t;
  return null;
}

/**
 * Oluşturma teması.
 * Açık `vitrinTheme` kazanır. Yoksa kurumsalda eski istemcinin `corporateTheme`
 * (VKD / VATAN) değeri korunur. İkisi de yoksa Portal.
 */
export function resolveNewSiteVitrinTheme(
  kind: "news" | "corporate",
  corporateTheme?: unknown,
  vitrinTheme?: unknown,
): string {
  const explicit = normalizeNewSiteVitrinTheme(vitrinTheme, kind);
  if (explicit) return explicit;
  if (kind === "corporate") {
    const legacy = normalizeNewSiteVitrinTheme(corporateTheme, "corporate");
    if (legacy === "vatan" || legacy === "corporate") return legacy;
  }
  return HM_NEW_SITE_PORTAL_THEME;
}

export type HmConceptColorInput = {
  palette?: unknown;
  primary?: unknown;
};

/** Konsept sitenin Portal temasına yazılacak renk alanları. Geçersiz özel renk palete düşer. */
export function resolveConceptPortalColors(input?: HmConceptColorInput | null): Record<string, unknown> {
  const requested = String(input?.palette ?? "").trim().toLowerCase();
  const custom = normalizeNewSiteHex(input?.primary);
  const named = findNewSiteColorPalette(requested);
  if ((requested === "ozel" || requested === "custom") && custom) {
    return {
      hmConceptPalette: "ozel",
      hmPrimaryColor: custom,
      hmSecondaryColor: companionHexForPrimary(custom),
      hmNavBarBackground: companionHexForPrimary(custom),
    };
  }
  if (named) {
    return {
      hmConceptPalette: named.id,
      hmPrimaryColor: named.primary,
      hmSecondaryColor: named.secondary,
      hmNavBarBackground: named.secondary,
    };
  }
  if (custom) {
    return {
      hmConceptPalette: "ozel",
      hmPrimaryColor: custom,
      hmSecondaryColor: companionHexForPrimary(custom),
      hmNavBarBackground: companionHexForPrimary(custom),
    };
  }
  const fallback = HM_NEW_SITE_COLOR_PALETTES[0]!;
  return {
    hmConceptPalette: fallback.id,
    hmPrimaryColor: fallback.primary,
    hmSecondaryColor: fallback.secondary,
    hmNavBarBackground: fallback.secondary,
  };
}
