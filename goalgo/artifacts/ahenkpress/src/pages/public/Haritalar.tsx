import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { forwardGeocodeAddressHybrid } from "../../lib/mapsGeocode";
import { ADVANCED_OVERLAY_DEFS, BASE_LAYER_DEFS, OFFICIAL_MAP_LINKS, OVERLAY_LAYER_LABELS } from "../../lib/mapLayers";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";

const API_BASE = "/api";

function wikiArticleSlug(title: string) {
  return wikiTitleToUrlSlug(title);
}

/** Panelde `homepage_super_category` ile eşleşen ana servis başlıkları */
const SERVICE_TABS = [
  { id: "all", label: "Tümü", emoji: "🗺️", superCategory: null as string | null },
  { id: "alisveris", label: "Alışveriş", emoji: "🛒", superCategory: "alisveris" },
  { id: "mekan", label: "Mekan", emoji: "🏛️", superCategory: "mekan" },
  { id: "turizm", label: "Seyahat", emoji: "✈️", superCategory: "turizm" },
  { id: "ulasim", label: "Ulaşım", emoji: "🚌", superCategory: "ulasim" },
] as const;

interface Business {
  id: string;
  googlePlaceId?: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  isPremium?: boolean;
  homepageSuperCategory?: string | null;
  description?: string;
  category?: { name: string; icon?: string; slug?: string };
  city?: { name: string; id?: string };
  district?: { name: string };
  workingHours?: string;
}

interface PopularLocation {
  id: string;
  name: string;
  nameTr?: string | null;
  latitude: number;
  longitude: number;
  zoomLevel?: number;
}

interface MapCity {
  id: string;
  name: string;
}

interface IlCenter {
  plaka: number | null;
  adi: string;
  lat: number;
  lng: number;
  zoom: number;
}

