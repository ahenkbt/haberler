/** Site içeriği varsayılan dili — Google Translate kaynak dili. */
export const SITE_PAGE_LANGUAGE = "tr" as const;

export type SiteTranslateLangCode = string;

export type SiteTranslateLanguage = {
  code: SiteTranslateLangCode;
  /** Türkçe etiket (öneri bandı ve menü). */
  labelTr: string;
  /** Yerel dil adı. */
  nativeLabel: string;
};

/** Header menüsünde sunulan diller (Google Translate kodları). */
export const SITE_TRANSLATE_LANGUAGES: SiteTranslateLanguage[] = [
  { code: "tr", labelTr: "Türkçe", nativeLabel: "Türkçe" },
  { code: "en", labelTr: "İngilizce", nativeLabel: "English" },
  { code: "de", labelTr: "Almanca", nativeLabel: "Deutsch" },
  { code: "fr", labelTr: "Fransızca", nativeLabel: "Français" },
  { code: "es", labelTr: "İspanyolca", nativeLabel: "Español" },
  { code: "it", labelTr: "İtalyanca", nativeLabel: "Italiano" },
  { code: "nl", labelTr: "Felemenkçe", nativeLabel: "Nederlands" },
  { code: "pt", labelTr: "Portekizce", nativeLabel: "Português" },
  { code: "ru", labelTr: "Rusça", nativeLabel: "Русский" },
  { code: "ar", labelTr: "Arapça", nativeLabel: "العربية" },
  { code: "zh-CN", labelTr: "Çince (Basit)", nativeLabel: "中文" },
  { code: "ja", labelTr: "Japonca", nativeLabel: "日本語" },
  { code: "ko", labelTr: "Korece", nativeLabel: "한국어" },
  { code: "pl", labelTr: "Lehçe", nativeLabel: "Polski" },
  { code: "uk", labelTr: "Ukraynaca", nativeLabel: "Українська" },
  { code: "fa", labelTr: "Farsça", nativeLabel: "فارسی" },
  { code: "az", labelTr: "Azerbaycanca", nativeLabel: "Azərbaycan" },
  { code: "bg", labelTr: "Bulgarca", nativeLabel: "Български" },
  { code: "el", labelTr: "Yunanca", nativeLabel: "Ελληνικά" },
  { code: "ro", labelTr: "Romence", nativeLabel: "Română" },
];

const LANGUAGE_BY_CODE = new Map(SITE_TRANSLATE_LANGUAGES.map((l) => [l.code, l]));

/** ISO 3166-1 alpha-2 → birincil Google Translate dili. */
const COUNTRY_PRIMARY_LANGUAGE: Record<string, SiteTranslateLangCode> = {
  TR: "tr",
  AZ: "az",
  US: "en",
  GB: "en",
  IE: "en",
  AU: "en",
  NZ: "en",
  CA: "en",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  BE: "fr",
  LU: "fr",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  IT: "it",
  NL: "nl",
  PT: "pt",
  BR: "pt",
  RU: "ru",
  BY: "ru",
  KZ: "ru",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  QA: "ar",
  KW: "ar",
  CN: "zh-CN",
  TW: "zh-TW",
  HK: "zh-CN",
  JP: "ja",
  KR: "ko",
  PL: "pl",
  UA: "uk",
  IR: "fa",
  BG: "bg",
  GR: "el",
  RO: "ro",
  SE: "en",
  NO: "en",
  DK: "en",
  FI: "en",
  IN: "en",
  PK: "en",
  SG: "en",
  MY: "en",
  PH: "en",
  ID: "en",
  TH: "en",
  VN: "en",
  IL: "en",
  CY: "el",
};

export function normalizeTranslateLangCode(raw: unknown): SiteTranslateLangCode | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (LANGUAGE_BY_CODE.has(s)) return s;
  const base = s.split(/[-_]/)[0]?.toLowerCase();
  if (!base) return null;
  if (base === "zh") return s.includes("TW") || s.includes("tw") ? "zh-TW" : "zh-CN";
  const match = SITE_TRANSLATE_LANGUAGES.find((l) => l.code.toLowerCase() === base || l.code.toLowerCase().startsWith(`${base}-`));
  return match?.code ?? (base.length === 2 ? base : null);
}

export function languageFromCountryCode(countryCode: string | null | undefined): SiteTranslateLangCode | null {
  const cc = String(countryCode ?? "").trim().toUpperCase();
  if (!cc || cc === "XX") return null;
  const mapped = COUNTRY_PRIMARY_LANGUAGE[cc];
  return mapped ? normalizeTranslateLangCode(mapped) : null;
}

export function languageFromBrowserLocale(): SiteTranslateLangCode | null {
  if (typeof navigator === "undefined") return null;
  const langs = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  for (const lang of langs) {
    const code = normalizeTranslateLangCode(lang);
    if (code) return code;
  }
  return null;
}

export function siteTranslateLanguageMeta(code: SiteTranslateLangCode | null | undefined): SiteTranslateLanguage | null {
  if (!code) return null;
  return LANGUAGE_BY_CODE.get(code) ?? null;
}

export function googleTranslateIncludedLanguages(): string {
  return SITE_TRANSLATE_LANGUAGES.map((l) => l.code).join(",");
}
