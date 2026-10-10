/**
 * Yeni site formu tema / renk listesi.
 * Kayıt kuralları: `artifacts/api-server/src/lib/hm-new-site-theme.ts` (aynı kimlik ve hex).
 * Portal = mevcut klasik haber portalı (`hmVitrinTheme: portal` → classic).
 */

export const HM_NEW_SITE_PORTAL_THEME = "portal";

export const HM_NEWS_CREATE_THEMES = [
  { id: "portal", label: "Portal" },
  { id: "yenisafak", label: "Yenişafak" },
  { id: "portal3", label: "Gazete Portal" },
  { id: "esen", label: "Esen" },
  { id: "yeni", label: "Yeni Portal Teması" },
  { id: "okul", label: "Okul Portal Teması" },
  { id: "muhtar", label: "Muhtar Portal Teması" },
  { id: "sendika", label: "Sendika Portal Teması" },
] as const;

/** Mevcut sitelerde (vitrin ayarları) seçilebilen Portal teması ailesi. Değer `hmPortalTheme` anahtarına yazılır. */
export const HM_PORTAL_SKIN_OPTIONS = [
  { id: "portal", label: "Portal (varsayılan)" },
  { id: "yeni", label: "Yeni Portal Teması" },
  { id: "okul", label: "Okul Portal Teması" },
  { id: "muhtar", label: "Muhtar Portal Teması" },
  { id: "sendika", label: "Sendika Portal Teması" },
] as const;

export const HM_CORPORATE_CREATE_THEMES = [
  { id: "portal", label: "Portal" },
  { id: "corporate", label: "VKD Tema" },
  { id: "vatan", label: "VATAN tema" },
] as const;

export const HM_NEW_SITE_COLOR_PALETTES = [
  { id: "portal", label: "Portal", primary: "#b00020", secondary: "#071b34" },
  { id: "kirmizi", label: "Kırmızı", primary: "#c40021", secondary: "#8e0018" },
  { id: "lacivert", label: "Lacivert", primary: "#0b3362", secondary: "#c8102e" },
  { id: "yesil", label: "Yeşil", primary: "#0b6e4f", secondary: "#2e7d32" },
  { id: "mavi", label: "Mavi", primary: "#0d63b6", secondary: "#0f766e" },
  { id: "bordo", label: "Bordo", primary: "#a50e1e", secondary: "#7a0b16" },
  { id: "turkuaz", label: "Turkuaz", primary: "#0a7ea4", secondary: "#0d6b5c" },
] as const;

export type HmNewSiteThemeId =
  | (typeof HM_NEWS_CREATE_THEMES)[number]["id"]
  | (typeof HM_CORPORATE_CREATE_THEMES)[number]["id"];
