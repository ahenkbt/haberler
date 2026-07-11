import { fetchHybridNewsList, type HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import {
  dedupeHeadlinesByStory,
  findLocationForHybridNewsItem,
  normalizeHmMapCityKey,
} from "@/lib/hmMapCityNews";
import {
  allHaberHaritasiMatchLocations,
  isTurkishProvinceName,
  type HaberHaritasiLocation,
} from "@/lib/haberHaritasiLocations";
import {
  buildLocationGoogleNewsQuery,
  isLocationNewsFalsePositive,
  isNewsItemRelevantToLocation,
  resolveNewsmapLocationContext,
  textContainsLocationTerm,
  type NewsmapLocationContext,
} from "@/lib/haberHaritasiLocationContext";
import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import type { HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import { isNewsmapFreshPublishedAt } from "@/lib/haberHaritasiVideos";

const LOCATION_NEWS_TIMEOUT_MS = 10_000;
/** Konum paneli — DB + RSS il havuzunu q ile tarar; ile eşleşen tüm başlıkları çeker. */
const LOCATION_NEWS_FETCH_LIMIT = 80;
/** Google News yedek eşiği — bu kadar konum-uyumlu haber yoksa yedek devreye girer. */
const LOCATION_NEWS_GOOGLE_FALLBACK_MIN = 2;

function sortHybridNewsByPublishedDesc(items: HomeHybridNewsItem[]): HomeHybridNewsItem[] {
  return [...items].sort(
    (a, b) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0),
  );
}

function sortHybridNewsByPublishedAsc(items: HomeHybridNewsItem[]): HomeHybridNewsItem[] {
  return [...items].sort(
    (a, b) => (Date.parse(a.publishedAt ?? "") || 0) - (Date.parse(b.publishedAt ?? "") || 0),
  );
}

function sortHeadlinesByPublishedDesc(headlines: HmMapCityHeadline[]): HmMapCityHeadline[] {
  return [...headlines].sort(
    (a, b) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0),
  );
}

export function resolveTargetNewsmapLocation(
  cityName: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
): { cityKey: string; targetLoc: HaberHaritasiLocation | null; locations: HaberHaritasiLocation[] } {
  const cityKey = normalizeHmMapCityKey(cityName);
  const locations = allHaberHaritasiMatchLocations(ilCenters);
  const targetLoc =
    locations.find((loc) => loc.key === cityKey || normalizeHmMapCityKey(loc.label) === cityKey) ??
    null;
  return { cityKey, targetLoc, locations };
}

/** RSS feed geo etiketi (Cumha il, bölgesel feed) — başlıkta şehir adı olmasa da eşleşir. */
export function isRssItemTaggedForNewsmapLocation(
  item: HomeHybridNewsItem,
  cityName: string,
  targetLoc: HaberHaritasiLocation | null,
  locations: HaberHaritasiLocation[],
): boolean {
  if (item.source !== "rss") return false;
  const cityKey = normalizeHmMapCityKey(cityName);
  const regionLabel = normalizeHmMapCityKey(String(item.regionLabel ?? ""));
  const regionKey = String(item.regionKey ?? "").trim().toLowerCase();
  const feedLabel = normalizeHmMapCityKey(String(item.feedLabel ?? ""));

  if (targetLoc) {
    const expectedRegionKey = `tr-${targetLoc.key}`;
    if (regionKey && (regionKey === expectedRegionKey || regionKey.endsWith(`-${targetLoc.key}`))) {
      return true;
    }
    const targetLabelKey = normalizeHmMapCityKey(targetLoc.label);
    if (regionLabel && regionLabel === targetLabelKey) return true;
    if (feedLabel.includes(targetLabelKey)) return true;
  }

  if (regionLabel && (regionLabel === cityKey || regionLabel.includes(cityKey))) return true;
  if (feedLabel.includes(cityKey)) return true;

  const loc = findLocationForHybridNewsItem(item, locations);
  if (loc && targetLoc && loc.key === targetLoc.key) {
    return Boolean(item.regionKey || item.regionLabel || item.feedLabel);
  }
  return false;
}

