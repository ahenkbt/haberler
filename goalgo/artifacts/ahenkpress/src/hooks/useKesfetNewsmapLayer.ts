import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeHmMapCityKey, type HmMapCityHeadline } from "@/lib/hmMapCityNews";
import {
  buildHaberHaritasiCoordIndex,
  filterHaberHaritasiContentIndex,
  filterHaberHaritasiHeadlines,
  filterHaberHaritasiLocations,
  newsmapGeoFilterFromMapView,
  newsmapGeoFilterFromUserLocation,
  type NewsmapGeoFilter,
} from "@/lib/haberHaritasiGeoFilter";
import { NEWSMAP_CLUSTER_MAX_ZOOM } from "@/lib/haberHaritasiNewsmapCallouts";
import {
  findNewsmapHeadlineByDeepLinkId,
  parseNewsmapDeepLinkId,
} from "@/lib/haberHaritasiDeepLink";
import {
  markNewsmapScrapeQueued,
  NEWSMAP_SCRAPE_MIN_ZOOM,
  newsmapScrapeRadiusMeters,
  newsmapScrapeRegionKey,
  queueNewsmapBusinessScrape,
  shouldSkipNewsmapScrape,
} from "@/lib/haberHaritasiNewsmapScrape";
import { HABER_HARITASI_GLOBAL_LOCATIONS } from "@/lib/haberHaritasiLocations";
import {
  buildNewsmapLocationNewsHeadlines,
  resolveNewsmapLocationHeadlinesFallback,
} from "@/lib/haberHaritasiLocationNews";
import { resolveNewsmapLocationQueryLabel } from "@/lib/haberHaritasiLocationContext";
import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import {
  isNewsmapLocationEnhancing,
  mergeNewsmapHeadlinesDedupe,
  resolveNewsmapPhase1LocationHeadlines,
  shouldBlockNewsmapLocationLoading,
} from "@/lib/newsmapProgressiveLoading";
import { useNewsmapLocationNews } from "@/hooks/useNewsmapLocationNews";
import { useNewsmapLocationVideos } from "@/hooks/useNewsmapLocationVideos";
import type { HaberHaritasiLinkMode } from "@/lib/haberHaritasiLinks";
import {
  buildNewsmapLocationVideoHeadlines,
  filterNewsmapVideoHeadlinesForCity,
  filterNewsmapVideosForCity,
} from "@/lib/haberHaritasiLocationVideos";
import type { HaberHaritasiVideoItem } from "@/lib/haberHaritasiVideos";

type UseKesfetNewsmapLayerArgs = {
  newsMapEnabled: boolean;
  /** `/maps` hibrit haber/video katmanı — newsmap olmayan tam ekran harita. */
  mapsHybridEnabled?: boolean;
  mapsContentKind?: "businesses" | "news" | "video";
  isNewsmapPage?: boolean;
  newsmapBusinessesMode?: boolean;
  urlQueryStr: string;
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>;
  headlines: HmMapCityHeadline[];
  /** 7 güne kadar genişletilmiş havuz — konum sorgusu yüklenene kadar yedek */
  regionHeadlines?: HmMapCityHeadline[];
  /** Çekilmiş ham DB+RSS havuzu — konum panelinde ile eşleşen TÜM haberleri listelemek için. */
  newsPool?: HomeHybridNewsItem[];
  /** YekTube havuzu — konum panelinde ile eşleşen tüm videolar (yaş/süre süzgeci yok). */
  videoPool?: HaberHaritasiVideoItem[];
  cityContentIndex: Map<string, import("@/lib/hmMapCityNews").HmMapCityContentMatch>;
  regionCityContentIndex?: Map<string, import("@/lib/hmMapCityNews").HmMapCityContentMatch>;
  headlinesLoading: boolean;
  mapLoaded: boolean;
  leafletMapRef: React.RefObject<import("leaflet").Map | null>;
  linkMode?: HaberHaritasiLinkMode;
  hmPublicHref?: (path: string) => string;
  /** Seçili konum koordinatları — ilçe/mahalle için il haber sorgusu. */
  locationQueryCoords?: { lat: number; lng: number } | null;
};

