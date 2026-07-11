import { isInsideTurkeyDefaultBounds } from "@/lib/haberHaritasiDefaultViewport";
import { isTurkishProvinceName } from "@/lib/haberHaritasiLocations";
import { normalizeHmMapCityKey, type HmMapCityHeadline } from "@/lib/hmMapCityNews";
import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG } from "@/lib/hmGlobalNewsCategory";

export type NewsmapBottomBandTab = "turkce" | "global";

export type DetectedHeadlineLanguage = "tr" | "en" | "nl" | "fr" | "de" | "other";

/** KKTC (Kuzey Kıbrıs) — yaklaşık sınırlar. */
export const KKTC_MAP_BOUNDS = {
  south: 34.9,
  north: 35.75,
  west: 32.4,
  east: 34.6,
} as const;

export function isInsideKktcBounds(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= KKTC_MAP_BOUNDS.south &&
    lat <= KKTC_MAP_BOUNDS.north &&
    lng >= KKTC_MAP_BOUNDS.west &&
    lng <= KKTC_MAP_BOUNDS.east
  );
}

/** Türkiye + KKTC — alt bant varsayılan sekmesi Türkçe. */
export function isNewsmapTurkeyOrKktcViewport(lat: number, lng: number): boolean {
  return isInsideTurkeyDefaultBounds(lat, lng) || isInsideKktcBounds(lat, lng);
}

export function defaultNewsmapBottomBandTab(
  center: { lat: number; lng: number },
  countryCode?: string | null,
): NewsmapBottomBandTab {
  const code = String(countryCode ?? "").trim().toUpperCase();
  if (code === "TR" || code === "CY") return "turkce";
  if (isNewsmapTurkeyOrKktcViewport(center.lat, center.lng)) return "turkce";
  return "global";
}

const TURKISH_CHAR_RE = /[çğıöşüÇĞİÖŞÜ]/;
const TURKISH_WORD_RE =
  /\b(ve|bir|için|ile|olan|olarak|de|da|den|dan|gibi|daha|son|haber|sondakika|türkiye|turkiye|kktc|kıbrıs|kibris)\b/i;
const ENGLISH_WORD_RE =
  /\b(the|and|for|with|from|news|breaking|live|report|says|world|global|update|today|latest)\b/i;
const FRENCH_CHAR_RE = /[àâäæçéèêëïîôùûüÿœ]/i;
const FRENCH_WORD_RE =
  /\b(le|la|les|des|une|un|et|pour|avec|dans|sur|est|sont|aux|du|de|en|que|qui|cette|ces|nouvelle|france|monde|aujourd)\b/i;

const TURKISH_FEED_HINTS =
  /türk|turk|\btr\b|milliyet|sabah|hurriyet|ntv|cnn türk|yeni şafak|sozcu|t24|diken|bianet|aa\.com|anadolu|cumha/i;
const GLOBAL_FEED_HINTS =
  /english|bbc|cnn|reuters|ap news|guardian|nytimes|global|international|world news|dw\.com|france24|al jazeera|dünya|dunya/i;

export function isLikelyTurkishText(text: string): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (FRENCH_CHAR_RE.test(raw) && FRENCH_WORD_RE.test(raw) && !TURKISH_CHAR_RE.test(raw)) return false;
  if (TURKISH_CHAR_RE.test(raw)) return true;
  if (ENGLISH_WORD_RE.test(raw) && !TURKISH_WORD_RE.test(raw)) return false;
  return TURKISH_WORD_RE.test(raw);
}

export function isLikelyFrenchText(text: string): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (TURKISH_CHAR_RE.test(raw)) return false;
  if (FRENCH_CHAR_RE.test(raw)) return true;
  return FRENCH_WORD_RE.test(raw);
}

export function isLikelyEnglishText(text: string): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (TURKISH_CHAR_RE.test(raw)) return false;
  if (isLikelyFrenchText(raw)) return false;
  const asciiLetters = raw.replace(/[^a-zA-Z\s]/g, "");
  if (!asciiLetters.trim()) return false;
  return ENGLISH_WORD_RE.test(raw) || /^[A-Za-z0-9\s'":;,.!?()-]+$/.test(raw.slice(0, 120));
}

/** Başlık dili — alt bant Türkçe/Global ayrımı için. */
export function detectLanguage(text: string): DetectedHeadlineLanguage {
  const raw = String(text ?? "").trim();
  if (!raw) return "other";
  if (isLikelyTurkishText(raw)) return "tr";
  if (isLikelyFrenchText(raw)) return "fr";
  if (isLikelyEnglishText(raw)) return "en";
  return "other";
}

