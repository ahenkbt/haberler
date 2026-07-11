import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buildHmMapCityContentIndex,
  buildHmMapCityHeadlines,
  buildHmMapCityHeadlinesPerCity,
  buildHmMapCityKindCounts,
  buildHmMapCityNewsIndex,
  buildHmMapCityNewsMatches,
  type HmMapCityContentMatch,
  type HmMapCityHeadline,
  type HaberHaritasiNewsMatch,
} from "@/lib/hmMapCityNews";
import {
  fetchHaberHaritasiVideos,
  isNewsmapFreshPublishedAt,
  isNewsmapRegionPublishedAt,
  type HaberHaritasiVideoItem,
} from "@/lib/haberHaritasiVideos";
import { resolveHaberHaritasiVideoHome, type HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import {
  fetchHybridNewsList,
  hybridNewsListQueryKey,
  NEWSMAP_HYBRID_FULL_LIMIT,
  NEWSMAP_HYBRID_INITIAL_LIMIT,
  newsmapHybridFastQueryKey,
  newsmapHybridNewsQueryKey,
  type HomeHybridNewsItem,
} from "@/hooks/useHomeHybridNews";
import { readNewsmapHybridNewsCacheMeta } from "@/lib/newsmapHybridNewsCache";

const STALE_MS = 5 * 60 * 1000;
/** Newsmap havuzu arka planda tazelensin — kullanıcı sayfayı yenilemeden yeni haberler aksın. */
const NEWSMAP_BG_REFETCH_MS = 90 * 1000;

function mergeHybridNewsItems(...groups: HomeHybridNewsItem[][]): HomeHybridNewsItem[] {
  const merged = new Map<string, HomeHybridNewsItem>();
  for (const group of groups) {
    for (const item of group) {
      const key = String(item.id || item.href || "").trim();
      if (!key) continue;
      merged.set(key, item);
    }
  }
  return [...merged.values()];
}

export type HmMapCityNewsBundle = {
  items: HomeHybridNewsItem[];
  videoItems: HaberHaritasiVideoItem[];
  headlines: HmMapCityHeadline[];
  cityIndex: Map<string, HomeHybridNewsItem>;
  cityContentIndex: Map<string, HmMapCityContentMatch>;
  matches: Map<string, HaberHaritasiNewsMatch>;
  cityNewsCounts: Map<string, number>;
  cityVideoCounts: Map<string, number>;
  regionItems: HomeHybridNewsItem[];
  regionVideoItems: HaberHaritasiVideoItem[];
  regionHeadlines: HmMapCityHeadline[];
  regionCityContentIndex: Map<string, HmMapCityContentMatch>;
  isLoading: boolean;
};

export type HmMapCityNewsOptions = { newsmap?: boolean };

export function useHmMapCityNews(
  siteId: number | null | undefined,
  enabled = true,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
  linkMode: HaberHaritasiLinkMode = "yekpare",
  hmPublicHref: (path: string) => string = (p) => p,
  options: HmMapCityNewsOptions = {},
): HmMapCityNewsBundle {
  const newsmapMode = options.newsmap === true;
  const editorNewsmapSiteId =
    newsmapMode && siteId != null && siteId > 0 ? siteId : null;
  const portalGlobalNewsmap = newsmapMode && editorNewsmapSiteId == null;
  const rssScope = newsmapMode ? "all" : siteId != null && siteId > 0 ? "site" : "all";
  const newsmapCacheMeta = portalGlobalNewsmap ? readNewsmapHybridNewsCacheMeta() : undefined;
  const newsmapCachedItems = newsmapCacheMeta?.items;

  /** Phase-1: DB + sessionStorage — harita hemen boyansın. */
  const fastNewsQuery = useQuery({
    queryKey: newsmapMode
      ? newsmapHybridFastQueryKey(editorNewsmapSiteId)
      : hybridNewsListQueryKey({ siteId, limit: 200, offset: 0, rssScope, scope: "haber-haritasi" }),
    queryFn: ({ signal }) =>
      fetchHybridNewsList({
        siteId: portalGlobalNewsmap ? null : editorNewsmapSiteId ?? (siteId != null && siteId > 0 ? siteId : null),
        limit: newsmapMode ? NEWSMAP_HYBRID_INITIAL_LIMIT : 200,
        offset: 0,
        rssScope,
        global: portalGlobalNewsmap,
        newsmap: newsmapMode,
        dbFirst: newsmapMode,
        signal,
        retries: 0,
        timeoutMs: newsmapMode ? 15_000 : 8_000,
      }),
    enabled,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
    // Arka planda tazele — küçük/bayat önbellek görünüme sabitlenmesin (yalnız newsmap).
    refetchInterval: newsmapMode ? NEWSMAP_BG_REFETCH_MS : false,
    refetchIntervalInBackground: false,
    initialData: newsmapCachedItems,
    // Gerçek yaş: önbellek staleTime içindeyse hızlı gösterilir ama süresi dolunca yeniden çekilir.
    initialDataUpdatedAt: newsmapCacheMeta?.savedAt,
  });

  /** Phase-2: RSS zenginleştirme — arka planda birleştirilir. */
  const fullNewsQuery = useQuery({
    queryKey: newsmapMode
      ? newsmapHybridNewsQueryKey(editorNewsmapSiteId)
      : hybridNewsListQueryKey({ siteId, limit: 200, offset: 0, rssScope, global: newsmapMode, scope: "haber-haritasi-full" }),
    queryFn: ({ signal }) =>
      fetchHybridNewsList({
        siteId: portalGlobalNewsmap ? null : editorNewsmapSiteId ?? (siteId != null && siteId > 0 ? siteId : null),
        limit: newsmapMode ? NEWSMAP_HYBRID_FULL_LIMIT : 200,
        offset: 0,
        rssScope,
        global: portalGlobalNewsmap,
        newsmap: newsmapMode,
        signal,
        retries: 1,
        timeoutMs: newsmapMode ? 25_000 : 12_000,
      }),
    enabled: enabled && newsmapMode && (fastNewsQuery.isFetched || Boolean(newsmapCachedItems?.length)),
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
    // Faz-2 havuzu arka planda tazelensin — yeni haberler sayfa yenilenmeden akar.
    refetchInterval: newsmapMode ? NEWSMAP_BG_REFETCH_MS : false,
    refetchIntervalInBackground: false,
  });

  const rawNews = useMemo(() => {
    if (!newsmapMode) return fastNewsQuery.data ?? [];
    return mergeHybridNewsItems(
      newsmapCachedItems ?? [],
      fastNewsQuery.data ?? [],
      fullNewsQuery.data ?? [],
    );
  }, [newsmapMode, newsmapCachedItems, fastNewsQuery.data, fullNewsQuery.data]);

  const videoQuery = useQuery({
    queryKey: ["/api/video/videos/haber-haritasi", linkMode],
    queryFn: ({ signal }) => fetchHaberHaritasiVideos(signal),
    enabled,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 2,
  });

  const rawVideos = videoQuery.data ?? [];
  const items = useMemo(() => rawNews.filter((item) => isNewsmapFreshPublishedAt(item.publishedAt)), [rawNews]);
  const regionItems = useMemo(() => rawNews.filter((item) => isNewsmapRegionPublishedAt(item.publishedAt)), [rawNews]);
  /** Videolarda yaş/süre süzgeci yok — lokasyondaki tüm eşleşen videolar gösterilir. */
  const videoItems = rawVideos;
  const regionVideoItems = rawVideos;
  const videoHome = resolveHaberHaritasiVideoHome(linkMode, hmPublicHref);

  const cityIndex = useMemo(() => buildHmMapCityNewsIndex(items, ilCenters), [items, ilCenters]);
  const cityContentIndex = useMemo(() => buildHmMapCityContentIndex(items, videoItems, ilCenters, videoHome), [items, videoItems, ilCenters, videoHome]);
  const cityKindCounts = useMemo(() => buildHmMapCityKindCounts(items, videoItems, ilCenters), [items, videoItems, ilCenters]);
  const regionKindCounts = useMemo(() => buildHmMapCityKindCounts(regionItems, regionVideoItems, ilCenters), [regionItems, regionVideoItems, ilCenters]);
  const matches = useMemo(() => buildHmMapCityNewsMatches(items, ilCenters), [items, ilCenters]);
  const headlines = useMemo(
    () => (newsmapMode ? buildHmMapCityHeadlinesPerCity(items, ilCenters, videoItems, videoHome) : buildHmMapCityHeadlines(items, ilCenters, 24, videoItems, videoHome)),
    [items, ilCenters, videoItems, videoHome, newsmapMode],
  );
  const regionCityContentIndex = useMemo(() => buildHmMapCityContentIndex(regionItems, regionVideoItems, ilCenters, videoHome), [regionItems, regionVideoItems, ilCenters, videoHome]);
  const regionHeadlines = useMemo(
    () => (newsmapMode ? buildHmMapCityHeadlinesPerCity(regionItems, ilCenters, regionVideoItems, videoHome) : buildHmMapCityHeadlines(regionItems, ilCenters, 48, regionVideoItems, videoHome)),
    [regionItems, ilCenters, regionVideoItems, videoHome, newsmapMode],
  );

  const cityNewsCounts = useMemo(() => {
    const merged = new Map<string, number>(cityKindCounts.news);
    for (const [key, count] of regionKindCounts.news) merged.set(key, Math.max(merged.get(key) ?? 0, count));
    return merged;
  }, [cityKindCounts.news, regionKindCounts.news]);

  const cityVideoCounts = useMemo(() => {
    const merged = new Map<string, number>(cityKindCounts.video);
    for (const [key, count] of regionKindCounts.video) merged.set(key, Math.max(merged.get(key) ?? 0, count));
    return merged;
  }, [cityKindCounts.video, regionKindCounts.video]);

  const hasCachedOrFastData = Boolean(newsmapCachedItems?.length || (fastNewsQuery.data?.length ?? 0) > 0);
  const newsLoading =
    newsmapMode
      ? !hasCachedOrFastData && fastNewsQuery.isPending
      : fastNewsQuery.isPending && fastNewsQuery.data === undefined;

  return {
    items, videoItems, cityIndex, cityContentIndex, matches, headlines,
    cityNewsCounts, cityVideoCounts, regionItems, regionVideoItems, regionHeadlines, regionCityContentIndex,
    isLoading: newsLoading,
  };
}
