import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { HmRssNewsBandItem } from "@/components/HmRssNewsBand";
import {
  fetchHybridNewsList,
  HM_HYBRID_CATEGORY_FETCH_TIMEOUT_MS,
  hybridNewsListQueryKey,
  mapHybridNewsToBandItem,
} from "@/hooks/useHomeHybridNews";
import { deferSimilarNewsItems } from "@/lib/hmNewsTitleSimilarity";
import {
  hmNewsItemMatchesHomeCategorySlug,
  type HmHomeCategoryMatchContext,
} from "@/lib/hmHomeCategorySectionPool";
import { categoryBoxItemKey } from "@/lib/hmCategoryBoxItems";
import { hmCategorySlug } from "@/lib/hmCategorySlug";

const DEFAULT_FETCH_LIMIT = 12;

function countFallbackItemsForSlug(
  slug: string,
  fallbackPool: readonly HmRssNewsBandItem[],
  matchContext: HmHomeCategoryMatchContext | undefined,
  limit: number,
): number {
  if (!slug || fallbackPool.length === 0) return 0;
  let count = 0;
  const seen = new Set<string>();
  for (const item of fallbackPool) {
    if (matchContext && !hmNewsItemMatchesHomeCategorySlug(item, slug, matchContext)) continue;
    const key = categoryBoxItemKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    count += 1;
    if (count >= limit) break;
  }
  return count;
}

export function useHmHomeCategorySectionItems(opts: {
  slugs: readonly string[];
  siteId: number | null;
  enabled: boolean;
  limit?: number;
  rssScope?: "box" | "site" | "all";
  fallbackPool?: readonly HmRssNewsBandItem[];
  matchContext?: HmHomeCategoryMatchContext;
  /** Ana hibrit havuz yüklenene kadar kategori API isteklerini ertele. */
  deferRemoteFetch?: boolean;
}) {
  const limit = opts.limit ?? DEFAULT_FETCH_LIMIT;
  const uniqueSlugs = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of opts.slugs) {
      const slug = hmCategorySlug(raw);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      out.push(slug);
    }
    return out;
  }, [opts.slugs]);

  const queries = useQueries({
    queries: uniqueSlugs.map((slug) => {
      const fallbackCount = countFallbackItemsForSlug(
        slug,
        opts.fallbackPool ?? [],
        opts.matchContext,
        limit,
      );
      /** Tam kutu (4) dolmadan API atlanmasın — havuz yeterliyse gereksiz istek yapma. */
      const needsRemote = fallbackCount < limit;
      return {
        queryKey: hybridNewsListQueryKey({
          scope: "hm-home-cat-box",
          siteId: opts.siteId,
          categorySlug: slug,
          limit,
          offset: 0,
          rssScope: opts.rssScope ?? "all",
        }),
        queryFn: async () => {
          const items = await fetchHybridNewsList({
            siteId: opts.siteId,
            categorySlug: slug,
            limit,
            offset: 0,
            rssScope: opts.rssScope ?? "all",
            timeoutMs: HM_HYBRID_CATEGORY_FETCH_TIMEOUT_MS,
            retries: 0,
          });
          return deferSimilarNewsItems(items.map(mapHybridNewsToBandItem));
        },
        staleTime: 60 * 1000,
        // Sonsuz spinner olmasın: tek deneme + kısa timeout ile sorgu her koşulda hızlı
        // "settle" olur (içerik veya boş). Hata yakalanır; fetchPublicJson zaman aşımında
        // {ok:false} döner, sorgu boş çözülür — asla pending'de asılı kalmaz.
        retry: 0,
        enabled: opts.enabled && Boolean(slug) && !opts.deferRemoteFetch && needsRemote,
      };
    }),
  });

  return useMemo(() => {
    const bySlug = new Map<string, HmRssNewsBandItem[]>();
    const matchContext = opts.matchContext;
    const fallbackPool = opts.fallbackPool ?? [];

    uniqueSlugs.forEach((slug, index) => {
      const fetched = queries[index]?.data;
      if (Array.isArray(fetched) && fetched.length > 0) {
        bySlug.set(slug, fetched);
        return;
      }

      if (!matchContext || fallbackPool.length === 0) return;

      const backfill: HmRssNewsBandItem[] = [];
      const seen = new Set<string>();
      for (const item of fallbackPool) {
        if (!hmNewsItemMatchesHomeCategorySlug(item, slug, matchContext)) continue;
        const key = categoryBoxItemKey(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        backfill.push(item);
        if (backfill.length >= limit) break;
      }
      if (backfill.length > 0) {
        bySlug.set(slug, backfill);
      }
    });

    return {
      bySlug,
      isPending: queries.some((query) => query.isPending),
    };
  }, [limit, opts.fallbackPool, opts.matchContext, queries, uniqueSlugs]);
}
