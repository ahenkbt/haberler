import { useQuery } from "@tanstack/react-query";
import {
  buildNewsmapLocationNewsHeadlines,
  fetchNewsmapLocationNews,
} from "@/lib/haberHaritasiLocationNews";
import type { HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import type { NewsmapLocationFetchOpts } from "@/hooks/useNewsmapLocationVideos";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";

const STALE_MS = 5 * 60 * 1000;

/** Bölge/konum seçildiğinde — önce son 24s, boşsa RSS il/bölge yedek. */
export function useNewsmapLocationNews(
  queryLabel: string | null | undefined,
  enabled: boolean,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>,
  linkMode: HaberHaritasiLinkMode,
  hmPublicHref: (path: string) => string,
  opts?: NewsmapLocationFetchOpts,
): { headlines: HmMapCityHeadline[]; isLoading: boolean } {
  const fetchLabel = String(queryLabel ?? "").trim();
  const displayLabel = String(opts?.displayLabel ?? fetchLabel).trim() || fetchLabel;
  const query = useQuery({
    queryKey: ["/api/newsmap/location-news", fetchLabel, opts?.countryHint ?? "", linkMode],
    queryFn: ({ signal }) =>
      fetchNewsmapLocationNews(fetchLabel, ilCenters, signal, opts?.countryHint),
    enabled: enabled && fetchLabel.length >= 2,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
  });

  const headlines = buildNewsmapLocationNewsHeadlines(
    fetchLabel,
    query.data ?? [],
    ilCenters,
    linkMode,
    hmPublicHref,
    48,
    { displayLabel, countryHint: opts?.countryHint },
  );

  return { headlines, isLoading: query.isPending && query.data === undefined };
}
