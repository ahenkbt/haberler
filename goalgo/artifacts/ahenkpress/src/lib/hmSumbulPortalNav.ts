import { normalizeHmVitrinTheme, type NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";

/** yekpare.net/haberler kategori şeridi — Sümbül teması editör sitelerinde aynı sıra. */
export const SUMBUL_PORTAL_CATEGORY_NAV = [
  { slug: "gundem", label: "Gündem" },
  { slug: "ekonomi", label: "Ekonomi" },
  { slug: "spor", label: "Spor" },
  { slug: "dunya", label: "Dünya" },
  { slug: "teknoloji", label: "Teknoloji" },
  { slug: "kultur", label: "Kültür" },
] as const;

export function isSumbulVitrinTheme(
  prefs: NewsSiteLayoutPrefs | null | undefined,
): boolean {
  return normalizeHmVitrinTheme(prefs?.hmVitrinTheme) === "sumbul";
}

export function resolveSumbulFinanceTickerEnabled(
  prefs: NewsSiteLayoutPrefs | null | undefined,
): boolean {
  if (!isSumbulVitrinTheme(prefs)) return false;
  return prefs?.tickerFinance !== false || prefs?.tickerWeather !== false;
}
