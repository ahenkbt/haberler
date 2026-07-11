import { useQuery } from "@tanstack/react-query";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import { fetchNewsmapOverlayArticle, type NewsmapOverlayArticle } from "@/lib/newsmapOverlayArticle";

export function newsmapOverlayArticleQueryKey(
  headline: HmMapCityHeadline | null,
  siteId?: number | null,
): readonly [string, string, string, string | number] {
  return [
    "newsmap-overlay-article",
    String(headline?.kind ?? "none"),
    String(headline?.href ?? headline?.title ?? ""),
    siteId ?? "portal",
  ];
}

export function useNewsmapOverlayArticle(
  headline: HmMapCityHeadline | null,
  siteId?: number | null,
  enabled = true,
) {
  return useQuery<NewsmapOverlayArticle>({
    queryKey: newsmapOverlayArticleQueryKey(headline, siteId),
    queryFn: () => fetchNewsmapOverlayArticle(headline!, siteId),
    enabled: enabled && Boolean(headline) && headline?.kind !== "video",
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
