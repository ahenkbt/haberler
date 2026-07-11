import { useQuery } from "@tanstack/react-query";
import {
  fetchHybridNewsList,
  type HomeHybridNewsItem,
} from "@/hooks/useHomeHybridNews";

const STALE_MS = 5 * 60 * 1000;

/** Kategori başına en güncel manşet — haber kategorileri sekmesi için. */
export function buildCategoryHeadlines(items: HomeHybridNewsItem[]): HomeHybridNewsItem[] {
  const seen = new Set<string>();
  const out: HomeHybridNewsItem[] = [];
  for (const item of items) {
    const slug = (item.categorySlug ?? "gundem").toLowerCase();
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(item);
  }
  return out;
}

async function fetchHomeNewsBandItems(): Promise<HomeHybridNewsItem[]> {
  return fetchHybridNewsList({ limit: 40, offset: 0 });
}

export function useHomeNewsBandItems() {
  return useQuery({
    queryKey: ["home", "news-band-items"],
    queryFn: fetchHomeNewsBandItems,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
  });
}
