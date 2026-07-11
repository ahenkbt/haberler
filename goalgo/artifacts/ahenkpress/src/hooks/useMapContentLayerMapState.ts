import { useCallback, useMemo, useState } from "react";
import { normalizeHmMapCityKey, type HmMapCityContentMatch, type HmMapCityHeadline } from "@/lib/hmMapCityNews";
import {
  contentLayerShowsAnyNewsVideo,
  filterContentIndexByLayers,
  filterHeadlinesByContentLayers,
  readMapContentLayersFromStorage,
  type MapContentLayerKey,
  type MapContentLayers,
  writeMapContentLayersToStorage,
} from "@/lib/mapContentLayers";

type UseMapContentLayerMapStateArgs = {
  newsMapEnabled: boolean;
  mapsHybridEnabled: boolean;
  isNewsmapPage: boolean;
  newsmapBusinessesMode: boolean;
  filteredNewsHeadlines: HmMapCityHeadline[];
  newsmapDisplayHeadlines: HmMapCityHeadline[];
  newsmapMarkerContentIndex: Map<string, HmMapCityContentMatch>;
  filteredCityContentIndex: Map<string, HmMapCityContentMatch>;
  resolveMapsLocationCityLabel: () => string | null;
};

export function useMapContentLayerMapState({
  newsMapEnabled,
  mapsHybridEnabled,
  isNewsmapPage,
  newsmapBusinessesMode,
  filteredNewsHeadlines,
  newsmapDisplayHeadlines,
  newsmapMarkerContentIndex,
  filteredCityContentIndex,
  resolveMapsLocationCityLabel,
}: UseMapContentLayerMapStateArgs) {
  const [mapContentLayers, setMapContentLayers] = useState<MapContentLayers>(() =>
    readMapContentLayersFromStorage(),
  );

  const toggleMapContentLayer = useCallback((key: MapContentLayerKey) => {
    setMapContentLayers((prev: MapContentLayers) => {
      const next = { ...prev, [key]: !prev[key] };
      writeMapContentLayersToStorage(next);
      return next;
    });
  }, []);

  const syncMapContentLayersForKind = useCallback((kind: "all" | "news" | "video" | "businesses" | "info") => {
    if (kind === "businesses") return;
    setMapContentLayers((prev: MapContentLayers) => {
      const next: MapContentLayers =
        kind === "info"
          ? { ...prev, news: false, video: false, bilgiAgaci: true }
          : kind === "all"
            ? { ...prev, news: true, video: true, bilgiAgaci: true }
            : kind === "news"
              ? { ...prev, news: true, video: false, bilgiAgaci: false }
              : { ...prev, news: false, video: true, bilgiAgaci: false };
      writeMapContentLayersToStorage(next);
      return next;
    });
  }, []);

  const contentLayersActive = newsMapEnabled || mapsHybridEnabled;
  const showNewsVideoOnMap = contentLayerShowsAnyNewsVideo(mapContentLayers);

  const newsmapShowCallouts =
    contentLayersActive &&
    showNewsVideoOnMap &&
    ((isNewsmapPage && !newsmapBusinessesMode) || mapsHybridEnabled);

  const showBilgiAgaciMapLayer = contentLayersActive && mapContentLayers.bilgiAgaci;

  const effectiveMarkerContentIndex = useMemo(
    () => filterContentIndexByLayers(newsmapMarkerContentIndex, mapContentLayers),
    [mapContentLayers, newsmapMarkerContentIndex],
  );

  const hybridCalloutHeadlines = useMemo(() => {
    if (!mapsHybridEnabled || isNewsmapPage) return [];
    const cityLabel = resolveMapsLocationCityLabel();
    const base = cityLabel
      ? filteredNewsHeadlines.filter((row) => {
          const cityKey = normalizeHmMapCityKey(cityLabel.split(",")[0]?.trim() || cityLabel);
          return normalizeHmMapCityKey(row.city) === cityKey;
        })
      : filteredNewsHeadlines;
    return filterHeadlinesByContentLayers(base, mapContentLayers);
  }, [
    filteredNewsHeadlines,
    isNewsmapPage,
    mapContentLayers,
    mapsHybridEnabled,
    resolveMapsLocationCityLabel,
  ]);

  const contentCalloutHeadlines = useMemo(() => {
    if (isNewsmapPage) {
      return filterHeadlinesByContentLayers(newsmapDisplayHeadlines, mapContentLayers);
    }
    return hybridCalloutHeadlines;
  }, [hybridCalloutHeadlines, isNewsmapPage, mapContentLayers, newsmapDisplayHeadlines]);

  const filterHeadlinesForLayers = useCallback(
    (headlines: HmMapCityHeadline[]) => filterHeadlinesByContentLayers(headlines, mapContentLayers),
    [mapContentLayers],
  );

  const activeContentLayerCount = useMemo(() => {
    if (!contentLayersActive) return 0;
    return [mapContentLayers.news, mapContentLayers.video, mapContentLayers.bilgiAgaci].filter(Boolean).length;
  }, [contentLayersActive, mapContentLayers]);

  return {
    mapContentLayers,
    toggleMapContentLayer,
    syncMapContentLayersForKind,
    newsmapShowCallouts,
    showBilgiAgaciMapLayer,
    effectiveMarkerContentIndex,
    contentCalloutHeadlines,
    filterHeadlinesForLayers,
    activeContentLayerCount,
  };
}
