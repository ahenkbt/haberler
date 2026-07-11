import type { DailyTrendCategory } from "@/hooks/useHomeDailyTrends";

export const BILGI_AGACI_TAB_ID = "bilgi-agaci";
export const TRENDLER_TAB_ID = "trendler";
export const HABER_KATEGORILERI_TAB_ID = "haber-kategorileri";
export const SON_EKLENEN_HABERLER_TAB_ID = "son-eklenen-haberler";
export const HIBRIT_RSS_TAB_ID = "hibrit-rss";
/** @deprecated Eski Haberler sekmesi — hibrit-rss ile değiştirildi */
export const LEGACY_HABERLER_TAB_ID = "haberler";

export const SPECIAL_HOME_TREND_TAB_IDS = new Set([
  BILGI_AGACI_TAB_ID,
  HABER_KATEGORILERI_TAB_ID,
  SON_EKLENEN_HABERLER_TAB_ID,
  HIBRIT_RSS_TAB_ID,
  LEGACY_HABERLER_TAB_ID,
]);

export const FALLBACK_HOME_TREND_TABS: Array<{ id: string; label: string }> = [
  { id: TRENDLER_TAB_ID, label: "Trendler" },
  { id: "siyaset", label: "Siyaset" },
  { id: "spor", label: "Spor" },
  { id: "eglence", label: "Eğlence" },
  { id: "ekonomi", label: "Ekonomi" },
  { id: "toplum", label: "Toplum" },
  { id: "aktuel", label: "Aktüel" },
  { id: "teknoloji", label: "Teknoloji" },
];

export type HomeTrendTab = { id: string; label: string };

export function isNewsLinkTab(tabId: string): boolean {
  return (
    tabId === HABER_KATEGORILERI_TAB_ID ||
    tabId === SON_EKLENEN_HABERLER_TAB_ID ||
    tabId === HIBRIT_RSS_TAB_ID ||
    tabId === LEGACY_HABERLER_TAB_ID
  );
}

export function isBilgiAgaciTab(tabId: string): boolean {
  return tabId === BILGI_AGACI_TAB_ID;
}

export function resolveHomeTrendTabs(
  categories: DailyTrendCategory[] | undefined,
  opts?: { includeSpecialTabs?: boolean },
): HomeTrendTab[] {
  const includeSpecial = opts?.includeSpecialTabs ?? false;
  const source = categories?.length
    ? categories
    : FALLBACK_HOME_TREND_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        headlines: [],
      }));

  const trendCats = source.filter(
    (cat) => !SPECIAL_HOME_TREND_TAB_IDS.has(cat.id),
  );

  const trendler =
    trendCats.find((cat) => cat.id === TRENDLER_TAB_ID) ?? {
      id: TRENDLER_TAB_ID,
      label: "Trendler",
      headlines: [],
    };
  const restTrends = trendCats
    .filter((cat) => cat.id !== TRENDLER_TAB_ID)
    .map((cat) => ({ id: cat.id, label: cat.label }));

  if (!includeSpecial) {
    return [{ id: trendler.id, label: trendler.label }, ...restTrends];
  }

  return [
    { id: BILGI_AGACI_TAB_ID, label: "Bilgi Ağacı" },
    { id: trendler.id, label: trendler.label },
    { id: HABER_KATEGORILERI_TAB_ID, label: "Haber kategorileri" },
    { id: SON_EKLENEN_HABERLER_TAB_ID, label: "Son eklenen haberler" },
    ...restTrends,
    { id: HIBRIT_RSS_TAB_ID, label: "Hibrit RSS" },
  ];
}

export function resolveHomeTrendHeadlines(
  categories: DailyTrendCategory[] | undefined,
  tabId: string,
): string[] {
  if (SPECIAL_HOME_TREND_TAB_IDS.has(tabId)) return [];
  const cats = categories ?? [];
  const active = cats.find((cat) => cat.id === tabId) ?? cats[0] ?? null;
  return active?.headlines?.map((h) => h.text).filter(Boolean) ?? [];
}