function isGlobalMapNewsHeadline(headline: HmMapCityHeadline): boolean {
  const code = String(headline.countryCode ?? "").trim().toUpperCase();
  if (code && code !== "TR" && code !== "CY") return true;
  const feed = String(headline.feedLabel ?? "");
  if (GLOBAL_FEED_HINTS.test(feed)) return true;
  if (headline.source === "rss" && code && code !== "TR" && code !== "CY") return true;
  return false;
}

function isTrCyGeoHeadline(headline: HmMapCityHeadline): boolean {
  const countryCode = String(headline.countryCode ?? "").trim().toUpperCase();
  if (countryCode === "TR" || countryCode === "CY") return true;
  return isTurkishProvinceName(headline.city);
}

function isTurkishFeedHeadline(headline: HmMapCityHeadline): boolean {
  const feed = String(headline.feedLabel ?? "");
  if (/cumha\s+d[uü]nya/i.test(feed)) return false;
  if (TURKISH_FEED_HINTS.test(feed)) return true;
  if (GLOBAL_FEED_HINTS.test(feed)) return false;
  return false;
}

/** Türkçe sekme: yalnızca Türkçe metin + (TR/KKTC coğrafya veya Türkçe kaynak). */
export function isStrictTurkishBottomBandHeadline(headline: HmMapCityHeadline): boolean {
  const title = String(headline.title ?? "").trim();
  if (detectLanguage(title) !== "tr") return false;
  return isTrCyGeoHeadline(headline) || isTurkishFeedHeadline(headline);
}

function isGlobalEligibleBottomBandHeadline(headline: HmMapCityHeadline): boolean {
  if (isStrictTurkishBottomBandHeadline(headline)) return false;
  const title = String(headline.title ?? "").trim();
  const lang = detectLanguage(title);
  const feedLabel = String(headline.feedLabel ?? "").trim();
  const countryCode = String(headline.countryCode ?? "").trim().toUpperCase();
  const foreignGeo = Boolean(countryCode) && countryCode !== "TR" && countryCode !== "CY";
  const globalFeed = GLOBAL_FEED_HINTS.test(feedLabel) || isGlobalMapNewsHeadline(headline);

  if (globalFeed) return true;
  if (lang === "en" || lang === "fr") return true;
  if (foreignGeo) return true;
  if (!isTrCyGeoHeadline(headline)) return true;
  return lang !== "tr";
}

/** Alt bant sekmesi — `global` kategori yalnızca Global sekmesinde. */
export function classifyNewsmapBottomBandHeadline(headline: HmMapCityHeadline): NewsmapBottomBandTab {
  const categorySlug = normalizeNewsCategorySlug(headline.categorySlug);
  if (categorySlug === HM_GLOBAL_NEWS_CATEGORY_SLUG) return "global";
  if (isStrictTurkishBottomBandHeadline(headline)) return "turkce";
  if (categorySlug && categorySlug !== HM_GLOBAL_NEWS_CATEGORY_SLUG) return "turkce";
  return "global";
}

function headlineSortTs(headline: HmMapCityHeadline): number {
  return Date.parse(headline.publishedAt ?? "") || 0;
}

/** Global sekme — İngilizce içerik öncelikli; uluslararası RSS varken boş kalmaz. */
export function filterNewsmapBottomBandHeadlines(
  headlines: HmMapCityHeadline[],
  tab: NewsmapBottomBandTab,
  limit = 48,
): HmMapCityHeadline[] {
  let matched =
    tab === "turkce"
      ? headlines.filter((row) => isStrictTurkishBottomBandHeadline(row))
      : headlines.filter((row) => classifyNewsmapBottomBandHeadline(row) === tab);

  if (tab === "global" && matched.length === 0) {
    matched = headlines.filter(isGlobalEligibleBottomBandHeadline);
  }

  /** Türkiye geneli — geo/feed etiketi eksik Türkçe başlıklar (Cumha/NTV vb.) boş bırakmasın. */
  if (tab === "turkce" && matched.length === 0) {
    matched = headlines.filter((row) => {
      const title = String(row.title ?? "").trim();
      if (detectLanguage(title) !== "tr") return false;
      const code = String(row.countryCode ?? "").trim().toUpperCase();
      if (code && code !== "TR" && code !== "CY") return false;
      if (isGlobalMapNewsHeadline(row)) return false;
      return true;
    });
  }

  if (tab === "global") {
    matched.sort((a, b) => {
      const aEn = isLikelyEnglishText(a.title) ? 1 : 0;
      const bEn = isLikelyEnglishText(b.title) ? 1 : 0;
      if (aEn !== bEn) return bEn - aEn;
      return headlineSortTs(b) - headlineSortTs(a);
    });
  } else {
    matched.sort((a, b) => headlineSortTs(b) - headlineSortTs(a));
  }

  if (matched.length > 0) return matched.slice(0, limit);
  return [];
}

