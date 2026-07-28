import { useQuery, type QueryClient } from "@tanstack/react-query";
import {
  fetchHybridNewsList,
  hybridNewsListQueryKey,
  type HomeHybridNewsItem,
} from "@/hooks/useHomeHybridNews";
import {
  readHmHomeHybridNewsCacheMeta,
  writeHmHomeHybridNewsCache,
} from "@/lib/hmHomeHybridNewsCache";
import { isRssHybridItem, mergeUniqueNews } from "@/lib/hmHeadlinePool";

/** dbFirst yenilemesi RSS’i düşürürse önbellek/önceki havuzdaki RSS manşette kalsın. */
export function mergeHybridBootstrapPreserveRss(
  fresh: readonly HomeHybridNewsItem[],
  previous: readonly HomeHybridNewsItem[] | null | undefined,
): HomeHybridNewsItem[] {
  const prev = Array.isArray(previous) ? previous : [];
  if (prev.length === 0) return [...fresh];
  const merged = mergeUniqueNews(fresh, prev) as HomeHybridNewsItem[];
  const freshRssCount = fresh.filter((item) => isRssHybridItem(item)).length;
  const prevRss = prev.filter((item) => isRssHybridItem(item));
  if (freshRssCount >= prevRss.length) return merged;
  return mergeUniqueNews(merged, prevRss) as HomeHybridNewsItem[];
}

/** Tam anasayfa havuzu — RSS band + kategori kutuları geri doldurma. */
export const HM_HOME_HYBRID_BOOTSTRAP_LIMIT = 100;

/** İlk boyama: manşet + yan kartlar; tam havuz scroll/idle sonrası. */
export const HM_HOME_HYBRID_HERO_LIMIT = 42;

export function hmHomeHybridBootstrapQueryKey(
  siteId: number,
  phase: "hero" | "full" = "full",
): readonly unknown[] {
  const limit = phase === "hero" ? HM_HOME_HYBRID_HERO_LIMIT : HM_HOME_HYBRID_BOOTSTRAP_LIMIT;
  return hybridNewsListQueryKey({
    scope: phase === "hero" ? "hm-home-bootstrap-hero" : "hm-home-bootstrap",
    siteId,
    limit,
    offset: 0,
    rssScope: "all",
  });
}

async function loadHmHomeHybridBootstrapPhase(
  siteId: number,
  phase: "hero" | "full",
  signal?: AbortSignal,
  previous?: readonly HomeHybridNewsItem[],
): Promise<HomeHybridNewsItem[]> {
  const limit = phase === "hero" ? HM_HOME_HYBRID_HERO_LIMIT : HM_HOME_HYBRID_BOOTSTRAP_LIMIT;
  const fresh = await fetchHybridNewsList({
    siteId,
    limit,
    offset: 0,
    rssScope: "all",
    dbFirst: true,
    signal,
    timeoutMs: phase === "hero" ? 8_000 : 10_000,
    retries: phase === "hero" ? 0 : 1,
  });
  const items = mergeHybridBootstrapPreserveRss(fresh, previous);
  if (items.length > 0 && phase === "full") writeHmHomeHybridNewsCache(siteId, items);
  return items;
}

/** HM site meta yüklendiğinde hero havuzunu önceden çek (hafif). */
export function prefetchHmHomeHybridNews(queryClient: QueryClient, siteId: number): void {
  if (!Number.isFinite(siteId) || siteId <= 0) return;

  const cacheMeta = readHmHomeHybridNewsCacheMeta(siteId);

  if (cacheMeta) {
    queryClient.setQueryData(hmHomeHybridBootstrapQueryKey(siteId, "hero"), cacheMeta.items.slice(0, HM_HOME_HYBRID_HERO_LIMIT), {
      updatedAt: cacheMeta.savedAt,
    });
    queryClient.setQueryData(hmHomeHybridBootstrapQueryKey(siteId, "full"), cacheMeta.items, {
      updatedAt: cacheMeta.savedAt,
    });
  }

  void queryClient.prefetchQuery({
    queryKey: hmHomeHybridBootstrapQueryKey(siteId, "hero"),
    queryFn: ({ signal }) => loadHmHomeHybridBootstrapPhase(siteId, "hero", signal),
    staleTime: 2 * 60 * 1000,
  });
}

export function useHmHomeHybridBootstrapHero(siteId: number | null, enabled: boolean) {
  const cacheMeta = siteId != null && siteId > 0 ? readHmHomeHybridNewsCacheMeta(siteId) : undefined;

  return useQuery<HomeHybridNewsItem[]>({
    queryKey:
      siteId != null && siteId > 0
        ? hmHomeHybridBootstrapQueryKey(siteId, "hero")
        : ["/api/news/hybrid", "hm-home-bootstrap-hero", "disabled"],
    queryFn: ({ signal, client }) => {
      const previous = client.getQueryData<HomeHybridNewsItem[]>(
        hmHomeHybridBootstrapQueryKey(siteId!, "hero"),
      );
      return loadHmHomeHybridBootstrapPhase(siteId!, "hero", signal, previous ?? cacheMeta?.items);
    },
    enabled: enabled && siteId != null && siteId > 0,
    initialData: cacheMeta?.items?.slice(0, HM_HOME_HYBRID_HERO_LIMIT),
    initialDataUpdatedAt: cacheMeta?.savedAt,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: (previous) => previous ?? cacheMeta?.items?.slice(0, HM_HOME_HYBRID_HERO_LIMIT),
  });
}

export function useHmHomeHybridBootstrapFull(
  siteId: number | null,
  enabled: boolean,
  deferUntilReady: boolean,
) {
  const cacheMeta = siteId != null && siteId > 0 ? readHmHomeHybridNewsCacheMeta(siteId) : undefined;

  return useQuery<HomeHybridNewsItem[]>({
    queryKey:
      siteId != null && siteId > 0
        ? hmHomeHybridBootstrapQueryKey(siteId, "full")
        : ["/api/news/hybrid", "hm-home-bootstrap", "disabled"],
    queryFn: ({ signal, client }) => {
      const previous = client.getQueryData<HomeHybridNewsItem[]>(
        hmHomeHybridBootstrapQueryKey(siteId!, "full"),
      );
      return loadHmHomeHybridBootstrapPhase(siteId!, "full", signal, previous ?? cacheMeta?.items);
    },
    enabled: enabled && !deferUntilReady && siteId != null && siteId > 0,
    initialData: cacheMeta?.items,
    initialDataUpdatedAt: cacheMeta?.savedAt,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: (previous) => previous ?? cacheMeta?.items,
  });
}

/** @deprecated Prefer hero + full split. */
export function useHmHomeHybridBootstrap(siteId: number | null, enabled: boolean) {
  return useHmHomeHybridBootstrapFull(siteId, enabled, false);
}