export function filterNewsmapNewsForCity(
  items: HomeHybridNewsItem[],
  cityName: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  countryHint?: string | null,
): HomeHybridNewsItem[] {
  const ctx = resolveNewsmapLocationContext(cityName, countryHint);
  const { cityKey, targetLoc, locations } = resolveTargetNewsmapLocation(cityName, ilCenters);

  const cityKeyIsShort = cityKey.length <= 4;
  const matched = items.filter((item) => {
    if (isLocationNewsFalsePositive(item.title, String(item.spot ?? ""), ctx)) return false;
    if (isRssItemTaggedForNewsmapLocation(item, cityName, targetLoc, locations)) return true;

    const title = normalizeHmMapCityKey(item.title);
    const spot = normalizeHmMapCityKey(String(item.spot ?? ""));

    if (ctx.isForeign) {
      return isNewsItemRelevantToLocation(item.title, String(item.spot ?? ""), ctx);
    }

    if (!cityKeyIsShort && (textContainsLocationTerm(item.title, cityName) || textContainsLocationTerm(String(item.spot ?? ""), cityName))) {
      return true;
    }
    const loc = findLocationForHybridNewsItem(item, locations);
    if (loc) {
      if (targetLoc) return loc.key === targetLoc.key;
      return normalizeHmMapCityKey(loc.label) === cityKey;
    }
    return textContainsLocationTerm(item.title, cityName) || textContainsLocationTerm(String(item.spot ?? ""), cityName);
  });

  // Yabancı konum: eşleşme yoksa TÜM havuzu gösterme — boş bırak, Google News yedeği devreye girer.
  if (ctx.isForeign && matched.length === 0) return [];
  // Eski davranış yalnızca bilinmeyen TR içi aramalar için (geo çözülemedi).
  if (!ctx.isForeign && !targetLoc && matched.length === 0 && items.length > 0) {
    return items.filter((item) => !isLocationNewsFalsePositive(item.title, String(item.spot ?? ""), ctx));
  }
  return matched;
}

/** Konum haberleri — eşleşen tüm DB/RSS öğeleri; güncel olanlar önce (24s ayrımı yalnızca sıralama). */
export function resolveNewsmapLocationNewsItems(
  items: HomeHybridNewsItem[],
  cityName: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  countryHint?: string | null,
): HomeHybridNewsItem[] {
  const matched = filterNewsmapNewsForCity(items, cityName, ilCenters, countryHint);
  if (matched.length === 0) return [];

  const fresh = matched.filter((item) => isNewsmapFreshPublishedAt(item.publishedAt));
  const older = matched.filter((item) => !isNewsmapFreshPublishedAt(item.publishedAt));
  return sortHybridNewsByPublishedDesc([...fresh, ...sortHybridNewsByPublishedDesc(older)]);
}

/** Mevcut headline havuzunda aynı 24s → RSS yedek mantığı (sidebar / alt bant yedek). */
export function resolveNewsmapLocationHeadlinesFallback(
  headlines: HmMapCityHeadline[],
  cityName: string,
  limit = 48,
  countryHint?: string | null,
): HmMapCityHeadline[] {
  const ctx = resolveNewsmapLocationContext(cityName, countryHint);
  const cityKey = normalizeHmMapCityKey(cityName);
  const matched = headlines.filter((row) => {
    if (row.kind !== "news") return false;
    if (isLocationNewsFalsePositive(row.title, String(row.spot ?? ""), ctx)) return false;
    const rowCity = normalizeHmMapCityKey(row.city);
    if (ctx.isForeign) {
      return isNewsItemRelevantToLocation(row.title, String(row.spot ?? ""), ctx);
    }
    return (
      rowCity === cityKey ||
      textContainsLocationTerm(row.title, cityName) ||
      rowCity.includes(cityKey)
    );
  });

  const fresh = matched.filter((row) => isNewsmapFreshPublishedAt(row.publishedAt));
  const older = matched.filter((row) => !isNewsmapFreshPublishedAt(row.publishedAt));
  return sortHeadlinesByPublishedDesc([...fresh, ...sortHeadlinesByPublishedDesc(older)]).slice(0, limit);
}

