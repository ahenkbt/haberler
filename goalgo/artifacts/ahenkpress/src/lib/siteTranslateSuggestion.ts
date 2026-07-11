import { resolveVisitorCountryCode } from "@/lib/haberHaritasiVisitorCountry";
import {
  languageFromBrowserLocale,
  languageFromCountryCode,
  SITE_PAGE_LANGUAGE,
  siteTranslateLanguageMeta,
  type SiteTranslateLangCode,
} from "@/lib/siteTranslateLocales";

export const SITE_TRANSLATE_DISMISS_KEY = "yekpare_site_translate_dismiss_v1";

export type SiteTranslateSuggestion = {
  targetLang: SiteTranslateLangCode;
  labelTr: string;
  nativeLabel: string;
  source: "country" | "browser_locale" | "country+browser";
  countryCode: string;
  countrySource: string;
};

export function shouldSkipSiteTranslate(pathNoQuery: string): boolean {
  const p = pathNoQuery.trim().toLowerCase();
  if (!p || p === "/") return false;
  const skipPrefixes = ["/admin", "/editor", "/panel", "/giris", "/login", "/api"];
  return skipPrefixes.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

export function readTranslateSuggestionDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SITE_TRANSLATE_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissTranslateSuggestion(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SITE_TRANSLATE_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

function pickSuggestedLanguage(
  countryLang: SiteTranslateLangCode | null,
  browserLang: SiteTranslateLangCode | null,
): { lang: SiteTranslateLangCode | null; source: SiteTranslateSuggestion["source"] | null } {
  const countryOk = countryLang && countryLang !== SITE_PAGE_LANGUAGE ? countryLang : null;
  const browserOk = browserLang && browserLang !== SITE_PAGE_LANGUAGE ? browserLang : null;

  if (countryOk && browserOk && countryOk === browserOk) {
    return { lang: countryOk, source: "country+browser" };
  }
  if (countryOk) return { lang: countryOk, source: "country" };
  if (browserOk) return { lang: browserOk, source: "browser_locale" };
  return { lang: null, source: null };
}

/** Konum (geo-IP) + tarayıcı locale ile çeviri önerisi. */
export async function resolveSiteTranslateSuggestion(): Promise<SiteTranslateSuggestion | null> {
  const { countryCode, source: countrySource } = await resolveVisitorCountryCode();
  const countryLang = languageFromCountryCode(countryCode);
  const browserLang = languageFromBrowserLocale();
  const picked = pickSuggestedLanguage(countryLang, browserLang);
  if (!picked.lang) return null;

  const meta = siteTranslateLanguageMeta(picked.lang);
  if (!meta) return null;

  return {
    targetLang: picked.lang,
    labelTr: meta.labelTr,
    nativeLabel: meta.nativeLabel,
    source: picked.source ?? "country",
    countryCode,
    countrySource,
  };
}