export function useKesfetNewsmapLayer({
  newsMapEnabled,
  mapsHybridEnabled = false,
  mapsContentKind = "businesses",
  isNewsmapPage = false,
  newsmapBusinessesMode = false,
  urlQueryStr,
  ilCenters,
  headlines,
  regionHeadlines = [],
  newsPool = [],
  videoPool = [],
  cityContentIndex,
  regionCityContentIndex,
  headlinesLoading,
  mapLoaded,
  leafletMapRef,
  linkMode = "yekpare",
  hmPublicHref = (p) => p,
  locationQueryCoords = null,
}: UseKesfetNewsmapLayerArgs) {
  const [newsPreviewHeadline, setNewsPreviewHeadline] = useState<HmMapCityHeadline | null>(null);
  const [newsOverlayHeadline, setNewsOverlayHeadline] = useState<HmMapCityHeadline | null>(null);
  const [selectedNewsmapCity, setSelectedNewsmapCity] = useState<string | null>(null);
  const [newsMapGeoFilter, setNewsMapGeoFilter] = useState<NewsmapGeoFilter | null>(null);
  const [locationLoadTimedOut, setLocationLoadTimedOut] = useState(false);
  const newsmapScrapeKeysRef = useRef<Set<string>>(new Set());
  const newsmapDeepLinkHandledRef = useRef<string | null>(null);
  const newsmapScrapeBootstrappedRef = useRef(false);
  const locationPendingSinceRef = useRef<number | null>(null);

  const locationFetchLabel = String(selectedNewsmapCity ?? "").trim();

  const locationQueryResolution = useMemo(
    () =>
      resolveNewsmapLocationQueryLabel(locationFetchLabel, {
        lat: locationQueryCoords?.lat,
        lng: locationQueryCoords?.lng,
        ilCenters,
      }),
    [ilCenters, locationFetchLabel, locationQueryCoords?.lat, locationQueryCoords?.lng],
  );

  const hybridLocationLayerActive = newsMapEnabled || mapsHybridEnabled;

  const locationFetchEnabled =
    hybridLocationLayerActive &&
    !(isNewsmapPage && newsmapBusinessesMode) &&
    !(mapsHybridEnabled && mapsContentKind === "businesses") &&
    locationFetchLabel.length >= 2;

  const newsmapLocationNews = useNewsmapLocationNews(
    locationQueryResolution.queryLabel,
    locationFetchEnabled,
    ilCenters,
    linkMode,
    hmPublicHref,
    {
      displayLabel: locationFetchLabel,
      countryHint: locationQueryResolution.countryHint,
    },
  );
  const newsmapLocationVideos = useNewsmapLocationVideos(
    locationQueryResolution.queryLabel,
    locationFetchEnabled,
    ilCenters,
    linkMode,
    hmPublicHref,
    {
      displayLabel: locationFetchLabel,
      countryHint: locationQueryResolution.countryHint,
    },
  );

  const phase1LocationHeadlines = useMemo(() => {
    if (!selectedNewsmapCity) return [];
    const query = locationQueryResolution.queryLabel.trim() || selectedNewsmapCity;
    return resolveNewsmapPhase1LocationHeadlines(query, headlines, regionHeadlines);
  }, [headlines, locationQueryResolution.queryLabel, regionHeadlines, selectedNewsmapCity]);

  // Zaten çekilmiş ham havuzdan ile eşleşen TÜM haberler (DB + RSS) — panelde "1 haber"
  // yerine onlarca başlık gösterir; ek istek yok, ana newsmap pool'undan türetilir.
  const poolLocationNewsHeadlines = useMemo(() => {
    const query = locationQueryResolution.queryLabel.trim();
    const display = locationFetchLabel || query;
    if (!query || newsPool.length === 0) return [];
    return buildNewsmapLocationNewsHeadlines(query, newsPool, ilCenters, linkMode, hmPublicHref, 48, {
      displayLabel: display,
      countryHint: locationQueryResolution.countryHint,
    });
  }, [
    locationFetchLabel,
    locationQueryResolution.countryHint,
    locationQueryResolution.queryLabel,
    newsPool,
    ilCenters,
    linkMode,
    hmPublicHref,
  ]);

  const poolLocationVideoHeadlines = useMemo(() => {
    const label = locationQueryResolution.queryLabel.trim();
    const display = locationFetchLabel || label;
    if (!label || videoPool.length === 0) return [];
    const matched = filterNewsmapVideosForCity(
      videoPool,
      label,
      ilCenters,
      locationQueryResolution.countryHint,
    );
    if (matched.length === 0) return [];
    return buildNewsmapLocationVideoHeadlines(display, matched, linkMode, hmPublicHref, ilCenters);
  }, [
    locationFetchLabel,
    locationQueryResolution.countryHint,
    locationQueryResolution.queryLabel,
    videoPool,
    ilCenters,
    linkMode,
    hmPublicHref,
  ]);

  const mergedLocationNewsHeadlines = useMemo(
    () => mergeNewsmapHeadlinesDedupe(
      phase1LocationHeadlines.filter((row) => row.kind === "news"),
      poolLocationNewsHeadlines,
      newsmapLocationNews.headlines,
    ),
    [newsmapLocationNews.headlines, phase1LocationHeadlines, poolLocationNewsHeadlines],
  );

  const mergedLocationVideoHeadlines = useMemo(
    () => {
      const fetched = newsmapLocationVideos.headlines;
      const pooled = filterNewsmapVideoHeadlinesForCity(
        mergeNewsmapHeadlinesDedupe(
          phase1LocationHeadlines.filter((row) => row.kind === "video"),
          poolLocationVideoHeadlines,
        ),
        locationQueryResolution.queryLabel,
        ilCenters,
        locationQueryResolution.countryHint,
      );
      return mergeNewsmapHeadlinesDedupe(pooled, fetched);
    },
    [
      newsmapLocationVideos.headlines,
      phase1LocationHeadlines,
      poolLocationVideoHeadlines,
      locationQueryResolution.countryHint,
      locationQueryResolution.queryLabel,
      ilCenters,
    ],
  );

  const cityHeadlinesOverride = useMemo(
    () => mergeNewsmapHeadlinesDedupe(
      mergedLocationNewsHeadlines,
      mergedLocationVideoHeadlines,
    ),
    [mergedLocationNewsHeadlines, mergedLocationVideoHeadlines],
  );

  const phase2LocationPending = newsmapLocationNews.isLoading || newsmapLocationVideos.isLoading;
  useEffect(() => {
    if (phase2LocationPending) {
      if (locationPendingSinceRef.current == null) locationPendingSinceRef.current = Date.now();
    } else {
      locationPendingSinceRef.current = null;
    }
  }, [phase2LocationPending]);
  useEffect(() => {
    if (!phase2LocationPending) {
      setLocationLoadTimedOut(false);
      return;
    }
    setLocationLoadTimedOut(false);
    const timer = window.setTimeout(() => setLocationLoadTimedOut(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [phase2LocationPending, selectedNewsmapCity]);
  const phase2LocationCount =
    newsmapLocationNews.headlines.length +
    (selectedNewsmapCity
      ? newsmapLocationVideos.headlines.filter(
          (h) => normalizeHmMapCityKey(h.city) === normalizeHmMapCityKey(selectedNewsmapCity),
        ).length
      : 0);
  // Havuzdan gelen il haberleri de "anında içerik" sayılır; tam ekran yükleme göstergesini engeller.
  const immediateLocationCount = phase1LocationHeadlines.length + poolLocationNewsHeadlines.length + poolLocationVideoHeadlines.length;
  const locationContentLoading = shouldBlockNewsmapLocationLoading(
    immediateLocationCount,
    phase2LocationCount,
    phase2LocationPending && !locationLoadTimedOut,
    locationPendingSinceRef.current,
  );
  const locationContentEnhancing = isNewsmapLocationEnhancing(
    immediateLocationCount,
    phase2LocationPending,
  );

  const newsmapCoordIndex = useMemo(
    () => buildHaberHaritasiCoordIndex(ilCenters),
    [ilCenters],
  );

  const regionHeadlinesForCity = useMemo(() => {
    if (!selectedNewsmapCity) return [];
    if (cityHeadlinesOverride.length > 0) return cityHeadlinesOverride;
    const query = locationQueryResolution.queryLabel.trim() || selectedNewsmapCity;
    const fromPool = resolveNewsmapLocationHeadlinesFallback(
      [...regionHeadlines, ...headlines],
      query,
      48,
      locationQueryResolution.countryHint,
    );
    if (fromPool.length > 0) return fromPool;
    const cityKey = normalizeHmMapCityKey(query);
    const fromPoolLoose = [...regionHeadlines, ...headlines]
      .filter((row) => {
        const title = normalizeHmMapCityKey(row.title);
        const city = normalizeHmMapCityKey(row.city);
        return title.includes(cityKey) || city.includes(cityKey);
      })
      .sort(
        (a, b) =>
          (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0),
      );
    return fromPoolLoose.slice(0, 24);
  }, [cityHeadlinesOverride, headlines, locationQueryResolution.countryHint, locationQueryResolution.queryLabel, regionHeadlines, selectedNewsmapCity]);

  const countryHeadlinePool = useMemo(() => {
    const merged = new Map<string, HmMapCityHeadline>();
    for (const row of [...regionHeadlines, ...headlines]) {
      const key = normalizeHmMapCityKey(row.city);
      if (!merged.has(key)) merged.set(key, row);
    }
    return [...merged.values()];
  }, [headlines, regionHeadlines]);

  const activeHeadlines = useMemo(() => {
    if (selectedNewsmapCity) {
      if (regionHeadlinesForCity.length > 0) return regionHeadlinesForCity;
      const cityKey = normalizeHmMapCityKey(selectedNewsmapCity);
      const cityRows = headlines.filter((row) => normalizeHmMapCityKey(row.city) === cityKey);
      if (cityRows.length > 0) return cityRows;
      return regionHeadlinesForCity;
    }
    if (isNewsmapPage && !newsMapGeoFilter) return countryHeadlinePool;
    return headlines;
  }, [countryHeadlinePool, headlines, isNewsmapPage, newsMapGeoFilter, regionHeadlinesForCity, selectedNewsmapCity]);

  const activeCityContentIndex = useMemo(() => {
    if (selectedNewsmapCity && regionCityContentIndex && regionCityContentIndex.size > 0) {
      return regionCityContentIndex;
    }
    return cityContentIndex;
  }, [cityContentIndex, regionCityContentIndex, selectedNewsmapCity]);

  const filteredNewsHeadlines = useMemo(() => {
    if (selectedNewsmapCity) {
      return activeHeadlines.slice(0, 48);
    }
    return filterHaberHaritasiHeadlines(activeHeadlines, newsmapCoordIndex, newsMapGeoFilter);
  }, [activeHeadlines, newsmapCoordIndex, newsMapGeoFilter, selectedNewsmapCity]);

  const filteredCityContentIndex = useMemo(
    () => (hybridLocationLayerActive
      ? filterHaberHaritasiContentIndex(activeCityContentIndex, newsmapCoordIndex, selectedNewsmapCity ? null : newsMapGeoFilter)
      : activeCityContentIndex),
    [activeCityContentIndex, newsmapCoordIndex, newsMapGeoFilter, hybridLocationLayerActive, selectedNewsmapCity],
  );

  const filteredGlobalLocations = useMemo(
    () => (hybridLocationLayerActive
      ? filterHaberHaritasiLocations(HABER_HARITASI_GLOBAL_LOCATIONS, newsMapGeoFilter)
      : HABER_HARITASI_GLOBAL_LOCATIONS),
    [newsMapGeoFilter, hybridLocationLayerActive],
  );

  const openNewsPreview = useCallback((headline: HmMapCityHeadline) => {
    setNewsPreviewHeadline(headline);
    setNewsOverlayHeadline(null);
  }, []);

  const closeNewsPreview = useCallback(() => {
    setNewsPreviewHeadline(null);
  }, []);

  const openNewsOverlay = useCallback((headline: HmMapCityHeadline) => {
    setNewsPreviewHeadline(null);
    setNewsOverlayHeadline(headline);
  }, []);

  const expandNewsPreview = useCallback((headline: HmMapCityHeadline) => {
    setNewsPreviewHeadline(null);
    setNewsOverlayHeadline(headline);
  }, []);

  const closeNewsOverlay = useCallback(() => {
    setNewsOverlayHeadline(null);
  }, []);

  const selectNewsmapCity = useCallback((city: string) => {
    const label = String(city ?? "").trim();
    if (!label) return;
    setSelectedNewsmapCity(label);
    setNewsPreviewHeadline(null);
    setNewsOverlayHeadline(null);
  }, []);

  const clearSelectedNewsmapCity = useCallback(() => {
    setSelectedNewsmapCity(null);
  }, []);

  const triggerNewsmapLocationScrape = useCallback((
    lat: number,
    lng: number,
    label: string,
    _source: string,
    filterOverride?: NewsmapGeoFilter | null,
  ) => {
    if (!hybridLocationLayerActive) return;
    const filter = filterOverride ?? newsMapGeoFilter ?? newsmapGeoFilterFromUserLocation(lat, lng);
    const radiusMeters = newsmapScrapeRadiusMeters(filter);
    const regionKey = newsmapScrapeRegionKey(lat, lng, radiusMeters);
    if (shouldSkipNewsmapScrape(regionKey)) return;
    if (newsmapScrapeKeysRef.current.has(regionKey)) return;
    newsmapScrapeKeysRef.current.add(regionKey);
    markNewsmapScrapeQueued(regionKey);
    void queueNewsmapBusinessScrape({ lat, lng, label, radiusMeters });
  }, [hybridLocationLayerActive, newsMapGeoFilter]);

  const applyUserNewsmapGeoFilter = useCallback((lat: number, lng: number) => {
    const filter = newsmapGeoFilterFromUserLocation(lat, lng);
    setNewsMapGeoFilter(filter);
    return filter;
  }, []);

  useEffect(() => {
    if (!hybridLocationLayerActive) return;
    const deepLinkId = parseNewsmapDeepLinkId(urlQueryStr);
    if (!deepLinkId || headlinesLoading) return;
    if (newsmapDeepLinkHandledRef.current === deepLinkId) return;
    const headline = findNewsmapHeadlineByDeepLinkId(deepLinkId, [...headlines, ...regionHeadlines]);
    if (headline) {
      newsmapDeepLinkHandledRef.current = deepLinkId;
      setNewsOverlayHeadline(headline);
    }
  }, [hybridLocationLayerActive, urlQueryStr, headlines, regionHeadlines, headlinesLoading]);

  useEffect(() => {
    if (!hybridLocationLayerActive || !mapLoaded || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    let viewportScrapeTimer: number | null = null;
    let geoFilterTimer: number | null = null;
    const syncGeoFilter = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const filter =
        isNewsmapPage && zoom <= NEWSMAP_CLUSTER_MAX_ZOOM
          ? null
          : newsmapGeoFilterFromMapView(center, zoom);
      if (geoFilterTimer) window.clearTimeout(geoFilterTimer);
      geoFilterTimer = window.setTimeout(() => {
        setNewsMapGeoFilter(filter);
      }, 300);
      if (viewportScrapeTimer) window.clearTimeout(viewportScrapeTimer);
      if (zoom < NEWSMAP_SCRAPE_MIN_ZOOM) return;
      const delayMs = newsmapScrapeBootstrappedRef.current ? 400 : 0;
      newsmapScrapeBootstrappedRef.current = true;
      viewportScrapeTimer = window.setTimeout(() => {
        triggerNewsmapLocationScrape(center.lat, center.lng, "Harita görünümü", "viewport", filter);
      }, delayMs);
    };
    syncGeoFilter();
    map.on("moveend zoomend", syncGeoFilter);
    return () => {
      map.off("moveend zoomend", syncGeoFilter);
      if (viewportScrapeTimer) window.clearTimeout(viewportScrapeTimer);
      if (geoFilterTimer) window.clearTimeout(geoFilterTimer);
    };
  }, [isNewsmapPage, mapLoaded, hybridLocationLayerActive, leafletMapRef, triggerNewsmapLocationScrape]);

  return {
    newsPreviewHeadline,
    openNewsPreview,
    closeNewsPreview,
    expandNewsPreview,
    newsOverlayHeadline,
    openNewsOverlay,
    closeNewsOverlay,
    selectedNewsmapCity,
    selectNewsmapCity,
    clearSelectedNewsmapCity,
    newsMapGeoFilter,
    filteredNewsHeadlines,
    filteredCityContentIndex,
    filteredGlobalLocations,
    triggerNewsmapLocationScrape,
    applyUserNewsmapGeoFilter,
    locationContentLoading,
    locationContentEnhancing,
    phase1LocationHeadlines,
    locationNewsHeadlines: mergedLocationNewsHeadlines,
    locationVideoHeadlines: mergedLocationVideoHeadlines,
    locationNewsLoading: newsmapLocationNews.isLoading,
    locationVideosLoading: newsmapLocationVideos.isLoading,
  };
}
