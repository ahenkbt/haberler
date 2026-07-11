import { Fragment, useState, useEffect, useRef, useCallback, useMemo, type ReactElement } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ADVANCED_OVERLAY_DEFS,
  attachLeafletMapContainerTileSync,
  attachLeafletTileVisibilitySync,
  BASE_LAYER_DEFS,
  OFFICIAL_MAP_LINKS,
  OVERLAY_LAYER_LABELS,
  syncLeafletTileLoadedVisibility,
} from "../../lib/mapLayers";
import { reverseGeocodeHybrid, effectiveMapsGeocodeSettings, isUsableMapCoordinate, forwardGeocodeAddressHybrid } from "@/lib/mapsGeocode";
import { fetchGooglePlacePredictionsDetailed, geocodePlaceIdClient, fetchHybridLocationSuggestionsDetailed } from "@/lib/mapsPlacePredictions";
import { GooglePlaceOneLinePicker } from "@/components/GooglePlaceOneLinePicker";
import { resolveKesfetKeywordsParam } from "@/lib/kesfetDirectoryLookup";
import type { TrAddressValue } from "../../components/TrAddressFields";
import { FlightTrafficPanel, MobilityComingSoonPanel } from "../../components/kesfet/FlightTrafficPanel";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { resolveClientMediaSrc, apiUrl } from "@/lib/apiBase";
import { PUBLIC_LOCATION_UPDATED_EVENT, readPublicLocation, type PublicLocationState } from "@/lib/publicLocation";
import {
  parseOpenSkyStatesPayload,
  filterByOperator,
  FLIGHT_BBOX,
  TR_AIRPORT_PRESETS,
  bboxAroundPoint,
  type FlightRegionId,
  type OpenSkyAircraft,
} from "../../lib/opensky";
import {
  YEKPARE_SADE_ACCENT,
  YEKPARE_SADE_ACCENT_DARK,
  YEKPARE_SADE_ACCENT_SOFT,
  YEKPARE_SADE_PAGE_TINT,
  YEKPARE_SADE_TEAL,
  YEKPARE_SADE_TEAL_DARK,
} from "@/lib/yekpareSadeTheme";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { haritalarFullscreenHref, kesfetBusinessMapHref, parseLegacyMapsPlacePath as parseYekparePlacePath, parseLegacyMapsSyncedPath as parseYekpareSyncedMapPath } from "@/lib/haritalarNav";
import { HARITALAR } from "@/lib/haritalarRoutes";
import { buildSariSayfalarListPath } from "@/lib/sariSayfalarUtils";
import { buildKonumaGoreHref } from "@/lib/konumaGoreUtils";
import {
  findKesfetDiscoveryCategory,
  findKesfetDiscoveryCity,
  findKesfetDiscoveryRegion,
  buildKesfetDiscoveryImportJobs,
  KESFET_DISCOVERY_REGIONS,
} from "@/lib/kesfetDiscoveryDirectory";
import { KESFET_DISCOVER_GROUPS } from "@/lib/kesfetDiscoverCategories";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { HmMapCityNewsPanel } from "@/components/HmMapCityNewsPanel";
import { HaberHaritasiSonDakikaTicker } from "@/components/HaberHaritasiSonDakikaTicker";
import { HaberHaritasiNewsOverlay } from "@/components/HaberHaritasiNewsOverlay";
import { HaberHaritasiNewsPreviewCard } from "@/components/HaberHaritasiNewsPreviewCard";
import { HaberHaritasiBilgiAgaciPreviewCard } from "@/components/HaberHaritasiBilgiAgaciPreviewCard";
import {
  MapContentLayerControls,
  MapContentLayerQuickPanel,
  MobileMapMenuTrigger,
} from "@/components/kesfet/MapContentLayerControls";
import { useMapContentLayerMapState } from "@/hooks/useMapContentLayerMapState";
import { NewsmapLocationSearch, type NewsmapLocationSelectPayload } from "@/components/NewsmapLocationSearch";
import { NewsmapSidebarPanel } from "@/components/NewsmapSidebarPanel";
import { NewsmapLocationPanel, type NewsmapLocationPanelTab } from "@/components/NewsmapLocationPanel";
import { NewsmapLocationInfoPanel } from "@/components/NewsmapLocationInfoPanel";
import { MapPanelCloseButton } from "@/components/MapPanelCloseButton";
import { useHmMapCityNews } from "@/hooks/useHmMapCityNews";
import { prefetchNewsmapHybridNews } from "@/hooks/useHomeHybridNews";
import { hasNewsmapHybridNewsCache } from "@/lib/newsmapHybridNewsCache";
import { useKesfetNewsmapLayer } from "@/hooks/useKesfetNewsmapLayer";
import {
  buildHmMapCityHeadlines,
  mergeHmMapCityContentIndexes,
  normalizeHmMapCityKey,
  type HmMapCityHeadline,
} from "@/lib/hmMapCityNews";
import { registerNewsmapVideoPlay, newsmapLocationVideoCategorySlug, buildNewsmapNationalVideoBandHeadlines } from "@/lib/haberHaritasiLocationVideos";
import { buildNewsmapSidebarHeadlines, resolveIlCenterFromSearchQuery, resolveNewsmapLocationCoords } from "@/lib/newsmapSidebarHeadlines";
import { HABER_HARITASI_GLOBAL_LOCATIONS, isTurkishProvinceName } from "@/lib/haberHaritasiLocations";
import type { BilgiAgaciMapPreview } from "@/lib/mapContentLayers";
import { buildHaberHaritasiMarkerIconHtml } from "@/lib/haberHaritasiMarkers";
import {
  resolveHaberHaritasiBilgiAgaciHref,
  resolveHaberHaritasiSondakikaHref,
  resolveHaberHaritasiVideoHome,
  type HaberHaritasiLinkMode,
} from "@/lib/haberHaritasiLinks";
import {
  getNewsmapDefaultViewPlan,
  getNewsmapWorldViewPlan,
  isInsideViewPlanBounds,
  type NewsmapDefaultViewPlan,
} from "@/lib/haberHaritasiDefaultViewport";
import { headlineFromContentMatch } from "@/lib/haberHaritasiDeepLink";
import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import {
  buildHaberHaritasiCoordIndex,
  buildNewsmapCountryClusterHeadlines,
  haversineDistanceKm,
  headlineExtrasFromCoordMeta,
  isWithinNewsmapRadius,
  newsmapGeoFilterFromMapView,
} from "@/lib/haberHaritasiGeoFilter";
import {
  buildNewsmapCalloutPlacements,
  buildNewsmapCalloutPlacementsFromContentIndex,
  NEWSMAP_CLUSTER_MAX_ZOOM,
  newsmapCalloutLimitFromZoom,
  resolveNewsmapCityCount,
} from "@/lib/haberHaritasiNewsmapCallouts";
import { queueNewsmapMissingProvinceBackfill } from "@/lib/haberHaritasiNewsmapCoverage";
import { NEWSMAP_SCRAPE_MIN_ZOOM } from "@/lib/haberHaritasiNewsmapScrape";
import {
  buildLocationBusinessScrapeLabel,
  resolveNewsmapLocationContext,
} from "@/lib/haberHaritasiLocationContext";
import {
  buildNewsmapGlobalPoolHeadlines,
  defaultNewsmapBottomBandTab,
  isNewsmapTurkeyOrKktcViewport,
  mergeNewsmapBottomBandHeadlines,
  resolveNewsmapBottomBandHeadlines,
  type NewsmapBottomBandTab,
} from "@/lib/haberHaritasiNewsmapBottomBand";
import {
  fetchPlacesPreviewForLocation,
  fetchJsonWithTimeout,
  mergeBusinessesWithPlacesPreview,
  triggerSilentRegionBusinessScrape,
  buildPlacesPreviewQuery,
  resolveNewsmapBusinessLocationScope,
  MAPS_FETCH_TIMEOUT_MS,
} from "@/lib/mapsLocationPipeline";
import { resolveVisitorCountryCode } from "@/lib/haberHaritasiVisitorCountry";
import {
  isHaberHaritasiNewsMapPath,
  isHmHaritalarPublicPath,
  isHmNewsmapPublicPath,
  isNewsmapPublicPath,
  isVisitorCountryDefaultMapPath,
  isYekpareMapsHybridContentPath,
  isYekpareHaberHaritasiPath,
  matchHmHaritalarPublicBasePath,
  matchNewsmapPublicBasePath,
  YEKPARE_NEWSMAP_PATH,
} from "@/lib/hmHaritalarRoutes";
import "../../styles/kesfetHaritaSade.css";

const API = "/api";
/** HM özel alanında `/api` vekili yok — Railway köküne yönlendirir. */
function mapApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return apiUrl(p.startsWith("/api") ? p : `/api${p}`);
}
const HARITALAR_NIGHT_SCRAPER_WAKE_SESSION_KEY = "ahenk_haritalar_night_scraper_wake_v1";
const FRIENDLY_MAP_ERROR = "Harita verileri şu anda yenilenemedi; mevcut görünüm açık kaldı.";

function isHaritalarWakePath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/haritalar" || path === "/newsmap" || path === "/map"
    || path.startsWith("/haritalar/") || path.startsWith("/newsmap/")
    || isHmHaritalarPublicPath(path) || isHmNewsmapPublicPath(path);
}

type SafeJsonResult<T> =
  | { ok: true; data: T; status: number; contentType: string }
  | { ok: false; data: T; status: number; contentType: string; error: string };

async function readJsonResponse<T>(res: Response, fallback: T): Promise<SafeJsonResult<T>> {
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text().catch(() => "");
  if (!raw.trim()) {
    return {
      ok: false,
      data: fallback,
      status: res.status,
      contentType,
      error: res.ok ? "empty_json_body" : `http_${res.status}`,
    };
  }
  if (!contentType.toLowerCase().includes("json") && !/^\s*[\[{]/.test(raw)) {
    return {
      ok: false,
      data: fallback,
      status: res.status,
      contentType,
      error: res.ok ? "non_json_response" : `http_${res.status}`,
    };
  }
  try {
    const data = JSON.parse(raw) as T;
    return res.ok
      ? { ok: true, data, status: res.status, contentType }
      : { ok: false, data, status: res.status, contentType, error: `http_${res.status}` };
  } catch {
    return {
      ok: false,
      data: fallback,
      status: res.status,
      contentType,
      error: "invalid_json",
    };
  }
}

const MAP_CHROME_GRAD = `linear-gradient(135deg, ${YEKPARE_SADE_TEAL} 0%, ${YEKPARE_SADE_ACCENT} 100%)`;
const MAP_CHROME_SHADOW = "rgba(14,165,233,0.28)";
const MAP_CHIP_BORDER = "rgba(14,165,233,0.22)";
const MAP_TOP_BAR_BG = `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, ${YEKPARE_SADE_PAGE_TINT} 55%, rgba(224,242,254,0.95) 100%)`;
const MAP_PANEL_TINT = `linear-gradient(135deg, ${YEKPARE_SADE_PAGE_TINT} 0%, #ffffff 60%, ${YEKPARE_SADE_ACCENT_SOFT} 100%)`;

function normalizeCategorySearch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9ğüşıöç\s/-]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Masaüstü: Leaflet zoom kontrolü için alt boşluk (px). */
const DESKTOP_KESFET_MAP_BOTTOM_SAFE_PX = 24;
/** Leaflet sağ-alt (+/-) harita alt kenarından (px). */
const DESKTOP_KESFET_LEAFLET_UI_BOTTOM_PX = DESKTOP_KESFET_MAP_BOTTOM_SAFE_PX;
const MAP_BACKGROUND_IMPORT_RADIUS_M = 20_000;
const MAP_PRIMARY_NEARBY_RADIUS_M = 50_000;
const MAP_EXPANDED_NEARBY_RADIUS_M = 100_000;
const MAP_BACKGROUND_IMPORT_DEBOUNCE_MS = 2200;

const GENERIC_MAP_LOCATION_LABELS = /^(konum|harita konumu|seçili konum|türkiye)$/i;
const COORDINATE_LABEL_PATTERN = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;
function isCoordinateLikeMapLabel(value: string | null | undefined): boolean {
  const label = String(value ?? "").trim();
  if (!label) return true;
  if (!COORDINATE_LABEL_PATTERN.test(label)) return false;
  const [latRaw, lngRaw] = label.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(latRaw) || !Number.isFinite(lngRaw)) return true;
  return Math.abs(latRaw) <= 90 && Math.abs(lngRaw) <= 180;
}
function resolveMapLocationDisplayLabel(...sources: Array<string | null | undefined>): string {
  for (const source of sources) {
    const label = String(source ?? "").trim();
    if (label && !GENERIC_MAP_LOCATION_LABELS.test(label) && !isCoordinateLikeMapLabel(label)) return label;
  }
  return "";
}
function isGenericMapLocationLabel(value: string | null | undefined): boolean {
  const label = String(value ?? "").trim();
  return !label || GENERIC_MAP_LOCATION_LABELS.test(label) || isCoordinateLikeMapLabel(label);
}
function normalizeMapScopeCity(value: string | null | undefined): string {
  return resolveMapLocationDisplayLabel(value);
}
function businessScopeCityMatch(b: Business, scopeCity: string, maxLooseKm: number): boolean {
  if (!scopeCity) return true;
  const scopeNorm = normalizeMapScopeCity(scopeCity).toLocaleLowerCase("tr-TR");
  if (!scopeNorm) return true;
  const blob = `${b.name ?? ""} ${b.address ?? ""}`.toLocaleLowerCase("tr-TR");
  const wrongCityMarkers = ["adana", "ankara", "istanbul", "izmir", "izmit", "kocaeli", "bursa", "antalya"];
  for (const marker of wrongCityMarkers) {
    if (scopeNorm.includes(marker) || marker.includes(scopeNorm)) continue;
    if (blob.includes(marker)) return false;
  }
  const extra = b as Business & { city?: { name?: string | null; nameTr?: string | null } | null };
  const businessCity = String(extra.city?.nameTr || extra.city?.name || "").trim();
  if (businessCity) {
    if (businessCity.toLocaleLowerCase("tr-TR") === scopeNorm) return true;
    const dist = b.distance ?? 999;
    return dist <= Math.min(12, maxLooseKm * 0.25);
  }
  const dist = b.distance ?? 999;
  if (dist > maxLooseKm) return false;
  return blob.includes(scopeNorm);
}
function generalListNoisePenalty(b: Business, hasActiveFilter: boolean): number {
  if (isMapKamuBusiness(b)) return 1000;
  if (hasActiveFilter) return 0;
  const extra = b as Business & {
    homepageSuperCategory?: string | null;
    storeType?: string | null;
    categoryName?: string | null;
    category?: { name?: string | null; slug?: string | null } | null;
  };
  const blob = `${extra.homepageSuperCategory ?? ""} ${extra.storeType ?? ""} ${extra.categoryName ?? ""} ${extra.category?.name ?? ""} ${extra.category?.slug ?? ""} ${b.name ?? ""} ${b.address ?? ""}`
    .toLocaleLowerCase("tr-TR");
  if (/(oto|arac|car_repair|tamir|servis|garage|galeri|kiralama|rentacar)/.test(blob)) return 400;
  return 0;
}

const MAP_KAMU_NAME_RE = /(?:^|[^a-z0-9çğıöşü])(?:belediye|büyükşehir|valilik|adalet saray[ıi]|adliye|kaymakaml[ıi]k|devlet dairesi|kamu kurumu|hükümet kona[ğg][ıi])(?:[^a-z0-9çğıöşü]|$)/i;

function isMapKamuBusiness(b: Business): boolean {
  const extra = b as Business & { homepageSuperCategory?: string | null; storeType?: string | null };
  if (extra.homepageSuperCategory === "kamu") return true;
  const blob = `${b.name ?? ""} ${b.address ?? ""} ${extra.storeType ?? ""}`.toLocaleLowerCase("tr-TR");
  return MAP_KAMU_NAME_RE.test(blob) || /\bkamu\b/.test(blob);
}

function findDiscoveryCityAcrossRegions(cityQuery: string | null | undefined) {
  const raw = String(cityQuery ?? "").trim();
  if (!raw) return undefined;
  const norm = raw.toLocaleLowerCase("tr-TR");
  const slugNorm = norm.replace(/\s+/g, "-");
  for (const region of KESFET_DISCOVERY_REGIONS) {
    for (const city of region.cities) {
      if (city.slug === raw || city.slug === slugNorm) return city;
      if (city.label.toLocaleLowerCase("tr-TR") === norm) return city;
    }
  }
  return undefined;
}

/** Konum kartındaki kayıtlı işletme sayımı için il/şehir adını çöz (ör. "Çankaya, Ankara" → Ankara). */
function resolveLocationCardScopeCity(
  loc: SearchedLocationInfo,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
): { cityLabel: string; citySlug: string } | null {
  const rawParts = [
    ...(loc.areaInfo ? loc.areaInfo.split(",") : []),
    ...(loc.title ? loc.title.split(",") : []),
    loc.title,
  ]
    .map((s) => s.trim())
    .filter((p) => p && !isGenericMapLocationLabel(p));
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const p of rawParts) {
    const key = p.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(p);
  }
  for (const part of [...parts].reverse()) {
    const discovery = findDiscoveryCityAcrossRegions(part);
    if (discovery) return { cityLabel: discovery.label, citySlug: discovery.slug };
    const province = resolveTurkishProvinceCenter(part, ilCenters);
    if (province) return { cityLabel: province.label, citySlug: province.slug };
  }
  return null;
}

function normalizeProvinceLookupKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i");
}

type ResolvedProvinceCenter = { label: string; lat: number; lng: number; zoom: number; slug: string };

/** Sarı Sayfalar / haritalarNavHref `?city=` — 81 il sabit merkez (Nominatim'e güvenme). */
function resolveTurkishProvinceCenter(
  cityQuery: string | null | undefined,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }> = [],
): ResolvedProvinceCenter | null {
  const discovery = findDiscoveryCityAcrossRegions(cityQuery);
  if (discovery) {
    return {
      label: discovery.label,
      lat: discovery.lat,
      lng: discovery.lng,
      zoom: Math.max(10, discovery.zoom ?? 11),
      slug: discovery.slug,
    };
  }
  const key = normalizeProvinceLookupKey(String(cityQuery ?? ""));
  if (!key) return null;
  const il = ilCenters.find((x) => normalizeProvinceLookupKey(x.adi) === key);
  if (!il) return null;
  return {
    label: il.adi,
    lat: il.lat,
    lng: il.lng,
    zoom: Math.max(10, il.zoom || 11),
    slug: key.replace(/\s+/g, "-"),
  };
}

/** URL lat/lng veya harita merkezi — reverse-geocode beklemeden en yakın il. */
function resolveNearestTurkishProvinceFromCoords(
  lat: number,
  lng: number,
  ilCenters: Array<{ adi: string; lat: number; lng: number; zoom: number }>,
): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || ilCenters.length === 0) return null;
  let best: { adi: string; distKm: number } | null = null;
  for (const il of ilCenters) {
    const distKm = haversineDistanceKm(lat, lng, il.lat, il.lng);
    if (!best || distKm < best.distKm) best = { adi: il.adi, distKm };
  }
  if (!best || best.distKm > 120) return null;
  return best.adi;
}

/** AnsiklopediDetay ile aynı slug biçimi */
function wikiArticleSlug(title: string) {
  return wikiTitleToUrlSlug(title);
}

function cityNameFromLocation(info: { title?: string; areaInfo?: string; address?: string }): string {
  const title = String(info.title || "").trim();
  const fromTitle = title.includes("›") ? title.split("›")[0]?.trim() || title : title;
  const area = String(info.areaInfo || "").trim();
  if (area && area !== "Türkiye" && area !== "Turkey") return area;
  const addr = String(info.address || "").trim();
  if (addr) {
    const part = addr.split(",")[0]?.trim();
    if (part && part !== "Türkiye" && part !== "Turkey") return part;
  }
  return fromTitle;
}

const MEGA_CITIES_TR = [
  "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Gaziantep", "Konya", "Mersin", "Diyarbakır",
] as const;

export const TURKEY_DEFAULT_MAP_CENTER = { lat: 39.0, lng: 35.0 } as const;
export const TURKEY_DEFAULT_MAP_ZOOM = 6;
export const TURKEY_DEFAULT_MIN_ZOOM = 5;
export const TURKEY_DEFAULT_MAP_BOUNDS: [[number, number], [number, number]] = [[35.65, 25.65], [42.5, 45.5]];
export const TURKEY_DEFAULT_PAN_BOUNDS: [[number, number], [number, number]] = [[35.2, 25.0], [42.9, 46.0]];
export const TURKEY_DEFAULT_FIT_PADDING: [number, number] = [12, 12];
const NO_TARGET_TURKEY_FIT_DELAYS_MS = [0, 80, 180, 360, 720, 1200] as const;
export function getNoTargetTurkeyViewPlan() {
  return {
    bounds: TURKEY_DEFAULT_MAP_BOUNDS,
    panBounds: TURKEY_DEFAULT_PAN_BOUNDS,
    padding: TURKEY_DEFAULT_FIT_PADDING,
    minZoom: TURKEY_DEFAULT_MIN_ZOOM,
    fallbackCenter: TURKEY_DEFAULT_MAP_CENTER,
    fallbackZoom: TURKEY_DEFAULT_MAP_ZOOM,
  };
}
function isInsideTurkeyDefaultBounds(lat: number, lng: number): boolean {
  const [[south, west], [north, east]] = TURKEY_DEFAULT_MAP_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}
function isBrowserNoTargetMapBasePath(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return (
    (/^\/(?:haritalar|newsmap|maps|map)\/?$/i.test(path) || isHmHaritalarPublicPath(path) || isHmNewsmapPublicPath(path)) &&
    !window.location.search
  );
}
function toUnifiedNoTargetViewPlan(
  plan: ReturnType<typeof getNoTargetTurkeyViewPlan> | NewsmapDefaultViewPlan,
): NewsmapDefaultViewPlan {
  if ("center" in plan && "countryCode" in plan) return plan;
  return {
    countryCode: "TR",
    label: "Türkiye",
    center: { ...plan.fallbackCenter },
    zoom: plan.fallbackZoom,
    minZoom: plan.minZoom,
    bounds: plan.bounds,
    panBounds: plan.panBounds,
    padding: plan.padding,
  };
}
const SAVED_MAP_PLACES_STORAGE_KEY = "ahenk_haritalar_saved_places_v1";
const USER_ADDED_MAP_PLACES_STORAGE_KEY = "ahenk_haritalar_user_places_v1";
const MAP_DEVICE_STORAGE_KEY = "ahenk_haritalar_device_id_v1";

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Sidebar mesafe etiketi: kullanıcıya göre <1 km ise metre, aksi halde km. */
function formatUserBusinessDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km >= 10) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
}

/** Mesafe etiketi yalnız ziyaretçi konumundan; harita merkezi / arama konumu kullanılmaz. */
function applyVisitorDistancesToBusinesses(
  rows: Business[],
  origin: { lat: number; lng: number } | null,
): Business[] {
  if (!origin) {
    return rows.map((b) => ({ ...b, distance: undefined }));
  }
  return rows.map((b) => {
    const blat = Number(b.latitude);
    const blng = Number(b.longitude);
    if (!Number.isFinite(blat) || !Number.isFinite(blng)) {
      return { ...b, distance: undefined };
    }
    return { ...b, distance: distanceKm(origin.lat, origin.lng, blat, blng) };
  });
}

const KESFET_DISCOVERY_CITY_SUGGESTION_ROWS = KESFET_DISCOVERY_REGIONS.flatMap((region) =>
  region.cities.map((city) => ({
    slug: city.slug,
    label: city.label,
    lat: city.lat,
    lng: city.lng,
    zoom: city.zoom,
    regionLabel: region.label,
  })),
);

function parseMapCoord(raw: string | null, min: number, max: number): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

/** URL / harita hedefi: lat=0&lng=0 (Null Island) geçersiz sayılır. */
function parseMapTargetLatLng(
  latRaw: string | null,
  lngRaw: string | null,
): { lat: number; lng: number } | null {
  const lat = parseMapCoord(latRaw, -90, 90);
  const lng = parseMapCoord(lngRaw, -180, 180);
  if (lat == null || lng == null || !isUsableMapCoordinate(lat, lng)) return null;
  return { lat, lng };
}

function parseMapZoom(raw: string | null, fallback = 13): number {
  const value = Number(String(raw ?? "").replace(/z$/i, ""));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(20, Math.round(value)));
}

function escapeHtmlText(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeMapUrlSyncBasePath(path: string): string {
  const hmHaritalarBase = matchHmHaritalarPublicBasePath(path);
  if (hmHaritalarBase) return hmHaritalarBase;
  const newsmapBase = matchNewsmapPublicBasePath(path);
  if (newsmapBase) return newsmapBase;
  if (/^\/haritalar(?:\/tam-ekran)?\/?$/i.test(path)) return path.replace(/\/+$/, "") || "/haritalar";
  if (/^\/newsmap(?:\/.*)?$/i.test(path)) return YEKPARE_NEWSMAP_PATH;
  if (/^\/maps(?:\/.*)?$/i.test(path)) return "/maps";
  if (/^\/map(?:\/.*)?$/i.test(path)) return "/map";
  return "/map";
}

function resolveMapBasePath(path: string): string {
  const hmHaritalarBase = matchHmHaritalarPublicBasePath(path);
  if (hmHaritalarBase) return hmHaritalarBase;
  const newsmapBase = matchNewsmapPublicBasePath(path);
  if (newsmapBase) return newsmapBase;
  if (/^\/haritalar/i.test(path)) return "/haritalar";
  if (/^\/newsmap/i.test(path)) return YEKPARE_NEWSMAP_PATH;
  if (/^\/maps/i.test(path)) return "/maps";
  if (/^\/map/i.test(path)) return "/map";
  return "/map";
}

function hasExplicitKesfetMapTarget(path: string, query: string): boolean {
  const params = new URLSearchParams(query);
  const urlLatLng = parseMapTargetLatLng(params.get("lat"), params.get("lng") ?? params.get("lon"));
  return Boolean(
    parseYekparePlacePath(path) ||
    parseYekpareSyncedMapPath(path) ||
    urlLatLng ||
    params.get("location")?.trim() ||
    params.get("city")?.trim() ||
    params.get("place_id")?.trim() ||
    params.get("share")?.trim() ||
    params.get("nav")?.trim() ||
    params.get("directions")?.trim() ||
    params.get("q")?.trim()
  );
}

function validMapBounds(bounds: MapAreaBounds | null | undefined): MapAreaBounds | null {
  if (!bounds) return null;
  const clean = {
    south: Number(bounds.south),
    west: Number(bounds.west),
    north: Number(bounds.north),
    east: Number(bounds.east),
  };
  if (![clean.south, clean.west, clean.north, clean.east].every(Number.isFinite)) return null;
  if (clean.south >= clean.north || clean.west >= clean.east) return null;
  return clean;
}

function boundsFromNominatimBoundingBox(raw: unknown): MapAreaBounds | null {
  if (!Array.isArray(raw) || raw.length < 4) return null;
  return validMapBounds({
    south: Number(raw[0]),
    north: Number(raw[1]),
    west: Number(raw[2]),
    east: Number(raw[3]),
  });
}

function approximateBoundsAround(lat: number, lng: number, zoom = 13): MapAreaBounds {
  const span = zoom >= 16 ? 0.012 : zoom >= 14 ? 0.035 : zoom >= 12 ? 0.09 : 0.18;
  const lngSpan = span / Math.max(0.35, Math.cos((lat * Math.PI) / 180));
  return {
    south: Math.max(-90, lat - span),
    north: Math.min(90, lat + span),
    west: Math.max(-180, lng - lngSpan),
    east: Math.min(180, lng + lngSpan),
  };
}

function escapeMapMarkerText(value: unknown): string {
  return escapeHtmlText(String(value ?? ""));
}

function businessMarkerEmoji(biz: Business, category?: Category | null): string {
  const text = [
    biz.name,
    biz.address,
    biz.description,
    biz.importSource,
    category?.name,
    category?.slug,
    category?.googlePlaceType,
    biz.googlePlacesExtras ? JSON.stringify(biz.googlePlacesExtras).slice(0, 1000) : "",
  ].join(" ").toLocaleLowerCase("tr-TR");
  if (/\b(restoran|restaurant|lokanta|yemek|meal|food|cafe|kafe|bakery|pastane|fırın|firin|pide|börek|borek)\b/i.test(text)) return "🍽️";
  if (/\b(hotel|otel|konaklama|lodging|pansiyon|resort|motel)\b/i.test(text)) return "🏨";
  if (/\b(giyim|clothing|moda|tekstil|shoe|ayakkabı|ayakkabi)\b/i.test(text)) return "👕";
  if (/\b(shopping|alışveriş|alisveris|mağaza|magaza|store|mall|market)\b/i.test(text)) return "🛍️";
  if (/\b(güzellik|guzellik|beauty|kuaför|kuafor|hair|spa|bakım|bakim)\b/i.test(text)) return "✂️";
  if (/\b(auto|oto|araç|arac|car|servis|tamir|repair|rental|kiralama)\b/i.test(text)) return "🚗";
  if (/\b(turizm|tourism|travel|seyahat|acenta|uçak|ucak)\b/i.test(text)) return "✈️";
  if (/\b(diş|dis|dental|klinik|clinic|sağlık|saglik|medikal|optik)\b/i.test(text)) return "🏥";
  if (/\b(pet|veteriner|veterinary|petshop)\b/i.test(text)) return "🐾";
  if (/\b(eğitim|egitim|kurs|school|college|academy|dershane)\b/i.test(text)) return "🎓";
  if (/\b(emlak|real_estate|gayrimenkul|inşaat|insaat|dekorasyon|tesisat|plumber|hardware)\b/i.test(text)) return "🏠";
  if (/\b(avukat|lawyer|sigorta|insurance|danışman|danisman|ajans|reklam)\b/i.test(text)) return "💼";
  return "🛠️";
}

function getOpenStatus(wh: unknown): { isOpen: boolean; text: string } | null {
  if (!wh || typeof wh !== "object") return null;
  const now = new Date();
  const day = ["sun","mon","tue","wed","thu","fri","sat"][now.getDay()];
  const hours = (wh as Record<string,{open:string;close:string;closed?:boolean}>)[day];
  if (!hours || hours.closed) return { isOpen: false, text: "Bugün kapalı" };
  const [oh,om] = hours.open.split(":").map(Number);
  const [ch,cm] = hours.close.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = oh*60+om, close = ch*60+cm;
  if (cur >= open && cur < close) {
    const m = close - cur;
    return { isOpen: true, text: m<=60 ? `${m} dk içinde kapanıyor` : `Açık · ${hours.close}'e kadar` };
  }
  return { isOpen: false, text: `Kapalı · ${hours.open}'de açılıyor` };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-px">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  );
}

interface Business {
  id: string; name: string; slug?: string; address?: string; phone?: string;
  website?: string; whatsappNumber?: string; rating?: number; userRatingsTotal?: number;
  latitude?: number; longitude?: number; categoryId?: string; photoUrl?: string;
  coverPhotoUrl?: string;
  isPremium?: boolean; description?: string; workingHours?: unknown;
  googlePlacesExtras?: Record<string, unknown> | null;
  importSource?: string | null;
  /** Doğrulanmış/premium/vendor → özel `/kesfet/:slug`; aksi halde harita penceresi. */
  hasPublicProfile?: boolean | null;
  hasDelivery?: boolean; hasReservation?: boolean; hasOnlineOrder?: boolean;
  distance?: number; googlePlaceId?: string;
  createdAt?: string;
}
interface MapBusinessProduct {
  id: string | number;
  businessId?: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  discountedPrice?: number | string | null;
  imageUrl?: string | null;
  category?: string | null;
  isAvailable?: boolean;
}
interface Category { id: string; name: string; icon?: string; slug?: string; googlePlaceType?: string; }
interface PopularLocation { id: string; name: string; nameTr?: string; latitude: number; longitude: number; zoomLevel: number; imageUrl?: string; region?: string; districts?: string[]; }
interface GReview { authorName: string; profilePhoto?: string; rating: number; relativeTime: string; text: string; }
interface GPhoto { url: string; width: number; height: number; }
interface GoogleDetails { photos: GPhoto[]; reviews: GReview[]; hasMore: boolean; totalReviews: number; openNow?: boolean; weekdayText?: string[]; editorialSummary?: string; noKey?: boolean; }
type MapAreaBounds = { south: number; west: number; north: number; east: number };
type FirmsWildfirePoint = {
  id: string;
  latitude: number;
  longitude: number;
  source?: string;
  satellite?: string | null;
  instrument?: string | null;
  confidence?: string | number | null;
  frp?: number | null;
  brightness?: number | null;
  acqDate?: string | null;
  acqTime?: string | null;
  observedAt?: string | null;
  daynight?: string | null;
};
interface PlaceDetailsHit { lat: number; lng: number; formatted_address?: string; name?: string; photoUrl?: string; photoWidth?: number | null; photoHeight?: number | null; bounds?: MapAreaBounds | null; }
interface SearchedLocationInfo {
  id: string;
  placeId?: string;
  title: string;
  areaInfo?: string;
  address?: string;
  lat: number;
  lng: number;
  bounds?: MapAreaBounds | null;
  imageUrl?: string;
  imageUrls?: string[];
  wikiTitle?: string;
  wikiSummary?: string;
  wikiUrl?: string;
}
interface SearchedLocationWeather { label: string; status?: string; }
interface LocationCardHotelRow {
  id: string;
  name: string;
  rating?: number | null;
  reviewCount?: number | null;
  priceFrom?: number | null;
  currency?: string | null;
  stars?: number | null;
  photoUrl?: string | null;
  address?: string | null;
  source?: "hotellook" | "google_places";
  affiliateUrl?: string | null;
}
type ServerClusterFeature =
  | { kind: "cluster"; id: string; lat: number; lng: number; count: number }
  | { kind: "point"; id: string; lat: number; lng: number; business: Business };
interface TouristSpot { osmId: string; name: string; nameTr: string | null; type: string; typeLabel: string; lat: number; lng: number; address?: string | null; image?: string | null; wikidata?: string | null; }
interface LocalMapPlace {
  id: string;
  name: string;
  type: "business" | "place" | "coordinate" | "search";
  category?: string;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  categoryRawLabel?: string;
  address?: string;
  phone?: string;
  website?: string;
  lat: number;
  lng: number;
  source?: "business" | "map_center" | "selected_location" | "search" | "user_added";
  businessId?: string;
  createdAt: string;
}

type AddPlaceDraft = {
  name: string;
  type: "business" | "place";
  category: string;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  address: string;
  phone: string;
  website: string;
  lat: string;
  lng: string;
};

function boolish(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim().toLowerCase() === "true";
  return false;
}

function pickPlacesNewExtrasLite(biz: Business): Record<string, unknown> | null {
  if (!biz.googlePlacesExtras || typeof biz.googlePlacesExtras !== "object") return null;
  const root = biz.googlePlacesExtras as Record<string, unknown>;
  const nested = root.placesApiNew;
  return nested && typeof nested === "object" ? (nested as Record<string, unknown>) : root;
}

function placesCardChips(biz: Business): string[] {
  const ex = pickPlacesNewExtrasLite(biz);
  if (!ex) return [];
  const paymentOptions = ex.paymentOptions && typeof ex.paymentOptions === "object" ? (ex.paymentOptions as Record<string, unknown>) : null;
  const parkingOptions = ex.parkingOptions && typeof ex.parkingOptions === "object" ? (ex.parkingOptions as Record<string, unknown>) : null;
  const chips = [
    boolish(ex.delivery) ? "🛵 Teslimat" : "",
    boolish(ex.takeout) ? "🥡 Paket" : "",
    boolish(ex.dineIn) ? "🍽️ Mekan" : "",
    paymentOptions && (boolish(paymentOptions.acceptsCreditCards) || boolish(paymentOptions.acceptsDebitCards)) ? "💳 Kart" : "",
    paymentOptions && boolish(paymentOptions.acceptsNfc) ? "📱 Temassız" : "",
    parkingOptions && (boolish(parkingOptions.freeParkingLot) || boolish(parkingOptions.freeStreetParking)) ? "🅿️ Otopark" : "",
    boolish(ex.goodForChildren) ? "🧒 Çocuk dostu" : "",
    boolish(ex.goodForGroups) ? "👥 Grup uygun" : "",
  ].filter(Boolean);
  return chips.slice(0, 4);
}

function placesCardSummary(biz: Business): string | null {
  const ex = pickPlacesNewExtrasLite(biz);
  if (!ex) return null;
  const editorial = typeof ex.editorialSummary === "string"
    ? ex.editorialSummary
    : ex.editorialSummary && typeof ex.editorialSummary === "object" && typeof (ex.editorialSummary as Record<string, unknown>).text === "string"
      ? String((ex.editorialSummary as Record<string, unknown>).text)
      : "";
  if (editorial.trim()) return editorial.trim();
  const genObj = ex.generativeSummary && typeof ex.generativeSummary === "object" ? (ex.generativeSummary as Record<string, unknown>) : null;
  const gen = genObj?.overview && typeof genObj.overview === "object"
    ? String((genObj.overview as Record<string, unknown>).text ?? "")
    : typeof genObj?.text === "string"
      ? genObj.text
      : "";
  return gen.trim() || null;
}

function publicBusinessDescription(raw: string | null | undefined): string {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      return !/(google türleri|google haritalar|maps\.google|cid=|wheelchair|tekerlekli sandalye|erişilebilirlik|business_status|işletme durumu \(google\))/i.test(line);
    })
    .join("\n\n")
    .trim();
}

async function fetchServerPlacePredictions(input: string): Promise<{
  rows: Array<{ placeId: string; label: string }>;
  configured: boolean;
  error?: string;
}> {
  const q = input.trim();
  if (q.length < 2) return { rows: [], configured: true };
  try {
    const r = await fetch(mapApiUrl(`/map/places/autocomplete?input=${encodeURIComponent(q)}&global=1`));
    const parsed = await readJsonResponse<{ success?: boolean; configured?: boolean; data?: unknown[]; error?: string }>(r, {
      success: false,
      configured: true,
      data: [],
      error: "Öneriler şu anda kullanılamıyor.",
    });
    const d = parsed.data;
    if (d?.configured === false) {
      return { rows: [], configured: false };
    }
    const rows = Array.isArray(d?.data) ? d.data
      .map((row: { placeId?: string; label?: string }) => ({
        placeId: String(row.placeId ?? "").trim(),
        label: String(row.label ?? "").trim(),
      }))
      .filter((row: { placeId: string; label: string }) => row.placeId && row.label) : [];
    if (parsed.ok && d?.success !== false) {
      return { rows, configured: true };
    }
    return {
      rows,
      configured: true,
      error: String(d?.error ?? "Öneriler şu anda kullanılamıyor."),
    };
  } catch {
    return { rows: [], configured: true, error: "Öneriler şu anda kullanılamıyor." };
  }
}

async function geocodePlaceIdServer(placeId: string): Promise<PlaceDetailsHit | null> {
  const id = placeId.trim();
  if (!id) return null;
  try {
    const r = await fetch(mapApiUrl(`/map/places/details?placeId=${encodeURIComponent(id)}`));
    const parsed = await readJsonResponse<{ success?: boolean; data?: Record<string, unknown> | null }>(r, { success: false, data: null });
    const d = parsed.data;
    const row = d?.data;
    if (!parsed.ok || !d?.success || !row) return null;
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return null;
    const boundsRaw = row.bounds && typeof row.bounds === "object" ? row.bounds as Record<string, unknown> : null;
    const bounds = boundsRaw
      ? {
          south: Number(boundsRaw.south),
          west: Number(boundsRaw.west),
          north: Number(boundsRaw.north),
          east: Number(boundsRaw.east),
        }
      : null;
    return {
      lat,
      lng,
      formatted_address: String(row.formattedAddress ?? ""),
      name: String(row.name ?? ""),
      photoUrl: String(row.photoUrl ?? "") || undefined,
      photoWidth: Number.isFinite(Number(row.photoWidth)) ? Number(row.photoWidth) : null,
      photoHeight: Number.isFinite(Number(row.photoHeight)) ? Number(row.photoHeight) : null,
      bounds: bounds && [bounds.south, bounds.west, bounds.north, bounds.east].every(Number.isFinite) ? bounds : null,
    };
  } catch {
    return null;
  }
}

async function searchServerPlaces(input: {
  q: string;
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<{
  rows: Business[];
  configured: boolean;
  error?: string;
  skippedFiltered?: number;
}> {
  const q = input.q.trim();
  if (q.length < 2) return { rows: [], configured: true };
  try {
    const params = new URLSearchParams({ q, limit: "8" });
    if (Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
      params.set("lat", String(input.lat));
      params.set("lng", String(input.lng));
      params.set("radius", String(input.radius ?? 50000));
    }
    const r = await fetch(mapApiUrl(`/map/places/search?${params}`));
    const parsed = await readJsonResponse<{
      success?: boolean;
      configured?: boolean;
      data?: unknown[];
      error?: string;
      skippedFiltered?: number;
    }>(r, { success: false, configured: true, data: [], error: "Arama şu anda yanıt vermedi." });
    const d = parsed.data;
    const rows = Array.isArray(d?.data)
      ? d.data
        .map((p: {
          googlePlaceId?: string | null;
          name?: string | null;
          address?: string | null;
          latitude?: number | string | null;
          longitude?: number | string | null;
          rating?: number | string | null;
          userRatingsTotal?: number | string | null;
          website?: string | null;
          phone?: string | null;
          googlePlaceType?: string | null;
        }) => ({
          id: `google-preview-${p.googlePlaceId || `${p.latitude}-${p.longitude}-${p.name}`}`,
          googlePlaceId: p.googlePlaceId ?? undefined,
          name: String(p.name ?? "").trim(),
          address: String(p.address ?? "").trim(),
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          rating: Number(p.rating),
          userRatingsTotal: Number(p.userRatingsTotal),
          website: p.website ?? undefined,
          phone: p.phone ?? undefined,
          googlePlacesExtras: { previewOnly: true, googlePlaceType: p.googlePlaceType },
          description: "Yekpare arama adayı. Kaydedilmeden önce özel işletme filtresinden geçirilir.",
        } as Business))
        .filter((p: Business) => p.name && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)))
      : [];
    return {
      rows,
      configured: d?.configured !== false,
      error: !parsed.ok || d?.success === false ? String(d?.error ?? "Arama şu anda tamamlanamadı.") : undefined,
      skippedFiltered: Number(d?.skippedFiltered ?? 0),
    };
  } catch {
    return { rows: [], configured: true, error: "Google Places arama endpoint'ine ulaşılamadı." };
  }
}

type LocSug = { id: string; label: string; type: "il" | "ilce" | "mahalle" | "google"; placeId?: string; lat?: number; lng?: number; zoom?: number };
type MapSearchSug = { id: string; label: string; placeId?: string; lat?: number; lng?: number; zoom?: number; type?: "google" | "location" };
interface CityPoi { osmId: string; name: string; nameTr: string | null; type: string; typeLabel: string; lat: number; lng: number; address?: string | null; phone?: string | null; website?: string | null; }

/* ── Wiki types ── */
type WikiResult = {
  html: string | null;
  title: string;
  confidence: "exact" | "related" | "none";
  relatedTitle?: string;
  relatedHtml?: string | null;
};
type WikiDrawerState = {
  displayTitle: string;
  spotName: string;
  spotType?: string;
  location?: string;
} | null;

/** Renders encyclopedia HTML; intercepts /bilgiagaci/ links and calls onWikiLink */
function WikiHtml({ html, className = "", onWikiLink }: { html: string; className?: string; onWikiLink?: (title: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute("href") || "";
      if (href.startsWith("/bilgiagaci/") && onWikiLink) {
        const articleTitle = decodeURIComponent(href.replace("/bilgiagaci/", ""));
        onWikiLink(articleTitle);
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [html, onWikiLink]);
  return (
    <div ref={ref} className={`wiki-content text-sm text-gray-700 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
  );
}

/** Full-screen bottom drawer that loads + shows wiki content with navigation stack */
function WikiDrawer({ state, onClose }: { state: WikiDrawerState; onClose: () => void }) {
  const [data, setData] = useState<WikiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  // Navigation stack: past states we can go back to
  const [navStack, setNavStack] = useState<WikiDrawerState[]>([]);
  // Current view — starts as the passed state, can change via link clicks
  const [current, setCurrent] = useState<WikiDrawerState>(state);

  // Reset stack + current whenever a brand-new outer state is set
  useEffect(() => {
    setNavStack([]);
    setCurrent(state);
  }, [state]);

  // Navigate to a linked article (push current onto stack)
  const navigateTo = useCallback((title: string) => {
    setCurrent(prev => {
      setNavStack(s => [...s, prev]);
      return { displayTitle: title, spotName: title };
    });
  }, []);

  // Go back to previous article
  const goBack = useCallback(() => {
    setNavStack(prev => {
      const next = [...prev];
      const last = next.pop() ?? null;
      setCurrent(last);
      return next;
    });
  }, []);

  // Fetch article whenever current changes
  useEffect(() => {
    if (!current) { setData(null); setShowRelated(false); return; }
    let cancelled = false;
    setLoading(true); setData(null); setShowRelated(false);
    const params = new URLSearchParams({ spotName: current.spotName });
    if (current.spotType) params.append("spotType", current.spotType);
    if (current.location) params.append("location", current.location);
    fetch(`/api/wiki/full/${encodeURIComponent(current.spotName)}?${params}`)
      .then(r => r.json())
      .then((d: { success: boolean; data?: WikiResult }) => {
        if (!cancelled) setData(d.success && d.data ? d.data : { html: null, title: current.spotName, confidence: "none" });
      })
      .catch(() => { if (!cancelled) setData({ html: null, title: current!.spotName, confidence: "none" }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [current]);

  if (!state) return null;

  const displayedTitle = data?.confidence === "exact" ? (data.title || current?.displayTitle) : current?.displayTitle;

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="mt-auto bg-white rounded-t-3xl flex flex-col shadow-2xl" style={{ maxHeight: "90dvh", minHeight: "60dvh" }}
        onClick={e => e.stopPropagation()}>
        {/* Handle + header */}
        <div className="flex flex-col items-center pt-2 pb-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full mb-3" />
          <div className="w-full flex items-center gap-2 px-4 pb-3 border-b border-gray-100">
            {navStack.length > 0 ? (
              <button onClick={goBack}
                className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition text-indigo-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            ) : (
              <button onClick={onClose}
                className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-500 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{displayedTitle}</p>
              {navStack.length > 0 && (
                <p className="text-[10px] text-indigo-400 truncate">← {navStack[navStack.length - 1]?.displayTitle}</p>
              )}
            </div>
            {navStack.length > 0 && (
              <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-500 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-sm text-gray-500">Bilgi yükleniyor...</span>
            </div>
          )}
          {!loading && data?.confidence === "exact" && data.html && (
            <WikiHtml html={data.html} onWikiLink={navigateTo} />
          )}
          {!loading && data?.confidence === "none" && (
            <div className="flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">📖 Bilgi bulunamadı</p>
                <p className="text-xs text-amber-700">"{current?.displayTitle}" için detaylı bilgi bulunamadı.</p>
                {data.relatedTitle && !showRelated && (
                  <button onClick={() => setShowRelated(true)}
                    className="mt-2 text-xs font-bold text-indigo-600 hover:underline">
                    "{data.relatedTitle}" hakkında bilgi göster →
                  </button>
                )}
              </div>
              {showRelated && data.relatedHtml && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">{data.relatedTitle}</p>
                  <WikiHtml html={data.relatedHtml} onWikiLink={navigateTo} />
                </div>
              )}
            </div>
          )}
          {!loading && !data && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-3">📖</div>
              <p className="text-gray-600 font-semibold text-sm">Makale bulunamadı</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationWikiTab({ title, onOpenDrawer }: { title: string; onOpenDrawer: () => void }) {
  return (
    <div className="px-4 py-4 flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl">📖</div>
      <div className="text-center">
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">Detaylı Bilgi</p>
      </div>
      <button onClick={onOpenDrawer}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-lg transition hover:brightness-110"
        style={{ background: "linear-gradient(135deg,#059669,#0d9488)", boxShadow: "0 6px 18px rgba(15,118,110,0.28)" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        Makaleyi Aç
      </button>
    </div>
  );
}

/* ── Spot type emoji (module-level, stable reference) ── */
function spotIcon(type: string) {
  const M: Record<string, string> = {
    museum: "🏛️", castle: "🏰", palace: "🏯", beach: "🏖️", park: "🌳",
    viewpoint: "🔭", monument: "🗿", mosque: "🕌", church: "⛪",
    theatre: "🎭", zoo: "🦁", aquarium: "🐠", ruins: "🏚️",
    archaeological_site: "⚱️", waterfall: "💧", peak: "⛰️",
    nature_reserve: "🌿", shrine: "🕍", fort: "🏯", gallery: "🖼️",
    attraction: "⭐", historic: "🏺", theme_park: "🎡",
  };
  return M[type] || "📍";
}

/* ── City POI type emoji ── */
function poiEmoji(type: string) {
  const M: Record<string, string> = {
    // İbadet
    mosque: "🕌", church: "⛪", synagogue: "🕍", temple: "🛕", shrine: "🕍", chapel: "⛪", place_of_worship: "🕌",
    // Devlet
    townhall: "🏛️", courthouse: "⚖️", post_office: "📮", embassy: "🏛️",
    government: "🏛️", administrative: "🏢", tax: "📋", notary: "📄",
    registry: "🗂️", community_centre: "🏢", social_facility: "🤝",
    // Sağlık
    hospital: "🏥", clinic: "🏥", doctors: "👨‍⚕️", dentist: "🦷",
    pharmacy: "💊", health_post: "🏥", nursing_home: "🏠",
    // Eğitim
    school: "🏫", kindergarten: "🎒", university: "🎓", college: "🎓",
    library: "📚", driving_school: "🚗", music_school: "🎵",
    language_school: "🗣️", prep_school: "📝",
    // Güvenlik
    police: "🚔", fire_station: "🚒", prison: "🔒", barracks: "⚔️",
  };
  return M[type] || "📍";
}

/* ── Spot detail panel (module-level component so hooks work correctly) ── */
function SpotDetail({ spot, onBack, locationName, onOpenWiki, onShowOnMap }: {
  spot: TouristSpot; onBack: () => void; locationName?: string;
  onOpenWiki: (s: WikiDrawerState) => void;
  onShowOnMap: () => void;
}) {
  return (
    <div className="flex flex-col bg-white">
      {/* Header — premium gradient */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-indigo-100/60"
        style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 60%, #fdf4ff 100%)" }}>
        <button onClick={onBack}
          className="p-1.5 rounded-xl bg-white/80 hover:bg-white shadow-sm border border-indigo-100/60 text-indigo-500 hover:text-indigo-700 transition shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl shadow-md shrink-0">
          {spotIcon(spot.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-gray-900 text-sm leading-tight truncate">{spot.nameTr || spot.name}</p>
          <p className="text-[11px] text-indigo-500 font-semibold mt-0.5">{spot.typeLabel}</p>
        </div>
      </div>
      {/* Actions */}
      <div className="px-3 py-3 flex flex-col gap-2">
        {spot.address && (
          <div className="flex items-start gap-2 text-xs text-gray-600 bg-slate-50 rounded-xl px-3 py-2 ring-1 ring-gray-100">
            <span className="mt-0.5 shrink-0 text-indigo-400">📍</span>
            <span className="leading-relaxed">{spot.address}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onShowOnMap}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-white text-xs font-bold hover:opacity-90 transition shadow-md shadow-indigo-400/30"
            style={{ background: "linear-gradient(135deg,#4338ca,#6366f1)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
            Haritada Göster
          </button>
          <button
            onClick={() => onOpenWiki({ displayTitle: spot.nameTr || spot.name, spotName: spot.nameTr || spot.name, spotType: spot.type, location: locationName })}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-indigo-700 text-xs font-bold hover:opacity-90 transition border border-indigo-200 bg-indigo-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            Detaylı Bilgi
          </button>
        </div>
        <button type="button" onClick={onShowOnMap}
          className="flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          Haritada Göster
        </button>
      </div>
    </div>
  );
}

/* ── POI detail panel (module-level) ── */
const REHBER_CAT_COLORS: Record<string, string> = {
  ibadet: "#0d9488", devlet: "#2563eb", saglik: "#dc2626",
  egitim: "#7c3aed", guvenlik: "#0369a1",
};

function PoiDetail({ poi, onBack, rehberSubCat, onShowOnMap }: {
  poi: CityPoi; onBack: () => void; rehberSubCat: string;
  onShowOnMap: () => void;
}) {
  const catColor = REHBER_CAT_COLORS[rehberSubCat] || "#6366f1";
  return (
    <div className="mx-2 mt-2 mb-1 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: catColor + "12" }}>
        <button onClick={onBack}
          className="p-1.5 rounded-xl bg-white shadow-sm border border-gray-100 shrink-0"
          style={{ color: catColor }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
          style={{ background: catColor + "20" }}>
          {poiEmoji(poi.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-gray-900 text-sm leading-tight truncate">{poi.nameTr || poi.name}</p>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: catColor }}>{poi.typeLabel}</p>
        </div>
      </div>
      {/* Info */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {poi.address && (
          <div className="flex items-start gap-2 text-xs text-gray-600 bg-slate-50 rounded-xl px-3 py-2 ring-1 ring-gray-100">
            <span className="shrink-0">📍</span>
            <span className="leading-relaxed">{poi.address}</span>
          </div>
        )}
        {poi.phone && (
          <a href={`tel:${poi.phone}`}
            className="flex items-center gap-2 text-xs font-medium bg-slate-50 rounded-xl px-3 py-2 ring-1 ring-gray-100 hover:bg-slate-100 transition"
            style={{ color: catColor }}>
            <span>📞</span>{poi.phone}
          </a>
        )}
        {poi.website && (
          <a href={poi.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-medium bg-slate-50 rounded-xl px-3 py-2 ring-1 ring-gray-100 hover:bg-slate-100 transition text-blue-600 truncate">
            <span>🌐</span><span className="truncate">{poi.website.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
      </div>
      {/* Actions */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <button type="button" onClick={onShowOnMap}
          className="flex items-center justify-center gap-2 py-2.5 rounded-2xl text-white text-xs font-bold hover:opacity-90 transition shadow-md"
          style={{ background: catColor, boxShadow: `0 4px 14px ${catColor}55` }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Haritada Göster
        </button>
        <button type="button" onClick={onShowOnMap}
          className="flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-semibold border transition hover:bg-slate-50"
          style={{ color: catColor, borderColor: catColor + "40" }}>
          🗺️ Yaklaştır
        </button>
      </div>
    </div>
  );
}

type LocateButtonState = "idle" | "locating" | "error";

/** Haritada konuma git + 50 km premium yakınlık modu */
function MapLocateButton({
  onClick,
  state,
  hasLocation,
}: {
  onClick: () => void;
  state: LocateButtonState;
  hasLocation: boolean;
}) {
  const locating = state === "locating";
  const retry = state === "error";
  const compact = hasLocation && !locating && !retry;
  const label = locating ? "Konum alınıyor..." : retry ? "Tekrar dene" : compact ? "Konumuma dön" : "Beni bul";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locating}
      title={label}
      aria-label={label}
      data-state={state}
      data-compact={compact ? "true" : "false"}
      className="haritalar-locate-btn flex items-center gap-1.5 rounded-full shadow-lg transition-all active:scale-95 text-white text-xs font-bold whitespace-nowrap select-none disabled:cursor-wait"
      style={{ background: MAP_CHROME_GRAD, boxShadow: `0 4px 14px ${MAP_CHROME_SHADOW}` }}
    >
      <span className="locate-icon text-base leading-none" aria-hidden="true">{locating ? "◌" : compact ? "◎" : "📍"}</span>
      <span className="locate-label">{label}</span>
    </button>
  );
}

export type KesfetLayoutMode = "standalone" | "desktop-chrome" | "fullscreen";

export default function Kesfet({
  layout = "standalone",
  embedInHmSite = false,
}: {
  layout?: KesfetLayoutMode;
  embedInHmSite?: boolean;
}) {
  const [currentLocation, navigate] = useLocation();
  const hmCtx = useHmPublicLinkContextOptional();
  const hmPublicHref = useHmPublicHref();
  const pathOnly = (currentLocation.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  const hmSiteActive = embedInHmSite || hmCtx != null;
  const isYekpareMapsPath = isYekpareMapsHybridContentPath(pathOnly);
  const newsMapEnabled = hmSiteActive || isHaberHaritasiNewsMapPath(pathOnly);
  const mapsHybridEnabled = isYekpareMapsPath;
  const isNewsmapPage = isNewsmapPublicPath(pathOnly);
  const [newsmapKindFilter, setNewsmapKindFilter] = useState<"all" | "news" | "video" | "businesses" | "info">("news");
  /** Leaflet event handler'larında güncel sekme değeri (stale closure önlemek için). */
  const newsmapKindFilterRef = useRef(newsmapKindFilter);
  newsmapKindFilterRef.current = newsmapKindFilter;
  const [mapsContentKind, setMapsContentKind] = useState<"businesses" | "news" | "video">("businesses");
  const [bilgiAgaciPreview, setBilgiAgaciPreview] = useState<BilgiAgaciMapPreview | null>(null);
  const [newsmapMapZoom, setNewsmapMapZoom] = useState(TURKEY_DEFAULT_MAP_ZOOM);
  const [newsmapMapCenter, setNewsmapMapCenter] = useState<{ lat: number; lng: number }>({ ...TURKEY_DEFAULT_MAP_CENTER });
  const [newsmapBottomBandTab, setNewsmapBottomBandTab] = useState<NewsmapBottomBandTab>("turkce");
  const newsmapBottomBandTabManualRef = useRef(false);
  const newsmapViewportRegionRef = useRef<boolean | null>(null);
  const visitorCountryDefaultEnabled = isVisitorCountryDefaultMapPath(pathOnly);
  const linkMode: HaberHaritasiLinkMode = hmSiteActive ? "hm-editor" : "yekpare";
  const { isAuthenticated: isAdminPanelSession } = useAuth();
  const { data: siteSettings } = useGetSiteSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isNewsmapPage && !mapsHybridEnabled) return;
    prefetchNewsmapHybridNews(queryClient);
  }, [isNewsmapPage, mapsHybridEnabled, queryClient]);
  const mapsGeoEffective = useMemo(() => effectiveMapsGeocodeSettings(siteSettings ?? null), [siteSettings]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const categoryById = useMemo(() => new Map(categories.map((cat) => [cat.id, cat])), [categories]);
  type AddPlaceCategorySuggestion = {
    id?: string;
    name: string;
    slug?: string;
    icon?: string;
    source: "map" | "discover" | "common";
    groupLabel?: string;
  };
  const addPlaceCategorySuggestions = useMemo<AddPlaceCategorySuggestion[]>(() => {
    const common: AddPlaceCategorySuggestion[] = [
      { name: "Restoran", slug: "restoran", icon: "🍽️", source: "common", groupLabel: "Ortak" },
      { name: "Giyim", slug: "giyim", icon: "👕", source: "common", groupLabel: "Ortak" },
      { name: "Otel", slug: "otel", icon: "🏨", source: "common", groupLabel: "Ortak" },
      { name: "Alışveriş", slug: "alisveris", icon: "🛍️", source: "common", groupLabel: "Ortak" },
      { name: "Tamir / Servis", slug: "tamir-servis", icon: "🛠️", source: "common", groupLabel: "Ortak" },
      { name: "Kafe", slug: "kafe", icon: "☕", source: "common", groupLabel: "Ortak" },
      { name: "Eczane", slug: "eczane", icon: "💊", source: "common", groupLabel: "Ortak" },
      { name: "Market", slug: "market", icon: "🛒", source: "common", groupLabel: "Ortak" },
    ];
    const rows: AddPlaceCategorySuggestion[] = [
      ...categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        source: "map" as const,
        groupLabel: "Harita kategorisi",
      })),
      ...KESFET_DISCOVER_GROUPS.flatMap((group) => group.subcategories.map((sub) => ({
        name: sub.name,
        slug: sub.slug,
        icon: group.icon,
        source: "discover" as const,
        groupLabel: group.label,
      }))),
      ...common,
    ];
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = normalizeCategorySearch(row.id || row.slug || row.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories]);
  const [selectedLocation, setSelectedLocation] = useState<PopularLocation | null>(null);
  const [searchedLocationInfo, setSearchedLocationInfo] = useState<SearchedLocationInfo | null>(null);
  const [searchedLocationWeather, setSearchedLocationWeather] = useState<SearchedLocationWeather | null>(null);
  const [searchedLocationHotels, setSearchedLocationHotels] = useState<LocationCardHotelRow[]>([]);
  const [searchedLocationHotelAffiliateUrl, setSearchedLocationHotelAffiliateUrl] = useState<string | null>(null);
  const [searchedLocationEnrichmentLoading, setSearchedLocationEnrichmentLoading] = useState(false);
  const [searchedLocationHotelsLoading, setSearchedLocationHotelsLoading] = useState(false);
  const [locationCardPhotoIdx, setLocationCardPhotoIdx] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Arama kutusuna yazarken ağır loadBusinesses efektini her tuş vuruşunda tetiklememek için debounce.
  const searchCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitSearchDebounced = useCallback((value: string) => {
    if (searchCommitTimer.current) clearTimeout(searchCommitTimer.current);
    searchCommitTimer.current = setTimeout(() => {
      setSearch(value);
    }, 350);
  }, []);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locateButtonState, setLocateButtonState] = useState<LocateButtonState>("idle");
  const [mapCenter] = useState(TURKEY_DEFAULT_MAP_CENTER);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [detailTab, setDetailTab] = useState<"overview"|"reviews"|"info">("overview");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadIssue, setMapLoadIssue] = useState<string | null>(null);
  const [mapLayersOpen, setMapLayersOpen] = useState(false);
  const [baseMapStyle, setBaseMapStyle] = useState<"temel" | "hava_fotografi" | "gece" | "topografik" | "siyasi" | "fiziki">("temel");
  const [overlayWeather, setOverlayWeather] = useState(false);
  const [overlayEarthquake, setOverlayEarthquake] = useState(false);
  const [overlayWildfire, setOverlayWildfire] = useState(false);
  const [overlayDutyPharmacy, setOverlayDutyPharmacy] = useState(false);
  const [overlayPopulation, setOverlayPopulation] = useState(false);
  const [overlayElevation, setOverlayElevation] = useState(false);
  const [overlayRaster, setOverlayRaster] = useState(false);
  const [overlayGeodesyGrid, setOverlayGeodesyGrid] = useState(false);
  const [serverClusterEnabled, setServerClusterEnabled] = useState(() => {
    if (typeof window === "undefined") return layout === "desktop-chrome" || layout === "fullscreen";
    const path = window.location.pathname;
    if (/^\/haritalar(?:\/|$)/i.test(path) || /^\/map(?:\/|$)/i.test(path) || isHmHaritalarPublicPath(path)) return true;
    const layers = (new URLSearchParams(window.location.search).get("layers") ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (layers.includes("serverCluster")) return true;
    return layout === "desktop-chrome" || layout === "fullscreen";
  });
  const [serverClusterStats, setServerClusterStats] = useState<{ clusters: number; points: number; total: number } | null>(null);
  const [serverClusterLoading, setServerClusterLoading] = useState(false);
  const [roadStatusLayerVisible, setRoadStatusLayerVisible] = useState(false);
  const [mediaPanelMode, setMediaPanelMode] = useState<"photos" | "panorama" | null>(null);
  const [measurementActive, setMeasurementActive] = useState(false);
  const [measurementResult, setMeasurementResult] = useState<string | null>(null);
  const [mapLabelsVisible, setMapLabelsVisible] = useState(true);
  const [parcelQueryOpen, setParcelQueryOpen] = useState(true);
  const [parcelQueryLoading, setParcelQueryLoading] = useState(false);
  const [parcelResultInfo, setParcelResultInfo] = useState<string | null>(null);
  const [parcelProvinces, setParcelProvinces] = useState<Array<{ plaka?: number; adi?: string }>>([]);
  const [parcelDistricts, setParcelDistricts] = useState<Array<{ kimlikNo?: string; adi?: string }>>([]);
  const [parcelNeighborhoods, setParcelNeighborhoods] = useState<Array<{ kimlikNo?: string; adi?: string }>>([]);
  const [parcelRecentQueries, setParcelRecentQueries] = useState<Array<{
    il: string; ilce: string; mahalle: string; adres?: string; ada: string; parsel: string;
  }>>(() => {
    try {
      const raw = localStorage.getItem("ahenk_parcel_recent_queries");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  const [parcelForm, setParcelForm] = useState({
    il: "",
    ilce: "",
    mahalle: "",
    adres: "",
    ada: "",
    parsel: "",
  });
  const [parcelQueryMode, setParcelQueryMode] = useState<"ada_parsel" | "adres" | "analiz">("ada_parsel");
  const [parcelAnalysisInfo, setParcelAnalysisInfo] = useState<string | null>(null);
  const [officialLinkHealth, setOfficialLinkHealth] = useState<Record<string, { ok: boolean; statusCode: number | null; latencyMs: number }>>({});
  const [officialHealthCheckedAt, setOfficialHealthCheckedAt] = useState<number | null>(null);
  const [advancedOverlayEnabled, setAdvancedOverlayEnabled] = useState<Record<string, boolean>>({});
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  type KesfetMainSidebarTab = "temel_haritalar" | "isletmeler" | "kayitlar" | "yer_ekle" | "menu_info" | "newsmap";
  type GuzergahSubTab = "kara" | "hava" | "deniz" | "demir";
  const [leftSidebarTab, setLeftSidebarTab] = useState<KesfetMainSidebarTab>("isletmeler");
  const [geoDataTab, setGeoDataTab] = useState<"harita" | "afad" | "mgm" | "wildfire" | "population" | "tkgm" | "mta" | "kgm" | "nav">("harita");
  const [guzergahSubTab, setGuzergahSubTab] = useState<GuzergahSubTab>("kara");
  const [desktopGeoPanelOpen, setDesktopGeoPanelOpen] = useState(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return false;
    return false;
  });
  const [flightRegion, setFlightRegion] = useState<FlightRegionId>("tr");
  const [flightOperatorFilter, setFlightOperatorFilter] = useState("");
  const [flightAirportIcao, setFlightAirportIcao] = useState("");
  const [flightHideOnGround, setFlightHideOnGround] = useState(true);
  const [flightRows, setFlightRows] = useState<OpenSkyAircraft[]>([]);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [flightLastUpdate, setFlightLastUpdate] = useState<Date | null>(null);
  const [flightRefreshNonce, setFlightRefreshNonce] = useState(0);
  const [afadRows, setAfadRows] = useState<Array<{
    id: string;
    location: string;
    latitude: number;
    longitude: number;
    magnitude: number;
    depthKm: number;
    date: string;
    source?: string;
  }>>([]);
  const [mgmRows, setMgmRows] = useState<Array<{ city: string; lat: number; lng: number; temperature: number; weatherCode: number }>>([]);
  const [wildfireRows, setWildfireRows] = useState<FirmsWildfirePoint[]>([]);
  const [wildfireLoading, setWildfireLoading] = useState(false);
  const [wildfireMessage, setWildfireMessage] = useState<string | null>(null);
  const [wildfireConfigured, setWildfireConfigured] = useState<boolean | null>(null);
  const [wildfireLastUpdate, setWildfireLastUpdate] = useState<Date | null>(null);
  const [populationInfo, setPopulationInfo] = useState<{
    province?: { name: string; population: number | null; source?: string | null } | null;
    district?: { name: string; population: number | null; source?: string | null } | null;
    neighborhood?: { name: string; population: number | null; source?: string | null } | null;
    emptyStates?: string[];
  } | null>(null);
  const [populationLoading, setPopulationLoading] = useState(false);
  const [kgmStartIl, setKgmStartIl] = useState("");
  const [kgmStartIlce, setKgmStartIlce] = useState("");
  const [kgmEndIl, setKgmEndIl] = useState("");
  const [kgmEndIlce, setKgmEndIlce] = useState("");
  const [kgmStartDistricts, setKgmStartDistricts] = useState<Array<{ kimlikNo?: string; adi?: string }>>([]);
  const [kgmEndDistricts, setKgmEndDistricts] = useState<Array<{ kimlikNo?: string; adi?: string }>>([]);
  const [kgmMode, setKgmMode] = useState<"fastest" | "shortest" | "free">("fastest");
  const [kgmVehicle, setKgmVehicle] = useState<"car" | "truck">("car");
  const [kgmOptions, setKgmOptions] = useState({
    includeRoadWorks: true,
    includeClosures: true,
    includeTraffic: true,
    includePoiStops: true,
  });
  const [kgmLoading, setKgmLoading] = useState(false);
  const [kgmResult, setKgmResult] = useState<null | {
    distanceKm: number | null;
    durationMin: number | null;
    distanceText?: string;
    durationText?: string;
    routeName: string;
    directions: Array<{ text: string; lengthKm: number; timeMin: number }>;
    context?: {
      roadWorks: Array<{ name: string; lat: number; lng: number; detail?: string }>;
      closedRoads: Array<{ name: string; lat: number; lng: number; detail?: string }>;
      poiStops: Array<{ name: string; lat: number; lng: number; detail?: string }>;
      trafficLevel: "dusuk" | "orta" | "yuksek";
      trafficNote: string;
    };
  }>(null);
  const [navTargetInput, setNavTargetInput] = useState("");
  const [navStartInput, setNavStartInput] = useState("");
  const [navTargetPoint, setNavTargetPoint] = useState<{ label: string; lat: number; lng: number } | null>(null);
  const [navStartPoint, setNavStartPoint] = useState<{ label: string; lat: number; lng: number } | null>(null);
  const [navUseGpsStart, setNavUseGpsStart] = useState(true);
  const [navPanelLoading, setNavPanelLoading] = useState(false);
  const [adminLayerConfig, setAdminLayerConfig] = useState<{
    defaultOpacity?: number;
    forceAdminLayerConfig?: boolean;
    baseLayers?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
    advancedLayers?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
    overlays?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
  } | null>(null);
  const [googleDetails, setGoogleDetails] = useState<GoogleDetails | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  // Slide-out menu
  const [menuOpen, setMenuOpen] = useState(false);
  type MapMenuPanelId = "recent" | "contributions" | "timeline" | "data" | "tips" | "help" | "consumer" | "language" | "search_settings" | "wildfire";
  const [mapMenuPanel, setMapMenuPanel] = useState<MapMenuPanelId | null>(null);
  /** Kullanıcı «Beni bul» ile 50 km premium modunu açtı mı */
  const [nearby50Km, setNearby50Km] = useState(false);
  /** Türkiye geneli premium işletme sayısı (API) */
  const [turkeyPremiumCount, setTurkeyPremiumCount] = useState<number | null>(null);
  const [ilCenters, setIlCenters] = useState<{ plaka: number | null; adi: string; lat: number; lng: number; zoom: number }[]>([]);
  const haberHaritasiNews = useHmMapCityNews(
    hmSiteActive ? hmCtx?.siteId : null,
    newsMapEnabled || mapsHybridEnabled,
    ilCenters,
    linkMode,
    hmPublicHref,
    { newsmap: isNewsmapPage || mapsHybridEnabled },
  );
  const resolveBilgiAgaciHref = useCallback(
    (locationLabel: string) => resolveHaberHaritasiBilgiAgaciHref(locationLabel, linkMode, hmPublicHref),
    [linkMode, hmPublicHref],
  );
  const resolveSondakikaCityHref = useCallback(
    (locationLabel: string) => resolveHaberHaritasiSondakikaHref(locationLabel, linkMode, hmPublicHref),
    [linkMode, hmPublicHref],
  );
  /** Harita işletme süzgeci: API `homepage_super_category` */
  const [mapSuperCategory, setMapSuperCategory] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [savedBizIds, setSavedBizIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("ahenk_saved_biz") || "[]")); }
    catch { return new Set(); }
  });
  const [savedMapPlaces, setSavedMapPlaces] = useState<LocalMapPlace[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVED_MAP_PLACES_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((x) => Number.isFinite(Number(x?.lat)) && Number.isFinite(Number(x?.lng))).slice(0, 80) : [];
    } catch {
      return [];
    }
  });
  const [userAddedPlaces, setUserAddedPlaces] = useState<LocalMapPlace[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(USER_ADDED_MAP_PLACES_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((x) => Number.isFinite(Number(x?.lat)) && Number.isFinite(Number(x?.lng))).slice(0, 80) : [];
    } catch {
      return [];
    }
  });
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [addPlacePickMode, setAddPlacePickMode] = useState(false);
  const [addPlaceCategoryFocused, setAddPlaceCategoryFocused] = useState(false);
  const [addPlaceDraft, setAddPlaceDraft] = useState<AddPlaceDraft>(() => ({
    name: "",
    type: "business",
    category: "",
    address: "",
    phone: "",
    website: "",
    lat: "",
    lng: "",
  }));
  const [shareCopied, setShareCopied] = useState<string | null>(null);
  // Navigation mode
  const [navMode, setNavMode] = useState(false);
  const [navBiz, setNavBiz] = useState<Business | null>(null);
  const [navInstructions, setNavInstructions] = useState<{text:string;distance:number;type?:string}[]>([]);
  const [navStepIdx, setNavStepIdx] = useState(0);
  const [navTransport, setNavTransport] = useState<"car"|"walk"|"transit">("car");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [navEta, setNavEta] = useState<{duration:number;distance:number} | null>(null);
  /** Rota başlangıcı: gerçek kullanıcı konumu (km/süre hesabının kaynağı) */
  const [navOrigin, setNavOrigin] = useState<{ lat: number; lng: number } | null>(null);
  /** Her ulaşım tipi için süre/mesafe (Araç/Toplu Taşıma/Yürüyüş sekme etiketleri) */
  const [navModeEtas, setNavModeEtas] = useState<{
    car?: { distance: number; duration: number };
    walk?: { distance: number; duration: number };
    transit?: { distance: number; duration: number };
  }>({});
  const [navPickerBiz, setNavPickerBiz] = useState<Business | null>(null);
  const [gettingLoc, setGettingLoc] = useState(false);
  const [navLocError, setNavLocError] = useState<"denied" | "unsupported" | null>(null);
  const [navPermBlocked, setNavPermBlocked] = useState(false); // true = OS/browser permanently denied
  const [navManualMode, setNavManualMode] = useState(false);
  const [navManualInput, setNavManualInput] = useState("");
  const [navManualGeocoding, setNavManualGeocoding] = useState(false);
  const [routingLoaded, setRoutingLoaded] = useState(false);
  // Map share modal (general, from side menu)
  const [mapShareOpen, setMapShareOpen] = useState(false);
  // Show only saved businesses
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [nearbyRegisteredLoading, setNearbyRegisteredLoading] = useState(false);
  const [nearbyRegisteredLoaded, setNearbyRegisteredLoaded] = useState(false);
  const [nearbyProductsByBusiness, setNearbyProductsByBusiness] = useState<Record<string, MapBusinessProduct[]>>({});
  const [locationRegisteredCount, setLocationRegisteredCount] = useState<number | null>(null);
  const [locationRegisteredCountLoading, setLocationRegisteredCountLoading] = useState(false);
  const locationRegisteredCountSeqRef = useRef(0);
  const [backgroundImportStatus, setBackgroundImportStatus] = useState<"idle" | "preparing" | "ready">("idle");
  const [backgroundBackfillJobId, setBackgroundBackfillJobId] = useState<string | null>(null);
  // Location info panel
  const [locationWiki, setLocationWiki] = useState<{ title: string; summary: string; image?: string; url?: string } | null>(null);
  const [viewportPlaceInfo, setViewportPlaceInfo] = useState<{
    label: string;
    city: string;
    district: string;
    lat: number;
    lng: number;
    loading: boolean;
    source: "turkey_default" | "reverse_geocode";
  }>({
    label: "Türkiye",
    city: "Türkiye",
    district: "",
    lat: TURKEY_DEFAULT_MAP_CENTER.lat,
    lng: TURKEY_DEFAULT_MAP_CENTER.lng,
    loading: false,
    source: "turkey_default",
  });
  const viewportReverseGeocodeRunRef = useRef(0);
  const viewportReverseGeocodeTimerRef = useRef<number | null>(null);
  const [touristSpots, setTouristSpots] = useState<TouristSpot[]>([]);
  const [touristLoading, setTouristLoading] = useState(false);
  const [locationPanelTab, setLocationPanelTab] = useState<"businesses"|"gezilecek"|"wiki"|"kultur">("businesses");
  const [businessPanelMode, setBusinessPanelMode] = useState<"categories" | "results" | "location">("categories");
  const [kulturTopics, setKulturTopics] = useState<{ topic: string; label: string; title: string | null; summary: string | null; html: string | null }[]>([]);
  const [kulturLoading, setKulturLoading] = useState(false);
  const [citySections, setCitySections] = useState<{ key: string; label: string; icon: string; heading: string; html: string; summary: string }[]>([]);
  const [citySectionsLoading, setCitySectionsLoading] = useState(false);
  const [citySectionsTitle, setCitySectionsTitle] = useState<string | null>(null);
  const [openSectionKey, setOpenSectionKey] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null);
  const [wikiDrawer, setWikiDrawer] = useState<WikiDrawerState>(null);
  const touristMarkersRef = useRef<L.LayerGroup | null>(null);
  // Location info sub-categories
  const [rehberSubCat, setRehberSubCat] = useState<string>("gezilecek");
  const [cityPois, setCityPois] = useState<CityPoi[]>([]);
  const [cityPoisLoading, setCityPoisLoading] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<CityPoi | null>(null);
  const poiHighlightRef = useRef<L.Marker | null>(null);
  const poiMarkersRef = useRef<L.LayerGroup | null>(null);
  // Smart search (bottom panel)
  const [smartSearchOpen, setSmartSearchOpen] = useState(false);
  const [smartKeyword, setSmartKeyword] = useState("");
  const [smartLocation, setSmartLocation] = useState("");
  const [smartLocationPlaceId, setSmartLocationPlaceId] = useState<string | null>(null);
  const [smartLocationTr, setSmartLocationTr] = useState<TrAddressValue>({ city: "", district: "", mahalle: "", sokak: "" });
  // Block business fetch until URL location param is geocoded
  // Reactive URL query string — re-fires effects when URL changes within the SPA
  const urlQueryStr = useSearch();
  const browserUrlQueryStr = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : urlQueryStr;
  const [urlGeoReady, setUrlGeoReady] = useState(() => {
    if (typeof window === "undefined") return true;
    const p = new URLSearchParams(window.location.search);
    const hasCoords = p.has("lat") && (p.has("lng") || p.has("lon"));
    return !(p.get("location") || p.get("city") || p.get("place_id") || p.get("share") || hasCoords || parseYekparePlacePath(window.location.pathname));
  });
  const currentPath = typeof window !== "undefined" ? window.location.pathname : (currentLocation.split("?")[0] || "/");
  const hasExplicitMapTarget = useMemo(
    () => hasExplicitKesfetMapTarget(currentPath, browserUrlQueryStr),
    [currentPath, browserUrlQueryStr],
  );
  const isNoTargetMapMode = !hasExplicitMapTarget;
  // Race-condition guard: only the latest loadBusinesses call may commit state
  const loadIdRef = useRef(0);
  const locationImportKeyRef = useRef("");
  const viewportImportKeysRef = useRef<Set<string>>(new Set());
  const viewportImportTimerRef = useRef<number | null>(null);
  const viewportImportRunningRef = useRef(false);
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Harita moveend/zoomend → replaceState; URL effect konum aktivasyonunu atlar. */
  const mapUrlSyncFromMapRef = useRef(false);
  /** Pan/zoom URL yazımından sonra URL effect'in konum aktivasyonunu atlaması (ms). */
  const newsmapUrlSyncSuppressUntilRef = useRef(0);
  const newsmapMapViewSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [smartLoading, setSmartLoading] = useState(false);
  // Location autocomplete
  const [locSuggestions, setLocSuggestions] = useState<LocSug[]>([]);
  const [locSugOpen, setLocSugOpen] = useState(false);
  const [placesSearchHint, setPlacesSearchHint] = useState<string | null>(null);
  const locSugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locSuggestRunRef = useRef(0);
  const [mapSearchSuggestions, setMapSearchSuggestions] = useState<MapSearchSug[]>([]);
  const [mapSearchSugOpen, setMapSearchSugOpen] = useState(false);
  const mapSearchSugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapSearchSuggestRunRef = useRef(0);
  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeControlRef = useRef<any>(null);
  /** Google Routes ile çizilen rota (OSRM kontrolü değil) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navGoogleLayerRef = useRef<any>(null);
  // Detect mobile
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const baseLayersForUi = BASE_LAYER_DEFS
    .filter((d) => ["temel", "hava_fotografi", "gece", "topografik", "siyasi", "fiziki"].includes(d.id))
    .filter((d) => (adminLayerConfig?.baseLayers ? adminLayerConfig.baseLayers.some((x) => x.id === d.id && x.enabled) : true))
    .sort((a, b) => {
      const ao = adminLayerConfig?.baseLayers?.find((x) => x.id === a.id)?.sortOrder ?? 999;
      const bo = adminLayerConfig?.baseLayers?.find((x) => x.id === b.id)?.sortOrder ?? 999;
      return ao - bo;
    });
  const advancedLayersForUi = ADVANCED_OVERLAY_DEFS
    .filter((d) => (adminLayerConfig?.advancedLayers ? adminLayerConfig.advancedLayers.some((x) => x.id === d.id && x.enabled) : true))
    .sort((a, b) => {
      const ao = adminLayerConfig?.advancedLayers?.find((x) => x.id === a.id)?.sortOrder ?? 999;
      const bo = adminLayerConfig?.advancedLayers?.find((x) => x.id === b.id)?.sortOrder ?? 999;
      return ao - bo;
    });
  const canUserCustomizeLayers = adminLayerConfig?.forceAdminLayerConfig !== true;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHaritalarWakePath(window.location.pathname)) return;
    try {
      if (sessionStorage.getItem(HARITALAR_NIGHT_SCRAPER_WAKE_SESSION_KEY) === "1") return;
      sessionStorage.setItem(HARITALAR_NIGHT_SCRAPER_WAKE_SESSION_KEY, "1");
    } catch {
      /* sessionStorage yoksa yine de dene */
    }
    void fetch(mapApiUrl("/map/kesfet-night-scraper/wake?hours=2"), { method: "POST" })
      .then(async (r) => {
        if (!isAdminPanelSession || !r.ok) return;
        const d = await r.json().catch(() => null) as { success?: boolean; data?: { alreadyActive?: boolean } } | null;
        if (d?.success && !d.data?.alreadyActive) {
          console.info("[haritalar] Gece harita botu arka planda başlatıldı");
        }
      })
      .catch(() => {});
  }, [isAdminPanelSession]);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  useEffect(() => {
    if (!isMobile) return;
    setLeftSidebarTab("isletmeler");
    setGeoDataTab("harita");
    setMapLayersOpen(false);
  }, [isMobile]);
  useEffect(() => {
    if (geoDataTab !== "kgm") setGuzergahSubTab("kara");
  }, [geoDataTab]);

  useEffect(() => {
    addPlacePickModeRef.current = addPlacePickMode;
  }, [addPlacePickMode]);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const openNewsPreviewRef = useRef<(headline: import("@/lib/hmMapCityNews").HmMapCityHeadline) => void>(() => {});
  const openNewsOverlayRef = useRef<(headline: import("@/lib/hmMapCityNews").HmMapCityHeadline) => void>(() => {});
  const openNewsmapCityNewsRef = useRef<(locationLabel: string, coords?: { lat: number; lng: number; zoom?: number }) => void>(() => {});
  const activateNewsmapLocationRef = useRef<(payload: {
    lat: number;
    lng: number;
    zoom?: number;
    label: string;
    source?: string;
    kind?: "all" | "news" | "video" | "businesses" | "info";
  }) => void>(() => {});
  const selectNewsmapCityRef = useRef<(city: string) => void>(() => {});
  const newsmapPendingCityNavUntilRef = useRef(0);
  const newsmapFlyGuardRef = useRef<{ key: string; until: number }>({ key: "", until: 0 });
  const newsmapLocationExitUntilRef = useRef(0);
  const triggerNewsmapScrapeRef = useRef<(lat: number, lng: number, label: string, source: string) => void>(() => {});
  const newsmapBusinessesMode = isNewsmapPage && newsmapKindFilter === "businesses";
  const newsmapLayer = useKesfetNewsmapLayer({
    newsMapEnabled,
    mapsHybridEnabled,
    mapsContentKind,
    isNewsmapPage,
    newsmapBusinessesMode,
    urlQueryStr: browserUrlQueryStr || urlQueryStr,
    ilCenters,
    headlines: haberHaritasiNews.headlines,
    regionHeadlines: haberHaritasiNews.regionHeadlines,
    newsPool: haberHaritasiNews.regionItems,
    videoPool: haberHaritasiNews.videoItems,
    cityContentIndex: haberHaritasiNews.cityContentIndex,
    regionCityContentIndex: haberHaritasiNews.regionCityContentIndex,
    headlinesLoading: haberHaritasiNews.isLoading,
    mapLoaded,
    leafletMapRef,
    linkMode,
    hmPublicHref,
    locationQueryCoords:
      selectedLocation?.latitude != null && selectedLocation?.longitude != null
        ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
        : searchedLocationInfo?.lat != null && searchedLocationInfo?.lng != null
          ? { lat: searchedLocationInfo.lat, lng: searchedLocationInfo.lng }
          : null,
  });
  const {
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
    filteredNewsHeadlines,
    filteredCityContentIndex,
    filteredGlobalLocations,
    triggerNewsmapLocationScrape,
    applyUserNewsmapGeoFilter,
    locationContentLoading,
    locationContentEnhancing,
    locationVideoHeadlines,
    locationNewsHeadlines,
    locationVideosLoading,
    locationNewsLoading,
  } = newsmapLayer;
  openNewsPreviewRef.current = openNewsPreview;
  openNewsOverlayRef.current = openNewsOverlay;
  selectNewsmapCityRef.current = selectNewsmapCity;
  triggerNewsmapScrapeRef.current = triggerNewsmapLocationScrape;

  const registerNewsmapVideoIfNeeded = useCallback((headline: HmMapCityHeadline) => {
    if (headline.kind === "video" && headline.videoId) {
      void registerNewsmapVideoPlay(
        headline.videoId,
        newsmapLocationVideoCategorySlug(selectedNewsmapCity || headline.city),
      );
    }
  }, [selectedNewsmapCity]);

  const handleNewsReadMore = useCallback((headline: HmMapCityHeadline) => {
    registerNewsmapVideoIfNeeded(headline);
    expandNewsPreview(headline);
  }, [expandNewsPreview, registerNewsmapVideoIfNeeded]);

  const closeBilgiAgaciPreview = useCallback(() => setBilgiAgaciPreview(null), []);

  useEffect(() => {
    if (newsPreviewHeadline || newsOverlayHeadline) setBilgiAgaciPreview(null);
  }, [newsOverlayHeadline, newsPreviewHeadline]);

  useEffect(() => {
    if (!newsPreviewHeadline && !newsOverlayHeadline) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector(".haritalar-left-panel__scroll")?.scrollTo?.({ top: 0, behavior: "auto" });
    document.querySelector(".hm-vitrin-main")?.scrollTo?.({ top: 0, behavior: "auto" });
  }, [newsOverlayHeadline, newsPreviewHeadline]);

  useEffect(() => {
    if (!isNewsmapPage && !mapsHybridEnabled) return;
    if (!selectedNewsmapCity && !selectedLocation) return;
    setBusinesses([]);
  }, [isNewsmapPage, mapsHybridEnabled, selectedLocation?.id, selectedNewsmapCity]);

  const handleNewsmapHeadlineActivate = useCallback((headline: HmMapCityHeadline) => {
    registerNewsmapVideoIfNeeded(headline);
    if (isNewsmapPage && headline.kind === "video") {
      setNewsmapKindFilter("video");
      setMenuOpen(false);
      setDesktopGeoPanelOpen(false);
    }
    openNewsOverlay(headline);
  }, [isNewsmapPage, openNewsOverlay, registerNewsmapVideoIfNeeded]);

  useEffect(() => {
    if (!newsMapEnabled || !isNewsmapPage || !mapLoaded || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const syncMapView = () => {
      if (newsmapMapViewSyncTimerRef.current) clearTimeout(newsmapMapViewSyncTimerRef.current);
      newsmapMapViewSyncTimerRef.current = setTimeout(() => {
        setNewsmapMapZoom(map.getZoom());
        const center = map.getCenter();
        setNewsmapMapCenter({ lat: center.lat, lng: center.lng });
      }, 200);
    };
    syncMapView();
    map.on("zoomend moveend", syncMapView);
    return () => {
      map.off("zoomend moveend", syncMapView);
      if (newsmapMapViewSyncTimerRef.current) clearTimeout(newsmapMapViewSyncTimerRef.current);
    };
  }, [newsMapEnabled, isNewsmapPage, mapLoaded]);

  useEffect(() => {
    if (!isNewsmapPage) return;
    const inTrKktc = isNewsmapTurkeyOrKktcViewport(newsmapMapCenter.lat, newsmapMapCenter.lng);
    const prev = newsmapViewportRegionRef.current;
    if (prev === null || prev !== inTrKktc) {
      newsmapViewportRegionRef.current = inTrKktc;
      newsmapBottomBandTabManualRef.current = false;
      setNewsmapBottomBandTab(defaultNewsmapBottomBandTab(newsmapMapCenter));
      return;
    }
    if (!newsmapBottomBandTabManualRef.current) {
      setNewsmapBottomBandTab(defaultNewsmapBottomBandTab(newsmapMapCenter));
    }
  }, [isNewsmapPage, newsmapMapCenter]);

  const handleNewsmapBottomBandTabChange = useCallback((tab: NewsmapBottomBandTab) => {
    newsmapBottomBandTabManualRef.current = true;
    setNewsmapBottomBandTab(tab);
  }, []);

  const openNewsmapSidebar = useCallback(() => {
    if (isNewsmapPage && newsmapKindFilterRef.current !== "businesses") return;
    setLeftSidebarTab("newsmap");
    setDesktopGeoPanelOpen(true);
    if (isMobile) setMenuOpen(true);
  }, [isMobile, isNewsmapPage]);

  /** Tek giriş — programatik uçuş; URL sync / zoom döngüsünü tetiklemez. */
  const flyNewsmapMapTo = useCallback((lat: number, lng: number, zoom: number) => {
    const map = leafletMapRef.current;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const safeZoom = Math.max(
      NEWSMAP_CLUSTER_MAX_ZOOM + 1,
      Math.min(14, Math.round(Number.isFinite(zoom) ? zoom : 10)),
    );
    const flyKey = `${lat.toFixed(5)}:${lng.toFixed(5)}:${safeZoom}`;
    const now = Date.now();
    const center = map.getCenter();
    const currentZoom = map.getZoom();
    const alreadyThere =
      Math.abs(center.lat - lat) < 0.00015 &&
      Math.abs(center.lng - lng) < 0.00015 &&
      Math.abs(currentZoom - safeZoom) < 0.25;
    if (alreadyThere) {
      newsmapFlyGuardRef.current = { key: flyKey, until: now + 2000 };
      newsmapUrlSyncSuppressUntilRef.current = now + 2500;
      mapUrlSyncFromMapRef.current = true;
      return true;
    }
    if (newsmapFlyGuardRef.current.key === flyKey && now < newsmapFlyGuardRef.current.until) {
      return true;
    }
    if (now < newsmapFlyGuardRef.current.until && newsmapFlyGuardRef.current.key !== flyKey) {
      return false;
    }
    newsmapFlyGuardRef.current = { key: flyKey, until: now + 5000 };
    newsmapPendingCityNavUntilRef.current = now + 8000;
    newsmapUrlSyncSuppressUntilRef.current = now + 5000;
    mapUrlSyncFromMapRef.current = true;
    hasUserNavigatedRef.current = true;
    setNewsmapMapZoom(safeZoom);
    setNewsmapMapCenter({ lat, lng });
    map.stop();
    map.flyTo([lat, lng], safeZoom, { animate: true, duration: 0.85 });
    return true;
  }, []);

  const activateNewsmapLocation = useCallback((payload: {
    lat: number;
    lng: number;
    zoom?: number;
    label: string;
    source?: string;
    kind?: "all" | "news" | "video" | "businesses" | "info";
  }) => {
    const now = Date.now();
    const fromUrl = String(payload.source ?? "").startsWith("url_");
    if (now < newsmapLocationExitUntilRef.current) return;
    if (fromUrl && now < newsmapUrlSyncSuppressUntilRef.current) return;
    if (fromUrl && mapUrlSyncFromMapRef.current) return;
    const rawLabel = String(payload.label ?? "").trim() || "Konum";
    const inTrKktc = isNewsmapTurkeyOrKktcViewport(payload.lat, payload.lng);
    const ilMatch = inTrKktc ? resolveIlCenterFromSearchQuery(rawLabel, ilCenters) : null;
    const cityGuess = ilMatch?.adi || rawLabel.split(",")[0]?.trim() || rawLabel;
    const locCtx = resolveNewsmapLocationContext(rawLabel);
    const panelCityLabel =
      locCtx.countryLabel && locCtx.cityKey !== locCtx.countryKey
        ? `${locCtx.cityLabel}, ${locCtx.countryLabel}`
        : cityGuess;
    const lat = ilMatch?.lat ?? payload.lat;
    const lng = ilMatch?.lng ?? payload.lng;
    const targetZoom = Math.max(
      payload.zoom ?? ilMatch?.zoom ?? 10,
      NEWSMAP_CLUSTER_MAX_ZOOM + 1,
    );
    flyNewsmapMapTo(lat, lng, targetZoom);
    applyUserNewsmapGeoFilter(lat, lng);
    triggerNewsmapLocationScrape(lat, lng, buildLocationBusinessScrapeLabel(locCtx), payload.source ?? "newsmap_location");
    const locId = `newsmap-loc-${lat.toFixed(5)}-${lng.toFixed(5)}`;
    setSelectedLocation({
      id: locId,
      name: rawLabel,
      nameTr: cityGuess,
      latitude: lat,
      longitude: lng,
      zoomLevel: targetZoom,
    });
    setSearchedLocationInfo({
      id: locId,
      title: cityGuess,
      lat,
      lng,
    });
    setSearchedLocationWeather(null);
    setSearchedLocationHotels([]);
    setSearchedLocationHotelAffiliateUrl(null);
    setLocationRegisteredCount(null);
    selectNewsmapCity(panelCityLabel);
    setNewsmapKindFilter(payload.kind ?? "all");
    void fetchPlacesPreviewForLocation({
      lat,
      lng,
      q: buildPlacesPreviewQuery(cityGuess),
      radius: 25_000,
      regionCode: resolveNewsmapBusinessLocationScope({
        selectedNewsmapCity: cityGuess,
        selectedLocation: { name: rawLabel, nameTr: cityGuess, latitude: lat, longitude: lng },
        ilCenters,
        globalLocations: filteredGlobalLocations,
      })?.countryCode,
    }).then((previewRows) => {
      if (previewRows.length === 0) return;
      setBusinesses((prev) => {
        const withDist = previewRows.map((p) => ({
          ...p,
          distance: p.latitude && p.longitude
            ? distanceKm(lat, lng, p.latitude, p.longitude)
            : 999,
        })) as Business[];
        return applyVisitorDistancesToBusinesses(
          mergeBusinessesWithPlacesPreview(prev, withDist),
          resolveUserDistanceOrigin(),
        );
      });
    });
    triggerSilentRegionBusinessScrape({ lat, lng, label: buildLocationBusinessScrapeLabel(locCtx) });
    if (isNewsmapPage && (payload.kind === "video" || payload.kind === "all" || payload.kind === "news" || payload.kind === "info")) {
      setMenuOpen(false);
      setDesktopGeoPanelOpen(false);
    } else {
      openNewsmapSidebar();
    }
  }, [
    applyUserNewsmapGeoFilter,
    flyNewsmapMapTo,
    ilCenters,
    isNewsmapPage,
    openNewsmapSidebar,
    selectNewsmapCity,
    triggerNewsmapLocationScrape,
    filteredGlobalLocations,
  ]);

  activateNewsmapLocationRef.current = activateNewsmapLocation;

  const openNewsmapCityNews = useCallback((
    locationLabel: string,
    coords?: { lat: number; lng: number; zoom?: number },
  ) => {
    const label = String(locationLabel ?? "").trim();
    if (!label) return;
    if (coords) {
      activateNewsmapLocation({
        lat: coords.lat,
        lng: coords.lng,
        zoom: coords.zoom,
        label,
        source: "city_news_link",
      });
      return;
    }
    selectNewsmapCity(label);
    openNewsmapSidebar();
  }, [activateNewsmapLocation, openNewsmapSidebar, selectNewsmapCity]);

  openNewsmapCityNewsRef.current = openNewsmapCityNews;

  const closeLeftResultsPanel = useCallback((ev?: { stopPropagation?: () => void }) => {
    ev?.stopPropagation?.();
    setDesktopGeoPanelOpen(false);
    setMenuOpen(false);
  }, []);

  const handleNewsmapLocationSelect = useCallback((payload: NewsmapLocationSelectPayload) => {
    activateNewsmapLocation({
      lat: payload.lat,
      lng: payload.lng,
      zoom: payload.zoom,
      label: payload.label,
      source: "newsmap_search",
    });
  }, [activateNewsmapLocation]);

  const applyNewsmapKindFilter = useCallback((next: "all" | "news" | "video" | "businesses" | "info") => {
    const effective = isNewsmapPage && next === "businesses" ? "news" : next;
    setNewsmapKindFilter(effective);
    if (effective === "all") clearSelectedNewsmapCity();
    closeNewsPreview();
    closeNewsOverlay();
    if (mapsHybridEnabled && !isNewsmapPage) {
      // /maps hibrit: içerik katmanı + sidebar `mapsContentKind` okur; chip ile senkron tut.
      // (Bilgi modu newsmapKindFilter üzerinden sürer, mapsContentKind'e dokunma.)
      // Panel/çekmece de açılmalı — özellikle mobilde chip'e basınca liste görünmüyordu.
      if (next === "news" || next === "video") {
        setMapsContentKind(next);
        setLeftSidebarTab("newsmap");
        setDesktopGeoPanelOpen(true);
        if (isMobile) setMenuOpen(true);
      } else if (next === "all" || next === "businesses") {
        setMapsContentKind("businesses");
        if (next === "businesses") {
          setLeftSidebarTab("isletmeler");
          setSelectedBiz(null);
          setBusinessPanelMode("results");
          setDesktopGeoPanelOpen(true);
          if (isMobile) setMenuOpen(true);
        }
      }
      return;
    }
    if (!isNewsmapPage) return;
    setMenuOpen(false);
    setDesktopGeoPanelOpen(false);
  }, [clearSelectedNewsmapCity, closeNewsOverlay, closeNewsPreview, isMobile, isNewsmapPage, mapsHybridEnabled]);

  const handleNewsmapShowAll = useCallback(() => {
    applyNewsmapKindFilter("all");
  }, [applyNewsmapKindFilter]);

  const openNewsmapLocationPanelForCity = useCallback((
    cityLabel: string,
    kind: "all" | "news" | "video" | "businesses" | "info",
    sourceHeadline?: HmMapCityHeadline | null,
  ) => {
    const label = cityLabel.split(",")[0]?.trim() || cityLabel;
    if (!label) return;
    const coords = resolveNewsmapLocationCoords(
      label,
      ilCenters,
      filteredGlobalLocations,
      sourceHeadline,
      selectedLocation
        ? {
            lat: selectedLocation.latitude,
            lng: selectedLocation.longitude,
            zoom: selectedLocation.zoomLevel,
          }
        : searchedLocationInfo?.lat != null && searchedLocationInfo?.lng != null
          ? { lat: searchedLocationInfo.lat, lng: searchedLocationInfo.lng }
          : null,
    );
    if (coords) {
      activateNewsmapLocation({
        lat: coords.lat,
        lng: coords.lng,
        zoom: coords.zoom,
        label,
        source: "location_panel",
        kind,
      });
      closeNewsOverlay();
      closeNewsPreview();
      return;
    }
    newsmapPendingCityNavUntilRef.current = Date.now() + 8000;
    selectNewsmapCity(label);
    setNewsmapKindFilter(kind);
    closeNewsOverlay();
    closeNewsPreview();
    if (!isNewsmapPage || kind === "businesses") {
      openNewsmapSidebar();
    }
  }, [
    activateNewsmapLocation,
    closeNewsOverlay,
    closeNewsPreview,
    filteredGlobalLocations,
    ilCenters,
    openNewsmapSidebar,
    isNewsmapPage,
    searchedLocationInfo?.lat,
    searchedLocationInfo?.lng,
    selectNewsmapCity,
    selectedLocation,
  ]);

  const handleNewsmapCityActivate = useCallback((
    headline: HmMapCityHeadline,
    kind?: "all" | "news" | "video" | "businesses" | "info",
  ) => {
    const effectiveKind =
      kind ??
      (headline.kind === "video" ? "video" : headline.kind === "news" ? "news" : "all");
    openNewsmapLocationPanelForCity(headline.city, effectiveKind, headline);
  }, [openNewsmapLocationPanelForCity]);

  const resolveMapsLocationCityLabel = useCallback(() => resolveMapLocationDisplayLabel(
    selectedNewsmapCity,
    searchedLocationInfo?.title,
    selectedLocation?.nameTr,
    selectedLocation?.name,
    viewportPlaceInfo.city,
    viewportPlaceInfo.label,
    smartLocation,
  ), [selectedNewsmapCity, searchedLocationInfo?.title, selectedLocation, viewportPlaceInfo.city, viewportPlaceInfo.label, smartLocation]);

  const handleNewsmapLocationTabChange = useCallback((tab: NewsmapLocationPanelTab) => {
    if (mapsHybridEnabled && !isNewsmapPage) {
      closeNewsPreview();
      closeNewsOverlay();
      if (tab === "businesses") {
        setMapsContentKind("businesses");
        setLeftSidebarTab("isletmeler");
        setSelectedBiz(null);
        setBusinessPanelMode("results");
        setLocationPanelTab("businesses");
        if (isMobile) setMenuOpen(true);
        else setDesktopGeoPanelOpen(true);
        return;
      }
      const cityLabel = resolveMapsLocationCityLabel();
      if (cityLabel) selectNewsmapCity(cityLabel.split(",")[0]?.trim() || cityLabel);
      setLeftSidebarTab("newsmap");
      setDesktopGeoPanelOpen(true);
      if (isMobile) setMenuOpen(true);
      if (tab === "news") {
        setMapsContentKind("news");
        setNewsmapKindFilter("news");
        return;
      }
      if (tab === "video") {
        setMapsContentKind("video");
        setNewsmapKindFilter("video");
        return;
      }
      setNewsmapKindFilter("info");
      return;
    }
    applyNewsmapKindFilter(tab === "news" ? "news" : tab === "video" ? "video" : tab === "info" ? "info" : "news");
  }, [
    applyNewsmapKindFilter,
    closeNewsOverlay,
    closeNewsPreview,
    isMobile,
    isNewsmapPage,
    mapsHybridEnabled,
    resolveMapsLocationCityLabel,
    selectNewsmapCity,
  ]);

  const newsmapLocationPanelTab = useMemo((): NewsmapLocationPanelTab => {
    if (mapsHybridEnabled && !isNewsmapPage) {
      if (newsmapKindFilter === "info") return "info";
      if (mapsContentKind === "news") return "news";
      if (mapsContentKind === "video") return "video";
      return "businesses";
    }
    if (newsmapKindFilter === "video") return "video";
    if (newsmapKindFilter === "businesses" && !isNewsmapPage) return "businesses";
    if (newsmapKindFilter === "info") return "info";
    return "news";
  }, [isNewsmapPage, mapsContentKind, mapsHybridEnabled, newsmapKindFilter]);

  const showNewsmapLocationCityCard = Boolean(
    selectedNewsmapCity && (isNewsmapPage || mapsHybridEnabled),
  );

  const openNewsmapBilgiFromBottomBand = useCallback(() => {
    applyNewsmapKindFilter("info");
  }, [applyNewsmapKindFilter]);

  useEffect(() => {
    const hybridMaps = mapsHybridEnabled && mapsContentKind !== "businesses";
    const newsmapViewport =
      isNewsmapPage && newsmapMapZoom > NEWSMAP_CLUSTER_MAX_ZOOM && !newsmapBusinessesMode;
    if (!hybridMaps && !newsmapViewport) return;
    /**
     * Şehir zaten seçiliyken reverse-geocode etiketi her değiştiğinde yeniden seçme:
     * "Ankara" ↔ "Çankaya" gibi etiket salınımları sol kutu ile haber listesini
     * sürekli değiştirip titretiyordu. Yalnızca seçim boşken viewport'tan doldur.
     */
    if (selectedNewsmapCity) return;
    let cityLabel = resolveMapsLocationCityLabel();
    if (!cityLabel && isNewsmapPage && ilCenters.length > 0) {
      const center = leafletMapRef.current?.getCenter() ?? newsmapMapCenter;
      cityLabel = resolveNearestTurkishProvinceFromCoords(center.lat, center.lng, ilCenters) ?? "";
    }
    if (!cityLabel) return;
    selectNewsmapCity(cityLabel.split(",")[0]?.trim() || cityLabel);
  }, [
    ilCenters,
    isNewsmapPage,
    mapsContentKind,
    mapsHybridEnabled,
    newsmapBusinessesMode,
    newsmapMapCenter,
    newsmapMapZoom,
    selectedNewsmapCity,
    viewportPlaceInfo.city,
    viewportPlaceInfo.label,
    resolveMapsLocationCityLabel,
    selectNewsmapCity,
  ]);

  useEffect(() => {
    if (!isNewsmapPage) return;
    if (newsmapKindFilter !== "businesses") return;
    if (newsmapMapZoom < NEWSMAP_SCRAPE_MIN_ZOOM) {
      if (mapLoaded) {
        hasUserNavigatedRef.current = true;
        void loadBusinesses();
      }
      return;
    }
    hasUserNavigatedRef.current = true;
    void loadBusinesses();
    const map = leafletMapRef.current;
    if (map) {
      const center = map.getCenter();
      triggerNewsmapLocationScrape(center.lat, center.lng, "Harita görünümü", "newsmap_businesses_zoom");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewsmapPage, newsmapKindFilter, newsmapMapZoom, mapLoaded]);

  useEffect(() => {
    if (!isNewsmapPage || !newsmapBusinessesMode) return;
    if (selectedNewsmapCity) {
      openNewsmapSidebar();
      setBusinessPanelMode("results");
      hasUserNavigatedRef.current = true;
      void loadBusinesses();
      return;
    }
    setLeftSidebarTab("isletmeler");
    setBusinessPanelMode("results");
    setDesktopGeoPanelOpen(true);
    const zoom = leafletMapRef.current?.getZoom() ?? newsmapMapZoom;
    setServerClusterEnabled(zoom < NEWSMAP_SCRAPE_MIN_ZOOM);
    hasUserNavigatedRef.current = true;
    void loadBusinesses();
    const map = leafletMapRef.current;
    if (map && zoom >= NEWSMAP_SCRAPE_MIN_ZOOM) {
      const center = map.getCenter();
      triggerNewsmapLocationScrape(center.lat, center.lng, "Harita görünümü", "newsmap_businesses_enter");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewsmapPage, newsmapBusinessesMode]);

  useEffect(() => {
    if (!isNewsmapPage || !newsmapBusinessesMode || !mapLoaded || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const syncClusterMode = () => {
      setServerClusterEnabled(map.getZoom() < NEWSMAP_SCRAPE_MIN_ZOOM);
    };
    syncClusterMode();
    map.on("zoomend", syncClusterMode);
    return () => {
      map.off("zoomend", syncClusterMode);
    };
  }, [isNewsmapPage, newsmapBusinessesMode, mapLoaded]);

  useEffect(() => {
    if (!isNewsmapPage || !newsmapBusinessesMode || !mapLoaded || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    let timer: number | null = null;
    const scheduleReload = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        hasUserNavigatedRef.current = true;
        void loadBusinesses();
        const zoom = map.getZoom();
        if (zoom >= NEWSMAP_SCRAPE_MIN_ZOOM) {
          const center = map.getCenter();
          triggerNewsmapLocationScrape(center.lat, center.lng, "Harita görünümü", "newsmap_businesses_pan");
        }
      }, 650);
    };
    map.on("moveend", scheduleReload);
    return () => {
      map.off("moveend", scheduleReload);
      if (timer) window.clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewsmapPage, newsmapBusinessesMode, mapLoaded]);

  useEffect(() => {
    if (!isNewsmapPage || !selectedNewsmapCity) return;
    if (newsmapKindFilter !== "businesses") return;
    hasUserNavigatedRef.current = true;
    void loadBusinesses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewsmapPage, selectedNewsmapCity, newsmapKindFilter]);

  useEffect(() => {
    if (!isNewsmapPage || !selectedNewsmapCity) return;
    hasUserNavigatedRef.current = true;
    void loadBusinesses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewsmapPage, selectedNewsmapCity, selectedLocation?.id]);

  useEffect(() => {
    if (!mapsHybridEnabled || isNewsmapPage) return;
    if (!selectedNewsmapCity && !selectedLocation) return;
    hasUserNavigatedRef.current = true;
    void loadBusinesses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsHybridEnabled, isNewsmapPage, selectedNewsmapCity, selectedLocation?.id, mapLoaded]);

  const newsmapAutoVideoFallbackCityRef = useRef<string | null>(null);
  useEffect(() => {
    newsmapAutoVideoFallbackCityRef.current = null;
  }, [selectedNewsmapCity]);

  const newsmapCoordIndex = useMemo(
    () => buildHaberHaritasiCoordIndex(ilCenters),
    [ilCenters],
  );

  const newsmapCoverageContentIndex = useMemo(
    () => mergeHmMapCityContentIndexes(
      haberHaritasiNews.regionCityContentIndex,
      filteredCityContentIndex,
    ),
    [filteredCityContentIndex, haberHaritasiNews.regionCityContentIndex],
  );

  const newsmapDisplayHeadlines = useMemo(() => {
    if (!isNewsmapPage || newsmapBusinessesMode) return [];
    const kindFilter =
      newsmapKindFilter === "news" || newsmapKindFilter === "video" ? newsmapKindFilter : "all";
    if (
      !selectedNewsmapCity &&
      newsmapMapZoom <= NEWSMAP_CLUSTER_MAX_ZOOM &&
      (newsmapKindFilter === "all" || newsmapKindFilter === "news" || newsmapKindFilter === "video")
    ) {
      return buildNewsmapCountryClusterHeadlines(newsmapCoverageContentIndex, newsmapCoordIndex, {
        kindFilter,
      });
    }
    const base =
      newsmapKindFilter === "all" || newsmapKindFilter === "businesses"
        ? filteredNewsHeadlines
        : filteredNewsHeadlines.filter((row) => row.kind === newsmapKindFilter);
    if (!selectedNewsmapCity || locationVideoHeadlines.length === 0) return base;
    const cityKey = normalizeHmMapCityKey(selectedNewsmapCity);
    const cityVideos = locationVideoHeadlines.filter(
      (row) => normalizeHmMapCityKey(row.city) === cityKey || cityKey.includes(normalizeHmMapCityKey(row.city)),
    );
    if (cityVideos.length === 0) return base;
    const merged = new Map<string, HmMapCityHeadline>();
    for (const row of [...cityVideos, ...base]) {
      merged.set(`${row.kind}:${row.href}`, row);
    }
    const rows = [...merged.values()].sort(
      (a, b) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0),
    );
    if (newsmapKindFilter === "news") return rows.filter((row) => row.kind === "news");
    if (newsmapKindFilter === "video") return rows.filter((row) => row.kind === "video");
    return rows;
  }, [
    filteredNewsHeadlines,
    isNewsmapPage,
    locationVideoHeadlines,
    newsmapBusinessesMode,
    newsmapCoverageContentIndex,
    newsmapCoordIndex,
    newsmapKindFilter,
    newsmapMapZoom,
    selectedNewsmapCity,
  ]);

  const newsmapSidebarLocationLabel = useMemo(
    () => resolveMapLocationDisplayLabel(
      selectedNewsmapCity,
      searchedLocationInfo?.title,
      viewportPlaceInfo.city,
      viewportPlaceInfo.label,
    ) || null,
    [selectedNewsmapCity, searchedLocationInfo?.title, viewportPlaceInfo.city, viewportPlaceInfo.label],
  );

  const newsmapSidebarMode = useMemo((): "all" | "news" | "video" => {
    if (newsmapKindFilter === "news" || newsmapKindFilter === "video") return newsmapKindFilter;
    return "all";
  }, [newsmapKindFilter]);

  const mapsPanelHeadlines = useMemo(() => {
    if (!mapsHybridEnabled || mapsContentKind === "businesses") return [];
    const cityLabel = resolveMapsLocationCityLabel();
    const base = cityLabel
      ? filteredNewsHeadlines.filter((row) => {
          const cityKey = normalizeHmMapCityKey(cityLabel.split(",")[0]?.trim() || cityLabel);
          return normalizeHmMapCityKey(row.city) === cityKey;
        })
      : filteredNewsHeadlines;
    if (mapsContentKind === "news") return base.filter((row) => row.kind === "news");
    if (mapsContentKind === "video") return base.filter((row) => row.kind === "video");
    return base;
  }, [filteredNewsHeadlines, mapsContentKind, mapsHybridEnabled, resolveMapsLocationCityLabel]);

  const mapsSidebarMode = useMemo((): "all" | "news" | "video" => {
    if (mapsContentKind === "news") return "news";
    if (mapsContentKind === "video") return "video";
    return "all";
  }, [mapsContentKind]);

  const newsmapCityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [key, count] of haberHaritasiNews.cityNewsCounts) {
      counts.set(key, count);
    }
    for (const row of newsmapDisplayHeadlines) {
      const key = normalizeHmMapCityKey(row.city);
      counts.set(key, Math.max(counts.get(key) ?? 0, (counts.get(key) ?? 0) + 1));
    }
    return counts;
  }, [haberHaritasiNews.cityNewsCounts, newsmapDisplayHeadlines]);

  const newsmapVideoCityCounts = haberHaritasiNews.cityVideoCounts;

  const newsmapMarkerContentIndex = useMemo(() => {
    const source = newsmapKindFilter === "all"
      ? newsmapCoverageContentIndex
      : filteredCityContentIndex;
    if (!isNewsmapPage || newsmapBusinessesMode || newsmapKindFilter === "all") return source;
    const out = new Map<string, import("@/lib/hmMapCityNews").HmMapCityContentMatch>();
    for (const [key, match] of source) {
      if (match.kind === newsmapKindFilter) out.set(key, match);
    }
    return out;
  }, [filteredCityContentIndex, isNewsmapPage, newsmapCoverageContentIndex, newsmapKindFilter, newsmapBusinessesMode]);

  useEffect(() => {
    if (!isNewsmapPage || newsmapBusinessesMode || !mapLoaded || !leafletMapRef.current || !selectedNewsmapCity) return;
    const map = leafletMapRef.current;
    const onMoveEnd = () => {
      if (Date.now() < newsmapPendingCityNavUntilRef.current) return;
      /* Kart açıkça bir sekmeyle (Haberler/Videolar/…) açıldıysa pan sonrası otomatik kapatma. */
      if (newsmapKindFilterRef.current !== "all") return;
      const key = normalizeHmMapCityKey(selectedNewsmapCity);
      const coord = newsmapCoordIndex.get(key);
      const anchorLat = coord?.lat ?? selectedLocation?.latitude ?? searchedLocationInfo?.lat;
      const anchorLng = coord?.lng ?? selectedLocation?.longitude ?? searchedLocationInfo?.lng;
      if (!Number.isFinite(anchorLat) || !Number.isFinite(anchorLng)) return;
      const center = map.getCenter();
      const filter = newsmapGeoFilterFromMapView(center, map.getZoom());
      if (!isWithinNewsmapRadius(anchorLat as number, anchorLng as number, filter)) {
        clearSelectedNewsmapCity();
      }
    };
    map.on("moveend", onMoveEnd);
    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [
    clearSelectedNewsmapCity,
    isNewsmapPage,
    mapLoaded,
    newsmapBusinessesMode,
    newsmapCoordIndex,
    searchedLocationInfo?.lat,
    searchedLocationInfo?.lng,
    selectedLocation?.latitude,
    selectedLocation?.longitude,
    selectedNewsmapCity,
  ]);

  useEffect(() => {
    if (!newsMapEnabled && !mapsHybridEnabled) return;
    if (!mapLoaded || ilCenters.length === 0 || haberHaritasiNews.isLoading) return;
    const covered = new Set(newsmapCoverageContentIndex.keys());
    queueNewsmapMissingProvinceBackfill(ilCenters, covered);
  }, [
    haberHaritasiNews.isLoading,
    ilCenters,
    mapLoaded,
    mapsHybridEnabled,
    newsMapEnabled,
    newsmapCoverageContentIndex,
  ]);

  useEffect(() => {
    if (!isNewsmapPage || newsmapKindFilter !== "all") return;
    if (newsmapMapZoom >= NEWSMAP_SCRAPE_MIN_ZOOM) return;
    setServerClusterEnabled(true);
  }, [isNewsmapPage, newsmapKindFilter, newsmapMapZoom]);

  const mapContentLayerState = useMapContentLayerMapState({
    newsMapEnabled,
    mapsHybridEnabled,
    isNewsmapPage,
    newsmapBusinessesMode,
    filteredNewsHeadlines,
    newsmapDisplayHeadlines,
    newsmapMarkerContentIndex,
    filteredCityContentIndex,
    resolveMapsLocationCityLabel,
  });
  const {
    mapContentLayers,
    toggleMapContentLayer,
    syncMapContentLayersForKind,
    newsmapShowCallouts,
    showBilgiAgaciMapLayer,
    effectiveMarkerContentIndex,
    contentCalloutHeadlines,
    filterHeadlinesForLayers,
    activeContentLayerCount,
  } = mapContentLayerState;
  useEffect(() => {
    if (!isNewsmapPage && !mapsHybridEnabled) return;
    syncMapContentLayersForKind(newsmapKindFilter);
  }, [isNewsmapPage, mapsHybridEnabled, newsmapKindFilter, syncMapContentLayersForKind]);

  const newsmapInfoMode = (isNewsmapPage || mapsHybridEnabled) && newsmapKindFilter === "info";
  const showBilgiAgaciOnMap = showBilgiAgaciMapLayer || newsmapInfoMode;
  const newsmapCalloutsActive = newsmapShowCallouts && !newsmapInfoMode;
  const newsmapLayerHeadlines = filterHeadlinesForLayers(newsmapDisplayHeadlines);

  const filterNewsmapPanelByKind = useCallback(
    (rows: HmMapCityHeadline[]) => {
      if (newsmapKindFilter === "news") return rows.filter((row) => row.kind === "news");
      if (newsmapKindFilter === "video") return rows.filter((row) => row.kind === "video");
      return rows;
    },
    [newsmapKindFilter],
  );

  const newsmapPanelHeadlines = useMemo(
    () => buildNewsmapSidebarHeadlines({
      selectedCity: selectedNewsmapCity,
      kindFilter: newsmapKindFilter,
      layerHeadlines: newsmapLayerHeadlines,
      layerFiltered: filterHeadlinesForLayers(filteredNewsHeadlines),
      locationNewsHeadlines,
      locationVideoHeadlines,
      filterByKind: filterNewsmapPanelByKind,
    }),
    [
      filteredNewsHeadlines,
      filterHeadlinesForLayers,
      filterNewsmapPanelByKind,
      locationNewsHeadlines,
      locationVideoHeadlines,
      newsmapKindFilter,
      newsmapLayerHeadlines,
      selectedNewsmapCity,
    ],
  );

  useEffect(() => {
    if (!isNewsmapPage || !selectedNewsmapCity || newsmapBusinessesMode || newsmapInfoMode) return;
    if (newsmapKindFilter !== "news") return;
    if (locationNewsLoading || locationContentLoading) return;
    const newsRows = newsmapPanelHeadlines.filter((row) => row.kind === "news");
    if (newsRows.length > 0) return;
    if (newsmapAutoVideoFallbackCityRef.current === selectedNewsmapCity) return;
    if (!locationVideosLoading && locationVideoHeadlines.length === 0) return;
    newsmapAutoVideoFallbackCityRef.current = selectedNewsmapCity;
    setNewsmapKindFilter("video");
  }, [
    isNewsmapPage,
    selectedNewsmapCity,
    newsmapBusinessesMode,
    newsmapInfoMode,
    newsmapKindFilter,
    locationNewsLoading,
    locationContentLoading,
    locationVideosLoading,
    locationVideoHeadlines.length,
    newsmapPanelHeadlines,
  ]);

  const newsmapCountryClusterHeadlines = useMemo(() => {
    if (!isNewsmapPage || newsmapBusinessesMode || selectedNewsmapCity) return [];
    if (newsmapMapZoom > NEWSMAP_CLUSTER_MAX_ZOOM) return [];
    return buildNewsmapCountryClusterHeadlines(newsmapCoverageContentIndex, newsmapCoordIndex);
  }, [
    isNewsmapPage,
    newsmapBusinessesMode,
    newsmapCoverageContentIndex,
    newsmapCoordIndex,
    newsmapMapZoom,
    selectedNewsmapCity,
  ]);

  const newsmapSidebarDisplayHeadlines = useMemo(() => {
    const withoutVideosOnNewsmap = (rows: HmMapCityHeadline[]) =>
      isNewsmapPage ? rows.filter((row) => row.kind !== "video") : rows;

    if (selectedNewsmapCity) return withoutVideosOnNewsmap(newsmapPanelHeadlines);
    const pool = newsmapPanelHeadlines.length > 0
      ? newsmapPanelHeadlines
      : mergeNewsmapBottomBandHeadlines(
          haberHaritasiNews.headlines,
          haberHaritasiNews.regionHeadlines,
          newsmapCountryClusterHeadlines,
        );
    const sidebarKindFilter =
      isNewsmapPage
        ? "news"
        : newsmapSidebarMode === "video"
          ? "video"
          : newsmapSidebarMode === "news"
            ? "news"
            : "all";
    return withoutVideosOnNewsmap(
      resolveNewsmapBottomBandHeadlines(pool, newsmapBottomBandTab, {
        kindFilter: sidebarKindFilter,
      }),
    );
  }, [
    haberHaritasiNews.headlines,
    haberHaritasiNews.regionHeadlines,
    isNewsmapPage,
    newsmapBottomBandTab,
    newsmapCountryClusterHeadlines,
    newsmapPanelHeadlines,
    newsmapSidebarMode,
    selectedNewsmapCity,
  ]);

  const newsmapBottomBandKindFilter = useMemo((): "all" | "news" | "video" => {
    if (newsmapKindFilter === "news" || newsmapKindFilter === "video") return newsmapKindFilter;
    return "all";
  }, [newsmapKindFilter]);

  const newsmapTickerHeadlines = useMemo(() => {
    if (newsmapPanelHeadlines.length > 0) return newsmapPanelHeadlines;
    if (newsmapDisplayHeadlines.length > 0) {
      return filterHeadlinesForLayers(newsmapDisplayHeadlines).slice(0, 48);
    }
    const layerFiltered = filterHeadlinesForLayers(filteredNewsHeadlines);
    if (layerFiltered.length > 0) return layerFiltered.slice(0, 48);
    const pool = mergeNewsmapBottomBandHeadlines(
      haberHaritasiNews.headlines,
      haberHaritasiNews.regionHeadlines,
      newsmapCountryClusterHeadlines,
    );
    if (pool.length > 0) return pool.slice(0, 48);
    return [];
  }, [
    filteredNewsHeadlines,
    filterHeadlinesForLayers,
    haberHaritasiNews.headlines,
    haberHaritasiNews.regionHeadlines,
    newsmapCountryClusterHeadlines,
    newsmapDisplayHeadlines,
    newsmapPanelHeadlines,
  ]);

  /** Global sekme — konum eşleşmesi olmayan yabancı haberler de banda girsin. */
  const newsmapGlobalPoolHeadlines = useMemo(() => {
    if (!isNewsmapPage || newsmapBusinessesMode) return [];
    return buildNewsmapGlobalPoolHeadlines([
      ...haberHaritasiNews.items,
      ...haberHaritasiNews.regionItems,
    ]);
  }, [haberHaritasiNews.items, haberHaritasiNews.regionItems, isNewsmapPage, newsmapBusinessesMode]);

  /** Ülke görünümü — geo eşleşmese de ulusal YekTube videoları banda girsin. */
  const newsmapVideoBandHeadlines = useMemo(() => {
    if (!isNewsmapPage || newsmapBusinessesMode || selectedNewsmapCity) return [];
    const pool =
      haberHaritasiNews.videoItems.length > 0
        ? haberHaritasiNews.videoItems
        : haberHaritasiNews.regionVideoItems;
    if (pool.length === 0) return [];
    return buildNewsmapNationalVideoBandHeadlines(pool, ilCenters, linkMode, hmPublicHref, 96);
  }, [
    haberHaritasiNews.regionVideoItems,
    haberHaritasiNews.videoItems,
    ilCenters,
    isNewsmapPage,
    linkMode,
    hmPublicHref,
    newsmapBusinessesMode,
    selectedNewsmapCity,
  ]);

  const newsmapBottomBandPool = useMemo(() => {
    if (!isNewsmapPage || newsmapBusinessesMode) return newsmapPanelHeadlines;
    /** Konum seçiliyken yalnızca o il/konum — ulusal havuz alt banda karışmasın. */
    if (selectedNewsmapCity) return newsmapPanelHeadlines;
    return mergeNewsmapBottomBandHeadlines(
      haberHaritasiNews.headlines,
      haberHaritasiNews.regionHeadlines,
      newsmapCountryClusterHeadlines,
      newsmapDisplayHeadlines,
      newsmapPanelHeadlines,
      newsmapGlobalPoolHeadlines,
      newsmapVideoBandHeadlines,
    );
  }, [
    haberHaritasiNews.headlines,
    haberHaritasiNews.regionHeadlines,
    isNewsmapPage,
    newsmapBusinessesMode,
    newsmapCountryClusterHeadlines,
    newsmapDisplayHeadlines,
    newsmapGlobalPoolHeadlines,
    newsmapPanelHeadlines,
    newsmapVideoBandHeadlines,
    selectedNewsmapCity,
  ]);

  const newsmapBottomBandHeadlines = useMemo(() => {
    if (!isNewsmapPage || newsmapBusinessesMode) return newsmapPanelHeadlines;
    return resolveNewsmapBottomBandHeadlines(newsmapBottomBandPool, newsmapBottomBandTab, {
      kindFilter: newsmapBottomBandKindFilter,
    });
  }, [
    isNewsmapPage,
    newsmapBottomBandKindFilter,
    newsmapBottomBandPool,
    newsmapBottomBandTab,
    newsmapBusinessesMode,
    newsmapPanelHeadlines,
  ]);

  useEffect(() => {
    if (!isNewsmapPage || !selectedNewsmapCity) return;
    if (Date.now() < newsmapPendingCityNavUntilRef.current) return;
    /**
     * Kullanıcı Haberler/Videolar/İşletmeler sekmesini açıkça açtıysa (kindFilter !== "all")
     * zoom'a bakarak şehir kartını otomatik kapatma — kart ↔ liste "gidip gelme" döngüsünü önler.
     */
    if (newsmapKindFilter !== "all") return;
    if (newsmapMapZoom > NEWSMAP_CLUSTER_MAX_ZOOM) return;
    /* Debounce edilmiş zoom eski kalmış olabilir; canlı harita zoom'u hâlâ şehir seviyesindeyse kapatma. */
    const liveZoom = leafletMapRef.current?.getZoom();
    if (typeof liveZoom === "number" && liveZoom > NEWSMAP_CLUSTER_MAX_ZOOM) return;
    clearSelectedNewsmapCity();
  }, [clearSelectedNewsmapCity, isNewsmapPage, newsmapKindFilter, newsmapMapZoom, selectedNewsmapCity]);

  const newsmapCountryClusterView = isNewsmapPage && newsmapMapZoom <= NEWSMAP_CLUSTER_MAX_ZOOM && !selectedNewsmapCity;

  /** Ülke zoom — reverse geocode il adı (Kayseri vb.) yerine Türkiye etiketi. */
  const newsmapBottomBandCityLabel = useMemo(() => {
    if (newsmapCountryClusterView) return "Türkiye";
    if (selectedNewsmapCity) return selectedNewsmapCity;
    return newsmapSidebarLocationLabel;
  }, [newsmapCountryClusterView, newsmapSidebarLocationLabel, selectedNewsmapCity]);

  const newsmapBottomBandLoading = useMemo(() => {
    if (newsmapBottomBandHeadlines.length > 0) return false;
    if (newsmapPanelHeadlines.length > 0) return false;
    if (newsmapTickerHeadlines.length > 0) return false;
    if (hasNewsmapHybridNewsCache()) return false;
    if (haberHaritasiNews.headlines.length > 0 || haberHaritasiNews.regionHeadlines.length > 0) return false;
    if (newsmapCountryClusterView) {
      const poolPending =
        haberHaritasiNews.isLoading &&
        haberHaritasiNews.headlines.length === 0 &&
        haberHaritasiNews.regionHeadlines.length === 0;
      return poolPending;
    }
    const hybridPending = haberHaritasiNews.isLoading && haberHaritasiNews.items.length === 0;
    const locationPending = Boolean(selectedNewsmapCity) && locationContentLoading;
    return hybridPending || locationPending;
  }, [
    haberHaritasiNews.headlines.length,
    haberHaritasiNews.isLoading,
    haberHaritasiNews.items.length,
    haberHaritasiNews.regionHeadlines.length,
    locationContentLoading,
    locationVideosLoading,
    newsmapBottomBandHeadlines.length,
    newsmapPanelHeadlines.length,
    newsmapTickerHeadlines.length,
    newsmapCountryClusterView,
    selectedNewsmapCity,
  ]);

  const newsmapSidebarPanelLoading = useMemo(() => {
    if (selectedNewsmapCity) {
      return locationContentLoading && newsmapPanelHeadlines.length === 0;
    }
    return newsmapBottomBandLoading;
  }, [locationContentLoading, newsmapBottomBandLoading, newsmapPanelHeadlines.length, selectedNewsmapCity]);

  const newsmapBottomBandBilgiHref = useMemo(() => {
    const label = selectedNewsmapCity
      || newsmapSidebarLocationLabel
      || viewportPlaceInfo.city
      || viewportPlaceInfo.label;
    return label ? resolveBilgiAgaciHref(label.split(",")[0]?.trim() || label) : null;
  }, [newsmapSidebarLocationLabel, resolveBilgiAgaciHref, selectedNewsmapCity, viewportPlaceInfo.city, viewportPlaceInfo.label]);

  const newsmapShowClusterPins = isNewsmapPage && !newsmapBusinessesMode && newsmapMapZoom <= NEWSMAP_CLUSTER_MAX_ZOOM;
  const newsmapShowAllLayerBusinesses = isNewsmapPage && newsmapKindFilter === "all" && newsmapMapZoom < NEWSMAP_SCRAPE_MIN_ZOOM;

  const newsmapCalloutPlacements = useMemo(() => {
    if (!newsmapCalloutsActive) return [];
    const limit = newsmapCalloutLimitFromZoom(newsmapMapZoom);
    if (isNewsmapPage && newsmapMapZoom <= NEWSMAP_CLUSTER_MAX_ZOOM) {
      const fromIndex = buildNewsmapCalloutPlacementsFromContentIndex(
        effectiveMarkerContentIndex,
        newsmapCoordIndex,
        limit,
      );
      if (fromIndex.length > 0) return fromIndex;
      return buildNewsmapCalloutPlacements(
        contentCalloutHeadlines,
        newsmapCoordIndex,
        limit,
      );
    }
    return buildNewsmapCalloutPlacements(
      contentCalloutHeadlines,
      newsmapCoordIndex,
      limit,
    );
  }, [
    contentCalloutHeadlines,
    effectiveMarkerContentIndex,
    isNewsmapPage,
    newsmapCalloutsActive,
    newsmapCoordIndex,
    newsmapMapZoom,
  ]);

  const newsmapCalloutCityKeys = useMemo(
    () => new Set(newsmapCalloutPlacements.map((p) => normalizeHmMapCityKey(p.headline.city))),
    [newsmapCalloutPlacements],
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseTileLayerRef = useRef<any>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const serverClusterLayerRef = useRef<L.LayerGroup | null>(null);
  const ilProvinceMarkersRef = useRef<L.LayerGroup | null>(null);
  const haberHaritasiGlobalMarkersRef = useRef<L.LayerGroup | null>(null);
  const newsmapCalloutMarkersRef = useRef<L.LayerGroup | null>(null);
  const bilgiAgaciMarkersRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerRef = useRef<L.LayerGroup | null>(null);
  const earthquakeLayerRef = useRef<L.LayerGroup | null>(null);
  const wildfireLayerRef = useRef<L.LayerGroup | null>(null);
  const dutyPharmacyLayerRef = useRef<L.LayerGroup | null>(null);
  const aircraftLayerRef = useRef<L.LayerGroup | null>(null);
  const geodesyGridRef = useRef<L.LayerGroup | null>(null);
  const populationDotsRef = useRef<L.LayerGroup | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const populationChoroplethRef = useRef<any>(null);
  const districtDotsRef = useRef<L.LayerGroup | null>(null);
  const neighborhoodDotsRef = useRef<L.LayerGroup | null>(null);
  const kgmRouteRef = useRef<L.LayerGroup | null>(null);
  const kgmContextRef = useRef<L.LayerGroup | null>(null);
  const measurementLayerRef = useRef<L.LayerGroup | null>(null);
  const measurementActiveRef = useRef(false);
  const measurementPointsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const parcelMarkerRef = useRef<L.Marker | null>(null);
  const parcelShapeRef = useRef<L.Polygon | L.GeoJSON | null>(null);
  const parcelAnalysisLayerRef = useRef<L.LayerGroup | null>(null);
  const userPlaceMarkersRef = useRef<L.LayerGroup | null>(null);
  const addPlaceDraftMarkerRef = useRef<L.Marker | null>(null);
  const searchedLocationMarkerRef = useRef<L.LayerGroup | null>(null);
  const addPlacePickModeRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const populationTileRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elevationTileRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rasterTileRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streetLabelsRef = useRef<any>(null);
  const advancedOverlayRefs = useRef<Record<string, L.Layer>>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  /* Gerçek GPS konumu — yalnızca cihaz konumu (getCurrentPosition/watchPosition) ile güncellenir.
     `userLocation` aramayla/şehir seçimiyle değişebildiği için rota başlangıcı buradan alınır. */
  const realUserLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  /** Header / profil adresi (readPublicLocation) — harita merkezi değişse de korunur. */
  const profileLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  // Canlı konum takibi için izleme kimliği
  const geoWatchIdRef = useRef<number | null>(null);
  const navWaypointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const navStepIdxRef = useRef(0);
  const navInstructionsRef = useRef<{ text: string; distance: number; type?: string }[]>([]);
  const navStepStripRef = useRef<HTMLDivElement | null>(null);
  const navTransportRef = useRef<"car"|"walk"|"transit">("car");
  /* Tracks whether the user has manually navigated the map away from the default.
     Prevents the late-resolving geolocation callback from hijacking the map view. */
  const hasUserNavigatedRef = useRef(false);
  const applyingDefaultViewRef = useRef(false);
  const noTargetDefaultViewAppliedRef = useRef(false);
  const newsmapDefaultViewPlanRef = useRef<NewsmapDefaultViewPlan | null>(null);
  const [visitorDefaultViewEpoch, setVisitorDefaultViewEpoch] = useState(0);
  // Stores the coords geocoded from URL ?location= param so loadBusinesses can use them
  // immediately (mapCenter state update from goToLocation is async via onMoveEnd)
  const urlLocationCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  // Dedupe: URL kaynaklı konum kartını her hedef için yalnızca bir kez aç (kapatınca tekrar açılmasın).
  const processedUrlCardKeyRef = useRef<string | null>(null);
  // Dedupe: `?nav=<bizId>` ile gelen işletmeyi yalnızca bir kez getir/seç (harita yüklenince ortalamayı tekrar dener).
  const processedNavBizIdRef = useRef<string | null>(null);
  // Dedupe: `?directions=1` ile gelen yol tarifi isteğini yalnızca bir kez başlat.
  const processedUrlDirectionsRef = useRef<string | null>(null);
  /** 50 km premium modunda harita üstünde yarıçap göstergesi */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nearbyRadiusCircleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const L = (window as any).L as typeof import("leaflet");

  const resetMeasurementLayer = useCallback(() => {
    measurementPointsRef.current = [];
    setMeasurementResult(null);
    measurementLayerRef.current?.clearLayers();
  }, []);

  const handleMeasurementMapClick = useCallback((ev: L.LeafletMouseEvent) => {
    const layer = measurementLayerRef.current;
    if (!layer) return;
    const nextPoint = { lat: ev.latlng.lat, lng: ev.latlng.lng };
    const nextPoints = measurementPointsRef.current.length >= 2
      ? [nextPoint]
      : [...measurementPointsRef.current, nextPoint];
    measurementPointsRef.current = nextPoints;
    layer.clearLayers();
    nextPoints.forEach((point, idx) => {
      L.circleMarker([point.lat, point.lng], {
        radius: 6,
        color: "#0f766e",
        weight: 2,
        fillColor: "#ffffff",
        fillOpacity: 1,
      }).bindTooltip(idx === 0 ? "Başlangıç" : "Bitiş", { direction: "top" }).addTo(layer);
    });
    if (nextPoints.length === 1) {
      setMeasurementResult("İkinci noktayı seçin");
      return;
    }
    const [start, end] = nextPoints;
    const metres = L.latLng(start.lat, start.lng).distanceTo(L.latLng(end.lat, end.lng));
    const label = metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${Math.round(metres)} m`;
    L.polyline([[start.lat, start.lng], [end.lat, end.lng]], {
      color: "#0f766e",
      weight: 3,
      opacity: 0.9,
      dashArray: "8 6",
    }).bindTooltip(label, { permanent: true, direction: "center", className: "yekpare-measure-tooltip" }).addTo(layer);
    setMeasurementResult(`Mesafe: ${label}`);
  }, [L]);

  useEffect(() => {
    measurementActiveRef.current = measurementActive;
    if (!measurementActive) {
      resetMeasurementLayer();
      return;
    }
    setMapLayersOpen(false);
    setMeasurementResult("Haritada iki nokta seçin");
    showToast("Ölçüm için haritada iki nokta seçin.");
  }, [measurementActive, resetMeasurementLayer, showToast]);

  useEffect(() => {
    if (!isNoTargetMapMode) return;
    hasUserNavigatedRef.current = false;
    noTargetDefaultViewAppliedRef.current = false;
    urlLocationCenterRef.current = null;
    setUserLocation(null);
    setSelectedLocation(null);
    setSelectedBiz(null);
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setDesktopGeoPanelOpen(false);
      setLeftSidebarTab("isletmeler");
      setBusinessPanelMode("categories");
      setLocationPanelTab("businesses");
      const closeDelays = [80, 260, 640] as const;
      const timers = closeDelays.map((delay) => window.setTimeout(() => {
        if (!hasExplicitKesfetMapTarget(window.location.pathname, window.location.search.replace(/^\?/, ""))) {
          setSelectedLocation(null);
          setSelectedBiz(null);
          setLeftSidebarTab("isletmeler");
          setBusinessPanelMode("categories");
          setLocationPanelTab("businesses");
          setDesktopGeoPanelOpen(false);
        }
      }, delay));
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }
    return undefined;
  }, [isNoTargetMapMode, currentPath, urlQueryStr]);

  const getActiveNoTargetViewPlan = useCallback((): NewsmapDefaultViewPlan => {
    if (isNewsmapPage) {
      return toUnifiedNoTargetViewPlan(getNoTargetTurkeyViewPlan());
    }
    if (visitorCountryDefaultEnabled) {
      return newsmapDefaultViewPlanRef.current ?? getNewsmapDefaultViewPlan("TR");
    }
    return toUnifiedNoTargetViewPlan(getNoTargetTurkeyViewPlan());
  }, [isNewsmapPage, visitorCountryDefaultEnabled, visitorDefaultViewEpoch]);

  useEffect(() => {
    if (!visitorCountryDefaultEnabled || isNewsmapPage) {
      newsmapDefaultViewPlanRef.current = null;
      return;
    }
    let cancelled = false;
    resolveVisitorCountryCode().then(({ countryCode }) => {
      if (cancelled) return;
      newsmapDefaultViewPlanRef.current = getNewsmapDefaultViewPlan(countryCode);
      noTargetDefaultViewAppliedRef.current = false;
      setVisitorDefaultViewEpoch((epoch) => epoch + 1);
    });
    return () => { cancelled = true; };
  }, [visitorCountryDefaultEnabled, isNewsmapPage, currentPath]);

  const applyNoTargetTurkeyView = useCallback((map = leafletMapRef.current, opts?: { force?: boolean }): boolean => {
    const force = opts?.force === true;
    const shouldApplyDefaultTurkey = force || isNoTargetMapMode || isBrowserNoTargetMapBasePath();
    if (!map || !shouldApplyDefaultTurkey || (!force && urlLocationCenterRef.current)) return false;
    const viewPlan = getActiveNoTargetViewPlan();
    const insideDefaultBounds = (lat: number, lng: number) => isInsideViewPlanBounds(lat, lng, viewPlan);
    if (!force && noTargetDefaultViewAppliedRef.current) {
      const center = map.getCenter();
      if (insideDefaultBounds(center.lat, center.lng)) return false;
    }
    if (!force && hasUserNavigatedRef.current && noTargetDefaultViewAppliedRef.current) return false;
    const defaultCenter: [number, number] = [viewPlan.center.lat, viewPlan.center.lng];
    map.invalidateSize({ animate: false });
    const size = map.getSize();
    if (size.x < 120 || size.y < 120) return false;
    map.setMinZoom(viewPlan.minZoom);
    (map as unknown as { setMaxBounds: (bounds: null) => void }).setMaxBounds(null);
    applyingDefaultViewRef.current = true;
    try {
      map.stop();
      map.setView(defaultCenter, viewPlan.zoom, { animate: false });
      if (viewPlan.bounds) {
        const defaultBounds = L.latLngBounds(viewPlan.bounds);
        map.fitBounds(defaultBounds, {
          animate: false,
          padding: viewPlan.padding,
          maxZoom: viewPlan.zoom,
        });
      }
      if (map.getZoom() < viewPlan.minZoom) {
        map.setZoom(viewPlan.minZoom, { animate: false });
      }
      const center = map.getCenter();
      noTargetDefaultViewAppliedRef.current = insideDefaultBounds(center.lat, center.lng);
      return true;
    } catch {
      map.setView(defaultCenter, viewPlan.zoom, { animate: false });
      noTargetDefaultViewAppliedRef.current = true;
      return true;
    } finally {
      window.setTimeout(() => { applyingDefaultViewRef.current = false; }, 0);
    }
  }, [L, isNoTargetMapMode, getActiveNoTargetViewPlan]);

  useEffect(() => {
    if (isNewsmapPage || !visitorCountryDefaultEnabled || visitorDefaultViewEpoch <= 0) return;
    const map = leafletMapRef.current;
    if (!mapLoaded || !map) return;
    applyNoTargetTurkeyView(map, { force: true });
  }, [isNewsmapPage, visitorCountryDefaultEnabled, visitorDefaultViewEpoch, mapLoaded, applyNoTargetTurkeyView]);

  /* ── Load Leaflet ── */
  useEffect(() => {
    if ((window as any).L) { setMapLoaded(true); return; }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-yekpare-leaflet='true']");
    const script = existingScript ?? document.createElement("script");
    script.dataset.yekpareLeaflet = "true";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => { setMapLoadIssue(null); setMapLoaded(true); };
    script.onerror = () => {
      setMapLoadIssue("Harita altyapısı yüklenemedi. Arama ve işletme paneli kullanılabilir.");
      setMapLoaded(false);
    };
    if (!existingScript) document.head.appendChild(script);
  }, []);

  /* ── Init map — açılışta Türkiye geneli ── */
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafletMapRef.current || !(window as any).L) return;
    const defaultCenter: [number, number] = [mapCenter.lat, mapCenter.lng];
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: TURKEY_DEFAULT_MAP_ZOOM,
      minZoom: TURKEY_DEFAULT_MIN_ZOOM,
      maxBoundsViscosity: 0,
      worldCopyJump: false,
      zoomControl: false,
    });
    const initialBase =
      BASE_LAYER_DEFS.find((d) => d.id === baseMapStyle)
      ?? BASE_LAYER_DEFS.find((d) => d.id === "temel")
      ?? BASE_LAYER_DEFS[0];
    baseTileLayerRef.current = L.tileLayer(initialBase.url, {
      attribution: initialBase.attribution,
      maxZoom: initialBase.maxZoom ?? 19,
      noWrap: true,
    }).addTo(map);
    attachLeafletTileVisibilitySync(baseTileLayerRef.current);
    const refitTurkey = () => {
      if (!isNoTargetMapMode && !isBrowserNoTargetMapBasePath()) return;
      window.requestAnimationFrame(() => {
        applyNoTargetTurkeyView(map);
        window.setTimeout(() => applyNoTargetTurkeyView(map), 80);
      });
    };
    map.whenReady(() => {
      refitTurkey();
      syncLeafletTileLoadedVisibility(map.getContainer());
    });
    baseTileLayerRef.current.once("load", refitTurkey);
    map.createPane("street-labels");
    const streetPane = map.getPane("street-labels");
    if (streetPane) {
      streetPane.style.zIndex = "650";
      streetPane.style.pointerEvents = "none";
    }
    streetLabelsRef.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxZoom: 20,
      pane: "street-labels",
      opacity: 0,
      noWrap: true,
    }).addTo(map);
    attachLeafletTileVisibilitySync(streetLabelsRef.current);
    const detachMapTileSync = attachLeafletMapContainerTileSync(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    serverClusterLayerRef.current = L.layerGroup().addTo(map);
    ilProvinceMarkersRef.current = L.layerGroup().addTo(map);
    haberHaritasiGlobalMarkersRef.current = L.layerGroup().addTo(map);
    newsmapCalloutMarkersRef.current = L.layerGroup().addTo(map);
    bilgiAgaciMarkersRef.current = L.layerGroup().addTo(map);
    poiMarkersRef.current = L.layerGroup().addTo(map);
    weatherLayerRef.current = L.layerGroup().addTo(map);
    earthquakeLayerRef.current = L.layerGroup().addTo(map);
    wildfireLayerRef.current = L.layerGroup().addTo(map);
    dutyPharmacyLayerRef.current = L.layerGroup().addTo(map);
    aircraftLayerRef.current = L.layerGroup().addTo(map);
    geodesyGridRef.current = L.layerGroup().addTo(map);
    populationDotsRef.current = L.layerGroup().addTo(map);
    districtDotsRef.current = L.layerGroup().addTo(map);
    neighborhoodDotsRef.current = L.layerGroup().addTo(map);
    kgmRouteRef.current = L.layerGroup().addTo(map);
    kgmContextRef.current = L.layerGroup().addTo(map);
    measurementLayerRef.current = L.layerGroup().addTo(map);
    parcelAnalysisLayerRef.current = L.layerGroup().addTo(map);
    userPlaceMarkersRef.current = L.layerGroup().addTo(map);
    map.on("click", (ev: L.LeafletMouseEvent) => {
      if (measurementActiveRef.current) {
        handleMeasurementMapClick(ev);
        return;
      }
      if (!addPlacePickModeRef.current) return;
      const nextLat = Number(ev.latlng.lat.toFixed(6));
      const nextLng = Number(ev.latlng.lng.toFixed(6));
      setAddPlaceDraft((draft) => ({ ...draft, lat: String(nextLat), lng: String(nextLng) }));
      setAddPlacePickMode(false);
      setAddPlaceOpen(true);
      setLeftSidebarTab("yer_ekle");
      setDesktopGeoPanelOpen(true);
      showToast("Konum forma eklendi");
    });
    map.on("dragstart zoomstart", () => {
      if (!applyingDefaultViewRef.current) hasUserNavigatedRef.current = true;
    });
    leafletMapRef.current = map;
    if (isNoTargetMapMode || isBrowserNoTargetMapBasePath()) {
      NO_TARGET_TURKEY_FIT_DELAYS_MS.forEach((delay) => {
        window.setTimeout(() => applyNoTargetTurkeyView(map), delay);
      });
    }
    return () => {
      detachMapTileSync();
    };
  }, [mapLoaded, isNoTargetMapMode, applyNoTargetTurkeyView, handleMeasurementMapClick]);

  // Header adresi / teslimat konumu — /haritalar'da haritayı uçurmaz; mesafe hesabı için ref güncellenir.
  useEffect(() => {
    const syncVisitorProfile = (loc: PublicLocationState | null) => {
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        profileLocationRef.current = { lat: loc.lat, lng: loc.lng };
      }
    };
    syncVisitorProfile(readPublicLocation());
    const onUpdated = (event: Event) => {
      syncVisitorProfile((event as CustomEvent<PublicLocationState>).detail ?? readPublicLocation());
    };
    window.addEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
    return () => window.removeEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
  }, []);

  useEffect(() => {
    if (!mapLoaded) return;
    const applyStoredLocation = (loc: PublicLocationState | null) => {
      if (!loc) return;
      profileLocationRef.current = { lat: loc.lat, lng: loc.lng };
      if (isNoTargetMapMode) return;
      // Sarı Sayfalar «Haritada görüntüle» (?city= / ?location=) — profil konumu kartı ezmesin.
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("city")?.trim() || urlParams.get("location")?.trim()) return;
      }
      hasUserNavigatedRef.current = true;
      setUserLocation({ lat: loc.lat, lng: loc.lng });
      setSmartLocation(resolveMapLocationDisplayLabel(loc.label, loc.city, loc.district) || loc.city || "Konum");
      setSmartLocationPlaceId(null);
      if (loc.city || loc.district) {
        setSmartLocationTr({ city: loc.city, district: loc.district, mahalle: "", sokak: "" });
      }
      leafletMapRef.current?.setView([loc.lat, loc.lng], 15, { animate: true });
      setSelectedLocation(null);
      setBusinessPanelMode("categories");
      setLocationPanelTab("businesses");
    };
    applyStoredLocation(readPublicLocation());
    const onUpdated = (event: Event) => {
      applyStoredLocation((event as CustomEvent<PublicLocationState>).detail ?? readPublicLocation());
    };
    window.addEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
    return () => window.removeEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
  }, [mapLoaded, isNoTargetMapMode]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!mapLoaded || !map) return;
    if (isNoTargetMapMode || isBrowserNoTargetMapBasePath()) {
      map.options.maxBoundsViscosity = 0;
      applyNoTargetTurkeyView(map);
    } else {
      map.setMinZoom(1);
      map.options.maxBoundsViscosity = 0;
      (map as unknown as { setMaxBounds: (bounds: null) => void }).setMaxBounds(null);
    }
  }, [mapLoaded, isNoTargetMapMode, applyNoTargetTurkeyView, L]);

  /* Masaüstü: Leaflet zoom (+/-) ile özel UI çakışmasın — sağ alt inset piksel sabiti. */
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || isMobile) return;
    const c = leafletMapRef.current.getContainer();
    const br = c.querySelector(".leaflet-bottom.leaflet-right") as HTMLElement | null;
    if (br) br.style.bottom = `${DESKTOP_KESFET_LEAFLET_UI_BOTTOM_PX}px`;
    return () => {
      if (br) br.style.bottom = "";
    };
  }, [mapLoaded, isMobile]);

  // Base map style switcher
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || !baseTileLayerRef.current) return;
    const map = leafletMapRef.current;
    const current = baseTileLayerRef.current;
    const supportedIds = new Set(["temel", "hava_fotografi", "gece", "topografik", "siyasi", "fiziki"]);
    const next = BASE_LAYER_DEFS.find((d) => d.id === baseMapStyle && supportedIds.has(d.id))
      ?? BASE_LAYER_DEFS.find((d) => d.id === "temel");
    if (!next) return;
    if (current._url === next.url) return;
    map.removeLayer(current);
    baseTileLayerRef.current = L.tileLayer(next.url, { attribution: next.attribution, maxZoom: next.maxZoom ?? 19, noWrap: true }).addTo(map);
    attachLeafletTileVisibilitySync(baseTileLayerRef.current);
    window.setTimeout(() => syncLeafletTileLoadedVisibility(map.getContainer()), 150);
  }, [baseMapStyle, mapLoaded, L]);

  useEffect(() => {
    if (!leafletMapRef.current || !streetLabelsRef.current) return;
    const map = leafletMapRef.current;
    const labels = streetLabelsRef.current;
    const updateLabelVisibility = () => {
      const z = map.getZoom();
      const supportsLabels = baseMapStyle !== "gece";
      labels.setOpacity(mapLabelsVisible && supportsLabels && z >= 11 ? 0.95 : 0);
    };
    updateLabelVisibility();
    map.on("zoomend", updateLabelVisibility);
    return () => {
      map.off("zoomend", updateLabelVisibility);
    };
  }, [baseMapStyle, mapLoaded, mapLabelsVisible]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!mapLoaded || !map || typeof window === "undefined" || (!isNoTargetMapMode && !isBrowserNoTargetMapBasePath())) return;
    const forceDefaultView = () => {
      applyNoTargetTurkeyView(map, { force: true });
    };
    const timers = NO_TARGET_TURKEY_FIT_DELAYS_MS.map((delay) => window.setTimeout(forceDefaultView, delay));
    const viewPlan = getActiveNoTargetViewPlan();
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const center = map.getCenter();
      if (isInsideViewPlanBounds(center.lat, center.lng, viewPlan) || Date.now() - startedAt > 5000) {
        window.clearInterval(interval);
        return;
      }
      forceDefaultView();
    }, 500);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(interval);
    };
  }, [mapLoaded, isNoTargetMapMode, applyNoTargetTurkeyView, getActiveNoTargetViewPlan, visitorDefaultViewEpoch]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!mapLoaded || !map || typeof window === "undefined") return;
    const syncUrl = () => {
      if (applyingDefaultViewRef.current) return;
      const path = window.location.pathname;
      if (parseYekparePlacePath(path) || selectedBiz) return;
      const immediateCenter = map.getCenter();
      const defaultPlan = getActiveNoTargetViewPlan();
      const insideDefaultBounds = (lat: number, lng: number) => isInsideViewPlanBounds(lat, lng, defaultPlan);
      const baseNoTargetPath = /^\/(?:haritalar|newsmap|maps|map)\/?$/i.test(path)
        || isHmHaritalarPublicPath(path)
        || isHmNewsmapPublicPath(path);
      if (isNoTargetMapMode && (!noTargetDefaultViewAppliedRef.current || !insideDefaultBounds(immediateCenter.lat, immediateCenter.lng))) {
        applyNoTargetTurkeyView(map);
        return;
      }
      if (baseNoTargetPath && !insideDefaultBounds(immediateCenter.lat, immediateCenter.lng) && map.getZoom() <= defaultPlan.minZoom) {
        applyNoTargetTurkeyView(map);
        return;
      }
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
      urlSyncTimerRef.current = setTimeout(() => {
        /**
         * "Konumdan çık" sonrası koordinatları URL'e geri yazma: aksi halde URL geo
         * efekti guard süresi bitince aynı konumu yeniden aktive ediyor ve
         * kullanıcı konumdan asla çıkamıyordu.
         */
        if (Date.now() < newsmapLocationExitUntilRef.current) return;
        const center = map.getCenter();
        if (isNoTargetMapMode && (!noTargetDefaultViewAppliedRef.current || !insideDefaultBounds(center.lat, center.lng))) return;
        const lat = Number(center.lat.toFixed(5));
        const lng = Number(center.lng.toFixed(5));
        if (!isUsableMapCoordinate(lat, lng)) return;
        const zoom = Math.max(1, Math.min(20, Math.round(map.getZoom())));
        const current = window.location.pathname;
        if (parseYekparePlacePath(current) || selectedBiz) return;
        const params = new URLSearchParams(window.location.search);
        const preservedCity = params.get("city")?.trim() || "";
        ["lat", "lng", "lon", "zoom", "z", "location"].forEach((key) => params.delete(key));
        params.set("lat", String(lat));
        params.set("lng", String(lng));
        params.set("zoom", String(zoom));
        if (preservedCity) params.set("city", preservedCity);
        const query = params.toString();
        const nextUrl = `${safeMapUrlSyncBasePath(current)}${query ? `?${query}` : ""}`;
        if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
          mapUrlSyncFromMapRef.current = true;
          window.history.replaceState(window.history.state, "", nextUrl);
        }
      }, 450);
    };
    map.on("moveend zoomend", syncUrl);
    return () => {
      map.off("moveend zoomend", syncUrl);
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, [mapLoaded, selectedBiz, isNoTargetMapMode, applyNoTargetTurkeyView, getActiveNoTargetViewPlan, visitorDefaultViewEpoch]);

  useEffect(() => {
    if (baseLayersForUi.length === 0) return;
    if (!baseLayersForUi.some((x) => x.id === baseMapStyle)) {
      setBaseMapStyle(baseLayersForUi[0].id as typeof baseMapStyle);
    }
  }, [baseLayersForUi, baseMapStyle]);

  // Raster overlays (nufus/elevation/raster)
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    if (overlayPopulation) {
      if (!populationTileRef.current) {
        populationTileRef.current = L.tileLayer(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { attribution: "© Esri", opacity: 0.55, maxZoom: 18, noWrap: true },
        );
        attachLeafletTileVisibilitySync(populationTileRef.current);
      }
      populationTileRef.current.addTo(map);
      populationTileRef.current.setOpacity(Math.max(0.15, Math.min(1, overlayOpacity)));
    } else if (populationTileRef.current) {
      map.removeLayer(populationTileRef.current);
    }
    if (overlayElevation) {
      if (!elevationTileRef.current) {
        elevationTileRef.current = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
          { attribution: "© Esri", opacity: 0.6, maxZoom: 16, noWrap: true },
        );
        attachLeafletTileVisibilitySync(elevationTileRef.current);
      }
      elevationTileRef.current.addTo(map);
      elevationTileRef.current.setOpacity(Math.max(0.15, Math.min(1, overlayOpacity)));
    } else if (elevationTileRef.current) {
      map.removeLayer(elevationTileRef.current);
    }
    if (overlayRaster) {
      if (!rasterTileRef.current) {
        rasterTileRef.current = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
          { attribution: "© Esri", opacity: 0.45, maxZoom: 13, noWrap: true },
        );
        attachLeafletTileVisibilitySync(rasterTileRef.current);
      }
      rasterTileRef.current.addTo(map);
      rasterTileRef.current.setOpacity(Math.max(0.15, Math.min(1, overlayOpacity)));
    } else if (rasterTileRef.current) {
      map.removeLayer(rasterTileRef.current);
    }
  }, [overlayPopulation, overlayElevation, overlayRaster, mapLoaded, L, overlayOpacity]);

  // Population choropleth + district density pins
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || !populationDotsRef.current) return;
    const map = leafletMapRef.current;
    const dotLayer = populationDotsRef.current;
    dotLayer.clearLayers();
    if (populationChoroplethRef.current) {
      map.removeLayer(populationChoroplethRef.current);
      populationChoroplethRef.current = null;
    }
    if (!overlayPopulation || ilCenters.length === 0) return;
    const high = new Set(["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep"]);
    const mid = new Set(["Mersin", "Diyarbakır", "Kocaeli", "Samsun", "Şanlıurfa", "Tekirdağ", "Kayseri", "Balıkesir", "Manisa"]);
    const getClass = (name: string) => (high.has(name) ? "high" : mid.has(name) ? "mid" : "low");
    const getColor = (cls: string) => (cls === "high" ? "#dc2626" : cls === "mid" ? "#f59e0b" : "#fde047");
    fetch("https://raw.githubusercontent.com/cihadturhan/tr-geojson/master/geo/tr-cities-utf8.json")
      .then((r) => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((geo: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const choropleth = L.geoJSON(geo, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style: (f: any) => {
            const n = String(f?.properties?.name ?? "");
            const cls = getClass(n);
            return { color: "#ef4444", weight: 1.2, fillColor: getColor(cls), fillOpacity: 0.35 };
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onEachFeature: (f: any, lyr: any) => {
            const n = String(f?.properties?.name ?? "");
            const cls = getClass(n);
            lyr.bindPopup(`<div><strong>NÜFUS</strong><br/>${n}<br/><small>Yoğunluk sınıfı: ${cls === "high" ? "Yüksek" : cls === "mid" ? "Orta" : "Düşük"}</small></div>`);
          },
        });
        choropleth.addTo(map);
        populationChoroplethRef.current = choropleth;
      })
      .catch(() => {});
    for (const il of ilCenters) {
      const cls = getClass(il.adi);
      const color = getColor(cls);
      const info = L.marker([il.lat, il.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:20px;height:20px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#111827">i</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      });
      info.bindTooltip(`NÜFUS · ${il.adi}`, { direction: "top" });
      info.bindPopup(`<div><strong>NÜFUS</strong><br/>${il.adi}<br/><small>İlçe bazlı yoğunluk pinlerini görmek için şehre yaklaşın.</small></div>`);
      dotLayer.addLayer(info);
    }
  }, [overlayPopulation, ilCenters, mapLoaded, L]);

  // Advanced WMS/WMTS overlays
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    for (const def of advancedLayersForUi) {
      const enabled = advancedOverlayEnabled[def.id] === true;
      const existing = advancedOverlayRefs.current[def.id];
      if (enabled) {
        if (!existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let layer: any;
          if (def.type === "wms" && def.tileLayer) {
            layer = L.tileLayer.wms(def.url, {
              layers: def.tileLayer,
              format: def.format ?? "image/png",
              transparent: def.transparent ?? true,
              attribution: def.attribution,
              opacity: overlayOpacity,
            });
          } else {
            layer = L.tileLayer(def.url, {
              attribution: def.attribution,
              opacity: overlayOpacity,
              maxZoom: 19,
              noWrap: true,
            });
          }
          layer.addTo(map);
          attachLeafletTileVisibilitySync(layer);
          advancedOverlayRefs.current[def.id] = layer as L.Layer;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (existing as any).setOpacity?.(overlayOpacity);
          if (!map.hasLayer(existing)) existing.addTo(map);
        }
      } else if (existing) {
        map.removeLayer(existing);
        delete advancedOverlayRefs.current[def.id];
      }
    }
  }, [advancedOverlayEnabled, mapLoaded, L, overlayOpacity, advancedLayersForUi]);

  // Geodesic/grid helper layer
  useEffect(() => {
    if (!mapLoaded || !geodesyGridRef.current) return;
    const layer = geodesyGridRef.current;
    layer.clearLayers();
    if (!overlayGeodesyGrid) return;
    const bounds = { latMin: 35, latMax: 43, lngMin: 25, lngMax: 45 };
    for (let lat = bounds.latMin; lat <= bounds.latMax; lat += 1) {
      layer.addLayer(L.polyline([[lat, bounds.lngMin], [lat, bounds.lngMax]], { color: "#06b6d4", weight: 1, opacity: 0.45, interactive: false }));
    }
    for (let lng = bounds.lngMin; lng <= bounds.lngMax; lng += 1) {
      layer.addLayer(L.polyline([[bounds.latMin, lng], [bounds.latMax, lng]], { color: "#06b6d4", weight: 1, opacity: 0.45, interactive: false }));
    }
  }, [overlayGeodesyGrid, mapLoaded, L]);

  const mapUiFontFamily = "'Inter','Segoe UI',system-ui,sans-serif";

  function formatEarthquakeDateForUi(raw: string): string {
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) return raw.trim() || "—";
    return new Date(t).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatWildfireDateForUi(raw: string | null | undefined): string {
    const t = Date.parse(String(raw ?? ""));
    if (!Number.isFinite(t)) return "Zaman bilgisi yok";
    return new Date(t).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function wildfireConfidenceText(value: string | number | null | undefined): string {
    const s = String(value ?? "").trim().toLowerCase();
    if (!s) return "Belirtilmedi";
    if (s === "h" || s === "high") return "Yüksek";
    if (s === "n" || s === "nominal") return "Orta";
    if (s === "l" || s === "low") return "Düşük";
    return `${value}`;
  }

  // Deprem katmanı — bölgesel birleşik feed (harita marker'ları; liste state'ini ezmez)
  useEffect(() => {
    if (!mapLoaded || !earthquakeLayerRef.current) return;
    const layer = earthquakeLayerRef.current;
    layer.clearLayers();
    if (!overlayEarthquake) return;
    let cancelled = false;
    fetch(mapApiUrl("/map/earthquakes/regional?days=7&limit=280"))
      .then((r) => r.json())
      .then((d: {
        success?: boolean;
        data?: Array<{
          id: string;
          source?: string;
          location: string;
          latitude: number;
          longitude: number;
          magnitude: number;
          depthKm: number;
          date: string;
        }>;
      }) => {
        if (cancelled) return;
        const rows = Array.isArray(d.data) ? d.data : [];
        const font = mapUiFontFamily;
        for (const eq of rows.slice(0, 320)) {
          if (!Number.isFinite(eq.latitude) || !Number.isFinite(eq.longitude)) continue;
          const mag = Number(eq.magnitude ?? 0);
          const radius = Math.max(3.5, Math.min(14, 3 + mag * 1.55));
          const isAfad = eq.source === "afad";
          const m = L.circleMarker([eq.latitude, eq.longitude], {
            radius,
            color: isAfad ? "#b91c1c" : "#c2410c",
            fillColor: isAfad ? "#ef4444" : "#fb923c",
            fillOpacity: 0.42,
            weight: 1.25,
          });
          const srcLabel = isAfad ? "AFAD" : "Kandilli";
          m.bindTooltip(`Büyüklük ${mag.toFixed(1)} · ${eq.location}`, { direction: "top" });
          const when = formatEarthquakeDateForUi(eq.date || "");
          m.bindPopup(
            `<div style="min-width:198px;font-family:${font};font-size:12px;line-height:1.45;color:#0f172a">` +
              `<strong style="font-size:13px">Büyüklük ${mag.toFixed(1)}</strong>` +
              `<span style="float:right;font-size:10px;color:#64748b;font-weight:600">${srcLabel}</span><br/>` +
              `<span style="display:block;margin-top:4px">${eq.location}</span>` +
              `<small style="display:block;margin-top:6px;color:#475569">Derinlik: ${Number(eq.depthKm || 0).toFixed(1)} km · ${when}</small>` +
              `</div>`,
          );
          layer.addLayer(m);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [overlayEarthquake, mapLoaded, L]);

  // NASA FIRMS — active fire / thermal anomaly points for the visible map area
  useEffect(() => {
    if (!mapLoaded || !wildfireLayerRef.current || !leafletMapRef.current) return;
    const layer = wildfireLayerRef.current;
    const map = leafletMapRef.current;
    layer.clearLayers();
    if (!overlayWildfire) {
      setWildfireRows([]);
      setWildfireLoading(false);
      setWildfireMessage(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ctrl: AbortController | null = null;

    const drawRows = (rows: FirmsWildfirePoint[]) => {
      layer.clearLayers();
      const font = mapUiFontFamily;
      for (const fire of rows.slice(0, 650)) {
        if (!Number.isFinite(fire.latitude) || !Number.isFinite(fire.longitude)) continue;
        const confidence = wildfireConfidenceText(fire.confidence);
        const frp = Number.isFinite(Number(fire.frp)) ? `${Number(fire.frp).toFixed(1)} MW` : "Yok";
        const when = formatWildfireDateForUi(fire.observedAt || fire.acqDate);
        const icon = L.divIcon({
          className: "yekpare-wildfire-marker",
          html:
            `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:radial-gradient(circle at 35% 30%,#fef3c7 0,#fb923c 45%,#dc2626 100%);border:2px solid rgba(255,255,255,0.9);box-shadow:0 4px 12px rgba(220,38,38,0.4);font-size:15px">🔥</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const m = L.marker([fire.latitude, fire.longitude], { icon, zIndexOffset: 420 });
        m.bindTooltip(`Orman yangını olası sıcak nokta · ${confidence}`, { direction: "top" });
        m.bindPopup(
          `<div style="min-width:218px;font-family:${font};font-size:12px;line-height:1.45;color:#0f172a">` +
            `<strong style="font-size:13px">🔥 Orman yangını sıcak noktası</strong>` +
            `<span style="float:right;font-size:10px;color:#ea580c;font-weight:700">NASA FIRMS</span>` +
            `<small style="display:block;margin-top:7px;color:#475569">Uydu: ${escapeHtmlText(fire.satellite || fire.source || "FIRMS")} ${fire.instrument ? `· ${escapeHtmlText(fire.instrument)}` : ""}</small>` +
            `<small style="display:block;margin-top:4px;color:#475569">Zaman: ${escapeHtmlText(when)}</small>` +
            `<small style="display:block;margin-top:4px;color:#475569">Güven: ${escapeHtmlText(confidence)} · Güç: ${escapeHtmlText(frp)}</small>` +
            `<small style="display:block;margin-top:4px;color:#64748b">${fire.latitude.toFixed(5)}, ${fire.longitude.toFixed(5)}</small>` +
          `</div>`,
        );
        layer.addLayer(m);
      }
    };

    const load = async () => {
      if (cancelled) return;
      ctrl?.abort();
      ctrl = new AbortController();
      const b = map.getBounds();
      const qs = new URLSearchParams({
        south: String(Number(b.getSouth().toFixed(4))),
        west: String(Number(b.getWest().toFixed(4))),
        north: String(Number(b.getNorth().toFixed(4))),
        east: String(Number(b.getEast().toFixed(4))),
        days: "2",
        source: "VIIRS_SNPP_NRT",
        confidence: "low",
        limit: "650",
      });
      setWildfireLoading(true);
      try {
        const r = await fetch(mapApiUrl(`/map/wildfires/firms?${qs.toString()}`), { signal: ctrl.signal });
        const d = await r.json() as {
          success?: boolean;
          configured?: boolean;
          message?: string;
          data?: FirmsWildfirePoint[];
        };
        if (cancelled) return;
        const configured = d.configured !== false;
        setWildfireConfigured(configured);
        if (!configured) {
          layer.clearLayers();
          setWildfireRows([]);
          setWildfireMessage(d.message || "Orman yangını verisi şu anda bağlı değil.");
          return;
        }
        if (!r.ok || d.success === false) {
          layer.clearLayers();
          setWildfireRows([]);
          setWildfireMessage("Orman yangını verisi şu anda alınamadı.");
          return;
        }
        const rows = Array.isArray(d.data) ? d.data : [];
        setWildfireRows(rows);
        setWildfireLastUpdate(new Date());
        setWildfireMessage(rows.length > 0 ? null : "Bu görünümde son uydu geçişlerinde yangın sıcak noktası görünmüyor.");
        drawRows(rows);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        if (!cancelled) {
          layer.clearLayers();
          setWildfireRows([]);
          setWildfireMessage("Orman yangını verisi şu anda alınamadı.");
        }
      } finally {
        if (!cancelled) setWildfireLoading(false);
      }
    };

    const scheduleLoad = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void load(); }, 650);
    };

    void load();
    map.on("moveend zoomend", scheduleLoad);
    return () => {
      cancelled = true;
      ctrl?.abort();
      if (timer) clearTimeout(timer);
      map.off("moveend zoomend", scheduleLoad);
    };
  }, [overlayWildfire, mapLoaded, L]);

  // Nöbetçi eczane katmanı — CollectAPI proxy, kullanıcı konumu / seçili il-ilçe
  useEffect(() => {
    if (!mapLoaded || !dutyPharmacyLayerRef.current) return;
    const layer = dutyPharmacyLayerRef.current;
    layer.clearLayers();
    if (!overlayDutyPharmacy) return;

    const il =
      smartLocationTr.city.trim() ||
      (viewportPlaceInfo.city && viewportPlaceInfo.city !== "Türkiye" ? viewportPlaceInfo.city : "");
    if (!il) return;

    const ilce = smartLocationTr.district.trim() || viewportPlaceInfo.district.trim();
    let cancelled = false;
    const qs = new URLSearchParams({ il });
    if (ilce) qs.set("ilce", ilce);

    fetch(mapApiUrl(`/map/duty-pharmacies?${qs.toString()}`))
      .then((r) => r.json())
      .then((d: {
        success?: boolean;
        configured?: boolean;
        data?: Array<{ name: string; district: string; address: string; phone: string; lat: number; lng: number }>;
      }) => {
        if (cancelled) return;
        const rows = Array.isArray(d.data) ? d.data : [];
        const font = mapUiFontFamily;
        for (const ph of rows.slice(0, 80)) {
          if (!Number.isFinite(ph.lat) || !Number.isFinite(ph.lng)) continue;
          const icon = L.divIcon({
            className: "yekpare-duty-pharmacy-marker",
            html: `<div style="width:28px;height:28px;border-radius:999px;background:#059669;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)">💊</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker([ph.lat, ph.lng], { icon });
          m.bindTooltip(ph.name, { direction: "top" });
          m.bindPopup(
            `<div style="min-width:200px;font-family:${font};font-size:12px;line-height:1.45;color:#0f172a">` +
              `<strong style="font-size:13px">${ph.name}</strong>` +
              `<span style="float:right;font-size:10px;color:#059669;font-weight:600">Nöbetçi</span><br/>` +
              (ph.district ? `<span style="display:block;margin-top:4px">${ph.district}</span>` : "") +
              (ph.address ? `<small style="display:block;margin-top:4px;color:#475569">${ph.address}</small>` : "") +
              (ph.phone ? `<small style="display:block;margin-top:6px;color:#334155">☎ ${ph.phone}</small>` : "") +
              `</div>`,
          );
          layer.addLayer(m);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    overlayDutyPharmacy,
    mapLoaded,
    L,
    smartLocationTr.city,
    smartLocationTr.district,
    viewportPlaceInfo.city,
    viewportPlaceInfo.district,
  ]);

  // KGM trafik / yol durumu — harita üzerinde çalışma ve kapalı yol noktaları
  useEffect(() => {
    if (!mapLoaded || !kgmContextRef.current || !leafletMapRef.current || !L) return;
    const layer = kgmContextRef.current;
    const map = leafletMapRef.current;
    layer.clearLayers();
    if (!roadStatusLayerVisible) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ctrl: AbortController | null = null;

    const drawTraffic = (data: {
      roadWorks?: Array<{ lat: number; lng: number; name: string; detail?: string }>;
      closedRoads?: Array<{ lat: number; lng: number; name: string; detail?: string }>;
      trafficLevel?: string;
      trafficNote?: string;
    }) => {
      layer.clearLayers();
      const addDot = (lat: number, lng: number, color: string, label: string, detail?: string) => {
        const marker = L.circleMarker([lat, lng], { radius: 6, color, weight: 2, fillColor: color, fillOpacity: 0.88 });
        marker.bindTooltip(label, { direction: "top" });
        marker.bindPopup(`<div style="font-size:12px"><strong>${escapeHtmlText(label)}</strong>${detail ? `<br/>${escapeHtmlText(detail)}` : ""}</div>`);
        marker.addTo(layer);
      };
      for (const item of data.roadWorks ?? []) {
        if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) addDot(item.lat, item.lng, "#f97316", item.name, item.detail);
      }
      for (const item of data.closedRoads ?? []) {
        if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) addDot(item.lat, item.lng, "#dc2626", item.name, item.detail);
      }
    };

    const load = async () => {
      if (cancelled) return;
      ctrl?.abort();
      ctrl = new AbortController();
      const b = map.getBounds();
      const qs = new URLSearchParams({
        south: String(Number(b.getSouth().toFixed(4))),
        west: String(Number(b.getWest().toFixed(4))),
        north: String(Number(b.getNorth().toFixed(4))),
        east: String(Number(b.getEast().toFixed(4))),
      });
      try {
        const r = await fetch(mapApiUrl(`/map/traffic/status?${qs.toString()}`), { signal: ctrl.signal });
        const d = await r.json() as { success?: boolean; data?: { roadWorks?: Array<{ lat: number; lng: number; name: string; detail?: string }>; closedRoads?: Array<{ lat: number; lng: number; name: string; detail?: string }>; trafficLevel?: string; trafficNote?: string } };
        if (cancelled || !d.success || !d.data) return;
        drawTraffic(d.data);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
      }
    };

    const scheduleLoad = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void load(); }, 500);
    };

    void load();
    map.on("moveend zoomend", scheduleLoad);
    return () => {
      cancelled = true;
      ctrl?.abort();
      if (timer) clearTimeout(timer);
      map.off("moveend zoomend", scheduleLoad);
      layer.clearLayers();
    };
  }, [roadStatusLayerVisible, mapLoaded, L]);

  // OpenSky — canlı uçuşlar (Keşfet · Hava yolu sekmesi)
  useEffect(() => {
    if (!mapLoaded || !aircraftLayerRef.current) return;
    const layer = aircraftLayerRef.current;
    const showAircraft =
      geoDataTab === "kgm" &&
      guzergahSubTab === "hava" &&
      leftSidebarTab === "temel_haritalar" &&
      (isMobile || desktopGeoPanelOpen);
    if (!showAircraft) {
      layer.clearLayers();
      setFlightRows([]);
      return;
    }
    let cancelled = false;
    let iv: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      setFlightLoading(true);
      setFlightError(null);
      try {
        const icao = flightAirportIcao.trim().toUpperCase();
        let box = FLIGHT_BBOX[flightRegion];
        if (/^[A-Z]{4}$/.test(icao) && TR_AIRPORT_PRESETS[icao]) {
          const c = TR_AIRPORT_PRESETS[icao];
          box = bboxAroundPoint(c.lat, c.lng, 1.35);
        }
        const qs = new URLSearchParams({
          lamin: String(box.lamin),
          lamax: String(box.lamax),
          lomin: String(box.lomin),
          lomax: String(box.lomax),
        });
        const r = await fetch(mapApiUrl(`/map/opensky/states?${qs}`));
        const j = (await r.json()) as { success?: boolean; states?: unknown; error?: string };
        if (cancelled) return;
        if (!r.ok || j.success === false) {
          setFlightError(j.error || `opensky_${r.status}`);
          setFlightRows([]);
          layer.clearLayers();
          return;
        }
        let rows = parseOpenSkyStatesPayload(j);
        if (flightHideOnGround) rows = rows.filter((x) => !x.onGround);
        rows = filterByOperator(rows, flightOperatorFilter);
        rows = rows.slice(0, 450);
        setFlightRows(rows);
        setFlightLastUpdate(new Date());
        layer.clearLayers();
        const font = mapUiFontFamily;
        for (const a of rows) {
          const h = a.headingDeg ?? 0;
          const planeSvg =
            `<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
            `<path fill="#0ea5e9" stroke="#075985" stroke-width="1.1" d="M12 2l2.2 7.2H22l-6.5 4.8L18 22l-6-4.2L6 22l2.5-8L2 9.2h7.8L12 2z"/>` +
            `</svg>`;
          const icon = L.divIcon({
            className: "yekpare-aircraft-marker",
            html:
              `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;transform:rotate(${h}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35))">` +
              planeSvg +
              `</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker([a.lat, a.lng], { icon });
          const cs = (a.callsign || "").trim() || a.icao24;
          m.bindTooltip(cs, { direction: "top" });
          m.bindPopup(
            `<div style="min-width:200px;font-family:${font};font-size:12px;color:#0f172a">` +
              `<strong>${cs}</strong><br/><span style="color:#64748b">${a.icao24}</span><br/>` +
              `<small style="display:block;margin-top:6px">${a.onGround ? "Yerde" : "Havada"} · ` +
              `${a.baroAltitudeM != null ? Math.round(a.baroAltitudeM) + " m · " : ""}` +
              `${a.velocityMps != null ? Math.round(a.velocityMps * 3.6) + " km/h" : "—"}</small>` +
              `<small style="display:block;margin-top:4px;color:#475569">${a.originCountry ?? ""}</small></div>`,
          );
          m.addTo(layer);
        }
      } catch (e) {
        if (!cancelled) {
          setFlightError(String(e));
          layer.clearLayers();
          setFlightRows([]);
        }
      } finally {
        if (!cancelled) setFlightLoading(false);
      }
    };

    void run();
    iv = setInterval(run, 45000);
    return () => {
      cancelled = true;
      if (iv) clearInterval(iv);
    };
  }, [
    mapLoaded,
    leftSidebarTab,
    geoDataTab,
    guzergahSubTab,
    desktopGeoPanelOpen,
    isMobile,
    flightRegion,
    flightAirportIcao,
    flightOperatorFilter,
    flightHideOnGround,
    flightRefreshNonce,
    L,
  ]);

  function weatherEmoji(code: number): string {
    if ([0].includes(code)) return "☀️";
    if ([1, 2].includes(code)) return "⛅";
    if ([3, 45, 48].includes(code)) return "☁️";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌤️";
  }

  useEffect(() => {
    if (!searchedLocationInfo) {
      setSearchedLocationWeather(null);
      setSearchedLocationHotels([]);
      setSearchedLocationHotelAffiliateUrl(null);
      setSearchedLocationEnrichmentLoading(false);
      setSearchedLocationHotelsLoading(false);
      setLocationCardPhotoIdx(0);
      return;
    }
    let cancelled = false;
    setSearchedLocationWeather(null);
    setSearchedLocationHotels([]);
    setSearchedLocationHotelAffiliateUrl(null);
    setSearchedLocationEnrichmentLoading(true);
    setSearchedLocationHotelsLoading(true);
    setLocationCardPhotoIdx(0);

    const params = new URLSearchParams({
      lat: String(searchedLocationInfo.lat),
      lng: String(searchedLocationInfo.lng),
      title: searchedLocationInfo.title,
    });
    const locId = searchedLocationInfo.id;
    void fetchJsonWithTimeout<{
      success?: boolean;
      data?: {
        weather?: { label?: string; temperature?: number | null; weatherCode?: number | null } | null;
        wiki?: { title?: string; summary?: string; url?: string; photos?: string[] } | null;
        imageUrls?: string[];
        imageUrl?: string | null;
        hotels?: LocationCardHotelRow[];
        hotelAffiliateUrl?: string | null;
      };
    }>(mapApiUrl(`/map/location-info?${params}`), { timeoutMs: MAPS_FETCH_TIMEOUT_MS })
      .then(({ ok, data: d }) => {
        if (cancelled) return;
        if (!ok || !d?.success || !d.data) {
          setSearchedLocationWeather({ label: "Hava durumu şu anda alınamadı." });
          return;
        }
        const weather = d.data.weather;
        if (weather?.label) {
          setSearchedLocationWeather({
            label: weather.label,
            status: searchedLocationInfo.title.split(",")[0]?.trim() || searchedLocationInfo.title,
          });
        } else {
          setSearchedLocationWeather({ label: "Hava durumu şu anda alınamadı." });
        }

        const imageUrls = Array.isArray(d.data.imageUrls)
          ? d.data.imageUrls.filter((url) => String(url || "").trim().length > 8)
          : [];
        const wiki = d.data.wiki;
        setSearchedLocationInfo((prev) => {
          if (!prev || prev.id !== locId) return prev;
          return {
            ...prev,
            imageUrls: imageUrls.length > 0 ? imageUrls : prev.imageUrls,
            imageUrl: imageUrls[0] || d.data?.imageUrl || prev.imageUrl,
            wikiTitle: wiki?.title || prev.wikiTitle,
            wikiSummary: wiki?.summary || prev.wikiSummary,
            wikiUrl: wiki?.url || prev.wikiUrl,
          };
        });
        setSelectedLocation((prev) => (
          prev && !prev.imageUrl && (imageUrls[0] || d.data?.imageUrl)
            ? { ...prev, imageUrl: imageUrls[0] || d.data?.imageUrl || undefined }
            : prev
        ));
        setSearchedLocationHotels(Array.isArray(d.data.hotels) ? d.data.hotels : []);
        setSearchedLocationHotelAffiliateUrl(d.data.hotelAffiliateUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setSearchedLocationWeather({ label: "Hava durumu şu anda alınamadı." });
      })
      .finally(() => {
        if (!cancelled) {
          setSearchedLocationEnrichmentLoading(false);
          setSearchedLocationHotelsLoading(false);
        }
      });

    return () => { cancelled = true; };
  /**
   * `title` bilinçli olarak bağımlılık DEĞİL: reverse geocode başlığı rafine ettikçe
   * ("Ankara" ↔ "Çankaya") tüm zenginleştirme baştan koşup hava/otel/spinner'ı
   * sıfırlıyor ve kart sürekli "yükleniyor"da titriyordu. id+koordinat yeterli.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchedLocationInfo?.id, searchedLocationInfo?.lat, searchedLocationInfo?.lng]);

  const fetchLocationRegisteredCount = useCallback(async (loc: SearchedLocationInfo) => {
    const myId = ++locationRegisteredCountSeqRef.current;
    setLocationRegisteredCountLoading(true);
    try {
      const scopeCity = resolveLocationCardScopeCity(loc, ilCenters);
      const hasCoords = Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
      if (!scopeCity && !hasCoords) {
        if (myId === locationRegisteredCountSeqRef.current) {
          setLocationRegisteredCount(null);
          setLocationRegisteredCountLoading(false);
        }
        return;
      }
      const buildParams = (requireCityScope: boolean) => {
        const params = new URLSearchParams({ limit: "0" });
        if (scopeCity) {
          params.set("city", scopeCity.cityLabel);
          params.set("citySlug", scopeCity.citySlug);
          if (requireCityScope) params.set("requireCityScope", "1");
        }
        if (hasCoords) {
          params.set("lat", String(loc.lat));
          params.set("lng", String(loc.lng));
          params.set("radius", nearby50Km ? "50000" : "20000");
        }
        return params;
      };
      const readTotal = async (requireCityScope: boolean): Promise<number | null> => {
        const { ok, data: d } = await fetchJsonWithTimeout<{ success?: boolean; total?: number }>(
          mapApiUrl(`/map/businesses?${buildParams(requireCityScope)}`),
          { timeoutMs: MAPS_FETCH_TIMEOUT_MS },
        );
        if (!ok || !d?.success) return null;
        return typeof d.total === "number" ? d.total : 0;
      };
      let total = await readTotal(Boolean(scopeCity));
      if (myId !== locationRegisteredCountSeqRef.current) return;
      // Şehir kapsamı 0/başarısız ama koordinat varsa: yarıçap taramasıyla tekrar dene.
      if ((total === null || total === 0) && scopeCity && hasCoords) {
        const radiusTotal = await readTotal(false);
        if (myId !== locationRegisteredCountSeqRef.current) return;
        if (radiusTotal !== null && radiusTotal > 0) total = radiusTotal;
      }
      setLocationRegisteredCount(total);
    } catch {
      if (myId === locationRegisteredCountSeqRef.current) setLocationRegisteredCount(null);
    } finally {
      if (myId === locationRegisteredCountSeqRef.current) setLocationRegisteredCountLoading(false);
    }
  }, [ilCenters, nearby50Km]);

  useEffect(() => {
    if (!searchedLocationInfo) {
      setLocationRegisteredCount(null);
      setLocationRegisteredCountLoading(false);
      return;
    }
    void fetchLocationRegisteredCount(searchedLocationInfo);
  /* title/areaInfo bağımlılık değil: geocode etiket salınımı sayacı sonsuz "yükleniyor"a sokuyordu. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchedLocationInfo?.id,
    searchedLocationInfo?.lat,
    searchedLocationInfo?.lng,
    fetchLocationRegisteredCount,
  ]);

  useEffect(() => {
    if (!searchedLocationInfo) return;
    if (searchedLocationInfo.imageUrl || (searchedLocationInfo.imageUrls?.length ?? 0) > 0) return;
    let cancelled = false;
    const title = searchedLocationInfo.title.trim();
    if (title.length < 2) return;

    const applyImage = (url: string | null | undefined) => {
      const imageUrl = String(url ?? "").trim();
      if (!imageUrl || cancelled) return;
      setSearchedLocationInfo((prev) => prev && !prev.imageUrl ? { ...prev, imageUrl, imageUrls: [imageUrl] } : prev);
      setSelectedLocation((prev) => prev && !prev.imageUrl ? { ...prev, imageUrl } : prev);
    };

    const fetchWikiImage = async (q: string): Promise<string | null> => {
      const term = q.trim();
      if (term.length < 2) return null;
      try {
        const wikiRes = await fetch(mapApiUrl(`/wiki/article/${encodeURIComponent(term)}`));
        const wikiData = await wikiRes.json() as {
          success?: boolean;
          data?: {
            thumbnail?: { source?: string };
            originalimage?: { source?: string };
            images?: Array<{ src?: string }>;
          };
        };
        if (!wikiData?.success || !wikiData.data) return null;
        const gallery = Array.isArray(wikiData.data.images)
          ? wikiData.data.images.map((img) => String(img.src || "").trim()).filter(Boolean)
          : [];
        return gallery[0]
          || wikiData.data.originalimage?.source
          || wikiData.data.thumbnail?.source
          || null;
      } catch {
        return null;
      }
    };

    void (async () => {
      const areaCity = String(searchedLocationInfo.areaInfo ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop();
      const candidates = Array.from(new Set([
        title,
        title.replace(/\s*\(.*?\)\s*/g, " ").trim(),
        title.split(",")[0]?.trim() || "",
        title.split("-")[0]?.trim() || "",
        areaCity || "",
      ].map((s) => s.trim()).filter((s) => s.length >= 2)));
      for (const candidate of candidates) {
        if (cancelled) return;
        const img = await fetchWikiImage(candidate);
        if (img) {
          applyImage(img);
          return;
        }
      }
    })();

    return () => { cancelled = true; };
  /* title bağımlılık değil — geocode etiket salınımında wiki görsel araması tekrar tekrar koşuyordu. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchedLocationInfo?.id, searchedLocationInfo?.imageUrl, searchedLocationInfo?.imageUrls?.length, searchedLocationInfo?.lat, searchedLocationInfo?.lng]);

  // Weather markers for 81 il centers (MGM summary proxy)
  useEffect(() => {
    if (!mapLoaded || !weatherLayerRef.current) return;
    const layer = weatherLayerRef.current;
    layer.clearLayers();
    if (!overlayWeather) return;
    let cancelled = false;
    fetch(mapApiUrl("/map/mgm-weather-summary?limit=81"))
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: Array<{ city: string; lat: number; lng: number; temperature: number; weatherCode: number }> }) => {
        const rows = Array.isArray(d.data) ? d.data : [];
      if (cancelled) return;
        setMgmRows(rows);
      for (const row of rows) {
          const emoji = weatherEmoji(Number(row.weatherCode ?? 1));
          const t = Number.isFinite(Number(row.temperature)) ? `${Math.round(Number(row.temperature))}°` : "--°";
        const icon = L.divIcon({
          className: "",
          html: `<div style="padding:2px 7px;border-radius:11px;background:rgba(15,23,42,0.82);color:#fff;font-size:11px;font-weight:600;letter-spacing:-0.01em;font-family:${mapUiFontFamily};display:flex;gap:4px;align-items:center;border:1px solid rgba(255,255,255,0.22);box-shadow:0 1px 4px rgba(0,0,0,0.18)"><span>${emoji}</span><span>${t}</span></div>`,
          iconSize: [54, 22],
          iconAnchor: [27, 11],
        });
          const m = L.marker([row.lat, row.lng], { icon, zIndexOffset: -100 });
          m.bindTooltip(`${row.city} · ${t}`, { direction: "top" });
        layer.addLayer(m);
      }
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [overlayWeather, mapLoaded, L]);

  useEffect(() => {
    if (geoDataTab !== "population" && !overlayPopulation) return;
    const ctrl = new AbortController();
    setPopulationLoading(true);
    fetch(mapApiUrl(`/map/population/viewport?lat=${encodeURIComponent(String(viewportPlaceInfo.lat))}&lng=${encodeURIComponent(String(viewportPlaceInfo.lng))}&city=${encodeURIComponent(viewportPlaceInfo.city)}&district=${encodeURIComponent(viewportPlaceInfo.district)}`), {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: typeof populationInfo }) => {
        setPopulationInfo(d.success ? (d.data ?? null) : null);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setPopulationInfo(null);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setPopulationLoading(false);
      });
    return () => ctrl.abort();
  }, [geoDataTab, overlayPopulation, viewportPlaceInfo.city, viewportPlaceInfo.district, viewportPlaceInfo.lat, viewportPlaceInfo.lng]);

  // Load static data once on mount
  useEffect(() => {
    fetch(mapApiUrl("/map/categories")).then(r=>r.json()).then(d=>{ if(d.success) setCategories(d.data); });
    fetch(mapApiUrl("/map/businesses/premium-count")).then(r => r.json()).then(d => {
      if (d.success && typeof d.count === "number") setTurkeyPremiumCount(d.count);
    }).catch(() => {});
    fetch(mapApiUrl("/map/turkey-il-centers"))
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: { plaka: number | null; adi: string; lat: number; lng: number; zoom: number }[] }) => {
        if (d.success && Array.isArray(d.data)) setIlCenters(d.data);
      })
      .catch(() => {});
    fetch(mapApiUrl("/tr-address/provinces"))
      .then((r) => r.json())
      .then((rows: Array<{ plaka?: number; adi?: string }>) => {
        setParcelProvinces(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setParcelProvinces([]));
    // `?nav=<bizId>` URL'inin işlenmesi (işletmeyi seç + detay kartını aç + haritada
    // ortala) artık aşağıdaki URL işleme efektine taşındı. Böylece harita henüz
    // yüklenmemişken de (mapLoaded değişince efekt yeniden çalışır) doğru çalışır ve
    // koordinat/place_id dalının seçili işletmeyi sıfırlaması engellenir. Ayrıca
    // navigasyon (Konuma git) paneli OTOMATİK açılmaz — yalnız kullanıcı tıklayınca.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!parcelForm.il) {
      setParcelDistricts([]);
      setParcelNeighborhoods([]);
      return;
    }
    fetch(mapApiUrl(`/tr-address/districts?plaka=${encodeURIComponent(parcelForm.il)}`))
      .then((r) => r.json())
      .then((rows: Array<{ kimlikNo?: string; adi?: string }>) => {
        setParcelDistricts(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setParcelDistricts([]));
  }, [parcelForm.il]);

  useEffect(() => {
    if (!parcelForm.ilce) {
      setParcelNeighborhoods([]);
      return;
    }
    fetch(mapApiUrl(`/tr-address/neighborhoods?ilceKimlik=${encodeURIComponent(parcelForm.ilce)}&limit=120`))
      .then((r) => r.json())
      .then((rows: Array<{ kimlikNo?: string; adi?: string }>) => {
        setParcelNeighborhoods(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setParcelNeighborhoods([]));
  }, [parcelForm.ilce]);

  useEffect(() => {
    if (!kgmStartIl) { setKgmStartDistricts([]); setKgmStartIlce(""); return; }
    fetch(mapApiUrl(`/tr-address/districts?plaka=${encodeURIComponent(kgmStartIl)}`))
      .then((r) => r.json())
      .then((rows: Array<{ kimlikNo?: string; adi?: string }>) => setKgmStartDistricts(Array.isArray(rows) ? rows : []))
      .catch(() => setKgmStartDistricts([]));
  }, [kgmStartIl]);

  useEffect(() => {
    if (!kgmEndIl) { setKgmEndDistricts([]); setKgmEndIlce(""); return; }
    fetch(mapApiUrl(`/tr-address/districts?plaka=${encodeURIComponent(kgmEndIl)}`))
      .then((r) => r.json())
      .then((rows: Array<{ kimlikNo?: string; adi?: string }>) => setKgmEndDistricts(Array.isArray(rows) ? rows : []))
      .catch(() => setKgmEndDistricts([]));
  }, [kgmEndIl]);

  // Re-process URL search params whenever Wouter navigation changes them (veya Places anahtarı yüklendiğinde `place_id` çözümü için).
  const lastProcessedUrlRef = useRef<string | null>(null);
  const lastUrlCoordViewRef = useRef<string | null>(null);
  const lastUrlCoordPosRef = useRef<string | null>(null);
  useEffect(() => {
    const skipNewsmapActivationFromMapSync = mapUrlSyncFromMapRef.current;
    mapUrlSyncFromMapRef.current = false;
    const mapsReady =
      mapsGeoEffective.mapsGoogleEnabled === true && Boolean((mapsGeoEffective.mapsGoogleBrowserKey ?? "").trim());
    const currentPath = typeof window !== "undefined" ? window.location.pathname : (currentLocation.split("?")[0] || "/");
    const liveQuery = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : urlQueryStr;
    const geoSig = `${currentPath}|${liveQuery}|maps:${mapsReady ? "1" : "0"}|leaflet:${mapLoaded ? "1" : "0"}|il:${ilCenters.length}`;
    if (lastProcessedUrlRef.current === geoSig) return;
    lastProcessedUrlRef.current = geoSig;

    const urlParams = new URLSearchParams(liveQuery);
    const urlQ = urlParams.get("q");
    const urlDistrict = urlParams.get("district")?.trim() || "";
    const urlDiscoveryCity = urlParams.get("city");
    const urlLocationRaw = urlParams.get("location")?.trim() || "";
    const urlLocation =
      urlLocationRaw
      || (urlDistrict && urlDiscoveryCity ? `${urlDistrict}, ${urlDiscoveryCity}, Türkiye` : "")
      || urlDiscoveryCity
      || "";
    const urlPlaceId = urlParams.get("place_id")?.trim() || "";
    const urlShare = urlParams.get("share")?.trim() || "";
    const urlSuper = urlParams.get("super") || urlParams.get("superCategory");
    const urlDiscoveryRegion = urlParams.get("country") || urlParams.get("region");
    const urlDiscoveryCategory = urlParams.get("category");
    const urlBase = urlParams.get("base")?.trim();
    const urlLayers = new Set((urlParams.get("layers") || "").split(",").map((x) => x.trim()).filter(Boolean));
    const pathPlace = parseYekparePlacePath(currentPath);
    const pathSyncedPoint = parseYekpareSyncedMapPath(currentPath);
    const urlLatLng = parseMapTargetLatLng(urlParams.get("lat"), urlParams.get("lng") ?? urlParams.get("lon"));
    const urlZoom = parseMapZoom(urlParams.get("zoom") ?? urlParams.get("z"), 13);
    const coordinateTarget =
      pathPlace ??
      pathSyncedPoint ??
      (urlLatLng
        ? { name: urlQ || urlLocation || "Konum", lat: urlLatLng.lat, lng: urlLatLng.lng, zoom: urlZoom }
        : null);

    // `?nav=<bizId>` — işletmeyi doğrudan id ile getir, SEÇ ve DETAY kartını göster
    // (İncele görünümü). Navigasyon/yol tarifi paneli OTOMATİK AÇILMAZ; yalnız kullanıcı
    // "Konuma git"e tıklayınca başlar. Bu dal koordinat/place_id dallarından önce çalışır
    // ve erken döner; aksi halde coordinateTarget dalı `setSelectedBiz(null)` ile seçimi
    // sıfırlar (boş harita) veya place_id geocode beklenir (geç açılma).
    const navBizId = urlParams.get("nav")?.trim() || "";
    if (navBizId) {
      // Koordinat varsa haritayı hemen ortala (işletme getirilmeden boş harita kalmasın).
      if (urlLatLng && leafletMapRef.current) {
        hasUserNavigatedRef.current = true;
        urlLocationCenterRef.current = { lat: urlLatLng.lat, lng: urlLatLng.lng };
        leafletMapRef.current.setView([urlLatLng.lat, urlLatLng.lng], urlZoom, { animate: true });
      }
      if (processedNavBizIdRef.current !== navBizId) {
        processedNavBizIdRef.current = navBizId;
        setUrlGeoReady(false);
        void fetch(mapApiUrl(`/map/businesses/${navBizId}`))
          .then((r) => r.json())
          .then((d) => {
            const biz = d?.data?.business ?? d?.data ?? d?.business;
            if (d?.success && biz && biz.id) {
              setSelectedBiz(biz);
              setLeftSidebarTab("isletmeler");
              setLocationPanelTab("businesses");
              if (isMobile) setMenuOpen(true);
              else setDesktopGeoPanelOpen(true);
              const blat = Number(biz.latitude);
              const blng = Number(biz.longitude);
              if (Number.isFinite(blat) && Number.isFinite(blng)) {
                hasUserNavigatedRef.current = true;
                urlLocationCenterRef.current = { lat: blat, lng: blng };
                if (leafletMapRef.current) {
                  leafletMapRef.current.setView([blat, blng], 17, { animate: true });
                }
              }
            }
          })
          .catch(() => {})
          .finally(() => setUrlGeoReady(true));
      } else {
        setUrlGeoReady(true);
      }
      return;
    }

    if (urlQ) {
      setSearch(urlQ);
      setSmartKeyword(urlQ);
    }

    const staticDiscoveryCity = findKesfetDiscoveryCity(urlDiscoveryRegion, urlDiscoveryCity)
      ?? findDiscoveryCityAcrossRegions(urlDiscoveryCity);
    if (urlDiscoveryCategory) {
      const discoveryCategory = findKesfetDiscoveryCategory(urlDiscoveryCategory);
      if (discoveryCategory) {
        setMapSuperCategory(discoveryCategory.top.homepageSuperCategory);
        setSearch(discoveryCategory.child?.googleKeyword ?? discoveryCategory.top.googleKeyword);
        setSmartKeyword(discoveryCategory.child?.googleKeyword ?? discoveryCategory.top.googleKeyword);
        setLocationPanelTab("businesses");
      }
    }
    if (urlDiscoveryRegion && staticDiscoveryCity) {
      setUrlGeoReady(false);
      hasUserNavigatedRef.current = true;
      urlLocationCenterRef.current = { lat: staticDiscoveryCity.lat, lng: staticDiscoveryCity.lng };
      setUserLocation({ lat: staticDiscoveryCity.lat, lng: staticDiscoveryCity.lng });
      setSmartLocation(staticDiscoveryCity.label);
      const virtualLoc: PopularLocation = {
        id: `directory-${urlDiscoveryRegion}-${staticDiscoveryCity.slug}`,
        name: staticDiscoveryCity.label,
        nameTr: staticDiscoveryCity.label,
        latitude: staticDiscoveryCity.lat,
        longitude: staticDiscoveryCity.lng,
        zoomLevel: staticDiscoveryCity.zoom ?? 12,
        region: findKesfetDiscoveryRegion(urlDiscoveryRegion)?.label ?? "",
      };
      goToLocation(virtualLoc, { clearNearby: false, panel: "preserve" });
      openSearchedLocationCardFromUrl(virtualLoc.id, {
        id: virtualLoc.id,
        title: staticDiscoveryCity.label,
        areaInfo: findKesfetDiscoveryRegion(urlDiscoveryRegion)?.label ?? "",
        address: staticDiscoveryCity.label,
        lat: staticDiscoveryCity.lat,
        lng: staticDiscoveryCity.lng,
      });
      setLocationPanelTab("businesses");
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([staticDiscoveryCity.lat, staticDiscoveryCity.lng], staticDiscoveryCity.zoom ?? 12, { animate: true });
      }
      setUrlGeoReady(true);
      return;
    }

    // Sarı Sayfalar `haritalarNavHref({ city })` — il merkezi + şehir kartı (Konuma git ile aynı).
    // `coordinateTarget` olsa bile `?city=` önceliklidir; URL senkronu lat/lng ekledikten sonra da geçerli kalır.
    const provinceOnlyCenter = !urlDistrict && urlDiscoveryCity
      ? resolveTurkishProvinceCenter(urlDiscoveryCity, ilCenters)
      : null;
    if (provinceOnlyCenter && !urlDiscoveryRegion) {
      setUrlGeoReady(false);
      hasUserNavigatedRef.current = true;
      urlLocationCenterRef.current = { lat: provinceOnlyCenter.lat, lng: provinceOnlyCenter.lng };
      setUserLocation({ lat: provinceOnlyCenter.lat, lng: provinceOnlyCenter.lng });
      setSmartLocation(provinceOnlyCenter.label);
      const virtualLoc: PopularLocation = {
        id: `province-${provinceOnlyCenter.slug}`,
        name: provinceOnlyCenter.label,
        nameTr: provinceOnlyCenter.label,
        latitude: provinceOnlyCenter.lat,
        longitude: provinceOnlyCenter.lng,
        zoomLevel: provinceOnlyCenter.zoom,
        region: "Türkiye",
      };
      const cityCard: SearchedLocationInfo = {
        id: virtualLoc.id,
        title: provinceOnlyCenter.label,
        areaInfo: "Türkiye",
        address: `${provinceOnlyCenter.label}, Türkiye`,
        lat: provinceOnlyCenter.lat,
        lng: provinceOnlyCenter.lng,
      };
      goToLocation(virtualLoc, { clearNearby: false, panel: "preserve" });
      setNearby50Km(true);
      const pathOnlyForNewsmap = currentPath.replace(/\/+$/, "") || "/";
      if (isNewsmapPublicPath(pathOnlyForNewsmap)) {
        activateNewsmapLocationRef.current({
          lat: provinceOnlyCenter.lat,
          lng: provinceOnlyCenter.lng,
          zoom: provinceOnlyCenter.zoom,
          label: provinceOnlyCenter.label,
          source: "url_city",
        });
      } else {
        openSearchedLocationCardFromUrl(virtualLoc.id, cityCard);
        setLocationPanelTab("businesses");
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.setView(
          [provinceOnlyCenter.lat, provinceOnlyCenter.lng],
          provinceOnlyCenter.zoom,
          { animate: true },
        );
      }
      setUrlGeoReady(true);
      return;
    }

    if (urlShare) {
      setUrlGeoReady(false);
      void fetch(mapApiUrl(`/map/share-states/${encodeURIComponent(urlShare)}`))
        .then((r) => r.json())
        .then((d: { success?: boolean; data?: {
          centerLat: number; centerLng: number; zoom: number; baseLayer?: string; layers?: string[]; filters?: { q?: string; category?: string | null; superCategory?: string | null };
        } }) => {
          if (!d.success || !d.data) return;
          const row = d.data;
          if (row.baseLayer && ["temel", "hava_fotografi", "gece", "topografik", "siyasi", "fiziki"].includes(row.baseLayer)) {
            setBaseMapStyle(row.baseLayer as typeof baseMapStyle);
          }
          const layers = new Set(Array.isArray(row.layers) ? row.layers : []);
          setOverlayEarthquake(layers.has("earthquake"));
          setOverlayWeather(layers.has("weather"));
          setOverlayWildfire(layers.has("wildfire"));
          setOverlayDutyPharmacy(layers.has("dutyPharmacy"));
          setOverlayPopulation(layers.has("population"));
          setOverlayElevation(layers.has("elevation"));
          setOverlayRaster(layers.has("raster"));
          setOverlayGeodesyGrid(layers.has("geodesyGrid"));
          setRoadStatusLayerVisible(layers.has("roadStatus"));
          setServerClusterEnabled(layers.has("serverCluster"));
          if (row.filters?.q) {
            setSearch(row.filters.q);
            setSmartKeyword(row.filters.q);
          }
          setSelectedCategory(row.filters?.category || null);
          setMapSuperCategory(row.filters?.superCategory || null);
          if (leafletMapRef.current && Number.isFinite(row.centerLat) && Number.isFinite(row.centerLng)) {
            hasUserNavigatedRef.current = true;
            urlLocationCenterRef.current = { lat: Number(row.centerLat), lng: Number(row.centerLng) };
            leafletMapRef.current.setView([Number(row.centerLat), Number(row.centerLng)], Number(row.zoom) || 6, { animate: true });
          }
        })
        .finally(() => setUrlGeoReady(true));
      return;
    }

    if (urlSuper) {
      const allowed = new Set(["mekan", "mekan_dukkan", "siparis", "alisveris", "turizm", "hizmet", "ulasim", "kamu", "firma_rehberi", "all", "tum", "none"]);
      if (allowed.has(urlSuper)) {
        const normalized = ["all", "tum", "none"].includes(urlSuper) ? null : urlSuper;
        setSelectedCategory(null);
        setMapSuperCategory(normalized);
        if (!urlQ) {
          setSearch("");
          setSmartKeyword("");
        }
        setLeftSidebarTab("isletmeler");
        setLocationPanelTab("businesses");
        if (isMobile) {
          setMenuOpen(true);
        } else {
          setDesktopGeoPanelOpen(true);
        }
      }
    }

    if (urlBase && ["temel", "hava_fotografi", "gece", "topografik", "siyasi", "fiziki"].includes(urlBase)) {
      setBaseMapStyle(urlBase as typeof baseMapStyle);
    }
    if (urlLayers.size > 0) {
      setOverlayEarthquake(urlLayers.has("earthquake"));
      setOverlayWeather(urlLayers.has("weather"));
      setOverlayWildfire(urlLayers.has("wildfire"));
      setOverlayDutyPharmacy(urlLayers.has("dutyPharmacy"));
      setOverlayPopulation(urlLayers.has("population"));
      setOverlayElevation(urlLayers.has("elevation"));
      setOverlayRaster(urlLayers.has("raster"));
      setOverlayGeodesyGrid(urlLayers.has("geodesyGrid"));
      setRoadStatusLayerVisible(urlLayers.has("roadStatus"));
      setServerClusterEnabled(urlLayers.has("serverCluster"));
    }

    if (coordinateTarget) {
      if (Date.now() < newsmapLocationExitUntilRef.current) {
        setUrlGeoReady(true);
        return;
      }
      const coordPosKey = `${coordinateTarget.lat.toFixed(5)}:${coordinateTarget.lng.toFixed(5)}`;
      const coordViewKey = `${coordPosKey}:${coordinateTarget.zoom}`;
      const pathOnlyForNewsmap = currentPath.replace(/\/+$/, "") || "/";
      const urlIsNewsmapPage = isNewsmapPublicPath(pathOnlyForNewsmap);
      const provinceForCoord = urlDiscoveryCity && !urlDistrict
        ? resolveTurkishProvinceCenter(urlDiscoveryCity, ilCenters)
        : null;
      const initialCoordLabel = provinceForCoord?.label ?? urlLocation ?? urlQ ?? coordinateTarget.name;
      const coordTargetZoom = Math.max(coordinateTarget.zoom, NEWSMAP_CLUSTER_MAX_ZOOM + 1);
      const isRepeatCoordPos = lastUrlCoordPosRef.current === coordPosKey;
      const isRepeatCoord = lastUrlCoordViewRef.current === coordViewKey;
      if (!isRepeatCoord && !skipNewsmapActivationFromMapSync) {
        lastUrlCoordViewRef.current = coordViewKey;
        if (!isRepeatCoordPos) lastUrlCoordPosRef.current = coordPosKey;
        setUrlGeoReady(false);
        hasUserNavigatedRef.current = true;
        urlLocationCenterRef.current = { lat: coordinateTarget.lat, lng: coordinateTarget.lng };
        setUserLocation({ lat: coordinateTarget.lat, lng: coordinateTarget.lng });
        setSmartLocation(coordinateTarget.name);
        if (!urlQ) {
          setSearch("");
          setSmartKeyword("");
        }
        setSelectedBiz(null);
        const virtualLoc: PopularLocation = {
          id: `url-coord-${coordinateTarget.lat}-${coordinateTarget.lng}`,
          name: coordinateTarget.name,
          nameTr: coordinateTarget.name,
          latitude: coordinateTarget.lat,
          longitude: coordinateTarget.lng,
          zoomLevel: coordinateTarget.zoom,
          region: "",
        };
        goToLocation(virtualLoc, { clearNearby: false, panel: "preserve" });
        if (urlQ) setLocationPanelTab("businesses");
        if (!urlIsNewsmapPage && (urlLocation || urlQ || provinceForCoord)) {
          const cardTitle = provinceForCoord?.label ?? coordinateTarget.name;
          openSearchedLocationCardFromUrl(`xy:${coordinateTarget.lat.toFixed(5)},${coordinateTarget.lng.toFixed(5)}`, {
            id: virtualLoc.id,
            title: cardTitle,
            areaInfo: provinceForCoord ? "Türkiye" : "",
            address: provinceForCoord ? `${cardTitle}, Türkiye` : coordinateTarget.name,
            lat: coordinateTarget.lat,
            lng: coordinateTarget.lng,
          });
          if (provinceForCoord) setNearby50Km(true);
        }
        if (leafletMapRef.current) {
          leafletMapRef.current.setView(
            [coordinateTarget.lat, coordinateTarget.lng],
            urlIsNewsmapPage ? coordTargetZoom : coordinateTarget.zoom,
            { animate: true },
          );
        }
      } else if (!isRepeatCoord) {
        lastUrlCoordViewRef.current = coordViewKey;
      }
      if (urlIsNewsmapPage && !isRepeatCoordPos && !skipNewsmapActivationFromMapSync) {
        activateNewsmapLocationRef.current({
          lat: coordinateTarget.lat,
          lng: coordinateTarget.lng,
          zoom: coordTargetZoom,
          label: initialCoordLabel,
          source: "url_coords",
        });
      }
      if (!isRepeatCoord && (isGenericMapLocationLabel(coordinateTarget.name) || urlIsNewsmapPage)) {
        void reverseGeocodeHybrid(siteSettings, coordinateTarget.lat, coordinateTarget.lng)
          .then((geo) => {
            const cityName = resolveMapLocationDisplayLabel(geo.city, geo.district, geo.label);
            if (!cityName) return;
            setSmartLocation(cityName);
            setSelectedLocation((prev) => (
              prev && prev.id.startsWith("url-coord-")
                ? { ...prev, name: cityName, nameTr: cityName, region: geo.city || prev.region }
                : prev
            ));
            setViewportPlaceInfo((prev) => ({
              ...prev,
              label: cityName,
              city: cityName,
              district: geo.district || prev.district,
              lat: coordinateTarget.lat,
              lng: coordinateTarget.lng,
              loading: false,
              source: "reverse_geocode",
            }));
            setSearchedLocationInfo((prev) => (
              prev && prev.id.startsWith("newsmap-loc-")
                ? { ...prev, title: cityName, areaInfo: [geo.district, cityName].filter(Boolean).join(", "), address: geo.label || cityName }
                : prev
            ));
            if (urlIsNewsmapPage && !skipNewsmapActivationFromMapSync && lastUrlCoordPosRef.current !== coordPosKey) {
              activateNewsmapLocationRef.current({
                lat: coordinateTarget.lat,
                lng: coordinateTarget.lng,
                zoom: coordTargetZoom,
                label: cityName,
                source: "url_reverse_geocode",
              });
            }
          })
          .catch(() => {});
      }
      setUrlGeoReady(true);
      return;
    }

    async function applyNominatimLocation(loc: string) {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&countrycodes=tr&format=json&limit=3&addressdetails=1`,
        { headers: { "Accept-Language": "tr", "User-Agent": "Yekpare/1.0" } },
      );
      const geoData = await geoRes.json();
      if (geoData[0]) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);
        if (!isUsableMapCoordinate(lat, lng)) {
          const resolved = await resolveTypedMapLocation(loc);
          if (resolved) {
            applyResolvedMapLocation(resolved);
            if (urlQ) setLocationPanelTab("businesses");
          }
          return;
        }
        const addr = geoData[0].address || {};
        const cityName = addr.city || addr.town || addr.county || addr.state || loc;
        const zoomLevel = addr.city || addr.town ? 12 : 10;
        const virtualLoc = {
          id: `url-${loc}`,
          name: loc,
          nameTr: cityName,
          latitude: lat,
          longitude: lng,
          zoomLevel,
          region: addr.state || "",
        };
        urlLocationCenterRef.current = { lat, lng };
        goToLocation(virtualLoc, { clearNearby: false, panel: "preserve" });
        openSearchedLocationCardFromUrl(`url-${loc}`, {
          id: `url-${loc}`,
          title: cityName,
          areaInfo: [addr.county || addr.state_district, addr.state].filter(Boolean).join(", "),
          address: geoData[0].display_name || loc,
          lat,
          lng,
          bounds: boundsFromNominatimBoundingBox(geoData[0].boundingbox),
        });
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([lat, lng], zoomLevel, { animate: true });
        }
        if (urlQ) setLocationPanelTab("businesses");
        return;
      }
      const resolved = await resolveTypedMapLocation(loc);
      if (resolved) {
        applyResolvedMapLocation(resolved);
        if (urlQ) setLocationPanelTab("businesses");
      }
    }

    if (urlPlaceId && mapsReady) {
      setUrlGeoReady(false);
      urlLocationCenterRef.current = null;
      hasUserNavigatedRef.current = true;
      const label = urlLocation || "Konum";
      setSmartLocation(label);
      void (async () => {
        try {
          const hit: PlaceDetailsHit | null = await geocodePlaceIdServer(urlPlaceId)
            || await geocodePlaceIdClient(siteSettings, urlPlaceId);
          if (hit) {
            const locLabel = urlLocation || hit.formatted_address || label;
            setSmartLocation(locLabel);
            const addr = await reverseGeocodeHybrid(siteSettings, hit.lat, hit.lng);
            setSmartLocationTr({ city: addr.city, district: addr.district, mahalle: "", sokak: "" });
            urlLocationCenterRef.current = { lat: hit.lat, lng: hit.lng };
            setUserLocation({ lat: hit.lat, lng: hit.lng });
            const virtualLoc: PopularLocation = {
              id: `url-place-${urlPlaceId}`,
              name: hit.name || locLabel,
              nameTr: hit.name || locLabel,
              latitude: hit.lat,
              longitude: hit.lng,
              zoomLevel: 17,
              region: addr.city || "",
              imageUrl: hit.photoUrl,
            };
            goToLocation(virtualLoc, { clearNearby: false, panel: "preserve" });
            if (urlQ) setLocationPanelTab("businesses");
            openSearchedLocationCardFromUrl(`url-place-${urlPlaceId}`, {
              id: `url-place-${urlPlaceId}`,
              placeId: urlPlaceId,
              title: hit.name || locLabel,
              areaInfo: [addr.district, addr.city].filter(Boolean).join(", "),
              address: hit.formatted_address || addr.label,
              lat: hit.lat,
              lng: hit.lng,
              bounds: hit.bounds,
              imageUrl: hit.photoUrl,
            });
            if (leafletMapRef.current) leafletMapRef.current.setView([hit.lat, hit.lng], 17, { animate: true });
          } else if (urlLocation) {
            await applyNominatimLocation(urlLocation);
          }
        } catch {
          if (urlLocation) {
            try {
              await applyNominatimLocation(urlLocation);
            } catch {
              /* ignore */
            }
          }
        } finally {
          setUrlGeoReady(true);
        }
      })();
    } else if (urlLocation) {
      setUrlGeoReady(false);
      urlLocationCenterRef.current = null;
      hasUserNavigatedRef.current = true;
      setSmartLocation(urlLocation);
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(urlLocation)}&countrycodes=tr&format=json&limit=3&addressdetails=1`,
        { headers: { "Accept-Language": "tr", "User-Agent": "Yekpare/1.0" } },
      )
        .then((r) => r.json())
        .then((geoData) => {
          if (geoData[0]) {
            const lat = parseFloat(geoData[0].lat);
            const lng = parseFloat(geoData[0].lon);
            if (isUsableMapCoordinate(lat, lng)) {
              const addr = geoData[0].address || {};
              const cityName = addr.city || addr.town || addr.county || addr.state || urlLocation;
              const zoomLevel = addr.city || addr.town ? 12 : 10;
              const virtualLoc = {
                id: `url-${urlLocation}`,
                name: urlLocation,
                nameTr: cityName,
                latitude: lat,
                longitude: lng,
                zoomLevel,
                region: addr.state || "",
              };
              urlLocationCenterRef.current = { lat, lng };
              goToLocation(virtualLoc, { clearNearby: false, panel: "preserve" });
              openSearchedLocationCardFromUrl(`url-${urlLocation}`, {
                id: `url-${urlLocation}`,
                title: cityName,
                areaInfo: [addr.county || addr.state_district, addr.state].filter(Boolean).join(", "),
                address: geoData[0].display_name || urlLocation,
                lat,
                lng,
                bounds: boundsFromNominatimBoundingBox(geoData[0].boundingbox),
              });
              if (leafletMapRef.current) {
                leafletMapRef.current.setView([lat, lng], zoomLevel, { animate: true });
              }
              if (urlQ) setLocationPanelTab("businesses");
              setUrlGeoReady(true);
              return;
            }
          }
          void resolveTypedMapLocation(urlLocation).then((resolved) => {
            if (resolved) {
              applyResolvedMapLocation(resolved);
              if (urlQ) setLocationPanelTab("businesses");
            }
            setUrlGeoReady(true);
          });
        })
        .catch(() => {
          void resolveTypedMapLocation(urlLocation).then((resolved) => {
            if (resolved) {
              applyResolvedMapLocation(resolved);
              if (urlQ) setLocationPanelTab("businesses");
            }
            setUrlGeoReady(true);
          });
        });
    } else {
      urlLocationCenterRef.current = null;
      setUrlGeoReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, urlQueryStr, isMobile, mapLoaded, ilCenters, mapsGeoEffective.mapsGoogleBrowserKey, mapsGeoEffective.mapsGoogleEnabled]);

  const TURKEY_WIDE_CENTER = { lat: 39.2, lng: 35.2 };
  const TURKEY_WIDE_RADIUS_M = "2800000";
  const NEARBY_RADIUS_M = "50000";

  // Harita merkezi değişince listeyi yeniden kapsa (şehir bazlı) — arama/kategori
  // OLMASA DA. Seçili konum / nearby / URL konumu varken bu yol devre dışıdır (onlar
  // kendi merkezini kullanır). ~1km (toFixed(2)) hassasiyetinde anahtar → her piksel
  // kıpırtısında değil, anlamlı kaydırmada yeniden çeker.
  const viewportScopeKey = useMemo(() => {
    if (selectedLocation || nearby50Km || urlLocationCenterRef.current) return "";
    if (isNewsmapPage && newsmapKindFilter === "businesses" && newsmapMapZoom < NEWSMAP_SCRAPE_MIN_ZOOM) {
      return `newsmap-bbox:${viewportPlaceInfo.lat.toFixed(1)}:${viewportPlaceInfo.lng.toFixed(1)}:${newsmapMapZoom}`;
    }
    return `${viewportPlaceInfo.lat.toFixed(2)}:${viewportPlaceInfo.lng.toFixed(2)}`;
  }, [selectedLocation, nearby50Km, viewportPlaceInfo.lat, viewportPlaceInfo.lng, isNewsmapPage, newsmapKindFilter, newsmapMapZoom]);

  // loadBusinesses içinde yalnız backfill etiketi/discovery slug'ı için okunan ama fetch
  // tetiklememesi gereken değerleri ref ile güncel tut (stale backfill parametreleri önle).
  const browserUrlQueryStrRef = useRef(browserUrlQueryStr);
  browserUrlQueryStrRef.current = browserUrlQueryStr;
  const smartLocationRef = useRef(smartLocation);
  smartLocationRef.current = smartLocation;
  const viewportPlaceInfoRef = useRef(viewportPlaceInfo);
  viewportPlaceInfoRef.current = viewportPlaceInfo;
  const searchedLocationInfoRef = useRef(searchedLocationInfo);
  searchedLocationInfoRef.current = searchedLocationInfo;
  const expandedRadiusAttemptRef = useRef("");
  /** Aynı kapsam için art arda tetiklenen istekleri bastır — panelde liste titremesini önler. */
  const lastBusinessesFetchRef = useRef<{ sig: string; at: number }>({ sig: "", at: 0 });

  const loadBusinesses = useCallback(async () => {
    if (!urlGeoReady) return;
    const myId = ++loadIdRef.current;
    try {
      let centerLat: number;
      let centerLng: number;
      let radiusStr: string;

      // Kullanıcı haritayı bir yere taşımışsa (seçili konum/URL konumu/nearby yoksa),
      // sonuçları HARİTA MERKEZİNE göre kapsa — ARAMA/KATEGORİ OLMASA DA. Aksi halde
      // varsayılan liste Türkiye geneline düşüp başka şehrin (Ankara/Adana) "en çok
      // yorumlanan" kayıtlarını döndürüyordu (örn. Amasya'ya gidince Ankara belediyeleri).
      const mapCenterNow = leafletMapRef.current?.getCenter();
      const mapBoundsNow = leafletMapRef.current?.getBounds();
      const mapZoomNow = leafletMapRef.current?.getZoom() ?? 0;
      const hasActiveListFilters = Boolean(search || selectedCategory || mapSuperCategory);
      const newsmapBusinessScope = (isNewsmapPage || mapsHybridEnabled)
        ? resolveNewsmapBusinessLocationScope({
            selectedNewsmapCity,
            selectedLocation,
            ilCenters,
            globalLocations: filteredGlobalLocations,
          })
        : null;
      const newsmapProvinceCity = newsmapBusinessScope?.isTrProvince
        ? newsmapBusinessScope.label
        : (() => {
            if (!isNewsmapPage && !mapsHybridEnabled) return "";
            const fromSelected = String(selectedNewsmapCity ?? "").trim().split(",")[0]?.trim() || "";
            if (fromSelected && isTurkishProvinceName(fromSelected)) return fromSelected;
            const fromLoc = String(selectedLocation?.nameTr ?? selectedLocation?.name ?? "").trim().split(",")[0]?.trim() || "";
            if (fromLoc && isTurkishProvinceName(fromLoc)) return fromLoc;
            return "";
          })();
      const newsmapLocationScope = Boolean(newsmapBusinessScope);
      const newsmapCityWideScope = Boolean(newsmapProvinceCity) || newsmapLocationScope;
      const newsmapBusinessesLowZoom =
        isNewsmapPage &&
        (newsmapKindFilter === "businesses" || newsmapKindFilter === "all") &&
        mapZoomNow < NEWSMAP_SCRAPE_MIN_ZOOM &&
        !nearby50Km &&
        !selectedLocation &&
        !urlLocationCenterRef.current;
      const newsmapBboxScope = newsmapBusinessesLowZoom && mapBoundsNow
        ? {
            south: mapBoundsNow.getSouth(),
            west: mapBoundsNow.getWest(),
            north: mapBoundsNow.getNorth(),
            east: mapBoundsNow.getEast(),
          }
        : null;
      const useViewportCenter =
        !newsmapBboxScope &&
        !nearby50Km &&
        !selectedLocation &&
        !urlLocationCenterRef.current &&
        !!mapCenterNow &&
        Number.isFinite(mapCenterNow.lat) &&
        Number.isFinite(mapCenterNow.lng) &&
        (hasUserNavigatedRef.current || mapZoomNow >= 10 || hasActiveListFilters);

      if (newsmapBboxScope && mapCenterNow) {
        centerLat = mapCenterNow.lat;
        centerLng = mapCenterNow.lng;
        radiusStr = "0";
      } else if (newsmapLocationScope && newsmapBusinessScope) {
        centerLat = newsmapBusinessScope.lat;
        centerLng = newsmapBusinessScope.lng;
        radiusStr = newsmapBusinessScope.isTrProvince ? "0" : "35000";
      } else if (newsmapCityWideScope && newsmapProvinceCity) {
        const il = resolveIlCenterFromSearchQuery(newsmapProvinceCity, ilCenters);
        centerLat = il?.lat ?? selectedLocation?.latitude ?? mapCenterNow?.lat ?? TURKEY_WIDE_CENTER.lat;
        centerLng = il?.lng ?? selectedLocation?.longitude ?? mapCenterNow?.lng ?? TURKEY_WIDE_CENTER.lng;
        radiusStr = "0";
      } else if (nearby50Km && userLocation) {
        centerLat = userLocation.lat;
        centerLng = userLocation.lng;
        radiusStr = NEARBY_RADIUS_M;
      } else if (selectedLocation) {
        centerLat = selectedLocation.latitude;
        centerLng = selectedLocation.longitude;
        // /kesfet listesi şehir görünümünde 20 km yarıçap kullanır; aynı işletmelerin
        // haritada da çıkması için /map'i de şehir ölçeğinde (20 km) tutuyoruz.
        radiusStr = search ? "30000" : "20000";
      } else if (urlLocationCenterRef.current) {
        centerLat = urlLocationCenterRef.current.lat;
        centerLng = urlLocationCenterRef.current.lng;
        // Daha önce 5 km idi; şehir merkezine açılan kayıtlı işletmeler haritada
        // görünmüyordu. /kesfet ile paritede 20 km (aramada 25 km) yarıçap.
        radiusStr = search ? "25000" : "20000";
      } else if (useViewportCenter && mapCenterNow) {
        centerLat = mapCenterNow.lat;
        centerLng = mapCenterNow.lng;
        if (isNewsmapPage && newsmapKindFilter === "businesses" && mapZoomNow < 12) {
          radiusStr = search ? "50000" : "40000";
        } else {
          radiusStr = search ? "30000" : "25000";
        }
      } else if (hasActiveListFilters && mapCenterNow && mapZoomNow >= 6) {
        centerLat = mapCenterNow.lat;
        centerLng = mapCenterNow.lng;
        radiusStr = search ? "30000" : "25000";
      } else {
        centerLat = TURKEY_WIDE_CENTER.lat;
        centerLng = TURKEY_WIDE_CENTER.lng;
        radiusStr = TURKEY_WIDE_RADIUS_M;
      }

      /** Konum / URL merkezi / harita merkezi seçili değilse: son eklenen işletmeler (konuma göre sıralama yok) */
      const useRecentFirst =
        !newsmapBboxScope &&
        !hasActiveListFilters &&
        !selectedLocation &&
        !nearby50Km &&
        !urlLocationCenterRef.current &&
        !useViewportCenter;

      const params = new URLSearchParams({ limit: "200" });
      const urlParamsForBackfill = new URLSearchParams(browserUrlQueryStrRef.current);
      const discoveryCategorySlug = urlParamsForBackfill.get("category");
      const discoveryCategory = discoveryCategorySlug ? findKesfetDiscoveryCategory(discoveryCategorySlug) : undefined;
      const discoveryImportJob = discoveryCategory
        ? (discoveryCategory.child
            ? buildKesfetDiscoveryImportJobs(discoveryCategory.top).find((job) => job.slug === discoveryCategory.child?.slug)
            : buildKesfetDiscoveryImportJobs(discoveryCategory.top)[0])
        : undefined;
      const scopeCity = useRecentFirst
        ? ""
        : resolveMapLocationDisplayLabel(
            newsmapBusinessScope?.label,
            newsmapProvinceCity,
            selectedNewsmapCity,
            selectedLocation?.nameTr,
            selectedLocation?.name,
            searchedLocationInfoRef.current?.title,
            viewportPlaceInfoRef.current.city,
            urlLocationCenterRef.current ? viewportPlaceInfoRef.current.city : "",
            useViewportCenter ? viewportPlaceInfoRef.current.city : "",
          );
      const scopeDiscoveryCity = scopeCity ? findDiscoveryCityAcrossRegions(scopeCity) : undefined;
      const appendCityScopeParams = (target: URLSearchParams) => {
        if (!scopeCity) return;
        target.set("city", scopeDiscoveryCity?.label ?? scopeCity);
        target.set("requireCityScope", "1");
        const scopeSlug = scopeDiscoveryCity?.slug
          ?? scopeCity
            .toLocaleLowerCase("tr-TR")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ı/g, "i")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        if (scopeSlug) target.set("citySlug", scopeSlug);
      };
      if (useRecentFirst) {
        params.set("recentFirst", "1");
      } else if (newsmapCityWideScope && scopeCity && newsmapProvinceCity && Number(radiusStr) === 0) {
        appendCityScopeParams(params);
      } else if (newsmapBboxScope) {
        params.set("bbox", [
          newsmapBboxScope.south.toFixed(6),
          newsmapBboxScope.west.toFixed(6),
          newsmapBboxScope.north.toFixed(6),
          newsmapBboxScope.east.toFixed(6),
        ].join(","));
        params.set("lat", String(centerLat));
        params.set("lng", String(centerLng));
      } else {
        params.set("lat", String(centerLat));
        params.set("lng", String(centerLng));
        params.set("radius", radiusStr);
        if (scopeCity && (scopeDiscoveryCity || isTurkishProvinceName(scopeCity) || newsmapLocationScope)) {
          appendCityScopeParams(params);
        }
      }
      if (selectedCategory) params.set("category", selectedCategory);
      if (mapSuperCategory) params.set("superCategory", mapSuperCategory);
      const discoveryDirKeyword = discoveryCategory?.child?.googleKeyword ?? discoveryCategory?.top.googleKeyword ?? "";
      const keywordsParam = resolveKesfetKeywordsParam(search, discoveryDirKeyword);
      if (keywordsParam) {
        params.set("keywords", keywordsParam);
        if (!useRecentFirst && !hasActiveListFilters) params.set("backfillKeyword", keywordsParam);
      } else if (search) {
        params.set("q", search);
      }
      if (!useRecentFirst && discoveryImportJob) {
        params.set("backfillCategorySlug", discoveryImportJob.slug);
        params.set("backfillCategoryLabel", discoveryCategory?.child?.label ?? discoveryCategory?.top.label ?? discoveryImportJob.slug);
        params.set("backfillKeyword", discoveryImportJob.keyword);
        if (discoveryImportJob.googlePlaceType) params.set("googlePlaceType", discoveryImportJob.googlePlaceType);
        params.set("storeType", discoveryImportJob.storeType);
        params.set("superCategory", discoveryImportJob.homepageSuperCategory);
      } else if (!useRecentFirst) {
        if (mapSuperCategory) params.set("backfillCategorySlug", mapSuperCategory);
        if (search) params.set("backfillKeyword", search);
        else if (scopeCity) params.set("backfillKeyword", buildPlacesPreviewQuery(scopeCity));
      }
      if (!useRecentFirst && !newsmapBboxScope && Number.isFinite(centerLat) && Number.isFinite(centerLng)) {
        params.set("autoBackfill", "1");
        params.set("backfillTarget", "15");
        if (scopeCity) params.set("backfillCity", scopeCity);
        if (!params.get("backfillKeyword")) {
          params.set("backfillKeyword", buildPlacesPreviewQuery(scopeCity || "işletmeler"));
        }
      }

      /**
       * Şehir/konum navigasyonunda birden çok efekt aynı anda loadBusinesses tetikler;
       * kapsam (merkez + yarıçap + filtreler) değişmediyse kısa pencerede tek istek yeter.
       * Aksi halde liste art arda yeniden yazılıp "titreme" oluşturuyordu.
       */
      const fetchSig = [
        centerLat.toFixed(4),
        centerLng.toFixed(4),
        radiusStr,
        search,
        selectedCategory ?? "",
        mapSuperCategory ?? "",
        scopeCity,
        newsmapBboxScope ? "bbox" : "",
        useRecentFirst ? "recent" : "",
      ].join("|");
      const nowTs = Date.now();
      if (
        lastBusinessesFetchRef.current.sig === fetchSig &&
        nowTs - lastBusinessesFetchRef.current.at < 1_500
      ) {
        /* Bu çağrı atlanıyor — devam eden önceki isteğin sonucu geçerli kalsın. */
        if (loadIdRef.current === myId) loadIdRef.current = myId - 1;
        return;
      }
      lastBusinessesFetchRef.current = { sig: fetchSig, at: nowTs };

      const previewKeyword = scopeCity
        ? buildPlacesPreviewQuery(scopeCity)
        : (keywordsParam || search || smartKeyword || "işletmeler").trim();
      const previewRadius = newsmapBboxScope
        ? 400_000
        : Math.max(Number(radiusStr) || 25_000, 25_000);
      const shouldPrefetchPlaces =
        !useRecentFirst &&
        (Boolean(newsmapBboxScope) || Number(radiusStr) < 1_000_000);
      const placesPreviewPromise = shouldPrefetchPlaces
        ? fetchPlacesPreviewForLocation({
            lat: centerLat,
            lng: centerLng,
            q: previewKeyword,
            radius: previewRadius,
            regionCode: newsmapBusinessScope?.countryCode,
          })
        : null;

      const fetchScopedList = async (radiusOverride?: string) => {
        const reqParams = new URLSearchParams(params);
        if (radiusOverride) reqParams.set("radius", radiusOverride);
        const res = await fetch(mapApiUrl(`/map/businesses?${reqParams}`), { cache: "no-store" });
        return readJsonResponse<{
          success?: boolean;
          data?: Business[];
          error?: string;
          backfill?: {
            queued?: boolean;
            jobId?: string | null;
            status?: string;
            reason?: string;
            target?: number;
            found?: number;
            usesPlacesApi?: boolean;
          } | null;
        }>(res, {
          success: false,
          data: [],
          error: "İşletme listesi boş yanıt döndürdü.",
        });
      };

      let parsed = await fetchScopedList();
      const data = parsed.data;
      if (myId !== loadIdRef.current) return;
      if (parsed.ok && data.success) {
        let list: Business[] = data.data ?? [];
        let activeRadiusStr = radiusStr;
        if (useRecentFirst) {
          setBusinesses(
            [...list].sort((a, b) => {
              const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return tb - ta;
            }),
          );
        } else {
          const hasActiveFilter = Boolean(search || selectedCategory || mapSuperCategory);
          const excludeKamu = mapSuperCategory !== "kamu";
          const scopeCityForList = scopeCity || resolveMapLocationDisplayLabel(
            selectedNewsmapCity,
            selectedLocation?.nameTr,
            selectedLocation?.name,
            searchedLocationInfoRef.current?.title,
            viewportPlaceInfoRef.current.city,
          );
          const backendGeoScoped = Boolean(scopeCityForList) || Boolean(newsmapBboxScope) || newsmapCityWideScope;
          const cropAndSort = (arr: Business[], radiusForCrop: string, allowLooseCity = false) => {
            const cropKm = Math.max((Number(radiusForCrop) || 0) / 1000, 1);
            const looseCityKm = allowLooseCity ? cropKm : Math.min(cropKm, 50);
            return arr
              .map(b => ({
                ...b,
                distance:
                  b.latitude && b.longitude ? distanceKm(centerLat, centerLng, b.latitude, b.longitude) : 999,
              }))
              .filter(b => !excludeKamu || !isMapKamuBusiness(b))
              .filter(b => {
                if (newsmapBboxScope) {
                  const blat = Number(b.latitude);
                  const blng = Number(b.longitude);
                  return Number.isFinite(blat) && Number.isFinite(blng)
                    && blat >= newsmapBboxScope.south && blat <= newsmapBboxScope.north
                    && blng >= newsmapBboxScope.west && blng <= newsmapBboxScope.east;
                }
                return backendGeoScoped || (b.distance ?? 999) <= cropKm;
              })
              .filter(b => newsmapBboxScope || backendGeoScoped || businessScopeCityMatch(b, scopeCityForList, looseCityKm))
              .sort((a, b) => {
                if (a.isPremium && !b.isPremium) return -1;
                if (!a.isPremium && b.isPremium) return 1;
                const rankA = (a.distance ?? 999) + generalListNoisePenalty(a, hasActiveFilter);
                const rankB = (b.distance ?? 999) + generalListNoisePenalty(b, hasActiveFilter);
                return rankA - rankB;
              });
          };
          let sorted = cropAndSort(list, activeRadiusStr);
          const radiusTiers = newsmapBboxScope
            ? []
            : [
              MAP_PRIMARY_NEARBY_RADIUS_M,
              MAP_EXPANDED_NEARBY_RADIUS_M,
            ].filter((tier) => tier > Number(activeRadiusStr));
          if (sorted.length === 0 && radiusTiers.length) {
            const expandKey = `${centerLat.toFixed(3)}:${centerLng.toFixed(3)}:${search}:${mapSuperCategory}:${selectedCategory ?? ""}:${scopeCityForList}`;
            if (expandedRadiusAttemptRef.current !== expandKey) {
              expandedRadiusAttemptRef.current = expandKey;
              for (const tierM of radiusTiers) {
                if (sorted.length > 0) break;
                const tierParsed = await fetchScopedList(String(tierM));
                if (myId !== loadIdRef.current) return;
                const tierData = tierParsed.data;
                if (!tierParsed.ok || !tierData.success) continue;
                const tierSorted = cropAndSort(tierData.data ?? [], String(tierM), tierM >= MAP_EXPANDED_NEARBY_RADIUS_M);
                if (tierSorted.length > 0) {
                  sorted = tierSorted;
                  activeRadiusStr = String(tierM);
                  break;
                }
              }
            }
          }
          setBusinesses(applyVisitorDistancesToBusinesses(sorted, resolveUserDistanceOrigin()));

          const shouldEnrichViewport = Boolean(newsmapBboxScope) || Number(activeRadiusStr) < 1_000_000;
          if (shouldEnrichViewport && placesPreviewPromise) {
            const enrichLabel = scopeCityForList || viewportPlaceInfoRef.current.city || viewportPlaceInfoRef.current.label || "Seçili konum";
            void (async () => {
              const previewRows = await placesPreviewPromise;
              if (myId !== loadIdRef.current) return;
              if (previewRows.length > 0) {
                setBusinesses((prev) => {
                  const withDist = previewRows.map((p) => ({
                    ...p,
                    distance: p.latitude && p.longitude
                      ? distanceKm(centerLat, centerLng, p.latitude, p.longitude)
                      : 999,
                  })) as Business[];
                  return applyVisitorDistancesToBusinesses(
                    mergeBusinessesWithPlacesPreview(prev, withDist),
                    resolveUserDistanceOrigin(),
                  );
                });
              }
              triggerSilentRegionBusinessScrape({
                lat: centerLat,
                lng: centerLng,
                label: enrichLabel,
              });
            })();
          } else if (shouldEnrichViewport) {
            const enrichLabel = scopeCityForList || viewportPlaceInfoRef.current.city || viewportPlaceInfoRef.current.label || "Seçili konum";
            triggerSilentRegionBusinessScrape({
              lat: centerLat,
              lng: centerLng,
              label: enrichLabel,
            });
          }
        }
      } else {
        // Yenileme başarısız / iptal edildi (ağ hatası, 5xx veya success:false).
        // Önce yüklenmiş liste + harita işaretçilerini SİLME — bunlar geçerli kalır.
        // Yalnızca "mevcut görünüm açık kaldı" banner'ını göster. Böylece geçici bir
        // yenileme hatası ya da eskimiş yanıt, ekranda duran sonuçları yok etmez.
        setPlacesSearchHint(FRIENDLY_MAP_ERROR);
      }
    } finally {
      if (myId === loadIdRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlGeoReady, userLocation, selectedCategory, mapSuperCategory, search, selectedLocation, nearby50Km, viewportScopeKey, isNewsmapPage, newsmapKindFilter, newsmapMapZoom, mapLoaded, selectedNewsmapCity, ilCenters]);

  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);

  const [scraping, setScraping] = useState(false);

  async function importBusinessesForCurrentLocation(opts?: {
    silent?: boolean;
    background?: boolean;
    target?: { label: string; lat: number; lng: number };
    radius?: number;
    keyword?: string;
    homepageSuperCategory?: string | null;
    storeType?: string | null;
    googlePlaceType?: string | null;
  }): Promise<void> {
    const target = opts?.target ?? (selectedLocation
      ? {
          label: selectedLocation.nameTr || selectedLocation.name,
          lat: selectedLocation.latitude,
          lng: selectedLocation.longitude,
        }
      : {
          label: viewportPlaceInfo.label,
          lat: viewportPlaceInfo.lat,
          lng: viewportPlaceInfo.lng,
        });
    if (opts?.background) setBackgroundImportStatus("preparing");
    try {
      const keyword = (opts?.keyword ?? (smartKeyword || search || "")).trim();
      const superCategoryForSync = opts?.homepageSuperCategory ?? mapSuperCategory ?? "mekan_dukkan";
      const params = new URLSearchParams({
        limit: "1",
        lat: String(target.lat),
        lng: String(target.lng),
        radius: String(opts?.radius ?? MAP_BACKGROUND_IMPORT_RADIUS_M),
        backfill: "1",
        backfillTarget: "100",
        backfillCity: target.label,
        q: keyword || "işletmeler",
        superCategory: superCategoryForSync || "mekan_dukkan",
      });
      params.set("backfillKeyword", keyword || "işletmeler");
      if (opts?.googlePlaceType) params.set("googlePlaceType", opts.googlePlaceType);
      if (opts?.storeType) params.set("storeType", opts.storeType);
      const r = await fetch(mapApiUrl(`/map/businesses?${params}`));
      const d = await r.json().catch(() => ({})) as {
        success?: boolean;
        backfill?: { queued?: boolean; jobId?: string | null; status?: string };
      };
      const ok = r.ok && d.success === true;
      if (ok && d.backfill?.queued && d.backfill.jobId) {
        setBackgroundBackfillJobId(d.backfill.jobId);
        setBackgroundImportStatus("preparing");
      } else if (ok) {
        if (opts?.background) setBackgroundImportStatus("ready");
        await loadBusinesses();
      }
    } catch {
      // Public scraper queue is intentionally silent; users only see normal map results.
      if (opts?.background) setBackgroundImportStatus("idle");
    }
  }

  useEffect(() => {
    if (!backgroundBackfillJobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    /* Arka plan tarama hiç bitmezse (Render'da scraper kapalı vb.) sonsuza dek "taranıyor" dönmesin. */
    let attempts = 0;
    const MAX_POLL_ATTEMPTS = 24; // ~2 dk
    const poll = async () => {
      attempts += 1;
      try {
        const r = await fetch(mapApiUrl(`/map/kesfet-scraper-backfill/status/${encodeURIComponent(backgroundBackfillJobId)}`));
        const d = await r.json().catch(() => ({})) as {
          success?: boolean;
          data?: { status?: string; imported?: number; foundAfter?: number; reason?: string };
        };
        if (cancelled) return;
        if (!d.success) {
          setBackgroundBackfillJobId(null);
          setBackgroundImportStatus("idle");
          return;
        }
        const status = d.data?.status;
        if (status === "done" || status === "skipped") {
          setBackgroundBackfillJobId(null);
          setBackgroundImportStatus("ready");
          await loadBusinesses();
          if (searchedLocationInfoRef.current) {
            void fetchLocationRegisteredCount(searchedLocationInfoRef.current);
          }
          return;
        }
        if (status === "error") {
          setBackgroundBackfillJobId(null);
          setBackgroundImportStatus("idle");
          return;
        }
      } catch {
        // Keep the preparing state; the next poll may succeed.
      }
      if (cancelled) return;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setBackgroundBackfillJobId(null);
        setBackgroundImportStatus("idle");
        return;
      }
      timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 2500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [backgroundBackfillJobId, loadBusinesses, fetchLocationRegisteredCount]);

  useEffect(() => {
    if (!urlGeoReady) return;
    const target = selectedLocation
      ? { label: selectedLocation.nameTr || selectedLocation.name, lat: selectedLocation.latitude, lng: selectedLocation.longitude }
      : urlLocationCenterRef.current
        ? { label: smartLocation || search || "Seçili konum", lat: urlLocationCenterRef.current.lat, lng: urlLocationCenterRef.current.lng }
        : null;
    if (!target) return;
    const key = [
      target.lat.toFixed(3),
      target.lng.toFixed(3),
      nearby50Km ? "20km" : "9km",
      (smartKeyword || search || "").trim().toLocaleLowerCase("tr-TR"),
      mapSuperCategory || "all",
    ].join(":");
    if (locationImportKeyRef.current === key) return;
    locationImportKeyRef.current = key;
    triggerSilentRegionBusinessScrape({
      lat: target.lat,
      lng: target.lng,
      label: target.label,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlGeoReady, selectedLocation, nearby50Km]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!mapLoaded || !map || !urlGeoReady || isNoTargetMapMode) return;
    const scheduleViewportImport = () => {
      if (viewportImportTimerRef.current) window.clearTimeout(viewportImportTimerRef.current);
      viewportImportTimerRef.current = window.setTimeout(() => {
        if (viewportImportRunningRef.current) return;
        const center = map.getCenter();
        const zoom = map.getZoom();
        if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng) || zoom < 10) return;
        const latGrid = Math.round(center.lat * 20) / 20;
        const lngGrid = Math.round(center.lng * 20) / 20;
        const keyword = (smartKeyword || search || "işletmeler").trim();
        const key = [
          latGrid.toFixed(2),
          lngGrid.toFixed(2),
          Math.floor(zoom),
          keyword.toLocaleLowerCase("tr-TR"),
          mapSuperCategory || "all",
        ].join(":");
        if (viewportImportKeysRef.current.has(key)) return;
        viewportImportKeysRef.current.add(key);
        if (viewportImportKeysRef.current.size > 160) {
          viewportImportKeysRef.current = new Set(Array.from(viewportImportKeysRef.current).slice(-120));
        }
        viewportImportRunningRef.current = true;
        triggerSilentRegionBusinessScrape({
          lat: center.lat,
          lng: center.lng,
          label: viewportPlaceInfo.label || "Harita konumu",
        });
        viewportImportRunningRef.current = false;
      }, MAP_BACKGROUND_IMPORT_DEBOUNCE_MS);
    };
    map.on("moveend zoomend", scheduleViewportImport);
    return () => {
      map.off("moveend zoomend", scheduleViewportImport);
      if (viewportImportTimerRef.current) window.clearTimeout(viewportImportTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, urlGeoReady, isNoTargetMapMode]);

  const loadGoogleDetails = useCallback(async (bizId: string) => {
    setGoogleLoading(true);
    try {
      const r = await fetch(mapApiUrl(`/map/businesses/${bizId}/google-details`));
      const parsed = await readJsonResponse<{ success?: boolean; data?: GoogleDetails & { needsScrape?: boolean } }>(r, { success: false });
      const d = parsed.data;
      if (parsed.ok && d.success) {
        setGoogleDetails(d.data ?? null);
      }
    } catch { /* ignore */ }
    finally { setGoogleLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBiz) { setGoogleDetails(null); setScraping(false); return; }
    setGoogleDetails(null); setScraping(false); setPhotoIdx(0);
    loadGoogleDetails(selectedBiz.id);
  }, [selectedBiz, loadGoogleDetails]);

  const lastBusinessMarkerKeyRef = useRef("");
  // İşletme marker'ları id → Leaflet marker eşlemesi. Her güncellemede katmanı temizleyip
  // yeniden çizmek yerine fark/patch uygularız (titreme/zıplama önlenir; #286/#289 kalıcı fix).
  const businessMarkerMapRef = useRef<Map<string, L.Marker>>(new Map());
  // Sunucu kümeleme katmanı — aynı sonuç yeniden çizilmesin (marker titremesi/zıplaması önlenir).
  const lastServerClusterSigRef = useRef("");

  /* ── Markers (fark/patch: kararlı id ile marker yeniden kullanılır) ── */
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || !markersRef.current) return;
    const layer = markersRef.current;
    const markerMap = businessMarkerMapRef.current;
    if (isNewsmapPage) {
      if (markerMap.size > 0) {
        layer.clearLayers();
        markerMap.clear();
      }
      lastBusinessMarkerKeyRef.current = "";
      return;
    }
    const markerBusinesses = serverClusterEnabled
      ? (selectedBiz ? [selectedBiz] : [])
      : businesses;

    // İstenen id → işletme kümesi (geçerli koordinatlı).
    const desired = new Map<string, Business>();
    for (const biz of markerBusinesses) {
      if (!biz.latitude || !biz.longitude) continue;
      const id = String(biz.id ?? `${biz.latitude}:${biz.longitude}`);
      if (!desired.has(id)) desired.set(id, biz);
    }
    lastBusinessMarkerKeyRef.current = [...desired.keys()].sort().join("|");

    // 1) Artık listede olmayan marker'ları kaldır.
    for (const [id, marker] of markerMap) {
      if (!desired.has(id)) {
        layer.removeLayer(marker);
        markerMap.delete(id);
      }
    }

    // 2) Yeni ekle / mevcut olanı güncelle (konum + seçili durumu; DOM'u yeniden yaratmadan).
    for (const [id, biz] of desired) {
      const isSel = selectedBiz?.id === biz.id;
      const existing = markerMap.get(id) as (L.Marker & { _yekSelected?: boolean; _yekBiz?: Business }) | undefined;
      if (existing) {
        // Tıklama kapanışı bayatlamasın: en güncel işletme verisini marker üzerinde tut.
        existing._yekBiz = biz;
        const cur = existing.getLatLng();
        if (cur.lat !== biz.latitude || cur.lng !== biz.longitude) {
          existing.setLatLng([biz.latitude!, biz.longitude!]);
        }
        // Seçili durumu yalnızca değiştiyse ikonu değiştir (tek marker; titreme yaratmaz).
        if (existing._yekSelected !== isSel) {
          const emoji = businessMarkerEmoji(biz, categoryById.get(String(biz.categoryId ?? "")));
          existing.setIcon(L.divIcon({
            className: "yekpare-business-emoji-marker",
            html: `<div class="yekpare-business-emoji-marker__bubble${isSel ? " is-selected" : ""}" role="img" aria-label="${escapeMapMarkerText(biz.name)}">${emoji}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          }));
          existing._yekSelected = isSel;
        }
        continue;
      }
      const emoji = businessMarkerEmoji(biz, categoryById.get(String(biz.categoryId ?? "")));
      const icon = L.divIcon({
        className: "yekpare-business-emoji-marker",
        html: `<div class="yekpare-business-emoji-marker__bubble${isSel ? " is-selected" : ""}" role="img" aria-label="${escapeMapMarkerText(biz.name)}">${emoji}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = L.marker([biz.latitude!, biz.longitude!], { icon, title: biz.name }) as L.Marker & { _yekSelected?: boolean; _yekBiz?: Business };
      marker._yekSelected = isSel;
      marker._yekBiz = biz;
      marker.bindTooltip(biz.name, { direction: "top", opacity: 0.92 });
      marker.on("click", () => {
        const current = marker._yekBiz ?? biz;
        setSelectedBiz(current);
        setDetailTab("overview");
        setLeftSidebarTab("isletmeler");
        setLocationPanelTab("businesses");
        if (isMobile) {
          setMenuOpen(true);
        } else {
          setDesktopGeoPanelOpen(true);
        }
        if (leafletMapRef.current && current.latitude && current.longitude) {
          leafletMapRef.current.panTo([current.latitude, current.longitude], { animate: true });
        }
        syncSelectedBizUrl(current);
      });
      markerMap.set(id, marker);
      layer.addLayer(marker);
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "",
        html: `<div class="yekpare-user-location-marker" aria-hidden="true"><span></span></div>`,
        iconSize: [34, 34], iconAnchor: [17, 17],
      });
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(leafletMapRef.current!);
    }
    // savedBizIds/savedMapPlaces effect gövdesinde kullanılmıyor; bağımlılığa eklenince
    // her "kaydet"te tüm marker'lar gereksiz yere yeniden çiziliyordu (perf). Çıkarıldı.
  }, [businesses, userLocation, mapLoaded, selectedBiz, isMobile, serverClusterEnabled, categoryById, isNewsmapPage, newsmapBusinessesMode, newsmapKindFilter]);

  useEffect(() => {
    const map = leafletMapRef.current;
    const layer = serverClusterLayerRef.current;
    if (!mapLoaded || !map || !layer) return;
    let cancelled = false;
    let timer: number | null = null;

    const loadClusters = () => {
      if (isNewsmapPage) {
        layer.clearLayers();
        setServerClusterStats(null);
        setServerClusterLoading(false);
        return;
      }
      if (!serverClusterEnabled) {
        layer.clearLayers();
        setServerClusterStats(null);
        setServerClusterLoading(false);
        return;
      }
      const bounds = map.getBounds();
      const params = new URLSearchParams({
        bbox: [
          bounds.getSouth().toFixed(6),
          bounds.getWest().toFixed(6),
          bounds.getNorth().toFixed(6),
          bounds.getEast().toFixed(6),
        ].join(","),
        zoom: String(Math.round(map.getZoom())),
      });
      if (search.trim()) params.set("q", search.trim());
      if (selectedCategory) params.set("category", selectedCategory);
      if (mapSuperCategory) params.set("superCategory", mapSuperCategory);
      const locInfo = searchedLocationInfoRef.current;
      const scopeCity = (locInfo ? resolveLocationCardScopeCity(locInfo, ilCenters) : null)
        ?? (selectedLocation
          ? resolveLocationCardScopeCity(
              {
                id: selectedLocation.id,
                title: selectedLocation.nameTr || selectedLocation.name,
                areaInfo: selectedLocation.region,
                lat: selectedLocation.latitude,
                lng: selectedLocation.longitude,
              },
              ilCenters,
            )
          : null);
      if (scopeCity) {
        params.set("city", scopeCity.cityLabel);
        params.set("citySlug", scopeCity.citySlug);
        params.set("requireCityScope", "1");
      }
      setServerClusterLoading(true);
      fetch(mapApiUrl(`/map/businesses/cluster?${params}`))
        .then((r) => readJsonResponse<{
          success?: boolean;
          data?: ServerClusterFeature[];
          total?: number;
          meta?: { clusters?: number; points?: number };
        }>(r, { success: false, data: [] }))
        .then((parsed) => {
          const d = parsed.data;
          if (cancelled || !d.success || !Array.isArray(d.data)) return;
          // İçerik imzası aynıysa (aynı küme/işletme konumları) katmanı yeniden çizme.
          const sig = d.data
            .map((item) =>
              item.kind === "cluster"
                ? `c:${item.lat.toFixed(5)}:${item.lng.toFixed(5)}:${item.count}`
                : `b:${item.business?.id ?? `${item.lat}:${item.lng}`}`,
            )
            .join("|");
          if (sig === lastServerClusterSigRef.current && layer.getLayers().length > 0) {
            setServerClusterStats({
              clusters: Number(d.meta?.clusters ?? 0),
              points: Number(d.meta?.points ?? 0),
              total: Number(d.total ?? d.data.length),
            });
            return;
          }
          lastServerClusterSigRef.current = sig;
          layer.clearLayers();
          for (const item of d.data) {
            if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) continue;
            if (item.kind === "cluster") {
              const size = item.count >= 100 ? 52 : item.count >= 30 ? 44 : 36;
              const icon = L.divIcon({
                className: "",
                html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:linear-gradient(135deg,${YEKPARE_SADE_TEAL},${YEKPARE_SADE_ACCENT});color:white;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 5px 18px ${MAP_CHROME_SHADOW};font-weight:900;font-size:13px">${item.count}</div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              });
              L.marker([item.lat, item.lng], { icon }).addTo(layer).on("click", () => {
                map.setView([item.lat, item.lng], Math.min(17, map.getZoom() + 2), { animate: true });
              });
            } else {
              const biz = item.business;
              const emoji = businessMarkerEmoji(biz, categoryById.get(String(biz.categoryId ?? "")));
              const icon = L.divIcon({
                className: "yekpare-business-emoji-marker",
                html: `<div class="yekpare-business-emoji-marker__bubble" role="img" aria-label="${escapeMapMarkerText(biz.name)}">${emoji}</div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 17],
              });
              const marker = L.marker([item.lat, item.lng], { icon, title: biz.name }).addTo(layer);
              marker.bindTooltip(biz.name, { direction: "top" });
              marker.on("click", () => {
                setSelectedBiz(biz);
                setDetailTab("overview");
                setLeftSidebarTab("isletmeler");
                if (isMobile) setMenuOpen(true);
                else setDesktopGeoPanelOpen(true);
              });
            }
          }
          setServerClusterStats({
            clusters: Number(d.meta?.clusters ?? 0),
            points: Number(d.meta?.points ?? 0),
            total: Number(d.total ?? d.data.length),
          });
        })
        .catch(() => {
          if (!cancelled) setServerClusterStats(null);
        })
        .finally(() => {
          if (!cancelled) setServerClusterLoading(false);
        });
    };

    const scheduleLoad = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(loadClusters, 300);
    };
    loadClusters();
    map.on("moveend zoomend", scheduleLoad);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      map.off("moveend zoomend", scheduleLoad);
    };
  }, [serverClusterEnabled, mapLoaded, L, search, selectedCategory, mapSuperCategory, isMobile, categoryById, ilCenters, selectedLocation, isNewsmapPage, newsmapBusinessesMode, newsmapKindFilter]);

  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || !userPlaceMarkersRef.current) return;
    userPlaceMarkersRef.current.clearLayers();
    const allLocalPlaces = [...savedMapPlaces, ...userAddedPlaces].filter((place, index, arr) =>
      arr.findIndex((x) => x.id === place.id) === index
    );
    for (const place of allLocalPlaces) {
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue;
      const isUserAdded = place.source === "user_added";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;border-radius:999px;background:${isUserAdded ? "#16a34a" : "#2563eb"};color:white;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 12px rgba(15,23,42,0.35);font-size:16px">${isUserAdded ? "+" : "🔖"}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = L.marker([place.lat, place.lng], { icon });
      marker.bindPopup(
        `<div style="min-width:170px;font-family:Inter,Segoe UI,sans-serif;color:#0f172a">` +
          `<strong>${escapeHtmlText(place.name)}</strong><br/>` +
          `<small>${escapeHtmlText(place.address || `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`)}</small>` +
        `</div>`
      );
      marker.on("click", () => {
        leafletMapRef.current?.setView([place.lat, place.lng], Math.max(leafletMapRef.current?.getZoom() ?? 15, 15), { animate: true });
      });
      userPlaceMarkersRef.current.addLayer(marker);
    }
  }, [savedMapPlaces, userAddedPlaces, mapLoaded, L]);

  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current) return;
    const lat = Number(addPlaceDraft.lat);
    const lng = Number(addPlaceDraft.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (addPlaceDraftMarkerRef.current) {
        addPlaceDraftMarkerRef.current.remove();
        addPlaceDraftMarkerRef.current = null;
      }
      return;
    }
    if (addPlaceDraftMarkerRef.current) addPlaceDraftMarkerRef.current.remove();
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:38px;height:38px;border-radius:999px;background:#f97316;color:white;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 14px rgba(249,115,22,0.38);font-size:18px">+</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    addPlaceDraftMarkerRef.current = L.marker([lat, lng], { icon }).addTo(leafletMapRef.current);
  }, [addPlaceDraft.lat, addPlaceDraft.lng, mapLoaded, L]);

  /* 81 il merkezi pinleri + dünya konumları — bayrak emoji, haber haritasında son dakika rozeti */
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || !ilProvinceMarkersRef.current) return;
    const Lw = (window as any).L as typeof import("leaflet");
    const layer = ilProvinceMarkersRef.current;
    layer.clearLayers();
    if (newsmapBusinessesMode) return;
    if (newsmapCalloutsActive && !newsmapShowClusterPins) return;
    if (isNewsmapPage && newsmapMapZoom <= 3) return;
    if (ilCenters.length === 0) return;
    for (const il of ilCenters) {
      if ((newsMapEnabled || mapsHybridEnabled) && newsmapLayer.newsMapGeoFilter && !isWithinNewsmapRadius(il.lat, il.lng, newsmapLayer.newsMapGeoFilter)) {
        continue;
      }
      const locKey = normalizeHmMapCityKey(il.adi);
      if (newsmapCalloutCityKeys.has(locKey)) continue;
      const contentMatch = (newsMapEnabled || mapsHybridEnabled) ? effectiveMarkerContentIndex.get(locKey) : undefined;
      if ((isNewsmapPage || mapsHybridEnabled) && newsmapCalloutsActive && !contentMatch) continue;
      const markerContent = contentMatch
        ? { title: contentMatch.title, kind: contentMatch.kind, thumbnail: contentMatch.thumbnail }
        : null;
      const iconSpec = buildHaberHaritasiMarkerIconHtml(
        { label: il.adi, countryCode: "TR" },
        markerContent,
        {
          pinOnly: newsmapShowClusterPins,
          count: resolveNewsmapCityCount(newsmapCityCounts, locKey, il.adi),
        },
      );
      const icon = Lw.divIcon({
        className: iconSpec.className,
        html: iconSpec.html,
        iconSize: iconSpec.iconSize,
        iconAnchor: iconSpec.iconAnchor,
      });
      const marker = Lw.marker([il.lat, il.lng], { icon, zIndexOffset: -200 });
      const wrap = Lw.DomUtil.create("div", "kesfet-il-popup");
      wrap.style.minWidth = "150px";
      const title = document.createElement("p");
      title.className = "text-xs font-bold text-slate-800 mb-2";
      title.textContent = il.adi;
      const row = document.createElement("div");
      row.className = "flex flex-col gap-1.5";
      const navBtn = document.createElement("button");
      navBtn.type = "button";
      navBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
      navBtn.style.background = "linear-gradient(135deg,#0ea5e9,#2563eb)";
      navBtn.textContent = "Konuma git";
      Lw.DomEvent.on(navBtn, "click", (ev: Event) => {
        Lw.DomEvent.stopPropagation(ev);
        marker.closePopup();
        const ilLoc: PopularLocation = {
          id: `il-${il.plaka ?? il.adi}`,
          name: il.adi,
          nameTr: il.adi,
          latitude: il.lat,
          longitude: il.lng,
          zoomLevel: Math.max(11, il.zoom || 11),
          region: "",
        };
        goToLocationAndOpenCard(
          ilLoc,
          {
            id: ilLoc.id,
            title: il.adi,
            areaInfo: "Türkiye",
            address: `${il.adi}, Türkiye`,
            lat: il.lat,
            lng: il.lng,
          },
          { nearby50Km: true },
        );
      });
      const navOpenBtn = document.createElement("button");
      navOpenBtn.type = "button";
      navOpenBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
      navOpenBtn.style.background = "linear-gradient(135deg,#16a34a,#15803d)";
      navOpenBtn.textContent = "Navigasyon";
      Lw.DomEvent.on(navOpenBtn, "click", (ev: Event) => {
        Lw.DomEvent.stopPropagation(ev);
        setNavPickerBiz({
          id: `nav-il-${il.plaka ?? il.adi}`,
          name: `${il.adi} Merkez`,
          address: `${il.adi}, Türkiye`,
          latitude: il.lat,
          longitude: il.lng,
        });
      });
      row.appendChild(navBtn);
      row.appendChild(navOpenBtn);
      const bilgiHref = resolveBilgiAgaciHref(il.adi);
      if (bilgiHref) {
        const wikiBtn = document.createElement("button");
        wikiBtn.type = "button";
        wikiBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
        wikiBtn.style.background = "linear-gradient(135deg,#4f46e5,#7c3aed)";
        wikiBtn.textContent = "Şehir Bilgi";
        Lw.DomEvent.on(wikiBtn, "click", (ev: Event) => {
          Lw.DomEvent.stopPropagation(ev);
          navigate(bilgiHref);
        });
        row.appendChild(wikiBtn);
      }
      if (newsMapEnabled && contentMatch) {
        const newsBtn = document.createElement("button");
        newsBtn.type = "button";
        newsBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
        newsBtn.style.background = "linear-gradient(135deg,#e11d48,#be123c)";
        newsBtn.textContent = contentMatch.kind === "video" ? "Videoyu aç" : "Haberi aç";
        Lw.DomEvent.on(newsBtn, "click", (ev: Event) => {
          Lw.DomEvent.stopPropagation(ev);
          marker.closePopup();
          openNewsOverlayRef.current(
            headlineFromContentMatch(il.adi, contentMatch, { countryCode: "TR", flagEmoji: "🇹🇷" }),
          );
        });
        row.appendChild(newsBtn);
      } else if (newsMapEnabled && !isNewsmapPage) {
        const newsBtn = document.createElement("button");
        newsBtn.type = "button";
        newsBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
        newsBtn.style.background = "linear-gradient(135deg,#e11d48,#be123c)";
        newsBtn.textContent = "Şehir Haberleri";
        Lw.DomEvent.on(newsBtn, "click", (ev: Event) => {
          Lw.DomEvent.stopPropagation(ev);
          marker.closePopup();
          if (isNewsmapPage) {
            openNewsmapCityNewsRef.current(il.adi, { lat: il.lat, lng: il.lng, zoom: il.zoom });
          } else {
            navigate(resolveSondakikaCityHref(il.adi));
          }
        });
        row.appendChild(newsBtn);
      }
      wrap.appendChild(title);
      wrap.appendChild(row);
      if (isNewsmapPage) {
        marker.bindTooltip(il.adi, { permanent: false, direction: "top" });
        marker.on("click", () => {
          activateNewsmapLocationRef.current({
            lat: il.lat,
            lng: il.lng,
            zoom: il.zoom,
            label: il.adi,
            source: "city_marker",
          });
        });
      } else {
        marker.bindTooltip(il.adi, { permanent: false, direction: "top" });
        marker.bindPopup(wrap, { maxWidth: 280, className: "kesfet-map-marker-popup-pane" });
        marker.on("click", () => marker.openPopup());
      }
      layer.addLayer(marker);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ilCenters, effectiveMarkerContentIndex, mapLoaded, mapsHybridEnabled, navigate, newsMapEnabled, isNewsmapPage, newsmapBusinessesMode, newsmapCalloutsActive, newsmapShowClusterPins, newsmapCalloutCityKeys, newsmapCityCounts, newsmapLayer.newsMapGeoFilter, resolveBilgiAgaciHref, resolveSondakikaCityHref]);

  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || !haberHaritasiGlobalMarkersRef.current) return;
    const Lw = (window as any).L as typeof import("leaflet");
    const layer = haberHaritasiGlobalMarkersRef.current;
    layer.clearLayers();
    if (newsmapBusinessesMode) return;
    if (newsmapCalloutsActive && !newsmapShowClusterPins) return;
    for (const loc of filteredGlobalLocations) {
      if (newsmapCalloutCityKeys.has(loc.key) || newsmapCalloutCityKeys.has(normalizeHmMapCityKey(loc.label))) continue;
      const contentMatch = (newsMapEnabled || mapsHybridEnabled) ? effectiveMarkerContentIndex.get(loc.key) : undefined;
      if ((isNewsmapPage || mapsHybridEnabled) && newsmapCalloutsActive && !contentMatch) {
        if (!newsmapShowClusterPins || loc.kind !== "country") continue;
      }
      const markerContent = contentMatch
        ? { title: contentMatch.title, kind: contentMatch.kind, thumbnail: contentMatch.thumbnail }
        : null;
      const iconSpec = buildHaberHaritasiMarkerIconHtml(
        loc,
        markerContent,
        {
          pinOnly: newsmapShowClusterPins,
          count: resolveNewsmapCityCount(newsmapCityCounts, loc.key, loc.label),
        },
      );
      const icon = Lw.divIcon({
        className: iconSpec.className,
        html: iconSpec.html,
        iconSize: iconSpec.iconSize,
        iconAnchor: iconSpec.iconAnchor,
      });
      const marker = Lw.marker([loc.lat, loc.lng], { icon, zIndexOffset: -180 });
      const wrap = Lw.DomUtil.create("div", "kesfet-il-popup");
      wrap.style.minWidth = "150px";
      const title = document.createElement("p");
      title.className = "text-xs font-bold text-slate-800 mb-2";
      title.textContent = loc.label;
      const row = document.createElement("div");
      row.className = "flex flex-col gap-1.5";
      const navBtn = document.createElement("button");
      navBtn.type = "button";
      navBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
      navBtn.style.background = "linear-gradient(135deg,#0ea5e9,#2563eb)";
      navBtn.textContent = "Konuma git";
      Lw.DomEvent.on(navBtn, "click", (ev: Event) => {
        Lw.DomEvent.stopPropagation(ev);
        marker.closePopup();
        leafletMapRef.current?.setView([loc.lat, loc.lng], Math.max(loc.zoom, 5), { animate: true });
      });
      const navOpenBtn = document.createElement("button");
      navOpenBtn.type = "button";
      navOpenBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
      navOpenBtn.style.background = "linear-gradient(135deg,#16a34a,#15803d)";
      navOpenBtn.textContent = "Navigasyon";
      Lw.DomEvent.on(navOpenBtn, "click", (ev: Event) => {
        Lw.DomEvent.stopPropagation(ev);
        setNavPickerBiz({
          id: `nav-global-${loc.key}`,
          name: loc.label,
          address: loc.label,
          latitude: loc.lat,
          longitude: loc.lng,
        });
      });
      row.appendChild(navBtn);
      row.appendChild(navOpenBtn);
      const bilgiHref = resolveBilgiAgaciHref(loc.label);
      if (bilgiHref) {
        const wikiBtn = document.createElement("button");
        wikiBtn.type = "button";
        wikiBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
        wikiBtn.style.background = "linear-gradient(135deg,#4f46e5,#7c3aed)";
        wikiBtn.textContent = "Şehir Bilgi";
        Lw.DomEvent.on(wikiBtn, "click", (ev: Event) => {
          Lw.DomEvent.stopPropagation(ev);
          navigate(bilgiHref);
        });
        row.appendChild(wikiBtn);
      }
      if (newsMapEnabled && contentMatch) {
        const newsBtn = document.createElement("button");
        newsBtn.type = "button";
        newsBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
        newsBtn.style.background = "linear-gradient(135deg,#e11d48,#be123c)";
        newsBtn.textContent = contentMatch.kind === "video" ? "Videoyu aç" : "Haberi aç";
        Lw.DomEvent.on(newsBtn, "click", (ev: Event) => {
          Lw.DomEvent.stopPropagation(ev);
          marker.closePopup();
          openNewsOverlayRef.current(
            headlineFromContentMatch(loc.label, contentMatch, {
              countryCode: loc.countryCode,
              flagEmoji: countryCodeToFlagEmoji(loc.countryCode),
            }),
          );
        });
        row.appendChild(newsBtn);
      } else if (newsMapEnabled && !isNewsmapPage) {
        const newsBtn = document.createElement("button");
        newsBtn.type = "button";
        newsBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
        newsBtn.style.background = "linear-gradient(135deg,#e11d48,#be123c)";
        newsBtn.textContent = "Şehir Haberleri";
        Lw.DomEvent.on(newsBtn, "click", (ev: Event) => {
          Lw.DomEvent.stopPropagation(ev);
          marker.closePopup();
          if (isNewsmapPage) {
            openNewsmapCityNewsRef.current(loc.label, { lat: loc.lat, lng: loc.lng, zoom: loc.zoom });
          } else {
            navigate(resolveSondakikaCityHref(loc.label));
          }
        });
        row.appendChild(newsBtn);
      }
      wrap.appendChild(title);
      wrap.appendChild(row);
      if (isNewsmapPage) {
        marker.bindTooltip(loc.label, { permanent: false, direction: "top" });
        marker.on("click", () => {
          activateNewsmapLocationRef.current({
            lat: loc.lat,
            lng: loc.lng,
            zoom: loc.zoom,
            label: loc.label,
            source: "city_marker",
          });
        });
      } else {
        marker.bindTooltip(loc.label, { permanent: false, direction: "top" });
        marker.bindPopup(wrap, { maxWidth: 280, className: "kesfet-map-marker-popup-pane" });
        marker.on("click", () => marker.openPopup());
      }
      layer.addLayer(marker);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMarkerContentIndex, filteredGlobalLocations, mapLoaded, mapsHybridEnabled, navigate, newsMapEnabled, isNewsmapPage, newsmapBusinessesMode, newsmapCalloutsActive, newsmapShowClusterPins, newsmapCalloutCityKeys, newsmapCityCounts, resolveBilgiAgaciHref, resolveSondakikaCityHref]);

  /* Newsmap yakın zoom — başlık callout kartları harita üstünde */
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || !newsmapCalloutMarkersRef.current) return;
    const Lw = (window as any).L as typeof import("leaflet");
    const layer = newsmapCalloutMarkersRef.current;
    layer.clearLayers();
    if (!newsmapCalloutsActive) return;

    for (const { headline, lat, lng } of newsmapCalloutPlacements) {
      const markerContent = {
        title: headline.title,
        kind: headline.kind,
        thumbnail: headline.thumbnail,
      };
      const iconSpec = buildHaberHaritasiMarkerIconHtml(
        { label: headline.city, countryCode: headline.countryCode ?? "TR" },
        markerContent,
        { calloutOnly: true },
      );
      const icon = Lw.divIcon({
        className: iconSpec.className,
        html: iconSpec.html,
        iconSize: iconSpec.iconSize,
        iconAnchor: iconSpec.iconAnchor,
      });
      const marker = Lw.marker([lat, lng], { icon, zIndexOffset: 420 });
      marker.bindTooltip(headline.city, { permanent: false, direction: "top" });
      marker.on("click", () => openNewsOverlayRef.current(headline));
      layer.addLayer(marker);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapLoaded,
    newsmapCalloutsActive,
    newsmapCalloutPlacements,
    newsmapMapZoom,
  ]);

  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current || !bilgiAgaciMarkersRef.current) return;
    const Lw = (window as any).L as typeof import("leaflet");
    const layer = bilgiAgaciMarkersRef.current;
    layer.clearLayers();
    if (!showBilgiAgaciOnMap || ilCenters.length === 0) return;
    if (newsmapMapZoom <= NEWSMAP_CLUSTER_MAX_ZOOM) return;
    for (const il of ilCenters) {
      const href = resolveBilgiAgaciHref(il.adi);
      if (!href) continue;
      if (newsmapLayer.newsMapGeoFilter && !isWithinNewsmapRadius(il.lat, il.lng, newsmapLayer.newsMapGeoFilter)) continue;
      const icon = Lw.divIcon({
        className: "haber-haritasi-bilgi-marker",
        html: '<div class="haber-haritasi-bilgi-marker__pin" aria-hidden="true"><span class="haber-haritasi-bilgi-marker__icon">i</span></div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = Lw.marker([il.lat, il.lng], { icon, zIndexOffset: 360 });
      marker.bindTooltip(`${il.adi} · Bilgi Ağacı`, { permanent: false, direction: "top" });
      marker.on("click", () => {
        closeNewsPreview();
        closeNewsOverlay();
        if (isNewsmapPage) {
          closeBilgiAgaciPreview();
          activateNewsmapLocationRef.current({
            lat: il.lat,
            lng: il.lng,
            zoom: il.zoom,
            label: il.adi,
            source: "bilgi_marker",
            kind: "news",
          });
          return;
        }
        setBilgiAgaciPreview({ title: il.adi, locationLabel: il.adi, href, lat: il.lat, lng: il.lng });
      });
      layer.addLayer(marker);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ilCenters, isNewsmapPage, mapLoaded, newsmapLayer.newsMapGeoFilter, newsmapMapZoom, resolveBilgiAgaciHref, closeBilgiAgaciPreview, closeNewsPreview, closeNewsOverlay, showBilgiAgaciOnMap]);

  // District dots for selected province/city
  useEffect(() => {
    if (!mapLoaded || !districtDotsRef.current || !neighborhoodDotsRef.current) return;
    const layer = districtDotsRef.current;
    const nLayer = neighborhoodDotsRef.current;
    layer.clearLayers();
    nLayer.clearLayers();
    const map = leafletMapRef.current;
    const center = map?.getCenter();
    const fallbackLoc = !selectedLocation && center && ilCenters.length > 0
      ? ilCenters
          .map((il) => ({
            il,
            d:
              (il.lat - center.lat) * (il.lat - center.lat) +
              (il.lng - center.lng) * (il.lng - center.lng),
          }))
          .sort((a, b) => a.d - b.d)[0]?.il
      : null;
    const loc: PopularLocation | null = selectedLocation ?? (fallbackLoc
      ? {
          id: `fallback-il-${fallbackLoc.plaka ?? fallbackLoc.adi}`,
          name: fallbackLoc.adi,
          nameTr: fallbackLoc.adi,
          latitude: fallbackLoc.lat,
          longitude: fallbackLoc.lng,
          zoomLevel: Math.max(10, fallbackLoc.zoom || 10),
          region: "",
        }
      : null);
    if (!loc || !loc.nameTr) return;
    let cancelled = false;
    const cityName = (loc.nameTr || loc.name).split(" › ")[0].trim();
    const districtNameFromLoc = (loc.nameTr || loc.name).includes("›")
      ? (loc.nameTr || loc.name).split("›")[1]?.trim() || ""
      : "";
    const trNorm = (v: string) =>
      v.toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c")
        .trim();
    fetch(mapApiUrl("/tr-address/provinces"))
      .then((r) => r.json())
      .then((provinces: Array<{ plaka?: number; adi?: string }>) => {
        const list = Array.isArray(provinces) ? provinces : [];
        const p = list.find((x) => trNorm(x.adi || "") === trNorm(cityName));
        if (!p?.plaka) return { districts: [] as Array<{ kimlikNo?: string; adi?: string }>, targetDistrictId: "" };
        return fetch(mapApiUrl(`/tr-address/districts?plaka=${encodeURIComponent(String(p.plaka))}`))
          .then((r) => r.json())
          .then((districts: Array<{ kimlikNo?: string; adi?: string }>) => {
            const rows = Array.isArray(districts) ? districts : [];
            const targetDistrictId = rows.find((d) => trNorm(d.adi || "") === trNorm(districtNameFromLoc))?.kimlikNo || "";
            return { districts: rows, targetDistrictId };
          });
      })
      .then(async ({ districts, targetDistrictId }) => {
        if (cancelled) return;
        // Keep calls limited/serial to avoid Nominatim throttling (429).
        const subset = districts.slice(0, 18);
        const geocoded: Array<{ dName: string; lat: number; lng: number }> = [];
        for (const d of subset) {
          if (cancelled) break;
          const dName = d.adi || "";
          if (!dName) continue;
          try {
            const q = `${dName}, ${cityName}, Türkiye`;
            const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=tr&format=json&limit=1`, {
              headers: { "Accept-Language": "tr", "User-Agent": "Yekpare/1.0" },
            });
            const g = await r.json() as Array<{ lat?: string; lon?: string }>;
            const lat = Number(g?.[0]?.lat);
            const lng = Number(g?.[0]?.lon);
            if (Number.isFinite(lat) && Number.isFinite(lng)) geocoded.push({ dName, lat, lng });
            await new Promise((res) => setTimeout(res, 60));
          } catch {
            // continue
          }
        }
        for (const item of geocoded) {
          if (!item) continue;
            const { dName, lat, lng } = item;
            const seed = [...`${cityName}-${dName}`].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 100;
            const cls = seed > 66 ? "Yüksek" : seed > 33 ? "Orta" : "Düşük";
            const color = cls === "Yüksek" ? "#dc2626" : cls === "Orta" ? "#f59e0b" : "#22c55e";
            const m = L.circleMarker([lat, lng], { radius: 6, color, fillColor: color, fillOpacity: 0.8, weight: 1.4 });
            m.bindTooltip(`NÜFUS · ${dName}`, { direction: "top" });
            const wrap = L.DomUtil.create("div", "");
            wrap.innerHTML = `<div><strong>${dName}</strong><br/><small>İlçe yoğunluğu: ${cls}</small></div>`;
            const row = document.createElement("div");
            row.className = "mt-1 flex flex-col gap-1";
            const goBtn = document.createElement("button");
            goBtn.type = "button";
            goBtn.className = "text-[11px] font-bold rounded px-2 py-1 text-white";
            goBtn.style.background = "linear-gradient(135deg,#0284c7,#2563eb)";
            goBtn.textContent = "Konuma git";
            L.DomEvent.on(goBtn, "click", (ev: Event) => {
              L.DomEvent.stopPropagation(ev);
              const dl: PopularLocation = {
                id: `ilce-${cityName}-${dName}`,
                name: `${cityName} › ${dName}`,
                nameTr: `${cityName} › ${dName}`,
                latitude: lat,
                longitude: lng,
                zoomLevel: 13,
                region: cityName,
              };
              goToLocationAndOpenCard(
                dl,
                {
                  id: dl.id,
                  title: dName,
                  areaInfo: cityName,
                  address: `${dName}, ${cityName}, Türkiye`,
                  lat,
                  lng,
                },
                { nearby50Km: true },
              );
            });
            const navBtn = document.createElement("button");
            navBtn.type = "button";
            navBtn.className = "text-[11px] font-bold rounded px-2 py-1 text-white";
            navBtn.style.background = "linear-gradient(135deg,#16a34a,#15803d)";
            navBtn.textContent = "Navigasyon";
            L.DomEvent.on(navBtn, "click", (ev: Event) => {
              L.DomEvent.stopPropagation(ev);
              setNavPickerBiz({
                id: `nav-ilce-${cityName}-${dName}`,
                name: `${dName} Merkez`,
                address: `${dName}, ${cityName}`,
                latitude: lat,
                longitude: lng,
              });
            });
            row.appendChild(goBtn);
            row.appendChild(navBtn);
            wrap.appendChild(row);
            m.bindPopup(wrap);
            m.on("click", () => {
              const dl: PopularLocation = {
                id: `ilce-${cityName}-${dName}`,
                name: `${cityName} › ${dName}`,
                nameTr: `${cityName} › ${dName}`,
                latitude: lat,
                longitude: lng,
                zoomLevel: 13,
                region: cityName,
              };
              goToLocationAndOpenCard(
                dl,
                {
                  id: dl.id,
                  title: dName,
                  areaInfo: cityName,
                  address: `${dName}, ${cityName}, Türkiye`,
                  lat,
                  lng,
                },
                { nearby50Km: true },
              );
            });
            layer.addLayer(m);
        }
        if (targetDistrictId) {
          try {
            const nRows = await fetch(mapApiUrl(`/tr-address/neighborhoods?ilceKimlik=${encodeURIComponent(String(targetDistrictId))}&limit=80`)).then((r) => r.json()) as Array<{ adi?: string }>;
            for (const n of (Array.isArray(nRows) ? nRows : [])) {
              const nName = n.adi || "";
              if (!nName) continue;
              try {
                const qr = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${nName}, ${districtNameFromLoc}, ${cityName}, Türkiye`)}&countrycodes=tr&format=json&limit=1`, {
                  headers: { "Accept-Language": "tr", "User-Agent": "Yekpare/1.0" },
                });
                const gj = await qr.json() as Array<{ lat?: string; lon?: string }>;
                const nLat = Number(gj?.[0]?.lat);
                const nLng = Number(gj?.[0]?.lon);
                if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) continue;
                const nm = L.circleMarker([nLat, nLng], { radius: 3.5, color: "#334155", fillColor: "#64748b", fillOpacity: 0.75, weight: 1 });
                nm.bindTooltip(`Mahalle · ${nName}`, { direction: "top" });
                nLayer.addLayer(nm);
              } catch {
                // continue
              }
            }
          } catch {
            // ignore neighborhood fetch failures
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedLocation, mapLoaded, L, ilCenters]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!mapLoaded || !map || !L) return;
    if (nearby50Km && userLocation) {
      if (nearbyRadiusCircleRef.current) {
        nearbyRadiusCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        nearbyRadiusCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
          radius: 50000,
          color: "#2563eb",
          weight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.06,
        }).addTo(map);
      }
    } else if (nearbyRadiusCircleRef.current) {
      nearbyRadiusCircleRef.current.remove();
      nearbyRadiusCircleRef.current = null;
    }
  }, [mapLoaded, nearby50Km, userLocation, L]);

  useEffect(() => { setTimeout(() => { leafletMapRef.current?.invalidateSize(); }, 100); }, [selectedBiz, isMobile]);

  /* Harita konteyneri boyutu değişince Leaflet tile alanını yeniden hesapla (özellikle /haritalar masaüstü). */
  useEffect(() => {
    if (!mapLoaded || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const bump = () => {
      requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
        if (!noTargetDefaultViewAppliedRef.current) {
          applyNoTargetTurkeyView(map);
        }
      });
    };
    bump();
    const timers = NO_TARGET_TURKEY_FIT_DELAYS_MS.map((delay) => window.setTimeout(bump, delay));
    const node = mapRef.current;
    const ro = node && typeof ResizeObserver !== "undefined" ? new ResizeObserver(bump) : null;
    if (ro && node) ro.observe(node);
    window.addEventListener("resize", bump);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      ro?.disconnect();
      window.removeEventListener("resize", bump);
    };
  }, [mapLoaded, layout, isMobile, desktopGeoPanelOpen, leftSidebarTab, applyNoTargetTurkeyView]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!mapLoaded || !map) return;
    const updateViewportInfo = () => {
      const center = map.getCenter();
      const lat = Number(center.lat.toFixed(5));
      const lng = Number(center.lng.toFixed(5));
      if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return;
      const zoom = map.getZoom();
      if (isNewsmapPage && zoom <= NEWSMAP_CLUSTER_MAX_ZOOM) {
        setViewportPlaceInfo({
          label: "Türkiye",
          city: "Türkiye",
          district: "",
          lat,
          lng,
          loading: false,
          source: "turkey_default",
        });
        return;
      }
      setViewportPlaceInfo((prev) => ({
        ...prev,
        lat,
        lng,
        loading: true,
      }));
      if (viewportReverseGeocodeTimerRef.current) window.clearTimeout(viewportReverseGeocodeTimerRef.current);
      const runId = ++viewportReverseGeocodeRunRef.current;
      viewportReverseGeocodeTimerRef.current = window.setTimeout(() => {
        void reverseGeocodeHybrid(siteSettings, lat, lng)
          .then((geo) => {
            if (runId !== viewportReverseGeocodeRunRef.current) return;
            const label = resolveMapLocationDisplayLabel(
              [geo.district, geo.city].filter(Boolean).join(", "),
              geo.city,
              geo.district,
              geo.label,
            ) || "Harita konumu";
            setViewportPlaceInfo({
              label,
              city: geo.city,
              district: geo.district,
              lat,
              lng,
              loading: false,
              source: "reverse_geocode",
            });
          })
          .catch(() => {
            if (runId !== viewportReverseGeocodeRunRef.current) return;
            setViewportPlaceInfo((prev) => ({
              ...prev,
              label: prev.city && !isGenericMapLocationLabel(prev.city) ? prev.city : "Harita konumu",
              loading: false,
              source: "reverse_geocode",
            }));
          });
      }, 650);
    };
    updateViewportInfo();
    map.on("moveend zoomend", updateViewportInfo);
    return () => {
      map.off("moveend zoomend", updateViewportInfo);
      if (viewportReverseGeocodeTimerRef.current) window.clearTimeout(viewportReverseGeocodeTimerRef.current);
    };
  }, [mapLoaded, siteSettings, isNewsmapPage]);

  function goToMyLocation(opts?: { nearby50Km?: boolean; openCard?: boolean }) {
    const withNearby = opts?.nearby50Km === true;
    const openCard = opts?.openCard === true;
    if (withNearby) setNearby50Km(true);
    if (!navigator.geolocation) {
      setLocateButtonState("error");
      showToast("Bu cihazda konum özelliği desteklenmiyor.");
      return;
    }
    hasUserNavigatedRef.current = true;
    setLocateButtonState("locating");
    showToast("Konumunuz alınıyor...");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        realUserLocationRef.current = loc;
        setUserLocation(loc);
        setLocateButtonState("idle");
        const z = withNearby ? 11 : 19;
        if (leafletMapRef.current) leafletMapRef.current.setView([loc.lat, loc.lng], z, { animate: true });
        if (newsMapEnabled || mapsHybridEnabled) {
          const userFilter = applyUserNewsmapGeoFilter(loc.lat, loc.lng);
          triggerNewsmapLocationScrape(loc.lat, loc.lng, "Konumunuz", "user_locate", userFilter);
        }
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`,
            { headers: { "Accept-Language": "tr", "User-Agent": "Yekpare/1.0" } }
          );
          const geoData = await geoRes.json();
          const addr = geoData.address || {};
          const cityName = addr.city || addr.town || addr.county || addr.state_district || addr.state || "Konumunuz";
          const virtualLoc: PopularLocation = {
            id: "user-location",
            name: cityName,
            nameTr: cityName,
            latitude: loc.lat,
            longitude: loc.lng,
            zoomLevel: z,
            region: addr.state || "",
          };
          goToLocation(virtualLoc, { clearNearby: !withNearby, panel: openCard ? "preserve" : "categories" });
          if (isNewsmapPage && newsmapKindFilter !== "businesses") {
            activateNewsmapLocationRef.current({
              lat: loc.lat,
              lng: loc.lng,
              zoom: z,
              label: cityName,
              source: "user_geolocation",
            });
          } else if (withNearby) {
            setBusinessPanelMode("results");
            setLocationPanelTab("businesses");
          } else if (openCard) {
            // Sadece sol ince menüdeki konum düğmesiyle açılır: bulunduğum konum penceresi.
            openSearchedLocationCard({
              id: "user-location",
              title: cityName,
              areaInfo: [addr.suburb || addr.neighbourhood, addr.county || addr.state_district, addr.state].filter(Boolean).join(", "),
              address: geoData.display_name || cityName,
              lat: loc.lat,
              lng: loc.lng,
            });
          }
        } catch { setSelectedLocation(null); }
      },
      () => {
        setLocateButtonState("error");
        showToast("Konum alınamadı. İzinleri kontrol edip tekrar deneyebilirsiniz.");
      },
      { enableHighAccuracy: true, timeout: 18_000, maximumAge: 0 }
    );
  }
  function goToLocation(loc: PopularLocation, opts?: { clearNearby?: boolean; panel?: "categories" | "preserve" }) {
    if (
      isBrowserNoTargetMapBasePath() &&
      !isInsideTurkeyDefaultBounds(loc.latitude, loc.longitude) &&
      /^(konum|harita konumu)$/i.test(String(loc.nameTr || loc.name || "").trim())
    ) {
      applyNoTargetTurkeyView();
      return;
    }
    hasUserNavigatedRef.current = true;
    if (opts?.clearNearby !== false) setNearby50Km(false);
    setSelectedLocation(loc); setSelectedBiz(null);
    if (opts?.panel !== "preserve") {
      setBusinessPanelMode("categories");
      setLocationPanelTab("businesses");
    }
    setTouristSpots([]); setLocationWiki(null); setSelectedSpot(null); setKulturTopics([]);
    setCityPois([]); setSelectedPoi(null); setRehberSubCat("gezilecek");
    setCitySections([]); setCitySectionsTitle(null); setOpenSectionKey(null);
    if (leafletMapRef.current) leafletMapRef.current.setView([loc.latitude, loc.longitude], loc.zoomLevel);
    if (newsMapEnabled) {
      triggerNewsmapLocationScrape(
        loc.latitude,
        loc.longitude,
        String(loc.nameTr || loc.name || "Konum"),
        "go_to_location",
      );
    }
  }

  function openSearchedLocationCard(info: SearchedLocationInfo) {
    setSearchedLocationInfo(info);
    setSelectedBiz(null);
    setLeftSidebarTab("isletmeler");
    setBusinessPanelMode("location");
    setLocationPanelTab("businesses");
    if (isMobile) {
      setMenuOpen(true);
    } else {
      setDesktopGeoPanelOpen(true);
    }
  }

  /** Haritada konuma uç + sol şehir/konum kartını aç (il/ilçe popup «Konuma git» vb.). */
  function goToLocationAndOpenCard(
    loc: PopularLocation,
    card: SearchedLocationInfo,
    opts?: { nearby50Km?: boolean },
  ) {
    goToLocation(loc, { clearNearby: false, panel: "preserve" });
    if (opts?.nearby50Km) setNearby50Km(true);
    openSearchedLocationCard(card);
  }

  // URL'den gelen konum kartını her benzersiz hedef için yalnızca bir kez açar.
  // Böylece kullanıcı kartı kapattığında (efekt bağımlılıkları değişse bile) tekrar açılmaz.
  function openSearchedLocationCardFromUrl(key: string, info: SearchedLocationInfo) {
    if (!mapLoaded) return;
    if (
      processedUrlCardKeyRef.current === key
      && searchedLocationInfoRef.current?.id === info.id
      && businessPanelMode === "location"
    ) {
      return;
    }
    processedUrlCardKeyRef.current = key;
    openSearchedLocationCard(info);
    window.setTimeout(() => {
      if (processedUrlCardKeyRef.current !== key) return;
      if (searchedLocationInfoRef.current?.id !== info.id) {
        openSearchedLocationCard(info);
      }
    }, 0);
  }

  function resolveUserDistanceOrigin(): { lat: number; lng: number } | null {
    const stored = profileLocationRef.current ?? readPublicLocation();
    if (stored && Number.isFinite(stored.lat) && Number.isFinite(stored.lng)) {
      profileLocationRef.current = { lat: stored.lat, lng: stored.lng };
      return { lat: stored.lat, lng: stored.lng };
    }
    const gps = realUserLocationRef.current;
    if (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng)) {
      return gps;
    }
    return null;
  }

  async function loadNearbyRegisteredBusinesses(center: { lat: number; lng: number; label: string }) {
    // Ortak sıra koruması: bu istek ile arka plandaki loadBusinesses yarışırsa yalnız en
    // son başlatılan yazabilsin; eskimiş bir yanıt taze sonuçların üzerine yazmasın.
    const myId = ++loadIdRef.current;
    setNearbyRegisteredLoading(true);
    setNearbyRegisteredLoaded(false);
    setNearbyProductsByBusiness({});
    try {
      const NEARBY_RADIUS_KM = 50;
      const params = new URLSearchParams({
        lat: String(center.lat),
        lng: String(center.lng),
        radius: String(NEARBY_RADIUS_KM * 1000),
        limit: "80",
      });
      const res = await fetch(mapApiUrl(`/map/businesses?${params}`));
      const parsed = await readJsonResponse<{ success?: boolean; data?: Business[]; error?: string }>(res, {
        success: false,
        data: [],
      });
      if (myId !== loadIdRef.current) return;
      if (!parsed.ok || !parsed.data.success) {
        // Yenileme başarısız: mevcut liste + işaretçileri KORU; yalnız banner göster.
        setPlacesSearchHint(FRIENDLY_MAP_ERROR);
        return;
      }
      const rows = Array.isArray(parsed.data.data) ? parsed.data.data : [];
      const userOrigin = resolveUserDistanceOrigin();
      const inRadius = rows.filter((b) => {
        const blat = Number(b.latitude);
        const blng = Number(b.longitude);
        if (!Number.isFinite(blat) || !Number.isFinite(blng)) return false;
        return distanceKm(center.lat, center.lng, blat, blng) <= NEARBY_RADIUS_KM;
      });
      const withDist = inRadius
        .map((b) => {
          const blat = Number(b.latitude);
          const blng = Number(b.longitude);
          return {
            ...b,
            distance: userOrigin ? distanceKm(userOrigin.lat, userOrigin.lng, blat, blng) : undefined,
          };
        })
        .sort((a, b) => {
          const rankA = userOrigin ? (a.distance ?? 999) : distanceKm(center.lat, center.lng, Number(a.latitude), Number(a.longitude));
          const rankB = userOrigin ? (b.distance ?? 999) : distanceKm(center.lat, center.lng, Number(b.latitude), Number(b.longitude));
          return rankA - rankB;
        });
      setBusinesses(withDist);
      const productPairs = await Promise.all(
        withDist.slice(0, 8).map(async (biz) => {
          try {
            const pr = await fetch(mapApiUrl(`/map/businesses/${encodeURIComponent(biz.id)}/products`));
            const d = await pr.json() as { success?: boolean; data?: MapBusinessProduct[] };
            const products = Array.isArray(d.data)
              ? d.data.filter((p) => p && p.name && p.isAvailable !== false).slice(0, 10)
              : [];
            return [biz.id, products] as const;
          } catch {
            return [biz.id, []] as const;
          }
        }),
      );
      if (myId !== loadIdRef.current) return;
      setNearbyProductsByBusiness(Object.fromEntries(productPairs.filter(([, products]) => products.length > 0)));
    } finally {
      if (myId === loadIdRef.current) {
        setNearbyRegisteredLoaded(true);
        setNearbyRegisteredLoading(false);
      }
    }
  }

  async function openNearbyBusinessCategories() {
    // Haritada görüntülenen konumun çevresindeki işletmeleri listeler; mesafe etiketi
    // kullanıcının gerçek konumundan (header adresi / GPS) hesaplanır — harita merkezi değil.
    const center = (selectedBiz && Number.isFinite(Number(selectedBiz.latitude)) && Number.isFinite(Number(selectedBiz.longitude)))
      ? { lat: Number(selectedBiz.latitude), lng: Number(selectedBiz.longitude), label: selectedBiz.name }
      : searchedLocationInfo
        ? { lat: searchedLocationInfo.lat, lng: searchedLocationInfo.lng, label: searchedLocationInfo.title }
        : selectedLocation
          ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude, label: selectedLocation.nameTr || selectedLocation.name }
          : (() => {
              const c = leafletMapRef.current?.getCenter();
              return c && Number.isFinite(c.lat) && Number.isFinite(c.lng)
                ? { lat: c.lat, lng: c.lng, label: viewportPlaceInfo.label }
                : { lat: viewportPlaceInfo.lat, lng: viewportPlaceInfo.lng, label: viewportPlaceInfo.label };
            })();
    setSelectedBiz(null);
    setBusinessPanelMode("categories");
    setLocationPanelTab("businesses");
    setLeftSidebarTab("isletmeler");
    if (isMobile) {
      setMenuOpen(true);
    } else {
      setDesktopGeoPanelOpen(true);
    }
    await loadNearbyRegisteredBusinesses(center);
  }

  function replaceMapLocationUrl(info: SearchedLocationInfo, zoom = 13) {
    if (typeof window === "undefined") return;
    if (!isUsableMapCoordinate(info.lat, info.lng)) return;
    const params = new URLSearchParams(window.location.search);
    ["q", "category", "super", "superCategory"].forEach((key) => params.delete(key));
    params.set("lat", info.lat.toFixed(6));
    params.set("lng", info.lng.toFixed(6));
    params.set("zoom", String(zoom));
    params.set("location", info.title);
    const provinceForTitle = resolveTurkishProvinceCenter(info.title, ilCenters);
    if (provinceForTitle) params.set("city", provinceForTitle.label);
    else params.delete("city");
    if (info.placeId) params.set("place_id", info.placeId);
    else params.delete("place_id");
    const nextUrl = `${safeMapUrlSyncBasePath(window.location.pathname)}?${params.toString()}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  async function resolveTypedMapLocation(raw: string): Promise<{
    loc: PopularLocation;
    card: SearchedLocationInfo;
    zoom: number;
  } | null> {
    const query = raw.trim();
    if (query.length < 2) return null;

    const normalizeMapSearchKey = (value: string) => value
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const fromDiscoveryDirectory = () => {
      const key = normalizeMapSearchKey(query);
      for (const region of KESFET_DISCOVERY_REGIONS) {
        for (const city of region.cities) {
          const cityKey = normalizeMapSearchKey(city.label);
          const slugKey = normalizeMapSearchKey(city.slug.replace(/-/g, " "));
          if (key === cityKey || key === slugKey || key === city.slug || cityKey.includes(key) || key.includes(cityKey)) {
            const zoom = city.zoom ?? 12;
            return {
              loc: {
                id: `discovery-${city.slug}`,
                name: city.label,
                nameTr: city.label,
                latitude: city.lat,
                longitude: city.lng,
                zoomLevel: zoom,
                region: region.label,
              },
              card: {
                id: `discovery-${city.slug}`,
                title: city.label,
                areaInfo: region.label,
                address: `${city.label}, ${region.label}`,
                lat: city.lat,
                lng: city.lng,
              },
              zoom,
            };
          }
        }
      }
      return null;
    };

    const fromStaticProvince = () => {
      const province = resolveTurkishProvinceCenter(query, ilCenters);
      if (!province) return null;
      return {
        loc: {
          id: `province-${province.slug}`,
          name: province.label,
          nameTr: province.label,
          latitude: province.lat,
          longitude: province.lng,
          zoomLevel: province.zoom,
          region: "Türkiye",
        },
        card: {
          id: `province-${province.slug}`,
          title: province.label,
          areaInfo: "Türkiye",
          address: `${province.label}, Türkiye`,
          lat: province.lat,
          lng: province.lng,
        },
        zoom: province.zoom,
      };
    };

    const fromLocationSuggest = async () => {
      try {
        const r = await fetch(mapApiUrl(`/location-suggest?q=${encodeURIComponent(query)}`));
        const d = await r.json() as {
          success?: boolean;
          data?: Array<{ id?: string; label?: string; lat?: number; lng?: number; zoom?: number; type?: string }>;
        };
        const row = Array.isArray(d.data)
          ? d.data.find((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
          : null;
        if (!row) return null;
        const lat = Number(row.lat);
        const lng = Number(row.lng);
        const zoom = Number.isFinite(Number(row.zoom)) ? Number(row.zoom) : row.type === "il" ? 9 : 13;
        const title = String(row.label || query).split(",")[0]?.trim() || query;
        return {
          loc: {
            id: `location-${row.id || Date.now()}`,
            name: title,
            nameTr: title,
            latitude: lat,
            longitude: lng,
            zoomLevel: zoom,
            region: "",
          },
          card: {
            id: `location-${row.id || Date.now()}`,
            title,
            areaInfo: String(row.label || ""),
            address: String(row.label || title),
            lat,
            lng,
          },
          zoom,
        };
      } catch {
        return null;
      }
    };

    const fromPlaces = async () => {
      try {
        const serverPlaces = await fetchServerPlacePredictions(query);
        const browserPlaces =
          serverPlaces.rows.length === 0 && mapsGeoEffective.mapsGoogleEnabled && (mapsGeoEffective.mapsGoogleBrowserKey ?? "").trim()
            ? (await fetchGooglePlacePredictionsDetailed(siteSettings, query, { restrictToTurkey: false })).predictions
            : [];
        const placeId = serverPlaces.rows[0]?.placeId || browserPlaces[0]?.place_id;
        const label = serverPlaces.rows[0]?.label || browserPlaces[0]?.description || query;
        if (!placeId) return null;
        const hit: PlaceDetailsHit | null = await geocodePlaceIdServer(placeId)
          || (mapsGeoEffective.mapsGoogleEnabled && (mapsGeoEffective.mapsGoogleBrowserKey ?? "").trim()
            ? await geocodePlaceIdClient(siteSettings, placeId)
            : null);
        if (!hit) return null;
        const addr = await reverseGeocodeHybrid(siteSettings, hit.lat, hit.lng);
        const title = hit.name || label.split(",")[0]?.trim() || query;
        const zoom = validMapBounds(hit.bounds) ? 13 : 14;
        return {
          loc: {
            id: `search-place-${placeId}`,
            name: title,
            nameTr: title,
            latitude: hit.lat,
            longitude: hit.lng,
            zoomLevel: zoom,
            region: addr.city || "",
            imageUrl: hit.photoUrl,
          },
          card: {
            id: `search-place-${placeId}`,
            placeId,
            title,
            areaInfo: [addr.district, addr.city].filter(Boolean).join(", "),
            address: hit.formatted_address || addr.label || label,
            lat: hit.lat,
            lng: hit.lng,
            bounds: hit.bounds,
            imageUrl: hit.photoUrl,
          },
          zoom,
        };
      } catch {
        return null;
      }
    };

    const fromNominatim = async () => {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${query}, Türkiye`)}&format=json&limit=1&addressdetails=1&countrycodes=tr`,
          { headers: { "Accept-Language": "tr" } },
        );
        const geoData = await geoRes.json();
        const first = Array.isArray(geoData) ? geoData[0] : null;
        if (!first) return null;
        const hitLat = parseFloat(first.lat);
        const hitLng = parseFloat(first.lon);
        if (!Number.isFinite(hitLat) || !Number.isFinite(hitLng)) return null;
        const addr = first.address || {};
        const title =
          addr.city ||
          addr.town ||
          addr.county ||
          addr.state_district ||
          addr.state ||
          String(first.display_name || query).split(",")[0]?.trim() ||
          query;
        const bounds = boundsFromNominatimBoundingBox(first.boundingbox);
        const zoom = addr.city || addr.state ? 10 : 13;
        return {
          loc: {
            id: `search-${Date.now()}`,
            name: title,
            nameTr: title,
            latitude: hitLat,
            longitude: hitLng,
            zoomLevel: zoom,
            region: addr.state || "",
          },
          card: {
            id: `search-${Date.now()}`,
            title,
            areaInfo: [addr.county || addr.state_district, addr.state].filter(Boolean).join(", "),
            address: first.display_name || title,
            lat: hitLat,
            lng: hitLng,
            bounds,
          },
          zoom,
        };
      } catch {
        return null;
      }
    };

    return fromDiscoveryDirectory()
      || fromStaticProvince()
      || (await fromLocationSuggest())
      || (await fromPlaces())
      || (await fromNominatim());
  }

  function applyResolvedMapLocation(resolved: { loc: PopularLocation; card: SearchedLocationInfo; zoom: number }) {
    setSmartKeyword("");
    setSearch("");
    setSelectedCategory(null);
    setMapSuperCategory(null);
    setSelectedBiz(null);
    setNearby50Km(false);
    goToLocation(resolved.loc, { clearNearby: false, panel: "preserve" });
    const resolvedBounds = validMapBounds(resolved.card.bounds);
    if (resolvedBounds && leafletMapRef.current) {
      const b = resolvedBounds;
      leafletMapRef.current.fitBounds([[b.south, b.west], [b.north, b.east]], { padding: [34, 34], maxZoom: resolved.zoom, animate: true });
    } else {
      leafletMapRef.current?.setView([resolved.loc.latitude, resolved.loc.longitude], resolved.zoom, { animate: true });
    }
    openSearchedLocationCard(resolved.card);
    window.setTimeout(() => openSearchedLocationCard(resolved.card), 0);
    replaceMapLocationUrl(resolved.card, resolved.zoom);
    void importBusinessesForCurrentLocation({
      silent: true,
      background: true,
      target: { label: resolved.card.title, lat: resolved.card.lat, lng: resolved.card.lng },
      keyword: "işletmeler",
      homepageSuperCategory: "mekan_dukkan",
      storeType: "mekan_dukkan",
    });
    setMapSearchSugOpen(false);
    setMapSearchSuggestions([]);
    setPlacesSearchHint(null);
  }

  useEffect(() => {
    if (!mapLoaded || !L || !leafletMapRef.current) return;
    if (searchedLocationMarkerRef.current) {
      searchedLocationMarkerRef.current.remove();
      searchedLocationMarkerRef.current = null;
    }
    if (!selectedLocation) return;
    const map = leafletMapRef.current;
    const title = selectedLocation.nameTr || selectedLocation.name;
    const searchedBounds = searchedLocationInfo?.lat === selectedLocation.latitude && searchedLocationInfo?.lng === selectedLocation.longitude
      ? validMapBounds(searchedLocationInfo.bounds)
      : null;
    const bounds = searchedBounds ?? approximateBoundsAround(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.zoomLevel);
    const group = L.layerGroup().addTo(map);
    const latLngBounds = L.latLngBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]]);
    L.circle([selectedLocation.latitude, selectedLocation.longitude], {
      radius: Math.max(120, Math.min(1200, latLngBounds.getNorthEast().distanceTo(latLngBounds.getSouthWest()) / 18)),
      color: YEKPARE_SADE_TEAL,
      weight: 1,
      opacity: 0.45,
      fillColor: YEKPARE_SADE_ACCENT,
      fillOpacity: 0.16,
      interactive: false,
    }).addTo(group);
    L.tooltip({
      permanent: false,
      direction: "top",
      opacity: 0.92,
    })
      .setLatLng([selectedLocation.latitude, selectedLocation.longitude])
      .setContent(`<strong>${escapeHtmlText(title)}</strong>`)
      .addTo(group);
    searchedLocationMarkerRef.current = group;
    return () => {
      group.remove();
      if (searchedLocationMarkerRef.current === group) searchedLocationMarkerRef.current = null;
    };
  }, [selectedLocation, searchedLocationInfo, mapLoaded, L]);

  function scheduleLocSuggest(raw: string) {
    if (locSugTimer.current) clearTimeout(locSugTimer.current);
    const val = raw.trim();
    setPlacesSearchHint(null);
    if (val.length < 2) {
      setLocSuggestions([]);
      return;
    }
    locSugTimer.current = setTimeout(() => {
      const runId = ++locSuggestRunRef.current;
      void (async () => {
        let serverRows: { id: string; label: string; type: string }[] = [];
        try {
          const r = await fetch(mapApiUrl(`/location-suggest?q=${encodeURIComponent(val)}`));
          const d = await r.json();
          if (d.success && Array.isArray(d.data)) serverRows = d.data;
        } catch {
          /* ignore */
        }
        const serverPlaces = await fetchServerPlacePredictions(val);
        const browserPlaces =
          serverPlaces.rows.length === 0 && mapsGeoEffective.mapsGoogleEnabled && (mapsGeoEffective.mapsGoogleBrowserKey ?? "").trim()
            ? (await fetchGooglePlacePredictionsDetailed(siteSettings, val, { restrictToTurkey: false })).predictions
            : [];
        let hybridFallbackRows: LocSug[] = [];
        if (serverPlaces.rows.length === 0 && browserPlaces.length === 0 && serverRows.length === 0) {
          const hybridRows = await fetchHybridLocationSuggestionsDetailed(siteSettings, val, {
            ilCenters,
            discoveryCities: KESFET_DISCOVERY_CITY_SUGGESTION_ROWS,
            popularCityNames: MEGA_CITIES_TR,
            limit: 8,
          });
          hybridFallbackRows = hybridRows.map((row) => ({
            id: row.place_id.startsWith("g_") ? row.place_id : `hybrid-${row.place_id}`,
            label: row.description,
            type: row.lat != null && row.lng != null && !row.place_id.startsWith("g_") && !row.place_id.includes(":")
              ? "il"
              : row.place_id.startsWith("g_") || /^[A-Za-z0-9_-]{20,}$/.test(row.place_id)
                ? "google"
                : "ilce",
            placeId: row.source === "google" || /^[A-Za-z0-9_-]{20,}$/.test(row.place_id) ? row.place_id.replace(/^g_/, "") : undefined,
            lat: row.lat,
            lng: row.lng,
            zoom: row.zoom,
          }));
        }
        if (runId !== locSuggestRunRef.current) return;
        const seenPlaceIds = new Set<string>();
        const googleRows = [
          ...serverPlaces.rows.map((g) => ({
            id: `g_${g.placeId}`,
            label: g.label,
            type: "google" as const,
            placeId: g.placeId,
          })),
          ...browserPlaces.map((g) => ({
            id: `g_${g.place_id}`,
            label: g.description,
            type: "google" as const,
            placeId: g.place_id,
          })),
        ].filter((row) => {
          if (!row.placeId || seenPlaceIds.has(row.placeId)) return false;
          seenPlaceIds.add(row.placeId);
          return true;
        });
        const merged: LocSug[] = [
          ...googleRows,
          ...serverRows.map((s) => ({
            id: s.id,
            label: s.label,
            type: (s.type === "il" || s.type === "ilce" || s.type === "mahalle" ? s.type : "mahalle") as "il" | "ilce" | "mahalle",
          })),
          ...hybridFallbackRows,
        ].slice(0, 12);
        if (merged.length === 0) {
          setPlacesSearchHint("Eşleşme bulunamadı. Farklı bir yer adı deneyin.");
        } else {
          setPlacesSearchHint(null);
        }
        setLocSuggestions(merged);
      })();
    }, 250);
  }

  function mahalleFromLabel(label: string, district: string, city: string): string {
    const parts = String(label || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length <= 1) return "";
    const d = district.toLowerCase().trim();
    const c = city.toLowerCase().trim();
    return (
      parts.find((p) => {
        const low = p.toLowerCase();
        return low !== d && low !== c;
      }) || ""
    );
  }

  async function applyLocSuggestion(s: LocSug) {
    setLocSugOpen(false);
    setLocSuggestions([]);
    if (Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)) && isUsableMapCoordinate(Number(s.lat), Number(s.lng))) {
      const lat = Number(s.lat);
      const lng = Number(s.lng);
      const zoom = Number.isFinite(Number(s.zoom)) ? Number(s.zoom) : 13;
      const title = s.label.split(",")[0]?.trim() || s.label;
      applyResolvedMapLocation({
        loc: {
          id: s.id,
          name: title,
          nameTr: title,
          latitude: lat,
          longitude: lng,
          zoomLevel: zoom,
          region: "",
        },
        card: {
          id: s.id,
          title,
          areaInfo: s.label,
          address: s.label,
          lat,
          lng,
        },
        zoom,
      });
      setSmartLocation(s.label);
      return;
    }
    if (s.type === "google" && s.placeId) {
      const hit: PlaceDetailsHit | null = await geocodePlaceIdServer(s.placeId)
        || (mapsGeoEffective.mapsGoogleEnabled && (mapsGeoEffective.mapsGoogleBrowserKey ?? "").trim()
          ? await geocodePlaceIdClient(siteSettings, s.placeId)
          : null);
      if (hit && isUsableMapCoordinate(hit.lat, hit.lng)) {
        setSmartLocation(s.label);
        const addr = await reverseGeocodeHybrid(siteSettings, hit.lat, hit.lng);
        setSmartLocationPlaceId(s.placeId);
        setSmartLocationTr({
          city: addr.city,
          district: addr.district,
          mahalle: mahalleFromLabel(addr.label, addr.district, addr.city),
          sokak: "",
        });
        setUserLocation({ lat: hit.lat, lng: hit.lng });
        const virtualLoc: PopularLocation = {
          id: s.id,
          name: hit.name || s.label,
          nameTr: hit.name || s.label,
          latitude: hit.lat,
          longitude: hit.lng,
          zoomLevel: 17,
          region: addr.city || "",
          imageUrl: hit.photoUrl,
        };
        goToLocation(virtualLoc, { clearNearby: false });
        openSearchedLocationCard({
          id: s.id,
          placeId: s.placeId,
          title: hit.name || s.label,
          areaInfo: [addr.district, addr.city].filter(Boolean).join(", "),
          address: hit.formatted_address || addr.label,
          lat: hit.lat,
          lng: hit.lng,
          bounds: hit.bounds,
          imageUrl: hit.photoUrl,
        });
        if (leafletMapRef.current) leafletMapRef.current.setView([hit.lat, hit.lng], 17, { animate: true });
        replaceMapLocationUrl({
          id: s.id,
          placeId: s.placeId,
          title: hit.name || s.label,
          areaInfo: [addr.district, addr.city].filter(Boolean).join(", "),
          address: hit.formatted_address || addr.label,
          lat: hit.lat,
          lng: hit.lng,
          bounds: hit.bounds,
          imageUrl: hit.photoUrl,
        }, 17);
        return;
      }
    }
    const resolved = await resolveTypedMapLocation(s.label);
    if (resolved) {
      applyResolvedMapLocation(resolved);
      setSmartLocation(s.label);
      return;
    }
    setSmartLocationPlaceId(null);
    setSmartLocation(s.label);
    showToast("Konum bulunamadı. Farklı bir yer adı deneyin.");
  }

  function scheduleMapSearchSuggest(raw: string) {
    if (mapSearchSugTimer.current) clearTimeout(mapSearchSugTimer.current);
    const val = raw.trim();
    setPlacesSearchHint(null);
    if (val.length < 2) {
      setMapSearchSuggestions([]);
      return;
    }
    mapSearchSugTimer.current = setTimeout(() => {
      const runId = ++mapSearchSuggestRunRef.current;
      void (async () => {
        let locationRows: MapSearchSug[] = [];
        try {
          const locRes = await fetch(mapApiUrl(`/location-suggest?q=${encodeURIComponent(val)}`));
          const locData = await locRes.json() as {
            success?: boolean;
            data?: Array<{ id?: string; label?: string; lat?: number; lng?: number; zoom?: number }>;
          };
          if (locData.success && Array.isArray(locData.data)) {
            locationRows = locData.data
              .filter((row) => Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng)))
              .map((row) => ({
                id: `search-loc-${row.id || `${row.lat},${row.lng}`}`,
                label: String(row.label || val),
                lat: Number(row.lat),
                lng: Number(row.lng),
                zoom: Number.isFinite(Number(row.zoom)) ? Number(row.zoom) : 13,
                type: "location" as const,
              }));
          }
        } catch {
          locationRows = [];
        }
        const serverPlaces = await fetchServerPlacePredictions(val);
        const browserPlaces =
          serverPlaces.rows.length === 0 && mapsGeoEffective.mapsGoogleEnabled && (mapsGeoEffective.mapsGoogleBrowserKey ?? "").trim()
            ? (await fetchGooglePlacePredictionsDetailed(siteSettings, val, { restrictToTurkey: false })).predictions
            : [];
        let hybridFallbackRows: MapSearchSug[] = [];
        if (locationRows.length === 0 && serverPlaces.rows.length === 0 && browserPlaces.length === 0) {
          const hybridRows = await fetchHybridLocationSuggestionsDetailed(siteSettings, val, {
            ilCenters,
            discoveryCities: KESFET_DISCOVERY_CITY_SUGGESTION_ROWS,
            popularCityNames: MEGA_CITIES_TR,
            limit: 8,
          });
          hybridFallbackRows = hybridRows.map((row) => ({
            id: `search-${row.place_id}`,
            label: row.description,
            placeId: row.source === "google" ? row.place_id : undefined,
            lat: row.lat,
            lng: row.lng,
            zoom: row.zoom,
            type: row.source === "google" ? "google" as const : "location" as const,
          }));
        }
        if (runId !== mapSearchSuggestRunRef.current) return;
        const seen = new Set<string>();
        const suggestionRows: MapSearchSug[] = [
          ...locationRows,
          ...serverPlaces.rows.map((g) => ({ id: `search-g-${g.placeId}`, label: g.label, placeId: g.placeId, type: "google" as const })),
          ...browserPlaces.map((g) => ({ id: `search-g-${g.place_id}`, label: g.description, placeId: g.place_id, type: "google" as const })),
          ...hybridFallbackRows,
        ];
        const mergedSuggestions = suggestionRows.filter((row) => {
          const key = row.placeId || `${row.lat},${row.lng}` || row.label;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 8);
        if (mergedSuggestions.length === 0) {
          setPlacesSearchHint("Eşleşme bulunamadı. Farklı bir ad deneyin.");
        } else {
          setPlacesSearchHint(null);
        }
        setMapSearchSuggestions(mergedSuggestions);
      })();
    }, 220);
  }

  async function applyMapSearchSuggestion(s: MapSearchSug) {
    setMapSearchSugOpen(false);
    setMapSearchSuggestions([]);
    if (Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng))) {
      const lat = Number(s.lat);
      const lng = Number(s.lng);
      const zoom = Number.isFinite(Number(s.zoom)) ? Number(s.zoom) : 13;
      const title = s.label.split(",")[0]?.trim() || s.label;
      applyResolvedMapLocation({
        loc: {
          id: s.id,
          name: title,
          nameTr: title,
          latitude: lat,
          longitude: lng,
          zoomLevel: zoom,
          region: "",
        },
        card: {
          id: s.id,
          title,
          areaInfo: s.label,
          address: s.label,
          lat,
          lng,
        },
        zoom,
      });
      return;
    }
    if (!s.placeId) {
      const resolved = await resolveTypedMapLocation(s.label);
      if (resolved) applyResolvedMapLocation(resolved);
      else showToast("Konum bulunamadı. Farklı bir yer adı deneyin.");
      return;
    }
    setSmartKeyword("");
    setSearch("");
    setSelectedCategory(null);
    setMapSuperCategory(null);
    setSelectedBiz(null);
    const hit: PlaceDetailsHit | null = await geocodePlaceIdServer(s.placeId)
      || (mapsGeoEffective.mapsGoogleEnabled && (mapsGeoEffective.mapsGoogleBrowserKey ?? "").trim()
        ? await geocodePlaceIdClient(siteSettings, s.placeId)
        : null);
    if (!hit || !isUsableMapCoordinate(hit.lat, hit.lng)) {
      const resolved = await resolveTypedMapLocation(s.label);
      if (resolved) applyResolvedMapLocation(resolved);
      else showToast("Konum bulunamadı. Farklı bir yer adı deneyin.");
      return;
    }
    const addr = await reverseGeocodeHybrid(siteSettings, hit.lat, hit.lng);
    const virtualLoc: PopularLocation = {
      id: s.id,
      name: hit.name || s.label,
      nameTr: hit.name || s.label,
      latitude: hit.lat,
      longitude: hit.lng,
      zoomLevel: 17,
      region: addr.city || "",
      imageUrl: hit.photoUrl,
    };
    goToLocation(virtualLoc, { clearNearby: false, panel: "preserve" });
    leafletMapRef.current?.setView([hit.lat, hit.lng], 17, { animate: true });
    setSmartLocation(addr.city || addr.district ? [addr.district, addr.city].filter(Boolean).join(", ") : "");
    openSearchedLocationCard({
      id: s.id,
      placeId: s.placeId,
      title: hit.name || s.label,
      areaInfo: [addr.district, addr.city].filter(Boolean).join(", "),
      address: hit.formatted_address || addr.label,
      lat: hit.lat,
      lng: hit.lng,
      bounds: hit.bounds,
      imageUrl: hit.photoUrl,
    });
  }

  /* ── Load Wikipedia + tourist spots when a location is selected ── */
  useEffect(() => {
    if (!selectedLocation) {
      setLocationWiki(null); setTouristSpots([]); setSelectedSpot(null); setKulturTopics([]);
      setCitySections([]); setCitySectionsTitle(null);
      if (touristMarkersRef.current && leafletMapRef.current) {
        touristMarkersRef.current.clearLayers();
      }
      return;
    }

    const locName = selectedLocation.nameTr || selectedLocation.name;
    // For districts ("Ordu › Gülyalı") use just the district name for Wikipedia lookups
    const isDistrict = locName.includes(" › ");
    const wikiName = isDistrict ? locName.split(" › ").pop()! : locName;

    // 1. Fetch Wikipedia summary
    fetch(mapApiUrl(`/wiki/summary/${encodeURIComponent(wikiName)}`))
      .then(r => r.json())
      .then(d => {
        if (d.summary) {
          setLocationWiki({
            title: d.title || locName,
            summary: d.summary,
            image: d.thumbnail?.source || d.originalimage?.source || undefined,
            url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(d.title || locName)}`,
          });
        }
      })
      .catch(() => {});

    // 2. Fetch tourist spots — with city/50km fallback if district returns empty (zaman aşımı: sonsuz "Yükleniyor" önlenir)
    setTouristLoading(true);
    const ac = new AbortController();
    const to = window.setTimeout(() => ac.abort(), 28000);
    const initialRadius = selectedLocation.zoomLevel < 11 ? 30000 : 15000;
    fetch(mapApiUrl("/map/tourism-spots"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: selectedLocation.latitude, lng: selectedLocation.longitude, radius: initialRadius }),
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          if (d.data.length === 0 && isDistrict) {
            return fetch(mapApiUrl("/map/tourism-spots"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat: selectedLocation.latitude, lng: selectedLocation.longitude, radius: 50000 }),
              signal: ac.signal,
            })
              .then((r2) => r2.json())
              .then((d2) => {
                if (d2.success && d2.data) setTouristSpots(d2.data);
                if (touristMarkersRef.current) touristMarkersRef.current.clearLayers();
              });
          }
          setTouristSpots(d.data);
          if (touristMarkersRef.current) touristMarkersRef.current.clearLayers();
        }
        return undefined;
      })
      .catch(() => {
        setTouristSpots([]);
      })
      .finally(() => {
        clearTimeout(to);
        setTouristLoading(false);
      });

    // 3. Fetch Kültür topics (lazy — don't block UI)
    setKulturTopics([]);
    setKulturLoading(true);
    const kulturTopicKeys = ["el_sanatlari", "mutfak", "folklor"];
    Promise.all(
      kulturTopicKeys.map(t =>
        fetch(mapApiUrl(`/wiki/city-topics?city=${encodeURIComponent(wikiName)}&topic=${t}`))
          .then(r => r.json())
          .then((d: { success: boolean; data?: { topic: string; label: string; title: string | null; summary: string | null; html: string | null }[] }) => d.success && d.data ? d.data[0] : null)
          .catch(() => null)
      )
    ).then(results => {
      setKulturTopics(results.filter(Boolean) as { topic: string; label: string; title: string | null; summary: string | null; html: string | null }[]);
      setKulturLoading(false);
    }).catch(() => setKulturLoading(false));

    // 4. Fetch city Wikipedia sections (Etimoloji, Tarihçe, Coğrafya, etc.)
    setCitySections([]); setCitySectionsTitle(null); setCitySectionsLoading(true);
    fetch(mapApiUrl(`/wiki/city-sections?city=${encodeURIComponent(wikiName)}`))
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setCitySections(d.data);
          setCitySectionsTitle(d.title || null);
        }
      })
      .catch(() => {})
      .finally(() => setCitySectionsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);

  /* ── Fetch city POIs when rehber sub-category changes (non-gezilecek) ── */
  useEffect(() => {
    if (!selectedLocation || rehberSubCat === "gezilecek") {
      setCityPois([]); setSelectedPoi(null);
      return;
    }
    setCityPois([]); setSelectedPoi(null); setCityPoisLoading(true);
    const radius = selectedLocation.zoomLevel < 11 ? 30000 : 20000;
    fetch(mapApiUrl("/map/city-pois"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: selectedLocation.latitude, lng: selectedLocation.longitude, radius, category: rehberSubCat }),
    })
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setCityPois(d.data); })
      .catch(() => {})
      .finally(() => setCityPoisLoading(false));
    // Clear any existing POI highlight marker
    if (poiHighlightRef.current && leafletMapRef.current) {
      poiHighlightRef.current.remove();
      poiHighlightRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, rehberSubCat]);

  /* ── Render POI markers on map when cityPois changes ── */
  useEffect(() => {
    if (!mapLoaded || !poiMarkersRef.current) return;
    const L = (window as any).L;
    poiMarkersRef.current.clearLayers();
    // Also clear the old single highlight
    if (poiHighlightRef.current) { poiHighlightRef.current.remove(); poiHighlightRef.current = null; }
    if (cityPois.length === 0) return;
    const catColor = REHBER_CAT_COLORS[rehberSubCat] || "#6366f1";
    cityPois.forEach(poi => {
      const emoji = poiEmoji(poi.type);
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:36px;height:36px;cursor:pointer">
          <div style="position:absolute;inset:0;border-radius:50%;background:${catColor};opacity:0.18"></div>
          <div style="position:absolute;inset:3px;background:white;border:2.5px solid ${catColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${emoji}</div>
        </div>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      });
      const marker = L.marker([poi.lat, poi.lng], { icon });
      marker.on("click", () => {
        setSelectedPoi(poi);
        if (leafletMapRef.current) leafletMapRef.current.panTo([poi.lat, poi.lng], { animate: true });
      });
      poiMarkersRef.current!.addLayer(marker);
    });
    // Fit bounds to show all POIs
    if (leafletMapRef.current && cityPois.length > 0) {
      if (cityPois.length === 1) {
        leafletMapRef.current.setView([cityPois[0].lat, cityPois[0].lng], 15);
      } else {
        const bounds = L.latLngBounds(cityPois.map((p: CityPoi) => [p.lat, p.lng] as [number, number]));
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityPois, mapLoaded]);

  /* ── Pan map when a POI is selected from the detail panel ── */
  function selectPoi(poi: CityPoi) {
    setSelectedPoi(poi);
    if (leafletMapRef.current) leafletMapRef.current.panTo([poi.lat, poi.lng], { animate: true });
  }

  function syncSelectedBizUrl(biz: Business) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("nav", String(biz.id));
    if (biz.latitude != null && biz.longitude != null) {
      params.set("lat", String(biz.latitude));
      params.set("lng", String(biz.longitude));
      params.set("zoom", "17");
    }
    const qs = params.toString();
    const base = safeMapUrlSyncBasePath(window.location.pathname);
    window.history.replaceState(window.history.state, "", qs ? `${base}?${qs}` : base);
  }

  function selectBiz(biz: Business) {
    setSelectedBiz(biz); setDetailTab("overview");
    setLeftSidebarTab("isletmeler");
    setLocationPanelTab("businesses");
    if (isMobile) {
      setMenuOpen(true);
    } else {
      setDesktopGeoPanelOpen(true);
    }
    if (biz.latitude && biz.longitude && leafletMapRef.current)
      leafletMapRef.current.panTo([biz.latitude, biz.longitude], { animate: true });
    syncSelectedBizUrl(biz);
  }

  const catIcon = (biz: Business) => categories.find(c => c.id === biz.categoryId)?.icon || "🏢";
  const catName = (biz: Business) => categories.find(c => c.id === biz.categoryId)?.name || "İşletme";
  const isAutoImportedBusiness = (biz?: Business | null) => {
    const source = String(biz?.importSource ?? "").toLowerCase();
    return source === "google_places" || source === "places_api";
  };
  const isExactGooglePlacePhotoUrl = (url?: string | null) => {
    const raw = String(url ?? "");
    return /maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(raw) || /places\.googleapis\.com\/v1\/places\/[^/]+\/photos\//i.test(raw);
  };
  const publicBusinessPhotoSrc = (biz?: Business | null) => {
    const raw = biz?.coverPhotoUrl || biz?.photoUrl || "";
    if (!raw) return "";
    if (isAutoImportedBusiness(biz) && !isExactGooglePlacePhotoUrl(raw)) return "";
    return resolveClientMediaSrc(raw) || "";
  };
  const openStatus = selectedBiz?.workingHours ? getOpenStatus(selectedBiz.workingHours) : null;
  const bizCoverPhoto = publicBusinessPhotoSrc(selectedBiz);
  const photos: GPhoto[] = googleDetails?.photos?.length ? googleDetails.photos
    .filter((photo) => !isAutoImportedBusiness(selectedBiz) || isExactGooglePlacePhotoUrl(photo.url))
    .map((photo) => ({
      ...photo,
      url: resolveClientMediaSrc(photo.url) || photo.url,
    }))
    : bizCoverPhoto ? [{ url: bizCoverPhoto, width: 800, height: 533 }] : [];

  /* ─────────────────────────────────────────────────────── */
  /* Shared sub-components                                   */
  /* ─────────────────────────────────────────────────────── */

  const MAPS_HYBRID_KIND_CHIPS: Array<{ key: "all" | "news" | "video" | "info"; label: string; icon: string }> = [
    { key: "all", label: "Tümü", icon: "🌍" },
    { key: "news", label: "Haber", icon: "📰" },
    { key: "video", label: "Video", icon: "▶️" },
    { key: "info", label: "Bilgi", icon: "ℹ️" },
  ];

  const MapsHybridContentChips = ({ className = "" }: { className?: string }) => (
    <div
      className={`haber-haritasi-newsmap-chips flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5 ${className}`.trim()}
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      {MAPS_HYBRID_KIND_CHIPS.map((row) => (
        <Chip
          key={row.key}
          active={newsmapKindFilter === row.key || (row.key === "info" && newsmapInfoMode)}
          onClick={() => applyNewsmapKindFilter(row.key)}
          icon={row.icon}
          label={row.label}
        />
      ))}
    </div>
  );

  /* Unified search: one field drives both Yekpare business search and Google place/location suggestions. */
  const SearchBar = ({ showMenuButton = true, showBrand = true }: { showMenuButton?: boolean; showBrand?: boolean } = {}) => (
    <div className={`flex min-w-0 flex-col gap-2${mapsHybridEnabled && !isNewsmapPage ? " haber-haritasi-newsmap-toolbar" : ""}`}>
      <div className="flex min-w-0 items-center gap-2">
      {showBrand ? MapChromeBrand({ compact: true }) : null}
      {showMenuButton && (
        selectedBiz && isMobile
          ? <button onClick={() => setSelectedBiz(null)} className="p-2 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg hover:bg-white transition shrink-0 border border-white/60">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
          : <button
              onClick={() => {
                if (isMobile) {
                  setMenuOpen(true);
                  return;
                }
                setLeftSidebarTab("isletmeler");
                setBusinessPanelMode((mode) => mode === "location" ? mode : "categories");
                setDesktopGeoPanelOpen((open) => !open);
              }}
              className="p-2 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg hover:bg-white transition shrink-0 border border-white/60"
              aria-label="Harita menüsünü aç veya kapat"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
      )}
      <form onSubmit={handleSmartSearch}
        className="relative flex-1 flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/70 ring-1 ring-black/5 overflow-visible min-w-0">
        <div className="relative flex items-center gap-1.5 flex-1 min-w-0 px-3 py-2.5">
          <svg className="w-3.5 h-3.5 text-sky-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 text-gray-800 font-medium min-w-0"
            placeholder="İşletme, restoran, mağaza, otel veya konum ara..."
            value={smartKeyword}
            autoComplete="off"
            onChange={e => {
              const value = e.target.value;
              setSmartKeyword(value);
              // Ağır iş listesi getirmeyi debounce ile ertele — yazarken harita donmaz.
              commitSearchDebounced(value);
              setSelectedCategory(null);
              setMapSuperCategory(null);
              setSelectedBiz(null);
              setMapSearchSugOpen(true);
              scheduleMapSearchSuggest(value);
            }}
            onFocus={() => { if (mapSearchSuggestions.length > 0) setMapSearchSugOpen(true); }}
            onBlur={() => { setTimeout(() => setMapSearchSugOpen(false), 180); }}
          />
          {smartKeyword && (
            <button type="button" onClick={() => { if (searchCommitTimer.current) clearTimeout(searchCommitTimer.current); setSmartKeyword(""); setSearch(""); setSmartLocation(""); setSmartLocationPlaceId(null); setMapSearchSuggestions([]); setMapSearchSugOpen(false); }} className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center text-[9px] font-bold transition shrink-0">✕</button>
          )}
          {mapSearchSugOpen && mapSearchSuggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full z-[10060] mt-2 max-h-72 overflow-auto rounded-2xl border border-sky-100 bg-white shadow-2xl"
              /* Dokunmatikte blur, tıklamadan önce listeyi kapatıyordu — odak kaybını engelle. */
              onPointerDown={(e) => e.preventDefault()}
            >
              {mapSearchSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-sky-50"
                  onClick={() => { void applyMapSearchSuggestion(s); }}
                >
                  <span className="mt-0.5 text-sm text-sky-700">⌕</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">{s.label}</span>
                    <span className="block text-[11px] font-medium text-slate-400">Haritada göster</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={smartLoading}
          className="h-full px-3 sm:px-4 text-white transition shrink-0 disabled:opacity-70 flex items-center justify-center py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap hover:brightness-110"
          style={{ background: MAP_CHROME_GRAD }}>
          {smartLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : "Ara"}
        </button>
      </form>
      {mapsHybridEnabled && !isNewsmapPage
        ? MapsHybridContentChips({ className: "hidden shrink-0 sm:flex" })
        : null}
      </div>
      {mapsHybridEnabled && !isNewsmapPage
        ? MapsHybridContentChips({ className: "sm:hidden" })
        : null}
      {placesSearchHint && (
        <div className={`${isMobile ? "" : "ml-[4.25rem]"} max-w-[720px] rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] font-semibold leading-snug text-amber-900 shadow-sm`}>
          {placesSearchHint}
        </div>
      )}
    </div>
  );

  /* POI-type category slugs/types that belong in location info, not the business list */
  const POI_TYPES = new Set(["park", "mosque", "camiler", "parklar", "place_of_worship"]);
  const isPOI = (c: Category) => POI_TYPES.has(c.slug ?? "") || POI_TYPES.has(c.googlePlaceType ?? "");
  const bizCategories = categories.filter(c => !isPOI(c));
  const poiCategoryIds = new Set(categories.filter(isPOI).map(c => c.id));
  /* Filter POI businesses unless a specific POI category is explicitly selected */
  const visibleBusinesses = selectedCategory && poiCategoryIds.has(selectedCategory)
    ? businesses
    : businesses.filter(b => !b.categoryId || !poiCategoryIds.has(b.categoryId));
  const SERVICE_MAP_CHIPS: {
    key: string | null;
    label: string;
    icon: string;
    q?: string;
    googlePlaceType?: string;
    storeType?: string;
  }[] = [
    { key: null, label: "Tüm işletmeler", icon: "🏢" },
    { key: "siparis", label: "Restoranlar", icon: "🍽️", q: "restoran", googlePlaceType: "restaurant", storeType: "mekan_restoran" },
    { key: "alisveris", label: "Giyim mağazaları", icon: "👕", q: "giyim mağazası", googlePlaceType: "clothing_store", storeType: "alisveris_giyim" },
    { key: "turizm", label: "Oteller", icon: "🏨", q: "otel", googlePlaceType: "lodging", storeType: "turizm_otel" },
    { key: "alisveris", label: "Alışveriş", icon: "🛍️", q: "alışveriş mağaza", googlePlaceType: "shopping_mall", storeType: "alisveris" },
    { key: "turizm", label: "Turizm & Konaklama", icon: "✈️", q: "turizm konaklama", googlePlaceType: "travel_agency", storeType: "turizm" },
    { key: "hizmet", label: "Güzellik & Bakım", icon: "✂️", q: "güzellik bakım", googlePlaceType: "beauty_salon", storeType: "hizmet_guzellik" },
    { key: "hizmet", label: "Tamir & Servis", icon: "🔧", q: "tamir servis", googlePlaceType: "car_repair", storeType: "hizmet_tamir" },
    { key: "mekan_dukkan", label: "Hizmetler", icon: "🧰", q: "hizmet işletme", googlePlaceType: "store", storeType: "mekan_dukkan" },
    { key: "kamu", label: "Kamu ve Kamusal alan", icon: "🏛️", q: "hastane eczane devlet kurumu ibadethane park", googlePlaceType: "local_government_office", storeType: "kamu_devlet" },
    { key: "__nearby__", label: "Yakınımdakiler", icon: "📍" },
  ];

  const openBusinessResultsPanel = useCallback(() => {
    setLeftSidebarTab("isletmeler");
    setSelectedBiz(null);
    setBusinessPanelMode("results");
    setLocationPanelTab("businesses");
    if (isMobile) {
      setMenuOpen(true);
    } else {
      setDesktopGeoPanelOpen(true);
    }
  }, [isMobile]);

  const applyBusinessCategory = useCallback((row: (typeof SERVICE_MAP_CHIPS)[number]) => {
    const syncMapSuperCategoryUrl = (superKey: string | null) => {
      if (typeof window === "undefined" || !isHaritalarWakePath(currentPath)) return;
      const params = new URLSearchParams(window.location.search);
      const map = leafletMapRef.current;
      if (map) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        if (Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
          params.set("lat", center.lat.toFixed(6));
          params.set("lng", center.lng.toFixed(6));
          params.set("zoom", String(Math.max(1, Math.min(20, Math.round(zoom)))));
          urlLocationCenterRef.current = { lat: center.lat, lng: center.lng };
          hasUserNavigatedRef.current = true;
        }
      }
      if (superKey) {
        params.set("superCategory", superKey);
        params.delete("super");
      } else {
        params.delete("superCategory");
        params.delete("super");
      }
      const base = safeMapUrlSyncBasePath(window.location.pathname);
      const next = params.toString() ? `${base}?${params.toString()}` : base;
      window.history.replaceState(window.history.state, "", next);
    };

    if (row.key === "__nearby__") {
      setSelectedCategory(null);
      setMapSuperCategory(null);
      setSearch("");
      setSmartKeyword("");
      setMapsContentKind("businesses");
      setNearby50Km(true);
      if (!userLocation) goToMyLocation();
      openBusinessResultsPanel();
      syncMapSuperCategoryUrl(null);
      return;
    }

    const keyword = row.q || "";
    setNearby50Km(false);
    setMapsContentKind("businesses");
    setSelectedCategory(null);
    setSearch(keyword);
    setSmartKeyword(keyword);
    setMapSuperCategory(row.key);
    openBusinessResultsPanel();
    syncMapSuperCategoryUrl(row.key);
  }, [openBusinessResultsPanel, userLocation, currentPath]);

  const applyMapsContentKind = useCallback((next: "businesses" | "news" | "video") => {
    setMapsContentKind(next);
    closeNewsPreview();
    closeNewsOverlay();
    if (next === "businesses") {
      openBusinessResultsPanel();
      return;
    }
    const cityLabel = resolveMapsLocationCityLabel();
    if (cityLabel) selectNewsmapCity(cityLabel.split(",")[0]?.trim() || cityLabel);
    setLeftSidebarTab("newsmap");
    setDesktopGeoPanelOpen(true);
    if (isMobile) setMenuOpen(true);
  }, [closeNewsOverlay, closeNewsPreview, isMobile, openBusinessResultsPanel, resolveMapsLocationCityLabel, selectNewsmapCity]);

  const openDirectionsPanelForBiz = useCallback((biz: Business) => {
    if (!biz.latitude || !biz.longitude) {
      showToast("Bu işletmenin konumu yok");
      return;
    }
    setNavTargetInput([biz.name, biz.address].filter(Boolean).join(" · "));
    setNavTargetPoint({ label: biz.name, lat: biz.latitude, lng: biz.longitude });
    setNavPickerBiz(biz);
    setNavLocError(null);
    setNavPermBlocked(false);
    setNavManualMode(false);
  }, [showToast]);

  const startNavigationToLocation = (loc: SearchedLocationInfo) => {
    const pseudoBiz = {
      id: loc.id,
      name: loc.title,
      address: loc.address,
      latitude: loc.lat,
      longitude: loc.lng,
      photoUrl: loc.imageUrl,
    } as unknown as Business;
    setNavTargetInput(loc.address || loc.title);
    setNavTargetPoint({ label: loc.title, lat: loc.lat, lng: loc.lng });
    setNavPickerBiz(null);
    setNavLocError(null);
    setNavPermBlocked(false);
    setNavManualMode(false);
    void startNavigation(pseudoBiz);
  };

  const searchedLocationUrl = (loc: SearchedLocationInfo) => {
    const params = new URLSearchParams({
      lat: loc.lat.toFixed(6),
      lng: loc.lng.toFixed(6),
      zoom: "17",
      location: loc.title,
    });
    if (loc.placeId) params.set("place_id", loc.placeId);
    return `${window.location.origin}${safeMapUrlSyncBasePath(window.location.pathname)}?${params.toString()}`;
  };

  const SearchedLocationCard = () => {
    if (!searchedLocationInfo) return null;
    const loc = searchedLocationInfo;
    const url = searchedLocationUrl(loc);
    const gallery = (loc.imageUrls?.length ? loc.imageUrls : loc.imageUrl ? [loc.imageUrl] : []).filter(Boolean);
    const activePhoto = gallery[locationCardPhotoIdx] || gallery[0] || null;
    const isSavedLoc = savedMapPlaces.some((p) => Math.abs(p.lat - loc.lat) < 1e-5 && Math.abs(p.lng - loc.lng) < 1e-5);
    const actionBtnClass = "flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-white px-1 py-2 text-[10px] font-extrabold text-slate-700 shadow-sm transition hover:bg-emerald-50";
    const formatHotelPrice = (value: number | null | undefined, currency?: string | null) => {
      if (value == null || !Number.isFinite(Number(value))) return null;
      const cur = String(currency || "TRY").toUpperCase();
      try {
        return new Intl.NumberFormat("tr-TR", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(value));
      } catch {
        return `${Math.round(Number(value))} ${cur}`;
      }
    };
    return (
      <div className="haritalar-location-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="px-4 py-3" style={{ background: MAP_PANEL_TINT }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-slate-950">{loc.title}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                  {loc.areaInfo || loc.address || "Seçili konum"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 shadow-sm">
                  {searchedLocationWeather?.label || (searchedLocationEnrichmentLoading ? "Hava durumu yükleniyor..." : "Hava durumu alınamadı")}
                  {searchedLocationWeather?.status && (
                    <span className="ml-1 font-bold text-emerald-600">· {searchedLocationWeather.status}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { void saveCurrentMapTarget(); }}
                  aria-label={isSavedLoc ? "Kaydedildi" : "Kaydet"}
                  title={isSavedLoc ? "Kaydedildi" : "Kaydet"}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm shadow-sm transition ${isSavedLoc ? "bg-emerald-600 text-white" : "bg-white/90 text-emerald-700 hover:bg-emerald-50"}`}
                >
                  {isSavedLoc ? "✓" : "🔖"}
                </button>
              </div>
            </div>
          </div>
          {activePhoto ? (
            <div className="haritalar-location-card__media relative h-36 w-full overflow-hidden bg-slate-100">
              <img src={activePhoto} alt={loc.title} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Önceki fotoğraf"
                    onClick={() => setLocationCardPhotoIdx((idx) => (idx - 1 + gallery.length) % gallery.length)}
                    className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-sm text-white"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Sonraki fotoğraf"
                    onClick={() => setLocationCardPhotoIdx((idx) => (idx + 1) % gallery.length)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-sm text-white"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                    {gallery.map((_, idx) => (
                      <button
                        key={`loc-photo-dot-${idx}`}
                        type="button"
                        aria-label={`Fotoğraf ${idx + 1}`}
                        onClick={() => setLocationCardPhotoIdx(idx)}
                        className={`h-1.5 rounded-full transition ${idx === locationCardPhotoIdx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : searchedLocationEnrichmentLoading ? (
            <div className="haritalar-location-card__media flex h-36 items-center justify-center bg-slate-50 px-6 text-center">
              <div>
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <p className="text-xs font-bold text-slate-500">Konum görselleri yükleniyor...</p>
              </div>
            </div>
          ) : (
            <div className="haritalar-location-card__media flex h-36 items-center justify-center bg-[radial-gradient(circle_at_30%_30%,#bbf7d0_0,#ecfdf5_36%,#e0f2fe_100%)] px-6 text-center">
              <div>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-xl shadow-sm">📍</div>
                <p className="text-xs font-bold text-slate-600">Bu konum için fotoğraf bulunamadı.</p>
              </div>
            </div>
          )}
          {loc.wikiSummary && (
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800">Wikipedia</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-4">{loc.wikiSummary}</p>
              {loc.wikiUrl ? (
                <a
                  href={loc.wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                >
                  Wikipedia'da oku →
                </a>
              ) : null}
            </div>
          )}
          {(() => {
            const cityName = cityNameFromLocation(loc);
            const konumaGoreHref = buildKonumaGoreHref({
              city: cityName || undefined,
              location: loc.title,
              lat: loc.lat,
              lng: loc.lng,
              module: "food",
            });
            const sariSayfalarHref = cityName ? buildSariSayfalarListPath({ city: cityName }) : null;
            const bilgiAgaciHref = cityName ? resolveBilgiAgaciHref(cityName) : null;
            const sondakikaHref = cityName && newsMapEnabled ? resolveSondakikaCityHref(cityName) : null;
            return (
              <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={konumaGoreHref}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 hover:text-orange-900"
                  >
                    Sipariş ver →
                  </Link>
                  {sariSayfalarHref ? (
                    <Link
                      href={sariSayfalarHref}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      Şehir Rehber →
                    </Link>
                  ) : null}
                  {bilgiAgaciHref ? (
                    <Link
                      href={bilgiAgaciHref}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900"
                    >
                      Şehir Bilgi →
                    </Link>
                  ) : null}
                  {sondakikaHref && !isNewsmapPage ? (
                    <Link
                      href={sondakikaHref}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-900"
                    >
                      Şehir Haberleri →
                    </Link>
                  ) : null}
                  {cityName && newsMapEnabled && isNewsmapPage ? (
                    <button
                      type="button"
                      onClick={() => openNewsmapCityNews(cityName, { lat: loc.lat, lng: loc.lng })}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-900"
                    >
                      Şehir Haberleri →
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })()}
          <div className="border-t border-slate-100 px-3 py-3">
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={() => startNavigationToLocation(loc)} className={actionBtnClass}>
                <span className="text-base">🧭</span>
                <span>Konuma git</span>
              </button>
              <button type="button" onClick={() => { void openNearbyBusinessCategories(); }} className={actionBtnClass}>
                <span className="text-base">📍</span>
                <span>Yakınında</span>
              </button>
              <a href={`sms:?body=${encodeURIComponent(`${loc.title} - ${url}`)}`} className={actionBtnClass}>
                <span className="text-base">📱</span>
                <span>Telefona</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator.share === "function") {
                    void navigator.share({ title: loc.title, url });
                  } else {
                    copyText(url, "location-link");
                  }
                }}
                className={actionBtnClass}
              >
                <span className="text-base">🔗</span>
                <span>Paylaş</span>
              </button>
            </div>
          </div>
        </div>
        {(searchedLocationHotelsLoading || searchedLocationHotels.length > 0) && (
          <div className="mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Oteller</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  {searchedLocationHotelsLoading && searchedLocationHotels.length === 0
                    ? "Yerel oteller yükleniyor..."
                    : searchedLocationHotels.length > 0
                      ? `${searchedLocationHotels.length} konaklama seçeneği`
                      : "Konaklama bulunamadı"}
                </p>
              </div>
              {searchedLocationHotelsLoading && searchedLocationHotels.length === 0 && (
                <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              )}
            </div>
            {searchedLocationHotels.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchedLocationHotels.slice(0, 6).map((hotel) => {
                  const price = formatHotelPrice(hotel.priceFrom ?? null, hotel.currency);
                  const href = hotel.affiliateUrl || searchedLocationHotelAffiliateUrl || undefined;
                  return (
                    <a
                      key={`loc-hotel-${hotel.id}`}
                      href={href}
                      target={href ? "_blank" : undefined}
                      rel={href ? "noopener noreferrer" : undefined}
                      className={`flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-2.5 transition ${href ? "hover:border-emerald-200 hover:bg-emerald-50/40" : "cursor-default"}`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-lg shadow-sm">
                        {hotel.photoUrl ? (
                          <img src={hotel.photoUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          "🏨"
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-slate-900">{hotel.name}</span>
                        <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                          {hotel.stars ? `${"★".repeat(Math.min(5, Math.round(hotel.stars)))} · ` : ""}
                          {hotel.rating ? `${hotel.rating.toFixed(1)} puan` : ""}
                          {hotel.reviewCount ? ` · ${hotel.reviewCount} yorum` : ""}
                          {!hotel.rating && !hotel.reviewCount && hotel.address ? hotel.address : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {price ? (
                          <span className="block text-sm font-black text-emerald-700">{price}</span>
                        ) : (
                          <span className="block text-[10px] font-bold leading-tight text-emerald-700">Müsaitlik &amp; fiyatları gör</span>
                        )}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Yakında keşfet</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            İşletme kategorilerini açıp restoran, alışveriş, otel veya tüm işletmeler arasından seçim yapın.
          </p>
          <button
            type="button"
            onClick={() => { void openNearbyBusinessCategories(); }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110"
            style={{ background: MAP_CHROME_GRAD }}
          >
            <span>🏪</span>
            Yakındaki işletmeler
          </button>
          {(locationRegisteredCountLoading || locationRegisteredCount !== null) && (
            <p className="haritalar-location-card__count mt-2 text-center text-[11px] font-semibold text-slate-500">
              {locationRegisteredCountLoading
                ? "Kayıtlı işletme sayısı yükleniyor..."
                : `${(locationRegisteredCount ?? 0).toLocaleString("tr-TR")} kayıtlı işletme`}
            </p>
          )}
        </div>
      </div>
    );
  };

  const CategoryChips = ({ dark = false, showHybridPrefix = true }: { dark?: boolean; showHybridPrefix?: boolean }) => {
    const hybridPrefix = mapsHybridEnabled && showHybridPrefix ? (
      <>
        <Chip
          dark={dark}
          active={mapsContentKind === "businesses" && !nearby50Km && !search && !selectedCategory && !mapSuperCategory}
          onClick={() => applyMapsContentKind("businesses")}
          icon="🏢"
          label="İşletmeler"
        />
        <Chip
          dark={dark}
          active={mapsContentKind === "news"}
          onClick={() => applyMapsContentKind("news")}
          icon="📰"
          label="Haberler"
        />
        <Chip
          dark={dark}
          active={mapsContentKind === "video"}
          onClick={() => applyMapsContentKind("video")}
          icon="▶️"
          label="Videolar"
        />
        <span className="mx-0.5 w-px shrink-0 self-stretch bg-emerald-200/80" aria-hidden />
      </>
    ) : null;

    if (isMobile) {
      return (
        <div
          className="flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {hybridPrefix}
          {SERVICE_MAP_CHIPS.map((row) => (
            <Chip
              dark={dark}
              key={row.key ?? "all"}
              active={
                row.key === "__nearby__"
                  ? nearby50Km
                    : row.q
                      ? search === row.q
                      : !nearby50Km && !search && !selectedCategory && mapSuperCategory === row.key
              }
              onClick={() => applyBusinessCategory(row)}
              icon={row.icon}
              label={row.label}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        className="flex w-max min-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {hybridPrefix}
        {SERVICE_MAP_CHIPS.map((row) => (
          <Chip
            dark={dark}
            key={row.key ?? "all"}
            active={
              row.key === "__nearby__"
                ? nearby50Km
                  : row.q
                    ? search === row.q
                    : !nearby50Km && !search && !selectedCategory && mapSuperCategory === row.key
            }
            onClick={() => applyBusinessCategory(row)}
            icon={row.icon}
            label={row.label}
          />
        ))}
      </div>
    );
  };

  const NewsmapLocationSearchBar = () => (
    <div className="haber-haritasi-newsmap-toolbar haber-haritasi-newsmap-toolbar--search-only">
      <NewsmapLocationSearch
        mapsSettings={mapsGeoEffective}
        ilCenters={ilCenters}
        onLocationSelect={handleNewsmapLocationSelect}
      />
    </div>
  );

  const formatProductPrice = (value: MapBusinessProduct["price"]) => {
    if (value == null || value === "") return "";
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    if (!Number.isFinite(n)) return "";
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  };

  const startNearbyBusinessDiscovery = () => {
    const target = searchedLocationInfo
      ? { label: searchedLocationInfo.title, lat: searchedLocationInfo.lat, lng: searchedLocationInfo.lng }
      : selectedLocation
        ? { label: selectedLocation.nameTr || selectedLocation.name, lat: selectedLocation.latitude, lng: selectedLocation.longitude }
        : { label: viewportPlaceInfo.label, lat: viewportPlaceInfo.lat, lng: viewportPlaceInfo.lng };
    setSelectedCategory(null);
    setMapSuperCategory(null);
    setSearch("");
    setSmartKeyword("");
    openBusinessResultsPanel();
    void importBusinessesForCurrentLocation({
      silent: true,
      target,
      keyword: "işletmeler",
      radius: MAP_EXPANDED_NEARBY_RADIUS_M,
    });
    expandedRadiusAttemptRef.current = "";
    void loadBusinesses();
  };

  const NearbyRegisteredBusinessesSection = () => {
    if (!nearbyRegisteredLoading && !nearbyRegisteredLoaded) return null;
    const userOrigin = resolveUserDistanceOrigin();
    const rows = visibleBusinesses
      .filter((biz) => Number.isFinite(Number(biz.latitude)) && Number.isFinite(Number(biz.longitude)))
      .slice(0, 8);
    const distanceFromUser = (biz: Business) => {
      const blat = Number(biz.latitude);
      const blng = Number(biz.longitude);
      if (userOrigin && Number.isFinite(blat) && Number.isFinite(blng)) {
        return distanceKm(userOrigin.lat, userOrigin.lng, blat, blng);
      }
      return null;
    };
    return (
      <div className="mb-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">Yakındaki kayıtlı işletmeler</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
              {rows.length > 0 ? `${rows.length} işletme bulundu` : null}
            </p>
          </div>
          {nearbyRegisteredLoading && <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />}
        </div>
        {rows.length > 0 && (
          <div className="mt-3 space-y-3">
            {rows.map((biz) => {
              const productRows = nearbyProductsByBusiness[biz.id] || [];
              return (
                <div key={`nearby-registered-${biz.id}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5">
                  <button type="button" onClick={() => selectBiz(biz)} className="flex w-full items-center gap-2 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-base shadow-sm">
                      {publicBusinessPhotoSrc(biz) ? (
                        <img src={publicBusinessPhotoSrc(biz)} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        catIcon(biz)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-slate-900">{biz.name}</span>
                      <span className="block truncate text-[11px] font-semibold text-slate-500">
                        {catName(biz)}{(() => {
                          const distKm = distanceFromUser(biz);
                          return distKm != null ? ` · ${formatUserBusinessDistanceKm(distKm)}` : "";
                        })()}
                      </span>
                    </span>
                  </button>
                  {productRows.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                      {productRows.map((product) => {
                        const price = formatProductPrice(product.discountedPrice ?? product.price);
                        return (
                          <div key={`nearby-product-${biz.id}-${product.id}`} className="w-32 shrink-0 overflow-hidden rounded-xl border border-white bg-white shadow-sm">
                            <div className="flex h-20 items-center justify-center bg-emerald-50 text-lg">
                              {product.imageUrl ? (
                                <img src={resolveClientMediaSrc(product.imageUrl) || product.imageUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                "🛍️"
                              )}
                            </div>
                            <div className="p-2">
                              <p className="line-clamp-2 text-[11px] font-extrabold leading-tight text-slate-800">{product.name}</p>
                              {price && <p className="mt-1 text-[11px] font-black text-emerald-700">{price}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const MapHomePanel = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {NearbyRegisteredBusinessesSection()}
      <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <p className="text-base font-black text-slate-900">Yekpare Haritalar</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Sipariş, alışveriş, turizm ve hizmet işletmelerini tek arama kutusundan keşfedin.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {SERVICE_MAP_CHIPS.filter((chip) => chip.key && chip.key !== "__nearby__").slice(0, 8).map((chip) => (
            <button
              key={`home-${chip.label}`}
              type="button"
              onClick={() => {
                applyBusinessCategory(chip);
              }}
              className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5 text-left text-xs font-extrabold text-sky-900 transition hover:bg-sky-100"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base shadow-sm">{chip.icon}</span>
              <span className="min-w-0">
                <span className="block truncate">{chip.label}</span>
                <span className="block text-[10px] font-bold text-sky-600">Harita bölgesinde ara</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyBusinessCategory({ key: null, label: "Tüm işletmeler", icon: "🏢" })}
            className="mt-1 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/90 px-3 py-3 text-left text-xs font-extrabold text-indigo-900 transition hover:bg-indigo-100"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base shadow-sm">🏢</span>
            <span className="min-w-0">
              <span className="block truncate">Tüm işletmeler</span>
              <span className="block text-[10px] font-bold text-indigo-600">Geçerli bölgede tüm sonuçları göster</span>
            </span>
          </button>
        </div>
      </div>
      <div className="mt-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-sky-800">Hızlı araçlar</p>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => activateGeoTab("nav")}
            className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left text-xs font-bold text-slate-700 shadow-sm"
          >
            <span>Rota oluştur</span>
            <span className="text-sky-700">→</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLeftSidebarTab("kayitlar");
              setDesktopGeoPanelOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left text-xs font-bold text-slate-700 shadow-sm"
          >
            <span>Kaydedilen yerlere bak</span>
            <span className="text-sky-700">→</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMapLayersOpen(true);
              if (isMobile) setMenuOpen(false);
              else setDesktopGeoPanelOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left text-xs font-bold text-slate-700 shadow-sm"
          >
            <span>Katmanları düzenle</span>
            <span className="text-sky-700">→</span>
          </button>
        </div>
      </div>
    </div>
  );

  /* Business list item — shared between desktop & mobile sheet */
  const BizCard = ({ biz, compact = false }: { biz: Business; compact?: boolean }) => {
    const st = biz.workingHours ? getOpenStatus(biz.workingHours) : null;
    const placesChips = placesCardChips(biz);
    const placesSummary = placesCardSummary(biz);
    const safeDescription = publicBusinessDescription(biz.description);
    const isSel = selectedBiz?.id === biz.id;
    const isPrem = biz.isPremium;
    const avatarSize = isPrem && !compact ? 76 : compact ? 44 : 60;
    const photoSrc = publicBusinessPhotoSrc(biz);

    const cardStyle = isSel
      ? {
          background: MAP_CHROME_GRAD,
          boxShadow: "0 12px 40px rgba(15,118,110,0.35), 0 4px 16px rgba(3,157,85,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
          border: "1px solid rgba(167,243,208,0.45)",
        }
      : isPrem
        ? {
            background: "linear-gradient(135deg, #fffcf0 0%, #fef5d0 45%, #fefbe9 80%, #fff8ed 100%)",
            border: "1.5px solid rgba(251,191,36,0.50)",
            borderLeft: "4px solid #f59e0b",
            boxShadow: "0 6px 28px rgba(245,158,11,0.25), 0 2px 8px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.75)",
          }
        : {
            background: "linear-gradient(135deg, #ffffff 0%, #f4fbf7 55%, #ecfdf5 100%)",
            boxShadow: "0 4px 16px rgba(15,118,110,0.08), 0 1px 4px rgba(3,157,85,0.06)",
            border: "1px solid rgba(16,185,129,0.14)",
          };

    return (
      <div onClick={() => selectBiz(biz)}
        className={`group flex items-center gap-3 mx-2.5 my-1 px-3.5 ${compact ? "py-2" : "py-3"} rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.008] hover:-translate-y-px biz-card-enter ${isPrem && !isSel ? "biz-card-premium biz-card-shimmer" : ""}`}
        style={cardStyle}>

        {/* Avatar */}
        <div className="relative flex-shrink-0 rounded-2xl overflow-hidden"
          style={{
            width: avatarSize, height: avatarSize,
            ...(isSel
              ? { boxShadow: "0 0 0 2.5px rgba(255,255,255,0.35), 0 6px 16px rgba(0,0,0,0.30)" }
              : isPrem
                ? { boxShadow: "0 0 0 2px #f59e0b, 0 0 0 4px rgba(245,158,11,0.18), 0 4px 14px rgba(245,158,11,0.28)" }
                : { boxShadow: "0 2px 8px rgba(99,102,241,0.12)" }),
          }}>
          {photoSrc
            ? <img src={photoSrc} alt={biz.name} className="w-full h-full object-cover"
                onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
            : <div className="absolute inset-0 flex items-center justify-center"
                style={{
                  fontSize: isPrem ? "2rem" : "1.6rem",
                  ...(isSel
                    ? { background: "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))" }
                    : isPrem
                      ? { background: "linear-gradient(135deg, #fde68a 0%, #fcd34d 40%, #fbbf24 80%, #f59e0b 100%)" }
                      : { background: "linear-gradient(135deg, #eef2ff 0%, #ddd6fe 60%, #e0e7ff 100%)" })
                }}>{catIcon(biz)}</div>}
          {/* Premium star badge */}
          {isPrem && !isSel && (
            <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full premium-badge"
              style={{
                background: "linear-gradient(135deg, #fde68a, #fbbf24 45%, #d97706)",
                boxShadow: "0 2px 10px rgba(245,158,11,0.80), 0 0 0 2px rgba(255,255,255,0.95)",
                fontSize: "10px",
                width: "22px",
                height: "22px",
              }}>⭐</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="font-bold text-[13.5px] leading-snug truncate"
              style={isSel ? { color: "#fff" } : isPrem ? {} : { color: "#0f172a" }}>
              {isPrem && !isSel
                ? <span className="gold-shimmer-text">{biz.name}</span>
                : biz.name}
            </p>
            {biz.distance != null && Number.isFinite(biz.distance) && (
              <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full ml-1"
                style={isSel
                  ? { background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.92)" }
                  : biz.distance < 0.5
                    ? { background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", color: "#15803d" }
                    : { background: "#f1f5f9", color: "#64748b" }}>
                {formatUserBusinessDistanceKm(biz.distance)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {biz.rating && (
              <>
                <span className={`text-[11px] font-black ${isSel ? "text-amber-300" : "text-amber-500"}`}>{biz.rating.toFixed(1)}</span>
                <StarRating rating={biz.rating} />
                {biz.userRatingsTotal && <span className={`text-[10px] ${isSel ? "text-white/50" : "text-gray-400"}`}>({biz.userRatingsTotal})</span>}
                <span className={isSel ? "text-white/20" : "text-gray-200"}>·</span>
              </>
            )}
            <span className={`text-[11px] ${isSel ? "text-white/70" : isPrem ? "text-amber-700" : "text-gray-500"}`}>{catName(biz)}</span>
          </div>
          {placesChips.length > 0 && !compact && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {placesChips.map((chip) => (
                <span key={`${biz.id}-${chip}`} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={isSel
                    ? { background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.92)" }
                    : { background: "rgba(99,102,241,0.08)", color: "#4f46e5" }}>
                  {chip}
                </span>
              ))}
            </div>
          )}

          {st && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-full"
              style={isSel
                ? st.isOpen
                  ? { background: "rgba(52,211,153,0.22)", color: "#6ee7b7" }
                  : { background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }
                : st.isOpen
                  ? { background: "#f0fdf4", color: "#15803d", boxShadow: "inset 0 0 0 1px rgba(187,247,208,0.8)" }
                  : { background: "#f8fafc", color: "#94a3b8" }
              }>
              <span className={`w-1.5 h-1.5 rounded-full ${st.isOpen && !isSel ? "open-dot" : ""}`}
                style={{ background: isSel ? (st.isOpen ? "#6ee7b7" : "rgba(255,255,255,0.3)") : st.isOpen ? "#22c55e" : "#cbd5e1" }} />
              {st.text}
            </span>
          )}
          {safeDescription && !compact && !st && (
            <p className="text-[10px] mt-0.5 line-clamp-1 leading-tight"
              style={{ color: isSel ? "rgba(255,255,255,0.48)" : isPrem ? "#b45309" : "#9ca3af" }}>
              {safeDescription}
            </p>
          )}
          {!compact && placesSummary && (
            <p className="text-[10px] mt-0.5 line-clamp-1 leading-tight"
              style={{ color: isSel ? "rgba(255,255,255,0.56)" : isPrem ? "#92400e" : "#6b7280" }}>
              {placesSummary}
            </p>
          )}
        </div>

        {/* Arrow */}
        <svg className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-1"
          style={{ color: isSel ? "rgba(255,255,255,0.55)" : isPrem ? "rgba(245,158,11,0.7)" : "rgba(99,102,241,0.35)" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    );
  };

  /* Business detail body — shared */
  /* ─── Navigation helpers ─── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LR = () => (window as any).L?.Routing;

  function loadRoutingMachine(): Promise<void> {
    return new Promise((resolve) => {
      if (LR()) { resolve(); return; }
      if (document.getElementById("lrm-css")) {
        const check = setInterval(() => { if (LR()) { clearInterval(check); resolve(); } }, 100);
        return;
      }
      const css = document.createElement("link");
      css.id = "lrm-css"; css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js";
      js.onload = () => { setRoutingLoaded(true); resolve(); };
      document.head.appendChild(js);
    });
  }

  /* ── Turkish instruction translator (OSRM returns English) ── */
  function trInstruction(text: string): string {
    let t = text;

    // ── Direction name map (used in compound patterns below) ──────────────────
    const dirNameTR: Record<string, string> = {
      northeast: "kuzeydoğu", northwest: "kuzeybatı",
      southeast: "güneydoğu", southwest: "güneybatı",
      north: "kuzey", south: "güney", east: "doğu", west: "batı",
    };
    const dirPat = "(northeast|northwest|southeast|southwest|north|south|east|west)";
    const onPat  = "(?:on(?:to)?)";   // matches "on" and "onto"

    // ── COMPOUND PATTERNS — must run BEFORE any word-by-word replacements ──────
    // These produce fully natural Turkish sentences.

    // 1) "Head [dir] on/onto [street]" → "[street] üzerinde [dir] yönünde ilerleyin"
    t = t.replace(
      new RegExp(`\\bhead\\s+(?:to(?:\\s+the)?\\s+)?${dirPat}\\s+${onPat}\\s+(.+)`, "gi"),
      (_m, dir: string, street: string) =>
        `${street.trim()} üzerinde ${dirNameTR[dir.toLowerCase()] ?? dir} yönünde ilerleyin`
    );

    // 2) "Head [dir]" without street
    t = t.replace(
      new RegExp(`\\bhead\\s+(?:to(?:\\s+the)?\\s+)?${dirPat}\\b`, "gi"),
      (_m, dir: string) => `${dirNameTR[dir.toLowerCase()] ?? dir} yönünde ilerleyin`
    );

    // 3a) "Make a sharp/slight left/right on/onto [street]"
    t = t.replace(
      /\bmake\s+a\s+(sharp|slight)\s+(left|right)\s+(?:on(?:to)?\s+)?(.+)/gi,
      (_m, mod: string, side: string, street: string) => {
        const modTR = mod.toLowerCase() === "sharp" ? "keskin " : "hafifçe ";
        const sideTR = side.toLowerCase() === "left" ? "sola" : "sağa";
        return street.trim() ? `${street.trim()} için ${modTR}${sideTR} dönün` : `${modTR}${sideTR} dönün`;
      }
    );

    // 3b) "Make a left/right on/onto [street]"
    t = t.replace(
      /\bmake\s+a\s+(left|right)\s+(?:on(?:to)?\s+)?(.+)/gi,
      (_m, side: string, street: string) => {
        const sideTR = side.toLowerCase() === "left" ? "sola" : "sağa";
        return street.trim() ? `${street.trim()} için ${sideTR} dönün` : `${sideTR} dönün`;
      }
    );

    // 3c) "Make a left/right" (no street)
    t = t.replace(/\bmake\s+a\s+(sharp\s+)?(slight\s+)?(left|right)\b/gi,
      (_m, sharp: string, slight: string, side: string) => {
        const mod = sharp ? "keskin " : slight ? "hafifçe " : "";
        return `${mod}${side.toLowerCase() === "left" ? "sola" : "sağa"} dönün`;
      }
    );

    // 3d) "Turn sharp/slight left/right on/onto [street]"
    t = t.replace(
      /\bturn\s+(sharp|slight)\s+(left|right)\s+(?:on(?:to)?)\s+(.+)/gi,
      (_m, mod: string, side: string, street: string) => {
        const modTR = mod.toLowerCase() === "sharp" ? "keskin " : "hafifçe ";
        const sideTR = side.toLowerCase() === "left" ? "sola" : "sağa";
        return `${street.trim()} için ${modTR}${sideTR} dönün`;
      }
    );

    // 4) "Turn left/right on/onto [street]"
    t = t.replace(
      /\bturn\s+(left|right)\s+(?:on(?:to)?)\s+(.+)/gi,
      (_m, side: string, street: string) => {
        const sideTR = side.toLowerCase() === "left" ? "sola" : "sağa";
        return `${street.trim()} için ${sideTR} dönün`;
      }
    );

    // 5) "Keep left/right on/onto [street]"
    t = t.replace(
      /\bkeep\s+(left|right)\s+(?:on(?:to)?)\s+(.+)/gi,
      (_m, side: string, street: string) => {
        const sideTR = side.toLowerCase() === "left" ? "solda" : "sağda";
        return `${street.trim()} üzerinde ${sideTR} kalın`;
      }
    );

    // 6) "Continue straight on/onto [street]"
    t = t.replace(
      /\bcontinue\s+straight\s+(?:on(?:to)?)\s+(.+)/gi,
      (_m, street: string) => `${street.trim()} üzerinde düz devam edin`
    );

    // 7) "Continue on/onto [street]"
    t = t.replace(
      /\bcontinue\s+(?:on(?:to)?)\s+(.+)/gi,
      (_m, street: string) => `${street.trim()} üzerinde devam edin`
    );

    // 8) "Merge onto [street]"
    t = t.replace(
      /\bmerge\s+(?:on(?:to)?)\s+(.+)/gi,
      (_m, street: string) => `${street.trim()} yoluna girin`
    );

    // 9) Traffic circle / roundabout compound patterns (OSRM uses "traffic circle")
    // "Enter the traffic circle and take the Nth exit onto [street]"
    t = t.replace(
      /enter\s+(?:the\s+)?traffic\s+circle\s+and\s+take\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s+exit\s+(?:on(?:to)?)\s+(.+)/gi,
      (_m, n: string, street: string) => `${street.trim()} için dönel kavşağa girin, ${n}. çıkıştan çıkın`
    );
    // "Enter the traffic circle and take the Nth exit" (no street)
    t = t.replace(
      /enter\s+(?:the\s+)?traffic\s+circle\s+and\s+take\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s+exit/gi,
      (_m, n: string) => `Dönel kavşağa girin, ${n}. çıkıştan çıkın`
    );
    // "Exit the traffic circle onto [street]"
    t = t.replace(
      /exit\s+(?:the\s+)?traffic\s+circle\s+(?:on(?:to)?)\s+(.+)/gi,
      (_m, street: string) => `${street.trim()} için dönel kavşaktan çıkın`
    );
    // "Exit the traffic circle" (no street)
    t = t.replace(/exit\s+(?:the\s+)?traffic\s+circle\b/gi, "dönel kavşaktan çıkın");
    // "Enter the traffic circle" (no exit info)
    t = t.replace(/enter\s+(?:the\s+)?traffic\s+circle\b/gi, "dönel kavşağa girin");

    // 10) "take the ramp towards/toward [place]"
    t = t.replace(
      /take\s+(?:the\s+)?ramp\s+towards?\s+(.+)/gi,
      (_m, place: string) => `${place.trim()} yönünde rampaya girin`
    );

    // ── OSRM departure / arrival / fork / end-of-road (must run BEFORE word replacements) ──
    t = t.replace(/\bdepart\b/gi, "harekete geçin");
    t = t.replace(/\bwaypoint\s+reached\b/gi, "ara noktaya ulaşıldı");
    t = t.replace(/\bstart\s+at\b/gi, "başlangıç noktası:");
    // "End of road, turn left/right onto [street]"
    t = t.replace(
      /end\s+of\s+road,?\s+turn\s+(left|right)\s+(?:on(?:to)?\s+)?(.+)/gi,
      (_m, side: string, street: string) => {
        const sideTR = side.toLowerCase() === "left" ? "sola" : "sağa";
        return `Yol sonu, ${street.trim() ? street.trim() + " için " : ""}${sideTR} dönün`;
      }
    );
    t = t.replace(/\bend\s+of\s+road\b/gi, "yol sonu");
    // "Fork, keep left/right onto [street]"
    t = t.replace(
      /\bfork,?\s+keep\s+(left|right)\s+(?:on(?:to)?\s+)?(.+)/gi,
      (_m, side: string, street: string) => {
        const sideTR = side.toLowerCase() === "left" ? "sol" : "sağ";
        return `Yol ayrımında ${sideTR} yolu takip edin${street.trim() ? " (" + street.trim() + ")" : ""}`;
      }
    );
    t = t.replace(/\bfork\b/gi, "yol ayrımı");
    // U-turn MUST be before the standalone \bturn\b replacement to avoid "U-dönün"
    t = t.replace(/make\s+a?\s*u[- ]?turn/gi, "U dönüşü yapın");

    // ── STANDALONE DIRECTION WORDS (after compound patterns) ──────────────────
    t = t.replace(/\bnortheast\b/gi, "kuzeydoğu").replace(/\bnorthwest\b/gi, "kuzeybatı")
         .replace(/\bsoutheast\b/gi, "güneydoğu").replace(/\bsouthwest\b/gi, "güneybatı")
         .replace(/\bnorth\b/gi, "kuzey").replace(/\bsouth\b/gi, "güney")
         .replace(/\beast\b/gi, "doğu").replace(/\bwest\b/gi, "batı");

    // Roundabout
    t = t.replace(/roundabout,?\s*take\s+(?:the\s+)?exit\s+(\d+)/gi, (_m, n) => `dönel kavşakta ${n}. çıkışa gidin`);
    t = t.replace(/roundabout/gi, "dönel kavşak");

    // Turn types (simple, without street — compound patterns above handle with-street cases)
    t = t.replace(/turn\s+sharp\s+left/gi, "keskin sola dönün")
         .replace(/turn\s+sharp\s+right/gi, "keskin sağa dönün")
         .replace(/turn\s+slight\s+left/gi, "hafifçe sola dönün")
         .replace(/turn\s+slight\s+right/gi, "hafifçe sağa dönün")
         .replace(/turn\s+left/gi, "sola dönün")
         .replace(/turn\s+right/gi, "sağa dönün")
         .replace(/\bturn\b/gi, "dönün");

    // Keep / Stay (simple, without street — compound patterns above handle with-street)
    t = t.replace(/keep\s+left/gi, "solda kalın")
         .replace(/keep\s+right/gi, "sağda kalın")
         .replace(/\bkeep\b/gi, "devam edin");

    // Continue / Go / Straight (simple, without street)
    t = t.replace(/continue\s+straight/gi, "düz devam edin")
         .replace(/continue\b/gi, "devam edin")
         .replace(/go\s+straight/gi, "düz gidin")
         .replace(/\bhead\b/gi, "ilerleyin")
         .replace(/\bstraight\b/gi, "düz");

    // Merge / Ramp / Motorway (simple)
    t = t.replace(/\bmerge\b/gi, "birleşin")
         .replace(/take\s+the\s+ramp/gi, "rampaya girin")
         .replace(/take\s+the\s+exit/gi, "çıkışa gidin")
         .replace(/take\s+the\s+ferry/gi, "feribot alın")
         .replace(/\bferry\b/gi, "feribot");

    // Arrive / Destination
    t = t.replace(/you\s+have\s+arrived\s+at\s+(?:your\s+)?destination/gi, "Hedefe ulaştınız")
         .replace(/arrive\s+at\s+(?:your\s+)?destination/gi, "Hedefe ulaştınız")
         .replace(/destination\s+reached/gi, "Hedefe ulaşıldı")
         .replace(/\barrive\b/gi, "varın")
         .replace(/\bdestination\b/gi, "hedef");

    // Remaining prepositions / connectors
    t = t.replace(/\bon\s+the\s+right\b/gi, "sağ tarafta")
         .replace(/\bon\s+the\s+left\b/gi, "sol tarafta")
         .replace(/\bin\s+(\d+)\s+m\b/gi, (_m, n) => `${n} metre sonra`)
         .replace(/\bin\s+(\d+)\s+km\b/gi, (_m, n) => `${n} kilometre sonra`)
         .replace(/\bonto\b/gi, "")      // orphan "onto" not caught above → remove
         .replace(/\binto\b/gi, "içine");

    // Road types
    t = t.replace(/\bstreet\b/gi, "sokak")
         .replace(/\bavenue\b/gi, "cadde")
         .replace(/\bboulevard\b/gi, "bulvar")
         .replace(/\broad\b/gi, "yol")
         .replace(/\bhighway\b/gi, "anayol")
         .replace(/\bmotorway\b/gi, "otoyol")
         .replace(/\bbridge\b/gi, "köprü")
         .replace(/\btunnel\b/gi, "tünel")
         .replace(/\bjunction\b/gi, "kavşak")
         .replace(/\bintersection\b/gi, "kavşak")
         .replace(/\boverpass\b/gi, "üstgeçit");

    // Traffic circle / roundabout fallbacks (in case compound patterns didn't fully match)
    t = t.replace(/\btraffic\s+circle\b/gi, "dönel kavşak")
         .replace(/\btraffic\b/gi, "trafik");

    // Ordinal numbers in English → Turkish (1st, 2nd etc. in roundabout exit instructions)
    t = t.replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, "$1.");

    // Remove leftover English function words
    t = t.replace(/\bthe\b/gi, "").replace(/\bat\b/gi, "").replace(/\bfor\b/gi, "")
         .replace(/\bvia\b/gi, "üzerinden").replace(/\balong\b/gi, "boyunca")
         .replace(/\btowards?\b/gi, "yönünde").replace(/\bthrough\b/gi, "geçerek")
         .replace(/\band\b/gi, "ve").replace(/\bthen\b/gi, "ardından").replace(/\bafter\b/gi, "sonra")
         .replace(/\bexit\b/gi, "çıkış").replace(/\benter\b/gi, "giriş").replace(/\bcircle\b/gi, "kavşak");

    // Remove orphan English "on" connector left after Turkish verbs
    t = t.replace(/\b(ilerleyin|dönün|devam edin|gidin|girin|çıkın|kalın|yapın|varın|birleşin)\s+on\b\s*/gi, "$1 ");

    // Clean up extra whitespace
    t = t.replace(/\s{2,}/g, " ").trim();

    return t;
  }

  function speakInstruction(rawText: string) {
    if (!voiceEnabled || !window.speechSynthesis) return;
    const text = trInstruction(rawText);
    window.speechSynthesis.cancel();

    function doSpeak() {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "tr-TR";
      utt.rate = 0.75;   // 1.0 = normal; 0.75 = net navigasyon hızı (mobilde daha anlaşılır)
      utt.pitch = 1.0;
      utt.volume = 1.0;
      // Explicitly pick a Turkish voice — getVoices() may be empty until loaded
      const voices = window.speechSynthesis.getVoices();
      const trVoice = voices.find(v => v.lang === "tr-TR" && !v.name.includes("Google")) ||
                      voices.find(v => v.lang === "tr-TR") ||
                      voices.find(v => v.lang.startsWith("tr")) ||
                      voices.find(v => v.name.toLowerCase().includes("turkish"));
      if (trVoice) utt.voice = trVoice;
      window.speechSynthesis.speak(utt);
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Voices not loaded yet — wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        setTimeout(doSpeak, 80);
      };
    } else {
      setTimeout(doSpeak, 80);
    }
  }

  function fmtDist(m: number) {
    return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`;
  }
  function fmtDuration(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
  }

  async function startNavigation(biz: Business, locOverride?: { lat: number; lng: number }, transportOverride?: "car" | "walk" | "transit") {
    const transport = transportOverride ?? navTransport;
    // Rota başlangıcı DAİMA gerçek GPS konumundan alınır. `userLocation` arama/şehir
    // seçimiyle değişebildiğinden ona güvenmeyiz; yoksa getCurrentPosition ile alırız.
    const loc = locOverride ?? realUserLocationRef.current;
    if (!loc) {
      // Always try getCurrentPosition first — never pre-block based on permissions.query
      // (many browsers/devices report "denied" incorrectly before the first real attempt)
      if (!("geolocation" in navigator)) {
        setNavLocError("unsupported");
        setNavPermBlocked(true);
        return;
      }
      setGettingLoc(true);
      setNavPermBlocked(false);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          realUserLocationRef.current = newLoc;
          setUserLocation(newLoc);
          setGettingLoc(false);
          setNavLocError(null);
          setNavPermBlocked(false);
          if (leafletMapRef.current) leafletMapRef.current.setView([newLoc.lat, newLoc.lng], 15);
          await startNavigation(biz, newLoc, transport);
        },
        async (err) => {
          setGettingLoc(false);
          if (err.code === 1) {
            // Permission denied — go straight to manual address entry
            setNavLocError("denied");
            setNavPermBlocked(true);
            setNavManualMode(true);   // auto-open address form, skip dead-end error screen
          } else {
            setNavLocError("unsupported");
            setNavPermBlocked(false);
          }
        },
        { enableHighAccuracy: true, timeout: 12000 }
      );
      return;
    }
    setNavPickerBiz(null);
    await loadRoutingMachine();
    // Remove existing route
    if (navGoogleLayerRef.current && leafletMapRef.current) {
      leafletMapRef.current.removeLayer(navGoogleLayerRef.current);
      navGoogleLayerRef.current = null;
    }
    if (routeControlRef.current && leafletMapRef.current) {
      leafletMapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }
    const L = (window as any).L;

    /** Önce Google Routes API; kota/limit veya hata → OSRM */
    const googleOk = await (async (): Promise<boolean> => {
      try {
        const mode = transport === "car" ? "car" : transport === "walk" ? "walk" : "transit";
        const r = await fetch(mapApiUrl("/map/routes/google"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originLat: loc.lat,
            originLng: loc.lng,
            destinationLat: biz.latitude,
            destinationLng: biz.longitude,
            mode,
          }),
        });
        const parsed = await readJsonResponse<{
          success?: boolean;
          data?: {
            distanceMeters: number;
            durationSeconds: number;
            coordinates: Array<{ lat: number; lng: number }>;
            instructions: Array<{ text: string; distanceMeters: number; durationSeconds: number; lat: number; lng: number }>;
          };
        }>(r, { success: false });
        const d = parsed.data;
        if (!parsed.ok || !d.success || !d.data?.coordinates?.length || !leafletMapRef.current) return false;

        const map = leafletMapRef.current;
        const layer = L.layerGroup();
        const latlngs = d.data.coordinates.map((p) => [p.lat, p.lng] as [number, number]);
        L.polyline(latlngs, { color: "#2563eb", weight: 6, opacity: 0.9 }).addTo(layer);
        L.marker(latlngs[0], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
            iconAnchor: [7, 7],
          }),
        }).addTo(layer);
        L.marker(latlngs[latlngs.length - 1], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
            iconAnchor: [7, 7],
          }),
        }).addTo(layer);
        layer.addTo(map);
        navGoogleLayerRef.current = layer;

        const instrs = d.data.instructions.map((i) => ({
          text: i.text,
          distance: i.distanceMeters,
          type: "Straight",
        }));
        const waypoints = d.data.instructions.map((i) => ({ lat: i.lat, lng: i.lng }));
        waypoints.push({ lat: biz.latitude!, lng: biz.longitude! });

        navWaypointsRef.current = waypoints;
        navInstructionsRef.current = instrs;
        navStepIdxRef.current = 0;
        setNavInstructions(instrs);
        setNavStepIdx(0);
        setNavEta({ duration: d.data.durationSeconds, distance: d.data.distanceMeters });
        setNavOrigin(loc);
        setNavMode(true);
        setNavBiz(biz);
        if (transport === "transit") showToast("Toplu taşıma: Google rotası");
        if (isMobile) setMenuOpen(false);
        if (instrs.length > 0) speakInstruction(instrs[0].text);
        try {
          const b = L.latLngBounds(latlngs);
          map.fitBounds(b.pad(0.12), { animate: true, maxZoom: 15 });
        } catch {
          if (loc) map.setView([loc.lat, loc.lng], 14, { animate: true });
        }
        return true;
      } catch {
        return false;
      }
    })();
    if (googleOk) return;

    const profile = transport === "car" ? "driving" : "foot";
    const control = L.Routing.control({
      waypoints: [
        L.latLng(loc.lat, loc.lng),
        L.latLng(biz.latitude, biz.longitude),
      ],
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
        profile,
      }),
      alternatives: true,
      altLineOptions: { styles: [{ color: "#94a3b8", opacity: 0.6, weight: 4 }] },
      lineOptions: { styles: [{ color: "#2563eb", opacity: 0.9, weight: 6 }] },
      createMarker: (_i: number, wp: { latLng: unknown }) => {
        return L.marker(wp.latLng, {
          icon: L.divIcon({ className: "", html: `<div style="width:14px;height:14px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`, iconAnchor: [7,7] })
        });
      },
      show: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      draggableWaypoints: false,
    });

    control.on("routesfound", (e: { routes: { coordinates?: {lat:number;lng:number}[]; summary: { totalDistance: number; totalTime: number }; instructions: {text: string; distance: number; type: string; index?: number}[] }[] }) => {
      const route = e.routes[0];
      const coords: {lat:number;lng:number}[] = route.coordinates || [];
      const instrs = (route.instructions || []).map((i) => ({
        text: i.text, distance: i.distance, type: i.type
      }));
      // Store per-step lat/lng for auto-advance during live tracking
      const waypoints = (route.instructions || []).map((i) => {
        const c = coords[i.index ?? 0];
        return c ? { lat: c.lat, lng: c.lng } : { lat: biz.latitude!, lng: biz.longitude! };
      });
      // Always add destination as last waypoint
      waypoints.push({ lat: biz.latitude!, lng: biz.longitude! });
      navWaypointsRef.current = waypoints;
      navInstructionsRef.current = instrs;
      navStepIdxRef.current = 0;
      setNavInstructions(instrs);
      setNavStepIdx(0);
      setNavEta({ duration: route.summary.totalTime, distance: route.summary.totalDistance });
      setNavOrigin(loc);
      setNavMode(true);
      setNavBiz(biz);
      if (transport === "transit") showToast("Toplu tasima modu beta: yaya agina gore rota olusturuldu.");
      if (isMobile) setMenuOpen(false);
      if (instrs.length > 0) speakInstruction(instrs[0].text);
      // Center map on user's position during nav (not on full route)
      if (leafletMapRef.current && loc) {
        leafletMapRef.current.setView([loc.lat, loc.lng], 16, { animate: true });
      }
    });

    control.on("routingerror", (e: { error?: { message?: string } }) => {
      const msg = e?.error?.message || "";
      if (msg.toLowerCase().includes("no route") || msg.includes("NoRoute")) {
        showToast("Bu noktalar arasında rota bulunamadı. Başlangıç adresini daha spesifik girin.");
      } else {
        showToast("Yol tarifi alınamadı. Lütfen tekrar deneyin.");
      }
      if (routeControlRef.current && leafletMapRef.current) {
        leafletMapRef.current.removeControl(routeControlRef.current);
        routeControlRef.current = null;
      }
    });

    if (!leafletMapRef.current) {
      showToast("Harita henüz yüklenmedi, lütfen bekleyin ve tekrar deneyin.");
      return;
    }
    control.addTo(leafletMapRef.current);
    routeControlRef.current = control;
  }

  // `?directions=1` — harici sayfalardan (Sarı Sayfalar vb.) gelen yol tarifi isteğini
  // harita yüklendikten ve hedef koordinat/işletme hazır olduktan sonra otomatik başlat.
  useEffect(() => {
    if (!mapLoaded) return;
    const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    const params = new URLSearchParams(query);
    const wantsDirections = ["1", "true", "yes"].includes((params.get("directions") ?? "").trim().toLowerCase());
    if (!wantsDirections) return;

    const sig = `dir:${query}`;
    if (processedUrlDirectionsRef.current === sig) return;

    const navId = params.get("nav")?.trim() || "";
    const urlLatLng = parseMapTargetLatLng(params.get("lat"), params.get("lng") ?? params.get("lon"));

    let target: Business | null = null;
    if (navId && selectedBiz && (String(selectedBiz.id) === navId || String(selectedBiz.slug ?? "") === navId)) {
      if (selectedBiz.latitude != null && selectedBiz.longitude != null) {
        target = selectedBiz;
      }
    }
    if (!target && urlLatLng) {
      target = {
        id: navId || `url-directions-${urlLatLng.lat}-${urlLatLng.lng}`,
        name: selectedBiz?.name || params.get("location")?.trim() || "Hedef",
        latitude: urlLatLng.lat,
        longitude: urlLatLng.lng,
      } as Business;
    }
    if (!target && selectedBiz?.latitude != null && selectedBiz?.longitude != null) {
      target = selectedBiz;
    }
    if (!target?.latitude || !target?.longitude) return;

    processedUrlDirectionsRef.current = sig;
    void startNavigation(target);
  // startNavigation bileşen gövdesinde tanımlı; mapLoaded/selectedBiz değişince yeniden dene
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, selectedBiz]);

  async function startPanelNavigation(): Promise<void> {
    const targetLabel = (navTargetPoint?.label || navTargetInput).trim();
    if (!navTargetPoint) {
      showToast("Google aramasından gidilecek konumu seçin");
      return;
    }
    setNavPanelLoading(true);
    try {
      let start = realUserLocationRef.current;
      if (!navUseGpsStart) {
        if (!navStartPoint) {
          showToast("Google aramasından başlangıç konumu seçin veya konumunuzu kullanın");
          return;
        }
        start = { lat: navStartPoint.lat, lng: navStartPoint.lng };
      } else if (!start && "geolocation" in navigator) {
        start = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              realUserLocationRef.current = fix;
              resolve(fix);
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 12000 },
          );
        });
      }
      if (!start) {
        showToast("Başlangıç konumu alınamadı");
        return;
      }
      const virtualBiz = {
        id: `nav-target-${Date.now()}`,
        name: targetLabel,
        latitude: navTargetPoint.lat,
        longitude: navTargetPoint.lng,
      } as Business;
      if (navUseGpsStart) realUserLocationRef.current = start;
      setUserLocation(start);
      await startNavigation(virtualBiz, start, navTransport);
      setGeoDataTab("nav");
      setDesktopGeoPanelOpen(true);
    } finally {
      setNavPanelLoading(false);
    }
  }

  function stopNavigation() {
    if (navGoogleLayerRef.current && leafletMapRef.current) {
      leafletMapRef.current.removeLayer(navGoogleLayerRef.current);
      navGoogleLayerRef.current = null;
    }
    if (routeControlRef.current && leafletMapRef.current) {
      leafletMapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }
    // Canlı konum takibini durdur
    if (geoWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }
    navWaypointsRef.current = [];
    navInstructionsRef.current = [];
    navStepIdxRef.current = 0;
    window.speechSynthesis?.cancel();
    setNavMode(false); setNavBiz(null); setNavInstructions([]); setNavStepIdx(0); setNavEta(null);
    setNavOrigin(null); setNavModeEtas({});
  }

  function exitLocationView() {
    stopNavigation();
    if (urlSyncTimerRef.current) {
      clearTimeout(urlSyncTimerRef.current);
      urlSyncTimerRef.current = null;
    }

    const newsmapExit = isNewsmapPage;
    const guardUntil = Date.now() + 15000;
    /**
     * Çıkış koruması tüm harita modlarında geçerli: URL'e lat/lng geri yazımı ve
     * URL geo efektinin konumu yeniden aktive etmesi engellenir. Aksi halde
     * /maps ve /haritalar'da da "konumdan asla çıkılamıyor" davranışı oluşuyordu.
     */
    newsmapLocationExitUntilRef.current = guardUntil;
    lastUrlCoordPosRef.current = "__newsmap_exit__";
    lastUrlCoordViewRef.current = "__newsmap_exit__";
    mapUrlSyncFromMapRef.current = true;
    clearSelectedNewsmapCity();
    closeNewsPreview();
    closeNewsOverlay();
    if (newsmapExit) {
      newsmapPendingCityNavUntilRef.current = guardUntil;
      newsmapFlyGuardRef.current = { key: "exit-location-view", until: guardUntil };
      setNewsmapKindFilter("all");
    }

    hasUserNavigatedRef.current = false;
    noTargetDefaultViewAppliedRef.current = false;
    urlLocationCenterRef.current = null;
    processedUrlCardKeyRef.current = null;
    processedNavBizIdRef.current = null;
    processedUrlDirectionsRef.current = null;
    lastProcessedUrlRef.current = null;
    setSmartLocation("");
    setSmartLocationPlaceId(null);
    setSmartLocationTr({ city: "", district: "", mahalle: "", sokak: "" });
    setLocSuggestions([]);
    setLocSugOpen(false);
    setMapSearchSuggestions([]);
    setMapSearchSugOpen(false);
    setPlacesSearchHint(null);
    setSelectedLocation(null);
    setSelectedBiz(null);
    setSearchedLocationInfo(null);
    setUserLocation(null);
    setNearby50Km(false);
    setDesktopGeoPanelOpen(false);
    setLeftSidebarTab("isletmeler");
    setBusinessPanelMode("categories");
    setLocationPanelTab("businesses");
    if (isMobile) setMenuOpen(false);
    if (searchedLocationMarkerRef.current) {
      searchedLocationMarkerRef.current.remove();
      searchedLocationMarkerRef.current = null;
    }
    if (nearbyRadiusCircleRef.current && leafletMapRef.current) {
      nearbyRadiusCircleRef.current.remove();
      nearbyRadiusCircleRef.current = null;
    }
    if (typeof window !== "undefined") {
      const basePath = resolveMapBasePath(window.location.pathname);
      applyingDefaultViewRef.current = true;
      mapUrlSyncFromMapRef.current = true;
      navigate(basePath);
      window.history.replaceState(window.history.state, "", basePath);
    }
    const map = leafletMapRef.current;
    if (map) {
      if (newsmapExit) {
        mapUrlSyncFromMapRef.current = true;
        const plan = getActiveNoTargetViewPlan();
        flyNewsmapMapTo(plan.center.lat, plan.center.lng, plan.zoom);
      }
      applyNoTargetTurkeyView(map, { force: true });
      NO_TARGET_TURKEY_FIT_DELAYS_MS.forEach((delay) => {
        window.setTimeout(() => {
          mapUrlSyncFromMapRef.current = true;
          applyNoTargetTurkeyView(map, { force: true });
        }, delay);
      });
    }
    window.setTimeout(() => { applyingDefaultViewRef.current = false; }, 700);
    showToast("Türkiye genel görünümüne dönüldü");
  }

  function navStep(dir: "next" | "prev") {
    const next = dir === "next" ? navStepIdx + 1 : navStepIdx - 1;
    if (next < 0 || next >= navInstructions.length) return;
    navStepIdxRef.current = next;
    setNavStepIdx(next);
    speakInstruction(navInstructions[next].text);
  }

  // Reset nav error + manual mode whenever a new picker opens
  useEffect(() => {
    if (navPickerBiz) { setNavLocError(null); setNavPermBlocked(false); setNavManualMode(false); setNavManualInput(""); }
  }, [navPickerBiz]);

  // Konum geri çağrısı güncel ulaşım tipini kullansın.
  useEffect(() => { navTransportRef.current = navTransport; }, [navTransport]);

  /* ── Canlı konum takibi ── */
  useEffect(() => {
    if (!navMode) {
      // Clear any existing watch when nav stops
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      return;
    }
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        realUserLocationRef.current = newLoc;
        setUserLocation(newLoc);

        // Move user marker without recreating it
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([newLoc.lat, newLoc.lng]);
        }

        // Pan map to follow user (smooth, keep current zoom)
        if (leafletMapRef.current) {
          leafletMapRef.current.panTo([newLoc.lat, newLoc.lng], { animate: true, duration: 0.8, easeLinearity: 0.5 });
        }

        // Auto-advance step when close enough to next waypoint.
        // Threshold is transport-aware: larger for car (may pass fast), tighter for walk.
        const stepIdx = navStepIdxRef.current;
        const waypoints = navWaypointsRef.current;
        const instructions = navInstructionsRef.current;
        const threshold = navTransportRef.current === "walk" ? 30 : 80; // metres

        function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
          const R = 6371000;
          const dLat = (b.lat - a.lat) * Math.PI / 180;
          const dLng = (b.lng - a.lng) * Math.PI / 180;
          const x = Math.sin(dLat/2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng/2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        }

        // Check arrival at final destination (last waypoint)
        const destWp = waypoints[waypoints.length - 1];
        if (destWp && haversineM(newLoc, destWp) < threshold) {
          speakInstruction("Hedefinize ulaştınız");
          showToast("🏁 Hedefinize ulaştınız!");
          stopNavigation();
          return;
        }

        // Advance to next step when within threshold of that step's waypoint
        if (waypoints.length > stepIdx + 1) {
          const nextWp = waypoints[stepIdx + 1];
          if (nextWp && haversineM(newLoc, nextWp) < threshold) {
            const nextIdx = stepIdx + 1;
            if (nextIdx < instructions.length) {
              navStepIdxRef.current = nextIdx;
              setNavStepIdx(nextIdx);
              if (instructions[nextIdx]) speakInstruction(instructions[nextIdx].text);
            }
          }
        }
      },
      (err) => { if (err.code !== 3) console.warn("Nav watchPosition error:", err.message); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    geoWatchIdRef.current = watchId;
    return () => {
      navigator.geolocation.clearWatch(watchId);
      geoWatchIdRef.current = null;
    };
  }, [navMode]);

  /* ── Her ulaşım tipi için süre/mesafe (Google-Maps tarzı sekme etiketleri) ── */
  useEffect(() => {
    if (!navMode || !navOrigin || !navBiz?.latitude || !navBiz?.longitude) {
      setNavModeEtas({});
      return;
    }
    let cancelled = false;
    const origin = navOrigin;
    const dest = { lat: navBiz.latitude, lng: navBiz.longitude };
    const modes: Array<"car" | "walk" | "transit"> = ["car", "walk", "transit"];
    (async () => {
      const entries = await Promise.all(
        modes.map(async (m) => {
          try {
            const r = await fetch(mapApiUrl("/map/routes/google"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                originLat: origin.lat,
                originLng: origin.lng,
                destinationLat: dest.lat,
                destinationLng: dest.lng,
                mode: m,
              }),
            });
            const parsed = await readJsonResponse<{
              success?: boolean;
              data?: { distanceMeters: number; durationSeconds: number };
            }>(r, { success: false });
            const d = parsed.data;
            if (parsed.ok && d.success && d.data) {
              return [m, { distance: d.data.distanceMeters, duration: d.data.durationSeconds }] as const;
            }
          } catch {
            /* yut — sekme etiketi olmadan da panel çalışır */
          }
          return [m, null] as const;
        }),
      );
      if (cancelled) return;
      const next: typeof navModeEtas = {};
      for (const [m, v] of entries) {
        if (v) next[m] = v;
      }
      setNavModeEtas(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navMode, navOrigin?.lat, navOrigin?.lng, navBiz?.id]);

  /* ── Auto-scroll step strip when active step changes ── */
  useEffect(() => {
    if (!navStepStripRef.current) return;
    const strip = navStepStripRef.current;
    const activeBtn = strip.children[navStepIdx] as HTMLElement | undefined;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [navStepIdx]);

  /* ─── Nav Transport Picker (shown before navigation starts) ─── */
  const NavPickerModal = () => {
    if (!navPickerBiz) return null;
    const biz = navPickerBiz;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSamsungBrowser = /SamsungBrowser/.test(navigator.userAgent);
    const isStandalonePWA = window.matchMedia("(display-mode: standalone)").matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;
    const modes: { key: "car" | "walk" | "transit"; icon: ReactElement; label: string; sub: string }[] = [
      {
        key: "car",
        icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>,
        label: "Araç", sub: "En hızlı yol",
      },
      {
        key: "walk",
        icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg>,
        label: "Yürüyüş", sub: "Yaya yolu",
      },
      {
        key: "transit",
        icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c-4.42 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm5.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM13 11V6h5v5h-5z"/></svg>,
        label: "Toplu Taşıma", sub: "Haritada aç",
      },
    ];
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center" onClick={() => setNavPickerBiz(null)}>
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in"
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="px-5 py-4 text-white" style={{ background: MAP_CHROME_GRAD }}>
            <p className="text-xs font-medium opacity-80 mb-0.5">Yol tarifi</p>
            <p className="font-bold text-base truncate">{biz.name}</p>
            {biz.address && <p className="text-xs opacity-70 truncate mt-0.5">{biz.address}</p>}
          </div>
          {/* Transport mode selector */}
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Nasıl gitmek istersiniz?</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {modes.map(m => (
                <button key={m.key} onClick={() => setNavTransport(m.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                    navTransport === m.key
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-emerald-200"
                  }`}>
                  <span className={navTransport === m.key ? "text-emerald-700" : "text-gray-500"}>{m.icon}</span>
                  <span className="text-xs font-bold">{m.label}</span>
                  <span className="text-[10px] text-center opacity-60 leading-tight">{m.sub}</span>
                </button>
              ))}
            </div>
            {/* Non-blocked location error (timeout etc.) — show retry */}
            {navLocError && !navPermBlocked && !navManualMode && (
              <div className="mb-3 rounded-2xl border border-orange-200 bg-orange-50 p-3">
                <p className="text-xs font-bold text-orange-800 mb-2">Konum alınamadı</p>
                <button
                  disabled={gettingLoc}
                  onClick={() => { setNavLocError(null); startNavigation(biz); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white mb-2 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #ea580c, #dc2626)" }}>
                  {gettingLoc ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Alınıyor...</> : "📍 Tekrar Dene"}
                </button>
                <button onClick={() => setNavManualMode(true)}
                  className="w-full py-2 rounded-xl text-xs font-semibold" style={{ background: "#dcfce7", color: YEKPARE_SADE_TEAL_DARK }}>
                  ✏️ Adres Gir
                </button>
              </div>
            )}

            {/* Manual location input — opens automatically when location permission is blocked */}
            {navManualMode && (() => {
              // Normalize Turkish address tokens for better Nominatim hit rate
              function normalizeAddr(raw: string): string {
                return raw.trim()
                  .replace(/\bMahalesi\b/gi, "Mahallesi")
                  .replace(/\bMah\.\s*/gi, "Mahallesi ")
                  .replace(/\bCad\.\s*/gi, "Caddesi ")
                  .replace(/\bSok\.\s*/gi, "Sokağı ")
                  .replace(/\bBulv\.\s*/gi, "Bulvarı ");
              }

              // Geocode with progressive fallback strategy
              async function doGeocode() {
                if (!navManualInput.trim()) return;
                setNavManualGeocoding(true);
                const hdrs = { "Accept-Language": "tr", "User-Agent": "Yekpare/1.0 (turk.eco)" };
                const base = normalizeAddr(navManualInput.trim());
                const withTurkey = /türkiye|turkey/i.test(base) ? base : `${base}, Türkiye`;
                const attempts = [encodeURIComponent(withTurkey), encodeURIComponent(base)];
                type NomResult = { lat: string; lon: string; display_name: string };

                async function tryNominatim(q: string): Promise<NomResult[]> {
                  const r = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&addressdetails=1&countrycodes=tr`,
                    { headers: hdrs }
                  );
                  return r.ok ? (await r.json() as NomResult[]) : [];
                }

                try {
                  let data: NomResult[] = [];
                  for (const q of attempts) {
                    if (data.length) break;
                    data = await tryNominatim(q);
                  }
                  if (!data.length) {
                    const r = await fetch(
                      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(withTurkey)}&format=json&limit=3`,
                      { headers: hdrs }
                    );
                    if (r.ok) data = await r.json() as NomResult[];
                  }
                  if (data[0]) {
                    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                    setNavManualGeocoding(false);
                    setNavManualMode(false);
                    setNavLocError(null);
                    setNavPermBlocked(false);
                    startNavigation(biz, coords);
                  } else {
                    setNavManualGeocoding(false);
                    showToast("Konum bulunamadı — mahalle + ilçe + şehir yazın, örn: Keçiören Ankara");
                  }
                } catch { setNavManualGeocoding(false); showToast("Bağlantı hatası, tekrar deneyin."); }
              }

              return (
                <div className="mb-3">
                  {/* Konum retry option at top of manual form */}
                  <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-base shrink-0">📍</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-amber-800 leading-tight">
                        {navPermBlocked ? "Konum izni kapalı — adresinizi yazın" : "Adresinizi yazın veya konumunuzu kullanın"}
                      </p>
                      {navPermBlocked && (
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          {isIOS
                            ? "Ayarlar → Gizlilik → Konum Hizmetleri → Safari → İzin ver"
                            : isStandalonePWA
                              ? "Telefon Ayarları → Uygulamalar → Chrome → İzinler → Konum → İzin ver"
                              : isSamsungBrowser
                                ? "Samsung Browser: Ayarlar → Gizlilik → Konum → İzin ver"
                                : "Chrome: URL çubuğundaki 🔒 simgesine dokun → Konum → İzin ver"}
                        </p>
                      )}
                    </div>
                    {!navPermBlocked && (
                      <button
                        disabled={gettingLoc}
                        onClick={() => { setNavManualMode(false); setNavLocError(null); startNavigation(biz); }}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white flex items-center gap-1"
                        style={{ background: YEKPARE_SADE_TEAL }}>
                        {gettingLoc ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Konumum"}
                      </button>
                    )}
                    {navPermBlocked && (
                      <button
                        disabled={gettingLoc}
                        onClick={() => { setNavPermBlocked(false); setNavLocError(null); setNavManualMode(false); startNavigation(biz); }}
                        className="shrink-0 px-2 py-1.5 rounded-lg text-[10px] font-bold text-emerald-800 bg-emerald-100">
                        Tekrar Dene
                      </button>
                    )}
                  </div>

                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                    Başlangıç konumunuz
                  </label>
                  <input
                    type="text"
                    value={navManualInput}
                    onChange={e => setNavManualInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); doGeocode(); } }}
                    placeholder="Örn: Kızılay Ankara, Keçiören Ankara..."
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 px-1">
                    Mahalle, ilçe ve şehir yazarsanız daha kesin sonuç alırsınız
                  </p>
                  <button
                    disabled={!navManualInput.trim() || navManualGeocoding}
                    onClick={doGeocode}
                    className="w-full mt-2 py-3 rounded-2xl font-bold text-white text-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: MAP_CHROME_GRAD }}>
                    {navManualGeocoding
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aranıyor...</>
                      : "Yol Tarifini Başlat"}
                  </button>
                  {!navPermBlocked && (
                    <button onClick={() => { setNavManualMode(false); }}
                      className="w-full mt-1.5 py-2 rounded-2xl text-xs font-medium text-gray-400 hover:bg-gray-50 transition">
                      ← Geri
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Normal start button — hidden when showing manual input or when perm is permanently blocked */}
            {!navManualMode && !(navLocError && navPermBlocked) && (
              <>
                <button
                  disabled={gettingLoc}
                  onClick={() => { setNavLocError(null); startNavigation(biz); }}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition hover:brightness-110 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: MAP_CHROME_GRAD }}>
                  {gettingLoc ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Konum alınıyor...
                    </>
                  ) : navLocError && !navPermBlocked ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      Konum İzni Ver ve Başlat
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Başlat
                    </>
                  )}
                </button>
                <button onClick={() => setNavPickerBiz(null)}
                  className="w-full mt-2 py-2.5 rounded-2xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition">
                  İptal
                </button>
              </>
            )}
            {(navManualMode || (navLocError && navPermBlocked)) && (
              <button onClick={() => setNavPickerBiz(null)}
                className="w-full mt-1 py-2.5 rounded-2xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition">
                İptal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ─── Navigation Panel ─── */
  /** Ulaşım tipi ikonu (Araç/Yürüyüş/Toplu Taşıma) */
  const navTransportIcon = (mode: "car" | "walk" | "transit", cls: string): ReactElement =>
    mode === "car" ? (
      <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
    ) : mode === "walk" ? (
      <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg>
    ) : (
      <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c-4.42 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm5.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM13 11V6h5v5h-5z"/></svg>
    );

  const NavPanel = () => {
    if (!navMode || !navBiz) return null;
    const activeStep = navInstructions[navStepIdx];
    const destLabel = navBiz.name || "Hedef";

    const recenter = () => {
      if (userLocation && leafletMapRef.current) {
        leafletMapRef.current.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
      }
    };

    // Origin "Konumunuz" → destination + toplam süre/mesafe (Google Maps rota kartı gibi)
    const routeSummary = (
      <div>
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-center pt-1">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-emerald-500 bg-white" />
            <span className="my-0.5 h-5 w-px border-l border-dashed border-slate-300" />
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-500">Konumunuz</p>
            <p className="mt-2 truncate text-sm font-black text-slate-900">{destLabel}</p>
          </div>
        </div>
        {navEta && (
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-black text-emerald-700">{fmtDuration(navEta.duration)}</span>
            <span className="text-sm font-bold text-slate-500">({fmtDist(navEta.distance)})</span>
          </div>
        )}
      </div>
    );

    // Ulaşım sekmeleri — her biri kendi süresiyle (Araç / Toplu Taşıma / Yürüyüş)
    const modeTabs = (
      <div className="grid grid-cols-3 gap-1.5">
        {(["car", "transit", "walk"] as const).map((mode) => {
          const eta = navModeEtas[mode] ?? (mode === navTransport ? navEta : null);
          const active = navTransport === mode;
          return (
            <button
              key={mode}
              onClick={() => { setNavTransport(mode); if (navBiz) startNavigation(navBiz, undefined, mode); }}
              className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-1.5 transition ${active ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-100 bg-white text-slate-500 hover:border-emerald-200"}`}
              title={mode === "car" ? "Araç" : mode === "walk" ? "Yürüyüş" : "Toplu Taşıma"}
            >
              {navTransportIcon(mode, "w-5 h-5")}
              <span className="text-[11px] font-extrabold leading-none">{eta ? fmtDuration(eta.duration) : "—"}</span>
            </button>
          );
        })}
      </div>
    );

    // Aktif adım şeridi (sesli yönlendirme + önceki/sonraki)
    const activeBanner = (
      <div className="flex shrink-0 items-center gap-2.5 px-3 py-2.5 text-white shadow-[0_2px_8px_rgba(15,118,110,0.18)]" style={{ background: MAP_CHROME_GRAD }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-snug">{activeStep ? trInstruction(activeStep.text) : "Hedefe doğru ilerleyin"}</p>
          {activeStep && activeStep.distance > 0 && <p className="mt-0.5 text-xs text-white/80">{fmtDist(activeStep.distance)}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => navStep("prev")} disabled={navStepIdx === 0}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs font-medium text-white/80">{navStepIdx + 1}/{navInstructions.length || 1}</span>
          <button onClick={() => navStep("next")} disabled={navStepIdx === navInstructions.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    );

    // Adım adım yol tarifi listesi (dikey, kaydırılabilir)
    const stepList = navInstructions.length > 0 ? (
      <div ref={navStepStripRef} className="flex flex-col gap-0.5">
        {navInstructions.map((instr, i) => {
          const active = i === navStepIdx;
          return (
            <button
              key={i}
              onClick={() => { navStepIdxRef.current = i; setNavStepIdx(i); speakInstruction(instr.text); }}
              className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${active ? "bg-emerald-50" : "hover:bg-slate-50"}`}
            >
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${active ? "text-white" : "bg-slate-100 text-slate-500"}`} style={active ? { background: MAP_CHROME_GRAD } : undefined}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] font-semibold leading-snug ${active ? "text-emerald-900" : "text-slate-700"}`}>{trInstruction(instr.text)}</span>
                {instr.distance > 0 && <span className="mt-0.5 block text-[11px] font-medium text-slate-400">{fmtDist(instr.distance)}</span>}
              </span>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="px-3 py-6 text-center text-xs font-semibold text-slate-400">Adım adım yol tarifi bulunamadı.</div>
    );

    const footer = (
      <div className="flex items-center gap-2">
        <button onClick={recenter} title="Konumuma dön"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-700 transition hover:bg-emerald-50">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button onClick={() => setVoiceEnabled(v => { if (v) window.speechSynthesis?.cancel(); return !v; })}
          title={voiceEnabled ? "Sesi kapat" : "Sesi aç"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${voiceEnabled ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-white text-slate-400"}`}>
          {voiceEnabled ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
          ) : (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
          )}
        </button>
        <button onClick={stopNavigation}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 active:bg-red-800">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          Navigasyonu Bitir
        </button>
      </div>
    );

    /* ── Masaüstü: haritayı kapatmayan, sola yaslı kompakt rota kartı ── */
    if (!isMobile) {
      return (
        <div className="haritalar-nav-card absolute left-[5.25rem] top-3 z-[1300] flex max-h-[calc(100%-1.5rem)] w-[360px] max-w-[calc(100%-6.5rem)] flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_12px_40px_rgba(15,118,110,0.22)]">
          <div className="px-4 py-3 text-white" style={{ background: MAP_CHROME_GRAD }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Yol tarifi</p>
                <p className="truncate text-base font-black">{destLabel}</p>
              </div>
              <button onClick={stopNavigation} aria-label="Yol tarifini kapat"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="shrink-0 space-y-2.5 border-b border-slate-100 px-3 pb-2.5 pt-3">
            {routeSummary}
            {modeTabs}
          </div>
          {activeBanner}
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2" style={{ scrollbarWidth: "thin" }}>{stepList}</div>
          <div className="shrink-0 border-t border-slate-100 p-2.5">{footer}</div>
        </div>
      );
    }

    /* ── Mobil: alt sayfa (bottom sheet); tüm ekranı kalıcı kaplamaz ── */
    return (
      <div className="absolute inset-x-0 bottom-0 z-[1300] flex max-h-[72vh] flex-col overflow-hidden rounded-t-3xl border-t border-emerald-100 bg-white shadow-[0_-8px_28px_rgba(15,118,110,0.18)]">
        <div className="flex shrink-0 justify-center pt-2"><span className="h-1 w-10 rounded-full bg-slate-200" /></div>
        <div className="shrink-0 space-y-2.5 border-b border-slate-100 px-3 pb-2.5 pt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">{routeSummary}</div>
            <button onClick={stopNavigation} aria-label="Yol tarifini kapat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {modeTabs}
        </div>
        {activeBanner}
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2" style={{ scrollbarWidth: "thin" }}>{stepList}</div>
        <div className="shrink-0 border-t border-slate-100 p-2.5" style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>{footer}</div>
      </div>
    );
  };

  /* ─── Save / Share helpers ─── */
  function toggleSave(bizId: string) {
    setSavedBizIds(prev => {
      const next = new Set(prev);
      if (next.has(bizId)) next.delete(bizId); else next.add(bizId);
      localStorage.setItem("ahenk_saved_biz", JSON.stringify([...next]));
      return next;
    });
  }

  function persistSavedMapPlaces(next: LocalMapPlace[]) {
    const clean = next.slice(0, 80);
    setSavedMapPlaces(clean);
    try { localStorage.setItem(SAVED_MAP_PLACES_STORAGE_KEY, JSON.stringify(clean)); } catch {}
  }

  function persistUserAddedPlaces(next: LocalMapPlace[]) {
    const clean = next.slice(0, 80);
    setUserAddedPlaces(clean);
    try { localStorage.setItem(USER_ADDED_MAP_PLACES_STORAGE_KEY, JSON.stringify(clean)); } catch {}
  }

  function currentMapPoint(): { lat: number; lng: number } {
    const center = leafletMapRef.current?.getCenter();
    return {
      lat: Number((center?.lat ?? mapCenter.lat).toFixed(6)),
      lng: Number((center?.lng ?? mapCenter.lng).toFixed(6)),
    };
  }

  function getMapDeviceId(): string {
    try {
      const existing = localStorage.getItem(MAP_DEVICE_STORAGE_KEY);
      if (existing) return existing;
      const next = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(MAP_DEVICE_STORAGE_KEY, next);
      return next;
    } catch {
      return "web-anonymous";
    }
  }

  const mapPlatformHeaders = () => ({
    "Content-Type": "application/json",
    "X-Yekpare-Map-Device": getMapDeviceId(),
  });

  function localPlaceFromBackend(row: Record<string, unknown>): LocalMapPlace {
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
    const selectedCategory = metadata.selectedCategory && typeof metadata.selectedCategory === "object"
      ? metadata.selectedCategory as Record<string, unknown>
      : {};
    return {
      id: String(row.id ?? `backend-${Date.now()}`),
      name: String(row.name ?? "Harita konumu"),
      type: (String(row.type ?? "place") === "business" ? "business" : String(row.type ?? "") === "search" ? "search" : String(row.type ?? "") === "coordinate" ? "coordinate" : "place"),
      category: typeof row.category === "string" ? row.category : undefined,
      categoryRawLabel: typeof metadata.categoryRawLabel === "string" ? metadata.categoryRawLabel : typeof row.category === "string" ? row.category : undefined,
      categoryId: typeof metadata.categoryId === "string" ? metadata.categoryId : typeof selectedCategory.id === "string" ? selectedCategory.id : undefined,
      categorySlug: typeof metadata.categorySlug === "string" ? metadata.categorySlug : typeof selectedCategory.slug === "string" ? selectedCategory.slug : undefined,
      categoryName: typeof metadata.categoryName === "string" ? metadata.categoryName : typeof selectedCategory.name === "string" ? selectedCategory.name : undefined,
      address: typeof row.address === "string" ? row.address : undefined,
      phone: typeof row.phone === "string" ? row.phone : undefined,
      website: typeof row.website === "string" ? row.website : undefined,
      lat: Number(row.latitude ?? row.lat),
      lng: Number(row.longitude ?? row.lng),
      source: String(row.source ?? "map_center") as LocalMapPlace["source"],
      businessId: typeof row.businessId === "string" ? row.businessId : undefined,
      createdAt: String(row.createdAt ?? new Date().toISOString()),
    };
  }

  async function saveLocalPlaceToBackend(place: LocalMapPlace, endpoint: "saved-places" | "user-place-drafts"): Promise<LocalMapPlace | null> {
    try {
      const r = await fetch(mapApiUrl(`/map/${endpoint}`), {
        method: "POST",
        headers: mapPlatformHeaders(),
        body: JSON.stringify({
          name: place.name,
          type: place.type,
          category: place.category,
          categoryRawLabel: place.categoryRawLabel ?? place.category,
          categoryId: place.categoryId,
          categorySlug: place.categorySlug,
          categoryName: place.categoryName,
          address: place.address,
          phone: place.phone,
          website: place.website,
          lat: place.lat,
          lng: place.lng,
          source: place.source,
          businessId: place.businessId,
          metadata: {
            clientId: place.id,
            categoryRawLabel: place.categoryRawLabel ?? place.category ?? null,
            categoryId: place.categoryId ?? null,
            categorySlug: place.categorySlug ?? null,
            categoryName: place.categoryName ?? null,
            selectedCategory: place.categoryId || place.categorySlug || place.categoryName
              ? {
                  id: place.categoryId ?? null,
                  slug: place.categorySlug ?? null,
                  name: place.categoryName ?? place.category ?? null,
                }
              : null,
          },
        }),
      });
      const parsed = await readJsonResponse<{ success?: boolean; data?: Record<string, unknown> }>(r, { success: false });
      const d = parsed.data;
      if (!parsed.ok || !d.success || !d.data) return null;
      return localPlaceFromBackend(d.data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  function buildShareableMapUrl(): string {
    const point = currentMapPoint();
    const zoom = leafletMapRef.current?.getZoom() ?? TURKEY_DEFAULT_MAP_ZOOM;
    const params = new URLSearchParams();
    params.set("lat", String(point.lat));
    params.set("lng", String(point.lng));
    params.set("zoom", String(Math.round(zoom)));
    if (search.trim()) params.set("q", search.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    if (mapSuperCategory) params.set("super", mapSuperCategory);
    params.set("base", baseMapStyle);
    const enabledOverlays = [
      overlayEarthquake ? "earthquake" : "",
      overlayWeather ? "weather" : "",
      overlayWildfire ? "wildfire" : "",
      overlayDutyPharmacy ? "dutyPharmacy" : "",
      overlayPopulation ? "population" : "",
      overlayElevation ? "elevation" : "",
      overlayRaster ? "raster" : "",
      overlayGeodesyGrid ? "geodesyGrid" : "",
      roadStatusLayerVisible ? "roadStatus" : "",
      serverClusterEnabled ? "serverCluster" : "",
    ].filter(Boolean);
    if (enabledOverlays.length) params.set("layers", enabledOverlays.join(","));
    return `${window.location.origin}${safeMapUrlSyncBasePath(window.location.pathname)}?${params.toString()}`;
  }

  async function buildBackendShareableMapUrl(): Promise<string> {
    const fallback = buildShareableMapUrl();
    const point = currentMapPoint();
    const layers = [
      overlayEarthquake ? "earthquake" : "",
      overlayWeather ? "weather" : "",
      overlayWildfire ? "wildfire" : "",
      overlayDutyPharmacy ? "dutyPharmacy" : "",
      overlayPopulation ? "population" : "",
      overlayElevation ? "elevation" : "",
      overlayRaster ? "raster" : "",
      overlayGeodesyGrid ? "geodesyGrid" : "",
      roadStatusLayerVisible ? "roadStatus" : "",
      serverClusterEnabled ? "serverCluster" : "",
    ].filter(Boolean);
    try {
      const r = await fetch(mapApiUrl("/map/share-states"), {
        method: "POST",
        headers: mapPlatformHeaders(),
        body: JSON.stringify({
          title: "Yekpare Haritalar",
          centerLat: point.lat,
          centerLng: point.lng,
          zoom: leafletMapRef.current?.getZoom() ?? TURKEY_DEFAULT_MAP_ZOOM,
          baseLayer: baseMapStyle,
          layers,
          filters: { q: search.trim(), category: selectedCategory, superCategory: mapSuperCategory },
        }),
      });
      const parsed = await readJsonResponse<{ success?: boolean; data?: { slug?: string } }>(r, { success: false });
      const d = parsed.data;
      if (!parsed.ok || !d.success || !d.data?.slug) return fallback;
      const shareBase = safeMapUrlSyncBasePath(window.location.pathname);
      return `${window.location.origin}${shareBase}?share=${encodeURIComponent(String(d.data.slug))}`;
    } catch {
      return fallback;
    }
  }

  function localPlaceFromCurrentTarget(): LocalMapPlace {
    if (selectedBiz?.latitude && selectedBiz.longitude) {
      return {
        id: `biz-${selectedBiz.id}`,
        name: selectedBiz.name,
        type: "business",
        category: catName(selectedBiz),
        address: selectedBiz.address,
        phone: selectedBiz.phone,
        website: selectedBiz.website,
        lat: Number(selectedBiz.latitude),
        lng: Number(selectedBiz.longitude),
        source: "business",
        businessId: selectedBiz.id,
        createdAt: new Date().toISOString(),
      };
    }
    if (selectedLocation) {
      return {
        id: `loc-${selectedLocation.id}`,
        name: selectedLocation.nameTr || selectedLocation.name,
        type: "place",
        address: selectedLocation.region,
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        source: "selected_location",
        createdAt: new Date().toISOString(),
      };
    }
    const point = currentMapPoint();
    const label = [smartKeyword, smartLocation].map((x) => x.trim()).filter(Boolean).join(" · ");
    return {
      id: `coord-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`,
      name: label || "Harita konumu",
      type: label ? "search" : "coordinate",
      address: label ? `Arama hedefi · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      lat: point.lat,
      lng: point.lng,
      source: label ? "search" : "map_center",
      createdAt: new Date().toISOString(),
    };
  }

  async function saveCurrentMapTarget() {
    const place = localPlaceFromCurrentTarget();
    if (place.businessId) {
      setSavedBizIds((prev) => {
        const next = new Set(prev);
        next.add(place.businessId!);
        try { localStorage.setItem("ahenk_saved_biz", JSON.stringify([...next])); } catch {}
        return next;
      });
    }
    const backendPlace = await saveLocalPlaceToBackend(place, "saved-places");
    const storedPlace = backendPlace ?? place;
    const next = [storedPlace, ...savedMapPlaces.filter((x) => x.id !== storedPlace.id && x.id !== place.id)];
    persistSavedMapPlaces(next);
    setShowSavedOnly(false);
    showToast(backendPlace ? "Konum sunucuya kaydedildi" : "Konum yerel yedek olarak kaydedildi");
  }

  function removeLocalPlace(id: string, kind: "saved" | "user") {
    if (kind === "saved") {
      persistSavedMapPlaces(savedMapPlaces.filter((x) => x.id !== id));
      fetch(mapApiUrl(`/map/saved-places/${encodeURIComponent(id)}`), { method: "DELETE", headers: { "X-Yekpare-Map-Device": getMapDeviceId() } }).catch(() => {});
    } else {
      persistUserAddedPlaces(userAddedPlaces.filter((x) => x.id !== id));
      fetch(mapApiUrl(`/map/user-place-drafts/${encodeURIComponent(id)}`), { method: "DELETE", headers: { "X-Yekpare-Map-Device": getMapDeviceId() } }).catch(() => {});
    }
  }

  function setDraftCoordsFromMapCenter() {
    const point = currentMapPoint();
    setAddPlaceDraft((draft) => ({ ...draft, lat: String(point.lat), lng: String(point.lng) }));
    leafletMapRef.current?.setView([point.lat, point.lng], Math.max(leafletMapRef.current?.getZoom() ?? 15, 15), { animate: true });
    showToast("Harita merkezi forma eklendi");
  }

  function openAddPlacePanel(seed?: Partial<AddPlaceDraft>) {
    const point = currentMapPoint();
    setAddPlaceDraft((draft) => ({
      ...draft,
      lat: draft.lat || String(point.lat),
      lng: draft.lng || String(point.lng),
      ...seed,
    }));
    setAddPlaceOpen(true);
    setLeftSidebarTab("yer_ekle");
    if (isMobile) setMenuOpen(true);
    else setDesktopGeoPanelOpen(true);
  }

  async function submitLocalPlaceDraft() {
    const name = addPlaceDraft.name.trim();
    const lat = Number(addPlaceDraft.lat);
    const lng = Number(addPlaceDraft.lng);
    if (!name) {
      showToast("Yer adi zorunlu");
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      showToast("Gecerli koordinat secin");
      return;
    }
    const place: LocalMapPlace = {
      id: `user-${Date.now()}`,
      name,
      type: addPlaceDraft.type,
      category: addPlaceDraft.category.trim() || undefined,
      categoryRawLabel: addPlaceDraft.category.trim() || undefined,
      categoryId: addPlaceDraft.categoryId,
      categorySlug: addPlaceDraft.categorySlug,
      categoryName: addPlaceDraft.categoryName,
      address: addPlaceDraft.address.trim() || undefined,
      phone: addPlaceDraft.phone.trim() || undefined,
      website: addPlaceDraft.website.trim() || undefined,
      lat,
      lng,
      source: "user_added",
      createdAt: new Date().toISOString(),
    };
    const backendPlace = await saveLocalPlaceToBackend(place, "user-place-drafts");
    persistUserAddedPlaces([backendPlace ?? place, ...userAddedPlaces]);
    setAddPlaceDraft({ name: "", type: "business", category: "", categoryId: undefined, categorySlug: undefined, categoryName: undefined, address: "", phone: "", website: "", lat: "", lng: "" });
    setAddPlaceOpen(false);
    setAddPlacePickMode(false);
    setLeftSidebarTab("kayitlar");
    leafletMapRef.current?.setView([lat, lng], 16, { animate: true });
    showToast(backendPlace ? "Yer taslağı sunucuya gönderildi" : "Yerel yer taslagi kaydedildi");
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setShareCopied(key);
      setTimeout(() => setShareCopied(null), 2000);
    }).catch(() => {});
  }
  function bizUrl(biz: Business) {
    const base = window.location.origin;
    // Salt kazınan (doğrulanmamış) işletmeler özel sayfa almaz → harita penceresi paylaşılır.
    if (biz.hasPublicProfile === false) {
      return `${base}${kesfetBusinessMapHref({
        id: biz.id,
        name: biz.name,
        lat: biz.latitude,
        lng: biz.longitude,
        googlePlaceId: biz.googlePlaceId,
      })}`;
    }
    return biz.slug ? `${base}/kesfet/${biz.slug}` : `${base}/kesfet/isletme/${biz.id}`;
  }
  function embedCode(biz: Business) {
    return `<iframe src="${bizUrl(biz)}" width="400" height="300" frameborder="0" allowfullscreen></iframe>`;
  }

  useEffect(() => {
    let cancelled = false;
    const headers = { "X-Yekpare-Map-Device": getMapDeviceId() };
    fetch(mapApiUrl("/map/saved-places"), { headers })
      .then((r) => readJsonResponse<{ success?: boolean; data?: Record<string, unknown>[] }>(r, { success: false, data: [] }))
      .then((parsed) => {
        const d = parsed.data;
        if (cancelled || !d.success || !Array.isArray(d.data)) return;
        persistSavedMapPlaces(d.data.map(localPlaceFromBackend).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)));
      })
      .catch(() => {});
    fetch(mapApiUrl("/map/user-place-drafts"), { headers })
      .then((r) => readJsonResponse<{ success?: boolean; data?: Record<string, unknown>[] }>(r, { success: false, data: [] }))
      .then((parsed) => {
        const d = parsed.data;
        if (cancelled || !d.success || !Array.isArray(d.data)) return;
        persistUserAddedPlaces(d.data.map(localPlaceFromBackend).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Share Modal ─── */
  const ShareModal = () => {
    if (!selectedBiz || !shareOpen) return null;
    const url = bizUrl(selectedBiz);
    const embed = embedCode(selectedBiz);
    const smsLink = `sms:?body=${encodeURIComponent(`${selectedBiz.name} - ${url}`)}`;
    return (
      <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center" onClick={() => setShareOpen(false)}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <div>
              <p className="font-bold text-gray-900">{selectedBiz.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Paylaşma seçenekleri</p>
            </div>
            <button onClick={() => setShareOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {/* Native share */}
            {typeof navigator.share === "function" && (
              <button onClick={() => { navigator.share({ title: selectedBiz!.name, url }); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                <span className="font-semibold text-sm">İşletmeyi Paylaş</span>
              </button>
            )}
            {/* Copy link */}
            <button onClick={() => copyText(url, "link")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm text-gray-800">Bağlantıyı Kopyala</p>
                <p className="text-xs text-gray-400 truncate">{url}</p>
              </div>
              {shareCopied==="link" && <span className="text-xs text-green-600 font-bold shrink-0">✓ Kopyalandı</span>}
            </button>
            {/* Send to phone (SMS) */}
            <a href={smsLink}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              <div className="text-left">
                <p className="font-semibold text-sm text-gray-800">Telefona Gönder</p>
                <p className="text-xs text-gray-400">SMS ile bağlantı gönder</p>
              </div>
            </a>
            {/* Business link */}
            <button onClick={() => copyText(url, "bizlink")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm text-gray-800">İşletme Linki</p>
                <p className="text-xs text-gray-400 truncate">{url}</p>
              </div>
              {shareCopied==="bizlink" && <span className="text-xs text-green-600 font-bold shrink-0">✓ Kopyalandı</span>}
            </button>
            {/* Embed code */}
            <button onClick={() => copyText(embed, "embed")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm text-gray-800">Harita Yerleştirme Kodu</p>
                <p className="text-xs text-gray-400">iframe kodu panoya kopyala</p>
              </div>
              {shareCopied==="embed" && <span className="text-xs text-green-600 font-bold shrink-0">✓ Kopyalandı</span>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Toast notification ── */
  const Toast = () => toastMsg ? (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900/90 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg pointer-events-none animate-fade-in">
      {toastMsg}
    </div>
  ) : null;

  /* ── Smart Search (Akıllı Arama) panel ── */
  async function handleSmartSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!smartKeyword.trim() && !smartLocation.trim()) return;
    setSmartLoading(true);
    try {
      let lat = userLocation?.lat ?? mapCenter.lat;
      let lng = userLocation?.lng ?? mapCenter.lng;
      const structuredLoc = [smartLocationTr.mahalle, smartLocationTr.district, smartLocationTr.city].filter(Boolean).join(", ");
      const locationLabel = (structuredLoc || smartLocation).trim();
      const keyword = smartKeyword.trim();

      if (!locationLabel && keyword) {
        const resolved = await resolveTypedMapLocation(keyword);
        if (resolved) {
          applyResolvedMapLocation(resolved);
          setSmartSearchOpen(false);
          return;
        }
      }

      // Geocode the typed location if provided
      let geoCity = "";
      if (locationLabel) {
        let resolvedByGoogle = false;
        let resolvedBounds: MapAreaBounds | null = null;
        if (smartLocationPlaceId) {
          const hit = await geocodePlaceIdServer(smartLocationPlaceId)
            || (mapsGeoEffective.mapsGoogleEnabled && (mapsGeoEffective.mapsGoogleBrowserKey ?? "").trim()
              ? await geocodePlaceIdClient(siteSettings, smartLocationPlaceId)
              : null);
          if (hit && isUsableMapCoordinate(hit.lat, hit.lng)) {
            lat = hit.lat;
            lng = hit.lng;
            const addr = await reverseGeocodeHybrid(siteSettings, hit.lat, hit.lng);
            setSmartLocationTr({
              city: addr.city,
              district: addr.district,
              mahalle: mahalleFromLabel(addr.label, addr.district, addr.city),
              sokak: "",
            });
            geoCity = addr.city || locationLabel;
            resolvedBounds = "bounds" in hit ? validMapBounds(hit.bounds as MapAreaBounds | null | undefined) : null;
            resolvedByGoogle = true;
          }
        }
        if (!resolvedByGoogle) {
          const hybridCoords = await forwardGeocodeAddressHybrid(siteSettings, locationLabel);
          if (hybridCoords && isUsableMapCoordinate(hybridCoords.lat, hybridCoords.lng)) {
            lat = hybridCoords.lat;
            lng = hybridCoords.lng;
            const addr = await reverseGeocodeHybrid(siteSettings, lat, lng);
            geoCity = addr.city || addr.district || locationLabel;
            resolvedByGoogle = true;
          }
        }
        if (!resolvedByGoogle || !isUsableMapCoordinate(lat, lng)) {
          const resolved = await resolveTypedMapLocation(locationLabel);
          if (resolved) {
            applyResolvedMapLocation(resolved);
            setSmartSearchOpen(false);
            return;
          }
          showToast("Konum bulunamadı. Farklı bir yer adı deneyin.");
          return;
        }
        // Open location info panel for the searched location
        const virtualLoc: PopularLocation = {
          id: `search-${Date.now()}`,
          name: locationLabel,
          nameTr: geoCity || locationLabel,
          latitude: lat,
          longitude: lng,
          zoomLevel: 13,
          region: "",
        };
        goToLocation(virtualLoc, { clearNearby: false, panel: "preserve" });
        openSearchedLocationCard({
          id: virtualLoc.id,
          title: geoCity || locationLabel,
          areaInfo: geoCity && geoCity !== locationLabel ? locationLabel : "",
          address: locationLabel,
          lat,
          lng,
          bounds: resolvedBounds,
        });
        replaceMapLocationUrl({
          id: virtualLoc.id,
          title: geoCity || locationLabel,
          areaInfo: geoCity && geoCity !== locationLabel ? locationLabel : "",
          address: locationLabel,
          lat,
          lng,
          bounds: resolvedBounds,
        }, 13);
        setSmartSearchOpen(false);
        return;
      } else {
        // No location typed — just move the map
        if (leafletMapRef.current) leafletMapRef.current.setView([lat, lng], 14);
      }

      // Business-only search (no typed location) — bekleyen debounce'u iptal et, hemen uygula.
      if (searchCommitTimer.current) clearTimeout(searchCommitTimer.current);
      setSearch(keyword);
      if (!keyword) {
        setSmartSearchOpen(false);
        return;
      }
      openBusinessResultsPanel();

      let placePreviewRows: Business[] = [];
      if (keyword) {
        const placesSearch = await searchServerPlaces({ q: [keyword, locationLabel].filter(Boolean).join(" "), lat, lng, radius: 50000 });
        if (placesSearch.configured === false) {
          setPlacesSearchHint("Öneriler şu anda hazır değil.");
          showToast("Arama önerileri hazır değil");
        } else if (placesSearch.error) {
          setPlacesSearchHint("Arama şu anda tamamlanamadı.");
        } else {
          placePreviewRows = placesSearch.rows.map((p) => ({
            ...p,
            distance: p.latitude && p.longitude ? distanceKm(lat, lng, p.latitude, p.longitude) : 999,
          }));
          if (placePreviewRows.length > 0 && leafletMapRef.current && !locationLabel) {
            leafletMapRef.current.setView([placePreviewRows[0].latitude!, placePreviewRows[0].longitude!], 16, { animate: true });
          }
          setPlacesSearchHint(null);
        }
      }

      if (keyword) {
        await importBusinessesForCurrentLocation({
          target: {
            label: locationLabel || viewportPlaceInfo.label,
            lat,
            lng,
          },
        });
      }

      // Reload premium first, then other Yekpare'ye kayıt olabilecek işletmeler near the resolved location.
      const reloadParams = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: "50000", limit: "200" });
      if (keyword) reloadParams.set("q", keyword);
      const res = await fetch(mapApiUrl(`/map/businesses?${reloadParams}`));
      const parsed = await readJsonResponse<{ success?: boolean; data?: Business[]; error?: string }>(res, {
        success: false,
        data: [],
        error: "İşletme listesi boş yanıt döndürdü.",
      });
      const data = parsed.data;
      if (parsed.ok && data.success) {
        const list: Business[] = data.data ?? [];
        const withDist = list.map(b => ({
          ...b,
          distance: b.latitude&&b.longitude ? distanceKm(lat,lng,b.latitude,b.longitude) : 999
        })).sort((a,b) => { if(a.isPremium&&!b.isPremium) return -1; if(!a.isPremium&&b.isPremium) return 1; return (a.distance??999)-(b.distance??999); });
        const existingPlaceIds = new Set(withDist.map((b) => b.googlePlaceId).filter(Boolean));
        const existingNames = new Set(withDist.map((b) => `${b.name}|${b.address || ""}`.toLocaleLowerCase("tr-TR")));
        const previews = placePreviewRows.filter((p) => {
          const placeId = p.googlePlaceId;
          if (placeId && existingPlaceIds.has(placeId)) return false;
          return !existingNames.has(`${p.name}|${p.address || ""}`.toLocaleLowerCase("tr-TR"));
        });
        setBusinesses([...withDist, ...previews]);
      } else {
        setPlacesSearchHint(FRIENDLY_MAP_ERROR);
        if (placePreviewRows.length > 0) setBusinesses(placePreviewRows);
      }
      setSmartSearchOpen(false);
    } finally {
      setSmartLoading(false);
    }
  }


  /* ── General map share modal (from side menu) ── */
  const MapShareModal = () => {
    if (!mapShareOpen) return null;
    const mapUrl = typeof window !== "undefined" ? buildShareableMapUrl() : "";
    const embed = `<iframe src="${mapUrl}" width="600" height="450" style="border:0" allowfullscreen loading="lazy"></iframe>`;
    const shareText = `Yekpare Haritalar konumu: ${mapUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    return (
      <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center" onClick={() => setMapShareOpen(false)}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-emerald-100" style={{ background: MAP_TOP_BAR_BG }}>
            <div>
              <p className="font-bold text-gray-900">Yekpare Haritalar'ı Paylaş</p>
              <p className="text-xs text-emerald-700 mt-0.5">Mevcut görünüm, katmanlar ve arama filtreleri</p>
            </div>
            <button onClick={() => setMapShareOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800">Kısa bağlantı / görünüm URL'i</p>
              <p className="mt-1 break-all rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700">{mapUrl}</p>
            </div>
            {typeof navigator.share === "function" && (
              <button onClick={() => { void buildBackendShareableMapUrl().then((url) => navigator.share({ title: "Yekpare Haritalar", url })); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white hover:brightness-110 transition"
                style={{ background: MAP_CHROME_GRAD }}>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                <span className="font-semibold text-sm">Paylaş</span>
              </button>
            )}
            <button onClick={() => { void buildBackendShareableMapUrl().then((url) => copyText(url, "map-share-link")); }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm text-gray-800">Bağlantıyı Kopyala</p>
                <p className="text-xs text-gray-400 truncate">{mapUrl}</p>
              </div>
              {shareCopied === "map-share-link" && <span className="text-xs text-green-600 font-bold shrink-0">✓ Kopyalandı</span>}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                WhatsApp
              </a>
              <a href={xUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
                Sosyal Paylaş
              </a>
            </div>
            <button onClick={() => { copyText(embed, "map-share-embed"); }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              <div className="text-left">
                <p className="font-semibold text-sm text-gray-800">Harita Yerleştirme Kodu</p>
                <p className="text-xs text-gray-400">iframe kodunu kopyala</p>
              </div>
              {shareCopied === "map-share-embed" && <span className="ml-auto text-xs text-green-600 font-bold shrink-0">✓ Kopyalandı</span>}
            </button>
            <button onClick={() => { window.print(); setMapShareOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              <div className="text-left">
                <p className="font-semibold text-sm text-gray-800">Yazdır</p>
                <p className="text-xs text-gray-400">Haritayı yazdır</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DetailBody = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Photo hero */}
      <div className="relative flex-shrink-0 bg-gray-900" style={{ height: photos.length ? (isMobile ? 220 : 240) : 70 }}>
        {photos.length>0 && (
          <>
            <img src={photos[photoIdx].url} alt={selectedBiz!.name} className="w-full h-full object-cover transition-all duration-300"
              onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none"/>
            {photos.length>1 && (
              <>
                <button onClick={()=>setPhotoIdx(i=>(i-1+photos.length)%photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition z-10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button onClick={()=>setPhotoIdx(i=>(i+1)%photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition z-10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                </button>
                {/* Dot indicators (max 8) */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {photos.slice(0, 8).map((_,i) => (
                    <button key={i} onClick={()=>setPhotoIdx(i)}
                      className={`rounded-full transition-all ${i===photoIdx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"}`}/>
                  ))}
                  {photos.length>8 && <span className="text-white/60 text-[10px] ml-1 self-center">+{photos.length-8}</span>}
                </div>
              </>
            )}
            {/* Photo count badge */}
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 z-10">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/></svg>
              {photoIdx+1}/{photos.length}
            </div>
          </>
        )}
        {photos.length===0 && !googleLoading && !scraping && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)" }}>
            <span className="text-6xl opacity-80">{catIcon(selectedBiz!)}</span>
          </div>
        )}
        {(googleLoading || scraping) && photos.length===0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}>
            <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            {scraping && <p className="text-white/70 text-[11px]">Konum bilgileri yükleniyor...</p>}
          </div>
        )}
        {/* Back button desktop */}
        {!isMobile && (
          <button onClick={()=>setSelectedBiz(null)} className="absolute top-3 left-3 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition z-10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
        )}
        {/* Thumbnail strip */}
        {photos.length>1 && (
          <div className="absolute bottom-0 left-0 right-0 h-14 overflow-x-auto flex gap-1 px-2 pb-1.5 pt-0.5 z-10" style={{ scrollbarWidth:"none", background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}>
            {photos.map((p,i) => (
              <button key={i} onClick={()=>setPhotoIdx(i)}
                className={`flex-shrink-0 rounded-lg overflow-hidden transition-all ${i===photoIdx ? "ring-2 ring-white ring-offset-1 ring-offset-black/30 opacity-100" : "opacity-60 hover:opacity-90"}`}
                style={{ width: 42, height: 42 }}>
                <img src={p.url} alt="" className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Business name header */}
        <div className="px-4 pt-4 pb-3.5"
          style={selectedBiz!.isPremium
            ? {
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 45%, #fff7ed 100%)",
                borderBottom: "1px solid rgba(245,158,11,0.20)",
              }
            : {
                background: "linear-gradient(135deg,#ffffff 0%,#f8faff 60%,#f2f5ff 100%)",
                borderBottom: "1px solid rgba(99,102,241,0.09)",
              }}>
          <div className="flex items-start gap-2.5">
            <h2 className="flex-1 font-extrabold text-[19px] leading-snug tracking-tight"
              style={selectedBiz!.isPremium ? {} : { color: "#0f172a" }}>
              {selectedBiz!.isPremium
                ? <span className="gold-shimmer-text">{selectedBiz!.name}</span>
                : selectedBiz!.name}
            </h2>
            {selectedBiz!.isPremium && (
              <span className="shrink-0 mt-0.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-wide"
                style={{
                  background: "linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)",
                  color: "#fff",
                  boxShadow: "0 2px 10px rgba(245,158,11,0.50), inset 0 1px 0 rgba(255,255,255,0.25)",
                  letterSpacing: "0.05em",
                }}>
                ⭐ PREMIUM
              </span>
            )}
          </div>

          {/* Rating row */}
          {selectedBiz!.rating && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: selectedBiz!.isPremium ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.08)" }}>
                <span className="text-sm font-extrabold" style={{ color: selectedBiz!.isPremium ? "#d97706" : "#4338ca" }}>{selectedBiz!.rating.toFixed(1)}</span>
                <StarRating rating={selectedBiz!.rating} />
              </div>
              {selectedBiz!.userRatingsTotal && (
                <button onClick={()=>setDetailTab("reviews")} className="text-[12px] text-indigo-600 hover:underline font-semibold">
                  {selectedBiz!.userRatingsTotal.toLocaleString()} değerlendirme
                </button>
              )}
              <span className="text-gray-300 text-sm">·</span>
              <span className="text-[13px] text-gray-500">{catName(selectedBiz!)}</span>
            </div>
          )}
          {!selectedBiz!.rating && (
            <p className="text-[13px] text-gray-500 mt-1">{catName(selectedBiz!)}</p>
          )}

          {/* Open status */}
          {(openStatus || googleDetails?.openNow !== undefined) && (
            <div className="mt-2">
              {openStatus ? (
                <div className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full ${openStatus.isOpen ? "text-green-800" : "text-red-700"}`}
                  style={openStatus.isOpen
                    ? { background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid rgba(187,247,208,0.9)" }
                    : { background: "linear-gradient(135deg,#fef2f2,#fee2e2)", border: "1px solid rgba(254,202,202,0.9)" }}>
                  <span className={`w-2 h-2 rounded-full ${openStatus.isOpen ? "open-dot" : ""}`}
                    style={{ background: openStatus.isOpen ? "#22c55e" : "#ef4444" }} />
                  {openStatus.isOpen ? "Şu an Açık" : "Şu an Kapalı"}
                  <span className="font-medium text-gray-500 ml-0.5">· {openStatus.text}</span>
                </div>
              ) : (
                <div className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full ${googleDetails!.openNow ? "text-green-800" : "text-red-700"}`}
                  style={googleDetails!.openNow
                    ? { background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid rgba(187,247,208,0.9)" }
                    : { background: "linear-gradient(135deg,#fef2f2,#fee2e2)", border: "1px solid rgba(254,202,202,0.9)" }}>
                  <span className={`w-2 h-2 rounded-full ${googleDetails!.openNow ? "open-dot" : ""}`}
                    style={{ background: googleDetails!.openNow ? "#22c55e" : "#ef4444" }} />
                  {googleDetails!.openNow ? "Şu an Açık" : "Şu an Kapalı"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions — 3-per-row grid, all buttons always visible */}
        <div className="px-3 py-2.5 border-b" style={{ borderColor: "rgba(16,185,129,0.12)", background: MAP_PANEL_TINT }}>
          <div className="grid grid-cols-3 gap-1.5">
            {/* Yol Tarifi */}
            <button onClick={() => openDirectionsPanelForBiz(selectedBiz!)}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] text-white transition hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: MAP_CHROME_GRAD, boxShadow: "0 3px 10px rgba(15,118,110,0.32)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
              Yol Tarifi
            </button>
            {/* Konuma git */}
            <button onClick={() => selectedBiz!.latitude && selectedBiz!.longitude && leafletMapRef.current?.setView([selectedBiz!.latitude, selectedBiz!.longitude], 17, { animate: true })}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] transition hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: YEKPARE_SADE_ACCENT_SOFT, color: YEKPARE_SADE_TEAL_DARK }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10h.01"/></svg>
              Konuma git
            </button>
            {/* Kaydet */}
            <button onClick={() => toggleSave(selectedBiz!.id)}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] transition hover:scale-[1.02] active:scale-[0.98]"
              style={savedBizIds.has(selectedBiz!.id)
                ? { background: MAP_CHROME_GRAD, color: "#fff", boxShadow: "0 3px 10px rgba(15,118,110,0.32)" }
                : { background: YEKPARE_SADE_ACCENT_SOFT, color: YEKPARE_SADE_TEAL_DARK }}>
              <svg className="w-5 h-5" fill={savedBizIds.has(selectedBiz!.id)?"currentColor":"none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              {savedBizIds.has(selectedBiz!.id) ? "Kaydedildi" : "Kaydet"}
            </button>
            {/* Paylaş */}
            <button onClick={() => setShareOpen(true)}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] transition hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: YEKPARE_SADE_ACCENT_SOFT, color: YEKPARE_SADE_TEAL_DARK }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              Paylaş
            </button>
            {/* Yakındakiler */}
            <button onClick={() => {
                if (selectedBiz!.latitude && selectedBiz!.longitude) {
                  setUserLocation({ lat: selectedBiz!.latitude, lng: selectedBiz!.longitude });
                  setNearby50Km(true);
                  setSearch("");
                  setSmartKeyword("");
                  openBusinessResultsPanel();
                  leafletMapRef.current?.setView([selectedBiz!.latitude, selectedBiz!.longitude], 15, { animate: true });
                }
              }}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] transition hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: YEKPARE_SADE_ACCENT_SOFT, color: YEKPARE_SADE_TEAL_DARK }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l-4 4m0 0l4-1m-4 1l1-4M16 8l4-4m0 0l-4 1m4-1l-1 4M9 9h.01M15 15h.01"/></svg>
              Yakındakiler
            </button>
            {/* Ara — only if phone */}
            {selectedBiz!.phone ? (
              <a href={`tel:${selectedBiz!.phone}`}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] transition hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "rgba(34,197,94,0.1)", color: "#15803d" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
                Ara
              </a>
            ) : (
              /* WhatsApp fallback if no phone */
              selectedBiz!.whatsappNumber ? (
                <a href={`https://wa.me/${selectedBiz!.whatsappNumber.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] transition hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#15803d" }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              ) : (
                /* Placeholder empty cell to maintain 3-col layout */
                <div />
              )
            )}
            {/* Web — only if website */}
            {selectedBiz!.website ? (
              <a href={selectedBiz!.website} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] transition hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "rgba(99,102,241,0.08)", color: "#4338ca" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                Web
              </a>
            ) : <div />}
            {/* Düzenle / öner */}
            <button onClick={() => openAddPlacePanel({
                name: selectedBiz!.name,
                address: selectedBiz!.address || "",
                phone: selectedBiz!.phone || "",
                website: selectedBiz!.website || "",
                lat: selectedBiz!.latitude ? String(selectedBiz!.latitude) : "",
                lng: selectedBiz!.longitude ? String(selectedBiz!.longitude) : "",
              })}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl font-semibold text-[11px] transition hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "rgba(15,118,110,0.10)", color: YEKPARE_SADE_TEAL_DARK }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Düzenle
            </button>
          </div>
        </div>

        {selectedBiz!.hasPublicProfile !== false && (selectedBiz!.hasReservation||selectedBiz!.hasOnlineOrder) && (
          <div className="px-4 py-3 flex flex-col gap-2 border-b border-gray-100">
            {selectedBiz!.hasReservation && <Link href={selectedBiz!.slug?`/kesfet/${selectedBiz!.slug}`:`/kesfet/isletme/${selectedBiz!.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 border border-blue-300 rounded-full text-sm font-semibold text-blue-700 hover:bg-blue-50 transition">Masa rezervasyonu yap</Link>}
            {selectedBiz!.hasOnlineOrder && <Link href={selectedBiz!.slug?`/kesfet/${selectedBiz!.slug}`:`/kesfet/isletme/${selectedBiz!.id}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 rounded-full text-sm font-semibold text-white hover:bg-blue-700 transition">İnternetten sipariş ver</Link>}
          </div>
        )}

        {/* Tabs — premium pill style */}
        <div className="flex gap-1 mx-3 my-2.5 p-1 rounded-2xl shrink-0"
          style={{ background: YEKPARE_SADE_ACCENT_SOFT, border: "1px solid rgba(16,185,129,0.15)" }}>
          {(["overview","reviews","info"] as const).map(t => {
            const label = t==="overview"?"🗺 Genel":t==="reviews"?`💬 Yorumlar${googleDetails?.totalReviews?` (${googleDetails.totalReviews})`:""}` :"ℹ️ Bilgiler";
            const isAct = detailTab===t;
            return (
              <button key={t} onClick={()=>setDetailTab(t)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                style={isAct
                  ? { background: MAP_CHROME_GRAD, color:"#fff", boxShadow:"0 3px 10px rgba(15,118,110,0.28)" }
                  : { color: "#64748b" }}>
                {label}
              </button>
            );
          })}
        </div>

        {detailTab==="overview" && (
          <div className="py-1 text-sm">
            {(googleDetails?.editorialSummary || publicBusinessDescription(selectedBiz!.description)) && <div className="px-5 py-3 border-b border-gray-50"><p className="text-gray-600 leading-relaxed">{googleDetails?.editorialSummary || publicBusinessDescription(selectedBiz!.description)}</p></div>}
            {selectedBiz!.address && (
              <ILine icon="📍">
                <div className="flex items-start gap-1">
                  <span className="flex-1">{selectedBiz!.address}</span>
                  {(selectedBiz!.latitude && selectedBiz!.longitude) && (
                    <button type="button"
                      onClick={() => leafletMapRef.current?.setView([selectedBiz!.latitude!, selectedBiz!.longitude!], 17, { animate: true })}
                      className="shrink-0 p-1 rounded-lg hover:bg-indigo-100 transition"
                      title="Haritada göster">
                      <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    </button>
                  )}
                </div>
              </ILine>
            )}
            {(openStatus||googleDetails?.openNow!==undefined) && <ILine icon="🕐">
              {openStatus ? <span className={openStatus.isOpen?"text-green-700 font-medium":"text-red-600 font-medium"}>{openStatus.text}</span>
                : <span className={googleDetails?.openNow?"text-green-700 font-medium":"text-red-600 font-medium"}>{googleDetails?.openNow?"Açık":"Kapalı"}</span>}
            </ILine>}
            {selectedBiz!.phone && <ILine icon="📞"><a href={`tel:${selectedBiz!.phone}`} className="text-blue-600 hover:underline">{selectedBiz!.phone}</a></ILine>}
            {selectedBiz!.website && <ILine icon="🌐"><a href={selectedBiz!.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">{selectedBiz!.website.replace(/^https?:\/\//,"")}</a></ILine>}
            {selectedBiz!.hasDelivery && <ILine icon="🛵"><span className="text-green-700 font-medium">Teslimat mevcut</span></ILine>}
            {(selectedBiz!.latitude && selectedBiz!.longitude) && (
              <div className="px-5 py-2">
                <button type="button"
                  onClick={() => leafletMapRef.current?.setView([selectedBiz!.latitude!, selectedBiz!.longitude!], 17, { animate: true })}
                  className="flex items-center gap-2 py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition text-xs font-medium text-gray-600">
                  <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  Haritada Göster
                </button>
              </div>
            )}
            {!selectedBiz!.isPremium && (
              <div className="mx-4 my-3 p-4 rounded-2xl"
                style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7,#fff7ed)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 3px 12px rgba(245,158,11,0.12)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", boxShadow: "0 4px 12px rgba(245,158,11,0.35)" }}>⭐</div>
                  <div className="text-left flex-1">
                    <p className="font-extrabold text-sm" style={{ color: "#92400e" }}>Bu işletme sizin mi? Sahiplenin</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9a3412" }}>
                      Premium üye olun; öne çıkma, sipariş/rezervasyon alma, kampanya yayınlama ve Yekpare&apos;de daha güçlü görünürlük avantajlarından yararlanın.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {["Öne çıkma", "Sipariş/rezervasyon", "Kampanya", "Daha fazla görünürlük"].map((benefit) => (
                        <span key={benefit} className="px-2 py-1 rounded-full text-[10px] font-bold"
                          style={{ background: "rgba(255,255,255,0.75)", color: "#b45309", border: "1px solid rgba(245,158,11,0.22)" }}>
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <Link href="/is-ortagi/basvuru"
                  className="mt-3 inline-flex items-center justify-center w-full text-white text-xs font-bold px-5 py-2.5 rounded-xl transition hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 3px 10px rgba(245,158,11,0.4)" }}>
                  Premium üye olun
                </Link>
              </div>
            )}
          </div>
        )}

        {detailTab==="reviews" && (
          <div className="pb-4">
            {(googleLoading || scraping) && <div className="flex flex-col items-center justify-center py-10 gap-2"><div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>{scraping && <p className="text-xs text-gray-400">Yorumlar yükleniyor...</p>}</div>}
            {!googleLoading && !scraping && (googleDetails?.reviews?.length??0)===0 && (
              <div className="px-5 py-10 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center text-3xl mx-auto mb-3">💬</div>
                <p className="font-semibold text-gray-700 text-sm">Henüz yorum bulunmuyor</p>
                <p className="text-xs text-gray-400 mt-1">İlk yorumu sen yap!</p>
              </div>
            )}
            <div className="px-3 pt-2 space-y-2">
              {(googleDetails?.reviews||[]).map((rev,i) => (
                <div key={i} className="rounded-2xl p-3.5"
                  style={{
                    background: (rev as {source?: string}).source === "platform"
                      ? "linear-gradient(135deg, #f0f4ff, #eef2ff)"
                      : "linear-gradient(135deg, #f8faff, #f2f5ff)",
                    border: "1px solid rgba(99,102,241,0.12)",
                    boxShadow: "0 2px 8px rgba(99,102,241,0.06)",
                  }}>
                  <div className="flex items-start gap-3">
                    {rev.profilePhoto
                      ? <img src={rev.profilePhoto} alt={rev.authorName} className="w-10 h-10 rounded-full shrink-0 object-cover ring-2 ring-white shadow-sm" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                      : <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ring-2 ring-white shadow-sm"
                          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}>
                          {rev.authorName?.[0]?.toUpperCase()||"?"}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900">{rev.authorName}</span>
                        {(rev as {source?: string}).source === "google" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: "linear-gradient(135deg,#dbeafe,#bfdbfe)", color: "#1d4ed8" }}>Konum</span>
                        )}
                        {(rev as {source?: string}).source === "platform" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)", color: "#065f46" }}>Yekpare</span>
                        )}
                        {rev.relativeTime && <span className="text-[11px] text-gray-400 ml-auto shrink-0">{rev.relativeTime}</span>}
                      </div>
                      <div className="mt-1"><StarRating rating={rev.rating}/></div>
                      {rev.text && <p className="text-[13px] text-gray-600 mt-1.5 leading-relaxed">{rev.text}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!googleLoading && googleDetails?.hasMore && (
              <div className="mx-4 mt-3 p-4 rounded-2xl text-center"
                style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7,#fff7ed)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 3px 12px rgba(245,158,11,0.12)" }}>
                <p className="font-bold text-sm" style={{ color: "#92400e" }}>⭐ İşletme üyeliğiyle sayfanızı güçlendirin</p>
                <p className="text-xs mt-0.5 mb-2.5" style={{ color: "#b45309" }}>Daha fazla yorum ve işletme aracı için günde 10 TL&apos;ye başvurun</p>
                <Link href="/is-ortagi/basvuru"
                  className="inline-block text-white text-xs font-bold px-5 py-2 rounded-xl transition hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 3px 10px rgba(245,158,11,0.4)" }}>
                  İşletme Üyeliğine Başvur
                </Link>
              </div>
            )}
          </div>
        )}

        {detailTab==="info" && (
          <div className="px-4 py-3 space-y-2.5 text-sm">
            {/* Info cards */}
            {[
              { icon: "🗂️", label: "Kategori", value: catName(selectedBiz!), color: "#6366f1" },
              selectedBiz!.address ? { icon: "📍", label: "Adres", value: selectedBiz!.address, color: "#f43f5e" } : null,
              selectedBiz!.phone ? { icon: "📞", label: "Telefon", value: selectedBiz!.phone, color: "#22c55e", href: `tel:${selectedBiz!.phone}` } : null,
              selectedBiz!.website ? { icon: "🌐", label: "Web", value: selectedBiz!.website.replace(/^https?:\/\//,""), color: "#3b82f6", href: selectedBiz!.website, external: true } : null,
              selectedBiz!.rating ? { icon: "⭐", label: "Puan", value: `${selectedBiz!.rating.toFixed(1)} / 5.0 (${(selectedBiz!.userRatingsTotal||0).toLocaleString()} değerlendirme)`, color: "#f59e0b" } : null,
            ].filter(Boolean).map((item,i) => item && (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl"
                style={{ background: "linear-gradient(135deg,#f8faff,#f2f4ff)", border: "1px solid rgba(99,102,241,0.10)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${item.color}18` }}>{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: item.color }}>{item.label}</p>
                  {item.href
                    ? <a href={item.href} {...(item as {external?: boolean}).external ? { target:"_blank", rel:"noopener noreferrer" } : {}}
                        className="text-sm text-gray-800 hover:underline break-all">{item.value}</a>
                    : <p className="text-sm text-gray-800 break-words">{item.value}</p>
                  }
                </div>
              </div>
            ))}
            {(selectedBiz!.latitude && selectedBiz!.longitude) && (
              <button type="button"
                onClick={() => leafletMapRef.current?.setView([selectedBiz!.latitude!, selectedBiz!.longitude!], 17, { animate: true })}
                className="flex items-center gap-2 p-3 rounded-2xl border border-red-100 bg-red-50 hover:bg-red-100 transition">
                <svg className="w-5 h-5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <div>
                  <p className="text-xs font-bold text-red-700">Haritada Göster</p>
                  <p className="text-[11px] text-red-500">Konumu haritada incele</p>
                </div>
                <svg className="w-4 h-4 text-red-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            )}
            {/* Working hours card */}
            {googleDetails?.weekdayText && (
              <div className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(99,102,241,0.12)" }}>
                <div className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg,#4338ca,#6366f1)", color: "#fff" }}>
                  <span className="text-lg">🕐</span>
                  <span className="font-bold text-sm">Çalışma Saatleri</span>
                  {openStatus && (
                    <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full ${openStatus.isOpen ? "bg-green-400/30 text-green-100" : "bg-red-400/30 text-red-100"}`}>
                      {openStatus.isOpen ? "Şu an Açık" : "Şu an Kapalı"}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-indigo-100/60">
                  {googleDetails.weekdayText.map((line,i) => {
                    const colonIdx = line.indexOf(": ");
                    const day = colonIdx > -1 ? line.slice(0, colonIdx) : line;
                    const hours = colonIdx > -1 ? line.slice(colonIdx + 2) : "";
                    const isToday = i===(new Date().getDay()+6)%7;
                    return (
                      <div key={i} className={`flex justify-between items-center px-4 py-2.5 ${isToday ? "" : ""}`}
                        style={isToday
                          ? { background: "linear-gradient(135deg,#eef2ff,#e8eeff)", borderLeft: "3px solid #6366f1" }
                          : { background: i%2===0 ? "#fafbff" : "#f5f7ff" }}>
                        <span className={`text-[13px] ${isToday ? "font-bold text-indigo-800" : "text-gray-600"}`}>{day}</span>
                        <span className={`text-[13px] font-semibold ${
                          isToday ? "text-indigo-700" : hours.toLowerCase().includes("kapalı")||hours.toLowerCase().includes("closed") ? "text-red-500" : "text-gray-700"
                        }`}>{hours || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  /* Business list panel content */

  /* ── Location Info Panel ── */
  const LocationInfoPanel = () => {
    const nationwidePremium = turkeyPremiumCount ?? visibleBusinesses.length;
    // When no location selected, show 81 provinces (Wikipedia rehberi il seçince)
    if (!selectedLocation) {
      return (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-3.5 shrink-0 border-b border-indigo-100/60"
            style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #faf5ff 100%)" }}>
            <p className="text-sm font-bold text-slate-700">🏛 Şehir</p>
            <p className="text-xs text-slate-500 mt-0.5">
              81 il haritada mavi pin ile gösterilir. Pine tıklayınca navigasyon veya Ansiklopedi açılır.
            </p>
            {turkeyPremiumCount != null && (
              <p className="text-[11px] text-amber-700 font-semibold mt-1">⭐ Türkiye geneli {turkeyPremiumCount.toLocaleString("tr-TR")} premium işletme</p>
            )}
          </div>
          <div className="flex-1 flex flex-col min-h-0 px-2 pb-2 pt-2 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide px-2 pb-1">Büyükşehirler — Ansiklopedi</p>
            <div className="flex flex-wrap gap-1.5 px-1 pb-2">
              {MEGA_CITIES_TR.map((city) => (
                <Link
                  key={city}
                  href={`/bilgiagaci/${wikiArticleSlug(city)}`}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50 shadow-sm"
                >
                  {city}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setBusinessPanelMode("categories");
                setLocationPanelTab("businesses");
                if (isMobile) {
                  setLeftSidebarTab("isletmeler");
                  setMenuOpen(true);
                }
              }}
              className="mt-auto text-xs text-indigo-600 hover:text-indigo-800 font-semibold text-center py-2">
              Haritadaki premium işletmeler ({nationwidePremium.toLocaleString("tr-TR")}) → İşletme sekmesi
            </button>
          </div>
        </div>
      );
    }
    const locName = selectedLocation.nameTr || selectedLocation.name;
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header: Location name + clear */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-emerald-100/70 shrink-0"
          style={{ background: MAP_PANEL_TINT }}>
          {selectedLocation.imageUrl
            ? <img src={selectedLocation.imageUrl} alt={locName} className="w-11 h-11 rounded-2xl object-cover shadow-md border-2 border-white ring-1 ring-emerald-100 shrink-0" />
            : <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-xl shrink-0 shadow-md" style={{ background: MAP_CHROME_GRAD }}>📍</div>
          }
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-gray-900 text-sm leading-tight">{locName}</p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Şehir / Konum</p>
          </div>
          <button
            type="button"
            onClick={exitLocationView}
            className="text-gray-400 hover:text-gray-600 text-xs px-2.5 py-1 rounded-full bg-white/80 hover:bg-white shadow-sm border border-gray-200/60 transition shrink-0 font-medium">
            ✕
          </button>
        </div>

        <div className="px-3 py-2 flex flex-wrap gap-2 shrink-0 border-b border-emerald-100/60 bg-white/80">
          <button
            type="button"
            onClick={() => {
              if (!selectedLocation) return;
              goToLocation(selectedLocation, { clearNearby: false });
              setNearby50Km(true);
              setBusinessPanelMode("categories");
              setLocationPanelTab("businesses");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-sm"
            style={{ background: MAP_CHROME_GRAD }}
          >
            🧭 Şehre git (site içi)
          </button>
          <Link
            href={buildSariSayfalarListPath({ city: cityNameFromLocation({ title: locName }) })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-sm hover:bg-emerald-100"
          >
            Şehir Rehber
          </Link>
          {resolveBilgiAgaciHref(cityNameFromLocation({ title: locName })) ? (
            <Link
              href={resolveBilgiAgaciHref(cityNameFromLocation({ title: locName }))!}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 shadow-sm hover:bg-indigo-100"
            >
              Şehir Bilgi
            </Link>
          ) : null}
          {newsMapEnabled && !isNewsmapPage ? (
            <Link
              href={resolveSondakikaCityHref(cityNameFromLocation({ title: locName }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 shadow-sm hover:bg-rose-100"
            >
              Şehir Haberleri
            </Link>
          ) : null}
          {newsMapEnabled && isNewsmapPage ? (
            <button
              type="button"
              onClick={() => {
                const city = cityNameFromLocation({ title: locName });
                if (!city || !selectedLocation) return;
                openNewsmapCityNews(city, {
                  lat: selectedLocation.latitude,
                  lng: selectedLocation.longitude,
                  zoom: selectedLocation.zoomLevel ?? undefined,
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 shadow-sm hover:bg-rose-100"
            >
              Şehir Haberleri
            </button>
          ) : null}
        </div>

        {/* Wikipedia card */}
        {locationWiki && (
          <div className="shrink-0 mx-3 mt-3 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {locationWiki.image && (
              <div className="relative h-28 overflow-hidden">
                <img src={locationWiki.image} alt={locationWiki.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                <p className="absolute bottom-2 left-3 text-white font-bold text-sm">{locationWiki.title}</p>
              </div>
            )}
            <div className="bg-gray-50 px-3 py-2.5">
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{locationWiki.summary}</p>
              <button onClick={() => setLocationPanelTab("wiki")}
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition">
                📖 Detaylı Bilgi <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex mx-3 mt-3 rounded-2xl bg-gray-100/80 p-1 gap-1 shrink-0">
          <button onClick={() => setLocationPanelTab("gezilecek")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              locationPanelTab==="gezilecek"
                ? "text-white shadow-md shadow-emerald-200/70"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
            }`}
            style={locationPanelTab==="gezilecek" ? { background: MAP_CHROME_GRAD } : undefined}>
            🗺️ Turizm
            {touristSpots.length > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${locationPanelTab==="gezilecek" ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                {touristSpots.length}
              </span>
            )}
          </button>
          <button onClick={() => {
            setBusinessPanelMode("categories");
            setLocationPanelTab("businesses");
          }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              locationPanelTab==="businesses"
                ? "text-white shadow-md shadow-emerald-200/70"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
            }`}
            style={locationPanelTab==="businesses" ? { background: MAP_CHROME_GRAD } : undefined}>
            🏪 İşletme
            {visibleBusinesses.length > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${locationPanelTab==="businesses" ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                {visibleBusinesses.length}
              </span>
            )}
          </button>
          <button onClick={() => setLocationPanelTab("kultur")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              locationPanelTab==="kultur"
                ? "text-white shadow-md shadow-emerald-200/70"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
            }`}
            style={locationPanelTab==="kultur" ? { background: MAP_CHROME_GRAD } : undefined}>
            📚 Detaylar
          </button>
          {locationWiki && (
            <button onClick={() => setLocationPanelTab("wiki")}
              className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                locationPanelTab==="wiki"
                  ? "text-white shadow-md shadow-emerald-200/70"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
              }`}
              style={locationPanelTab==="wiki" ? { background: MAP_CHROME_GRAD } : undefined}>
              📖 Bilgi
            </button>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto mt-2">
          {locationPanelTab === "wiki" && locationWiki && (
            <LocationWikiTab title={locationWiki.title}
              onOpenDrawer={() => setWikiDrawer({ displayTitle: locationWiki.title, spotName: locationWiki.title })} />
          )}

          {locationPanelTab === "kultur" && (
            <div className="px-3 py-3 flex flex-col gap-3"
              style={{ background: "linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)", minHeight: "100%" }}>
              {/* ── City Wikipedia sections (Etimoloji, Tarihçe, Coğrafya, etc.) ── */}
              {citySectionsLoading && citySections.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
                  <p className="text-xs text-emerald-700/70">Bilgiler yükleniyor...</p>
                </div>
              )}
              {!citySectionsLoading && citySections.length === 0 && !kulturLoading && kulturTopics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="text-4xl mb-3 opacity-40">📚</div>
                  <p className="text-slate-600 font-semibold text-sm">Bilgi bulunamadı</p>
                  <p className="text-xs text-slate-400 mt-1">Bu şehir için Wikipedia'da ayrıntılı veri yok</p>
                </div>
              )}
              {citySectionsTitle && (
                <div className="flex items-center gap-2 px-1 pb-1">
                  <span className="text-base">📖</span>
                  <p className="text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest">{citySectionsTitle} · Wikipedia</p>
                </div>
              )}
              {citySections.map(sec => (
                <div key={sec.key} className="overflow-hidden rounded-2xl"
                  style={{
                    background: openSectionKey === sec.key
                      ? "linear-gradient(135deg, rgba(67,56,202,0.22), rgba(124,58,237,0.15))"
                      : "rgba(255,255,255,0.06)",
                    border: openSectionKey === sec.key
                      ? "1px solid rgba(99,102,241,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: openSectionKey === sec.key ? "0 4px 20px rgba(67,56,202,0.18)" : "none",
                  }}>
                  <button
                    onClick={() => setOpenSectionKey(prev => prev === sec.key ? null : sec.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="text-base shrink-0">{sec.icon}</span>
                    <p className="flex-1 font-bold text-[13px] text-white/90">{sec.label}</p>
                    <svg className={`w-3.5 h-3.5 text-indigo-300/60 shrink-0 transition-transform ${openSectionKey === sec.key ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  {openSectionKey === sec.key && (
                    <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(99,102,241,0.15)" }}>
                      <p className="text-xs text-white/60 leading-relaxed mt-3">{sec.summary}</p>
                      <button
                        onClick={() => setWikiDrawer({ displayTitle: sec.heading, spotName: citySectionsTitle || sec.heading })}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
                        Devamını Oku <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* ── Divider ── */}
              {(citySections.length > 0 || citySectionsLoading) && (kulturTopics.length > 0 || kulturLoading) && (
                <div className="flex items-center gap-2 px-1 pt-2">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }}/>
                  <p className="text-[9px] font-black text-indigo-300/50 uppercase tracking-widest">Kültür</p>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }}/>
                </div>
              )}

              {/* ── Cultural sub-topics (El Sanatları, Mutfak, Folklor) ── */}
              {kulturLoading && kulturTopics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/>
                </div>
              )}
              {kulturTopics.map(t => {
                const ICONS: Record<string, string> = { el_sanatlari: "🧵", mutfak: "🍽️", folklor: "🎶" };
                const GRADIENTS: Record<string, string> = {
                  el_sanatlari: "linear-gradient(135deg, rgba(217,119,6,0.3), rgba(245,158,11,0.2))",
                  mutfak: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))",
                  folklor: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(124,58,237,0.2))",
                };
                const BORDERS: Record<string, string> = {
                  el_sanatlari: "rgba(245,158,11,0.3)",
                  mutfak: "rgba(16,185,129,0.3)",
                  folklor: "rgba(139,92,246,0.3)",
                };
                const ACCENT: Record<string, string> = {
                  el_sanatlari: "#fbbf24",
                  mutfak: "#34d399",
                  folklor: "#a78bfa",
                };
                return (
                  <div key={t.topic} className="rounded-2xl overflow-hidden"
                    style={{
                      background: GRADIENTS[t.topic] || "rgba(255,255,255,0.06)",
                      border: `1px solid ${BORDERS[t.topic] || "rgba(255,255,255,0.1)"}`,
                    }}>
                    <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${BORDERS[t.topic] || "rgba(255,255,255,0.06)"}` }}>
                      <span className="text-xl">{ICONS[t.topic] || "📚"}</span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: ACCENT[t.topic] || "#fff" }}>{t.label}</p>
                        {t.title && <p className="text-white/40 text-[10px] truncate">{t.title}</p>}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      {t.summary ? (
                        <>
                          <p className="text-xs text-white/65 leading-relaxed">{t.summary}</p>
                          {t.html && (
                            <button
                              onClick={() => setWikiDrawer({ displayTitle: t.title || t.label, spotName: t.title || t.label })}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
                              Devamını Oku <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-white/25 italic">Bilgi bulunamadı</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {locationPanelTab === "gezilecek" && (
            <>
              {/* Sub-category pills */}
              {(() => {
                const REHBER_CATS = [
                  { id: "gezilecek", label: "Turistik noktalar", emoji: "🗺️", color: "#6366f1" },
                  { id: "devlet",    label: "Devlet", emoji: "🏛️", color: "#2563eb" },
                  { id: "saglik",    label: "Sağlık", emoji: "🏥", color: "#dc2626" },
                  { id: "egitim",    label: "Eğitim", emoji: "🎓", color: "#7c3aed" },
                  { id: "guvenlik",  label: "Güvenlik", emoji: "🚔", color: "#0369a1" },
                ];
                return (
                  <div className="px-2 pt-2 pb-1 flex gap-1.5 w-full" style={{ scrollbarWidth: "none", overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                    {REHBER_CATS.map(cat => {
                      const isActive = rehberSubCat === cat.id;
                      return (
                        <button key={cat.id}
                          onClick={() => { setRehberSubCat(cat.id); setSelectedSpot(null); setSelectedPoi(null); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0"
                          style={isActive
                            ? { background: cat.color, color: "white", boxShadow: `0 3px 10px ${cat.color}55` }
                            : { background: "#f1f5f9", color: "#475569" }
                          }>
                          <span>{cat.emoji}</span>{cat.label}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Gezilecek content */}
              {rehberSubCat === "gezilecek" && (
                <>
                  {selectedSpot && <SpotDetail spot={selectedSpot} onBack={() => setSelectedSpot(null)}
                    locationName={selectedLocation?.nameTr || selectedLocation?.name}
                    onOpenWiki={setWikiDrawer}
                    onShowOnMap={() => leafletMapRef.current?.setView([selectedSpot.lat, selectedSpot.lng], 16, { animate: true })} />}
                  {touristLoading && touristSpots.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                      <p className="text-xs text-gray-500 font-medium">Yükleniyor...</p>
                    </div>
                  )}
                  {!touristLoading && touristSpots.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                      <div className="text-4xl mb-3">🗺️</div>
                      <p className="text-gray-600 font-semibold text-sm">Gezilecek yer bulunamadı</p>
                      <p className="text-xs text-gray-400 mt-1">Bu konum için veri yok</p>
                    </div>
                  )}
                  {touristSpots.map(spot => {
                    const isSel = selectedSpot?.osmId === spot.osmId;
                    return (
                      <button key={spot.osmId} onClick={() => {
                          setSelectedSpot(spot);
                          if (leafletMapRef.current) leafletMapRef.current.panTo([spot.lat, spot.lng], { animate: true });
                        }}
                        className={`group flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-2xl transition-all text-left ${
                          isSel ? "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-300/40"
                               : "bg-white hover:bg-indigo-50/60 ring-1 ring-gray-100 hover:ring-indigo-200 shadow-sm hover:shadow-md"
                        }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${isSel ? "bg-white/20" : "bg-gradient-to-br from-indigo-100 to-violet-100"}`}>
                          {spotIcon(spot.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-[13px] leading-snug truncate ${isSel ? "text-white" : "text-gray-900"}`}>{spot.nameTr || spot.name}</p>
                          <p className={`text-[11px] font-semibold mt-0.5 ${isSel ? "text-indigo-200" : "text-indigo-500"}`}>{spot.typeLabel}</p>
                        </div>
                        <svg className={`w-3.5 h-3.5 shrink-0 ${isSel ? "text-white/50" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    );
                  })}
                  {touristSpots.length > 0 && <div className="py-4 text-center text-xs text-gray-400">{touristSpots.length} yer · OpenStreetMap</div>}
                </>
              )}

              {/* Non-gezilecek POI content — haritada pin olarak göster */}
              {rehberSubCat !== "gezilecek" && (
                <>
                  {/* Loading */}
                  {cityPoisLoading && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: REHBER_CAT_COLORS[rehberSubCat] + "44", borderTopColor: REHBER_CAT_COLORS[rehberSubCat] }}/>
                      <p className="text-xs text-gray-500 font-medium">Harita yükleniyor...</p>
                    </div>
                  )}
                  {/* No location selected */}
                  {!cityPoisLoading && !selectedLocation && (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                      <div className="text-3xl mb-2">📍</div>
                      <p className="text-gray-600 font-semibold text-sm">Önce bir şehir seçin</p>
                      <p className="text-xs text-gray-400 mt-1">Sağdaki haritadan veya arama çubuğundan şehir seçin</p>
                    </div>
                  )}
                  {/* No data */}
                  {!cityPoisLoading && selectedLocation && cityPois.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-6 gap-3">
                      <div className="text-3xl">🔍</div>
                      <div>
                        <p className="text-gray-600 font-semibold text-sm">Kayıt bulunamadı</p>
                        <p className="text-xs text-gray-400 mt-1">Bu bölgede OpenStreetMap verisi yok</p>
                      </div>
                      {rehberSubCat === "devlet" && (
                        <button
                          onClick={() => {
                            showToast("Bu veri yönetici onayıyla eklenir.");
                            setLeftSidebarTab("yer_ekle");
                            setAddPlaceOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                          style={{ background: MAP_CHROME_GRAD }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          İşletme adaylarını getir
                        </button>
                      )}
                    </div>
                  )}
                  {/* Data loaded — show count badge + selected poi detail */}
                  {!cityPoisLoading && cityPois.length > 0 && (
                    <>
                      {/* Map status badge */}
                      {!selectedPoi && (
                        <>
                          <div className="mx-3 mt-2 mb-1 px-3 py-2.5 rounded-2xl flex items-center gap-2"
                            style={{ background: (REHBER_CAT_COLORS[rehberSubCat] || "#6366f1") + "12", border: `1px solid ${(REHBER_CAT_COLORS[rehberSubCat] || "#6366f1")}25` }}>
                            <span className="text-lg shrink-0">🗺️</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800">{cityPois.length} yer haritada gösteriliyor</p>
                              <p className="text-[11px] text-gray-500">Haritadaki pinlere tıklayın</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center py-8 text-center px-6">
                            <div className="text-4xl mb-2">👆</div>
                            <p className="text-sm text-gray-500 font-medium">Detay için bir pine tıklayın</p>
                            <p className="text-xs text-gray-400 mt-1">Konuma gitme ve bilgi görüntüleme</p>
                          </div>
                        </>
                      )}
                      {/* Selected POI detail */}
                      {selectedPoi && (
                        <PoiDetail
                          poi={selectedPoi}
                          onBack={() => setSelectedPoi(null)}
                          rehberSubCat={rehberSubCat}
                          onShowOnMap={() => leafletMapRef.current?.setView([selectedPoi.lat, selectedPoi.lng], 17, { animate: true })}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
          {locationPanelTab === "businesses" && (
            <>
              {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>}
              {!loading && visibleBusinesses.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-center px-6"><div className="text-4xl mb-3">🔍</div><p className="text-gray-600 font-semibold">Kayıtlı işletme bulunamadı</p><p className="text-xs text-gray-400 mt-1">İşletmenizi ücretsiz ekleyebilirsiniz</p></div>}
              {visibleBusinesses.map(biz => <Fragment key={biz.id}>{BizCard({ biz })}</Fragment>)}
              <div className="p-3 border-t border-gray-100/60">
                <Link href="/isletme-basvuru"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 transition shadow-lg shadow-blue-400/30 hover:shadow-blue-400/50">
                  ⭐ İşletmenizi Ücretsiz Ekleyin
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const ListPanel = () => (
    <>
      {showSavedOnly && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-700">🔖 Kaydedilen işletmeler</span>
          <button onClick={() => setShowSavedOnly(false)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">✕ Filtreyi kaldır</button>
        </div>
      )}
      {/* ── List header ── */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(16,185,129,0.16)", background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 55%, #f8fffb 100%)", boxShadow: "0 2px 12px rgba(15,118,110,0.08)" }}>
        {(() => {
          const list = showSavedOnly ? visibleBusinesses.filter(b => savedBizIds.has(b.id)) : visibleBusinesses;
          const listLocationLabel = resolveMapLocationDisplayLabel(
            searchedLocationInfo?.title,
            viewportPlaceInfo.city,
            viewportPlaceInfo.label,
            selectedLocation?.nameTr,
            selectedLocation?.name,
            smartLocation,
          );
          return (
          <div className="flex items-center gap-2 min-w-0">
            <>
                  <span className="font-black text-white text-[11px] min-w-[28px] text-center px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: MAP_CHROME_GRAD, boxShadow: "0 2px 10px rgba(15,118,110,0.28)" }}>
                    {list.length}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">sonuç</span>
                  {listLocationLabel && (
                    <span className="text-[11px] font-semibold truncate" style={{ color: YEKPARE_SADE_TEAL_DARK }}>
                      · 📍 {listLocationLabel}
                    </span>
                  )}
                  {showSavedOnly && <span className="text-[11px] font-semibold shrink-0" style={{ color: YEKPARE_SADE_TEAL_DARK }}>· 🔖 kaydedilenler</span>}
                  {list.some(b=>b.isPremium) && (
                    <span className="text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded-full"
                      style={{ background: "linear-gradient(90deg,#fef3c7,#fffbeb)", color: "#92400e", border: "1px solid rgba(245,158,11,0.3)" }}>
                      ⭐ premium
                    </span>
                  )}
                </>
          </div>
        ); })()}
        <div className="flex gap-1.5 shrink-0">
          {!userLocation && (
            <button type="button" onClick={() => goToMyLocation()} className="text-[11px] font-semibold hover:opacity-80 flex items-center gap-0.5 px-2.5 py-1 rounded-full transition"
              style={{ background: "rgba(16,185,129,0.12)", color: YEKPARE_SADE_TEAL_DARK }}>
              📍 Konum
            </button>
          )}
          {selectedLocation && (
            <button
              type="button"
              onClick={exitLocationView}
              className="text-[11px] text-slate-400 hover:text-slate-600 w-6 h-6 rounded-full flex items-center justify-center transition"
              style={{ background: "#e2e8f0" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable list ── */}
      <div className="flex-1 overflow-y-auto pt-1" style={{ background: "linear-gradient(180deg, #f7fffb 0%, #ecfdf5 58%, #f8fafc 100%)" }}>
        {(() => { const list = showSavedOnly ? visibleBusinesses.filter(b => savedBizIds.has(b.id)) : visibleBusinesses; return (<>
          {!loading && list.length===0 && showSavedOnly
            ? <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl mb-3 mx-auto"
                  style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", boxShadow: "0 4px 16px rgba(15,118,110,0.12)" }}>🔖</div>
                <p className="text-slate-700 font-bold text-sm">Kaydedilen işletme yok</p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">İşletmeleri kaydetmek için<br/>❤️ ikonuna tıklayın</p>
              </div>
            : null}
          {list.map(biz => <Fragment key={biz.id}>{BizCard({ biz })}</Fragment>)}
        </>); })()}

        {/* ── Footer CTA ── */}
        <div className="px-3.5 pt-3 pb-3.5 shrink-0"
          style={{ borderTop: "1px solid rgba(16,185,129,0.12)", background: "linear-gradient(180deg, #f8fffb 0%, #ecfdf5 100%)" }}>
          <Link href="/isletme-basvuru"
            className="biz-card-shimmer flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] hover:-translate-y-px active:scale-[0.99]"
            style={{
              background: MAP_CHROME_GRAD,
              boxShadow: "0 8px 24px rgba(15,118,110,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
              letterSpacing: "0.03em",
            }}>
            <span style={{ fontSize: "1rem", filter: "drop-shadow(0 0 6px rgba(255,220,80,0.8))" }}>⭐</span>
            İşletmenizi Öne Çıkarın
            <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 12h12"/>
            </svg>
          </Link>
          <p className="text-center text-[10px] text-slate-400 mt-2 font-medium tracking-wide">
            Ücretsiz kayıt · Premium ile öne çıkın
          </p>
        </div>
      </div>
    </>
  );

  const LocalPlaceCard = ({ place, kind }: { place: LocalMapPlace; kind: "saved" | "user" }) => (
    <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: place.source === "user_added" ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#2563eb,#4f46e5)" }}
        >
          {place.source === "user_added" ? "+" : "🔖"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-900">{place.name}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
            {place.category || (place.type === "business" ? "İşletme" : place.type === "search" ? "Arama hedefi" : "Yer")}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
            {place.address || `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => {
            leafletMapRef.current?.setView([place.lat, place.lng], 16, { animate: true });
            if (isMobile) setMenuOpen(false);
          }}
          className="rounded-xl px-2 py-2 text-[11px] font-bold text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#2563eb)" }}
        >
          Konuma git
        </button>
        <button
          type="button"
          onClick={() => {
            leafletMapRef.current?.setView([place.lat, place.lng], 16, { animate: true });
            setMapShareOpen(true);
          }}
          className="rounded-xl bg-emerald-50 px-2 py-2 text-[11px] font-bold text-emerald-800"
        >
          Paylaş
        </button>
        <button
          type="button"
          onClick={() => removeLocalPlace(place.id, kind)}
          className="rounded-xl bg-slate-100 px-2 py-2 text-[11px] font-bold text-slate-600"
        >
          Kaldır
        </button>
      </div>
      {kind === "user" && place.type === "business" && (
        <Link
          href={`/isletme-basvuru?name=${encodeURIComponent(place.name)}&lat=${place.lat}&lng=${place.lng}`}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800"
        >
          İşletme başvurusuna geç
        </Link>
      )}
    </div>
  );

  const SavedPlacesPanel = () => {
    const savedBusinesses = visibleBusinesses.filter((b) => savedBizIds.has(b.id));
    const hasAny = savedBusinesses.length > 0 || savedMapPlaces.length > 0 || userAddedPlaces.length > 0;
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
          <p className="text-sm font-extrabold text-slate-900">Kaydedilenler</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Bu ilk sürüm kayıtları cihazınızda tutar. Girişli favori API'si hazır olduğunda aynı liste sunucuya taşınabilir.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={saveCurrentMapTarget}
              className="rounded-xl px-3 py-2 text-[11px] font-bold text-white"
              style={{ background: MAP_CHROME_GRAD }}
            >
              Mevcut konumu kaydet
            </button>
            <button
              type="button"
              onClick={() => openAddPlacePanel()}
              className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800"
            >
              Yer/İşletme ekle
            </button>
          </div>
        </div>
        <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
          {!hasAny && (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-center">
              <div className="text-3xl">🔖</div>
              <p className="mt-2 text-sm font-bold text-slate-700">Henüz kayıt yok</p>
              <p className="mt-1 text-xs text-slate-500">Harita merkezi, arama hedefi veya işletme detayından Kaydet'e basın.</p>
            </div>
          )}
          {savedBusinesses.length > 0 && (
            <div className="space-y-1">
              <p className="px-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Kaydedilen işletmeler</p>
              {savedBusinesses.map((biz) => <Fragment key={`saved-biz-${biz.id}`}>{BizCard({ biz, compact: true })}</Fragment>)}
            </div>
          )}
          {savedMapPlaces.length > 0 && (
            <div className="space-y-2">
              <p className="px-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Konum kayıtları</p>
              {savedMapPlaces.map((place) => <Fragment key={`saved-place-${place.id}`}>{LocalPlaceCard({ place, kind: "saved" })}</Fragment>)}
            </div>
          )}
          {userAddedPlaces.length > 0 && (
            <div className="space-y-2">
              <p className="px-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Eklenen yer taslakları</p>
              {userAddedPlaces.map((place) => <Fragment key={`user-place-${place.id}`}>{LocalPlaceCard({ place, kind: "user" })}</Fragment>)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const AddPlacePanel = () => {
    const setDraftField = (field: keyof AddPlaceDraft, value: string) => {
      setAddPlaceDraft((draft) => ({ ...draft, [field]: value }));
    };
    const categoryQuery = normalizeCategorySearch(addPlaceDraft.category);
    const categoryMatches = categoryQuery
      ? addPlaceCategorySuggestions
          .filter((item) => {
            const haystack = normalizeCategorySearch(`${item.name} ${item.slug ?? ""} ${item.groupLabel ?? ""}`);
            return haystack.includes(categoryQuery) || categoryQuery.includes(normalizeCategorySearch(item.name));
          })
          .slice(0, 8)
      : addPlaceCategorySuggestions.slice(0, 6);
    const exactCategory = categoryQuery
      ? addPlaceCategorySuggestions.find((item) => normalizeCategorySearch(item.name) === categoryQuery || normalizeCategorySearch(item.slug ?? "") === categoryQuery)
      : undefined;
    const applyCategorySuggestion = (item: AddPlaceCategorySuggestion) => {
      setAddPlaceDraft((draft) => ({
        ...draft,
        category: item.name,
        categoryId: item.id,
        categorySlug: item.slug,
        categoryName: item.name,
      }));
      setAddPlaceCategoryFocused(false);
    };
    const updateCategoryText = (value: string) => {
      const normalized = normalizeCategorySearch(value);
      const exact = normalized
        ? addPlaceCategorySuggestions.find((item) => normalizeCategorySearch(item.name) === normalized || normalizeCategorySearch(item.slug ?? "") === normalized)
        : undefined;
      setAddPlaceDraft((draft) => ({
        ...draft,
        category: value,
        categoryId: exact?.id,
        categorySlug: exact?.slug,
        categoryName: exact?.name,
      }));
    };
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
          <p className="text-sm font-extrabold text-slate-900">Yer / İşletme ekle</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Form yerel taslak olarak kaydedilir; resmi işletme kaydı için başvuru akışına geçebilirsiniz.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setAddPlacePickMode(true);
                setAddPlaceOpen(true);
                showToast("Haritada bir noktaya tıklayın");
                if (isMobile) setMenuOpen(false);
              }}
              className="rounded-xl px-3 py-2 text-[11px] font-bold text-white"
              style={{ background: addPlacePickMode ? "linear-gradient(135deg,#f97316,#ea580c)" : MAP_CHROME_GRAD }}
            >
              Haritadan seç
            </button>
            <button
              type="button"
              onClick={setDraftCoordsFromMapCenter}
              className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800"
            >
              Merkezi kullan
            </button>
          </div>
        </div>
        <div className="mt-2 flex-1 overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
          <div className="space-y-2.5">
            <input value={addPlaceDraft.name} onChange={(e) => setDraftField("name", e.target.value)} placeholder="Yer veya işletme adı" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            <div className="grid grid-cols-2 gap-2">
              <select value={addPlaceDraft.type} onChange={(e) => setDraftField("type", e.target.value as AddPlaceDraft["type"])} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400">
                <option value="business">İşletme</option>
                <option value="place">Yer</option>
              </select>
              <div className="relative">
                <input
                  value={addPlaceDraft.category}
                  onChange={(e) => updateCategoryText(e.target.value)}
                  onFocus={() => setAddPlaceCategoryFocused(true)}
                  onBlur={() => window.setTimeout(() => setAddPlaceCategoryFocused(false), 160)}
                  placeholder="Kategori"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
                />
                {addPlaceCategoryFocused && categoryMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-[10090] mt-1 max-h-56 overflow-auto rounded-2xl border border-emerald-100 bg-white p-1 shadow-2xl">
                    {categoryMatches.map((item) => (
                      <button
                        key={`${item.source}-${item.id ?? item.slug ?? item.name}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyCategorySuggestion(item);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition hover:bg-emerald-50"
                      >
                        <span className="text-base">{item.icon || "🏷️"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-extrabold text-slate-800">{item.name}</span>
                          <span className="block truncate text-[10px] font-semibold text-slate-400">
                            {item.source === "map" ? "Site kategorisi" : item.groupLabel || "Öneri"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {addPlaceDraft.category.trim() && (
              <p className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${exactCategory || addPlaceDraft.categoryId ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                {exactCategory || addPlaceDraft.categoryId
                  ? `Kategori eşleşti: ${addPlaceDraft.categoryName || exactCategory?.name || addPlaceDraft.category}`
                  : "Bu kategori sitede yoksa yazdığınız şekilde taslak olarak kaydedilecek. Admin panelinde sonra kategoriye dönüştürülebilir."}
              </p>
            )}
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-500">
              Manuel eklenen yerler otomatik Google Places işletme aday filtresinden bağımsızdır; park, cami, eczane veya kurum gibi yerleri taslak olarak ekleyebilirsiniz.
            </p>
            <textarea value={addPlaceDraft.address} onChange={(e) => setDraftField("address", e.target.value)} placeholder="Adres / açıklama" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            <div className="grid grid-cols-2 gap-2">
              <input value={addPlaceDraft.phone} onChange={(e) => setDraftField("phone", e.target.value)} placeholder="Telefon (ops.)" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              <input value={addPlaceDraft.website} onChange={(e) => setDraftField("website", e.target.value)} placeholder="Web sitesi (ops.)" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={addPlaceDraft.lat} onChange={(e) => setDraftField("lat", e.target.value)} placeholder="Enlem" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              <input value={addPlaceDraft.lng} onChange={(e) => setDraftField("lng", e.target.value)} placeholder="Boylam" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <button
              type="button"
              onClick={submitLocalPlaceDraft}
              className="w-full rounded-2xl px-3 py-3 text-sm font-extrabold text-white shadow-md"
              style={{ background: MAP_CHROME_GRAD }}
            >
              Yerel taslak olarak kaydet
            </button>
            <Link
              href={`/isletme-basvuru?name=${encodeURIComponent(addPlaceDraft.name)}&lat=${encodeURIComponent(addPlaceDraft.lat)}&lng=${encodeURIComponent(addPlaceDraft.lng)}`}
              className="flex w-full items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-800"
            >
              İşletme başvurusuna geç
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const openInfoOverlayPanel = (panel: "afad" | "mgm" | "wildfire") => {
    setSelectedBiz(null);
    setBusinessPanelMode("categories");
    if (panel === "afad") {
      setMapMenuPanel(null);
      setLeftSidebarTab("temel_haritalar");
      setGeoDataTab("afad");
      setOverlayEarthquake(true);
      setDesktopGeoPanelOpen(true);
      setMenuOpen(false);
      return;
    }
    if (panel === "mgm") {
      setMapMenuPanel(null);
      setLeftSidebarTab("temel_haritalar");
      setGeoDataTab("mgm");
      setOverlayWeather(true);
      setDesktopGeoPanelOpen(true);
      setMenuOpen(false);
      return;
    }
    setMapMenuPanel(null);
    setOverlayWildfire(true);
    setDesktopGeoPanelOpen(false);
    setMenuOpen(false);
  };

  const MapMenuInfoPanel = () => {
    const recentTargets = [
      ...(selectedLocation ? [{
        id: `selected-${selectedLocation.id}`,
        name: selectedLocation.nameTr || selectedLocation.name,
        detail: selectedLocation.region || "Son seçilen konum",
        onClick: () => {
          leafletMapRef.current?.setView([selectedLocation.latitude, selectedLocation.longitude], selectedLocation.zoomLevel || 12, { animate: true });
          setLeftSidebarTab("isletmeler");
          setBusinessPanelMode("location");
        },
      }] : []),
      ...savedMapPlaces.map((place) => ({
        id: `saved-${place.id}`,
        name: place.name,
        detail: `Kaydedildi · ${place.address || `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`}`,
        onClick: () => {
          leafletMapRef.current?.setView([place.lat, place.lng], 16, { animate: true });
          setLeftSidebarTab("menu_info");
          setMapMenuPanel("recent");
          setDesktopGeoPanelOpen(true);
        },
      })),
      ...visibleBusinesses.slice(0, 5).map((biz) => ({
        id: `business-${biz.id}`,
        name: biz.name,
        detail: biz.address || catName(biz),
        onClick: () => {
          setSelectedBiz(biz);
          setDetailTab("overview");
          setLeftSidebarTab("isletmeler");
        },
      })),
    ].filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index).slice(0, 20);

    const showInfoShell = (icon: string, title: string, body: string, actions?: ReactElement) => (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl" aria-hidden="true">{icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>
            </div>
          </div>
        </div>
        {actions && <div className="mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">{actions}</div>}
      </div>
    );

    if (mapMenuPanel === "recent") {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
            <p className="text-sm font-extrabold text-slate-900">Son öğeler</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Kaydedilen konumlar, son seçimler ve harita sonuçları burada listelenir. Sol şeritte yalnızca ana kısayollar görünür.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={saveCurrentMapTarget} className="rounded-xl px-3 py-2 text-[11px] font-bold text-white" style={{ background: MAP_CHROME_GRAD }}>
                Mevcut konumu kaydet
              </button>
              <button type="button" onClick={() => setLeftSidebarTab("kayitlar")} className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
                Tüm kayıtları yönet
              </button>
            </div>
          </div>
          <div className="mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Bilgi katmanları</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <button type="button" onClick={() => openInfoOverlayPanel("afad")} className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-left text-xs font-bold text-rose-900 hover:bg-rose-100">
                <span>🌋 Depremler</span>
                <span className={overlayEarthquake ? "text-rose-700" : "text-slate-400"}>{overlayEarthquake ? "Açık" : "Aç"}</span>
              </button>
              <button type="button" onClick={() => openInfoOverlayPanel("mgm")} className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2 text-left text-xs font-bold text-sky-900 hover:bg-sky-100">
                <span>☁️ Hava durumu</span>
                <span className={overlayWeather ? "text-sky-700" : "text-slate-400"}>{overlayWeather ? "Açık" : "Aç"}</span>
              </button>
              <button type="button" onClick={() => openInfoOverlayPanel("wildfire")} className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2 text-left text-xs font-bold text-orange-900 hover:bg-orange-100">
                <span>🔥 Orman yangınları</span>
                <span className={overlayWildfire ? "text-orange-700" : "text-slate-400"}>{overlayWildfire ? "Açık" : "Aç"}</span>
              </button>
            </div>
          </div>
          <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
            {recentTargets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-center">
                <div className="text-3xl">🕘</div>
                <p className="mt-2 text-sm font-bold text-slate-700">Henüz son öğe yok</p>
                <p className="mt-1 text-xs text-slate-500">Haritada arama yaptıkça veya konum kaydettikçe burada görünür.</p>
              </div>
            ) : recentTargets.map((item) => (
              <button key={item.id} type="button" onClick={item.onClick} className="w-full rounded-2xl border border-emerald-100 bg-white p-3 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50">
                <p className="truncate text-sm font-extrabold text-slate-900">{item.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.detail}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (mapMenuPanel === "contributions") {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
            <p className="text-sm font-extrabold text-slate-900">Katkılarınız</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Eklediğiniz yer taslakları ve düzenleme önerileri burada listelenir.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => openAddPlacePanel()} className="rounded-xl px-3 py-2 text-[11px] font-bold text-white" style={{ background: MAP_CHROME_GRAD }}>Yeni katkı</button>
              <Link href="/isletme-basvuru" className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-[11px] font-bold text-emerald-800">İşletme ekle</Link>
            </div>
          </div>
          <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
            {userAddedPlaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-center">
                <div className="text-3xl">✍️</div>
                <p className="mt-2 text-sm font-bold text-slate-700">Henüz katkı yok</p>
                <p className="mt-1 text-xs text-slate-500">Eksik yer, işletme veya düzenleme önerisi ekleyerek başlayabilirsiniz.</p>
              </div>
            ) : userAddedPlaces.map((place) => <Fragment key={`contrib-${place.id}`}>{LocalPlaceCard({ place, kind: "user" })}</Fragment>)}
          </div>
        </div>
      );
    }

    if (mapMenuPanel === "timeline") {
      return showInfoShell("🕘", "Zaman çizelgeniz", "Ziyaret geçmişi ve yolculuk zaman çizelgesi için hesap tabanlı kayıt özelliği hazırlanıyor. Şu anda konum geçmişiniz burada tutulmuyor.");
    }

    if (mapMenuPanel === "data") {
      return showInfoShell("🛡️", "Haritalar'daki verileriniz", "Kaydedilen konumlarınız ve eklediğiniz yer taslakları bu cihazdaki liste ile yönetilir.",
        <div className="grid grid-cols-1 gap-2">
          <button type="button" onClick={() => setLeftSidebarTab("kayitlar")} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Kaydedilenleri yönet</button>
          <button type="button" onClick={() => setMapMenuPanel("contributions")} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Katkıları görüntüle</button>
        </div>);
    }

    if (mapMenuPanel === "tips") {
      return showInfoShell("💡", "İpuçları ve püf noktaları", "Arama çubuğundan işletme, adres veya kategori arayabilir; yıldızlı kaydetme, konum paylaşma ve haritadan yer ekleme araçlarını kullanabilirsiniz.",
        <div className="space-y-2 text-xs font-semibold text-slate-600">
          <p>• Harita merkezini kaydetmek için Kaydedildi panelindeki "Mevcut konumu kaydet" düğmesini kullanın.</p>
          <p>• Sol menüden bilgi katmanlarına, sağdaki düğmeden harita türü ve araçlara ulaşabilirsiniz.</p>
          <p>• Eksik yer eklerken "Haritadan seç" ile koordinatı doğrudan haritadan alabilirsiniz.</p>
        </div>);
    }

    if (mapMenuPanel === "wildfire") {
      return showInfoShell("🔥", "Orman yangınları", "NASA FIRMS uydu sıcak nokta katmanı sol menüdeki Yangın düğmesiyle açılır.",
        <button type="button" onClick={() => openInfoOverlayPanel("wildfire")} className="w-full rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#f97316,#dc2626)" }}>
          Yangın katmanını aç
        </button>);
    }

    if (mapMenuPanel === "help") {
      return showInfoShell("❔", "Yardım alın", "Harita, işletme kaydı veya konum paylaşımıyla ilgili destek için iletişim sayfasına geçebilirsiniz.",
        <div className="grid grid-cols-1 gap-2">
          <Link href="/iletisim" className="rounded-xl px-3 py-2 text-center text-xs font-bold text-white" style={{ background: MAP_CHROME_GRAD }}>İletişime geç</Link>
          <button type="button" onClick={() => setMapMenuPanel("tips")} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">İpuçlarına bak</button>
        </div>);
    }

    if (mapMenuPanel === "consumer") {
      return showInfoShell("ℹ️", "Tüketici bilgileri", "Platform kullanım koşulları, gizlilik ve alışveriş süreçleri için yasal bilgilendirme sayfalarına ulaşabilirsiniz.",
        <div className="grid grid-cols-1 gap-2">
          <Link href="/kullanim-kosullari" className="rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700">Kullanım koşulları</Link>
          <Link href="/kvkk" className="rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700">KVKK ve gizlilik</Link>
        </div>);
    }

    if (mapMenuPanel === "language") {
      return showInfoShell("🌐", "Dil", "Harita arayüzü şu anda Türkçe kullanılıyor. Çoklu dil seçimi açıldığında tercihlerinizi buradan değiştirebileceksiniz.",
        <button type="button" className="w-full rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ background: MAP_CHROME_GRAD }}>Türkçe seçili</button>);
    }

    return showInfoShell("⚙️", "Arama ayarları", "Arama sonuçları konum, kategori ve harita görünümünüze göre güncellenir. Filtreleri üstteki kategori çipleri ve sonuç panelinden değiştirebilirsiniz.",
      <div className="grid grid-cols-1 gap-2">
        <button type="button" onClick={() => { setSelectedCategory(null); setMapSuperCategory(null); setSearch(""); setSmartKeyword(""); openBusinessResultsPanel(); }} className="rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ background: MAP_CHROME_GRAD }}>Filtreleri temizle</button>
        <button type="button" onClick={() => setLeftSidebarTab("isletmeler")} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">İşletme sonuçlarına dön</button>
      </div>);
  };

  const renderGeoPanelBody = () => (
    <>
                {leftSidebarTab === "kayitlar" ? (
                  SavedPlacesPanel()
                ) : leftSidebarTab === "yer_ekle" ? (
                  AddPlacePanel()
                ) : leftSidebarTab === "menu_info" ? (
                  MapMenuInfoPanel()
                ) : leftSidebarTab === "newsmap" ? (
                  isNewsmapPage ? (
                    <div className="p-4 text-sm font-semibold text-slate-600">
                      Haberler, videolar ve bilgi harita altındaki Haber Haritası bandından açılır.
                    </div>
                  ) : showNewsmapLocationCityCard ? (
                    <NewsmapLocationPanel
                      key={selectedNewsmapCity || "newsmap-location-panel"}
                      locationLabel={newsmapBottomBandCityLabel || newsmapSidebarLocationLabel}
                      activeTab={newsmapLocationPanelTab}
                      onTabChange={handleNewsmapLocationTabChange}
                      hideBusinessesTab={isNewsmapPage}
                      hideVideosTab={isNewsmapPage}
                      hideWeather={isNewsmapPage}
                      headlines={isNewsmapPage ? newsmapPanelHeadlines : mapsPanelHeadlines}
                      isLoading={isNewsmapPage
                        ? newsmapSidebarPanelLoading
                        : (locationContentLoading && mapsPanelHeadlines.length === 0)}
                      onHeadlineClick={isNewsmapPage ? handleNewsmapHeadlineActivate : openNewsPreview}
                      onCityClick={isNewsmapPage ? (row) => handleNewsmapCityActivate(row, newsmapLocationPanelTab) : undefined}
                      inMapOverlayMode={isNewsmapPage}
                      onClose={closeLeftResultsPanel}
                      countryLabel={searchedLocationInfo?.areaInfo || searchedLocationInfo?.address || null}
                      heroImageUrls={searchedLocationInfo?.imageUrls?.length
                        ? searchedLocationInfo.imageUrls
                        : searchedLocationInfo?.imageUrl
                          ? [searchedLocationInfo.imageUrl]
                          : []}
                      heroLoading={searchedLocationEnrichmentLoading}
                      bilgiHref={newsmapBottomBandBilgiHref}
                      newsCount={(isNewsmapPage ? newsmapPanelHeadlines : mapsPanelHeadlines).filter((row) => row.kind === "news").length}
                      videoCount={(isNewsmapPage ? newsmapPanelHeadlines : mapsPanelHeadlines).filter((row) => row.kind === "video").length}
                      businessesSlot={(
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                          {ListPanel()}
                        </div>
                      )}
                    />
                  ) : (
                    <NewsmapSidebarPanel
                      headlines={mapsHybridEnabled && !isNewsmapPage ? mapsPanelHeadlines : newsmapSidebarDisplayHeadlines}
                      isLoading={mapsHybridEnabled && !isNewsmapPage
                        ? (locationContentLoading && mapsPanelHeadlines.length === 0)
                        : newsmapSidebarPanelLoading}
                      mode={mapsHybridEnabled && !isNewsmapPage ? mapsSidebarMode : newsmapSidebarMode}
                      linkMode={linkMode}
                      locationLabel={mapsHybridEnabled && !isNewsmapPage ? resolveMapsLocationCityLabel() : (newsmapBottomBandCityLabel || newsmapSidebarLocationLabel)}
                      onHeadlineClick={isNewsmapPage ? handleNewsmapHeadlineActivate : openNewsPreview}
                      onCityClick={isNewsmapPage ? (row) => handleNewsmapCityActivate(row) : undefined}
                      inMapOverlayMode={isNewsmapPage}
                      onClose={closeLeftResultsPanel}
                      showLangTabs={isNewsmapPage && !selectedNewsmapCity}
                      langTab={newsmapBottomBandTab}
                      onLangTabChange={handleNewsmapBottomBandTabChange}
                    />
                  )
                ) : leftSidebarTab === "isletmeler" ? (
                  selectedBiz ? (
                    DetailBody()
                  ) : businessPanelMode === "location" && searchedLocationInfo ? (
                    SearchedLocationCard()
                  ) : locationPanelTab !== "businesses" ? (
                    LocationInfoPanel()
                  ) : businessPanelMode === "categories" ? (
                    MapHomePanel()
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      {ListPanel()}
                    </div>
                  )
                ) : (
                  <>
                {geoDataTab === "harita"
                  ? LayerControls({ compact: isMobile, showParcel: false })
                  : null}
                {geoDataTab === "nav" && (
                  <div
                    className={`space-y-3 rounded-2xl p-3.5 border shadow-sm ${
                      isMobile
                        ? "border-indigo-200/70 bg-gradient-to-b from-white via-indigo-50/40 to-slate-50/90 shadow-[0_10px_36px_rgba(30,64,175,0.1)]"
                        : "border-indigo-200 bg-indigo-50"
                    }`}
                  >
                    <p className={`font-bold text-indigo-950 ${isMobile ? "text-[13px] tracking-tight" : "text-xs text-indigo-800"}`}>
                      Bulunduğunuz konum + hedef adres ile rota
                    </p>
                    <label className="flex items-center gap-2.5 text-[12px] font-medium text-indigo-900 cursor-pointer">
                      <input type="checkbox" checked={navUseGpsStart} onChange={(e) => setNavUseGpsStart(e.target.checked)} className="rounded border-indigo-300 text-indigo-600" />
                      Başlangıç için konumumu kullan
                    </label>
                    {!navUseGpsStart && (
                      <GooglePlaceOneLinePicker
                        mapsSettings={siteSettings ?? null}
                        compact
                        label="Başlangıç"
                        placeholder="Başlangıç adresi veya yer adı yazın..."
                        onPick={(r) => {
                          setNavStartInput(r.addressLine || r.label);
                          setNavStartPoint({ label: r.addressLine || r.label, lat: r.lat, lng: r.lng });
                        }}
                      />
                    )}
                    <GooglePlaceOneLinePicker
                      mapsSettings={siteSettings ?? null}
                      compact
                      label="Hedef"
                      placeholder="Hedef adresi veya yer adı yazın..."
                      onPick={(r) => {
                        setNavTargetInput(r.addressLine || r.label);
                        setNavTargetPoint({ label: r.addressLine || r.label, lat: r.lat, lng: r.lng });
                      }}
                    />
                    <div className={isMobile ? "flex flex-col gap-2" : "grid grid-cols-3 gap-1"}>
                      {[
                        { id: "car", label: "Araç" },
                        { id: "walk", label: "Yaya" },
                        { id: "transit", label: "Toplu taşıma" },
                      ].map((m) => (
                        <button
                          key={`desk-nav-mode-${m.id}`}
                          type="button"
                          onClick={() => setNavTransport(m.id as typeof navTransport)}
                          className={`rounded-xl font-semibold transition ${isMobile ? "w-full py-2.5 text-xs" : "px-2 py-1 text-[10px]"}`}
                          style={navTransport === m.id ? { background: "linear-gradient(135deg,#1d4ed8,#4338ca)", color: "#fff", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" } : { background: "#e0e7ff", color: "#1e3a8a" }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => { void startPanelNavigation(); }}
                      disabled={navPanelLoading}
                      className="w-full rounded-xl px-3 py-3 text-xs font-bold text-white disabled:opacity-60 shadow-md"
                      style={{ background: "linear-gradient(135deg,#2563eb,#4f46e5)" }}
                    >
                      {navPanelLoading ? "Rota oluşturuluyor…" : "Navigasyonu başlat"}
                    </button>
                  </div>
                )}
                {geoDataTab === "afad" && (
                  isMobile ? (
                    <div className="rounded-2xl border border-rose-200/55 bg-gradient-to-br from-rose-50/95 via-white to-slate-50 p-4 shadow-[0_8px_28px_rgba(190,18,60,0.09)]">
                      <p className="text-sm font-semibold text-rose-950 tracking-tight">Son depremler</p>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                        Depremler yalnızca haritada işaretlenir. Yakınlaştırmak için haritaya dokunun; sağdaki alanı kullanmak için çekmeceyi kapatabilirsiniz.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition active:scale-[0.99]"
                        style={{ background: "linear-gradient(135deg,#be123c,#9f1239)" }}
                      >
                        Haritaya dön
                      </button>
                    </div>
                  ) : (
                    afadRows.slice(0, 40).map((eq) => (
                      <button
                        key={`desk-eq-${eq.id}`}
                        type="button"
                        onClick={() => leafletMapRef.current?.setView([eq.latitude, eq.longitude], 10, { animate: true })}
                        className="w-full text-left rounded-lg px-2.5 py-2 border border-rose-100 bg-white shadow-sm hover:bg-rose-50/70 transition-colors"
                      >
                        <p className="text-[13px] font-semibold text-rose-950 tracking-tight leading-snug">
                          Büyüklük {eq.magnitude.toFixed(1)} · {eq.location}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {formatEarthquakeDateForUi(eq.date)} · {eq.depthKm.toFixed(1)} km
                          {eq.source ? (
                            <span className="text-slate-400 font-medium">
                              {" "}· {eq.source === "afad" ? "AFAD" : "Kandilli"}
                            </span>
                          ) : null}
                        </p>
                      </button>
                    ))
                  )
                )}
                {geoDataTab === "mgm" && (
                  isMobile ? (
                    <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50/95 via-white to-slate-50 p-4 shadow-[0_8px_28px_rgba(2,132,199,0.1)]">
                      <p className="text-sm font-semibold text-sky-950 tracking-tight">Hava durumu</p>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                        İl sıcaklıkları haritada gösterilir. Şehir seçmek için haritadaki işaretçilere dokunun.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition active:scale-[0.99]"
                        style={{ background: "linear-gradient(135deg,#0284c7,#0369a1)" }}
                      >
                        Haritaya dön
                      </button>
                    </div>
                  ) : (
                    mgmRows.slice(0, 40).map((w) => (
                      <button key={`desk-mgm-${w.city}-${w.lat}`} type="button" onClick={() => leafletMapRef.current?.setView([w.lat, w.lng], 9, { animate: true })} className="w-full text-left rounded-xl p-2 border border-sky-200 bg-sky-50">
                        <p className="text-xs font-bold text-sky-700">{w.city}</p>
                        <p className="text-[11px] text-sky-900/80">{weatherEmoji(Number(w.weatherCode || 1))} {Number.isFinite(w.temperature) ? `${Math.round(w.temperature)}°C` : "--°C"}</p>
                      </button>
                    ))
                  )
                )}
                {geoDataTab === "wildfire" && (
                  <div className="rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50/95 via-white to-slate-50 p-4 shadow-[0_8px_28px_rgba(234,88,12,0.1)]">
                    <p className="text-sm font-semibold text-orange-950 tracking-tight">Orman yangınları</p>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      NASA FIRMS uydu sıcak noktaları mevcut harita görünümüne göre yenilenir. İşaretçilere dokunarak kaynak, zaman ve güven bilgisini görebilirsiniz.
                    </p>
                    <div className="mt-3 rounded-xl border border-orange-100 bg-white/85 px-3 py-2 text-[11px] font-semibold text-orange-900">
                      {wildfireLoading
                        ? "Orman yangını verisi yükleniyor..."
                        : wildfireMessage || `${wildfireRows.length} sıcak nokta gösteriliyor.`}
                      {wildfireConfigured === false ? (
                        <span className="mt-1 block text-orange-700">Veri kaynağı yapılandırılmadı.</span>
                      ) : null}
                      {wildfireLastUpdate && wildfireConfigured !== false ? (
                        <span className="mt-1 block text-slate-500">Son kontrol: {formatWildfireDateForUi(wildfireLastUpdate.toISOString())}</span>
                      ) : null}
                    </div>
                    {isMobile ? (
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition active:scale-[0.99]"
                        style={{ background: "linear-gradient(135deg,#f97316,#dc2626)" }}
                      >
                        Haritaya dön
                      </button>
                    ) : (
                      <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {wildfireRows.slice(0, 45).map((fire) => (
                          <button
                            key={`desk-fire-${fire.id}`}
                            type="button"
                            onClick={() => leafletMapRef.current?.setView([fire.latitude, fire.longitude], Math.max(leafletMapRef.current?.getZoom() ?? 9, 10), { animate: true })}
                            className="w-full text-left rounded-xl px-2.5 py-2 border border-orange-100 bg-white shadow-sm hover:bg-orange-50/80 transition-colors"
                          >
                            <p className="text-[13px] font-semibold text-orange-950 tracking-tight leading-snug">
                              🔥 {wildfireConfidenceText(fire.confidence)} güven · {fire.satellite || fire.source || "FIRMS"}
                            </p>
                            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                              {formatWildfireDateForUi(fire.observedAt || fire.acqDate)}
                              {Number.isFinite(Number(fire.frp)) ? ` · ${Number(fire.frp).toFixed(1)} MW` : ""}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {geoDataTab === "population" && (
                  <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-slate-50 p-4 shadow-[0_8px_28px_rgba(109,40,217,0.08)]">
                    <p className="text-sm font-semibold text-violet-950 tracking-tight">Nüfus</p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Harita merkezindeki il / ilçe için mevcut resmi veri kaynağından nüfus bilgisi gösterilir.
                    </p>
                    {populationLoading ? (
                      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-violet-800">
                        <div className="h-4 w-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                        Nüfus verisi yükleniyor...
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {[
                          { label: "İl", row: populationInfo?.province },
                          { label: "İlçe", row: populationInfo?.district },
                          { label: "Mahalle", row: populationInfo?.neighborhood },
                        ].map(({ label, row }) => (
                          <div key={label} className="rounded-xl border border-violet-100 bg-white/85 px-3 py-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-violet-700">{label}</p>
                            {row?.name ? (
                              <p className="mt-0.5 text-sm font-bold text-slate-900">
                                {row.name}: {Number.isFinite(Number(row.population)) ? Number(row.population).toLocaleString("tr-TR") : "Veri yok"}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-sm font-semibold text-slate-500">Veri yok</p>
                            )}
                          </div>
                        ))}
                        {(populationInfo?.emptyStates ?? []).length > 0 && (
                          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                            {populationInfo!.emptyStates!.join(" ")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {geoDataTab === "kgm" && (
                  <div
                    className={`space-y-3 rounded-2xl p-3.5 border shadow-sm ${
                      isMobile
                        ? "border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 via-white to-slate-50/90 shadow-[0_10px_32px_rgba(15,118,110,0.08)]"
                        : "border-emerald-200 bg-emerald-50/40"
                    }`}
                  >
                    <p className={`font-bold text-emerald-950 ${isMobile ? "text-[13px] tracking-tight" : "text-xs text-emerald-900"}`}>Güzergah</p>
                    <div className={isMobile ? "flex flex-col gap-2" : "grid grid-cols-4 gap-1"}>
                      {([
                        { id: "kara" as const, label: "Kara yolu" },
                        { id: "hava" as const, label: "Havayolu" },
                        { id: "deniz" as const, label: "Denizyolu" },
                        { id: "demir" as const, label: "Demiryolu" },
                      ]).map((m) => (
                        <button
                          key={`desk-gz-${m.id}`}
                          type="button"
                          onClick={() => setGuzergahSubTab(m.id)}
                          className={`rounded-xl font-semibold text-center ${isMobile ? "w-full py-2.5 text-xs" : "px-1 py-1.5 text-[9px] leading-tight"}`}
                          style={guzergahSubTab === m.id ? { background: MAP_CHROME_GRAD, color: "#fff", boxShadow: "0 4px 12px rgba(15,118,110,0.28)" } : { background: YEKPARE_SADE_ACCENT_SOFT, color: YEKPARE_SADE_TEAL_DARK }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {guzergahSubTab === "kara" && (
                      <>
                        <p className="text-[11px] font-bold text-emerald-900">Kara yolu · KGM özeti</p>
                        <div className={isMobile ? "flex flex-col gap-2" : "grid grid-cols-2 gap-1.5"}>
                          <select value={kgmStartIl} onChange={(e) => { setKgmStartIl(e.target.value); setKgmStartIlce(""); }} className="rounded-xl px-3 py-2.5 text-xs border border-emerald-200/90 bg-white text-slate-800 shadow-sm"><option value="">Başlangıç İl</option>{parcelProvinces.map((p) => <option key={`desk-kgm-s-il-${p.plaka}`} value={String(p.plaka ?? "")}>{p.adi}</option>)}</select>
                          <select value={kgmStartIlce} onChange={(e) => setKgmStartIlce(e.target.value)} className="rounded-xl px-3 py-2.5 text-xs border border-emerald-200/90 bg-white text-slate-800 shadow-sm"><option value="">Başlangıç İlçe</option>{kgmStartDistricts.map((d) => <option key={`desk-kgm-s-ilce-${d.kimlikNo}`} value={String(d.kimlikNo ?? "")}>{d.adi}</option>)}</select>
                          <select value={kgmEndIl} onChange={(e) => { setKgmEndIl(e.target.value); setKgmEndIlce(""); }} className="rounded-xl px-3 py-2.5 text-xs border border-emerald-200/90 bg-white text-slate-800 shadow-sm"><option value="">Varış İl</option>{parcelProvinces.map((p) => <option key={`desk-kgm-e-il-${p.plaka}`} value={String(p.plaka ?? "")}>{p.adi}</option>)}</select>
                          <select value={kgmEndIlce} onChange={(e) => setKgmEndIlce(e.target.value)} className="rounded-xl px-3 py-2.5 text-xs border border-emerald-200/90 bg-white text-slate-800 shadow-sm"><option value="">Varış İlçe</option>{kgmEndDistricts.map((d) => <option key={`desk-kgm-e-ilce-${d.kimlikNo}`} value={String(d.kimlikNo ?? "")}>{d.adi}</option>)}</select>
                        </div>
                        <div className={isMobile ? "flex flex-col gap-2" : "grid grid-cols-3 gap-1"}>
                          {[{ id: "fastest", label: "En Hızlı" }, { id: "shortest", label: "En Kısa" }, { id: "free", label: "Parasız" }].map((m) => (
                            <button key={`desk-kgm-mode-${m.id}`} type="button" onClick={() => setKgmMode(m.id as typeof kgmMode)} className={`rounded-xl font-bold ${isMobile ? "w-full py-2.5 text-xs" : "px-1.5 py-1 text-[10px]"}`} style={kgmMode === m.id ? { background: YEKPARE_SADE_TEAL, color: "#fff" } : { background: YEKPARE_SADE_ACCENT_SOFT, color: YEKPARE_SADE_TEAL_DARK }}>{m.label}</button>
                          ))}
                        </div>
                        <div className={isMobile ? "flex flex-col gap-2" : "grid grid-cols-2 gap-1"}>
                          {[{ id: "car", label: "Otomobil" }, { id: "truck", label: "Tır / Kamyon" }].map((v) => (
                            <button key={`desk-kgm-vehicle-${v.id}`} type="button" onClick={() => setKgmVehicle(v.id as typeof kgmVehicle)} className={`rounded-xl font-bold ${isMobile ? "w-full py-2.5 text-xs" : "px-1.5 py-1 text-[10px]"}`} style={kgmVehicle === v.id ? { background: YEKPARE_SADE_ACCENT_DARK, color: "#fff" } : { background: "#ecfdf5", color: YEKPARE_SADE_TEAL_DARK }}>{v.label}</button>
                          ))}
                        </div>
                        <div className={`flex flex-col gap-2 text-xs text-emerald-950 ${isMobile ? "" : "grid grid-cols-2"}`}>
                          <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="rounded border-emerald-400 text-emerald-700" checked={kgmOptions.includeRoadWorks} onChange={(e) => setKgmOptions((s) => ({ ...s, includeRoadWorks: e.target.checked }))} /> Yol çalışması</label>
                          <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="rounded border-emerald-400 text-emerald-700" checked={kgmOptions.includeClosures} onChange={(e) => setKgmOptions((s) => ({ ...s, includeClosures: e.target.checked }))} /> Kapalı yollar</label>
                        </div>
                        <p className="text-[10px] text-emerald-900/75 leading-relaxed">Özet: OpenStreetMap (yaklaşık). Yol çalışması ve kapalı yol noktaları rota boyunca gösterilir.</p>
                        <button type="button" onClick={() => { void runKgmRouteAnalysis(); }} disabled={kgmLoading || !kgmStartIl || !kgmStartIlce || !kgmEndIl || !kgmEndIlce} className="w-full rounded-xl px-3 py-3 text-xs font-bold text-white disabled:opacity-60 shadow-md" style={{ background: MAP_CHROME_GRAD }}>
                          {kgmLoading ? "KGM analiz çekiliyor…" : "Güzergah analizini çalıştır"}
                        </button>
                        {kgmResult && (
                          <div className="rounded-lg p-2 border border-emerald-200 bg-white space-y-1">
                            <p className="text-[11px] font-bold text-emerald-800">{kgmResult.routeName || "KGM Rota Sonucu"}</p>
                            <p className="text-[11px] text-slate-700">Mesafe: <b>{kgmResult.distanceText || `${(kgmResult.distanceKm ?? 0).toFixed(1)} km`}</b> · Süre: <b>{kgmResult.durationText || `${Math.round(kgmResult.durationMin ?? 0)} dk`}</b></p>
                            <p className="text-[10px] text-slate-600">Yol çalışması: <b>{kgmResult.context?.roadWorks?.length ?? 0}</b> · Kapalı yol: <b>{kgmResult.context?.closedRoads?.length ?? 0}</b></p>
                            <p className="text-[10px] text-slate-600">Yol çalışması noktaları: {(kgmResult.context?.roadWorks ?? []).slice(0, 3).map((x) => x.name).join(", ") || "Yok"}</p>
                            <p className="text-[10px] text-slate-600">Kapalı yol noktaları: {(kgmResult.context?.closedRoads ?? []).slice(0, 3).map((x) => x.name).join(", ") || "Yok"}</p>
                          </div>
                        )}
                      </>
                    )}
                    {guzergahSubTab === "hava" && (
                      <FlightTrafficPanel
                        variant={isMobile ? "mobile" : "desktop"}
                        flightRegion={flightRegion}
                        setFlightRegion={setFlightRegion}
                        flightOperatorFilter={flightOperatorFilter}
                        setFlightOperatorFilter={setFlightOperatorFilter}
                        flightAirportIcao={flightAirportIcao}
                        setFlightAirportIcao={setFlightAirportIcao}
                        hideOnGround={flightHideOnGround}
                        setHideOnGround={setFlightHideOnGround}
                        flightRows={flightRows}
                        flightLoading={flightLoading}
                        flightError={flightError}
                        flightLastUpdate={flightLastUpdate}
                        onRefresh={() => setFlightRefreshNonce((n) => n + 1)}
                        onSelectAircraft={(a) => leafletMapRef.current?.setView([a.lat, a.lng], 11, { animate: true })}
                      />
                    )}
                    {guzergahSubTab === "deniz" && (
                      <MobilityComingSoonPanel
                        title="Deniz trafiği (AIS)"
                        blurb="Tanker, yük ve yolcu gemilerini anlık izleme ve liman yoğunluğu yakında."
                      />
                    )}
                    {guzergahSubTab === "demir" && (
                      <MobilityComingSoonPanel
                        title="Demir yolu"
                        blurb="YHT, bölgesel tren ve mümkün olduğunda GTFS-Realtime verileri yakında."
                      />
                    )}
                  </div>
                )}
                  </>
                )}
    </>
  );

  const closeMapSideMenu = useCallback((ev?: { stopPropagation?: () => void }) => {
    ev?.stopPropagation?.();
    setMenuOpen(false);
  }, []);

  /* ─────────────────── SLIDE-OUT MENU ─────────────────── */
  const SideMenu = () => {
    const drawerSectionTitle =
      leftSidebarTab === "kayitlar"
        ? "Kaydedilenler"
        : leftSidebarTab === "yer_ekle"
          ? "Yer / İşletme ekle"
          : leftSidebarTab === "newsmap"
            ? newsmapKindFilter === "video"
              ? "Video"
              : newsmapKindFilter === "news"
                ? "Son Dakika"
                : "Haber Haritası"
          : leftSidebarTab === "isletmeler" && businessPanelMode === "location" && searchedLocationInfo
            ? searchedLocationInfo.title
          : leftSidebarTab === "isletmeler"
        ? "İşletmeler"
          : geoDataTab === "harita"
          ? "Katmanlar"
          : geoDataTab === "nav"
            ? "Navigasyon"
            : geoDataTab === "afad"
              ? "Son Depremler"
              : geoDataTab === "mgm"
                ? "Hava Durumu"
                : geoDataTab === "wildfire"
                  ? "Orman Yangınları"
                : "Güzergah";
    const openMenuInfoPanel = (panel: MapMenuPanelId) => {
      setMapMenuPanel(panel);
      setLeftSidebarTab("menu_info");
      setDesktopGeoPanelOpen(true);
      setMenuOpen(false);
    };
    const openSavedMenuPanel = () => {
      setMapMenuPanel(null);
      setLeftSidebarTab("kayitlar");
      setDesktopGeoPanelOpen(true);
      setMenuOpen(false);
    };
    const openAddPlaceMenuPanel = () => {
      setMapMenuPanel(null);
      openAddPlacePanel();
      setDesktopGeoPanelOpen(true);
      setMenuOpen(false);
    };
    const menuRowClass = "haritalar-expanded-menu__row";
    const MenuRow = ({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) => (
      <button type="button" className={menuRowClass} onClick={onClick}>
        <span className="haritalar-expanded-menu__icon" aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </button>
    );
    return (
    <>
      {menuOpen ? (
        <button
          type="button"
          aria-label="Harita menüsünü kapat"
          className="fixed haritalar-side-menu-scrim top-0 z-[10070] border-0 bg-slate-900/35 backdrop-blur-[2px] transition-opacity"
          style={{ right: 0, bottom: 0 }}
          onClick={() => closeMapSideMenu()}
        />
      ) : null}
      <div
        className={`fixed haritalar-side-menu-panel top-0 left-0 z-[10075] flex flex-col transition-transform duration-300 ease-out ${
          isMobile
            ? "overflow-hidden rounded-r-[1.25rem] border-r border-white/15 shadow-[8px_0_40px_rgba(15,23,42,0.28)]"
            : "overflow-hidden shadow-2xl"
        } bg-white ${menuOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"}`}
        style={{ height: "100dvh" }}
        aria-hidden={!menuOpen}
      >
        {isMobile ? (
          <div
            className="shrink-0 px-4 py-3.5 text-white"
            style={{
              background: MAP_CHROME_GRAD,
              boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white font-black text-lg border border-white/25 shrink-0 shadow-inner">A</div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm leading-tight tracking-tight">Yekpare</p>
                  <p className="text-[10px] text-blue-100/90 truncate font-medium">{drawerSectionTitle}</p>
                </div>
              </div>
              <MapPanelCloseButton onClick={() => closeMapSideMenu()} variant="dark" />
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 shrink-0 text-white" style={{ background: MAP_CHROME_GRAD }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-black text-lg border border-white/30 shrink-0">A</div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm leading-tight">Yekpare</p>
                  <p className="text-[10px] text-blue-200 truncate">Keşfet & Haritalar</p>
                </div>
              </div>
              <MapPanelCloseButton onClick={() => closeMapSideMenu()} variant="dark" />
            </div>
          </div>
        )}

        {isMobile ? (
          <>
            {selectedLocation || searchedLocationInfo || selectedNewsmapCity ? (
              <div className="shrink-0 border-b border-slate-200/80 bg-white px-3 py-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
                  onClick={() => {
                    exitLocationView();
                  }}
                >
                  <span aria-hidden="true">↩</span>
                  Konumdan çık — Türkiye görünümüne dön
                </button>
              </div>
            ) : null}
            <div
              className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-slate-50 via-white to-slate-50/80"
              style={{ scrollbarWidth: "thin" }}
            >
              {renderGeoPanelBody()}
            </div>
            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm">
              <Link href="/isletme-basvuru" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline decoration-emerald-300 underline-offset-2">
                İşletmenizi ekleyin →
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="haritalar-expanded-menu">
              {selectedLocation || searchedLocationInfo || selectedNewsmapCity ? (
                <div className="haritalar-expanded-menu__section">
                  {MenuRow({
                    icon: "↩",
                    label: "Konumdan çık — Türkiye görünümüne dön",
                    onClick: () => { setMenuOpen(false); exitLocationView(); },
                  })}
                </div>
              ) : null}
              <div className="haritalar-expanded-menu__section">
                <button
                  type="button"
                  className="haritalar-expanded-menu__row"
                  onClick={() => setDesktopGeoPanelOpen((open) => !open)}
                  aria-pressed={desktopGeoPanelOpen}
                >
                  <span className="haritalar-expanded-menu__icon" aria-hidden="true">▥</span>
                  <span className="min-w-0 flex-1">Kenar çubuğunu göster</span>
                  <span className={`haritalar-expanded-menu__switch${desktopGeoPanelOpen ? " is-on" : ""}`} aria-hidden="true">
                    <span />
                  </span>
                </button>
                <button
                  type="button"
                  className="haritalar-expanded-menu__row"
                  onClick={() => setServerClusterEnabled((s) => !s)}
                  aria-pressed={serverClusterEnabled}
                >
                  <span className="haritalar-expanded-menu__icon" aria-hidden="true">📍</span>
                  <span className="min-w-0 flex-1">
                    Kümeleme
                    <span className="block text-[10px] font-semibold text-slate-500">
                      {serverClusterEnabled
                        ? serverClusterLoading
                          ? "Kümeler yenileniyor"
                          : serverClusterStats
                            ? `${serverClusterStats.clusters} küme · ${serverClusterStats.points} nokta`
                            : "Harita işaretçileri kümeleniyor"
                        : "Harita işaretçileri tek tek gösterilir"}
                    </span>
                  </span>
                  <span className={`haritalar-expanded-menu__switch${serverClusterEnabled ? " is-on" : ""}`} aria-hidden="true">
                    <span />
                  </span>
                </button>
              </div>
              <div className="haritalar-expanded-menu__section">
                {MenuRow({ icon: "🔖", label: "Kaydedildi", onClick: openSavedMenuPanel })}
                {MenuRow({ icon: "🕘", label: "Son öğeler", onClick: () => openMenuInfoPanel("recent") })}
                {MenuRow({ icon: "🌋", label: "Depremler", onClick: () => openInfoOverlayPanel("afad") })}
                {MenuRow({ icon: "☁️", label: "Hava durumu", onClick: () => openInfoOverlayPanel("mgm") })}
                {MenuRow({ icon: "🔥", label: "Orman yangınları", onClick: () => openInfoOverlayPanel("wildfire") })}
                {MenuRow({ icon: "✍️", label: "Katkılarınız", onClick: () => openMenuInfoPanel("contributions") })}
              </div>
              <div className="haritalar-expanded-menu__section">
                {MenuRow({ icon: "📍", label: "Konum paylaşımı", onClick: () => { setMapShareOpen(true); setMenuOpen(false); } })}
                {MenuRow({ icon: "〽️", label: "Zaman çizelgeniz", onClick: () => openMenuInfoPanel("timeline") })}
                {MenuRow({ icon: "🛡️", label: "Haritalar'daki verileriniz", onClick: () => openMenuInfoPanel("data") })}
              </div>
              <div className="haritalar-expanded-menu__section">
                {MenuRow({ icon: "🔗", label: "Paylaşın veya harita yerleştirin", onClick: () => { setMapShareOpen(true); setMenuOpen(false); } })}
                {MenuRow({ icon: "🖨️", label: "Yazdır", onClick: () => { window.print(); setMenuOpen(false); } })}
                {MenuRow({ icon: "+", label: "Eksik bir yeri ekleyin", onClick: openAddPlaceMenuPanel })}
                {MenuRow({ icon: "🏢", label: "İşletmenizi ekleyin", onClick: () => { setMenuOpen(false); navigate("/isletme-basvuru"); } })}
                {MenuRow({ icon: "📝", label: "Haritayı düzenleyin", onClick: () => openMenuInfoPanel("contributions") })}
              </div>
              <div className="haritalar-expanded-menu__section">
                {MenuRow({ icon: "💡", label: "İpuçları ve püf noktaları", onClick: () => openMenuInfoPanel("tips") })}
                {MenuRow({ icon: "❔", label: "Yardım alın", onClick: () => openMenuInfoPanel("help") })}
                {MenuRow({ icon: "ℹ️", label: "Tüketici bilgileri", onClick: () => openMenuInfoPanel("consumer") })}
              </div>
              <div className="haritalar-expanded-menu__section">
                {MenuRow({ icon: "Dil", label: "Dil", onClick: () => openMenuInfoPanel("language") })}
                {MenuRow({ icon: "⚙️", label: "Arama ayarları", onClick: () => openMenuInfoPanel("search_settings") })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
    );
  };

  async function submitParcelQuery(): Promise<void> {
    if (!parcelForm.il.trim()) {
      showToast("Cizim icin il secimi zorunlu");
      return;
    }
    setParcelQueryLoading(true);
    try {
      const ilName = parcelProvinces.find((x) => String(x.plaka ?? "") === parcelForm.il)?.adi ?? "";
      const ilceName = parcelDistricts.find((x) => String(x.kimlikNo ?? "") === parcelForm.ilce)?.adi ?? "";
      const mahalleName = parcelNeighborhoods.find((x) => String(x.kimlikNo ?? "") === parcelForm.mahalle)?.adi ?? "";
      if (!ilName) {
        showToast("Il secimi zorunlu");
        return;
      }
      const levelLabel = mahalleName ? "Mahalle siniri" : ilceName ? "Ilce siniri" : "Il siniri";
      setParcelResultInfo(`${levelLabel} cizimi hazirlandi · ${ilName}${ilceName ? ` / ${ilceName}` : ""}${mahalleName ? ` / ${mahalleName}` : ""}`);
        setParcelRecentQueries((prev) => {
          const current = {
            il: parcelForm.il.trim(), // plaka
            ilce: parcelForm.ilce.trim(), // ilce kimlik
            mahalle: parcelForm.mahalle.trim(), // mahalle kimlik
            adres: parcelForm.adres.trim(),
            ada: "",
            parsel: "",
          };
          const deduped = prev.filter((x) =>
            !(x.il === current.il
              && x.ilce === current.ilce
              && x.mahalle === current.mahalle
              && x.adres === current.adres
              && x.ada === current.ada
              && x.parsel === current.parsel));
          const next = [current, ...deduped].slice(0, 5);
          try { localStorage.setItem("ahenk_parcel_recent_queries", JSON.stringify(next)); } catch {}
          return next;
        });
        const locQuery = [parcelForm.adres, mahalleName, ilceName, ilName, "Türkiye"]
          .map((v) => v.trim())
          .filter(Boolean)
          .join(", ");
        if (leafletMapRef.current) {
          try {
            const mahalleCore = mahalleName
              .replace(/mahallesi/gi, "")
              .replace(/mah\./gi, "")
              .trim();
            const candidates = [
              locQuery,
              [mahalleName, ilceName, ilName, "Türkiye"].filter(Boolean).join(", "),
              [mahalleCore, ilceName, ilName, "Türkiye"].filter(Boolean).join(", "),
              [ilceName, ilName, "Türkiye"].filter(Boolean).join(", "),
              [ilName, "Türkiye"].filter(Boolean).join(", "),
            ].filter((q, idx, arr) => q.length > 0 && arr.indexOf(q) === idx);

            let gj: Array<{
              lat?: string;
              lon?: string;
              boundingbox?: [string, string, string, string];
              geojson?: {
                type?: string;
                coordinates?: unknown;
              };
            }> = [];
            for (const q of candidates) {
              const g = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=tr&format=json&limit=1&polygon_geojson=1`, {
                headers: { "Accept-Language": "tr", "User-Agent": "Yekpare/1.0" },
              });
              gj = await g.json() as typeof gj;
              if (Array.isArray(gj) && gj.length > 0) break;
            }

            let lat = Number(gj?.[0]?.lat);
            let lng = Number(gj?.[0]?.lon);
            let usedApproximateFallback = false;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              const fallback = await geocodeTrLabel([ilceName, ilName].filter(Boolean).join(", "));
              if (fallback) {
                lat = fallback.lat;
                lng = fallback.lng;
                usedApproximateFallback = true;
              }
            }
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              const map = leafletMapRef.current;
              map.setView([lat, lng], 16, { animate: true });
              if (parcelMarkerRef.current) {
                parcelMarkerRef.current.remove();
                parcelMarkerRef.current = null;
              }
              if (parcelShapeRef.current) {
                parcelShapeRef.current.remove();
                parcelShapeRef.current = null;
              }
              const txt = `${ilName}${ilceName ? ` / ${ilceName}` : ""}${mahalleName ? ` / ${mahalleName}` : ""}`;
              parcelMarkerRef.current = L.marker([lat, lng]).addTo(map);
              parcelMarkerRef.current.bindPopup(`<div><strong>Cizim odagi</strong><br/>${txt}</div>`).openPopup();
              const hit = gj?.[0];
              const geo = hit?.geojson;
              if (geo && (geo.type === "Polygon" || geo.type === "MultiPolygon")) {
                const feat: GeoJSON.Feature = {
                  type: "Feature",
                  geometry: geo as GeoJSON.Geometry,
                  properties: {},
                };
                const gjLayer = L.geoJSON(feat, {
                  style: { color: "#dc2626", weight: 2, fillColor: "#f87171", fillOpacity: 0.12 },
                }).addTo(map);
                parcelShapeRef.current = gjLayer;
                try {
                  const b = gjLayer.getBounds();
                  if (b.isValid()) map.fitBounds(b.pad(0.2), { animate: true });
                } catch {
                  // keep marker-centered zoom
                }
              } else if (hit?.boundingbox && hit.boundingbox.length === 4) {
                const south = Number(hit.boundingbox[0]);
                const north = Number(hit.boundingbox[1]);
                const west = Number(hit.boundingbox[2]);
                const east = Number(hit.boundingbox[3]);
                if ([south, north, west, east].every((n) => Number.isFinite(n))) {
                  parcelShapeRef.current = L.polygon(
                    [[south, west], [south, east], [north, east], [north, west]],
                    { color: "#dc2626", weight: 2, fillColor: "#f87171", fillOpacity: 0.1 },
                  ).addTo(map);
                  map.fitBounds((parcelShapeRef.current as L.Polygon).getBounds().pad(0.2), { animate: true });
                }
              } else {
                const dLat = ilceName ? 0.01 : 0.08;
                const dLng = ilceName ? 0.014 : 0.1;
                parcelShapeRef.current = L.polygon(
                  [[lat - dLat, lng - dLng], [lat - dLat, lng + dLng], [lat + dLat, lng + dLng], [lat + dLat, lng - dLng]],
                  { color: "#dc2626", weight: 2, fillColor: "#f87171", fillOpacity: 0.1 },
                ).addTo(map);
              }
              if (usedApproximateFallback) showToast("Secilen bolge icin yaklasik cizim gosterildi.");
            } else {
              showToast("Cizim konumu bulunamadi. Il/ilce/mahalle secimini kontrol edin.");
            }
          } catch {
            showToast("Cizim konumu alinamadi. Tekrar deneyin.");
          }
        }
    } catch {
      showToast("Cizim servisine ulasilamadi");
    } finally {
      setParcelQueryLoading(false);
    }
  }

  async function geocodeNavTarget(payload: {
    city: string;
    district: string;
    mahalle: string;
    street: string;
    extra: string;
    q: string;
  }): Promise<{ lat: number; lng: number } | null> {
    try {
      const r = await fetch(mapApiUrl("/tr-address/forward-geocode"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json() as { success?: boolean; lat?: number; lng?: number };
      if (!r.ok || !d.success || !Number.isFinite(Number(d.lat)) || !Number.isFinite(Number(d.lng))) return null;
      return { lat: Number(d.lat), lng: Number(d.lng) };
    } catch {
      return null;
    }
  }

  async function geocodeTrLabel(label: string): Promise<{ lat: number; lng: number } | null> {
    const trimmed = label.trim();
    if (trimmed.length < 2) return null;
    return geocodeNavTarget({ city: "", district: "", mahalle: "", street: "", extra: "", q: trimmed });
  }

  async function runKgmRouteAnalysis(): Promise<void> {
    const sIl = parcelProvinces.find((x) => String(x.plaka ?? "") === kgmStartIl)?.adi ?? "";
    const eIl = parcelProvinces.find((x) => String(x.plaka ?? "") === kgmEndIl)?.adi ?? "";
    const sIlce = kgmStartDistricts.find((x) => String(x.kimlikNo ?? "") === kgmStartIlce)?.adi ?? "";
    const eIlce = kgmEndDistricts.find((x) => String(x.kimlikNo ?? "") === kgmEndIlce)?.adi ?? "";
    if (!sIl || !eIl) {
      showToast("KGM analizi için başlangıç ve varış ili seçin");
      return;
    }
    setKgmLoading(true);
    try {
      const startLabel = [sIlce, sIl].filter(Boolean).join(", ");
      const endLabel = [eIlce, eIl].filter(Boolean).join(", ");
      const [start, end] = await Promise.all([geocodeTrLabel(startLabel), geocodeTrLabel(endLabel)]);
      if (!start || !end) {
        showToast("Konumlar geocode edilemedi");
        return;
      }
      const r = await fetch(mapApiUrl("/map/kgm/route-analysis"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startLat: start.lat,
          startLng: start.lng,
          endLat: end.lat,
          endLng: end.lng,
          mode: kgmMode,
          vehicle: kgmVehicle,
          ...kgmOptions,
        }),
      });
      const d = await r.json() as {
        success?: boolean;
        data?: {
          distanceKm: number | null;
          durationMin: number | null;
          distanceText?: string;
          durationText?: string;
          routeName: string;
          paths?: number[][][];
          directions: Array<{ text: string; lengthKm: number; timeMin: number }>;
          context?: {
            roadWorks: Array<{ name: string; lat: number; lng: number; detail?: string }>;
            closedRoads: Array<{ name: string; lat: number; lng: number; detail?: string }>;
            poiStops: Array<{ name: string; lat: number; lng: number; detail?: string }>;
            trafficLevel: "dusuk" | "orta" | "yuksek";
            trafficNote: string;
          };
        };
        error?: string;
      };
      if (!d.success || !d.data) {
        showToast(d.error || "KGM rota analizi alınamadı");
        return;
      }
      setKgmResult({
        distanceKm: d.data.distanceKm,
        durationMin: d.data.durationMin,
        distanceText: d.data.distanceText,
        durationText: d.data.durationText,
        routeName: d.data.routeName,
        directions: Array.isArray(d.data.directions) ? d.data.directions : [],
        context: d.data.context,
      });
      if (kgmRouteRef.current) {
        kgmRouteRef.current.clearLayers();
        for (const path of d.data.paths ?? []) {
          const latlngs = path
            .map((p) => ({ lat: Number(p?.[1]), lng: Number(p?.[0]) }))
            .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
            .map((p) => [p.lat, p.lng] as [number, number]);
          if (latlngs.length < 2) continue;
          L.polyline(latlngs, { color: "#ea580c", weight: 4, opacity: 0.9 }).addTo(kgmRouteRef.current);
        }
      }
      if (kgmContextRef.current) {
        kgmContextRef.current.clearLayers();
        const addDot = (lat: number, lng: number, color: string, label: string, detail?: string) => {
          const marker = L.circleMarker([lat, lng], { radius: 5, color, weight: 2, fillColor: color, fillOpacity: 0.85 });
          marker.bindPopup(`<div><strong>${label}</strong>${detail ? `<br/>${detail}` : ""}</div>`);
          marker.addTo(kgmContextRef.current!);
        };
        (d.data.context?.roadWorks ?? []).forEach((x) => addDot(x.lat, x.lng, "#f97316", x.name, x.detail));
        (d.data.context?.closedRoads ?? []).forEach((x) => addDot(x.lat, x.lng, "#dc2626", x.name, x.detail));
        (d.data.context?.poiStops ?? []).forEach((x) => addDot(x.lat, x.lng, "#2563eb", x.name, x.detail));
      }
      if (leafletMapRef.current) {
        const bounds = L.latLngBounds([[start.lat, start.lng], [end.lat, end.lng]]);
        leafletMapRef.current.fitBounds(bounds.pad(0.3), { animate: true });
      }
      setLeftSidebarTab("temel_haritalar");
      setGeoDataTab("kgm");
    } catch {
      showToast("KGM güzergah servisine ulaşılamadı");
    } finally {
      setKgmLoading(false);
    }
  }

  function runParcelAnalysis(): void {
    const map = leafletMapRef.current;
    if (!map) return;
    let center: { lat: number; lng: number } | null = null;
    if (parcelMarkerRef.current) {
      const c = parcelMarkerRef.current.getLatLng();
      center = { lat: c.lat, lng: c.lng };
    } else if (parcelShapeRef.current && "getBounds" in parcelShapeRef.current) {
      const b = (parcelShapeRef.current as L.Polygon | L.GeoJSON).getBounds();
      if (b.isValid()) {
        const c = b.getCenter();
        center = { lat: c.lat, lng: c.lng };
      }
    }
    if (!center) {
      showToast("Once bir il/ilce/mahalle cizimi yapin.");
      return;
    }
    const toKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const near1 = businesses.filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude) && toKm(center!.lat, center!.lng, b.latitude!, b.longitude!) <= 1).length;
    const near5 = businesses.filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude) && toKm(center!.lat, center!.lng, b.latitude!, b.longitude!) <= 5).length;
    if (parcelAnalysisLayerRef.current) parcelAnalysisLayerRef.current.clearLayers();
    if (parcelAnalysisLayerRef.current) {
      L.circle([center.lat, center.lng], { radius: 1000, color: "#0ea5e9", weight: 1.8, fillOpacity: 0.05 }).addTo(parcelAnalysisLayerRef.current);
      L.circle([center.lat, center.lng], { radius: 5000, color: "#7c3aed", weight: 1.4, fillOpacity: 0.04 }).addTo(parcelAnalysisLayerRef.current);
    }
    setParcelAnalysisInfo(`1 km: ${near1} işletme · 5 km: ${near5} işletme`);
    map.setView([center.lat, center.lng], Math.max(map.getZoom(), 14), { animate: true });
  }

  const friendlyAdvancedLayerLabel = (label: string) =>
    label
      .replace(/\s*\((?:WMS|WMTS|Tile)\)\s*/gi, "")
      .replace("NASA True Color", "Uydu Görünümü")
      .replace("NASA Gece Isiklari", "Gece Işıkları")
      .replace("Vektor Cizgi", "Harita Çizgileri");

  const LayerControls = ({ compact = false, showParcel = true }: { compact?: boolean; showParcel?: boolean }) => (
    <div className={`${compact ? "w-[250px]" : "w-full"} rounded-2xl p-3 text-[11px] text-slate-800`}
      style={{ background: "linear-gradient(180deg,#eef2ff 0%, #e0e7ff 100%)", border: "1px solid rgba(99,102,241,0.28)", backdropFilter: "blur(8px)" }}>
      <p className="font-bold mb-2">Temel Harita</p>
      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-1.5 mb-3`}>
        {baseLayersForUi.map(({ id, label }) => (
          <button key={id} type="button" disabled={!canUserCustomizeLayers} onClick={() => setBaseMapStyle(id as typeof baseMapStyle)}
            className="rounded-lg px-2 py-1 text-left"
            style={baseMapStyle === id ? { background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.5)" } : { background: "rgba(255,255,255,0.65)", border: "1px solid rgba(99,102,241,0.22)" }}>
            {label}
          </button>
        ))}
      </div>
      {(newsMapEnabled || mapsHybridEnabled) ? (
        <MapContentLayerControls mapContentLayers={mapContentLayers} onToggle={toggleMapContentLayer} compact={compact} />
      ) : null}
      <p className="font-bold mb-1.5">Veri Katmanları</p>
      <div className={`${compact ? "space-y-1" : "grid grid-cols-2 gap-y-1"} mb-3`}>
        {[
          { id: "earthquake", v: overlayEarthquake, setter: setOverlayEarthquake, label: OVERLAY_LAYER_LABELS.earthquake },
          { id: "weather", v: overlayWeather, setter: setOverlayWeather, label: OVERLAY_LAYER_LABELS.weather },
          { id: "wildfire", v: overlayWildfire, setter: setOverlayWildfire, label: "Orman Yangınları" },
          { id: "dutyPharmacy", v: overlayDutyPharmacy, setter: setOverlayDutyPharmacy, label: OVERLAY_LAYER_LABELS.dutyPharmacy },
          { id: "population", v: overlayPopulation, setter: setOverlayPopulation, label: OVERLAY_LAYER_LABELS.population },
          { id: "elevation", v: overlayElevation, setter: setOverlayElevation, label: OVERLAY_LAYER_LABELS.elevation },
          { id: "raster", v: overlayRaster, setter: setOverlayRaster, label: OVERLAY_LAYER_LABELS.raster },
          { id: "geodesyGrid", v: overlayGeodesyGrid, setter: setOverlayGeodesyGrid, label: OVERLAY_LAYER_LABELS.geodesyGrid },
        ]
          .filter((x) => (adminLayerConfig?.overlays ? adminLayerConfig.overlays.some((o) => o.id === x.id && o.enabled) : true))
          .sort((a, b) => {
            const ao = adminLayerConfig?.overlays?.find((o) => o.id === a.id)?.sortOrder ?? 999;
            const bo = adminLayerConfig?.overlays?.find((o) => o.id === b.id)?.sortOrder ?? 999;
            return ao - bo;
          })
          .map(({ v, setter, label }) => (
          <label key={label} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" disabled={!canUserCustomizeLayers} checked={v} onChange={(e) => setter(e.target.checked)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-indigo-800">Katman Opaklığı</p>
          <span className="text-[10px] text-indigo-700/80">%{Math.round(overlayOpacity * 100)}</span>
        </div>
        <input
          type="range"
          min={15}
          max={100}
          disabled={!canUserCustomizeLayers}
          value={Math.round(overlayOpacity * 100)}
          onChange={(e) => setOverlayOpacity(Math.max(0.15, Math.min(1, Number(e.target.value) / 100)))}
          className="w-full"
        />
      </div>
      <p className="font-bold mb-1.5">Ek Katmanlar</p>
      <div className="space-y-1 mb-3">
        {advancedLayersForUi.map((def) => (
          <label key={def.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={!canUserCustomizeLayers}
              checked={advancedOverlayEnabled[def.id] === true}
              onChange={(e) => setAdvancedOverlayEnabled((s) => ({ ...s, [def.id]: e.target.checked }))}
            />
            <span>{friendlyAdvancedLayerLabel(def.label)}</span>
          </label>
        ))}
      </div>
      {showParcel && (
      <>
        <button
          type="button"
          onClick={() => setParcelQueryOpen((s) => !s)}
          className="w-full text-left rounded-lg px-2 py-1.5 font-bold"
          style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(52,211,153,0.5)" }}
        >
          Bölge Çizimi {parcelQueryOpen ? "▲" : "▼"}
        </button>
        {parcelQueryOpen && (
        <div className="mt-2 space-y-1.5">
          <div className={`grid ${compact ? "grid-cols-1" : "grid-cols-2"} gap-1.5`}>
            <select
              value={parcelForm.il}
              onChange={(e) => setParcelForm((p) => ({ ...p, il: e.target.value, ilce: "", mahalle: "" }))}
              className="rounded-lg px-2 py-1.5 text-[11px] text-slate-800 outline-none"
              style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(99,102,241,0.18)" }}
            >
              <option value="">İl</option>
              {parcelProvinces.map((p) => <option key={`${p.plaka}-${p.adi}`} value={String(p.plaka ?? "")}>{p.adi}</option>)}
            </select>
            <select
              value={parcelForm.ilce}
              onChange={(e) => setParcelForm((p) => ({ ...p, ilce: e.target.value, mahalle: "" }))}
              className="rounded-lg px-2 py-1.5 text-[11px] text-slate-800 outline-none"
              style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(99,102,241,0.18)" }}
            >
              <option value="">İlçe</option>
              {parcelDistricts.map((d) => <option key={`${d.kimlikNo}-${d.adi}`} value={String(d.kimlikNo ?? "")}>{d.adi}</option>)}
            </select>
            <select
              value={parcelForm.mahalle}
              onChange={(e) => setParcelForm((p) => ({ ...p, mahalle: e.target.value }))}
              className="rounded-lg px-2 py-1.5 text-[11px] text-slate-800 outline-none"
              style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(99,102,241,0.18)" }}
            >
              <option value="">Mahalle</option>
              {parcelNeighborhoods.map((m) => <option key={`${m.kimlikNo}-${m.adi}`} value={String(m.kimlikNo ?? "")}>{m.adi}</option>)}
            </select>
            <input
              value={parcelForm.adres}
              onChange={(e) => setParcelForm((p) => ({ ...p, adres: e.target.value }))}
              placeholder="Adres (opsiyonel)"
              className="rounded-lg px-2 py-1.5 text-[11px] text-slate-800 outline-none"
              style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(99,102,241,0.18)" }}
            />
          </div>
          <button
            type="button"
            onClick={() => { void submitParcelQuery(); }}
            disabled={parcelQueryLoading}
            className="w-full rounded-lg px-2 py-1.5 font-bold disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#047857,#10b981)" }}
          >
            {parcelQueryLoading ? "Çiziliyor..." : "Çizimi Göster"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (parcelMarkerRef.current) {
                parcelMarkerRef.current.remove();
                parcelMarkerRef.current = null;
              }
              if (parcelShapeRef.current) {
                parcelShapeRef.current.remove();
                parcelShapeRef.current = null;
              }
              setParcelResultInfo(null);
            }}
            className="w-full rounded-lg px-2 py-1.5 font-semibold"
            style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(248,113,113,0.45)" }}
          >
            Çizimi Temizle
          </button>
          {parcelResultInfo && (
            <p className="text-[10px] text-emerald-800 rounded-md px-2 py-1" style={{ background: "rgba(16,185,129,0.14)" }}>
              {parcelResultInfo}
            </p>
          )}
          {parcelRecentQueries.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-emerald-800">Son Çizimler</p>
                <button
                  type="button"
                  onClick={() => {
                    setParcelRecentQueries([]);
                    try { localStorage.removeItem("ahenk_parcel_recent_queries"); } catch {}
                  }}
                  className="text-[10px] underline text-red-700"
                >
                  temizle
                </button>
              </div>
              <div className="space-y-1">
                {parcelRecentQueries.map((q, idx) => {
                  const il = parcelProvinces.find((p) => String(p.plaka ?? "") === q.il)?.adi ?? q.il;
                  const ilce = parcelDistricts.find((d) => String(d.kimlikNo ?? "") === q.ilce)?.adi ?? q.ilce;
                  const mahalle = parcelNeighborhoods.find((m) => String(m.kimlikNo ?? "") === q.mahalle)?.adi ?? q.mahalle;
                  const title = [q.adres, mahalle, ilce, il].filter(Boolean).join(" / ") || "Kayıt";
                  const detail = [mahalle, ilce, il].filter(Boolean).join(" / ") || "Bolge secimi";
                  return (
                    <button
                      key={`${title}-${detail}-${idx}`}
                      type="button"
                      onClick={() => setParcelForm({
                        il: q.il, ilce: q.ilce, mahalle: q.mahalle, adres: q.adres || "", ada: q.ada, parsel: q.parsel,
                      })}
                      className="w-full rounded-lg px-2 py-1.5 text-left"
                      style={{ background: "rgba(255,255,255,0.82)", border: "1px solid rgba(99,102,241,0.2)" }}
                    >
                      <p className="text-[11px] font-semibold text-slate-800 truncate">{title}</p>
                      <p className="text-[10px] text-slate-600 truncate">{detail}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        )}
      </>
      )}
    </div>
  );

  const MapQuickControls = () => {
    const openKgmTools = () => {
      setLeftSidebarTab("temel_haritalar");
      setGeoDataTab("kgm");
      setDesktopGeoPanelOpen(true);
    };
    const detailItems: Array<{
      id: string;
      icon: string;
      label: string;
      active?: boolean;
      helper?: string;
      onClick?: () => void;
    }> = [
      {
        id: "traffic",
        icon: "🚦",
        label: "Trafik",
        active: roadStatusLayerVisible,
        helper: "KGM yol çalışması ve kapalı yol noktaları",
        onClick: () => setRoadStatusLayerVisible((s) => !s),
      },
      {
        id: "terrain",
        icon: "⛰️",
        label: "Yükselti",
        active: overlayElevation,
        helper: "Yükselti gölgelemesi",
        onClick: () => setOverlayElevation((s) => !s),
      },
      {
        id: "relief",
        icon: "▨",
        label: "Relief",
        active: overlayRaster,
        helper: "Gölgelendirilmiş arazi",
        onClick: () => setOverlayRaster((s) => !s),
      },
      {
        id: "population",
        icon: "●",
        label: "Nüfus",
        active: overlayPopulation,
        helper: "Yoğunluk katmanı",
        onClick: () => setOverlayPopulation((s) => !s),
      },
      {
        id: "nasa",
        icon: "▧",
        label: "NASA Uydu",
        active: advancedOverlayEnabled["nasa-truecolor"] === true,
        helper: "Gerçek renk uydu örtüsü",
        onClick: () => setAdvancedOverlayEnabled((s) => ({ ...s, "nasa-truecolor": s["nasa-truecolor"] !== true })),
      },
      {
        id: "nasa-night",
        icon: "🌙",
        label: "Gece ışıkları",
        active: advancedOverlayEnabled["nasa-night"] === true,
        helper: "NASA gece ışıkları",
        onClick: () => setAdvancedOverlayEnabled((s) => ({ ...s, "nasa-night": s["nasa-night"] !== true })),
      },
      {
        id: "grid",
        icon: "▦",
        label: "Grid",
        active: overlayGeodesyGrid,
        helper: "Jeodezik grid",
        onClick: () => setOverlayGeodesyGrid((s) => !s),
      },
      {
        id: "panorama",
        icon: "◉",
        label: "Panorama",
        active: mediaPanelMode === "panorama",
        helper: "Seçili konum destekliyse açılır.",
        onClick: () => setMediaPanelMode((m) => m === "panorama" ? null : "panorama"),
      },
      {
        id: "wildfire",
        icon: "🔥",
        label: "Orman yangınları",
        active: overlayWildfire,
        helper: "NASA FIRMS sıcak nokta katmanı",
        onClick: () => openInfoOverlayPanel("wildfire"),
      },
    ];
    const toolItems = [
      {
        id: "travel",
        icon: "⌁",
        label: "Seyahat süresi",
        active: geoDataTab === "kgm" && leftSidebarTab === "temel_haritalar",
        onClick: openKgmTools,
      },
      {
        id: "measure",
        icon: "╱",
        label: "Ölçüm",
        active: measurementActive,
        onClick: () => setMeasurementActive((s) => !s),
      },
    ];
    const mapTypeItems: Array<{ id: typeof baseMapStyle; icon: string; label: string; helper: string }> = [
      { id: "temel", icon: "▦", label: "Varsayılan", helper: "Sokak haritası" },
      { id: "hava_fotografi", icon: "▧", label: "Uydu", helper: "Uydu görüntüsü" },
      { id: "topografik", icon: "▨", label: "Arazi", helper: "Topo görünüm" },
      { id: "gece", icon: "🌙", label: "Gece", helper: "Koyu harita" },
      { id: "siyasi", icon: "▤", label: "Siyasi", helper: "İdari görünüm" },
      { id: "fiziki", icon: "▥", label: "Fiziki", helper: "Fiziki görünüm" },
    ];
    const activeLayerCount = [
      roadStatusLayerVisible,
      overlayElevation,
      overlayRaster,
      overlayPopulation,
      overlayGeodesyGrid,
      overlayWeather,
      overlayWildfire,
      advancedOverlayEnabled["nasa-truecolor"] === true,
      advancedOverlayEnabled["nasa-night"] === true,
      mediaPanelMode === "panorama",
      measurementActive,
      activeContentLayerCount,
    ].filter(Boolean).length;
    const panelClass = isMobile
      ? "haritalar-layers-sheet fixed left-0 right-0 bottom-0 z-[1006] max-h-[74dvh] rounded-t-[1.75rem] border-t border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl"
      : "haritalar-layers-panel absolute right-[4.25rem] top-0 z-[1006] w-[340px] max-h-[calc(100dvh-2rem)] rounded-3xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl";
    const LayerButton = ({
      item,
    }: {
      item: { id: string; icon: string; label: string; active?: boolean; helper?: string; onClick?: () => void };
    }) => (
      <button
        key={item.id}
        type="button"
        aria-pressed={item.active === true}
        onClick={item.onClick}
        title={item.helper || item.label}
        className={`haritalar-layer-option${item.active ? " is-active" : ""}`}
      >
        <span className="haritalar-layer-option__icon">{item.icon}</span>
        <span className="haritalar-layer-option__label">{item.label}</span>
        {item.helper && <span className="haritalar-layer-option__hint">{item.helper}</span>}
      </button>
    );

    return (
      <div className={`haritalar-map-quick-controls absolute z-[1003]${isMobile ? " is-mobile" : ""}${showDesktopGeoPanel ? " is-panel-open" : ""}${mapLayersOpen && isMobile ? " is-layers-open" : ""} pointer-events-none`}>
        <div className="haritalar-map-quick-scroll flex flex-col items-end gap-2 overflow-y-auto pointer-events-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <button
            type="button"
            aria-expanded={mapLayersOpen}
            aria-label="Harita katmanları"
            onClick={() => setMapLayersOpen((s) => !s)}
            className={`haritalar-map-quick-btn haritalar-map-layers-trigger inline-flex items-center justify-center rounded-full border text-[11px] font-black shadow-lg backdrop-blur-md transition active:scale-95 ${
              mapLayersOpen || activeLayerCount > 0 ? "border-emerald-300 text-white" : "border-white/70 bg-white/95 text-slate-800 hover:bg-emerald-50"
            }`}
            style={mapLayersOpen || activeLayerCount > 0 ? { background: MAP_CHROME_GRAD, boxShadow: "0 6px 20px rgba(15,118,110,0.28)" } : undefined}
          >
            <span className="quick-icon text-sm leading-none">▣</span>
            <span className="quick-label whitespace-nowrap">Katmanlar</span>
            {activeLayerCount > 0 && <span className="haritalar-layer-count">{activeLayerCount}</span>}
          </button>
          <button
            type="button"
            aria-pressed={measurementActive}
            onClick={() => setMeasurementActive((s) => !s)}
            className={`haritalar-map-quick-btn inline-flex items-center rounded-full border text-[11px] font-black shadow-lg backdrop-blur-md transition active:scale-95 ${
              measurementActive ? "border-emerald-300 text-white" : "border-white/70 bg-white/95 text-slate-800 hover:bg-emerald-50"
            }`}
            style={measurementActive ? { background: MAP_CHROME_GRAD, boxShadow: "0 6px 20px rgba(15,118,110,0.28)" } : undefined}
          >
            <span className="quick-icon text-sm leading-none">╱</span>
            <span className="quick-label whitespace-nowrap">Ölçüm</span>
          </button>
          <button
            type="button"
            onClick={openKgmTools}
            className="haritalar-map-quick-btn inline-flex items-center rounded-full border border-white/70 bg-white/95 text-[11px] font-black text-slate-800 shadow-lg backdrop-blur-md transition hover:bg-emerald-50 active:scale-95"
          >
            <span className="quick-icon text-sm leading-none">⌁</span>
            <span className="quick-label whitespace-nowrap">Süre</span>
          </button>
        </div>
        {mapLayersOpen && (
          <>
            {isMobile && <button type="button" aria-label="Katmanları kapat" className="fixed inset-0 z-[1005] bg-slate-950/20 pointer-events-auto" onClick={() => setMapLayersOpen(false)} />}
            <div className={`${panelClass} pointer-events-auto flex flex-col`}>
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-base font-black text-slate-900">Harita katmanları</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">Katman, araç ve harita türünü seçin.</p>
                </div>
                <button type="button" onClick={() => setMapLayersOpen(false)} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-600 hover:bg-slate-200">
                  ×
                </button>
              </div>
              <div className="haritalar-layers-panel__body space-y-4 overflow-y-auto p-4">
                <section>
                  <p className="haritalar-layers-section-title">Harita türü</p>
                  <div className="haritalar-map-type-grid">
                    {mapTypeItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!canUserCustomizeLayers}
                        aria-pressed={baseMapStyle === item.id}
                        onClick={() => setBaseMapStyle(item.id)}
                        className={`haritalar-map-type-card${baseMapStyle === item.id ? " is-active" : ""}`}
                      >
                        <span className="haritalar-map-type-card__preview">{item.icon}</span>
                        <span className="haritalar-map-type-card__label">{item.label}</span>
                        <span className="haritalar-map-type-card__hint">{item.helper}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <label className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700">
                      <span>Etiketler</span>
                      <input type="checkbox" checked={mapLabelsVisible} onChange={(e) => setMapLabelsVisible(e.target.checked)} />
                    </label>
                  </div>
                </section>
                <MapContentLayerQuickPanel
                  visible={newsMapEnabled || mapsHybridEnabled}
                  mapContentLayers={mapContentLayers}
                  onToggle={toggleMapContentLayer}
                />
                <section>
                  <p className="haritalar-layers-section-title">Harita ayrıntıları</p>
                  <div className="haritalar-layer-grid">
                    {detailItems.map((item) => <Fragment key={item.id}>{LayerButton({ item })}</Fragment>)}
                  </div>
                </section>
                <section>
                  <p className="haritalar-layers-section-title">Harita araçları</p>
                  <div className="haritalar-layer-grid haritalar-layer-grid--tools">
                    {toolItems.map((item) => <Fragment key={item.id}>{LayerButton({ item })}</Fragment>)}
                  </div>
                  {measurementActive && (
                    <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">
                      {measurementResult || "Haritada iki nokta seçin"}
                      <button type="button" onClick={resetMeasurementLayer} className="ml-2 underline underline-offset-2">Temizle</button>
                    </div>
                  )}
                </section>
              </div>
              {isMobile && (
                <div className="haritalar-mobile-layer-carousel border-t border-slate-100 px-3 py-3">
                  {mapTypeItems.map((item) => (
                    <button
                      key={`mobile-${item.id}`}
                      type="button"
                      onClick={() => setBaseMapStyle(item.id)}
                      className={`haritalar-mobile-layer-chip${baseMapStyle === item.id ? " is-active" : ""}`}
                    >
                      <span>{item.icon}</span>
                      <b>{item.label}</b>
                    </button>
                  ))}
                  <button type="button" onClick={() => setOverlayElevation((s) => !s)} className={`haritalar-mobile-layer-chip${overlayElevation ? " is-active" : ""}`}>
                    <span>⛰️</span>
                    <b>Arazi</b>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const MediaLayerPanel = () => {
    if (!mediaPanelMode) return null;
    const panelTitle = mediaPanelMode === "photos" ? "Fotoğraf Katmanı" : "Panorama";
    const panelText = mediaPanelMode === "photos"
      ? selectedBiz
        ? photos.length > 0
          ? "Seçili işletmenin fotoğrafları aşağıda gösteriliyor."
          : "Fotoğraf katmanı için haritadaki bir işletmeyi seçin."
        : "Fotoğraf katmanı için haritadaki bir işletmeyi seçin."
      : "Panorama görünümü için desteklenen bir işletme veya konum seçin.";
    return (
      <div className={`absolute z-[1004] ${isMobile ? "left-3 right-3 bottom-[132px]" : "right-5 top-[148px] w-[320px]"} rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-slate-900">{panelTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{panelText}</p>
          </div>
          <button type="button" onClick={() => setMediaPanelMode(null)} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200">
            Kapat
          </button>
        </div>
        {mediaPanelMode === "photos" && selectedBiz && photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {photos.slice(0, 6).map((photo, idx) => (
              <button key={`${photo.url}-${idx}`} type="button" onClick={() => { setPhotoIdx(idx); setLeftSidebarTab("isletmeler"); setDesktopGeoPanelOpen(true); }} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                <img src={photo.url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const MapChromeBrand = ({ compact = false }: { compact?: boolean }) => (
    <Link
      href="/"
      className={`haritalar-map-brand inline-flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-100/80 bg-white/95 ${compact ? "is-compact px-2 sm:px-3" : "px-3"} py-2 shadow-sm backdrop-blur-md`}
      style={{ boxShadow: "0 4px 16px rgba(15,118,110,0.12)" }}
      aria-label="Yekpare Haritalar"
      title="Anasayfaya git"
    >
      <span className="haritalar-map-brand__mark flex h-7 w-7 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: MAP_CHROME_GRAD }}>Y</span>
      <div className={`haritalar-map-brand__text leading-tight ${compact ? "hidden md:block" : ""}`}>
        <p className="text-[12px] font-black text-slate-900 tracking-tight">Yekpare</p>
        <p className="text-[10px] font-bold text-emerald-700">Haritalar</p>
      </div>
    </Link>
  );

  const ViewportPlacePill = ({ compact = false }: { compact?: boolean }) => (
    <button
      type="button"
      onClick={() => {
        const loc: PopularLocation = {
          id: "map-center",
          name: viewportPlaceInfo.label,
          nameTr: viewportPlaceInfo.label,
          latitude: viewportPlaceInfo.lat,
          longitude: viewportPlaceInfo.lng,
          zoomLevel: Math.max(leafletMapRef.current?.getZoom() ?? 12, 12),
          region: [viewportPlaceInfo.district, viewportPlaceInfo.city].filter(Boolean).join(" / "),
        };
        goToLocation(loc);
        setBusinessPanelMode("categories");
        setLocationPanelTab("businesses");
      }}
      className={`inline-flex min-w-0 items-center gap-2 rounded-2xl border border-emerald-100/80 bg-white/95 px-3 py-2 text-left shadow-sm backdrop-blur-md transition hover:bg-emerald-50 ${
        compact ? "max-w-full" : "max-w-[300px]"
      }`}
      style={{ boxShadow: "0 4px 16px rgba(15,118,110,0.12)" }}
      title={resolveMapLocationDisplayLabel(viewportPlaceInfo.city, viewportPlaceInfo.label) || `${viewportPlaceInfo.lat.toFixed(5)}, ${viewportPlaceInfo.lng.toFixed(5)}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-sm text-white" style={{ background: MAP_CHROME_GRAD }}>📍</span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[12px] font-black text-slate-900">
          {viewportPlaceInfo.loading ? "Konum güncelleniyor..." : viewportPlaceInfo.label}
        </span>
        <span className="block truncate text-[10px] font-bold text-emerald-700">
          Harita merkezi{viewportPlaceInfo.city && !isGenericMapLocationLabel(viewportPlaceInfo.city) ? ` · ${viewportPlaceInfo.city}` : ""}
        </span>
      </span>
    </button>
  );

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch(mapApiUrl("/map/official-map-links-health"))
        .then((r) => r.json())
        .then((d: { success?: boolean; data?: Array<{ id: string; ok: boolean; statusCode: number | null; latencyMs: number }> }) => {
          if (!mounted || !d.success || !Array.isArray(d.data)) return;
          const rec: Record<string, { ok: boolean; statusCode: number | null; latencyMs: number }> = {};
          d.data.forEach((x) => { rec[x.id] = { ok: x.ok, statusCode: x.statusCode, latencyMs: x.latencyMs }; });
          setOfficialLinkHealth(rec);
          setOfficialHealthCheckedAt(Date.now());
        })
        .catch(() => {});
    };
    load();
    const t = window.setInterval(load, 60000);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (geoDataTab !== "afad" || afadRows.length > 0) return;
    fetch(mapApiUrl("/map/earthquakes/regional?days=7&limit=220"))
      .then((r) => r.json())
      .then((d: {
        success?: boolean;
        data?: Array<{
          id: string;
          source?: string;
          location: string;
          latitude: number;
          longitude: number;
          magnitude: number;
          depthKm: number;
          date: string;
        }>;
      }) => {
        if (d.success && Array.isArray(d.data)) setAfadRows(d.data);
      })
      .catch(() => {});
  }, [geoDataTab, afadRows.length]);

  useEffect(() => {
    if (geoDataTab !== "mgm" || mgmRows.length > 0) return;
    fetch(mapApiUrl("/map/mgm-weather-summary?limit=40"))
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: Array<{ city: string; lat: number; lng: number; temperature: number; weatherCode: number }> }) => {
        if (d.success && Array.isArray(d.data)) setMgmRows(d.data);
      })
      .catch(() => {});
  }, [geoDataTab, mgmRows.length]);

  /* Top chips open both the layer and the contextual panel. */
  useEffect(() => {
    if (leftSidebarTab === "isletmeler") {
      setOverlayEarthquake(false);
      setOverlayWeather(false);
      setOverlayWildfire(false);
      setOverlayPopulation(false);
      return;
    }
    if (geoDataTab === "afad") setOverlayEarthquake(true);
    else setOverlayEarthquake(false);
    if (geoDataTab === "mgm") setOverlayWeather(true);
    else setOverlayWeather(false);
    if (geoDataTab === "wildfire") setOverlayWildfire(true);
    else setOverlayWildfire(false);
    if (geoDataTab === "population") setOverlayPopulation(true);
    else setOverlayPopulation(false);
  }, [geoDataTab, leftSidebarTab]);

  useEffect(() => {
    fetch(mapApiUrl("/map/settings"))
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: { mapLayerConfigJson?: string | null } }) => {
        if (!d.success) return;
        const raw = d.data?.mapLayerConfigJson;
        if (!raw) return;
        const cfg = JSON.parse(raw) as {
          defaultOpacity?: number;
          forceAdminLayerConfig?: boolean;
          baseLayers?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
          advancedLayers?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
          overlays?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
        };
        setAdminLayerConfig(cfg);
        const hasLocal = !!localStorage.getItem("ahenk_kesfet_layer_prefs_v1");
        if ((!hasLocal || cfg.forceAdminLayerConfig === true) && typeof cfg.defaultOpacity === "number") {
          setOverlayOpacity(Math.max(0.15, Math.min(1, cfg.defaultOpacity)));
        }
      })
      .catch(() => {});
  }, []);

  // Persist layer preferences (Kesfet)
  useEffect(() => {
    if (!canUserCustomizeLayers) return;
    if (isNoTargetMapMode) return;
    try {
      const raw = localStorage.getItem("ahenk_kesfet_layer_prefs_v1");
      if (!raw) return;
      const p = JSON.parse(raw) as {
        baseMapStyle?: typeof baseMapStyle;
        overlayWeather?: boolean;
        overlayEarthquake?: boolean;
        overlayWildfire?: boolean;
        overlayPopulation?: boolean;
        overlayElevation?: boolean;
        overlayRaster?: boolean;
        overlayGeodesyGrid?: boolean;
        advancedOverlayEnabled?: Record<string, boolean>;
        overlayOpacity?: number;
      };
      if (p.baseMapStyle) setBaseMapStyle(p.baseMapStyle);
      if (typeof p.overlayWeather === "boolean") setOverlayWeather(p.overlayWeather);
      if (typeof p.overlayEarthquake === "boolean") setOverlayEarthquake(p.overlayEarthquake);
      if (typeof p.overlayWildfire === "boolean") setOverlayWildfire(p.overlayWildfire);
      if (typeof p.overlayPopulation === "boolean") setOverlayPopulation(p.overlayPopulation);
      if (typeof p.overlayElevation === "boolean") setOverlayElevation(p.overlayElevation);
      if (typeof p.overlayRaster === "boolean") setOverlayRaster(p.overlayRaster);
      if (typeof p.overlayGeodesyGrid === "boolean") setOverlayGeodesyGrid(p.overlayGeodesyGrid);
      if (p.advancedOverlayEnabled && typeof p.advancedOverlayEnabled === "object") setAdvancedOverlayEnabled(p.advancedOverlayEnabled);
      if (typeof p.overlayOpacity === "number") setOverlayOpacity(Math.max(0.15, Math.min(1, p.overlayOpacity)));
    } catch {
      // ignore invalid localStorage
    }
  }, [canUserCustomizeLayers, isNoTargetMapMode]);

  useEffect(() => {
    if (!canUserCustomizeLayers) return;
    if (isNoTargetMapMode) return;
    try {
      localStorage.setItem("ahenk_kesfet_layer_prefs_v1", JSON.stringify({
        baseMapStyle,
        overlayWeather,
        overlayEarthquake,
        overlayWildfire,
        overlayPopulation,
        overlayElevation,
        overlayRaster,
        overlayGeodesyGrid,
        advancedOverlayEnabled,
        overlayOpacity,
      }));
    } catch {
      // ignore storage errors
    }
  }, [
    canUserCustomizeLayers,
    isNoTargetMapMode,
    baseMapStyle,
    overlayWeather,
    overlayEarthquake,
    overlayWildfire,
    overlayPopulation,
    overlayElevation,
    overlayRaster,
    overlayGeodesyGrid,
    advancedOverlayEnabled,
    overlayOpacity,
  ]);

  function activateGeoTab(tab: "nav" | "afad" | "mgm" | "population" | "kgm"): void {
    setLeftSidebarTab("temel_haritalar");
    setGeoDataTab(tab);
    if (tab === "kgm") setGuzergahSubTab("kara");
    if (isMobile) {
      setMenuOpen(true);
    } else {
      setDesktopGeoPanelOpen(true);
    }
  }

  const DESKTOP_MAP_RAIL_ITEMS = [
    { kind: "main" as const, tab: "temel_haritalar" as const, geo: "harita" as const, icon: "🗺️", label: "Harita", title: "Katmanlar" },
    { kind: "main" as const, tab: "isletmeler" as const, icon: "🏢", label: "İşletme", title: "İşletmeler" },
    { kind: "main" as const, tab: "kayitlar" as const, icon: "🔖", label: "Kaydet", title: "Kaydedilenler" },
    { kind: "main" as const, tab: "yer_ekle" as const, icon: "+", label: "Ekle", title: "Yer/İşletme ekle" },
    { kind: "geo" as const, geo: "nav" as const, icon: "🧭", label: "Nav", title: "Navigasyon" },
    { kind: "geo" as const, geo: "kgm" as const, icon: "🚘", label: "Güzergah", title: "Güzergah" },
  ] as const;
  const PUBLIC_MAP_RAIL_ITEMS = DESKTOP_MAP_RAIL_ITEMS.filter((item) => !(item.kind === "main" && item.tab === "temel_haritalar"));

  function isDesktopRailItemActive(item: (typeof DESKTOP_MAP_RAIL_ITEMS)[number]): boolean {
    if (item.kind === "main") {
      if (item.tab === "isletmeler") return leftSidebarTab === "isletmeler";
      if (item.tab === "kayitlar") return leftSidebarTab === "kayitlar";
      if (item.tab === "yer_ekle") return leftSidebarTab === "yer_ekle";
      return leftSidebarTab === "temel_haritalar" && geoDataTab === "harita";
    }
    return leftSidebarTab === "temel_haritalar" && geoDataTab === item.geo;
  }

  function handleDesktopRailClick(item: (typeof DESKTOP_MAP_RAIL_ITEMS)[number]): void {
    const isActive = isDesktopRailItemActive(item);
    if (isMobile) {
      if (isActive && menuOpen) {
        setMenuOpen(false);
        return;
      }
      if (item.kind === "main") {
        if (item.tab === "temel_haritalar") {
          setGeoDataTab("harita");
          setMapLayersOpen(true);
          setMenuOpen(false);
          return;
        }
        setLeftSidebarTab(item.tab);
        if (item.tab === "isletmeler") {
          setSelectedBiz(null);
          setBusinessPanelMode("categories");
          setLocationPanelTab("businesses");
        } else if (item.tab === "yer_ekle") {
          setAddPlaceOpen(true);
        }
      } else {
        setLeftSidebarTab("temel_haritalar");
        setGeoDataTab(item.geo);
        if (item.geo === "kgm") setGuzergahSubTab("kara");
      }
      setMenuOpen(true);
      return;
    }
    if (isActive && desktopGeoPanelOpen && !(item.kind === "main" && item.tab === "temel_haritalar")) {
      setDesktopGeoPanelOpen(false);
      return;
    }
    if (item.kind === "main") {
      if (item.tab === "temel_haritalar") {
        setGeoDataTab("harita");
        setMapLayersOpen(true);
        setDesktopGeoPanelOpen(false);
        return;
      }
      setLeftSidebarTab(item.tab);
      if (item.tab === "isletmeler") {
        setSelectedBiz(null);
        setBusinessPanelMode("categories");
        setLocationPanelTab("businesses");
      } else if (item.tab === "yer_ekle") {
        setAddPlaceOpen(true);
      }
      setDesktopGeoPanelOpen(true);
      return;
    }
    activateGeoTab(item.geo);
  }

  const desktopGeoPanelTitle =
    leftSidebarTab === "kayitlar"
      ? "Kaydedilenler"
      : leftSidebarTab === "yer_ekle"
        ? "Yer / İşletme ekle"
        : leftSidebarTab === "menu_info"
          ? "Harita menüsü"
        : leftSidebarTab === "newsmap"
          ? newsmapKindFilter === "video"
            ? "Video"
            : newsmapKindFilter === "news"
              ? "Son Dakika"
              : "Haber Haritası"
        : leftSidebarTab === "isletmeler" && businessPanelMode === "location" && searchedLocationInfo
          ? searchedLocationInfo.title
        : leftSidebarTab === "isletmeler"
      ? "İşletmeler"
      : geoDataTab === "harita"
        ? "Katmanlar"
        : geoDataTab === "nav"
          ? "Navigasyon"
          : geoDataTab === "afad"
            ? "Son Depremler"
            : geoDataTab === "mgm"
              ? "Hava Durumu"
              : geoDataTab === "wildfire"
                ? "Orman Yangınları"
              : geoDataTab === "population"
                ? "Nüfus"
                : "Güzergah";

  const showDesktopGeoPanel =
    !isMobile &&
    desktopGeoPanelOpen &&
    ((leftSidebarTab === "temel_haritalar" && ["harita", "nav", "afad", "mgm", "wildfire", "population", "kgm"].includes(geoDataTab))
      || ["isletmeler", "kayitlar", "yer_ekle", "menu_info", "newsmap"].includes(leftSidebarTab));

  const desktopGeoPanelOnRight =
    showDesktopGeoPanel && leftSidebarTab === "temel_haritalar" && geoDataTab === "kgm";

  const openSlimSidebarPanel = (tab: KesfetMainSidebarTab, mode?: "categories" | "results" | "location") => {
    setLeftSidebarTab(tab);
    if (tab === "isletmeler") {
      setBusinessPanelMode(mode ?? "categories");
      setLocationPanelTab("businesses");
    }
    setDesktopGeoPanelOpen(true);
  };

  const openSlimLayersPanel = () => {
    setMapLayersOpen(true);
    if (isMobile) setMenuOpen(false);
    else setDesktopGeoPanelOpen(false);
  };

  const SlimMapSidebar = ({ compact = false }: { compact?: boolean }) => {
    const openRecentItemsPanel = () => {
      setMapMenuPanel("recent");
      setLeftSidebarTab("menu_info");
      setDesktopGeoPanelOpen(true);
    };

    return (
      <aside className={`haritalar-map-slim-sidebar absolute left-0 top-0 bottom-0 z-[1003]${compact ? " haritalar-map-slim-sidebar--compact" : ""}`} aria-label="Harita hızlı menüsü">
        <button
          type="button"
          className="haritalar-map-slim-sidebar__menu"
          aria-label="Harita menüsünü aç veya kapat"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        {!compact ? (
          <>
        <button type="button" className="haritalar-map-slim-sidebar__item" onClick={() => goToMyLocation({ openCard: true })}>
          <span aria-hidden="true">📍</span>
          <span>Konumum</span>
        </button>
        <button type="button" className="haritalar-map-slim-sidebar__item" onClick={openRecentItemsPanel} title="Kaydedilen ve son konumlar">
          <span aria-hidden="true">🔖</span>
          <span>Kaydedildi</span>
        </button>
        <button
          type="button"
          className="haritalar-map-slim-sidebar__item haritalar-map-slim-sidebar__item--compact"
          onClick={exitLocationView}
          title="Konumdan çık"
          aria-label="Konumdan çık"
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.382V6.618a2 2 0 011.553-1.894L9 2l6 3 6-3 1.447.724A2 2 0 0121 6.618v8.764a2 2 0 01-1.553 1.894L15 20l-6-3-6 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          <span>Konumdan çık</span>
        </button>
        <button type="button" className="haritalar-map-slim-sidebar__item" onClick={openRecentItemsPanel}>
          <span aria-hidden="true">🕘</span>
          <span>Son öğeler</span>
        </button>
        <button type="button" className="haritalar-map-slim-sidebar__item" onClick={() => openInfoOverlayPanel("afad")}>
          <span aria-hidden="true">🌋</span>
          <span>Deprem</span>
        </button>
        <button type="button" className="haritalar-map-slim-sidebar__item" onClick={() => openInfoOverlayPanel("mgm")}>
          <span aria-hidden="true">☁️</span>
          <span>Hava</span>
        </button>
        {isNewsmapPage ? (
          <Link href={hmPublicHref("/maps")} className="haritalar-map-slim-sidebar__item">
            <span aria-hidden="true">🗺️</span>
            <span>Haritalar</span>
          </Link>
        ) : (
          <button type="button" className="haritalar-map-slim-sidebar__item haritalar-map-slim-sidebar__item--compact" onClick={openSlimLayersPanel}>
            <span aria-hidden="true">🗺️</span>
            <span>Katmanlar</span>
          </button>
        )}
        <div className="haritalar-map-slim-sidebar__spacer" />
        <button type="button" className="haritalar-map-slim-sidebar__item" onClick={() => openAddPlacePanel()}>
          <span aria-hidden="true">📋</span>
          <span>Uygulama</span>
        </button>
          </>
        ) : null}
      </aside>
    );
  };

  useEffect(() => {
    const onOpenFromBottomNav = (ev: Event) => {
      const detail = (ev as CustomEvent<{ action?: string }>).detail;
      const action = String(detail?.action ?? "");
      if (!action) return;
      setMenuOpen(true);
      if (action === "isletmeler") {
        setLeftSidebarTab("isletmeler");
        setBusinessPanelMode("categories");
        setLocationPanelTab("businesses");
        setSelectedBiz(null);
        return;
      }
      if (action === "harita") {
        setMenuOpen(false);
        return;
      }
      if (action === "nav") {
        activateGeoTab("nav");
        return;
      }
      if (action === "kgm") {
        activateGeoTab("kgm");
      }
    };
    window.addEventListener("kesfet:open-mobile-menu", onOpenFromBottomNav as EventListener);
    return () => window.removeEventListener("kesfet:open-mobile-menu", onOpenFromBottomNav as EventListener);
  }, [activateGeoTab]);

  const mapFontFamily = "'Inter','Segoe UI',system-ui,sans-serif";
  const mapShellStyle: React.CSSProperties =
    layout === "fullscreen"
      ? { height: "100vh", width: "100%", maxHeight: "100vh", fontFamily: mapFontFamily }
      : layout === "desktop-chrome"
        ? {
            flex: 1,
            minHeight: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            fontFamily: mapFontFamily,
          }
        : { height: "calc(100vh - 52px)", maxHeight: "calc(100vh - 52px)", fontFamily: mapFontFamily };

  /* ─────────────────── MOBILE LAYOUT ─────────────────── */
  if (isMobile) {
    return (
      <>
        <div
          className={`sade-public-page relative flex w-full flex-col overflow-hidden antialiased text-slate-900${
            layout === "fullscreen" ? " haritalar-fullscreen-page" : ""
          }${layout === "desktop-chrome" ? " min-h-0 flex-1" : ""}${
            isNewsmapPage ? " kesfet-newsmap-page" : ""
          }`}
          style={mapShellStyle}
        >
          {newsMapEnabled && !isNewsmapPage ? (
            <HaberHaritasiSonDakikaTicker
              variant="toolbar"
              headlines={filteredNewsHeadlines}
              isLoading={haberHaritasiNews.isLoading}
              linkMode={linkMode}
              onHeadlineClick={openNewsOverlay}
            />
          ) : null}
          <div className="relative min-h-0 flex-1 overflow-hidden">
          {SideMenu()}
          {ShareModal()}
          {MapShareModal()}
          <NavPanel />
          {Toast()}
          <div ref={mapRef} className="absolute inset-0 h-full w-full" style={{ zIndex: 1 }} />
          <MobileMapMenuTrigger
            visible={isMobile && !isNewsmapPage && (hmSiteActive || mapsHybridEnabled)}
            onOpen={() => setMenuOpen(true)}
          />
          {isNewsmapPage ? <SlimMapSidebar compact={isMobile} /> : null}
          {newsMapEnabled && isNewsmapPage ? (
            <div className="haber-haritasi-newsmap-chips-row pointer-events-none absolute inset-x-0 top-3 z-[1004] px-3">
              <div className="pointer-events-auto">
                {NewsmapLocationSearchBar()}
              </div>
            </div>
          ) : null}
          <HaberHaritasiNewsPreviewCard
            headline={newsPreviewHeadline}
            onClose={closeNewsPreview}
            onReadMore={handleNewsReadMore}
          />
          {!isNewsmapPage ? (
            <HaberHaritasiBilgiAgaciPreviewCard preview={bilgiAgaciPreview} onClose={closeBilgiAgaciPreview} />
          ) : null}
          <HaberHaritasiNewsOverlay
            headline={newsOverlayHeadline}
            onClose={closeNewsOverlay}
            fullArticleMode={isNewsmapPage}
            onBeforeNavigate={registerNewsmapVideoIfNeeded}
            onLocationActivate={isNewsmapPage ? (hl) => handleNewsmapCityActivate(hl, "news") : undefined}
            onOpenLocationNews={isNewsmapPage ? (city, hl) => handleNewsmapCityActivate(hl, "news") : undefined}
            onOpenLocationVideos={isNewsmapPage ? (city, hl) => handleNewsmapCityActivate(hl, "video") : undefined}
            onOpenLocationInfo={isNewsmapPage ? (city, hl) => handleNewsmapCityActivate(hl, "info") : undefined}
          />
          {mapLoadIssue && (
            <div className="absolute left-3 right-3 top-[132px] z-[1005] rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-900 shadow-lg">
              {mapLoadIssue}
            </div>
          )}
          {!isNewsmapPage ? MapQuickControls() : null}
          {MediaLayerPanel()}

          <div
            className={`absolute top-0 left-0 right-0 z-20 px-3 pt-3 pb-3 space-y-2${
              isNewsmapPage ? " hidden" : ""
            }`}
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.96) 0%, rgba(244,251,247,0.88) 55%, transparent 100%)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="relative z-[10070]">{SearchBar()}</div>
            <div className="relative z-[1] min-w-0 overflow-x-auto overscroll-x-contain pb-0.5" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
              {CategoryChips({ showHybridPrefix: false })}
            </div>
          </div>

          <div className={`haritalar-locate-anchor absolute z-[1002]${navMode ? " is-nav-mode" : ""}`}>
            <div className="flex flex-col items-end gap-2">
              <MapLocateButton onClick={() => goToMyLocation()} state={locateButtonState} hasLocation={Boolean(userLocation)} />
            </div>
          </div>
          {newsMapEnabled && isNewsmapPage && !newsmapBusinessesMode ? (
            <HmMapCityNewsPanel
              className="haber-haritasi-newsmap-bottom-panel"
              headlines={newsmapBottomBandHeadlines}
              isLoading={newsmapBottomBandLoading}
              linkMode={linkMode}
              cityLabel={newsmapBottomBandCityLabel}
              onClearCity={selectedNewsmapCity ? clearSelectedNewsmapCity : undefined}
              onHeadlineClick={handleNewsmapHeadlineActivate}
              onCityClick={(row) => handleNewsmapCityActivate(row)}
              inMapOverlayMode
              showLangTabs
              langTab={newsmapBottomBandTab}
              onLangTabChange={handleNewsmapBottomBandTabChange}
              showKindTabs
              kindTab={
                newsmapKindFilter === "news" || newsmapKindFilter === "video" || newsmapKindFilter === "info"
                  ? newsmapKindFilter
                  : "all"
              }
              onKindTabChange={applyNewsmapKindFilter}
              bilgiHref={newsmapBottomBandBilgiHref}
              onOpenBilgi={openNewsmapBilgiFromBottomBand}
              onShowAllClick={handleNewsmapShowAll}
            />
          ) : null}
          </div>
        </div>
        {newsMapEnabled && !isNewsmapPage ? (
          <HmMapCityNewsPanel
            headlines={filteredNewsHeadlines}
            isLoading={haberHaritasiNews.isLoading}
            linkMode={linkMode}
            onHeadlineClick={openNewsOverlay}
          />
        ) : null}
        <WikiDrawer state={wikiDrawer} onClose={() => setWikiDrawer(null)} />
        {NavPickerModal()}
      </>
    );
  }

  /* ─────────────────── DESKTOP LAYOUT ─────────────────── */
  return (
    <div
      className={`sade-public-page flex flex-col overflow-hidden antialiased text-slate-900${
        layout === "fullscreen" ? " haritalar-fullscreen-page" : ""
      }${layout === "desktop-chrome" ? " haritalar-desktop-chrome min-h-0 flex-1" : ""}${
        isNewsmapPage ? " kesfet-newsmap-page" : ""
      }`}
      style={{
        ...mapShellStyle,
        background: YEKPARE_SADE_PAGE_TINT,
      }}
    >
      {SideMenu()}
      {ShareModal()}
      {MapShareModal()}
      <NavPanel />
      {Toast()}

      {!hmSiteActive && !isNewsmapPage ? (
      <div className="haritalar-map-topbar relative z-30 flex-shrink-0 border-b border-sky-100/80" style={{ background: MAP_TOP_BAR_BG, boxShadow: "0 2px 16px rgba(14,165,233,0.08)" }}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${YEKPARE_SADE_ACCENT}55 25%, ${YEKPARE_SADE_TEAL} 50%, ${YEKPARE_SADE_ACCENT}55 75%, transparent 100%)` }} />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-8 left-1/4 w-48 h-24 rounded-full opacity-30" style={{ background: `radial-gradient(ellipse, ${YEKPARE_SADE_ACCENT}33, transparent 70%)`, filter: "blur(20px)" }} />
            <div className="absolute -top-8 right-1/4 w-48 h-24 rounded-full opacity-25" style={{ background: `radial-gradient(ellipse, ${YEKPARE_SADE_TEAL}44, transparent 70%)`, filter: "blur(20px)" }} />
          </div>
          {layout === "fullscreen" && (
            <div className="haritalar-map-brand-anchor">
              {MapChromeBrand({})}
            </div>
          )}
          <div className={`haritalar-map-topbar__controls ${YEKPARE_PAGE_CONTAINER_CLASS} flex min-w-0 items-center gap-2.5 overflow-x-auto py-2.5`} style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {layout !== "desktop-chrome" && layout !== "fullscreen" ? MapChromeBrand({}) : null}
            {layout !== "desktop-chrome" ? ViewportPlacePill({}) : null}

            <button
              type="button"
              onClick={() => {
                saveCurrentMapTarget();
                setLeftSidebarTab("kayitlar");
                setDesktopGeoPanelOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-sky-200/80 bg-white/95 px-3.5 py-2 text-xs font-bold text-sky-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 shrink-0 whitespace-nowrap"
            >
              🔖 Kaydet
            </button>
            <button
              type="button"
              onClick={() => openAddPlacePanel()}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 shrink-0 whitespace-nowrap"
              style={{ background: MAP_CHROME_GRAD, boxShadow: `0 4px 14px ${MAP_CHROME_SHADOW}` }}
            >
              + Yer/İşletme ekle
            </button>
          </div>

          {newsMapEnabled ? (
            <div className="haritalar-map-topbar__ticker w-full border-t border-emerald-100/70">
              <HaberHaritasiSonDakikaTicker
                variant="toolbar"
                headlines={filteredNewsHeadlines}
                isLoading={haberHaritasiNews.isLoading}
                linkMode={linkMode}
                onHeadlineClick={openNewsOverlay}
              />
            </div>
          ) : null}

          <div className={`haritalar-map-topbar__categories ${YEKPARE_PAGE_CONTAINER_CLASS} min-w-0 overflow-x-auto overscroll-x-contain border-t border-emerald-100/70 pb-2.5 pt-0.5`} style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {CategoryChips({ showHybridPrefix: false })}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${YEKPARE_SADE_ACCENT}55, transparent)` }} />
      </div>
      ) : newsMapEnabled && !isNewsmapPage ? (
        <div className="haritalar-map-topbar__ticker w-full shrink-0 border-b border-slate-200/80">
          <HaberHaritasiSonDakikaTicker
            variant="toolbar"
            headlines={filteredNewsHeadlines}
            isLoading={haberHaritasiNews.isLoading}
            linkMode={linkMode}
            onHeadlineClick={openNewsOverlay}
          />
        </div>
      ) : null}

      {/* Body — newsmap tam ekran; diğer haritalarda konteyner */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={
            layout === "desktop-chrome" && !isNewsmapPage
              ? `${YEKPARE_PAGE_CONTAINER_CLASS} flex min-h-0 flex-1 flex-col`
              : "flex min-h-0 flex-1 flex-col"
          }
        >
        <div
          className={`haritalar-map-stage relative min-h-0 flex-1 overflow-hidden${
            layout === "desktop-chrome" && !isNewsmapPage ? " rounded-2xl border border-emerald-100/80 shadow-sm" : ""
          }${isNewsmapPage ? " haritalar-map-stage--newsmap" : ""}`}
        >
          <div ref={mapRef} className="absolute inset-0 h-full w-full" />
            {mapLoadIssue && (
              <div className="absolute left-3 right-3 top-3 z-[1005] rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-900 shadow-lg md:right-auto md:max-w-sm">
                {mapLoadIssue}
              </div>
            )}
            {!isMobile && !isNewsmapPage && (
              <div
                className="absolute right-3 top-3 z-[1004] pointer-events-none"
                style={{ left: showDesktopGeoPanel ? "calc(5.25rem + 372px)" : "5.25rem" }}
              >
                <div className="pointer-events-auto max-w-[920px]">
                  {SearchBar({ showMenuButton: true, showBrand: false })}
                </div>
              </div>
            )}
            {newsMapEnabled && isNewsmapPage ? (
              <div className="haber-haritasi-newsmap-chips-row pointer-events-none absolute inset-x-0 top-3 z-[1004] px-4">
                <div className="pointer-events-auto mx-auto max-w-screen-xl">
                  {NewsmapLocationSearchBar()}
                </div>
              </div>
            ) : null}
            <HaberHaritasiNewsPreviewCard
              headline={newsPreviewHeadline}
              onClose={closeNewsPreview}
              onReadMore={handleNewsReadMore}
            />
            {!isNewsmapPage ? (
              <HaberHaritasiBilgiAgaciPreviewCard preview={bilgiAgaciPreview} onClose={closeBilgiAgaciPreview} />
            ) : null}
          <HaberHaritasiNewsOverlay
            headline={newsOverlayHeadline}
            onClose={closeNewsOverlay}
            fullArticleMode={isNewsmapPage}
            onBeforeNavigate={registerNewsmapVideoIfNeeded}
            onLocationActivate={isNewsmapPage ? (hl) => handleNewsmapCityActivate(hl, "news") : undefined}
            onOpenLocationNews={isNewsmapPage ? (city, hl) => handleNewsmapCityActivate(hl, "news") : undefined}
            onOpenLocationVideos={isNewsmapPage ? (city, hl) => handleNewsmapCityActivate(hl, "video") : undefined}
            onOpenLocationInfo={isNewsmapPage ? (city, hl) => handleNewsmapCityActivate(hl, "info") : undefined}
          />
            {!isNewsmapPage ? MapQuickControls() : null}
            {MediaLayerPanel()}
            {(isNewsmapPage || !isMobile) ? <SlimMapSidebar compact={isNewsmapPage && isMobile} /> : null}
            {/* Konum — zoom (+/-) üstünde */}
            <div className={`haritalar-locate-anchor absolute z-[1001]${navMode ? " is-nav-mode" : ""}`}>
              <div className="flex flex-col items-end gap-2">
                <MapLocateButton onClick={() => goToMyLocation()} state={locateButtonState} hasLocation={Boolean(userLocation)} />
              </div>
            </div>
          {showDesktopGeoPanel && !navMode && (
            <>
              <button
                type="button"
                aria-label="Paneli kapat"
                className="haritalar-map-left-panel-scrim"
                onClick={() => closeLeftResultsPanel()}
              />
              <div
                className={`haritalar-map-left-panel haritalar-map-left-panel--floating flex flex-col overflow-hidden${desktopGeoPanelOnRight ? " haritalar-map-left-panel--floating-right" : ""}`}
              >
                <div className="haritalar-map-left-panel__header">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 tracking-tight">
                      {desktopGeoPanelTitle}
                    </p>
                    {leftSidebarTab === "temel_haritalar" && geoDataTab === "afad" && (
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                        Türkiye ve yakın çevre · Kandilli + AFAD
                      </p>
                    )}
                  </div>
                  <MapPanelCloseButton onClick={() => closeLeftResultsPanel()} />
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5" style={{ scrollbarWidth: "thin" }}>
                  {renderGeoPanelBody()}
                </div>
              </div>
            </>
          )}
            {newsMapEnabled && isNewsmapPage && !newsmapBusinessesMode ? (
              <HmMapCityNewsPanel
                className="haber-haritasi-newsmap-bottom-panel"
                headlines={newsmapBottomBandHeadlines}
                isLoading={newsmapBottomBandLoading}
                linkMode={linkMode}
                cityLabel={newsmapBottomBandCityLabel}
                onClearCity={selectedNewsmapCity ? clearSelectedNewsmapCity : undefined}
                onHeadlineClick={handleNewsmapHeadlineActivate}
              onCityClick={(row) => handleNewsmapCityActivate(row)}
              inMapOverlayMode
              showLangTabs
              langTab={newsmapBottomBandTab}
              onLangTabChange={handleNewsmapBottomBandTabChange}
              showKindTabs
              kindTab={
                newsmapKindFilter === "news" || newsmapKindFilter === "video" || newsmapKindFilter === "info"
                  ? newsmapKindFilter
                  : "all"
              }
              onKindTabChange={applyNewsmapKindFilter}
              bilgiHref={newsmapBottomBandBilgiHref}
              onOpenBilgi={openNewsmapBilgiFromBottomBand}
              onShowAllClick={handleNewsmapShowAll}
              />
            ) : null}
        </div>
        </div>
      </div>

      {newsMapEnabled && !isNewsmapPage ? (
        <HmMapCityNewsPanel
          headlines={filteredNewsHeadlines}
          isLoading={haberHaritasiNews.isLoading}
          linkMode={linkMode}
          onHeadlineClick={openNewsOverlay}
        />
      ) : null}

      {/* Wiki full-screen drawer */}
      <WikiDrawer state={wikiDrawer} onClose={() => setWikiDrawer(null)} />
      {NavPickerModal()}
    </div>
  );
}

/* ── Small helpers ── */
function Chip({ active, onClick, icon, label, dark = false }: { active: boolean; onClick: ()=>void; icon: string; label: string; dark?: boolean }) {
  const useLightBar = !dark;
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-200 ${
        active
          ? "text-white scale-[1.06] -translate-y-px"
          : useLightBar
            ? "text-slate-600 hover:text-sky-800 hover:scale-[1.03]"
            : "text-white/65 hover:text-white hover:scale-[1.03]"
      }`}
      style={active
        ? {
            background: MAP_CHROME_GRAD,
            boxShadow: `0 4px 18px ${MAP_CHROME_SHADOW}, 0 0 0 1px rgba(255,255,255,0.25), inset 0 1px 0 rgba(255,255,255,0.22)`,
          }
        : useLightBar
          ? {
              background: "rgba(255,255,255,0.96)",
              border: `1.5px solid ${MAP_CHIP_BORDER}`,
              boxShadow: `0 2px 8px rgba(14,165,233,0.08), inset 0 1px 0 rgba(255,255,255,0.85)`,
              backdropFilter: "blur(10px)",
            }
          : {
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
            }
      }>
      <span className="text-sm">{icon}</span>{label}
    </button>
  );
}

function ActBtn({ href, icon, label, external, disabled }: { href: string; icon: React.ReactNode; label: string; external?: boolean; disabled?: boolean }) {
  const inner = (
    <div className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all shrink-0 min-w-[64px] ${disabled ? "opacity-30 cursor-not-allowed" : "hover:scale-[1.05] hover:-translate-y-0.5"}`}>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
        disabled ? "bg-gray-100 text-gray-300" : "text-indigo-600"
      }`}
        style={disabled ? {} : {
          background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
          boxShadow: "0 2px 8px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}>
        {icon}
      </div>
      <span className="text-[10px] text-slate-600 font-semibold text-center leading-tight">{label}</span>
    </div>
  );
  if (disabled) return inner;
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return <Link href={href}>{inner}</Link>;
}

function ILine({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start px-5 py-3 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-base shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0 text-sm">{children}</div>
    </div>
  );
}

function IR({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-base w-5 shrink-0 text-center mt-0.5">{icon}</span>
      <div><p className="text-gray-400 text-xs">{label}</p><p className="text-gray-700 text-sm">{value}</p></div>
    </div>
  );
}

function MenuItem({ icon, label, href, onClick }: { icon: string; label: string; href?: string; onClick?: () => void }) {
  const cls = "flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition cursor-pointer w-full text-left";
  const inner = (
    <>
      <span className="text-[18px] w-6 text-center shrink-0">{icon}</span>
      <span className="text-sm text-gray-700">{label}</span>
    </>
  );
  if (href) return <Link href={href} onClick={onClick} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}
