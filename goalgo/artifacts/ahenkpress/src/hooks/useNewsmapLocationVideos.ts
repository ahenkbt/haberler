import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buildNewsmapLocationVideoHeadlines,
  fetchNewsmapLocationVideos,
} from "@/lib/haberHaritasiLocationVideos";
import type { HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";

const STALE_MS = 5 * 60 * 1000;

export type NewsmapLocationFetchOpts = {
  displayLabel?: string;
  countryHint?: string | null;
};

export function useNewsmapLocationVideos(
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
    queryKey: ["/api/newsmap/location-videos", fetchLabel, opts?.countryHint ?? "", linkMode],
    queryFn: ({ signal }) =>
      fetchNewsmapLocationVideos(fetchLabel, ilCenters, signal, opts?.countryHint),
    enabled: enabled && fetchLabel.length >= 2,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
  });

  const headlines = useMemo(
    () =>
      buildNewsmapLocationVideoHeadlines(
        displayLabel,
        query.data ?? [],
        linkMode,
        hmPublicHref,
        ilCenters,
      ),
    [displayLabel, query.data, linkMode, hmPublicHref, ilCenters],
  );

  return { headlines, isLoading: query.isPending && query.data === undefined };
}