function getCategoryIcon(_slug?: string) {
  return "⭐";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"} style={{ fontSize: 14 }}>★</span>
      ))}
      <span className="text-sm font-semibold text-gray-800 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function Haritalar() {
  const [, navigate] = useLocation();
  const { data: siteSettings } = useGetSiteSettings();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseTileRef = useRef<any>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const ilProvinceMarkersRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerRef = useRef<L.LayerGroup | null>(null);
  const earthquakeLayerRef = useRef<L.LayerGroup | null>(null);
  const advancedOverlayRefs = useRef<Record<string, L.Layer>>({});
  const gpsUserMarkerRef = useRef<L.Marker | null>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [superService, setSuperService] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.2, 35.2]);
  const [useNearbyPremium, setUseNearbyPremium] = useState(false);
  const [cityFilterId, setCityFilterId] = useState<string | null>(null);
  const [popularLocs, setPopularLocs] = useState<PopularLocation[]>([]);
  const [mapCities, setMapCities] = useState<MapCity[]>([]);
  const [ilCenters, setIlCenters] = useState<IlCenter[]>([]);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapLayersOpen, setMapLayersOpen] = useState(false);
  const [baseMapStyle, setBaseMapStyle] = useState<"temel" | "hava" | "gece" | "topografik">("temel");
  const [overlayEarthquake, setOverlayEarthquake] = useState(false);
  const [overlayWeather, setOverlayWeather] = useState(false);
  const [advancedOverlayEnabled, setAdvancedOverlayEnabled] = useState<Record<string, boolean>>({});
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  const [adminLayerConfig, setAdminLayerConfig] = useState<{
    defaultOpacity?: number;
    forceAdminLayerConfig?: boolean;
    baseLayers?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
    advancedLayers?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
    overlays?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
  } | null>(null);
  const [officialLinkHealth, setOfficialLinkHealth] = useState<Record<string, { ok: boolean; statusCode: number | null; latencyMs: number }>>({});
  const [officialHealthCheckedAt, setOfficialHealthCheckedAt] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [leftSidebarTab, setLeftSidebarTab] = useState<"temel_haritalar" | "isletmeler">("temel_haritalar");
  const [geoDataTab, setGeoDataTab] = useState<"afad" | "mgm" | "kgm">("afad");
  const [afadRows, setAfadRows] = useState<Array<{ id: string; location: string; latitude: number; longitude: number; magnitude: number; depthKm: number; date: string }>>([]);
  const [mgmRows, setMgmRows] = useState<Array<{ city: string; lat: number; lng: number; temperature: number; weatherCode: number }>>([]);
  const baseLayersForUi = BASE_LAYER_DEFS
    .filter((d) => ["temel", "hava", "gece", "topografik"].includes(d.id))
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
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  useEffect(() => {
    if (!isMobile) return;
    setLeftSidebarTab("temel_haritalar");
  }, [isMobile]);

  useEffect(() => {
    fetch(`${API_BASE}/popular-locations`)
      .then((r) => r.json())
      .then((d) => { if (d.success && Array.isArray(d.data)) setPopularLocs(d.data); })
      .catch(() => {});
    fetch(`${API_BASE}/map/cities`)
      .then((r) => r.json())
      .then((d) => { if (d.success && Array.isArray(d.data)) setMapCities(d.data); })
      .catch(() => {});
    fetch(`${API_BASE}/map/turkey-il-centers`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: IlCenter[] }) => {
        if (d.success && Array.isArray(d.data)) setIlCenters(d.data);
      })
      .catch(() => {});
    fetch(`${API_BASE}/map/settings`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: { mapLayerConfigJson?: string | null } }) => {
        if (!d.success || !d.data?.mapLayerConfigJson) return;
        const cfg = JSON.parse(d.data.mapLayerConfigJson) as {
          defaultOpacity?: number;
          forceAdminLayerConfig?: boolean;
          baseLayers?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
          advancedLayers?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
          overlays?: Array<{ id: string; enabled: boolean; sortOrder: number }>;
        };
        setAdminLayerConfig(cfg);
        const hasLocal = !!localStorage.getItem("ahenk_haritalar_layer_prefs_v1");
        if ((!hasLocal || cfg.forceAdminLayerConfig === true) && typeof cfg.defaultOpacity === "number") {
          setOverlayOpacity(Math.max(0.15, Math.min(1, cfg.defaultOpacity)));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom: 6,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    baseTileRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);
    ilProvinceMarkersRef.current = L.layerGroup().addTo(map);
    weatherLayerRef.current = L.layerGroup().addTo(map);
    earthquakeLayerRef.current = L.layerGroup().addTo(map);
    leafletMap.current = map;
    setLeafletReady(true);

    return () => {
      setLeafletReady(false);
      map.remove();
      leafletMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!leafletMap.current || !baseTileRef.current) return;
    const map = leafletMap.current;
    map.removeLayer(baseTileRef.current);
    const next = BASE_LAYER_DEFS.find((d) => d.id === baseMapStyle) ?? BASE_LAYER_DEFS.find((d) => d.id === "temel");
    if (!next) return;
    baseTileRef.current = L.tileLayer(next.url, { attribution: next.attribution, maxZoom: 19 }).addTo(map);
  }, [baseMapStyle]);

  useEffect(() => {
    if (baseLayersForUi.length === 0) return;
    if (!baseLayersForUi.some((x) => x.id === baseMapStyle)) {
      setBaseMapStyle(baseLayersForUi[0].id as typeof baseMapStyle);
    }
  }, [baseLayersForUi, baseMapStyle]);

  useEffect(() => {
    if (!earthquakeLayerRef.current) return;
    const layer = earthquakeLayerRef.current;
    layer.clearLayers();
    if (!overlayEarthquake) return;
    let cancelled = false;
    fetch(`${API_BASE}/map/afad/latest-earthquakes?days=7&limit=200`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: Array<{ location: string; latitude: number; longitude: number; magnitude: number; depthKm: number; date: string }> }) => {
        if (cancelled) return;
        const list = Array.isArray(d.data) ? d.data : [];
        for (const f of list.slice(0, 300)) {
          if (!Number.isFinite(f.latitude) || !Number.isFinite(f.longitude)) continue;
          const mag = Number(f.magnitude ?? 0);
          const marker = L.circleMarker([f.latitude, f.longitude], {
            radius: Math.max(3, Math.min(16, 3 + mag * 2)),
            color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.5, weight: 1.6,
          });
          marker.bindTooltip(`M${mag.toFixed(1)} · ${f.location || "Deprem"}`, { direction: "top" });
          marker.bindPopup(`<div><strong>M${mag.toFixed(1)}</strong><br/>${f.location}<br/><small>Derinlik: ${Number(f.depthKm || 0).toFixed(1)} km</small><br/><small>${f.date || ""}</small></div>`);
          layer.addLayer(marker);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [overlayEarthquake]);

  useEffect(() => {
    if (geoDataTab !== "afad" || afadRows.length > 0) return;
    fetch(`${API_BASE}/map/afad/latest-earthquakes?days=7&limit=100`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: Array<{ location: string; latitude: number; longitude: number; magnitude: number; depthKm: number; date: string }> }) => {
        const list = Array.isArray(d.data) ? d.data : [];
        setAfadRows(list.slice(0, 60).map((x, i) => ({ ...x, id: `${x.latitude}-${x.longitude}-${i}` })));
      })
      .catch(() => {});
  }, [geoDataTab, afadRows.length]);

  useEffect(() => {
    if (geoDataTab !== "mgm" || mgmRows.length > 0) return;
    fetch(`${API_BASE}/map/mgm-weather-summary?cityLimit=81`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: Array<{ city: string; lat: number; lng: number; temperature: number; weatherCode: number }> }) => {
        const list = Array.isArray(d.data) ? d.data : [];
        setMgmRows(list.slice(0, 81));
      })
      .catch(() => {});
  }, [geoDataTab, mgmRows.length]);

  useEffect(() => {
    if (leftSidebarTab !== "temel_haritalar") return;
    if (geoDataTab === "afad") {
      setOverlayEarthquake(true);
      setOverlayWeather(false);
    } else if (geoDataTab === "mgm") {
      setOverlayWeather(true);
      setOverlayEarthquake(false);
    }
  }, [leftSidebarTab, geoDataTab]);

  function weatherEmoji(code: number): string {
    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "⛅";
    if ([3, 45, 48].includes(code)) return "☁️";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌤️";
  }

  useEffect(() => {
    if (!weatherLayerRef.current) return;
    const layer = weatherLayerRef.current;
    layer.clearLayers();
    if (!overlayWeather || ilCenters.length === 0) return;
    let cancelled = false;
    Promise.all(ilCenters.slice(0, 81).map(async (il) => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${il.lat}&longitude=${il.lng}&current=temperature_2m,weather_code&timezone=auto`);
        const d = await r.json() as { current?: { temperature_2m?: number; weather_code?: number } };
        return { il, t: d.current?.temperature_2m, c: d.current?.weather_code };
      } catch {
        return { il, t: undefined, c: undefined };
      }
    })).then((rows) => {
      if (cancelled) return;
      for (const row of rows) {
        const temp = Number.isFinite(Number(row.t)) ? `${Math.round(Number(row.t))}°` : "--°";
        const icon = L.divIcon({
          className: "",
          html: `<div style="padding:2px 6px;border-radius:12px;background:rgba(15,23,42,0.8);color:#fff;font-size:11px;font-weight:700;border:1px solid rgba(255,255,255,0.2)">${weatherEmoji(Number(row.c ?? 1))} ${temp}</div>`,
          iconSize: [58, 22],
          iconAnchor: [29, 11],
        });
        layer.addLayer(L.marker([row.il.lat, row.il.lng], { icon, zIndexOffset: -100 }));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [overlayWeather, ilCenters]);

  useEffect(() => {
    if (!leafletMap.current) return;
    const map = leafletMap.current;
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
            });
          }
          layer.addTo(map);
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
  }, [advancedOverlayEnabled, overlayOpacity, advancedLayersForUi]);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch(`${API_BASE}/map/official-map-links-health`)
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

  // Persist layer preferences (Haritalar)
  useEffect(() => {
    if (!canUserCustomizeLayers) return;
    try {
      const raw = localStorage.getItem("ahenk_haritalar_layer_prefs_v1");
      if (!raw) return;
      const p = JSON.parse(raw) as {
        baseMapStyle?: typeof baseMapStyle;
        overlayWeather?: boolean;
        overlayEarthquake?: boolean;
        advancedOverlayEnabled?: Record<string, boolean>;
        overlayOpacity?: number;
      };
      if (p.baseMapStyle) setBaseMapStyle(p.baseMapStyle);
      if (typeof p.overlayWeather === "boolean") setOverlayWeather(p.overlayWeather);
      if (typeof p.overlayEarthquake === "boolean") setOverlayEarthquake(p.overlayEarthquake);
      if (p.advancedOverlayEnabled && typeof p.advancedOverlayEnabled === "object") setAdvancedOverlayEnabled(p.advancedOverlayEnabled);
      if (typeof p.overlayOpacity === "number") setOverlayOpacity(Math.max(0.15, Math.min(1, p.overlayOpacity)));
    } catch {
      // ignore invalid localStorage
    }
  }, [canUserCustomizeLayers]);

  useEffect(() => {
    if (!canUserCustomizeLayers) return;
    try {
      localStorage.setItem("ahenk_haritalar_layer_prefs_v1", JSON.stringify({
        baseMapStyle,
        overlayWeather,
        overlayEarthquake,
        advancedOverlayEnabled,
        overlayOpacity,
      }));
    } catch {
      // ignore storage errors
    }
  }, [canUserCustomizeLayers, baseMapStyle, overlayWeather, overlayEarthquake, advancedOverlayEnabled, overlayOpacity]);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
      const tab = SERVICE_TABS.find((t) => t.id === superService);
      if (tab?.superCategory) params.set("superCategory", tab.superCategory);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (cityFilterId) params.set("city", cityFilterId);
      if (useNearbyPremium && mapCenter) {
        params.set("lat", String(mapCenter[0]));
        params.set("lng", String(mapCenter[1]));
        params.set("radius", "50000");
      } else {
        params.set("lat", "39.2");
        params.set("lng", "35.2");
        params.set("radius", "2800000");
      }

      const res = await fetch(`${API_BASE}/map/businesses?${params}`);
      const data = await res.json();
      if (data.success) setBusinesses(data.data);
      else setBusinesses([]);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [mapCenter, superService, searchQuery, useNearbyPremium, cityFilterId]);

  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);

  useEffect(() => {
    if (!markersLayer.current) return;
    markersLayer.current.clearLayers();

    businesses.forEach((b) => {
      if (!b.latitude || !b.longitude) return;
      const districtDotMode = Boolean(cityFilterId || useNearbyPremium);
      const icon = districtDotMode
        ? L.divIcon({
          html: `<div style="width:12px;height:12px;border-radius:999px;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
          className: "",
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
        : L.divIcon({
          html: `<div style="
            background:#f59e0b;
            color:white;
            border-radius:50% 50% 50% 0;
            width:36px;height:36px;
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            transform:rotate(-45deg);
            border:2px solid white;
          "><span style="transform:rotate(45deg)">${getCategoryIcon(b.category?.slug)}</span></div>`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });

      const marker = L.marker([b.latitude, b.longitude], { icon });
      marker.on("click", () => setSelectedBusiness(b));
      marker.bindTooltip(b.name, { permanent: false, direction: "top" });
      markersLayer.current?.addLayer(marker);
    });
  }, [businesses]);

  /* 81 il merkezi — Keşfet ile aynı API; haritada küçük bayrak pinleri */
  useEffect(() => {
    if (!leafletReady || !leafletMap.current || !ilProvinceMarkersRef.current) return;
    const layer = ilProvinceMarkersRef.current;
    layer.clearLayers();
    if (ilCenters.length === 0) return;
    for (const il of ilCenters) {
      const icon = L.divIcon({
        className: "haritalar-il-pin",
        html: `<div style="width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid #1d4ed8;box-shadow:0 1px 5px rgba(0,0,0,0.35);cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1"><img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1f9-1f1f7.svg" alt="TR" style="width:13px;height:13px;display:block"/></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker([il.lat, il.lng], { icon, zIndexOffset: -200 });
      const wrap = L.DomUtil.create("div", "haritalar-il-popup");
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
      L.DomEvent.on(navBtn, "click", (ev: Event) => {
        L.DomEvent.stopPropagation(ev);
        setMapCenter([il.lat, il.lng]);
        setUseNearbyPremium(true);
        setCityFilterId(null);
        leafletMap.current?.setView([il.lat, il.lng], il.zoom || 9);
      });
      const wikiBtn = document.createElement("button");
      wikiBtn.type = "button";
      wikiBtn.className = "w-full text-left text-[11px] font-bold rounded-lg px-2 py-1.5 text-white";
      wikiBtn.style.background = "linear-gradient(135deg,#4f46e5,#7c3aed)";
      wikiBtn.textContent = "Şehir Bilgi";
      L.DomEvent.on(wikiBtn, "click", (ev: Event) => {
        L.DomEvent.stopPropagation(ev);
        navigate(`/bilgiagaci/${wikiArticleSlug(il.adi)}`);
      });
      row.appendChild(navBtn);
      row.appendChild(wikiBtn);
      wrap.appendChild(title);
      wrap.appendChild(row);
      marker.bindTooltip(il.adi, { permanent: false, direction: "top" });
      marker.bindPopup(wrap);
      layer.addLayer(marker);
    }
  }, [ilCenters, navigate, leafletReady]);

  const handleMyLocation = () => {
    if (!navigator.geolocation || !leafletMap.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMapCenter(loc);
        setUseNearbyPremium(true);
        setCityFilterId(null);
        leafletMap.current?.setView(loc, 17);
        if (gpsUserMarkerRef.current) {
          gpsUserMarkerRef.current.remove();
          gpsUserMarkerRef.current = null;
        }
        const m = L.marker(loc, {
          icon: L.divIcon({
            html: `<div style="width:18px;height:18px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(37,99,235,0.35)"></div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        })
          .addTo(leafletMap.current!)
          .bindTooltip("Konumunuz")
          .openTooltip();
        gpsUserMarkerRef.current = m;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 18_000 },
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchInput.trim();
    if (raw.length >= 3) {
      try {
        const q = /türkiye|turkiye/i.test(raw) ? raw : `${raw}, Türkiye`;
        const hit = await forwardGeocodeAddressHybrid(siteSettings ?? null, q);
        if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
          const loc: [number, number] = [hit.lat, hit.lng];
          setMapCenter(loc);
          setUseNearbyPremium(true);
          setCityFilterId(null);
          leafletMap.current?.setView(loc, 14);
        }
      } catch {
        /* yine de metin araması uygulanır */
      }
    }
    setSearchQuery(searchInput);
  };

  const flyToBusiness = (b: Business) => {
    if (b.latitude && b.longitude) {
      leafletMap.current?.setView([b.latitude, b.longitude], 16);
    }
    setSelectedBusiness(b);
  };

  const flyToPopular = (loc: PopularLocation) => {
    const z = loc.zoomLevel && loc.zoomLevel > 0 ? loc.zoomLevel : 12;
    setMapCenter([loc.latitude, loc.longitude]);
    setUseNearbyPremium(true);
    setCityFilterId(null);
    leafletMap.current?.setView([loc.latitude, loc.longitude], z);
  };

  return (
    <div style={{ height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", background: "#f1f3f4" }}>
      <div style={{
        background: "white", padding: "10px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        display: "flex", alignItems: "center", gap: 10, zIndex: 10, flexShrink: 0,
      }}>
        <Link href="/">
          <button type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#5f6368" }}>←</button>
        </Link>
        <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", gap: 8 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            background: "#f1f3f4", borderRadius: 24, padding: "8px 16px",
            border: "1px solid #dfe1e5", transition: "box-shadow 0.2s",
          }}>
            <span style={{ fontSize: 18, color: "#5f6368" }}>🔍</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Konum veya işletme (Google öncelikli, örn. Ankara Çankaya)"
              style={{ border: "none", background: "none", outline: "none", flex: 1, fontSize: 15, color: "#202124" }}
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#5f6368", fontSize: 18 }}>✕</button>
            )}
          </div>
          <button type="submit" style={{
            background: "#1a73e8", color: "white", border: "none", borderRadius: 20,
            padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: 14,
          }}>Ara</button>
        </form>
        <button type="button" onClick={handleMyLocation} title="Konumum — yakındaki premium" style={{
          background: "#1a73e8", color: "white", border: "none", borderRadius: "50%",
          width: 40, height: 40, fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }}>📍</button>
      </div>

      <div style={{
        background: "white", padding: "8px 12px", display: "flex", gap: 8, overflowX: "auto",
        borderBottom: "1px solid #e8eaed", flexShrink: 0,
        alignItems: "center",
        scrollbarWidth: "none",
      }}>
        {SERVICE_TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => { setSuperService(tab.id); setCityFilterId(null); }}
            style={{
              background: superService === tab.id ? "#1a73e8" : "#f1f3f4",
              color: superService === tab.id ? "white" : "#202124",
              border: "none", borderRadius: 20, padding: "6px 14px", cursor: "pointer",
              fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              transition: "all 0.2s",
            }}>
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
        <button type="button" onClick={() => { setUseNearbyPremium(false); setCityFilterId(null); }}
          style={{
            marginLeft: "auto", flexShrink: 0,
            background: !useNearbyPremium && !cityFilterId ? "#e8f0fe" : "#fff",
            color: "#1a73e8", border: "1px solid #dadce0", borderRadius: 20, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>
          Tüm premium (liste)
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column-reverse" : "row", overflow: "hidden", position: "relative" }}>
        <div style={{
          width: isMobile ? "100%" : 340, maxHeight: isMobile ? "46dvh" : "none",
          background: "white", overflowY: "auto", boxShadow: isMobile ? "0 -6px 22px rgba(0,0,0,0.12)" : "2px 0 8px rgba(0,0,0,0.1)",
          zIndex: 5, flexShrink: 0,
          display: "flex", flexDirection: "column",
        }}>
          {isMobile && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #e8eaed", background: "#f8fafc" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => setLeftSidebarTab("temel_haritalar")} style={{ border: "none", borderRadius: 10, padding: "8px 10px", fontWeight: 700, fontSize: 12, cursor: "pointer", background: leftSidebarTab === "temel_haritalar" ? "linear-gradient(135deg,#0f766e,#0ea5a5)" : "#e5e7eb", color: leftSidebarTab === "temel_haritalar" ? "#fff" : "#374151" }}>Temel Haritalar</button>
                <button type="button" onClick={() => setLeftSidebarTab("isletmeler")} style={{ border: "none", borderRadius: 10, padding: "8px 10px", fontWeight: 700, fontSize: 12, cursor: "pointer", background: leftSidebarTab === "isletmeler" ? "linear-gradient(135deg,#4338ca,#6366f1)" : "#e5e7eb", color: leftSidebarTab === "isletmeler" ? "#fff" : "#374151" }}>İşletmeler</button>
              </div>
              {leftSidebarTab === "temel_haritalar" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 8 }}>
                  {[
                    { id: "afad", label: "Son Depremler" },
                    { id: "mgm", label: "Hava Durumu" },
                    { id: "kgm", label: "Güzergah" },
                  ].map((t) => (
                    <button key={`m-${t.id}`} type="button" onClick={() => setGeoDataTab(t.id as typeof geoDataTab)} style={{ border: "none", borderRadius: 8, padding: "6px 8px", fontWeight: 700, fontSize: 10, cursor: "pointer", background: geoDataTab === t.id ? "#312e81" : "#e2e8f0", color: geoDataTab === t.id ? "#fff" : "#334155" }}>{t.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isMobile && leftSidebarTab === "temel_haritalar" && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #e8eaed", background: "#fff" }}>
              {geoDataTab === "afad" && (
                <div style={{ display: "grid", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                  {afadRows.slice(0, 20).map((eq) => (
                    <button key={eq.id} type="button" onClick={() => leafletMap.current?.setView([eq.latitude, eq.longitude], 10, { animate: true })} style={{ textAlign: "left", border: "1px solid #fecaca", borderRadius: 10, background: "#fef2f2", padding: "8px 10px", cursor: "pointer" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>M{eq.magnitude.toFixed(1)} · {eq.location}</div>
                      <div style={{ fontSize: 11, color: "#7f1d1d" }}>{eq.date} · {eq.depthKm.toFixed(1)} km</div>
                    </button>
                  ))}
                </div>
              )}
              {geoDataTab === "mgm" && (
                <div style={{ display: "grid", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                  {mgmRows.slice(0, 20).map((w, i) => (
                    <button key={`${w.city}-${i}`} type="button" onClick={() => leafletMap.current?.setView([w.lat, w.lng], 9, { animate: true })} style={{ textAlign: "left", border: "1px solid #bae6fd", borderRadius: 10, background: "#f0f9ff", padding: "8px 10px", cursor: "pointer" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0369a1" }}>{w.city}</div>
                      <div style={{ fontSize: 11, color: "#0c4a6e" }}>{Number.isFinite(w.temperature) ? `${Math.round(w.temperature)}°C` : "--°C"}</div>
                    </button>
                  ))}
                </div>
              )}
              {geoDataTab === "kgm" && (
                <div style={{ border: "1px solid #fde68a", borderRadius: 10, background: "#fffbeb", padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>KGM Güzergah Analizi</div>
                  <button type="button" onClick={() => navigate("/kesfet")} style={{ border: "none", borderRadius: 8, padding: "8px 10px", fontWeight: 700, fontSize: 12, cursor: "pointer", background: "linear-gradient(135deg,#b45309,#f59e0b)", color: "#fff" }}>
                    Keşfet'te Güzergahı Aç
                  </button>
                </div>
              )}
            </div>
          )}

          {isMobile && leftSidebarTab === "temel_haritalar" ? null : (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8eaed", background: "#f8f9fa" }}>
            <div style={{ fontSize: 13, color: "#5f6368" }}>
              {loading ? "Yükleniyor..." : `${businesses.length} premium işletme`}
            </div>
            <div style={{ fontSize: 11, color: "#9aa0a6", marginTop: 4 }}>
              {useNearbyPremium ? "Harita odağına göre yakın kayıtlar" : "Türkiye geneli (konum filtresi kapalı)"}
            </div>
          </div>
          )}

          {(leftSidebarTab === "isletmeler" || !isMobile) && popularLocs.length > 0 && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e8eaed", background: "#fff" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#202124", marginBottom: 8 }}>Popüler lokasyonlar</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {popularLocs.slice(0, 12).map((loc) => (
                  <button key={loc.id} type="button" onClick={() => flyToPopular(loc)}
                    style={{
                      fontSize: 11, padding: "4px 8px", borderRadius: 12, border: "1px solid #dadce0",
                      background: "white", cursor: "pointer", color: "#1967d2",
                    }}>
                    {loc.nameTr || loc.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(leftSidebarTab === "isletmeler" || !isMobile) && mapCities.length > 0 && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e8eaed", background: "#fafafa" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#202124", marginBottom: 8 }}>Şehir rehberi</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                {mapCities.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setCityFilterId(c.id); setUseNearbyPremium(false); }}
                    style={{
                      fontSize: 11, padding: "4px 8px", borderRadius: 12,
                      border: cityFilterId === c.id ? "1px solid #1a73e8" : "1px solid #dadce0",
                      background: cityFilterId === c.id ? "#e8f0fe" : "white", cursor: "pointer", color: "#202124",
                    }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(leftSidebarTab === "isletmeler" || !isMobile) && <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: "#5f6368" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
                <div>Harita yükleniyor...</div>
              </div>
            ) : businesses.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#5f6368" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📍</div>
                <div>Bu filtreye uygun premium işletme yok</div>
                <div style={{ fontSize: 13, marginTop: 8, color: "#9aa0a6" }}>Sekmeyi veya şehir filtresini değiştirmeyi deneyin</div>
              </div>
            ) : (
              businesses.map((b) => (
                <div key={b.id} onClick={() => flyToBusiness(b)} onKeyDown={(e) => e.key === "Enter" && flyToBusiness(b)} role="button" tabIndex={0}
                  style={{
                    padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #f1f3f4",
                    background: selectedBusiness?.id === b.id ? "#e8f0fe" : "white",
                    transition: "background 0.15s",
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}
                  onMouseEnter={(e) => { if (selectedBusiness?.id !== b.id) (e.currentTarget as HTMLDivElement).style.background = "#f8f9fa"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = selectedBusiness?.id === b.id ? "#e8f0fe" : "white"; }}
                >
                  <div style={{
                    width: 64, height: 64, borderRadius: 8, flexShrink: 0, overflow: "hidden",
                    background: "#f1f3f4", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28,
                  }}>
                    {b.photoUrl ? (
                      <img src={b.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      "⭐"
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ background: "#f59e0b", color: "white", fontSize: 10, padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>PREMİUM</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#202124", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                    {b.rating ? <StarRating rating={b.rating} /> : null}
                    {b.userRatingsTotal ? <div style={{ fontSize: 12, color: "#70757a", marginTop: 2 }}>({b.userRatingsTotal} değerlendirme)</div> : null}
                    {b.category ? <div style={{ fontSize: 12, color: "#70757a", marginTop: 4 }}>{b.category.name}</div> : null}
                    {b.address ? <div style={{ fontSize: 12, color: "#70757a", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {b.address}</div> : null}
                  </div>
                </div>
              ))
            )}
          </div>}
        </div>

        <div ref={mapRef} style={{ flex: 1, minHeight: isMobile ? "54dvh" : undefined, zIndex: 1 }} />
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: isMobile ? 72 : 18, zIndex: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 14, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(255,255,255,0.35)", backdropFilter: "blur(10px)", boxShadow: "0 8px 22px rgba(15,23,42,0.16)" }}>
            {[
              { id: "afad", label: "Son Depremler" },
              { id: "mgm", label: "Hava Durumu" },
              { id: "kgm", label: "Güzergah" },
            ].map((t) => (
              <button
                key={`map-quick-${t.id}`}
                type="button"
                onClick={() => {
                  setLeftSidebarTab("temel_haritalar");
                  setGeoDataTab(t.id as typeof geoDataTab);
                }}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "7px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  background: geoDataTab === t.id ? "#312e81" : "#e2e8f0",
                  color: geoDataTab === t.id ? "#fff" : "#334155",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", right: 14, top: 14, zIndex: 15 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <button
              type="button"
              onClick={() => setMapLayersOpen((s) => !s)}
              style={{
                background: "linear-gradient(135deg,#0f766e,#0ea5a5)", color: "white", border: "none",
                borderRadius: 16, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              Katmanlar
            </button>
            {mapLayersOpen && (
              <div style={{
                width: 290, background: "rgba(15,23,42,0.9)", color: "white", borderRadius: 12, padding: 10,
                border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(8px)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Temel Harita</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, marginBottom: 10 }}>
                  {baseLayersForUi.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      disabled={!canUserCustomizeLayers}
                      onClick={() => setBaseMapStyle(id as typeof baseMapStyle)}
                      style={{
                        textAlign: "left", padding: "5px 8px", borderRadius: 8, cursor: "pointer",
                        border: baseMapStyle === id ? "1px solid rgba(125,211,252,0.7)" : "1px solid rgba(255,255,255,0.2)",
                        background: baseMapStyle === id ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.08)",
                        color: "white", fontSize: 11,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Veri Katmanları</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", rowGap: 4 }}>
                  {(adminLayerConfig?.overlays
                    ? adminLayerConfig.overlays.filter((o) => o.enabled).sort((a, b) => a.sortOrder - b.sortOrder).map((o) => o.id)
                    : ["earthquake", "weather"]
                  ).map((id) => (
                    id === "earthquake" ? (
                      <label key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
                        <input type="checkbox" disabled={!canUserCustomizeLayers} checked={overlayEarthquake} onChange={(e) => setOverlayEarthquake(e.target.checked)} />
                        {OVERLAY_LAYER_LABELS.earthquake}
                      </label>
                    ) : id === "weather" ? (
                      <label key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
                        <input type="checkbox" disabled={!canUserCustomizeLayers} checked={overlayWeather} onChange={(e) => setOverlayWeather(e.target.checked)} />
                        {OVERLAY_LAYER_LABELS.weather}
                      </label>
                    ) : null
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>Katman Opakligi</div>
                    <div style={{ fontSize: 10, color: "#bae6fd" }}>%{Math.round(overlayOpacity * 100)}</div>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    disabled={!canUserCustomizeLayers}
                    value={Math.round(overlayOpacity * 100)}
                    onChange={(e) => setOverlayOpacity(Math.max(0.15, Math.min(1, Number(e.target.value) / 100)))}
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Gelismis WMS/WMTS</div>
                  <div style={{ display: "grid", rowGap: 4 }}>
                    {advancedLayersForUi.map((def) => (
                      <label key={def.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          disabled={!canUserCustomizeLayers}
                          checked={advancedOverlayEnabled[def.id] === true}
                          onChange={(e) => setAdvancedOverlayEnabled((s) => ({ ...s, [def.id]: e.target.checked }))}
                        />
                        {def.label}
                      </label>
                    ))}
                  </div>
                  {Object.entries(advancedOverlayEnabled).some(([, v]) => v) && (
                    <div style={{ marginTop: 6, border: "1px solid rgba(255,255,255,0.16)", borderRadius: 8, padding: "6px 8px", background: "rgba(255,255,255,0.06)" }}>
                      {advancedLayersForUi.filter((d) => advancedOverlayEnabled[d.id]).map((d) => (
                        <div key={d.id} style={{ fontSize: 10, color: "#cffafe" }}>{d.label}: {d.legend || "Legend yok"}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>Resmi Kaynaklar</div>
                    <div style={{ fontSize: 10, color: "#bae6fd" }}>
                      {officialHealthCheckedAt ? `son kontrol ${new Date(officialHealthCheckedAt).toLocaleTimeString("tr-TR")}` : "kontrol bekleniyor"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 5 }}>
                    {OFFICIAL_MAP_LINKS.map((link) => (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => {
                          if (link.id === "afad-deprem") setOverlayEarthquake(true);
                          else if (link.id === "mgm-hava") setOverlayWeather(true);
                          else if (link.id === "tkgm-parsel") {
                            setOverlayEarthquake(false);
                            setOverlayWeather(false);
                          }
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(255,255,255,0.08)",
                          color: "#dbeafe",
                          fontSize: 11,
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span>{link.label}</span>
                          <span
                            title={
                              officialLinkHealth[link.id]
                                ? `HTTP ${officialLinkHealth[link.id].statusCode ?? "-"} · ${officialLinkHealth[link.id].latencyMs} ms`
                                : "Henüz ölçülmedi"
                            }
                            style={
                              officialLinkHealth[link.id]?.ok
                                ? { fontSize: 10, borderRadius: 10, padding: "2px 6px", background: "rgba(34,197,94,0.25)", color: "#bbf7d0" }
                                : officialLinkHealth[link.id]
                                  ? { fontSize: 10, borderRadius: 10, padding: "2px 6px", background: "rgba(239,68,68,0.25)", color: "#fecaca" }
                                  : { fontSize: 10, borderRadius: 10, padding: "2px 6px", background: "rgba(148,163,184,0.3)", color: "#e2e8f0" }
                            }
                          >
                            {officialLinkHealth[link.id]?.ok ? "online" : officialLinkHealth[link.id] ? "offline" : "..."}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedBusiness && (
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 380,
            background: "white", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
            zIndex: 20, overflowY: "auto", display: "flex", flexDirection: "column",
          }}>
            <div style={{ position: "relative", height: 200, background: "#f1f3f4", flexShrink: 0 }}>
              {selectedBusiness.photoUrl ? (
                <img src={selectedBusiness.photoUrl} alt={selectedBusiness.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>⭐</div>
              )}
              <button type="button" onClick={() => setSelectedBusiness(null)} style={{
                position: "absolute", top: 12, right: 12, background: "white", border: "none",
                borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}>✕</button>
              <div style={{
                position: "absolute", top: 12, left: 12, background: "#f59e0b",
                color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
              }}>⭐ PREMİUM</div>
            </div>

            <div style={{ padding: 20, flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#202124", marginBottom: 8 }}>{selectedBusiness.name}</h2>

              <div style={{ marginBottom: 12 }}>
                <Link href={`/kesfet/isletme/${selectedBusiness.id}`}>
                  <span style={{ color: "#1a73e8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Keşfet sayfasında aç →</span>
                </Link>
              </div>

              {selectedBusiness.rating ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <StarRating rating={selectedBusiness.rating} />
                  {selectedBusiness.userRatingsTotal ? (
                    <span style={{ fontSize: 13, color: "#70757a" }}>({selectedBusiness.userRatingsTotal} değerlendirme)</span>
                  ) : null}
                </div>
              ) : null}

              {selectedBusiness.category ? (
                <div style={{ fontSize: 14, color: "#70757a", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                  {selectedBusiness.category.name}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                {selectedBusiness.phone ? (
                  <a href={`tel:${selectedBusiness.phone}`} style={{
                    flex: 1, minWidth: 120, background: "#1a73e8", color: "white", border: "none",
                    borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    textDecoration: "none", textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>📞 Ara</a>
                ) : null}
                {selectedBusiness.latitude && selectedBusiness.longitude ? (
                  <a href={`https://www.openstreetmap.org/directions?from=&to=${selectedBusiness.latitude}%2C${selectedBusiness.longitude}`}
                    target="_blank" rel="noopener noreferrer" style={{
                      flex: 1, minWidth: 120, background: "#34a853", color: "white", border: "none",
                      borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                      textDecoration: "none", textAlign: "center",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>🗺️ Yol Tarifi</a>
                ) : null}
                {selectedBusiness.website ? (
                  <a href={selectedBusiness.website} target="_blank" rel="noopener noreferrer" style={{
                    flex: 1, minWidth: 120, background: "#f1f3f4", color: "#202124", border: "none",
                    borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    textDecoration: "none", textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>🌐 Web</a>
                ) : null}
              </div>

              <div style={{ borderTop: "1px solid #e8eaed", paddingTop: 16 }}>
                {selectedBusiness.address ? (
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
                    <div>
                      <div style={{ fontSize: 13, color: "#5f6368", marginBottom: 2 }}>Adres</div>
                      <div style={{ fontSize: 14, color: "#202124" }}>{selectedBusiness.address}</div>
                    </div>
                  </div>
                ) : null}
                {selectedBusiness.phone ? (
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📞</span>
                    <div>
                      <div style={{ fontSize: 13, color: "#5f6368", marginBottom: 2 }}>Telefon</div>
                      <a href={`tel:${selectedBusiness.phone}`} style={{ fontSize: 14, color: "#1a73e8", textDecoration: "none" }}>{selectedBusiness.phone}</a>
                    </div>
                  </div>
                ) : null}
                {selectedBusiness.website ? (
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🌐</span>
                    <div>
                      <div style={{ fontSize: 13, color: "#5f6368", marginBottom: 2 }}>Web Sitesi</div>
                      <a href={selectedBusiness.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#1a73e8", textDecoration: "none" }}>
                        {selectedBusiness.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </div>
                  </div>
                ) : null}
                {selectedBusiness.description ? (
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
                    <div>
                      <div style={{ fontSize: 13, color: "#5f6368", marginBottom: 2 }}>Hakkında</div>
                      <div style={{ fontSize: 14, color: "#202124", lineHeight: 1.5 }}>{selectedBusiness.description}</div>
                    </div>
                  </div>
                ) : null}
                {(selectedBusiness.city || selectedBusiness.district) ? (
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🏙️</span>
                    <div>
                      <div style={{ fontSize: 13, color: "#5f6368", marginBottom: 2 }}>Konum</div>
                      <div style={{ fontSize: 14, color: "#202124" }}>
                        {[selectedBusiness.district?.name, selectedBusiness.city?.name].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
