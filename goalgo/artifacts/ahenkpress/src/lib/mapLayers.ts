export type BaseLayerId = "temel" | "hava_fotografi" | "hava" | "gece" | "topografik" | "siyasi" | "fiziki";

export interface BaseLayerDef {
  id: BaseLayerId;
  label: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

export const BASE_LAYER_DEFS: BaseLayerDef[] = [
  {
    id: "temel",
    label: "Temel+Sokak",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  },
  {
    id: "hava_fotografi",
    label: "Hava F.",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
    maxZoom: 19,
  },
  {
    id: "hava",
    label: "Hava Foto",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
    maxZoom: 19,
  },
  {
    id: "gece",
    label: "Gece",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap © CARTO",
    maxZoom: 19,
  },
  {
    id: "topografik",
    label: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap contributors",
    maxZoom: 17,
  },
  {
    id: "siyasi",
    label: "Siyasi",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors, HOT",
    maxZoom: 19,
  },
  {
    id: "fiziki",
    label: "Fiziki",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
    maxZoom: 19,
  },
];

export const OVERLAY_LAYER_LABELS = {
  earthquake: "Depremler",
  weather: "Hava Durumu",
  wildfire: "Orman Yangınları",
  dutyPharmacy: "Nöbetçi Eczane",
  population: "Nufus Yogunlugu",
  elevation: "Yukseklik Verisi",
  raster: "Raster Relief",
  geodesyGrid: "Jeodezik Grid",
} as const;

export interface OfficialMapLinkDef {
  id: string;
  label: string;
  url: string;
}

export const OFFICIAL_MAP_LINKS: OfficialMapLinkDef[] = [
  {
    id: "afad-deprem",
    label: "AFAD Son Depremler",
    url: "https://deprem.afad.gov.tr/last-earthquakes.html",
  },
  {
    id: "mgm-hava",
    label: "MGM Hava Durumu Haritalari",
    url: "https://mgm.gov.tr/tahmin/haritali-tahmin.aspx",
  },
  {
    id: "tkgm-parsel",
    label: "TKGM Parsel Sorgu",
    url: "https://parselsorgu.tkgm.gov.tr/",
  },
];

export interface AdvancedOverlayDef {
  id: string;
  label: string;
  type: "tile" | "wms";
  url: string;
  attribution: string;
  tileLayer?: string;
  format?: string;
  transparent?: boolean;
  legend?: string;
}

export const ADVANCED_OVERLAY_DEFS: AdvancedOverlayDef[] = [
  {
    id: "nasa-truecolor",
    label: "NASA True Color (WMS)",
    type: "wms",
    url: "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
    tileLayer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    format: "image/png",
    transparent: true,
    attribution: "NASA GIBS",
    legend: "Gercek renk uydu goruntusu",
  },
  {
    id: "nasa-night",
    label: "NASA Gece Isiklari (WMS)",
    type: "wms",
    url: "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
    tileLayer: "VIIRS_CityLights_2012",
    format: "image/png",
    transparent: true,
    attribution: "NASA GIBS",
    legend: "Gece isik yogunlugu katmani",
  },
  {
    id: "stamen-toner-lines",
    label: "Vektor Cizgi (Tile)",
    type: "tile",
    url: "https://stamen-tiles.a.ssl.fastly.net/toner-lines/{z}/{x}/{y}.png",
    attribution: "Stamen",
    legend: "Siyasi/vektor cizgi vurgusu",
  },
];

/** Leaflet tile layer — minimal surface for visibility sync helper. */
export type LeafletTileLayerLike = {
  on: (events: string, fn: () => void) => void;
  off: (events: string, fn: () => void) => void;
  getContainer?: () => HTMLElement | null;
  _url?: string;
};

/**
 * Leaflet hides tiles until `leaflet-tile-loaded` is set. Cached tiles can finish
 * loading before the handler runs — add the class only; do not touch inline visibility.
 */
export function syncLeafletTileLoadedVisibility(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>("img.leaflet-tile").forEach((tile) => {
    if (tile.complete && tile.naturalWidth > 0) {
      tile.classList.add("leaflet-tile-loaded");
    }
  });
}

/** One-shot sync after layer add; tileload only — never on "loading" (causes flicker). */
export function attachLeafletTileVisibilitySync(layer: LeafletTileLayerLike) {
  const sync = () => syncLeafletTileLoadedVisibility(layer.getContainer?.() ?? document);
  layer.on("tileload load", sync);
  sync();
  window.setTimeout(sync, 0);
  window.setTimeout(sync, 150);
  return sync;
}

export type LeafletMapLike = {
  on: (events: string, fn: () => void) => void;
  off: (events: string, fn: () => void) => void;
  getContainer: () => HTMLElement;
};

/**
 * Map-wide tile visibility for every layer (base, labels, overlays).
 * Capture-phase img load catches browser-cache hits that skip tileload.
 */
export function attachLeafletMapContainerTileSync(map: LeafletMapLike): () => void {
  const container = map.getContainer();
  const sync = () => syncLeafletTileLoadedVisibility(container);
  const onImgLoad = (event: Event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains("leaflet-tile")) return;
    if (img.complete && img.naturalWidth > 0) img.classList.add("leaflet-tile-loaded");
  };
  map.on("tileload load", sync);
  container.addEventListener("load", onImgLoad, true);
  sync();
  window.setTimeout(sync, 0);
  window.setTimeout(sync, 150);
  return () => {
    map.off("tileload load", sync);
    container.removeEventListener("load", onImgLoad, true);
  };
}
