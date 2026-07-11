import type { HmMapCityContentMatch, HmMapCityHeadline } from "@/lib/hmMapCityNews";

export type MapContentLayerKey = "news" | "video" | "bilgiAgaci";

export type MapContentLayers = Record<MapContentLayerKey, boolean>;

export const DEFAULT_MAP_CONTENT_LAYERS: MapContentLayers = {
  news: true,
  video: true,
  bilgiAgaci: false,
};

export const MAP_CONTENT_LAYER_LABELS: Record<MapContentLayerKey, string> = {
  news: "Haberler",
  video: "Videolar",
  bilgiAgaci: "Bilgi Ağacı",
};

export const MAP_CONTENT_LAYERS_STORAGE_KEY = "yekpare.mapContentLayers.v2";

export type BilgiAgaciMapPreview = {
  title: string;
  locationLabel: string;
  href: string;
  lat: number;
  lng: number;
};

export function readMapContentLayersFromStorage(): MapContentLayers {
  if (typeof window === "undefined") return { ...DEFAULT_MAP_CONTENT_LAYERS };
  try {
    const raw = window.localStorage.getItem(MAP_CONTENT_LAYERS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MAP_CONTENT_LAYERS };
    const parsed = JSON.parse(raw) as Partial<MapContentLayers>;
    return {
      news: parsed.news !== false,
      video: parsed.video !== false,
      bilgiAgaci: parsed.bilgiAgaci === true,
    };
  } catch {
    return { ...DEFAULT_MAP_CONTENT_LAYERS };
  }
}

export function writeMapContentLayersToStorage(layers: MapContentLayers): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_CONTENT_LAYERS_STORAGE_KEY, JSON.stringify(layers));
  } catch {
    /* ignore quota */
  }
}

export function contentLayerShowsAnyNewsVideo(layers: MapContentLayers): boolean {
  return layers.news || layers.video;
}

export function filterHeadlinesByContentLayers(
  headlines: HmMapCityHeadline[],
  layers: MapContentLayers,
): HmMapCityHeadline[] {
  if (!contentLayerShowsAnyNewsVideo(layers)) return [];
  return headlines.filter((row) => {
    if (row.kind === "news") return layers.news;
    if (row.kind === "video") return layers.video;
    return false;
  });
}

export function filterContentIndexByLayers(
  index: Map<string, HmMapCityContentMatch>,
  layers: MapContentLayers,
): Map<string, HmMapCityContentMatch> {
  if (!contentLayerShowsAnyNewsVideo(layers)) return new Map();
  const out = new Map<string, HmMapCityContentMatch>();
  for (const [key, match] of index) {
    if (match.kind === "news" && !layers.news) continue;
    if (match.kind === "video" && !layers.video) continue;
    out.set(key, match);
  }
  return out;
}