type LocationGoogleNewsApiRow = {
  id?: string;
  title?: string;
  spot?: string | null;
  href?: string;
  publishedAt?: string | null;
  imageUrl?: string | null;
  externalUrl?: string;
};

function googleNewsRowToHybridItem(row: LocationGoogleNewsApiRow, ctx: NewsmapLocationContext): HomeHybridNewsItem {
  const title = String(row.title ?? "").trim();
  const href = String(row.href ?? row.externalUrl ?? "").trim() || "#";
  return {
    id: String(row.id ?? href),
    title,
    href,
    spot: row.spot ?? null,
    imageUrl: row.imageUrl ?? null,
    publishedAt: row.publishedAt ?? null,
    source: "rss",
    categorySlug: "dunya",
    rssSourceUrl: href,
    countryCode: ctx.globalLoc?.countryCode ?? null,
    regionKey: ctx.globalLoc?.key ? `global-${ctx.globalLoc.key}` : null,
    regionLabel: ctx.cityLabel,
    feedLabel: "Google News",
  };
}

/** Google News RSS yedek — konum odaklı sorgu (sunucu tarafı). */
export async function fetchNewsmapLocationGoogleNews(
  cityName: string,
  countryHint?: string | null,
  signal?: AbortSignal,
): Promise<HomeHybridNewsItem[]> {
  const ctx = resolveNewsmapLocationContext(cityName, countryHint);
  const q = buildLocationGoogleNewsQuery(ctx);
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    city: ctx.cityLabel,
    limit: "24",
  });
  if (ctx.countryLabel) params.set("country", ctx.countryLabel);

  try {
    const { ok, data } = await fetchPublicJson<{ items?: LocationGoogleNewsApiRow[] }>(
      apiUrl(`/api/map/newsmap/location-google-news?${params}`),
      { signal, timeoutMs: LOCATION_NEWS_TIMEOUT_MS, retries: 1 },
    );
    if (!ok || !Array.isArray(data?.items)) return [];
    return data.items
      .map((row) => googleNewsRowToHybridItem(row, ctx))
      .filter((item) => isNewsItemRelevantToLocation(item.title, String(item.spot ?? ""), ctx));
  } catch {
    return [];
  }
}

/**
 * Bölge seçildiğinde — q araması + RSS il havuzu.
 *
 * ÖNEMLİ: `dbFirst` KULLANILMAZ. İl haberlerinin çoğu DB'de değil `portal_rss_items` içindedir
 * (Cumha il/bölge beslemeleri). `dbFirst: true` yalnız DB'yi tarayıp çoğu il için 0 sonuç döndürür
 * (örn. Çanakkale: dbFirst=0, RSS dâhil=9). RSS'i de dâhil ederek ile eşleşen tüm başlıkları çekeriz.
 */