/** Konum seçiliyken — Türkçe/Global sekmesi yok; yalnızca Haberler/Videolar süzgeci. */
export function resolveNewsmapLocationBottomBandHeadlines(
  pool: HmMapCityHeadline[],
  kindFilter: "all" | "news" | "video" = "all",
  limit = 48,
): HmMapCityHeadline[] {
  let rows = pool;
  if (kindFilter === "news") rows = rows.filter((row) => row.kind === "news");
  if (kindFilter === "video") rows = rows.filter((row) => row.kind === "video");
  return rows.slice(0, limit);
}

export function resolveNewsmapBottomBandHeadlines(
  pool: HmMapCityHeadline[],
  tab: NewsmapBottomBandTab,
  opts?: { kindFilter?: "all" | "news" | "video"; limit?: number },
): HmMapCityHeadline[] {
  const limit = opts?.limit ?? 48;
  let rows = pool;
  if (opts?.kindFilter === "news") rows = rows.filter((row) => row.kind === "news");
  if (opts?.kindFilter === "video") rows = rows.filter((row) => row.kind === "video");
  const filtered = filterNewsmapBottomBandHeadlines(rows, tab, limit);
  if (filtered.length > 0) return filtered;
  if (tab === "global") {
    /* Videolar dil bağımsız — global sekmede video filtresi boş bırakmasın. */
    if (opts?.kindFilter === "video" && rows.length > 0) return rows.slice(0, limit);
    return [];
  }
  if (opts?.kindFilter === "video" || opts?.kindFilter === "news") {
    return rows.slice(0, limit);
  }
  if (rows.length > 0) return rows.slice(0, limit);
  if (pool.length > 0) return pool.slice(0, limit);
  return [];
}

/**
 * Global sekme havuzu — konum eşleşmesi olmayan yabancı dildeki haberler de
 * banda girsin (CNN/Euronews vb. çoğu başlık şehir adı içermez ve geo-match
 * edilemez; bu yüzden Global sekme boş kalıp Türkçe'ye düşüyordu).
 */
export function buildNewsmapGlobalPoolHeadlines(
  pool: HomeHybridNewsItem[],
  limit = 96,
): HmMapCityHeadline[] {
  const rows: HmMapCityHeadline[] = [];
  const seen = new Set<string>();
  for (const item of pool) {
    if (rows.length >= limit) break;
    const title = String(item.title ?? "").trim();
    const href = String(item.href ?? "").trim();
    if (!title || !href || seen.has(href)) continue;

    const categorySlug = normalizeNewsCategorySlug(item.categorySlug);
    if (categorySlug && categorySlug !== HM_GLOBAL_NEWS_CATEGORY_SLUG) continue;
    if (!categorySlug) {
      const lang = detectLanguage(title);
      if (lang === "tr") continue;
      const feedLabel = String(item.feedLabel ?? "");
      const countryCode = String(item.countryCode ?? "").trim().toUpperCase();
      const foreignGeo = Boolean(countryCode) && countryCode !== "TR" && countryCode !== "CY";
      const globalFeed = GLOBAL_FEED_HINTS.test(feedLabel);
      if (!(lang === "en" || lang === "fr" || globalFeed || foreignGeo)) continue;
    }

    seen.add(href);
    rows.push({
      city: String(item.regionLabel ?? "").trim() || "Dünya",
      title,
      href,
      publishedAt: item.publishedAt ?? null,
      kind: "news",
      thumbnail: item.imageUrl ?? null,
      source: item.source,
      feedLabel: item.feedLabel ?? null,
      rssSourceUrl: item.rssSourceUrl ?? null,
      originUrl: item.originUrl ?? null,
      countryCode: String(item.countryCode ?? "").trim().toUpperCase() || undefined,
      geoLat: item.geoLat ?? undefined,
      geoLng: item.geoLng ?? undefined,
      spot: item.spot ?? null,
      content: item.content ?? null,
      categorySlug: categorySlug || HM_GLOBAL_NEWS_CATEGORY_SLUG,
    });
  }
  return rows;
}

export function mergeNewsmapBottomBandHeadlines(
  ...groups: HmMapCityHeadline[][]
): HmMapCityHeadline[] {
  const merged = new Map<string, HmMapCityHeadline>();
  for (const group of groups) {
    for (const row of group) {
      merged.set(`${row.kind}:${row.href}:${normalizeHmMapCityKey(row.city)}`, row);
    }
  }
  return [...merged.values()].sort((a, b) => headlineSortTs(b) - headlineSortTs(a));
}