export async function fetchNewsmapLocationNews(
  cityName: string,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  signal?: AbortSignal,
  countryHint?: string | null,
): Promise<HomeHybridNewsItem[]> {
  const label = String(cityName ?? "").trim();
  if (!label) return [];

  const ctx = resolveNewsmapLocationContext(label, countryHint);

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), LOCATION_NEWS_TIMEOUT_MS);
  const mergedSignal = signal
    ? (() => {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        signal.addEventListener("abort", onAbort, { once: true });
        timeoutController.signal.addEventListener("abort", onAbort, { once: true });
        return controller.signal;
      })()
    : timeoutController.signal;

  try {
    const fetchOpts = {
      siteId: null as null,
      rssScope: "all" as const,
      global: true,
      signal: mergedSignal,
      retries: 0,
      timeoutMs: LOCATION_NEWS_TIMEOUT_MS,
    };

    // TR ili: q= ile hibrit havuz tara. Yabancı konum: geniş q= yanlış pozitif üretir — atla.
    let poolItems: HomeHybridNewsItem[] = [];
    if (ctx.isTrProvince) {
      poolItems = await fetchHybridNewsList({
        ...fetchOpts,
        q: label,
        limit: LOCATION_NEWS_FETCH_LIMIT,
        offset: 0,
      });
    }

    let matched = resolveNewsmapLocationNewsItems(poolItems, label, ilCenters, countryHint);

    if (matched.length < LOCATION_NEWS_GOOGLE_FALLBACK_MIN) {
      const googleItems = await fetchNewsmapLocationGoogleNews(label, countryHint, mergedSignal);
      if (googleItems.length > 0) {
        const seen = new Set(matched.map((item) => normalizeHmMapCityKey(item.title)));
        for (const item of googleItems) {
          const key = normalizeHmMapCityKey(item.title);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          matched.push(item);
        }
        matched = sortHybridNewsByPublishedDesc(matched);
      }
    }

    return matched;
  } catch {
    try {
      return await fetchNewsmapLocationGoogleNews(label, countryHint, signal);
    } catch {
      return [];
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Konum paneli "Haberler" listesi — eşleşen TÜM DB/RSS öğeleri başlık kartına çevrilir.
 *
 * ÖNEMLİ: Eskiden `buildHmMapCityHeadlines` kullanılıyordu; o fonksiyon her öğenin konumunu
 * yeniden çözümleyip çözemediklerini DÜŞÜRÜYOR (foreign/kısa il/başka ile çözülen başlıklar),
 * ayrıca konum başına tek kayıta indirgeyerek panelde "1 haber" görünmesine yol açıyordu.
 * Burada eşleşen öğeleri doğrudan hedef konuma etiketleyip yalnızca aynı haberi (URL/başlık)
 * tekilleştiriyoruz — böylece il için onlarca haber listelenir.
 */
export function buildNewsmapLocationNewsHeadlines(
  cityName: string,
  items: HomeHybridNewsItem[],
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  _linkMode: HaberHaritasiLinkMode = "yekpare",
  _hmPublicHref: (path: string) => string = (p) => p,
  limit = 48,
  opts?: { queryLabel?: string; displayLabel?: string; countryHint?: string | null },
): HmMapCityHeadline[] {
  const display = String(opts?.displayLabel ?? cityName ?? "").trim();
  const query = String(opts?.queryLabel ?? cityName ?? "").trim();
  if (!query) return [];
  const { targetLoc } = resolveTargetNewsmapLocation(query, ilCenters);
  const cityLabel = display || targetLoc?.label || query;
  const resolved = resolveNewsmapLocationNewsItems(items, query, ilCenters, opts?.countryHint);
  const rows: HmMapCityHeadline[] = resolved.map((item) => ({
    city: cityLabel,
    title: item.title,
    href: item.href,
    publishedAt: item.publishedAt ?? null,
    countryCode: targetLoc?.countryCode,
    flagEmoji: targetLoc ? countryCodeToFlagEmoji(targetLoc.countryCode) : undefined,
    isTurkish: targetLoc
      ? targetLoc.kind === "tr-province" || isTurkishProvinceName(targetLoc.label)
      : isTurkishProvinceName(cityLabel),
    kind: "news" as const,
    thumbnail: item.imageUrl ?? null,
    spot: item.spot ?? null,
    content: item.content ?? null,
    source: item.source,
    rssSourceUrl: item.rssSourceUrl ?? null,
    originUrl: item.originUrl ?? null,
    sourceSiteUrl: item.sourceSiteUrl ?? null,
    publishedOnSiteId: item.publishedOnSiteId ?? null,
    sourceSiteSlug: item.sourceSiteSlug ?? null,
    feedLabel: item.feedLabel ?? null,
    geoLat: targetLoc?.lat ?? item.geoLat ?? null,
    geoLng: targetLoc?.lng ?? item.geoLng ?? null,
    regionKey: item.regionKey ?? null,
  }));
  return sortHeadlinesByPublishedDesc(dedupeHeadlinesByStory(rows)).slice(0, limit);
}
