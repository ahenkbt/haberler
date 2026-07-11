import { useState, useEffect, useRef, useMemo } from "react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { GooglePlaceOneLinePicker } from "@/components/GooglePlaceOneLinePicker";
import { GoogleMapMiniPicker } from "@/components/GoogleMapMiniPicker";
import { forwardGeocodeAddressHybrid, type MapsGeocodeSettings } from "@/lib/mapsGeocode";
import { ADVANCED_OVERLAY_DEFS, BASE_LAYER_DEFS, OVERLAY_LAYER_LABELS } from "@/lib/mapLayers";
import { AdminLayout } from "@/components/AdminLayout";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap, postAdminJson, adminFetchErrorHint } from "@/lib/apiBase";
import { kesfetBusinessMapHref } from "@/lib/haritalarNav";
import { TURKEY_CITIES } from "@/lib/popularCities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Map as LMap, Marker as LMarker } from "leaflet";
import { YatYonetimiAdminTab } from "./YatYonetimiAdminTab";

const MAP_API_ROOT = apiUrl("/api");

/** Keşfet Popüler Aramalar grup anahtarı → harita superCategory / storeType */
const DISCOVER_GROUP_SUPER: Record<string, { superCategory: string; storeType: string; label: string }> = {
  saglik: { superCategory: "hizmet", storeType: "hizmet_medikal", label: "Sağlık" },
  ev: { superCategory: "alisveris", storeType: "alisveris", label: "Ev & Yaşam" },
  hizmetler: { superCategory: "hizmet", storeType: "hizmet", label: "Hizmetler" },
  egitim: { superCategory: "hizmet", storeType: "hizmet_egitim", label: "Eğitim" },
  eglence: { superCategory: "siparis", storeType: "mekan_restoran", label: "Yeme-İçme & Eğlence" },
  otomotiv: { superCategory: "hizmet", storeType: "otomotiv_genel", label: "Otomotiv" },
  siparis: { superCategory: "siparis", storeType: "siparis", label: "Sipariş" },
  servis: { superCategory: "hizmet", storeType: "hizmet", label: "Servis" },
  seyahat: { superCategory: "turizm", storeType: "turizm", label: "Seyahat & Turizm" },
  ulasim: { superCategory: "ulasim", storeType: "ulasim", label: "Ulaşım" },
  insaat: { superCategory: "insaat", storeType: "hizmet_insaat", label: "İnşaat" },
};

const SUPER_CATEGORY_LABELS: Record<string, string> = {
  siparis: "Sipariş / Mekan",
  mekan_dukkan: "Mekan & Dükkan",
  alisveris: "Alışveriş",
  hizmet: "Hizmet",
  turizm: "Turizm",
  seyahat: "Seyahat",
  ulasim: "Ulaşım",
  firma_rehberi: "Sarı Sayfalar / Firma Rehberi",
  insaat: "İnşaat",
};

interface Business {
  id: string;
  googlePlaceId?: string;
  name: string;
  address?: string;
  phone?: string;
  dbPhone?: string | null;
  dbAddress?: string | null;
  hasContactInDb?: boolean;
  website?: string;
  rating?: number;
  userRatingsTotal?: number | null;
  latitude?: number;
  longitude?: number;
  isPremium: boolean;
  isActive: boolean;
  homepageFeatured?: boolean;
  homepageSuperCategory?: string | null;
  storeType?: string | null;
  description?: string;
  photoUrl?: string;
  premiumExpiresAt?: string | null;
  importSource?: string | null;
  tags?: string[] | null;
  category?: { name: string };
  city?: { name: string };
  district?: { name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  googlePlaceType?: string;
  isActive: boolean;
  hitCount: number;
}

interface OwnershipClaim {
  id: string;
  googlePlaceId: string;
  fullName: string;
  email: string;
  phone: string;
  message?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface Stats {
  businesses: number;
  activeBusinesses?: number;
  publicListVisible?: number;
  withVendor?: number;
  scrapedVisible?: number;
  scrapedActive?: number;
  categories: number;
  users: number;
  reviews: number;
  pendingClaims: number;
  gmapsScrapeMissingBoth?: number;
  publicListFilterBreakdown?: {
    passVisible?: number;
    passPrivateCandidate?: number;
    excludedByContentQuality?: number;
    excludedByNotVisible?: number;
    excludedByPrivateCandidate?: number;
    excludedByDemo?: number;
    excludedByKamu?: number;
    excludedByInactive?: number;
  };
}

interface KgmServicesHealth {
  yolCalismaNokta: number | null;
  kapaliYolNokta: number | null;
  yolCalismaHat: number | null;
  kapaliYolHat: number | null;
  gezilecekYerler: number | null;
  havaIstasyonlari: number | null;
}

type Tab = "dashboard" | "businesses" | "categories" | "claims" | "scraper" | "locations" | "premium" | "settings" | "applications" | "importexport" | "userreviews" | "featureboost" | "platform" | "yacht";

interface LayerAdminToggleRow {
  id: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
}

interface MapAutoImportSettings {
  photoCount: number;
  reviewCount: number;
  refreshIntervalDays: number;
  scraperBackfillEnabled: boolean;
  scraperBackfillTargetPerCategory: number;
  scraperBackfillRadiusMeters: number;
  fetchAddress: boolean;
  fetchPhone: boolean;
  fetchWebsite: boolean;
  fetchRating: boolean;
  fetchCoordinates: boolean;
  fetchPhoto: boolean;
  fetchReview: boolean;
}

const DEFAULT_MAP_AUTO_IMPORT_SETTINGS: MapAutoImportSettings = {
  photoCount: 1,
  reviewCount: 1,
  refreshIntervalDays: 90,
  scraperBackfillEnabled: false,
  scraperBackfillTargetPerCategory: 1000,
  scraperBackfillRadiusMeters: 20000,
  fetchAddress: true,
  fetchPhone: true,
  fetchWebsite: true,
  fetchRating: true,
  fetchCoordinates: true,
  fetchPhoto: true,
  fetchReview: true,
};

interface NightScraperStatus {
  started: boolean;
  enabledOverride: boolean | null;
  allDay?: boolean;
  env?: { kesfetNightScraper: boolean; allDay: boolean };
  chromium?: {
    path: string | null;
    fromEnv: boolean;
    ok: boolean | null;
    lastProbeAt: string | null;
    lastProbeError: string | null;
  };
  window: { startHour: number; endHour: number; timezone: string; label: string };
  turkeyTime: string;
  withinWindow: boolean;
  forcingUntil: string | null;
  forceSource?: "admin" | "haritalar" | null;
  haritalarWake?: {
    lastAt: string | null;
    active: boolean;
    activeUntil: string | null;
  };
  running?: boolean;
  idle?: boolean;
  cursor: number;
  totalPairs: number;
  progressPercent: number;
  cyclesCompleted: number;
  lastTickAt: string | null;
  lastEnqueuedAt: string | null;
  lastPair: { city: string; category: string } | null;
  lastSkipReason: string | null;
  backfillLastRunAt?: string | null;
  backfillLastError?: string | null;
  backfillLastImported?: number;
  queueDepth: number;
  workerRunning: boolean;
  cityCount: number;
  categoryCount: number;
  dbStats?: {
    sinceMidnightTurkey: string;
    gmapsScrapeCreatedSinceMidnight: number;
    gmapsScrapeScrapedSinceMidnight: number;
    gmapsScrapeTotal: number;
  } | null;
}

interface InsaatfirmalarimQueueJobRow {
  id: string;
  batchId?: string;
  city: string;
  citySlug: string;
  category: string;
  categorySlug: string;
  status: "queued" | "running" | "done" | "error";
  firmsFound: number;
  firmsImported: number;
  firmsUpdated: number;
  pagesScraped: number;
  errors: string[];
  errorCount: number;
  remaining: number;
  message: string;
}

interface InsaatfirmalarimQueueStatus {
  workerRunning: boolean;
  queueDepth: number;
  inMemoryQueueDepth?: number;
  needsResume?: boolean;
  currentJob: {
    id: string;
    city: string;
    category: string;
    message: string;
    runningMs: number;
  } | null;
  lastWorkerError: string | null;
  jobTimeoutMinutes: number;
  summary: { done: number; running: number; queued: number; error: number; total: number };
  batches: Array<{
    batchId: string;
    jobCount: number;
    done: number;
    running: number;
    queued: number;
    error: number;
    imported: number;
  }>;
  jobs: InsaatfirmalarimQueueJobRow[];
  totalsByCity: Array<{ citySlug: string; city: string; imported: number; scraped: number }>;
}

interface YatportQueueJobRow {
  id: string;
  batchId?: string;
  status: "queued" | "running" | "done" | "error";
  mode?: string;
  listSlug?: string;
  districtSlug?: string;
  boatTypeSlug?: string;
  progress: {
    discovered: number;
    scraped: number;
    imported: number;
    updated: number;
    skipped: number;
    listPages?: number;
  };
  errorCount: number;
  errors?: string[];
  message: string;
}

interface YatportQueueStatus {
  workerRunning: boolean;
  queueDepth: number;
  jobTimeoutMinutes?: number;
  fetchTimeoutSeconds?: number;
  currentJob: {
    id: string;
    mode?: string;
    label: string;
    message: string;
    runningMs: number;
    discovered?: number;
    scraped?: number;
  } | null;
  lastWorkerError: string | null;
  summary: { done: number; running: number; queued: number; error: number; total: number };
  jobs: YatportQueueJobRow[];
}

interface MapPlaceDraftAdmin {
  id: string;
  name: string;
  type: string;
  category?: string | null;
  metadata?: {
    categoryRawLabel?: string | null;
    categoryId?: string | null;
    categorySlug?: string | null;
    categoryName?: string | null;
    selectedCategory?: {
      id?: string | null;
      slug?: string | null;
      name?: string | null;
    } | null;
  } | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  latitude: number;
  longitude: number;
  status: string;
  adminNote?: string | null;
  businessId?: string | null;
  createdAt: string;
}

interface MapLayerDefinitionAdmin {
  id: string;
  key: string;
  label: string;
  icon?: string | null;
  kind: string;
  sourceType: string;
  sourceUrl?: string | null;
  isEnabled: boolean;
  requiresExternalData: boolean;
  emptyState?: string | null;
  sortOrder: number;
}

interface PremiumProduct { id: string; name: string; description: string | null; price: number; currency: string; imageUrl: string | null; isAvailable: boolean; sortOrder: number; }
interface PremiumCampaign { id: string; title: string; description: string | null; discountPercent: number | null; validUntil: string | null; imageUrl: string | null; isActive: boolean; }
interface PremiumReservation { id: string; customerName: string; customerPhone: string; customerEmail: string | null; reservationDate: string; partySize: number | null; note: string | null; status: string; }
interface PremiumOrder { id: string; customerName: string; customerPhone: string; totalAmount: number; currency: string; status: string; note: string | null; createdAt: string; }

interface PopularLocation {
  id: string; name: string; nameTr: string | null; latitude: number; longitude: number;
  zoomLevel: number; imageUrl: string | null; description: string | null;
  businessCount: number | null; isActive: boolean; sortOrder: number;
}

/** `map_businesses.store_type` → `homepage_super_category` (anasayfa / keşfet şeritleri) */
const MAP_PREMIUM_STORE_OPTIONS: {
  group: string;
  groupHint?: string;
  items: { value: string; label: string; home: string }[];
}[] = [
  {
    group: "Turizm",
    items: [
      { value: "turizm_otel", label: "Otel", home: "turizm" },
      { value: "turizm_pansiyon", label: "Pansiyon / butik konaklama", home: "turizm" },
      { value: "turizm_villa", label: "Villa kiralama işletmesi", home: "turizm" },
      { value: "turizm_ev_kiralama", label: "Ev / daire kiralama (tatil)", home: "turizm" },
      { value: "turizm_tur_sirketi", label: "Tur şirketi", home: "turizm" },
      { value: "turizm_yat_tekne", label: "Yat / tekne turu işletmesi", home: "turizm" },
      { value: "turizm_rentacar", label: "Rent a car (turizm)", home: "seyahat" },
    ],
  },
  {
    group: "Seyahat",
    items: [
      { value: "seyahat_acenta", label: "Seyahat acentası", home: "seyahat" },
      { value: "seyahat_otobus", label: "Otobüs / hat seyahat şirketi", home: "seyahat" },
      { value: "seyahat_rentacar", label: "Rent a car (seyahat)", home: "seyahat" },
    ],
  },
  {
    group: "Ulaşım (şirket)",
    groupHint: "Önce işletme kaydı; araç ve şoförler ayrıca eklenir.",
    items: [
      { value: "ulasim_taksi_sirketi", label: "Taksi / dolmuş şirketi", home: "ulasim" },
      { value: "ulasim_kurye_sirketi", label: "Kurye şirketi", home: "ulasim" },
      { value: "ulasim_cekici_sirketi", label: "Çekici / oto kurtarma şirketi", home: "ulasim" },
      { value: "ulasim_nakliyat_kargo", label: "Nakliyat / lojistik / kargo şirketi", home: "ulasim" },
      { value: "ulasim_ozel_tasima", label: "Özel yolcu taşıma şirketi", home: "ulasim" },
      { value: "ulasim_minibus_servis", label: "Minibüs / servis / okul servisi şirketi", home: "ulasim" },
    ],
  },
  {
    group: "Ulaşım (bireysel)",
    groupHint: "Yalnızca araç paylaşımı bireysel hesapla; diğer ulaşım türleri şirket olmalıdır.",
    items: [{ value: "ulasim_arac_paylasim_bireysel", label: "Araç paylaşım (bireysel)", home: "ulasim" }],
  },
  {
    group: "Mekan & sipariş",
    groupHint: "Yemek ve market; Keşfet şeridinde Mekan & Dükkan'a düşer, panele taşıyınca Sipariş modülüne yönlendirilir.",
    items: [
      { value: "siparis", label: "Sipariş / teslimat (genel dükkan)", home: "siparis" },
      { value: "mekan_restoran", label: "Restoran / lokanta", home: "siparis" },
      { value: "mekan_kafe", label: "Kafe / kahveci / çay ocağı", home: "siparis" },
      { value: "mekan_fastfood", label: "Fast food / dürüm / burger", home: "siparis" },
      { value: "mekan_market", label: "Market / bakkal / süpermarket", home: "siparis" },
      { value: "mekan_kuruyemis", label: "Kuruyemiş / şekerleme", home: "siparis" },
      { value: "mekan_manav", label: "Manav / sebze-meyve", home: "siparis" },
      { value: "mekan_kasap", label: "Kasap / şarküteri", home: "siparis" },
      { value: "mekan_tavuk", label: "Tavuk / işkembe / kokoreç", home: "siparis" },
      { value: "mekan_balik", label: "Balık / deniz ürünleri (dükkan)", home: "siparis" },
      { value: "mekan_firin_unlu", label: "Fırın / unlu mamul / pastane (dükkan)", home: "siparis" },
      { value: "mekan_simit_borek", label: "Simit / börek / tost dükkanı", home: "siparis" },
      { value: "mekan_eczane", label: "Eczane", home: "siparis" },
      { value: "mekan_icecek", label: "İçecek / büfe / su bayii", home: "siparis" },
      { value: "mekan_cicek", label: "Çiçekçi", home: "siparis" },
      { value: "mekan_petshop", label: "Pet shop / mama", home: "siparis" },
      { value: "mekan_kitap_kirtasiye", label: "Kırtasiye / fotokopi", home: "siparis" },
      { value: "mekan_dukkan_diger", label: "Diğer mahalle dükkanı (sipariş)", home: "siparis" },
    ],
  },
  {
    group: "Alışveriş & genel hizmet",
    items: [
      { value: "alisveris", label: "E-ticaret / mağaza", home: "alisveris" },
      { value: "firma_rehberi", label: "Sarı Sayfalar / firma rehberi", home: "firma_rehberi" },
      { value: "firma_rehberi_hizmet", label: "Sarı Sayfalar hizmet işletmesi", home: "firma_rehberi" },
      { value: "firma_rehberi_magaza", label: "Sarı Sayfalar ürün listeleyen işletme", home: "firma_rehberi" },
      { value: "hizmet", label: "Genel hizmet işletmesi", home: "mekan_dukkan" },
      { value: "hizmetler", label: "Hizmetler (çoklu)", home: "mekan_dukkan" },
    ],
  },
];

const MAP_HOMEPAGE_SUPER_OPTIONS: { value: string; label: string }[] = [
  { value: "mekan_dukkan", label: "Mekan & Dükkan" },
  { value: "firma_rehberi", label: "Sarı Sayfalar / Firma Rehberi" },
  { value: "alisveris", label: "Alışveriş" },
  { value: "turizm", label: "Turizm" },
  { value: "seyahat", label: "Seyahat" },
  { value: "ulasim", label: "Ulaşım" },
  { value: "yiyecek", label: "Yiyecek & İçecek (eski)" },
  { value: "siparis", label: "Sipariş — Keşfet (eski)" },
  { value: "hizmet", label: "Hizmet (eski)" },
  { value: "mekan", label: "Mekan (eski)" },
  { value: "kamu", label: "Kamu ve Kamusal Alan" },
];

const MAP_HOMEPAGE_SUPER_VALUE_SET = new Set(MAP_HOMEPAGE_SUPER_OPTIONS.map((o) => o.value));

function homeCategoryFromStoreType(st: string | null | undefined): string | null {
  if (!st) return null;
  for (const g of MAP_PREMIUM_STORE_OPTIONS) {
    const hit = g.items.find((i) => i.value === st);
    if (hit) return hit.home;
  }
  return null;
}

const MAP_PREMIUM_STORE_VALUE_SET = new Set(
  MAP_PREMIUM_STORE_OPTIONS.flatMap((g) => g.items.map((i) => i.value)),
);

/* ─── LAT/LNG PICKER MODAL ─────────────────────────────────────── */
function LatLngPickerModal({
  initial, onSelect, onClose, mapsSettings,
}: {
  initial: { lat: number; lng: number } | null;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
  mapsSettings?: MapsGeocodeSettings | null;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(initial);
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!mapDivRef.current) return;
    let destroyed = false;

    (async () => {
      // Inject CSS once
      if (!document.getElementById("leaflet-css-admin")) {
        const link = document.createElement("link");
        link.id = "leaflet-css-admin";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
        await new Promise((r) => setTimeout(r, 120));
      }
      if (destroyed || !mapDivRef.current) return;

      const L = (await import("leaflet")).default;
      // Fix marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = initial ? [initial.lat, initial.lng] : [39.0, 35.0];
      const zoom = initial ? 15 : 6;
      const map = L.map(mapDivRef.current!, { center, zoom });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      function placeMarker(lat: number, lng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const m = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current = m;
          m.on("dragend", () => {
            const p = m.getLatLng();
            setPicked({ lat: p.lat, lng: p.lng });
          });
        }
        setPicked({ lat, lng });
      }

      if (initial) placeMarker(initial.lat, initial.lng);

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
      });
    })();

    return () => {
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch() {
    if (!searchQ.trim() || !mapRef.current) return;
    setSearching(true);
    try {
      const hybrid = await forwardGeocodeAddressHybrid(mapsSettings ?? null, searchQ);
      const lat = hybrid?.lat ?? null;
      const lng = hybrid?.lng ?? null;
      if (lat != null && lng != null) {
        mapRef.current.setView([lat, lng], 17);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          setPicked({ lat, lng });
        } else {
          const L = (await import("leaflet")).default;
          const m = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
          markerRef.current = m;
          m.on("dragend", () => { const p = m.getLatLng(); setPicked({ lat: p.lat, lng: p.lng }); });
          setPicked({ lat, lng });
        }
      }
    } catch { /* ignore */ }
    setSearching(false);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl"
        style={{ height: "min(600px, 90vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <span className="text-lg">📍</span>
          <span className="font-semibold text-gray-900">Haritadan Konum Seç</span>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 px-4 py-2 border-b shrink-0">
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Adres, semt veya işletme adı ara..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={doSearch}
            disabled={searching}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {searching ? "⏳" : "Ara"}
          </button>
        </div>

        {/* Map */}
        <div ref={mapDivRef} className="flex-1 min-h-0" />

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-3 border-t shrink-0 bg-gray-50 rounded-b-2xl">
          {picked ? (
            <div className="flex-1 text-xs font-mono text-gray-700 space-x-3">
              <span><span className="text-gray-400">Enlem:</span> {picked.lat.toFixed(7)}</span>
              <span><span className="text-gray-400">Boylam:</span> {picked.lng.toFixed(7)}</span>
            </div>
          ) : (
            <div className="flex-1 text-sm text-gray-400">Haritaya tıklayarak konum seçin veya markeri sürükleyin</div>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">
            İptal
          </button>
          <button
            onClick={() => picked && onSelect(picked.lat, picked.lng)}
            disabled={!picked}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition"
          >
            ✅ Bu Konumu Seç
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HaritalarYonetimi() {
  const { data: siteSettings } = useGetSiteSettings();
  const mapsGeocodeSettings: MapsGeocodeSettings | null = siteSettings
    ? {
        mapsGoogleBrowserKey: siteSettings.mapsGoogleBrowserKey,
        mapsGoogleEnabled: siteSettings.mapsGoogleEnabled,
      }
    : null;

  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [claims, setClaims] = useState<OwnershipClaim[]>([]);
  const [applications, setApplications] = useState<{ id: string; businessName: string; ownerName: string; ownerEmail: string; ownerPhone: string; paymentMethod: string; planMonths: number; status: string; adminNote?: string; createdAt: string; wireTransferNote?: string; businessId?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [kgmHealthLoading, setKgmHealthLoading] = useState(false);
  const [kgmHealthOk, setKgmHealthOk] = useState<boolean | null>(null);
  const [kgmHealth, setKgmHealth] = useState<KgmServicesHealth | null>(null);
  const [kgmHealthCheckedAt, setKgmHealthCheckedAt] = useState<string>("");
  const [placeDrafts, setPlaceDrafts] = useState<MapPlaceDraftAdmin[]>([]);
  const [mapLayerDefinitions, setMapLayerDefinitions] = useState<MapLayerDefinitionAdmin[]>([]);
  const [platformLoading, setPlatformLoading] = useState(false);

  // Business form
  const [bizForm, setBizForm] = useState<Partial<Business & { categoryId: string; cityId: string }>>({});
  const [editingBiz, setEditingBiz] = useState<string | null>(null);
  const [showBizForm, setShowBizForm] = useState(false);
  const [bizSearch, setBizSearch] = useState("");
  const [bizQ, setBizQ] = useState("");
  const [bizPage, setBizPage] = useState(1);
  const [bizPageLimit, setBizPageLimit] = useState<number>(200);
  const [bizPageLimitCustom, setBizPageLimitCustom] = useState("");
  const [bizTotal, setBizTotal] = useState(0);
  const [bizFilterCity, setBizFilterCity] = useState("");
  const [bizFilterDistrict, setBizFilterDistrict] = useState("");
  const [bizFilterCategory, setBizFilterCategory] = useState("");
  const [bizFilterSuperCategory, setBizFilterSuperCategory] = useState("");
  const [bizFilterActive, setBizFilterActive] = useState<"" | "1" | "0">("");
  const [bizFilterPremium, setBizFilterPremium] = useState<"" | "1" | "0">("");
  const [bizFilterImportSource, setBizFilterImportSource] = useState("");
  const [bizFilterMissingContact, setBizFilterMissingContact] = useState<"" | "1" | "both">("");
  const [bizCities, setBizCities] = useState<{ id: string; name: string }[]>([]);
  const [bizDistricts, setBizDistricts] = useState<{ id: string; name: string }[]>([]);
  const [bulkMoveCategoryId, setBulkMoveCategoryId] = useState("");
  const [bulkMoveSuperCategory, setBulkMoveSuperCategory] = useState("");
  const [bulkMoveCityId, setBulkMoveCityId] = useState("");

  // Credential generation
  const [credModal, setCredModal] = useState<{ email: string; password: string; displayName: string } | null>(null);
  const [credLoading, setCredLoading] = useState(false);

  // Lat/Lng picker
  const [showLatLngPicker, setShowLatLngPicker] = useState(false);

  // Category form
  const [catForm, setCatForm] = useState<Partial<Category>>({});
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [categoryPanel, setCategoryPanel] = useState<"map" | "kesfet">("map");
  interface DiscoverSubcategoryRow {
    id: string;
    name: string;
    slug: string;
    googlePlaceType?: string | null;
    googleKeyword?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    groupId?: string;
  }
  interface DiscoverGroupRow {
    id: string;
    key: string;
    label: string;
    icon?: string | null;
    subcategories: DiscoverSubcategoryRow[];
  }
  const [discoverGroups, setDiscoverGroups] = useState<DiscoverGroupRow[]>([]);
  const [discoverSubForm, setDiscoverSubForm] = useState<Partial<DiscoverSubcategoryRow> & { groupId?: string }>({});
  const [editingDiscoverSub, setEditingDiscoverSub] = useState<string | null>(null);
  const [showDiscoverSubForm, setShowDiscoverSubForm] = useState(false);
  const [selectedDiscoverSubId, setSelectedDiscoverSubId] = useState("");

  interface MapScraperCategoryItem {
    id: string;
    slug: string;
    label: string;
    superCategory: string;
    superCategoryLabel: string;
    storeType: string;
    homepageSuperCategory: string;
    googlePlaceType: string | null;
    googleKeyword: string;
    categoryId: string | null;
    icon: string | null;
    source: string;
  }
  interface MapScraperCategoryGroup {
    superCategory: string;
    label: string;
    sortOrder: number;
    items: MapScraperCategoryItem[];
  }
  const [scraperCategoryGroups, setScraperCategoryGroups] = useState<MapScraperCategoryGroup[]>([]);
  const [scraperCategoryFilter, setScraperCategoryFilter] = useState("");
  const [discoverCategoryFilter, setDiscoverCategoryFilter] = useState("");
  const [selectedScraperCategoryId, setSelectedScraperCategoryId] = useState("backfill:yeme-icme-eglence");
  const [scraperCategoryTotal, setScraperCategoryTotal] = useState(0);
  const [discoverCategoryTotal, setDiscoverCategoryTotal] = useState(0);

  // User Reviews moderation
  interface AdminUserReview { id: string; businessId: string; businessName: string | null; nickname: string | null; rating: number; comment: string | null; photos: string[]; status: string; adminNote?: string; createdAt: string; }
  const [userReviews, setUserReviews] = useState<AdminUserReview[]>([]);
  const [urStatusFilter, setUrStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [urLoading, setUrLoading] = useState(false);

  interface FeaturePricingRow {
    placementKey: string;
    labelTr: string;
    priceDay: number;
    priceWeek: number;
    priceMonth: number;
    sortOrder?: number;
  }
  interface FeaturePromoAdminRow {
    id: string;
    businessId: string;
    businessName?: string | null;
    placementKey: string;
    billingPeriod: string;
    units: number;
    totalTry: number;
    paymentMethod: string;
    receiptUrl?: string | null;
    categorySuper?: string | null;
    status: string;
    createdAt?: string;
  }
  const [fpRows, setFpRows] = useState<FeaturePricingRow[]>([]);
  const [fpReqs, setFpReqs] = useState<FeaturePromoAdminRow[]>([]);
  const [fpReqFilter, setFpReqFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [fpLoading, setFpLoading] = useState(false);

  // Import / Export
  const [importText, setImportText] = useState("");
  const [importOverwrite, setImportOverwrite] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [slugGenResult, setSlugGenResult] = useState<string | null>(null);

  // Scraper form (Google Places)
  const [scraperForm, setScraperForm] = useState({ lat: "", lng: "", radius: "5000", category: "", keyword: "" });
  const [placesImport, setPlacesImport] = useState({
    textQuery: "",
    homepageSuperCategory: "siparis",
    storeType: "mekan_restoran",
    maxResults: "100",
    markOpeningAll: false,
    /** API sonrası Chromium ile ek foto + yorum birleştirme */
    hybridScrape: true,
    categorySlug: "yeme-icme-eglence",
    categoryId: null as string | null,
    googlePlaceType: "restaurant",
    googleKeyword: "restoran lokanta özel işletme",
  });
  const [selectedBizIds, setSelectedBizIds] = useState<string[]>([]);
  const [scraperResult, setScraperResult] = useState<string | null>(null);

  // OSM Scraper form
  const [osmForm, setOsmForm] = useState({ ilPlaka: "", lat: "39.9334", lng: "32.8597", radius: "3000", keyword: "" });
  const [trProvinces, setTrProvinces] = useState<{ plaka: string; adi: string }[]>([]);
  const [osmResult, setOsmResult] = useState<string | null>(null);
  const [osmLoading, setOsmLoading] = useState(false);
  const [scraperTab, setScraperTab] = useState<"osm" | "gmaps" | "google" | "insaat" | "yatport">("osm");

  // insaatfirmalarim.com scraper
  const [ifForm, setIfForm] = useState({
    mode: "city" as "city" | "category",
    citySlug: "adana",
    categorySlug: "muteahhitlik-hizmetleri",
    maxFirms: "",
    autoImport: true,
    geocode: false,
  });
  const [insaatCatalog, setInsaatCatalog] = useState<{
    cities: { slug: string; label: string }[];
    categories: { slug: string; label: string }[];
  } | null>(null);
  const [ifLoading, setIfLoading] = useState(false);
  const [ifQueueOpsLoading, setIfQueueOpsLoading] = useState(false);
  const [ifResult, setIfResult] = useState<string | null>(null);
  const [ifBatchId, setIfBatchId] = useState<string | null>(null);
  const [ifQueueOpen, setIfQueueOpen] = useState(false);
  const [ifQueueData, setIfQueueData] = useState<InsaatfirmalarimQueueStatus | null>(null);
  const [ifPreview, setIfPreview] = useState<Array<{ name?: string; city?: string; phone?: string | null; address?: string | null }>>([]);
  const ifQueuePanelRef = useRef<HTMLDivElement | null>(null);
  const ifAutoResumeAtRef = useRef(0);

  // yatport.com scraper
  const [ypForm, setYpForm] = useState({
    mode: "listing" as "listing" | "district" | "boatType",
    listSlug: "tekne-kiralama",
    districtSlug: "bebek",
    boatTypeSlug: "motoryat-kiralama",
    allDistricts: false,
    maxBoats: "2",
    autoImport: true,
    downloadImages: true,
  });
  const [yatportCatalog, setYatportCatalog] = useState<{
    rentalTypes: { slug: string; label: string }[];
    boatTypes: { slug: string; label: string }[];
    districts: { slug: string; label: string; listSlug?: string }[];
    listSlugs: string[];
  } | null>(null);
  const [ypLoading, setYpLoading] = useState(false);
  const [ypQueueOpsLoading, setYpQueueOpsLoading] = useState(false);
  const [ypResult, setYpResult] = useState<string | null>(null);
  const [ypBatchId, setYpBatchId] = useState<string | null>(null);
  const [ypQueueOpen, setYpQueueOpen] = useState(false);
  const [ypQueueData, setYpQueueData] = useState<YatportQueueStatus | null>(null);
  const [ypPreview, setYpPreview] = useState<Array<{ name?: string; city?: string; district?: string; phone?: string | null; price?: string | null }>>([]);
  const ypQueuePanelRef = useRef<HTMLDivElement | null>(null);

  const [placesPreview, setPlacesPreview] = useState<Array<{ name: string; address: string | null; rating: number | null; phone: string | null }>>([]);

  // Google Maps Bot scraper
  const [gmapsForm, setGmapsForm] = useState({
    query: "",
    lat: "",
    lng: "",
    maxResults: "100",
    storeType: "mekan_restoran",
    homepageSuperCategory: "siparis",
    categorySlug: "yeme-icme-eglence",
    categoryId: null as string | null,
    googlePlaceType: "restaurant",
    googleKeyword: "restoran lokanta özel işletme",
  });
  const [gmapsLoading, setGmapsLoading] = useState(false);
  const [gmapsResult, setGmapsResult] = useState<string | null>(null);
  const [gmapsPreview, setGmapsPreview] = useState<Array<{ name: string; address: string | null; rating: number | null; category: string | null; phone: string | null }>>([]);
  const [gmapsImporting, setGmapsImporting] = useState(false);

  // Google Maps kazıması iletişim bakımı
  const [contactOpsLoading, setContactOpsLoading] = useState<"backfill" | "purge" | null>(null);
  const [contactOpsResult, setContactOpsResult] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  // Popular locations
  const [locations, setLocations] = useState<PopularLocation[]>([]);
  const [locForm, setLocForm] = useState({ name: "", nameTr: "", latitude: "", longitude: "", zoomLevel: "13", imageUrl: "", description: "", sortOrder: "0" });
  const [editingLoc, setEditingLoc] = useState<string | null>(null);

  // Premium management
  const [premiumBizinesses, setPremiumBusinesses] = useState<Business[]>([]);
  const [selectedPremiumBiz, setSelectedPremiumBiz] = useState<Business | null>(null);
  const [premiumSubTab, setPremiumSubTab] = useState<"products" | "campaigns" | "reservations" | "orders">("products");
  const [premiumProducts, setPremiumProducts] = useState<PremiumProduct[]>([]);
  const [premiumCampaigns, setPremiumCampaigns] = useState<PremiumCampaign[]>([]);
  const [premiumReservations, setPremiumReservations] = useState<PremiumReservation[]>([]);
  const [premiumOrders, setPremiumOrders] = useState<PremiumOrder[]>([]);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [productForm, setProductForm] = useState<Partial<PremiumProduct>>({});
  const [campaignForm, setCampaignForm] = useState<Partial<PremiumCampaign>>({});
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);

  // Premium upgrade modal (from businesses list)
  const [premiumModalBiz, setPremiumModalBiz] = useState<Business | null>(null);
  const [premiumModalMonths, setPremiumModalMonths] = useState(1);
  const [premiumModalSaving, setPremiumModalSaving] = useState(false);
  /** Harita ana servis başlığı — `map_businesses.homepage_super_category` */
  const [premiumModalSuperCat, setPremiumModalSuperCat] = useState<string>("mekan_dukkan");

  // Settings
  const [settings, setSettings] = useState({
    googlePlacesApiKey: "",
    /** Harita ayarı veya Genel Ayarlar'daki Places anahtarı (sunucu birleşik kontrol) */
    googlePlacesEffectiveConfigured: false,
    firmsWildfireConfigured: false,
    automaticGoogleDataFetch: false,
    layerDefaultOpacity: 0.55,
    forceAdminLayerConfig: false,
    autoImportSettings: DEFAULT_MAP_AUTO_IMPORT_SETTINGS,
  });
  const [nightScraper, setNightScraper] = useState<NightScraperStatus | null>(null);
  const [nightScraperBusy, setNightScraperBusy] = useState(false);
  const [baseLayerRows, setBaseLayerRows] = useState<LayerAdminToggleRow[]>(
    BASE_LAYER_DEFS.map((d, i) => ({ id: d.id, label: d.label, enabled: true, sortOrder: i })),
  );
  const [advancedLayerRows, setAdvancedLayerRows] = useState<LayerAdminToggleRow[]>(
    ADVANCED_OVERLAY_DEFS.map((d, i) => ({ id: d.id, label: d.label, enabled: true, sortOrder: i })),
  );
  const [overlayRows, setOverlayRows] = useState<LayerAdminToggleRow[]>([
    { id: "earthquake", label: OVERLAY_LAYER_LABELS.earthquake, enabled: true, sortOrder: 0 },
    { id: "weather", label: OVERLAY_LAYER_LABELS.weather, enabled: true, sortOrder: 1 },
    { id: "wildfire", label: OVERLAY_LAYER_LABELS.wildfire, enabled: true, sortOrder: 2 },
    { id: "population", label: OVERLAY_LAYER_LABELS.population, enabled: true, sortOrder: 3 },
    { id: "elevation", label: OVERLAY_LAYER_LABELS.elevation, enabled: true, sortOrder: 4 },
    { id: "raster", label: OVERLAY_LAYER_LABELS.raster, enabled: true, sortOrder: 5 },
    { id: "geodesyGrid", label: OVERLAY_LAYER_LABELS.geodesyGrid, enabled: true, sortOrder: 6 },
  ]);

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function loadStats() {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/stats`);
      const d = await r.json();
      if (d.success) setStats(d.data);
    } catch {}
  }

  async function loadKgmServicesHealth() {
    setKgmHealthLoading(true);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/kgm/services-health`);
      const d = await r.json();
      if (d?.data && typeof d.data === "object") {
        setKgmHealth({
          yolCalismaNokta: typeof d.data.yolCalismaNokta === "number" ? d.data.yolCalismaNokta : null,
          kapaliYolNokta: typeof d.data.kapaliYolNokta === "number" ? d.data.kapaliYolNokta : null,
          yolCalismaHat: typeof d.data.yolCalismaHat === "number" ? d.data.yolCalismaHat : null,
          kapaliYolHat: typeof d.data.kapaliYolHat === "number" ? d.data.kapaliYolHat : null,
          gezilecekYerler: typeof d.data.gezilecekYerler === "number" ? d.data.gezilecekYerler : null,
          havaIstasyonlari: typeof d.data.havaIstasyonlari === "number" ? d.data.havaIstasyonlari : null,
        });
      }
      setKgmHealthOk(Boolean(d?.success));
      setKgmHealthCheckedAt(new Date().toLocaleTimeString("tr-TR"));
    } catch {
      setKgmHealthOk(false);
      setKgmHealthCheckedAt(new Date().toLocaleTimeString("tr-TR"));
    } finally {
      setKgmHealthLoading(false);
    }
  }

  async function loadBusinesses() {
    setLoading(true);
    try {
      await ensureAdminPanelBootstrap();
      const params = new URLSearchParams();
      params.set("page", String(bizPage));
      params.set("limit", String(bizPageLimit));
      if (bizQ.trim()) params.set("q", bizQ.trim());
      if (bizFilterCity) params.set("city", bizFilterCity);
      if (bizFilterDistrict) params.set("district", bizFilterDistrict);
      if (bizFilterCategory) params.set("category", bizFilterCategory);
      if (bizFilterSuperCategory) params.set("superCategory", bizFilterSuperCategory);
      if (bizFilterActive) params.set("active", bizFilterActive);
      if (bizFilterPremium) params.set("premium", bizFilterPremium);
      if (bizFilterImportSource) params.set("importSource", bizFilterImportSource);
      if (bizFilterMissingContact) params.set("missingContact", bizFilterMissingContact);
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/businesses?${params.toString()}`);
      const raw = await r.text();
      if (!r.ok) {
        let msg = `İşletme listesi alınamadı (HTTP ${r.status}).`;
        try {
          const j = JSON.parse(raw) as { error?: string; code?: string };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
          if (r.status === 401 && j?.code === "ADMIN_REQUIRED") {
            msg +=
              " Çözüm: çıkış yapıp yeniden giriş yapın; canlıda /api vekilinin Railway API'ye ulaştığını ve CORS_ALLOWED_ORIGINS içinde site origin'inin olduğunu kontrol edin. Ayrıntı: goalgo/docs/YEKPARE-GOOGLE-KONUM-RAPORU.md";
          }
        } catch {
          /* raw not JSON */
        }
        flash("error", msg.slice(0, 520));
        setBusinesses([]);
        setBizTotal(0);
        return;
      }
      const d = JSON.parse(raw) as { success?: boolean; data?: Business[]; total?: number; error?: string };
      if (d.success) {
        setBusinesses(Array.isArray(d.data) ? d.data : []);
        setBizTotal(typeof d.total === "number" ? d.total : 0);
      } else {
        flash("error", (d.error as string) || "Liste yanıtı geçersiz");
        setBusinesses([]);
        setBizTotal(0);
      }
    } catch (e) {
      flash("error", e instanceof Error ? e.message : "Bağlantı hatası");
      setBusinesses([]);
      setBizTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadBizCities() {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/cities`);
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) {
        setBizCities(d.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch {
      /* ignore */
    }
  }

  async function loadBizDistricts(cityId: string) {
    if (!cityId) {
      setBizDistricts([]);
      return;
    }
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/cities/${encodeURIComponent(cityId)}/districts`);
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) {
        setBizDistricts(d.data.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      } else setBizDistricts([]);
    } catch {
      setBizDistricts([]);
    }
  }

  async function bulkBusinessAction(action: string, payload: Record<string, unknown> = {}) {
    if (selectedBizIds.length === 0) return;
    if (action === "delete" && !confirm(`${selectedBizIds.length} işletme kalıcı silinsin mi?`)) return;
    try {
      const r = await postAdminJson("/api/map/admin/businesses/bulk", {
        action,
        ids: selectedBizIds,
        payload,
      });
      const d = await r.json().catch(() => ({}));
      if (d.success) {
        flash("success", `${d.affected ?? selectedBizIds.length} kayıt güncellendi.`);
        setSelectedBizIds([]);
        void loadBusinesses();
        void loadStats();
      } else flash("error", d.error || "Toplu işlem başarısız");
    } catch {
      flash("error", "Bağlantı hatası");
    }
  }

  async function bulkDeactivateSelectedBusinesses() {
    if (selectedBizIds.length === 0) return;
    if (!confirm(`${selectedBizIds.length} işletmeyi pasife almak istiyor musunuz?`)) return;
    try {
      const settled = await Promise.allSettled(
        selectedBizIds.map((id) =>
          apiFetch(`${MAP_API_ROOT}/map/businesses/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          }),
        ),
      );
      const ok = settled.filter((x) => x.status === "fulfilled").length;
      if (ok > 0) {
        flash("success", `${ok}/${selectedBizIds.length} işletme pasife alındı.`);
        setSelectedBizIds([]);
        void loadBusinesses();
        void loadStats();
      } else flash("error", "Pasife alma başarısız");
    } catch {
      flash("error", "Bağlantı hatası");
    }
  }

  async function bulkHardDeleteSelectedPassiveBusinesses() {
    const passiveSelected = businesses.filter((b) => selectedBizIds.includes(b.id) && !b.isActive).map((b) => b.id);
    if (passiveSelected.length === 0) {
      flash("error", "Kalıcı silme için önce pasif işletme seçin.");
      return;
    }
    if (!confirm(`${passiveSelected.length} pasif işletme kalıcı silinsin mi?`)) return;
    try {
      const r = await postAdminJson("/api/map/admin/businesses/bulk-delete", { ids: passiveSelected });
      const d = await r.json().catch(() => ({}));
      if (d.success) {
        flash("success", `${d.deleted ?? passiveSelected.length} pasif işletme kalıcı silindi.`);
        setSelectedBizIds((prev) => prev.filter((id) => !passiveSelected.includes(id)));
        void loadBusinesses();
        void loadStats();
      } else flash("error", d.error || "Kalıcı silme başarısız");
    } catch {
      flash("error", "Bağlantı hatası");
    }
  }

  async function purgeAllMapBusinesses() {
    const typed = window.prompt(
      "TÜM harita işletmelerini silmek için tam olarak şunu yazın: HARITA_ISLETMELERINI_SIL",
    );
    if (typed !== "HARITA_ISLETMELERINI_SIL") {
      flash("error", "İptal edildi veya onay metni yanlış.");
      return;
    }
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/businesses/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true, confirm: "HARITA_ISLETMELERINI_SIL" }),
      });
      const d = await r.json();
      if (d.success) {
        flash("success", d.message || "Tüm harita işletmeleri silindi.");
        setSelectedBizIds([]);
        void loadBusinesses();
        void loadStats();
      } else flash("error", d.error || "Silinemedi");
    } catch {
      flash("error", "Bağlantı hatası");
    }
  }

  async function loadCategories() {
    const r = await apiFetch(`${MAP_API_ROOT}/map/categories`);
    const d = await r.json();
    if (d.success) setCategories(d.data);
  }

  async function loadDiscoverCategories() {
    try {
      let r = await apiFetch(`${MAP_API_ROOT}/map/discover-categories`);
      let d = await r.json();
      if (!d.success || !Array.isArray(d.data) || d.data.length === 0) {
        r = await apiFetch(`${MAP_API_ROOT}/map/discover-categories/all`);
        d = await r.json();
      }
      if (d.success && Array.isArray(d.data)) {
        const groups = d.data as DiscoverGroupRow[];
        setDiscoverGroups(groups);
        const total = groups.reduce((n, g) => n + g.subcategories.filter((s) => s.isActive !== false).length, 0);
        setDiscoverCategoryTotal(total);
        if (!selectedDiscoverSubId) {
          const first = groups.flatMap((g) => g.subcategories).find((s) => s.isActive !== false);
          if (first) {
            setSelectedDiscoverSubId(first.id);
            applyDiscoverSubcategoryToScraper(first.id, groups);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  async function loadScraperCategories() {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/scraper-categories`);
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) {
        const groups = d.data as MapScraperCategoryGroup[];
        setScraperCategoryGroups(groups);
        setScraperCategoryTotal(typeof d.total === "number" ? d.total : groups.reduce((n, g) => n + (g.items?.length ?? 0), 0));
        const items = groups.flatMap((g) => g.items);
        const pick = items.find((it) => it.id === selectedScraperCategoryId) ?? items[0];
        if (pick) applyScraperCategoryFromItem(pick);
      }
    } catch {
      /* ignore */
    }
  }

  function applyScraperCategoryFromItem(cat: MapScraperCategoryItem) {
    setSelectedScraperCategoryId(cat.id);
    const kw = cat.googleKeyword || cat.label;
    setGmapsForm((prev) => ({
      ...prev,
      storeType: cat.storeType,
      homepageSuperCategory: cat.homepageSuperCategory,
      categorySlug: cat.slug,
      categoryId: cat.categoryId,
      googlePlaceType: cat.googlePlaceType ?? "",
      googleKeyword: kw,
      query: prev.query.trim() ? prev.query : `${kw} Türkiye`,
    }));
    setPlacesImport((prev) => ({
      ...prev,
      storeType: cat.storeType,
      homepageSuperCategory: cat.homepageSuperCategory,
      categorySlug: cat.slug,
      categoryId: cat.categoryId,
      googlePlaceType: cat.googlePlaceType ?? "",
      googleKeyword: kw,
      textQuery: prev.textQuery.trim() ? prev.textQuery : `${kw} Türkiye`,
    }));
    setScraperForm((prev) => ({
      ...prev,
      category: cat.googlePlaceType ?? prev.category,
      keyword: kw,
    }));
    setOsmForm((prev) => ({ ...prev, keyword: kw }));
  }

  const allScraperCategoryItems = useMemo(
    () => scraperCategoryGroups.flatMap((g) => g.items),
    [scraperCategoryGroups],
  );

  const filteredScraperCategoryGroups = useMemo(() => {
    const q = scraperCategoryFilter.trim().toLocaleLowerCase("tr-TR");
    if (!q) return scraperCategoryGroups;
    return scraperCategoryGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.label.toLocaleLowerCase("tr-TR").includes(q)
            || it.slug.toLocaleLowerCase("tr-TR").includes(q)
            || it.googleKeyword.toLocaleLowerCase("tr-TR").includes(q)
            || it.superCategoryLabel.toLocaleLowerCase("tr-TR").includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [scraperCategoryFilter, scraperCategoryGroups]);

  const selectedScraperCategory = useMemo(
    () => allScraperCategoryItems.find((it) => it.id === selectedScraperCategoryId) ?? null,
    [allScraperCategoryItems, selectedScraperCategoryId],
  );

  function applyScraperCategorySelection(categoryId: string) {
    const cat = allScraperCategoryItems.find((it) => it.id === categoryId);
    if (cat) applyScraperCategoryFromItem(cat);
  }

  const filteredDiscoverPickerGroups = useMemo(() => {
    const q = discoverCategoryFilter.trim().toLocaleLowerCase("tr-TR");
    const bySuper = new Map<string, { superCategory: string; label: string; items: DiscoverSubcategoryRow[] }>();
    for (const group of discoverGroups) {
      const meta = DISCOVER_GROUP_SUPER[group.key] ?? { superCategory: "hizmet", storeType: "hizmet", label: group.label };
      const subs = group.subcategories.filter((s) => {
        if (s.isActive === false) return false;
        if (!q) return true;
        return (
          s.name.toLocaleLowerCase("tr-TR").includes(q)
          || s.slug.toLocaleLowerCase("tr-TR").includes(q)
          || (s.googleKeyword ?? "").toLocaleLowerCase("tr-TR").includes(q)
          || group.label.toLocaleLowerCase("tr-TR").includes(q)
          || meta.label.toLocaleLowerCase("tr-TR").includes(q)
        );
      });
      if (!subs.length) continue;
      const bucket = bySuper.get(meta.superCategory) ?? {
        superCategory: meta.superCategory,
        label: SUPER_CATEGORY_LABELS[meta.superCategory] ?? meta.label,
        items: [],
      };
      bucket.items.push(...subs);
      bySuper.set(meta.superCategory, bucket);
    }
    return [...bySuper.values()]
      .map((g) => ({ ...g, items: g.items.sort((a, b) => a.name.localeCompare(b.name, "tr-TR")) }))
      .sort((a, b) => a.label.localeCompare(b.label, "tr-TR"));
  }, [discoverCategoryFilter, discoverGroups]);

  const selectedDiscoverSub = useMemo(
    () => discoverGroups.flatMap((g) => g.subcategories).find((s) => s.id === selectedDiscoverSubId) ?? null,
    [discoverGroups, selectedDiscoverSubId],
  );

  function applyDiscoverSubcategoryToScraper(subId: string, groupsOverride?: DiscoverGroupRow[]) {
    if (!subId) return;
    const groups = groupsOverride ?? discoverGroups;
    const group = groups.find((g) => g.subcategories.some((s) => s.id === subId));
    const sub = group?.subcategories.find((s) => s.id === subId);
    if (!sub) return;
    const meta = group ? (DISCOVER_GROUP_SUPER[group.key] ?? { superCategory: "hizmet", storeType: "hizmet", label: group.label }) : { superCategory: "hizmet", storeType: "hizmet", label: "Hizmet" };
    const kw = sub.googleKeyword || sub.name;
    const gpt = sub.googlePlaceType ?? "";
    setSelectedDiscoverSubId(subId);
    setOsmForm((p) => ({ ...p, keyword: kw }));
    setGmapsForm((p) => ({
      ...p,
      storeType: meta.storeType,
      homepageSuperCategory: meta.superCategory,
      categorySlug: sub.slug,
      categoryId: null,
      googlePlaceType: gpt,
      googleKeyword: kw,
      query: p.query.trim() ? p.query : `${kw} Türkiye`,
    }));
    setPlacesImport((p) => ({
      ...p,
      storeType: meta.storeType,
      homepageSuperCategory: meta.superCategory,
      categorySlug: sub.slug,
      categoryId: null,
      googlePlaceType: gpt,
      googleKeyword: kw,
      textQuery: p.textQuery.trim() ? p.textQuery : `${kw} Türkiye`,
    }));
    setScraperForm((p) => ({
      ...p,
      keyword: kw,
      category: gpt || p.category,
    }));
  }

  async function loadClaims() {
    const r = await apiFetch(`${MAP_API_ROOT}/map/ownership-claims`);
    const d = await r.json();
    if (d.success) setClaims(d.data);
  }

  async function loadApplications() {
    const r = await apiFetch(`${MAP_API_ROOT}/admin/business-applications`);
    const d = await r.json();
    if (d.success) setApplications(d.data);
  }

  async function approveApplication(id: string) {
    if (!confirm("Bu başvuruyu onaylamak istiyor musunuz? İşletme ve hesap oluşturulacak.")) return;
    const r = await apiFetch(`${MAP_API_ROOT}/admin/business-applications/${id}/approve`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const d = await r.json();
    if (d.success) { flash("success", "Onaylandı! İşletme ve hesap oluşturuldu."); loadApplications(); }
    else flash("error", d.error || "Hata oluştu");
  }

  async function rejectApplication(id: string, note: string) {
    const r = await apiFetch(`${MAP_API_ROOT}/admin/business-applications/${id}/reject`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminNote: note }) });
    const d = await r.json();
    if (d.success) { flash("success", "Başvuru reddedildi."); loadApplications(); }
    else flash("error", d.error || "Hata oluştu");
  }

  async function loadMapPlatform() {
    setPlatformLoading(true);
    try {
      const [draftRes, layerRes] = await Promise.all([
        apiFetch(`${MAP_API_ROOT}/admin/map/place-drafts?status=all`),
        apiFetch(`${MAP_API_ROOT}/admin/map/layers`),
      ]);
      const draftData = await draftRes.json();
      const layerData = await layerRes.json();
      if (draftData.success) setPlaceDrafts(draftData.data ?? []);
      if (layerData.success) setMapLayerDefinitions(layerData.data ?? []);
    } finally {
      setPlatformLoading(false);
    }
  }

  async function updatePlaceDraft(
    id: string,
    status: "pending" | "approved" | "rejected" | "hidden",
    adminNote = "",
    patch: { category?: string; categoryId?: string; categorySlug?: string; categoryName?: string } = {},
  ) {
    const r = await apiFetch(`${MAP_API_ROOT}/admin/map/place-drafts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote, categoryRawLabel: patch.category, ...patch }),
    });
    const d = await r.json();
    if (d.success) { flash("success", "Taslak güncellendi"); loadMapPlatform(); }
    else flash("error", d.error || "Taslak güncellenemedi");
  }

  async function savePlaceDraftCategory(draft: MapPlaceDraftAdmin) {
    const selectedId = draft.metadata?.categoryId || draft.metadata?.selectedCategory?.id || "";
    const selectedCategory = selectedId ? categories.find((cat) => cat.id === selectedId) : undefined;
    await updatePlaceDraft(draft.id, draft.status as "pending" | "approved" | "rejected" | "hidden", draft.adminNote || "", {
      category: draft.category || draft.metadata?.categoryRawLabel || "",
      categoryId: selectedCategory?.id || "",
      categorySlug: selectedCategory?.slug || "",
      categoryName: selectedCategory?.name || "",
    });
  }

  async function promotePlaceDraft(id: string) {
    if (!confirm("Bu taslağı aktif harita işletmesine dönüştürmek istiyor musunuz?")) return;
    const r = await apiFetch(`${MAP_API_ROOT}/admin/map/place-drafts/${id}/promote`, { method: "POST" });
    const d = await r.json();
    if (d.success) { flash("success", "Taslak işletmeye dönüştürüldü"); loadMapPlatform(); }
    else flash("error", d.error || "İşletmeye dönüştürülemedi");
  }

  async function updateMapLayer(layer: MapLayerDefinitionAdmin, patch: Partial<MapLayerDefinitionAdmin>) {
    const r = await apiFetch(`${MAP_API_ROOT}/admin/map/layers/${layer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch }),
    });
    const d = await r.json();
    if (d.success) { flash("success", "Katman güncellendi"); loadMapPlatform(); }
    else flash("error", d.error || "Katman güncellenemedi");
  }

  async function refreshNightScraper() {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/kesfet-night-scraper/status`);
      const d = await r.json();
      if (d.success && d.data) setNightScraper(d.data as NightScraperStatus);
    } catch {}
  }

  async function controlNightScraper(action: string, extra?: Record<string, unknown>) {
    setNightScraperBusy(true);
    try {
      const r = await postAdminJson("/api/map/admin/kesfet-night-scraper/control", { action, ...(extra ?? {}) });
      const d = await r.json();
      if (d?.success && d.data) {
        setNightScraper(d.data as NightScraperStatus);
        flash("success", "Gece kazıma botu güncellendi");
      } else {
        flash("error", d?.error || "İşlem başarısız");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      flash("error", `Gece botu güncellenemedi: ${msg}${adminFetchErrorHint(msg)}`);
    } finally {
      setNightScraperBusy(false);
    }
  }

  async function loadSettings() {
    const r = await apiFetch(`${MAP_API_ROOT}/map/settings`);
    const d = await r.json();
    if (!(d.success && d.data)) return;
    setSettings((s) => ({
      ...s,
      googlePlacesApiKey: d.data.googlePlacesApiKey === "***configured***" ? "" : "",
      googlePlacesEffectiveConfigured: Boolean(d.data.googlePlacesEffectiveConfigured),
      firmsWildfireConfigured: Boolean(d.data.firmsWildfireConfigured),
      automaticGoogleDataFetch: Boolean(d.data.automaticGoogleDataFetch),
      autoImportSettings: {
        ...DEFAULT_MAP_AUTO_IMPORT_SETTINGS,
        ...(d.data.mapAutoImportSettings || {}),
      },
    }));
    const nightStatus = d.data?.kesfetScraperBackfill?.nightScraper;
    if (nightStatus && typeof nightStatus === "object") setNightScraper(nightStatus as NightScraperStatus);
    try {
      const cfg = d.data.mapLayerConfigJson ? JSON.parse(d.data.mapLayerConfigJson) as {
        defaultOpacity?: number;
        forceAdminLayerConfig?: boolean;
        autoImportSettings?: Partial<MapAutoImportSettings>;
        baseLayers?: LayerAdminToggleRow[];
        advancedLayers?: LayerAdminToggleRow[];
        overlays?: LayerAdminToggleRow[];
      } : null;
      if (cfg) {
        const defaultOpacity = cfg.defaultOpacity;
        if (typeof defaultOpacity === "number") {
          setSettings((s) => ({ ...s, layerDefaultOpacity: Math.max(0.15, Math.min(1, defaultOpacity)) }));
        }
        if (typeof cfg.forceAdminLayerConfig === "boolean") {
          const forceAdmin = cfg.forceAdminLayerConfig === true;
          setSettings((s) => ({ ...s, forceAdminLayerConfig: forceAdmin }));
        }
        if (cfg.autoImportSettings && typeof cfg.autoImportSettings === "object") {
          setSettings((s) => ({
            ...s,
            autoImportSettings: {
              ...DEFAULT_MAP_AUTO_IMPORT_SETTINGS,
              ...(cfg.autoImportSettings as Partial<MapAutoImportSettings>),
            },
          }));
        }
        if (Array.isArray(cfg.baseLayers)) setBaseLayerRows(cfg.baseLayers);
        if (Array.isArray(cfg.advancedLayers)) setAdvancedLayerRows(cfg.advancedLayers);
        if (Array.isArray(cfg.overlays)) setOverlayRows(cfg.overlays);
      }
    } catch {
      // ignore malformed json
    }
  }

  async function loadLocations() {
    const r = await apiFetch(`${MAP_API_ROOT}/admin/popular-locations`);
    const d = await r.json();
    if (d.success) setLocations(d.data || []);
  }

  async function saveLocation() {
    if (!locForm.name || !locForm.latitude || !locForm.longitude) return;
    const body = { ...locForm, latitude: parseFloat(locForm.latitude), longitude: parseFloat(locForm.longitude), zoomLevel: parseInt(locForm.zoomLevel), sortOrder: parseInt(locForm.sortOrder) };
    const url = editingLoc ? `${MAP_API_ROOT}/admin/popular-locations/${editingLoc}` : `${MAP_API_ROOT}/admin/popular-locations`;
    const r = await apiFetch(url, { method: editingLoc ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.success) { loadLocations(); setLocForm({ name: "", nameTr: "", latitude: "", longitude: "", zoomLevel: "13", imageUrl: "", description: "", sortOrder: "0" }); setEditingLoc(null); flash("success", editingLoc ? "Güncellendi!" : "Eklendi!"); }
    else flash("error", d.error || "Hata");
  }

  async function deleteLocation(id: string) {
    if (!confirm("Silinsin mi?")) return;
    await apiFetch(`${MAP_API_ROOT}/admin/popular-locations/${id}`, { method: "DELETE" });
    loadLocations();
    flash("success", "Silindi");
  }

  async function toggleLocationActive(loc: PopularLocation) {
    await apiFetch(`${MAP_API_ROOT}/admin/popular-locations/${loc.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !loc.isActive }) });
    loadLocations();
  }

  async function loadUserReviews(status: "pending" | "approved" | "rejected" = urStatusFilter) {
    setUrLoading(true);
    try {
      const res = await apiFetch(`${MAP_API_ROOT}/map/admin/user-reviews?status=${status}`);
      const d = await res.json();
      if (d.success) setUserReviews(d.data ?? []);
    } catch {} finally { setUrLoading(false); }
  }

  async function moderateReview(id: string, status: "approved" | "rejected") {
    try {
      const res = await apiFetch(`${MAP_API_ROOT}/map/admin/user-reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (d.success) { flash("success", status === "approved" ? "Yorum onaylandı" : "Yorum reddedildi"); loadUserReviews(); }
      else flash("error", d.error || "Hata");
    } catch { flash("error", "Bağlantı hatası"); }
  }

  async function deleteReview(id: string) {
    if (!confirm("Bu yorumu silmek istediğinizden emin misiniz?")) return;
    try {
      await apiFetch(`${MAP_API_ROOT}/map/admin/user-reviews/${id}`, { method: "DELETE" });
      flash("success", "Yorum silindi");
      loadUserReviews();
    } catch { flash("error", "Bağlantı hatası"); }
  }

  async function loadFeaturePlacementPricing() {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/feature-placement-pricing`);
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) setFpRows(d.data);
    } catch {}
  }

  async function loadFeaturePromotionRequests() {
    setFpLoading(true);
    try {
      const qs = fpReqFilter === "all" ? "" : `?status=${fpReqFilter}`;
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/feature-promotion-requests${qs}`, { credentials: "include" });
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) setFpReqs(d.data);
    } catch {
      flash("error", "Öne çıkarma talepleri yüklenemedi (oturum?)");
    } finally {
      setFpLoading(false);
    }
  }

  async function saveFeaturePlacementPricing() {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/feature-placement-pricing`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: fpRows.map((row, i) => ({
            ...row,
            sortOrder: row.sortOrder ?? i,
          })),
        }),
      });
      const d = await r.json();
      if (d.success) {
        flash("success", "Fiyatlar kaydedildi");
        if (Array.isArray(d.data)) setFpRows(d.data);
      } else flash("error", d.error || "Kayıt başarısız");
    } catch {
      flash("error", "Bağlantı hatası");
    }
  }

  async function moderateFeaturePromotion(id: string, status: "approved" | "rejected") {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/feature-promotion-requests/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (d.success) {
        flash("success", status === "approved" ? "Talep onaylandı" : "Talep reddedildi");
        loadFeaturePromotionRequests();
      } else flash("error", d.error || "Hata");
    } catch {
      flash("error", "Bağlantı hatası");
    }
  }

  useEffect(() => {
    loadStats();
    void loadKgmServicesHealth();
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      void loadKgmServicesHealth();
    }, 60_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "categories") {
      loadCategories();
      loadDiscoverCategories();
    }
    if (tab === "claims") loadClaims();
    if (tab === "locations") loadLocations();
    if (tab === "premium") { loadPremiumBusinesses(); setSelectedPremiumBiz(null); }
    if (tab === "settings") loadSettings();
    if (tab === "applications") loadApplications();
    if (tab === "platform") { loadMapPlatform(); loadCategories(); }
    if (tab === "userreviews") loadUserReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== "featureboost") return;
    void loadFeaturePlacementPricing();
    void loadFeaturePromotionRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fpReqFilter]);

  useEffect(() => {
    if (tab !== "scraper") return;
    void loadDiscoverCategories();
    void loadScraperCategories();
    void loadInsaatCatalog();
    void loadYatportCatalog();
    apiFetch(`${MAP_API_ROOT}/tr-address/provinces`)
      .then(r => r.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows)) return;
        setTrProvinces(
          rows.map((x: { plaka: number | string; adi: string }) => ({
            plaka: String(x.plaka),
            adi: x.adi,
          })),
        );
      })
      .catch(() => {});
  }, [tab]);

  useEffect(() => {
    const delay = bizSearch.trim() ? 400 : 0;
    const t = setTimeout(() => setBizQ(bizSearch), delay);
    return () => clearTimeout(t);
  }, [bizSearch]);

  useEffect(() => {
    setBizPage(1);
  }, [bizQ, bizFilterCity, bizFilterDistrict, bizFilterCategory, bizFilterSuperCategory, bizFilterActive, bizFilterPremium, bizFilterImportSource, bizFilterMissingContact]);

  useEffect(() => {
    if (tab !== "businesses") return;
    void loadBizCities();
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    void loadBizDistricts(bizFilterCity);
    if (!bizFilterCity) setBizFilterDistrict("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizFilterCity]);

  useEffect(() => {
    if (tab !== "businesses") return;
    void loadBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bizQ, bizPage, bizPageLimit, bizFilterCity, bizFilterDistrict, bizFilterCategory, bizFilterSuperCategory, bizFilterActive, bizFilterPremium, bizFilterImportSource, bizFilterMissingContact]);

  useEffect(() => {
    setSelectedBizIds([]);
  }, [bizQ, bizFilterCity, bizFilterDistrict, bizFilterCategory, bizFilterSuperCategory, bizFilterActive, bizFilterPremium, bizFilterImportSource, bizFilterMissingContact]);

  /* ─── BUSINESS CRUD ─── */
  async function generateCredentials() {
    if (!editingBiz) return;
    setCredLoading(true);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/admin/map/businesses/${editingBiz}/generate-credentials`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const d = await r.json();
      if (d.success) setCredModal(d.data);
      else flash("error", d.error || "Kimlik bilgisi oluşturulamadı");
    } catch { flash("error", "Bağlantı hatası"); }
    finally { setCredLoading(false); }
  }

  async function saveBusiness() {
    const method = editingBiz ? "PUT" : "POST";
    const url = editingBiz ? `${MAP_API_ROOT}/map/businesses/${editingBiz}` : `${MAP_API_ROOT}/map/businesses`;
    try {
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(bizForm) });
      const d = await r.json();
      if (d.success) {
        const savedId = (d.data as { id?: string } | undefined)?.id ?? editingBiz;
        if (bizForm.isPremium && savedId) {
          void apiFetch(`${MAP_API_ROOT}/map/businesses/${savedId}/scrape-detail?reviewsOnly=1`, { method: "POST" }).catch(() => {});
        }
        flash("success", editingBiz ? "İşletme güncellendi" : "İşletme eklendi");
        setShowBizForm(false); setEditingBiz(null); setBizForm({});
        loadBusinesses(); loadStats();
      } else flash("error", d.error || "Hata oluştu");
    } catch { flash("error", "Bağlantı hatası"); }
  }

  async function deactivateBusiness(id: string) {
    if (!confirm("Bu işletmeyi pasife almak istediğinizden emin misiniz?")) return;
    await apiFetch(`${MAP_API_ROOT}/map/businesses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    flash("success", "İşletme pasife alındı");
    loadBusinesses(); loadStats();
  }

  async function hardDeleteBusiness(id: string) {
    if (!confirm("Bu pasif işletmeyi kalıcı silmek istediğinizden emin misiniz?")) return;
    const r = await postAdminJson("/api/map/admin/businesses/bulk-delete", { ids: [id] });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d?.success === false) {
      flash("error", d?.error || "Kalıcı silme başarısız");
      return;
    }
    flash("success", "İşletme kalıcı silindi");
    loadBusinesses(); loadStats();
  }

  async function toggleBizStatus(b: Business) {
    await apiFetch(`${MAP_API_ROOT}/map/businesses/${b.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    loadBusinesses();
  }

  async function toggleBizPremium(b: Business) {
    if (!b.isPremium) {
      setPremiumModalBiz(b);
      setPremiumModalMonths(1);
      setPremiumModalSuperCat(b.homepageSuperCategory || "mekan_dukkan");
      return;
    }
    await apiFetch(`${MAP_API_ROOT}/map/businesses/${b.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPremium: false }),
    });
    loadBusinesses();
  }

  async function setPremiumWithDuration(bizId: string, months: number) {
    if (!premiumModalSuperCat.trim()) {
      flash("error", "Önce işletme türü (harita ana başlığı) seçin.");
      return;
    }
    setPremiumModalSaving(true);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/businesses/${bizId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPremium: true,
          premiumExpiresAt: expiresAt.toISOString(),
          homepageSuperCategory: premiumModalSuperCat.trim(),
        }),
      });
      const d = await r.json();
      if (d.success) {
        flash("success", `Premium abonelik ${months} aylık olarak ayarlandı.`);
        setPremiumModalBiz(null);
        loadBusinesses();
        if (tab === "premium") loadPremiumBusinesses();
        void apiFetch(`${MAP_API_ROOT}/map/businesses/${bizId}/scrape-detail?reviewsOnly=1`, { method: "POST" }).catch(() => {});
      } else flash("error", d.error || "Hata oluştu");
    } catch { flash("error", "Bağlantı hatası"); }
    finally { setPremiumModalSaving(false); }
  }

  function subDaysLeft(expiresAt: string | null | undefined): number | null {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  async function toggleBizHomepageFeatured(b: Business, superCategory?: string) {
    const newFeatured = !b.homepageFeatured;
    await apiFetch(`${MAP_API_ROOT}/map/businesses/${b.id}/homepage-featured`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: newFeatured, superCategory: superCategory || b.homepageSuperCategory || "mekan_dukkan" }),
    });
    loadBusinesses();
  }

  /* ─── CATEGORY CRUD ─── */
  async function saveCategory() {
    const method = editingCat ? "PUT" : "POST";
    const url = editingCat ? `${MAP_API_ROOT}/map/categories/${editingCat}` : `${MAP_API_ROOT}/map/categories`;
    try {
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(catForm) });
      const d = await r.json();
      if (d.success) {
        flash("success", editingCat ? "Kategori güncellendi" : "Kategori eklendi");
        setShowCatForm(false); setEditingCat(null); setCatForm({});
        loadCategories(); loadStats();
      } else flash("error", d.error || "Hata oluştu");
    } catch { flash("error", "Bağlantı hatası"); }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`${MAP_API_ROOT}/map/categories/${id}`, { method: "DELETE" });
    flash("success", "Kategori silindi");
    loadCategories(); loadStats();
  }

  async function saveDiscoverSubcategory() {
    const method = editingDiscoverSub ? "PUT" : "POST";
    const url = editingDiscoverSub
      ? `${MAP_API_ROOT}/map/discover-subcategories/${editingDiscoverSub}`
      : `${MAP_API_ROOT}/map/discover-subcategories`;
    try {
      const r = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discoverSubForm),
      });
      const d = await r.json();
      if (d.success) {
        flash("success", editingDiscoverSub ? "Keşfet alt kategorisi güncellendi" : "Keşfet alt kategorisi eklendi");
        setShowDiscoverSubForm(false);
        setEditingDiscoverSub(null);
        setDiscoverSubForm({});
        loadDiscoverCategories();
      } else flash("error", d.error || "Hata oluştu");
    } catch {
      flash("error", "Bağlantı hatası");
    }
  }

  async function deleteDiscoverSubcategory(id: string) {
    if (!confirm("Bu Keşfet alt kategorisini silmek istiyor musunuz?")) return;
    await apiFetch(`${MAP_API_ROOT}/map/discover-subcategories/${id}`, { method: "DELETE" });
    flash("success", "Keşfet alt kategorisi silindi");
    loadDiscoverCategories();
  }

  /* ─── OWNERSHIP CLAIMS ─── */
  async function updateClaimStatus(id: string, status: "APPROVED" | "REJECTED") {
    await apiFetch(`${MAP_API_ROOT}/map/ownership-claims/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    flash("success", `Talep ${status === "APPROVED" ? "onaylandı" : "reddedildi"}`);
    loadClaims(); loadStats();
  }

  /* ─── SCRAPER ─── */
  async function loadRecentPlacesPreview(limit = 20) {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/businesses?limit=${Math.min(limit, 50)}&importSource=places_api`);
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) {
        setPlacesPreview(
          (d.data as Business[]).slice(0, limit).map((b) => ({
            name: b.name,
            address: b.address ?? null,
            rating: b.rating ?? null,
            phone: b.phone ?? null,
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }

  async function runScraper() {
    setLoading(true); setScraperResult(null); setPlacesPreview([]);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/scrape`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scraperForm,
          textQuery: placesImport.textQuery.trim(),
          category: placesImport.googlePlaceType || scraperForm.category,
          keyword: placesImport.googleKeyword || scraperForm.keyword,
          categorySlug: placesImport.categorySlug,
          categoryId: placesImport.categoryId,
          homepageSuperCategory: placesImport.homepageSuperCategory,
          storeType: placesImport.storeType,
          maxResults: parseInt(placesImport.maxResults, 10) || 100,
          markOpeningAll: placesImport.markOpeningAll,
          hybridScrape: placesImport.hybridScrape,
          async: true,
        }),
      });
      const raw = await r.text();
      let d: {
        success?: boolean;
        async?: boolean;
        jobId?: string;
        error?: string;
        message?: string;
        debug?: unknown;
        errors?: string[];
        imported?: number;
        skipped?: number;
        total?: number;
        hybridEnqueued?: number;
      } = {};
      try {
        d = raw ? (JSON.parse(raw) as typeof d) : {};
      } catch {
        setScraperResult(
          `❌ HTTP ${r.status}: yanıt JSON değil.${adminFetchErrorHint(`HTTP ${r.status}`)}\n${raw.slice(0, 280)}`,
        );
        return;
      }
      if (!r.ok) {
        const msg = d.error || raw.slice(0, 200) || `HTTP ${r.status}`;
        setScraperResult(
          `❌ ${msg}${adminFetchErrorHint(`HTTP ${r.status}: ${msg}`)}\n` +
            (r.status === 502
              ? "\nÇok sayıda işletme çekerken vekil zaman aşımı olabilir: «Maks. işletme» değerini düşürüp iki kez çalıştırmayı veya API'yi doğrudan Railway köküne (CORS) yönlendirmeyi deneyin."
              : ""),
        );
        return;
      }

      if (r.status === 202 && d.async && d.jobId) {
        setScraperResult(`⏳ ${d.message || "Kazıma arka planda…"} (iş no: ${d.jobId.slice(0, 8)}…)`);
        for (let i = 0; i < 240; i++) {
          await new Promise((res) => setTimeout(res, 1500));
          const jr = await apiFetch(`${MAP_API_ROOT}/map/admin/scrape-places-job/${d.jobId}`);
          const jraw = await jr.text();
          let job: {
            success?: boolean;
            status?: string;
            result?: typeof d;
            error?: string;
          } = {};
          try {
            job = jraw ? (JSON.parse(jraw) as typeof job) : {};
          } catch {
            setScraperResult(`❌ İş durumu JSON değil (HTTP ${jr.status})`);
            return;
          }
          if (!jr.ok || job.success === false) {
            setScraperResult(`❌ İş durumu alınamadı: ${job.error || jraw.slice(0, 160) || `HTTP ${jr.status}`}`);
            return;
          }
          if (job.status === "error") {
            let errText = job.error || "bilinmeyen hata";
            try {
              const parsed = JSON.parse(errText) as { error?: string; hint?: string };
              if (parsed && typeof parsed.error === "string") {
                errText = [parsed.error, parsed.hint].filter(Boolean).join(" ");
              }
            } catch {
              /* düz metin hata */
            }
            setScraperResult(`❌ Arka plan: ${errText}`);
            return;
          }
          if (job.status === "done" && job.result && typeof job.result === "object") {
            const out = job.result as typeof d & { samples?: Array<{ name: string; address?: string | null; rating?: number | null; phone?: string | null }> };
            const parts = [`✅ ${out.message || "Tamamlandı"}`];
            if (out.debug) parts.push(`\n[Tanılama] ${JSON.stringify(out.debug, null, 0)}`);
            if (Array.isArray(out.errors) && out.errors.length)
              parts.push(`\n[Hatalar] ${out.errors.slice(0, 6).join(" · ")}`);
            setScraperResult(parts.join(""));
            if (Array.isArray(out.samples) && out.samples.length) {
              setPlacesPreview(out.samples.map((s) => ({
                name: s.name,
                address: s.address ?? null,
                rating: s.rating ?? null,
                phone: s.phone ?? null,
              })));
            } else if (Number(out.imported ?? 0) > 0) {
              void loadRecentPlacesPreview(Number(out.imported));
            }
            loadStats();
            void loadBusinesses();
            return;
          }
        }
        setScraperResult("❌ Zaman aşımı: iş hâlâ sürüyor olabilir; bir süre sonra Haritalar listesini yenileyin.");
        loadStats();
        void loadBusinesses();
        return;
      }

      if (d.success) {
        const parts = [`✅ ${d.message}`];
        if (d.debug) parts.push(`\n[Tanılama] ${JSON.stringify(d.debug, null, 0)}`);
        if (Array.isArray(d.errors) && d.errors.length)
          parts.push(`\n[Hatalar] ${d.errors.slice(0, 6).join(" · ")}`);
        setScraperResult(parts.join(""));
        if (Number(d.imported ?? 0) > 0) void loadRecentPlacesPreview(Number(d.imported));
        loadStats();
        void loadBusinesses();
      } else setScraperResult(`❌ ${d.error || "Bilinmeyen hata"}${d.debug ? `\n${JSON.stringify(d.debug)}` : ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setScraperResult(`❌ ${msg}${adminFetchErrorHint(msg)}`);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOpeningBiz(b: Business) {
    const prev = Array.isArray(b.tags) ? b.tags : [];
    const next = prev.filter((t) => t !== "acilis_asamasinda");
    await apiFetch(`${MAP_API_ROOT}/map/businesses/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true, tags: next }),
    });
    flash("success", "İşletme doğrulandı (açılış etiketi kaldırıldı).");
    void loadBusinesses();
  }

  async function runOsmScraper() {
    const keyword = osmForm.keyword.trim();
    if (!keyword) {
      setOsmResult("❌ Önce sektör veya işletme türü için anahtar kelime girin (ör. restoran, oto servis).");
      return;
    }
    setOsmLoading(true); setOsmResult(null);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/scrape-osm`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: parseFloat(osmForm.lat),
          lng: parseFloat(osmForm.lng),
          radius: parseInt(osmForm.radius, 10) || 3000,
          keyword,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setOsmResult(`✅ ${d.message} (Kaynak: OpenStreetMap)`);
        loadStats(); loadBusinesses();
      } else setOsmResult(`❌ ${d.error}`);
    } catch { setOsmResult("❌ Bağlantı hatası"); }
    finally { setOsmLoading(false); }
  }

  async function runGmapsScraper(autoImport = false) {
    if (autoImport) { setGmapsImporting(true); }
    else { setGmapsLoading(true); setGmapsPreview([]); }
    setGmapsResult(null);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/scrape-gmaps`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: gmapsForm.query,
          lat: gmapsForm.lat,
          lng: gmapsForm.lng,
          maxResults: gmapsForm.maxResults,
          storeType: gmapsForm.storeType,
          homepageSuperCategory: gmapsForm.homepageSuperCategory,
          categorySlug: gmapsForm.categorySlug,
          categoryId: gmapsForm.categoryId,
          autoImport,
          preview: !autoImport,
        }),
      });
      const raw = await r.text();
      let d: {
        success?: boolean;
        async?: boolean;
        jobId?: string;
        error?: string;
        hint?: string;
        message?: string;
        data?: Array<{ name?: string; address?: string | null; rating?: number | null; category?: string | null; phone?: string | null }>;
        total?: number;
        imported?: number;
      } = {};
      try {
        d = raw ? (JSON.parse(raw) as typeof d) : {};
      } catch {
        setGmapsResult(
          `❌ HTTP ${r.status}: yanıt JSON değil.${adminFetchErrorHint(`HTTP ${r.status}`)}\n${raw.slice(0, 280)}`,
        );
        return;
      }
      if (!r.ok || d.success === false) {
        const msg = [d.error || raw.slice(0, 200) || `HTTP ${r.status}`, d.hint].filter(Boolean).join("\n");
        setGmapsResult(`❌ ${msg}${adminFetchErrorHint(msg)}`);
        return;
      }

      if (r.status === 202 && d.async && d.jobId) {
        setGmapsResult(`⏳ ${d.message || "Kazıma arka planda devam ediyor…"} (iş no: ${d.jobId.slice(0, 8)}…)`);
        for (let i = 0; i < 240; i++) {
          await new Promise((res) => setTimeout(res, 1500));
          const jr = await apiFetch(`${MAP_API_ROOT}/map/admin/scrape-gmaps-job/${d.jobId}`);
          const jraw = await jr.text();
          let job: {
            success?: boolean;
            status?: string;
            phase?: string;
            result?: typeof d;
            error?: string;
          } = {};
          try {
            job = jraw ? (JSON.parse(jraw) as typeof job) : {};
          } catch {
            setGmapsResult(`❌ İş durumu JSON değil (HTTP ${jr.status})`);
            return;
          }
          if (!jr.ok || job.success === false) {
            setGmapsResult(`❌ İş durumu alınamadı: ${job.error || jraw.slice(0, 160) || `HTTP ${jr.status}`}`);
            return;
          }
          if (job.status === "error") {
            setGmapsResult(`❌ Arka plan: ${job.error || "bilinmeyen hata"}`);
            return;
          }
          if (job.status === "done" && job.result && typeof job.result === "object") {
            const out = job.result;
            if (autoImport) {
              setGmapsResult(`✅ ${out.message || "Tamamlandı"}`);
              if (Array.isArray(out.data) && out.data.length) {
                setGmapsPreview(
                  out.data.map((b) => ({
                    name: b.name ?? "?",
                    address: b.address ?? null,
                    rating: b.rating ?? null,
                    category: b.category ?? null,
                    phone: b.phone ?? null,
                  })),
                );
              }
              loadStats(); loadBusinesses();
            } else {
              setGmapsPreview(
                (Array.isArray(out.data) ? out.data : []).map((b) => ({
                  name: b.name ?? "?",
                  address: b.address ?? null,
                  rating: b.rating ?? null,
                  category: b.category ?? null,
                  phone: b.phone ?? null,
                })),
              );
              setGmapsResult(`✅ ${out.total ?? out.data?.length ?? 0} işletme bulundu. İnceleyip "Tümünü Kaydet" ile ekleyebilirsiniz.`);
            }
            return;
          }
          if (job.phase === "importing") {
            setGmapsResult(`⏳ Kazıma tamamlandı, kayıt ediliyor… (iş no: ${d.jobId.slice(0, 8)}…)`);
          }
        }
        setGmapsResult("❌ Zaman aşımı: iş hâlâ sürüyor olabilir; bir süre sonra Haritalar listesini yenileyin.");
        loadStats();
        void loadBusinesses();
        return;
      }

      if (d.success) {
        if (autoImport) {
          setGmapsResult(`✅ ${d.message}`);
          if (Array.isArray(d.data) && d.data.length) {
            setGmapsPreview(
              d.data.map((b) => ({
                name: b.name ?? "?",
                address: b.address ?? null,
                rating: b.rating ?? null,
                category: b.category ?? null,
                phone: b.phone ?? null,
              })),
            );
          } else if (gmapsPreview.length === 0 && Number(d.total ?? d.imported ?? 0) > 0) {
            setGmapsPreview([]);
          }
          loadStats(); loadBusinesses();
        } else {
          setGmapsPreview(
            (Array.isArray(d.data) ? d.data : []).map((b) => ({
              name: b.name ?? "?",
              address: b.address ?? null,
              rating: b.rating ?? null,
              category: b.category ?? null,
              phone: b.phone ?? null,
            })),
          );
          setGmapsResult(`✅ ${d.total} işletme bulundu. İnceleyip "Tümünü Kaydet" ile ekleyebilirsiniz.`);
        }
      } else setGmapsResult(`❌ ${d.error}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setGmapsResult(`❌ ${msg || "Bağlantı hatası veya bot zaman aşımı"}${adminFetchErrorHint(msg)}`);
    }
    finally { setGmapsLoading(false); setGmapsImporting(false); }
  }

  async function loadInsaatCatalog() {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/insaatfirmalarim/catalog`);
      const d = await r.json();
      if (d.success && d.data) {
        setInsaatCatalog({
          cities: Array.isArray(d.data.cities)
            ? d.data.cities.map((c: { slug: string; label: string }) => ({ slug: c.slug, label: c.label }))
            : [],
          categories: Array.isArray(d.data.categories)
            ? d.data.categories.map((c: { slug: string; label: string }) => ({ slug: c.slug, label: c.label }))
            : [],
        });
      }
    } catch {
      /* ignore */
    }
  }

  async function loadYatportCatalog() {
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/yatport/catalog`);
      const d = await r.json();
      if (d.success && d.data) {
        setYatportCatalog({
          rentalTypes: Array.isArray(d.data.rentalTypes) ? d.data.rentalTypes : [],
          boatTypes: Array.isArray(d.data.boatTypes) ? d.data.boatTypes : [],
          districts: Array.isArray(d.data.districts) ? d.data.districts : [],
          listSlugs: Array.isArray(d.data.listSlugs) ? d.data.listSlugs : ["tekne-kiralama"],
        });
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!ifBatchId && !ifQueueOpen) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const q = ifBatchId ? `?batchId=${encodeURIComponent(ifBatchId)}&limit=250` : "?limit=250";
        const r = await apiFetch(`${MAP_API_ROOT}/map/insaatfirmalarim/queue${q}`);
        const d = await r.json();
        if (cancelled || !d.success || !d.data) return;
        const data = d.data as InsaatfirmalarimQueueStatus;
        setIfQueueData(data);
        const { done, running, queued, error, total } = data.summary;
        const imp = data.jobs.reduce((s, j) => s + j.firmsImported, 0);
        const upd = data.jobs.reduce((s, j) => s + j.firmsUpdated, 0);
        const scraped = data.jobs.reduce((s, j) => s + j.firmsFound, 0);
        if (
          (data.needsResume || (queued > 0 && !data.workerRunning && !data.currentJob))
          && Date.now() - ifAutoResumeAtRef.current > 25_000
        ) {
          ifAutoResumeAtRef.current = Date.now();
          const resumeQ = ifBatchId ? `?batchId=${encodeURIComponent(ifBatchId)}` : "";
          void apiFetch(`${MAP_API_ROOT}/map/admin/insaatfirmalarim-scraper/resume${resumeQ}`, { method: "POST" }).catch(() => {});
        }
        if (running + queued > 0) {
          setIfResult(
            `⏳ Kuyruk ${done}/${total} tamamlandı` +
              (running ? ` · ${running} çalışıyor` : "") +
              (queued ? ` · ${queued} bekliyor` : "") +
              (error ? ` · ${error} hata` : "") +
              ` · ${scraped} bulundu, ${imp} eklendi${upd ? `, ${upd} güncellendi` : ""}`,
          );
        } else if (total > 0 && done + error >= total) {
          setIfResult(
            `✅ Batch tamamlandı: ${done}/${total} iş` +
              (error ? ` (${error} hata)` : "") +
              ` · ${scraped} bulundu, ${imp} eklendi`,
          );
          loadStats();
          loadBusinesses();
        }
      } catch {
        /* ignore transient poll errors */
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ifBatchId, ifQueueOpen]);

  useEffect(() => {
    if (!ifQueueOpen) return;
    window.setTimeout(() => {
      ifQueuePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
  }, [ifQueueOpen, ifBatchId]);

  useEffect(() => {
    if (!ypBatchId && !ypQueueOpen) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const q = ypBatchId ? `?batchId=${encodeURIComponent(ypBatchId)}&limit=250` : "?limit=250";
        const r = await apiFetch(`${MAP_API_ROOT}/map/yatport/queue${q}`);
        const d = await r.json();
        if (cancelled || !d.success || !d.data) return;
        const data = d.data as YatportQueueStatus;
        setYpQueueData(data);
        const { done, running, queued, error, total } = data.summary;
        const imp = data.jobs.reduce((s, j) => s + j.progress.imported, 0);
        const scraped = data.jobs.reduce((s, j) => s + j.progress.scraped, 0);
        if (running + queued > 0) {
          setYpResult(
            `⏳ Kuyruk ${done}/${total} tamamlandı` +
              (running ? ` · ${running} çalışıyor` : "") +
              (queued ? ` · ${queued} bekliyor` : "") +
              (error ? ` · ${error} hata` : "") +
              ` · ${scraped} kazındı, ${imp} eklendi`,
          );
        } else if (total > 0 && done + error >= total) {
          setYpResult(
            `✅ Batch tamamlandı: ${done}/${total} iş` +
              (error ? ` (${error} hata)` : "") +
              ` · ${scraped} kazındı, ${imp} eklendi`,
          );
          loadStats();
          loadBusinesses();
        }
      } catch {
        /* ignore transient poll errors */
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ypBatchId, ypQueueOpen]);

  useEffect(() => {
    if (!ypQueueOpen) return;
    window.setTimeout(() => {
      ypQueuePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
  }, [ypQueueOpen, ypBatchId]);

  async function runBackfillScrapedContacts(dryRun = false, selectedOnly = false) {
    if (selectedOnly && selectedBizIds.length === 0) {
      flash("error", "En az bir işletme seçin.");
      return;
    }
    setContactOpsLoading("backfill");
    setContactOpsResult(null);
    const missingMode = bizFilterMissingContact === "1" ? "any" : "both";
    const batchQuery =
      `fast=1&limit=${selectedOnly ? Math.min(Math.max(selectedBizIds.length, 1), 200) : 40}` +
      `&placesApiCap=${selectedOnly ? Math.min(selectedBizIds.length, 50) : 25}` +
      `&enrichViaGmaps=1&gmapsScrapeCap=${selectedOnly ? Math.min(selectedBizIds.length, 15) : 8}` +
      `&maxDurationMs=28000&missingContact=${missingMode}${dryRun ? "&dryRun=1" : ""}`;
    let totalUpdated = 0;
    let totalScanned = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let placesApiTotal = 0;
    let gmapsScrapedTotal = 0;
    let stillMissingBoth: number | string = "?";
    let remaining: number | string = "?";
    let rounds = 0;
    const maxRounds = dryRun ? 1 : selectedOnly ? 3 : 10;
    const body: Record<string, unknown> = selectedOnly ? { ids: selectedBizIds } : {};
    try {
      while (rounds < maxRounds) {
        rounds++;
        const r = await postAdminJson(`/api/map/admin/backfill-scraped-contacts?${batchQuery}`, body);
        if (!r.ok) {
          const errBody = await r.text().catch(() => "");
          setContactOpsResult(
            `❌ Sunucu yanıtı HTTP ${r.status}. ${errBody.slice(0, 180) || adminFetchErrorHint(errBody || String(r.status))}`,
          );
          return;
        }
        const d = await r.json();
        if (!d.success) {
          setContactOpsResult(`❌ ${d.error ?? "Backfill başarısız"}`);
          return;
        }
        totalUpdated += Number(d.updated ?? 0);
        totalScanned += Number(d.scanned ?? d.processed ?? 0);
        totalProcessed += Number(d.processed ?? d.scanned ?? 0);
        totalSkipped += Number(d.skipped ?? 0);
        totalFailed += Number(d.failed ?? 0);
        placesApiTotal += Number(d.placesApiFetched ?? 0);
        gmapsScrapedTotal += Number(d.gmapsScraped ?? 0);
        stillMissingBoth = d.stillMissingBoth ?? stillMissingBoth;
        remaining = d.remaining ?? remaining;
        if (dryRun) break;
        if (Number(d.remaining ?? 0) === 0) break;
        if (Number(d.updated ?? 0) === 0 && Number(d.processed ?? 0) === 0) break;
        if (selectedOnly) break;
        if (!d.partial && Number(d.remaining ?? 0) <= 0) break;
      }
      const scopeLabel = selectedOnly ? `${selectedBizIds.length} seçili kayıt` : "filtreye uyan kayıtlar";
      setContactOpsResult(
        `${dryRun ? "🔍 Önizleme" : "✅ Bitti"} (${rounds} tur · ${scopeLabel}):\n` +
        `· İşlenen: ${totalProcessed} · Güncellenen: ${totalUpdated} · Atlanan: ${totalSkipped} · Hata: ${totalFailed}\n` +
        `· Places API: ${placesApiTotal} · Google Haritalar kazıma: ${gmapsScrapedTotal}\n` +
        `· Kalan (filtre): ${remaining} · Telefon+adres ikisi eksik (genel): ${stillMissingBoth}` +
        (Number(remaining) > 0 && !dryRun && !selectedOnly ? "\n· Kalan kayıtlar için işlemi tekrar çalıştırabilirsiniz." : ""),
      );
      if (!dryRun) { loadStats(); loadBusinesses(); }
    } catch (e) {
      setContactOpsResult(`❌ Bağlantı hatası${e instanceof Error ? `: ${e.message}` : ""}`);
    } finally {
      setContactOpsLoading(null);
    }
  }

  async function runPurgeIncompleteContacts(dryRun = false) {
    if (!dryRun && !window.confirm(
      "Telefon VE adresi olmayan Google Maps kazıma kayıtları silinecek. Önce otomatik tamamlama çalışır. Devam?",
    )) return;
    setContactOpsLoading("purge");
    setContactOpsResult(null);
    try {
      const r = await postAdminJson(
        `/api/map/admin/purge-incomplete-contacts?fast=1&limit=80&placesApiCap=15&enrichViaGmaps=1&enrichFirst=1&maxDurationMs=28000${dryRun ? "&dryRun=1" : ""}`,
        {},
      );
      if (!r.ok) {
        const errBody = await r.text().catch(() => "");
        setContactOpsResult(`❌ Sunucu yanıtı HTTP ${r.status}. ${errBody.slice(0, 180) || adminFetchErrorHint(errBody || String(r.status))}`);
        return;
      }
      const d = await r.json();
      if (d.success) {
        const enrich = d.enrichResult as { updated?: number; stillMissingBoth?: number } | null;
        setContactOpsResult(
          `${dryRun ? "🔍 Önizleme" : "✅ Tamamlandı"}: ${d.deleted ?? 0} kayıt silinecek/silindi` +
          (enrich ? ` · önce ${enrich.updated ?? 0} kayıt zenginleştirildi` : "") +
          ` · önce eksik: ${d.statsBefore?.missingBoth ?? "?"} → sonra: ${d.statsAfter?.missingBoth ?? "?"}`,
        );
        if (!dryRun) { loadStats(); loadBusinesses(); }
      } else setContactOpsResult(`❌ ${d.error ?? "Silme başarısız"}`);
    } catch (e) { setContactOpsResult(`❌ Bağlantı hatası${e instanceof Error ? `: ${e.message}` : ""}`); }
    finally { setContactOpsLoading(null); }
  }

  async function runInsaatfirmalarimScraper(queueJob = false) {
    setIfLoading(true);
    setIfResult(null);
    setIfPreview([]);
    try {
      const citySlug = ifForm.citySlug.trim();
      const categorySlug = ifForm.categorySlug.trim();
      if (ifForm.mode === "city" && !citySlug) {
        setIfResult("❌ İl bazlı mod için bir il seçin");
        return;
      }
      if (ifForm.mode === "category" && !categorySlug) {
        setIfResult("❌ Kategori bazlı mod için kategori slug girin");
        return;
      }
      const endpoint = queueJob
        ? `${MAP_API_ROOT}/map/admin/insaatfirmalarim-scraper/queue`
        : `${MAP_API_ROOT}/map/scrape-insaatfirmalarim`;
      const maxFirmsParsed = parseInt(ifForm.maxFirms, 10);
      const payload: Record<string, unknown> = {
        mode: ifForm.mode,
        citySlug: ifForm.mode === "city" ? citySlug : undefined,
        categorySlug: ifForm.mode === "category" ? categorySlug : undefined,
        autoImport: ifForm.autoImport,
        geocode: ifForm.geocode,
        priority: queueJob,
      };
      if (Number.isFinite(maxFirmsParsed) && maxFirmsParsed > 0) {
        payload.maxFirms = maxFirmsParsed;
      }
      const r = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        if (queueJob || d.async) {
          const jobCount = d.jobCount ?? 1;
          const batchHint = d.batchId ? ` batch: ${d.batchId}` : "";
          setIfQueueOpen(true);
          setIfQueueData(null);
          if (d.batchId) setIfBatchId(String(d.batchId));
          setIfResult(
            `⏳ ${d.message ?? "Kuyruğa alındı"} (${jobCount} iş${batchHint}). İlerleme aşağıdaki panelde güncellenir.`,
          );
        } else {
          const samples = Array.isArray(d.samples) ? d.samples : [];
          if (samples.length) setIfPreview(samples);
          const sampleTxt = samples.slice(0, 3).map((s: { name?: string; city?: string; phone?: string | null }) => `${s.name ?? "?"} (${s.city ?? "—"}${s.phone ? ` · ${s.phone}` : ""})`).join("; ");
          setIfResult(`✅ ${d.message ?? `${d.scraped} firma`}${sampleTxt ? ` — Örnek: ${sampleTxt}` : ""}`);
          if (ifForm.autoImport) { loadStats(); loadBusinesses(); }
        }
      } else setIfResult(`❌ ${d.error ?? "Hata"}`);
    } catch {
      setIfResult("❌ Bağlantı hatası veya zaman aşımı");
    } finally {
      setIfLoading(false);
    }
  }

  async function clearInsaatfirmalarimQueue(clearBatchOnly = false) {
    setIfQueueOpsLoading(true);
    try {
      const q = clearBatchOnly && ifBatchId ? `?batchId=${encodeURIComponent(ifBatchId)}` : "";
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/insaatfirmalarim-scraper/queue${q}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) {
        setIfResult(`✅ ${d.message ?? `${d.cleared} iş iptal edildi`}`);
        const poll = await apiFetch(`${MAP_API_ROOT}/map/insaatfirmalarim/queue${ifBatchId ? `?batchId=${encodeURIComponent(ifBatchId)}&limit=250` : "?limit=250"}`);
        const pollData = await poll.json();
        if (pollData.success && pollData.data) setIfQueueData(pollData.data as InsaatfirmalarimQueueStatus);
      } else setIfResult(`❌ ${d.error ?? "Kuyruk temizlenemedi"}`);
    } catch {
      setIfResult("❌ Kuyruk temizleme bağlantı hatası");
    } finally {
      setIfQueueOpsLoading(false);
    }
  }

  async function recoverInsaatfirmalarimWorker() {
    setIfQueueOpsLoading(true);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/insaatfirmalarim-scraper/recover`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        setIfResult(`✅ ${d.message ?? "Worker kurtarıldı"}`);
        if (d.data) setIfQueueData(d.data as InsaatfirmalarimQueueStatus);
      } else setIfResult(`❌ ${d.error ?? "Worker kurtarılamadı"}`);
    } catch {
      setIfResult("❌ Worker kurtarma bağlantı hatası");
    } finally {
      setIfQueueOpsLoading(false);
    }
  }

  async function resumeInsaatfirmalarimQueue() {
    setIfQueueOpsLoading(true);
    try {
      const q = ifBatchId ? `?batchId=${encodeURIComponent(ifBatchId)}` : "";
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/insaatfirmalarim-scraper/resume${q}`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        setIfResult(`✅ ${d.message ?? "Kuyruk devam ettirildi"}`);
        if (d.data) setIfQueueData(d.data as InsaatfirmalarimQueueStatus);
      } else setIfResult(`❌ ${d.error ?? "Kuyruk devam ettirilemedi"}`);
    } catch {
      setIfResult("❌ Kuyruk devam ettirme bağlantı hatası");
    } finally {
      setIfQueueOpsLoading(false);
    }
  }

  async function runYatportScraper(queueJob = false) {
    setYpLoading(true);
    setYpResult(null);
    setYpPreview([]);
    try {
      const endpoint = queueJob
        ? `${MAP_API_ROOT}/map/admin/yatport-scraper/queue`
        : `${MAP_API_ROOT}/map/scrape-yatport`;
      const maxBoatsParsed = parseInt(ypForm.maxBoats, 10);
      const payload: Record<string, unknown> = {
        mode: ypForm.mode,
        listSlug: ypForm.mode === "listing" ? ypForm.listSlug : undefined,
        districtSlug: ypForm.mode === "district" && !ypForm.allDistricts ? ypForm.districtSlug : undefined,
        allDistricts: ypForm.mode === "district" ? ypForm.allDistricts : undefined,
        boatTypeSlug: ypForm.mode === "boatType" ? ypForm.boatTypeSlug : undefined,
        autoImport: ypForm.autoImport,
        downloadImages: ypForm.downloadImages,
        priority: queueJob,
      };
      if (Number.isFinite(maxBoatsParsed) && maxBoatsParsed > 0) {
        payload.maxBoats = maxBoatsParsed;
      }
      const r = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        if (queueJob || d.async) {
          const jobCount = d.jobCount ?? 1;
          const batchHint = d.batchId ? ` batch: ${d.batchId}` : "";
          setYpQueueOpen(true);
          setYpQueueData(null);
          if (d.batchId) setYpBatchId(String(d.batchId));
          setYpResult(
            `⏳ ${d.message ?? "Kuyruğa alındı"} (${jobCount} iş${batchHint}). İlerleme aşağıdaki panelde güncellenir.`,
          );
        } else {
          const preview = Array.isArray(d.preview) ? d.preview : [];
          if (preview.length) setYpPreview(preview);
          const sampleTxt = preview
            .slice(0, 3)
            .map((s: { name?: string; district?: string; city?: string; price?: string | null }) =>
              `${s.name ?? "?"} (${s.district ?? s.city ?? "—"}${s.price ? ` · ${s.price}` : ""})`,
            )
            .join("; ");
          setYpResult(
            `✅ ${d.scraped ?? 0} tekne kazındı, ${d.imported ?? 0} eklendi, ${d.updated ?? 0} güncellendi` +
              (sampleTxt ? ` — Örnek: ${sampleTxt}` : ""),
          );
          if (ypForm.autoImport) {
            loadStats();
            loadBusinesses();
          }
        }
      } else setYpResult(`❌ ${d.error ?? "Hata"}`);
    } catch {
      setYpResult("❌ Bağlantı hatası veya zaman aşımı");
    } finally {
      setYpLoading(false);
    }
  }

  async function clearYatportQueue(clearBatchOnly = false) {
    setYpQueueOpsLoading(true);
    try {
      const q = clearBatchOnly && ypBatchId ? `?batchId=${encodeURIComponent(ypBatchId)}` : "";
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/yatport-scraper/queue${q}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) {
        setYpResult(`✅ ${d.message ?? `${d.cleared} iş iptal edildi`}`);
        const poll = await apiFetch(`${MAP_API_ROOT}/map/yatport/queue${ypBatchId ? `?batchId=${encodeURIComponent(ypBatchId)}&limit=250` : "?limit=250"}`);
        const pollData = await poll.json();
        if (pollData.success && pollData.data) setYpQueueData(pollData.data as YatportQueueStatus);
      } else setYpResult(`❌ ${d.error ?? "Temizlenemedi"}`);
    } catch {
      setYpResult("❌ Kuyruk temizleme bağlantı hatası");
    } finally {
      setYpQueueOpsLoading(false);
    }
  }

  async function recoverYatportWorker() {
    setYpQueueOpsLoading(true);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/admin/yatport-scraper/recover`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        setYpResult(`✅ ${d.message ?? "Worker kurtarıldı"}`);
        if (d.data) setYpQueueData(d.data as YatportQueueStatus);
      } else setYpResult(`❌ ${d.error ?? "Worker kurtarılamadı"}`);
    } catch {
      setYpResult("❌ Worker kurtarma bağlantı hatası");
    } finally {
      setYpQueueOpsLoading(false);
    }
  }

  /* ─── PREMIUM MANAGEMENT ─── */
  async function loadPremiumBusinesses() {
    setPremiumLoading(true);
    try {
      const r = await apiFetch(`${MAP_API_ROOT}/map/businesses?premiumOnly=1&limit=500`);
      const d = await r.json();
      if (d.success) setPremiumBusinesses((d.data as Business[]).filter((b) => b.isPremium));
    } finally { setPremiumLoading(false); }
  }

  async function loadPremiumDetail(biz: Business) {
    setSelectedPremiumBiz(biz);
    setPremiumSubTab("products");
    const [pr, ca, re, or_] = await Promise.all([
      apiFetch(`${MAP_API_ROOT}/premium/businesses/${biz.id}/products?admin=1`).then(r => r.json()),
      apiFetch(`${MAP_API_ROOT}/premium/businesses/${biz.id}/campaigns?admin=1`).then(r => r.json()),
      apiFetch(`${MAP_API_ROOT}/premium/businesses/${biz.id}/reservations`).then(r => r.json()),
      apiFetch(`${MAP_API_ROOT}/premium/businesses/${biz.id}/orders`).then(r => r.json()),
    ]);
    setPremiumProducts(pr.data || []);
    setPremiumCampaigns(ca.data || []);
    setPremiumReservations(re.data || []);
    setPremiumOrders(or_.data || []);
  }

  async function saveProduct() {
    if (!selectedPremiumBiz || !productForm.name) return;
    const body = { ...productForm, price: Number(productForm.price) || 0, sortOrder: Number(productForm.sortOrder) || 0 };
    const url = editingProduct ? `${MAP_API_ROOT}/premium/products/${editingProduct}` : `${MAP_API_ROOT}/premium/businesses/${selectedPremiumBiz.id}/products`;
    const r = await apiFetch(url, { method: editingProduct ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const raw = await r.text();
    let d: { success?: boolean; error?: string } = {};
    try {
      d = raw ? (JSON.parse(raw) as typeof d) : {};
    } catch {
      /* ignore */
    }
    if (!r.ok) {
      flash("error", d.error || `Ürün kaydı başarısız (HTTP ${r.status}). Oturum süresi dolmuş olabilir; sayfayı yenileyip tekrar deneyin.`);
      return;
    }
    if (d.success) {
      flash("success", editingProduct ? "Ürün güncellendi" : "Ürün eklendi");
      setShowProductForm(false); setEditingProduct(null); setProductForm({});
      const pr = await apiFetch(`${MAP_API_ROOT}/premium/businesses/${selectedPremiumBiz.id}/products?admin=1`).then((x) => x.json());
      setPremiumProducts(pr.data || []);
    } else flash("error", d.error || "Hata");
  }

  async function deleteProduct(id: string) {
    if (!selectedPremiumBiz || !confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`${MAP_API_ROOT}/premium/products/${id}`, { method: "DELETE" });
    flash("success", "Ürün silindi");
    const pr = await apiFetch(`${MAP_API_ROOT}/premium/businesses/${selectedPremiumBiz.id}/products?admin=1`).then(r => r.json());
    setPremiumProducts(pr.data || []);
  }

  async function saveCampaign() {
    if (!selectedPremiumBiz || !campaignForm.title) return;
    const body = { ...campaignForm, discountPercent: campaignForm.discountPercent ? Number(campaignForm.discountPercent) : null };
    const url = editingCampaign ? `${MAP_API_ROOT}/premium/campaigns/${editingCampaign}` : `${MAP_API_ROOT}/premium/businesses/${selectedPremiumBiz.id}/campaigns`;
    const r = await apiFetch(url, { method: editingCampaign ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const raw = await r.text();
    let d: { success?: boolean; error?: string } = {};
    try {
      d = raw ? (JSON.parse(raw) as typeof d) : {};
    } catch {
      /* ignore */
    }
    if (!r.ok) {
      flash("error", d.error || `Kampanya kaydı başarısız (HTTP ${r.status}).`);
      return;
    }
    if (d.success) {
      flash("success", editingCampaign ? "Kampanya güncellendi" : "Kampanya eklendi");
      setShowCampaignForm(false); setEditingCampaign(null); setCampaignForm({});
      const ca = await apiFetch(`${MAP_API_ROOT}/premium/businesses/${selectedPremiumBiz.id}/campaigns?admin=1`).then((x) => x.json());
      setPremiumCampaigns(ca.data || []);
    } else flash("error", d.error || "Hata");
  }

  async function deleteCampaign(id: string) {
    if (!selectedPremiumBiz || !confirm("Bu kampanyayı silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`${MAP_API_ROOT}/premium/campaigns/${id}`, { method: "DELETE" });
    flash("success", "Kampanya silindi");
    const ca = await apiFetch(`${MAP_API_ROOT}/premium/businesses/${selectedPremiumBiz.id}/campaigns?admin=1`).then(r => r.json());
    setPremiumCampaigns(ca.data || []);
  }

  async function updateReservationStatus(id: string, status: string) {
    await apiFetch(`${MAP_API_ROOT}/premium/reservations/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    flash("success", "Rezervasyon durumu güncellendi");
    if (selectedPremiumBiz) {
      const re = await apiFetch(`${MAP_API_ROOT}/premium/businesses/${selectedPremiumBiz.id}/reservations`).then(r => r.json());
      setPremiumReservations(re.data || []);
    }
  }

  async function updateOrderStatus(id: string, status: string) {
    await apiFetch(`${MAP_API_ROOT}/premium/orders/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    flash("success", "Sipariş durumu güncellendi");
    if (selectedPremiumBiz) {
      const or_ = await apiFetch(`${MAP_API_ROOT}/premium/businesses/${selectedPremiumBiz.id}/orders`).then(r => r.json());
      setPremiumOrders(or_.data || []);
    }
  }

  /* ─── SETTINGS ─── */
  async function saveSettings() {
    try {
      await ensureAdminPanelBootstrap();
      const body: Record<string, unknown> = { automaticGoogleDataFetch: settings.automaticGoogleDataFetch };
      if (settings.googlePlacesApiKey.trim()) body.googlePlacesApiKey = settings.googlePlacesApiKey.trim();
      body.mapLayerConfigJson = JSON.stringify({
        defaultOpacity: Math.max(0.15, Math.min(1, settings.layerDefaultOpacity)),
        forceAdminLayerConfig: settings.forceAdminLayerConfig,
        baseLayers: baseLayerRows,
        advancedLayers: advancedLayerRows,
        overlays: overlayRows,
        autoImportSettings: settings.autoImportSettings,
      });
      body.mapAutoImportSettings = settings.autoImportSettings;
      const r = await apiFetch(`${MAP_API_ROOT}/map/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const raw = await r.text();
      let d: { success?: boolean; error?: string } = {};
      try {
        d = raw ? (JSON.parse(raw) as typeof d) : {};
      } catch {
        /* ignore */
      }
      if (!r.ok) {
        flash("error", d.error || `Kayıt başarısız (HTTP ${r.status}).`);
        return;
      }
      if (d.success) {
        flash("success", "Ayarlar kaydedildi");
        void loadSettings();
      } else flash("error", d.error || "Hata");
    } catch {
      flash("error", "Bağlantı hatası");
    }
  }

  const filteredBusinesses = businesses;

  const insaatCityOptions = insaatCatalog?.cities?.length
    ? insaatCatalog.cities
    : TURKEY_CITIES.map((city) => ({
        slug: city.name
          .toLocaleLowerCase("tr-TR")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/ğ/g, "g")
          .replace(/ü/g, "u")
          .replace(/ş/g, "s")
          .replace(/ı/g, "i")
          .replace(/ö/g, "o")
          .replace(/ç/g, "c")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        label: city.name,
      }));

  const insaatCategoryOptions = insaatCatalog?.categories?.length ? insaatCatalog.categories : [];
  const yatportDistrictOptions = yatportCatalog?.districts?.length ? yatportCatalog.districts : [];
  const yatportBoatTypeOptions = yatportCatalog?.boatTypes?.length ? yatportCatalog.boatTypes : [];
  const yatportListSlugOptions = yatportCatalog?.listSlugs?.length ? yatportCatalog.listSlugs : ["tekne-kiralama"];

  const scraperCategoryPickerBlock = (
    <div>
      <label className="text-xs text-gray-500 font-medium">Kayıt kategorisi</label>
      <Input
        value={scraperCategoryFilter}
        onChange={(e) => setScraperCategoryFilter(e.target.value)}
        placeholder="Kategori ara… (ör. eczane, otel, inşaat, restoran)"
        className="mt-1 mb-2"
      />
      <select
        className="w-full border rounded-md px-3 py-2 text-sm bg-white max-h-64"
        size={Math.min(12, Math.max(6, filteredScraperCategoryGroups.reduce((n, g) => n + g.items.length, 0)))}
        value={selectedScraperCategoryId}
        onChange={(e) => applyScraperCategorySelection(e.target.value)}
      >
        {filteredScraperCategoryGroups.length === 0 ? (
          <option value="">{scraperCategoryTotal > 0 ? "— Eşleşen kategori yok —" : "— Kategoriler yükleniyor… —"}</option>
        ) : (
          filteredScraperCategoryGroups.map((g) => (
            <optgroup key={g.superCategory} label={g.label}>
              {g.items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.icon ? `${it.icon} ` : ""}{it.label}
                  {it.googlePlaceType ? ` · ${it.googlePlaceType}` : ""}
                </option>
              ))}
            </optgroup>
          ))
        )}
      </select>
      <p className="text-[11px] text-gray-500 mt-1">
        {scraperCategoryTotal > 0 ? (
          <>
            <strong>{scraperCategoryTotal}</strong> kategori (Keşfet, Sarı Sayfalar, inşaat, turizm, ulaşım…).
            {selectedScraperCategory ? (
              <> Seçili: <strong>{selectedScraperCategory.label}</strong> →{" "}
                <strong>{selectedScraperCategory.superCategoryLabel}</strong>
                {selectedScraperCategory.googlePlaceType ? ` · ${selectedScraperCategory.googlePlaceType}` : ""}
              </>
            ) : null}
          </>
        ) : (
          "Kategoriler yükleniyor…"
        )}
      </p>
    </div>
  );

  const discoverCategoryPickerBlock = (
    <details className="rounded-lg border border-green-100 bg-green-50/40 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium text-green-800 select-none text-xs">
        Popüler Aramalar (Keşfet) — anahtar kelimeyi hızlı doldur
      </summary>
      <div className="mt-3 space-y-2">
        <Input
          value={discoverCategoryFilter}
          onChange={(e) => setDiscoverCategoryFilter(e.target.value)}
          placeholder="Kategori ara… (ör. eczane, otel, kuaför)"
          className="text-sm"
        />
        <select
          className="w-full border rounded-md px-3 py-2 text-sm bg-white max-h-48"
          size={Math.min(8, Math.max(4, filteredDiscoverPickerGroups.reduce((n, g) => n + g.items.length, 0) || 4))}
          value={selectedDiscoverSubId}
          onChange={(e) => applyDiscoverSubcategoryToScraper(e.target.value)}
        >
          {filteredDiscoverPickerGroups.length === 0 ? (
            <option value="">{discoverCategoryTotal > 0 ? "— Eşleşen kategori yok —" : "— Yükleniyor… —"}</option>
          ) : (
            filteredDiscoverPickerGroups.map((g) => (
              <optgroup key={g.superCategory} label={g.label}>
                {g.items.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                    {sub.googlePlaceType ? ` · ${sub.googlePlaceType}` : ""}
                  </option>
                ))}
              </optgroup>
            ))
          )}
        </select>
        {selectedDiscoverSub ? (
          <p className="text-[10px] text-gray-500">
            Seçili: <strong>{selectedDiscoverSub.name}</strong>
            {selectedDiscoverSub.googleKeyword ? ` · ${selectedDiscoverSub.googleKeyword}` : ""}
          </p>
        ) : null}
      </div>
    </details>
  );

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Genel Bakış", icon: "📊" },
    { id: "businesses", label: "İşletme Listesi", icon: "🏢" },
    { id: "yacht", label: "Yat Yönetimi", icon: "⛵" },
    { id: "categories", label: "Kategoriler", icon: "🏷️" },
    { id: "scraper", label: "Veri Kazıyıcı", icon: "🔍" },
    { id: "importexport", label: "İçe/Dışa Aktar", icon: "📂" },
    { id: "platform", label: "Harita Platformu", icon: "🧭" },
    { id: "settings", label: "Ayarlar", icon: "⚙️" },
  ];

  return (
    <AdminLayout title="Haritalar Yönetimi">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🗺️</span>
          <div>
            <h1 className="text-2xl font-bold">Haritalar Yönetimi</h1>
            <p className="text-sm text-gray-500">Tüm harita işletmelerini listeleyin, süzün ve toplu yönetin</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">KGM Servis Durumu</p>
              <p className="text-xs text-slate-500">YolDurumu / GezilecekYerler / HavaDurumu canlı akış kontrolü</p>
              <p className="text-[11px] text-slate-500 mt-1">Son kontrol: {kgmHealthCheckedAt || "—"} (otomatik 60 sn)</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={kgmHealthOk === false ? "destructive" : "secondary"}>
                {kgmHealthLoading ? "Kontrol ediliyor..." : kgmHealthOk ? "Canlı veri aktif" : "Bağlantı sorunu"}
              </Badge>
              <Button type="button" variant="outline" className="h-8 px-3" onClick={() => { void loadKgmServicesHealth(); }}>
                Yenile
              </Button>
            </div>
          </div>
          {kgmHealth && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-700">
              <div className="rounded-md bg-slate-50 px-2 py-1">Yol çalışması (nokta): <b>{kgmHealth.yolCalismaNokta ?? "—"}</b></div>
              <div className="rounded-md bg-slate-50 px-2 py-1">Kapalı yol (nokta): <b>{kgmHealth.kapaliYolNokta ?? "—"}</b></div>
              <div className="rounded-md bg-slate-50 px-2 py-1">Yol çalışması (hat): <b>{kgmHealth.yolCalismaHat ?? "—"}</b></div>
              <div className="rounded-md bg-slate-50 px-2 py-1">Kapalı yol (hat): <b>{kgmHealth.kapaliYolHat ?? "—"}</b></div>
              <div className="rounded-md bg-slate-50 px-2 py-1">Gezilecek yerler: <b>{kgmHealth.gezilecekYerler ?? "—"}</b></div>
              <div className="rounded-md bg-slate-50 px-2 py-1">Hava istasyonları: <b>{kgmHealth.havaIstasyonlari ?? "—"}</b></div>
            </div>
          )}
        </div>

        {/* Flash message */}
        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${msg.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? "bg-white shadow text-blue-700" : "text-gray-600 hover:text-gray-900"}`}>
              <span>{t.icon}</span>{t.label}
              {t.id === "claims" && (stats?.pendingClaims ?? 0) > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{stats!.pendingClaims}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Haritadaki işletmeler (DB, pasif dahil)", value: stats?.businesses ?? "–", icon: "🏢", color: "blue" },
                { label: "Aktif işletmeler", value: stats?.activeBusinesses ?? "–", icon: "✅", color: "green" },
                { label: "Keşfet/harita listesinde", value: stats?.publicListVisible ?? "–", icon: "🗺️", color: "teal" },
                { label: "Vendor bağlı", value: stats?.withVendor ?? "–", icon: "🔗", color: "indigo" },
                { label: "Kategoriler", value: stats?.categories ?? "–", icon: "🏷️", color: "green" },
                { label: "Sahiplik talepleri", value: stats?.pendingClaims ?? "–", icon: "📋", color: "red" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
              <p className="font-semibold mb-1">Yeni model nasıl çalışıyor?</p>
              <p className="leading-relaxed">
                <strong>{stats?.businesses ?? "–"}</strong> kayıt <code className="rounded bg-white/80 px-1">map_businesses</code> tablosunda
                (aktif: <strong>{stats?.activeBusinesses ?? "–"}</strong>, pasif: <strong>{stats?.publicListFilterBreakdown?.excludedByInactive ?? "–"}</strong>).
                Keşfet, Sarı Sayfalar ve harita listelerinde <strong>tüm kayıtlar</strong> görünür — demo, kamu, özel aday, içerik kalitesi veya vendor/kazıma zorunluluğu yok;
                şu an <strong>{stats?.publicListVisible ?? "–"}</strong> kayıt listeleniyor (DB toplamı ile aynı).
                Vendor senkronu: <strong>{stats?.withVendor ?? "–"}</strong>.
                Eski seri ilan akışı kapalı; kazınan/Google kayıtlar şehir+bbox seçilince bölgesel listelenir.
              </p>
              {stats?.publicListFilterBreakdown && (
                <p className="mt-2 text-xs leading-relaxed text-amber-900/90">
                  Public görünürlük filtresi kaldırıldı — yalnızca pasif kayıt sayısı bilgi amaçlı: {stats.publicListFilterBreakdown.excludedByInactive ?? 0}.
                </p>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-semibold text-blue-900 mb-2">🚀 Hızlı Başlangıç (tek işletme tipi)</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Önce <strong>Kategoriler</strong> sekmesinden kategorilerinizi ekleyin</li>
                <li>Ardından <strong>Google Scraper</strong> ile işletmeleri otomatik çekin</li>
                <li>Veya <strong>İşletmeler</strong> sekmesinden manüel olarak ekleyin</li>
                <li><strong>Ayarlar</strong> sekmesi veya <strong>Genel Ayarlar → Entegrasyonlar</strong> üzerinden Google Places API anahtarı (ikisi de geçerli)</li>
                <li>
                  Toplu veri için <strong>İçe/Dışa Aktar</strong> sekmesindeki JSON içe aktarma yolunu kullanın.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ── BUSINESSES ── */}
        {tab === "businesses" && (
          <div>
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50/60 p-4">
              <p className="text-sm font-semibold text-green-900 mb-3">İşletme Listesi — Tüm kayıtlar (DB toplamı: {stats?.businesses ?? "–"})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                <Input placeholder="Ad / adres ara..." value={bizSearch} onChange={(e) => setBizSearch(e.target.value)} className="bg-white" />
                <select value={bizFilterCity} onChange={(e) => setBizFilterCity(e.target.value)} className="border rounded-md px-2 py-2 text-sm bg-white">
                  <option value="">Tüm iller</option>
                  {bizCities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select value={bizFilterDistrict} onChange={(e) => setBizFilterDistrict(e.target.value)} disabled={!bizFilterCity} className="border rounded-md px-2 py-2 text-sm bg-white disabled:opacity-50">
                  <option value="">Tüm ilçeler</option>
                  {bizDistricts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select value={bizFilterCategory} onChange={(e) => setBizFilterCategory(e.target.value)} className="border rounded-md px-2 py-2 text-sm bg-white">
                  <option value="">Tüm kategoriler</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select value={bizFilterSuperCategory} onChange={(e) => setBizFilterSuperCategory(e.target.value)} className="border rounded-md px-2 py-2 text-sm bg-white">
                  <option value="">Tüm üst kategoriler</option>
                  {MAP_HOMEPAGE_SUPER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select value={bizFilterActive} onChange={(e) => setBizFilterActive(e.target.value as "" | "1" | "0")} className="border rounded-md px-2 py-2 text-sm bg-white">
                  <option value="">Aktif + Pasif</option>
                  <option value="1">Yalnız aktif</option>
                  <option value="0">Yalnız pasif</option>
                </select>
                <select value={bizFilterPremium} onChange={(e) => setBizFilterPremium(e.target.value as "" | "1" | "0")} className="border rounded-md px-2 py-2 text-sm bg-white">
                  <option value="">Premium + Normal</option>
                  <option value="1">Yalnız premium</option>
                  <option value="0">Premium değil</option>
                </select>
                <select value={bizFilterImportSource} onChange={(e) => setBizFilterImportSource(e.target.value)} className="border rounded-md px-2 py-2 text-sm bg-white">
                  <option value="">Tüm kaynaklar</option>
                  <option value="places_api">Google API</option>
                  <option value="gmaps_scrape">Kazıma</option>
                  <option value="osm">OSM</option>
                  <option value="insaatfirmalarim">İnşaat Rehberi</option>
                  <option value="yatport">Yatport Tekne</option>
                </select>
                <Button
                  type="button"
                  variant={bizFilterMissingContact ? "default" : "outline"}
                  className={bizFilterMissingContact ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600" : "border-amber-300 text-amber-900 hover:bg-amber-50"}
                  onClick={() => setBizFilterMissingContact((prev) => (prev ? "" : "1"))}
                >
                  {bizFilterMissingContact ? "✓ İletişim bilgileri eksik" : "İletişim bilgileri eksik"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-green-300 text-green-800 hover:bg-green-100"
                  onClick={() => {
                    setBizSearch("");
                    setBizFilterCity("");
                    setBizFilterDistrict("");
                    setBizFilterCategory("");
                    setBizFilterSuperCategory("");
                    setBizFilterActive("");
                    setBizFilterPremium("");
                    setBizFilterImportSource("");
                    setBizFilterMissingContact("");
                  }}
                >
                  Süzgeçleri temizle
                </Button>
              </div>
              {bizFilterMissingContact ? (
                <p className="mt-2 text-xs text-amber-900/90">
                  Yalnız <strong>Google Maps kazıma</strong> kayıtları · telefon ve/veya adres eksik
                  {stats?.gmapsScrapeMissingBoth != null ? (
                    <> · telefon+adres ikisi de eksik: <strong>{stats.gmapsScrapeMissingBoth}</strong></>
                  ) : null}
                </p>
              ) : null}
            </div>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-1">Google Maps İletişim Bakımı</h3>
              <p className="text-xs text-slate-600 mb-3">
                Yalnız <code className="text-[10px] bg-white px-1 rounded">gmaps_scrape</code> kayıtları. Önce Google Places API, ardından Google Haritalar kazıması ile telefon/adres tamamlanır. İnşaat Firmalarım, sahipli veya aktif vendor bağlantılı işletmeler silinmez.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={contactOpsLoading !== null}
                  onClick={() => runBackfillScrapedContacts(false)}
                  className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                >
                  {contactOpsLoading === "backfill" ? "⏳ Tamamlanıyor…" : "📞 Google Haritalar ile tamamla"}
                </Button>
                <Button
                  variant="outline"
                  disabled={contactOpsLoading !== null || selectedBizIds.length === 0}
                  onClick={() => runBackfillScrapedContacts(false, true)}
                  className="border-emerald-400 text-emerald-900 hover:bg-emerald-50"
                >
                  {contactOpsLoading === "backfill" ? "⏳ Tamamlanıyor…" : `📞 Seçililerin eksiklerini tamamla (${selectedBizIds.length})`}
                </Button>
                <Button
                  variant="outline"
                  disabled={contactOpsLoading !== null}
                  onClick={() => runBackfillScrapedContacts(true)}
                  className="text-xs"
                >
                  Önizle (backfill)
                </Button>
                <Button
                  variant="outline"
                  disabled={contactOpsLoading !== null}
                  onClick={() => runPurgeIncompleteContacts(false)}
                  className="border-red-300 text-red-800 hover:bg-red-50"
                >
                  {contactOpsLoading === "purge" ? "⏳ Siliniyor…" : "🗑️ İletişimsiz Kayıtları Sil"}
                </Button>
                <Button
                  variant="outline"
                  disabled={contactOpsLoading !== null}
                  onClick={() => runPurgeIncompleteContacts(true)}
                  className="text-xs"
                >
                  Önizle (sil)
                </Button>
                {bizFilterMissingContact ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-amber-300"
                    onClick={() => setBizFilterMissingContact("both")}
                  >
                    Yalnız tel+adres ikisi eksik
                  </Button>
                ) : null}
              </div>
              {contactOpsResult ? (
                <div className={`mt-3 p-3 rounded-lg text-xs whitespace-pre-wrap ${contactOpsResult.startsWith("❌") ? "bg-red-50 text-red-800 border border-red-200" : "bg-white text-slate-800 border border-slate-200"}`}>
                  {contactOpsResult}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Button onClick={() => { setBizForm({}); setEditingBiz(null); setShowBizForm(true); }} className="bg-green-600 hover:bg-green-700">+ Yeni İşletme</Button>
              <select
                value={String(bizPageLimit)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 50) setBizPageLimit(n);
                }}
                className="border rounded-md px-2 py-2 text-sm bg-white"
              >
                <option value="50">50 / sayfa</option>
                <option value="100">100 / sayfa</option>
                <option value="200">200 / sayfa</option>
                <option value="300">300 / sayfa</option>
                <option value="500">500 / sayfa</option>
              </select>
              <Input
                value={bizPageLimitCustom}
                onChange={(e) => setBizPageLimitCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const n = Number(bizPageLimitCustom);
                  if (!Number.isFinite(n)) return;
                  setBizPageLimit(Math.max(50, Math.min(500, Math.floor(n))));
                }}
                placeholder="Özel sayfa boyutu (max 500)"
                className="max-w-[190px]"
              />
            </div>
            <div className="mb-4 max-w-2xl">
              <p className="text-xs font-semibold text-gray-700 mb-1">Konum / işletme (Google Haritalar)</p>
              <GoogleMapMiniPicker
                mapsSettings={mapsGeocodeSettings}
                heightClass="h-[200px]"
                onPick={(r) => {
                  setBizSearch((r.label || [r.district, r.city].filter(Boolean).join(", ")).trim());
                }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-green-900">
              <span>
                Toplam <strong>{bizTotal}</strong> kayıt
                {stats?.businesses != null && bizTotal === stats.businesses ? (
                  <span className="ml-1 text-green-700">(DB ile eşleşiyor ✓)</span>
                ) : null}
                {" · "}
                Sayfa <strong>{bizPage}</strong> / <strong>{Math.max(1, Math.ceil(bizTotal / bizPageLimit))}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={bizPage <= 1 || loading}
                  onClick={() => setBizPage((p) => Math.max(1, p - 1))}
                >
                  Önceki
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || bizPage >= Math.max(1, Math.ceil(bizTotal / bizPageLimit))}
                  onClick={() => setBizPage((p) => p + 1)}
                >
                  Sonraki
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(7, Math.max(1, Math.ceil(bizTotal / bizPageLimit))) }).map((_, i) => {
                    const totalPages = Math.max(1, Math.ceil(bizTotal / bizPageLimit));
                    const start = Math.max(1, Math.min(bizPage - 3, totalPages - 6));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return (
                      <Button
                        key={`biz-page-${p}`}
                        type="button"
                        variant={p === bizPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBizPage(p)}
                        className="px-2.5"
                      >
                        {p}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            {filteredBusinesses.length > 0 && (
              <div className="flex flex-col gap-3 mb-4 p-3 rounded-lg border border-green-200 bg-green-50/80 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-green-900">
                    Seçili: <strong>{selectedBizIds.length}</strong> · Bu sayfada <strong>{filteredBusinesses.length}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-green-300"
                    disabled={filteredBusinesses.length === 0}
                    onClick={() => {
                      const pageIds = filteredBusinesses.map((b) => b.id);
                      const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedBizIds.includes(id));
                      setSelectedBizIds((prev) =>
                        allOnPage ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
                      );
                    }}
                  >
                    Sayfadakileri {filteredBusinesses.every((b) => selectedBizIds.includes(b.id)) && filteredBusinesses.length > 0 ? "bırak" : "seç"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="border-emerald-400 text-emerald-900" disabled={selectedBizIds.length === 0 || contactOpsLoading !== null} onClick={() => void runBackfillScrapedContacts(false, true)}>
                    Seçililerin eksiklerini tamamla
                  </Button>
                  <Button type="button" variant="destructive" size="sm" disabled={selectedBizIds.length === 0} onClick={() => void bulkBusinessAction("delete")}>
                    Toplu sil
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="border-green-400" disabled={selectedBizIds.length === 0} onClick={() => void bulkBusinessAction("setPremium", { isPremium: true })}>
                    Premium yap
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={selectedBizIds.length === 0} onClick={() => void bulkBusinessAction("setPremium", { isPremium: false })}>
                    Premium kaldır
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="border-green-400" disabled={selectedBizIds.length === 0} onClick={() => void bulkBusinessAction("setActive", { isActive: true })}>
                    Aktif yap
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={selectedBizIds.length === 0} onClick={() => void bulkBusinessAction("setActive", { isActive: false })}>
                    Pasif yap
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select value={bulkMoveCategoryId} onChange={(e) => setBulkMoveCategoryId(e.target.value)} className="border rounded-md px-2 py-1.5 bg-white max-w-[180px]">
                    <option value="">Kategori seç…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Button type="button" size="sm" variant="outline" disabled={!bulkMoveCategoryId || selectedBizIds.length === 0} onClick={() => void bulkBusinessAction("setCategory", { categoryId: bulkMoveCategoryId })}>
                    Kategoriye taşı
                  </Button>
                  <select value={bulkMoveSuperCategory} onChange={(e) => setBulkMoveSuperCategory(e.target.value)} className="border rounded-md px-2 py-1.5 bg-white max-w-[200px]">
                    <option value="">Üst kategori seç…</option>
                    {MAP_HOMEPAGE_SUPER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <Button type="button" size="sm" variant="outline" disabled={!bulkMoveSuperCategory || selectedBizIds.length === 0} onClick={() => void bulkBusinessAction("setSuperCategory", { homepageSuperCategory: bulkMoveSuperCategory })}>
                    Üst kategoriye taşı
                  </Button>
                  <select value={bulkMoveCityId} onChange={(e) => setBulkMoveCityId(e.target.value)} className="border rounded-md px-2 py-1.5 bg-white max-w-[160px]">
                    <option value="">İl seç…</option>
                    {bizCities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Button type="button" size="sm" variant="outline" disabled={!bulkMoveCityId || selectedBizIds.length === 0} onClick={() => void bulkBusinessAction("setCity", { cityId: bulkMoveCityId })}>
                    İle taşı
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="border-red-300 text-red-800 hover:bg-red-50 ml-auto" onClick={() => void purgeAllMapBusinesses()}>
                    Tüm harita işletmelerini sil…
                  </Button>
                </div>
              </div>
            )}

            {showBizForm && (
              <div className="bg-white border rounded-xl p-5 mb-5 shadow-sm">
                <h3 className="font-semibold mb-4">{editingBiz ? "İşletme Düzenle" : "Yeni İşletme Ekle"}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500">İşletme Adı *</label>
                    <Input value={bizForm.name ?? ""} onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })} placeholder="İşletme adı" />
                  </div>
                  <div><label className="text-xs text-gray-500">Google Place ID</label>
                    <Input value={bizForm.googlePlaceId ?? ""} onChange={(e) => setBizForm({ ...bizForm, googlePlaceId: e.target.value })} placeholder="ChIJ..." />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Konum (Google — önerilen)</label>
                    <GooglePlaceOneLinePicker
                      mapsSettings={mapsGeocodeSettings}
                      compact
                      label="İşletme veya adres ara"
                      onPick={(r) => {
                        setBizForm((prev) => ({
                          ...prev,
                          address: String(prev.address || "").trim() ? prev.address : r.addressLine,
                          latitude: r.lat,
                          longitude: r.lng,
                        }));
                      }}
                    />
                  </div>
                  <div><label className="text-xs text-gray-500">Adres</label>
                    <Input value={bizForm.address ?? ""} onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })} placeholder="Adres" />
                  </div>
                  <div><label className="text-xs text-gray-500">Telefon</label>
                    <Input value={bizForm.phone ?? ""} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} placeholder="+90 ..." />
                  </div>
                  <div><label className="text-xs text-gray-500">Web Sitesi</label>
                    <Input value={bizForm.website ?? ""} onChange={(e) => setBizForm({ ...bizForm, website: e.target.value })} placeholder="https://" />
                  </div>
                  <div><label className="text-xs text-gray-500">Puan (0-5)</label>
                    <Input type="number" min="0" max="5" step="0.1" value={bizForm.rating ?? ""} onChange={(e) => setBizForm({ ...bizForm, rating: parseFloat(e.target.value) })} />
                  </div>
                  <div><label className="text-xs text-gray-500">Enlem (Latitude)</label>
                    <Input type="number" step="any" value={bizForm.latitude ?? ""} onChange={(e) => setBizForm({ ...bizForm, latitude: parseFloat(e.target.value) })} placeholder="39.9334" />
                  </div>
                  <div><label className="text-xs text-gray-500">Boylam (Longitude)</label>
                    <Input type="number" step="any" value={bizForm.longitude ?? ""} onChange={(e) => setBizForm({ ...bizForm, longitude: parseFloat(e.target.value) })} placeholder="32.8597" />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowLatLngPicker(true)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition"
                    >
                      🗺️ Haritadan Enlem/Boylam Bul
                    </button>
                  </div>
                  <div><label className="text-xs text-gray-500">Fotoğraf URL</label>
                    <Input value={bizForm.photoUrl ?? ""} onChange={(e) => setBizForm({ ...bizForm, photoUrl: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="flex items-center gap-4 pt-5 col-span-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={bizForm.isPremium ?? false} onChange={(e) => setBizForm({ ...bizForm, isPremium: e.target.checked })} />
                      Premium Üye
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Mağaza türü (Premium) — alt kategori</label>
                    <p className="text-[11px] text-gray-400 mb-1.5 leading-snug">
                      Turizm, seyahat ve ulaşım (şirket) için önce işletmeyi kaydedin; araç ve şoförler sonradan eklenir. Ulaşımda yalnızca <strong>araç paylaşımı</strong> bireysel olabilir.
                    </p>
                    <select
                      value={bizForm.storeType ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        const home = homeCategoryFromStoreType(v);
                        setBizForm((prev) => ({
                          ...prev,
                          storeType: v,
                          homepageSuperCategory: home ?? prev.homepageSuperCategory ?? null,
                        }));
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                      <option value="">— Seçin —</option>
                      {bizForm.storeType && !MAP_PREMIUM_STORE_VALUE_SET.has(bizForm.storeType) ? (
                        <option value={bizForm.storeType}>Mevcut kayıt: {bizForm.storeType}</option>
                      ) : null}
                      {MAP_PREMIUM_STORE_OPTIONS.map((g) => (
                        <optgroup key={g.group} label={g.groupHint ? `${g.group} — ${g.groupHint}` : g.group}>
                          {g.items.map((it) => (
                            <option key={it.value} value={it.value}>
                              {it.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Anasayfa üst kategori</label>
                    <p className="text-[11px] text-gray-400 mb-1.5">
                      Mağaza türü seçince otomatik dolar; gerekirse buradan düzeltin (Keşfet / anasayfa şeritleri).
                    </p>
                    <select
                      value={bizForm.homepageSuperCategory ?? ""}
                      onChange={(e) => setBizForm({ ...bizForm, homepageSuperCategory: e.target.value || null })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                      <option value="">— Seçin —</option>
                      {bizForm.homepageSuperCategory && !MAP_HOMEPAGE_SUPER_VALUE_SET.has(bizForm.homepageSuperCategory) ? (
                        <option value={bizForm.homepageSuperCategory}>Mevcut: {bizForm.homepageSuperCategory}</option>
                      ) : null}
                      {MAP_HOMEPAGE_SUPER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2"><label className="text-xs text-gray-500">Açıklama</label>
                    <Textarea value={bizForm.description ?? ""} onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })} rows={2} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button onClick={saveBusiness}>{editingBiz ? "Güncelle" : "Ekle"}</Button>
                  {editingBiz && (
                    <Button variant="outline" onClick={generateCredentials} disabled={credLoading}
                      className="border-amber-400 text-amber-700 hover:bg-amber-50">
                      {credLoading ? "⏳ Oluşturuluyor..." : "🔑 Giriş Bilgileri Üret"}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { setShowBizForm(false); setEditingBiz(null); setBizForm({}); }}>İptal</Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-green-600">Yükleniyor...</div>
            ) : (
              <div className="bg-white rounded-xl border border-green-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-green-50 border-b border-green-100">
                    <tr>
                      <th className="p-3 w-10 text-center font-medium text-green-900">
                        <input
                          type="checkbox"
                          aria-label="Sayfadaki tümünü seç"
                          checked={filteredBusinesses.length > 0 && filteredBusinesses.every((b) => selectedBizIds.includes(b.id))}
                          onChange={() => {
                            const pageIds = filteredBusinesses.map((x) => x.id);
                            const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedBizIds.includes(id));
                            setSelectedBizIds((prev) =>
                              allOnPage ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
                            );
                          }}
                        />
                      </th>
                      <th className="text-left p-3 font-medium text-green-900">İşletme</th>
                      <th className="text-left p-3 font-medium text-green-900">Konum</th>
                      <th className="text-left p-3 font-medium text-green-900">Üst kategori</th>
                      <th className="text-left p-3 font-medium text-green-900">Kaynak</th>
                      <th className="text-left p-3 font-medium text-green-900 min-w-[200px]">Adres (DB)</th>
                      <th className="text-left p-3 font-medium text-green-900 min-w-[140px]">Telefon (DB)</th>
                      <th className="text-left p-3 font-medium text-green-900">Durum</th>
                      <th className="text-left p-3 font-medium text-green-900">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-50">
                    {filteredBusinesses.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-12 text-gray-400">İşletme bulunamadı. Süzgeçleri temizleyin veya yeni kayıt ekleyin.</td></tr>
                    ) : filteredBusinesses.map((b) => (
                      <tr key={b.id} className="hover:bg-green-50/50">
                        <td className="p-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={selectedBizIds.includes(b.id)}
                            onChange={() =>
                              setSelectedBizIds((prev) =>
                                prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id],
                              )
                            }
                            aria-label={`Seç: ${b.name}`}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {b.photoUrl ? (
                              <img src={b.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">🏢</div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{b.name}</div>
                              {b.category && <div className="text-xs text-gray-500">{b.category.name}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-gray-600 align-top">
                          {b.city?.name && <div>{b.city.name}</div>}
                          {b.district?.name && <div className="text-gray-400">{b.district.name}</div>}
                          {!b.city?.name && !b.district?.name && <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-3 text-xs align-top">
                          {b.homepageSuperCategory ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                              {MAP_HOMEPAGE_SUPER_OPTIONS.find((o) => o.value === b.homepageSuperCategory)?.label ?? b.homepageSuperCategory}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                          {b.storeType && <div className="text-[10px] text-gray-400 mt-0.5">{b.storeType}</div>}
                        </td>
                        <td className="p-3 text-xs align-top">
                          {b.importSource === "places_api" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold">Google API</span>
                          ) : b.importSource === "gmaps_scrape" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">Kazıma</span>
                          ) : b.importSource === "osm" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">OSM</span>
                          ) : b.importSource === "insaatfirmalarim" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 font-semibold">İnşaat Rehberi</span>
                          ) : b.importSource === "yatport" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 font-semibold">Yatport</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                          {Array.isArray(b.tags) && b.tags.includes("acilis_asamasinda") && (
                            <div className="mt-1 text-[10px] font-semibold text-amber-700">Açılış aşamasında</div>
                          )}
                        </td>
                        <td className="p-3 text-xs align-top max-w-[240px]">
                          {(() => {
                            const dbAddress = (b.dbAddress ?? "").trim();
                            const previewAddress = !dbAddress && (b.address ?? "").trim() ? (b.address ?? "").trim() : "";
                            return (
                              <div>
                                {dbAddress ? (
                                  <div className="text-gray-800 break-words" title={dbAddress}>{dbAddress}</div>
                                ) : (
                                  <div className="text-amber-700 font-medium">Adres yok</div>
                                )}
                                {previewAddress ? (
                                  <div className="text-[10px] text-slate-500 mt-1" title={previewAddress}>
                                    Önizleme: {previewAddress}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-xs align-top whitespace-nowrap">
                          {(() => {
                            const dbPhone = (b.dbPhone ?? "").trim();
                            const previewPhone = !dbPhone && (b.phone ?? "").trim() ? (b.phone ?? "").trim() : "";
                            return (
                              <div>
                                {dbPhone ? (
                                  <div className="text-gray-800 font-mono text-[11px]">{dbPhone}</div>
                                ) : (
                                  <div className="text-amber-700 font-medium">Telefon yok</div>
                                )}
                                {previewPhone ? (
                                  <div className="text-[10px] text-slate-500 mt-1">Önizleme: {previewPhone}</div>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <button onClick={() => toggleBizStatus(b)}
                              className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer w-fit ${b.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                              {b.isActive ? "Aktif" : "Pasif"}
                            </button>
                            {b.isPremium && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 w-fit">Premium</span>
                            )}
                            {b.rating ? (
                              <span className="text-xs text-yellow-600">★ {b.rating.toFixed(1)}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5">
                            {Array.isArray(b.tags) && b.tags.includes("acilis_asamasinda") && (
                              <button
                                type="button"
                                onClick={() => void verifyOpeningBiz(b)}
                                className="text-left text-teal-700 hover:text-teal-900 text-xs font-semibold underline w-fit"
                              >
                                İşletmeyi doğrula
                              </button>
                            )}
                            {!b.isPremium && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPremiumModalBiz(b);
                                  setPremiumModalMonths(1);
                                  setPremiumModalSuperCat(b.homepageSuperCategory || "mekan_dukkan");
                                }}
                                className="text-left text-indigo-700 hover:text-indigo-900 text-xs font-semibold underline w-fit"
                              >
                                Premium işletme ol
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap mt-2">
                            <a
                              href={kesfetBusinessMapHref({
                                id: b.id,
                                name: b.name,
                                lat: b.latitude,
                                lng: b.longitude,
                                googlePlaceId: b.googlePlaceId,
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 hover:text-green-900 text-xs font-medium underline"
                            >
                              Haritada aç
                            </a>
                            <button onClick={() => { setBizForm(b); setEditingBiz(b.id); setShowBizForm(true); window.scrollTo(0, 0); }}
                              className="text-green-600 hover:text-green-800 text-xs font-medium">Düzenle</button>
                            <button
                              disabled={enrichingId === b.id}
                              onClick={async () => {
                                if (!confirm(`"${b.name}" için Google Maps verisi kazınsın mı? Bu işlem ~30 saniye sürebilir.`)) return;
                                setEnrichingId(b.id);
                                try {
                                  const r = await apiFetch(`${MAP_API_ROOT}/map/businesses/${b.id}/enrich`, { method: "POST" });
                                  const d = await r.json();
                                  if (d.success) flash("success", d.message || "Zenginleştirildi");
                                  else flash("error", d.error || "Hata");
                                  loadBusinesses();
                                } catch { flash("error", "Bağlantı hatası"); }
                                finally { setEnrichingId(null); }
                              }}
                              className="text-emerald-600 hover:text-emerald-800 text-xs font-medium disabled:opacity-50 disabled:cursor-wait">
                              {enrichingId === b.id ? "⟳ Kazınıyor..." : "🔍 Zenginleştir"}
                            </button>
                            {b.isActive ? (
                              <button
                                onClick={() => deactivateBusiness(b.id)}
                                className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                              >
                                Pasife al
                              </button>
                            ) : (
                              <button
                                onClick={() => hardDeleteBusiness(b.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Kalıcı sil
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "yacht" && <YatYonetimiAdminTab />}

        {/* ── CATEGORIES ── */}
        {tab === "categories" && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="font-semibold text-gray-700">Kategoriler</h2>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  type="button"
                  className={`px-3 py-1.5 font-semibold ${categoryPanel === "map" ? "bg-indigo-600 text-white" : "bg-white text-gray-600"}`}
                  onClick={() => setCategoryPanel("map")}
                >
                  Harita kategorileri
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 font-semibold border-l ${categoryPanel === "kesfet" ? "bg-indigo-600 text-white" : "bg-white text-gray-600"}`}
                  onClick={() => setCategoryPanel("kesfet")}
                >
                  Keşfet kategorileri
                </button>
              </div>
              {categoryPanel === "map" ? (
                <Button onClick={() => { setCatForm({}); setEditingCat(null); setShowCatForm(true); }}>+ Yeni Kategori</Button>
              ) : (
                <Button onClick={() => {
                  setDiscoverSubForm({ groupId: discoverGroups[0]?.id ?? "", isActive: true });
                  setEditingDiscoverSub(null);
                  setShowDiscoverSubForm(true);
                }}>+ Keşfet alt kategori</Button>
              )}
            </div>

            {categoryPanel === "kesfet" && (
              <div className="space-y-4 mb-5">
                <p className="text-sm text-gray-600">
                  Popüler Aramalar sekmeleri ve alt kategoriler. Veri kazıyıcıda seçerek anahtar kelime / Google type alanlarını doldurabilirsiniz.
                </p>
                {showDiscoverSubForm && (
                  <div className="bg-white border rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold mb-4">{editingDiscoverSub ? "Keşfet alt kategori düzenle" : "Yeni Keşfet alt kategori"}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Grup *</label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white"
                          value={discoverSubForm.groupId ?? ""}
                          onChange={(e) => setDiscoverSubForm({ ...discoverSubForm, groupId: e.target.value })}
                        >
                          <option value="">— Grup seçin —</option>
                          {discoverGroups.map((g) => (
                            <option key={g.id} value={g.id}>{g.icon} {g.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Ad *</label>
                        <Input value={discoverSubForm.name ?? ""} onChange={(e) => setDiscoverSubForm({ ...discoverSubForm, name: e.target.value })} placeholder="Aile Hekimleri" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Google anahtar kelime</label>
                        <Input value={discoverSubForm.googleKeyword ?? ""} onChange={(e) => setDiscoverSubForm({ ...discoverSubForm, googleKeyword: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Google Place Type</label>
                        <Input value={discoverSubForm.googlePlaceType ?? ""} onChange={(e) => setDiscoverSubForm({ ...discoverSubForm, googlePlaceType: e.target.value })} placeholder="doctor, hospital…" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => void saveDiscoverSubcategory()}>{editingDiscoverSub ? "Güncelle" : "Ekle"}</Button>
                      <Button variant="outline" onClick={() => { setShowDiscoverSubForm(false); setEditingDiscoverSub(null); setDiscoverSubForm({}); }}>İptal</Button>
                    </div>
                  </div>
                )}
                {discoverGroups.map((g) => (
                  <div key={g.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-gray-800">
                      {g.icon} {g.label} <span className="text-xs font-normal text-gray-500">({g.subcategories.length} alt kategori)</span>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2">
                      {g.subcategories.map((sub) => (
                        <div key={sub.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                          <span className={sub.isActive === false ? "text-gray-400 line-through" : "text-gray-800"}>{sub.name}</span>
                          <button type="button" className="text-blue-600 font-semibold" onClick={() => {
                            setDiscoverSubForm({ ...sub, groupId: g.id });
                            setEditingDiscoverSub(sub.id);
                            setShowDiscoverSubForm(true);
                          }}>Düzenle</button>
                          <button type="button" className="text-red-500 font-semibold" onClick={() => void deleteDiscoverSubcategory(sub.id)}>Sil</button>
                        </div>
                      ))}
                      {g.subcategories.length === 0 ? <span className="text-xs text-gray-400">Alt kategori yok</span> : null}
                    </div>
                  </div>
                ))}
                {discoverGroups.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">Keşfet kategorileri yükleniyor…</div>
                ) : null}
              </div>
            )}

            {categoryPanel === "map" && showCatForm && (
              <div className="bg-white border rounded-xl p-5 mb-5 shadow-sm">
                <h3 className="font-semibold mb-4">{editingCat ? "Kategori Düzenle" : "Yeni Kategori Ekle"}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500">Kategori Adı *</label>
                    <Input value={catForm.name ?? ""} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Restoranlar" />
                  </div>
                  <div><label className="text-xs text-gray-500">Slug *</label>
                    <Input value={catForm.slug ?? ""} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} placeholder="restaurant" />
                  </div>
                  <div><label className="text-xs text-gray-500">İkon (emoji)</label>
                    <Input value={catForm.icon ?? ""} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="🍽️" />
                  </div>
                  <div><label className="text-xs text-gray-500">Google Place Type</label>
                    <Input value={catForm.googlePlaceType ?? ""} onChange={(e) => setCatForm({ ...catForm, googlePlaceType: e.target.value })} placeholder="restaurant" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={saveCategory}>{editingCat ? "Güncelle" : "Ekle"}</Button>
                  <Button variant="outline" onClick={() => { setShowCatForm(false); setEditingCat(null); setCatForm({}); }}>İptal</Button>
                </div>
              </div>
            )}

            {categoryPanel === "map" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{cat.icon || "📍"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {cat.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <div className="font-medium text-sm">{cat.name}</div>
                    <div className="text-xs text-gray-500 mb-1">{cat.slug}</div>
                    {cat.googlePlaceType && <div className="text-xs text-blue-600 mb-2">{cat.googlePlaceType}</div>}
                    <div className="text-xs text-gray-400 mb-3">{cat.hitCount} arama</div>
                    <div className="flex gap-2">
                      <button onClick={() => { setCatForm(cat); setEditingCat(cat.id); setShowCatForm(true); }}
                        className="text-blue-600 text-xs font-medium hover:text-blue-800">Düzenle</button>
                      <button onClick={() => deleteCategory(cat.id)}
                        className="text-red-500 text-xs font-medium hover:text-red-700">Sil</button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="col-span-4 text-center py-12 text-gray-400">Henüz kategori yok</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── OWNERSHIP CLAIMS ── */}
        {tab === "claims" && (
          <div>
            <h2 className="font-semibold text-gray-700 mb-4">Sahiplik Talepleri</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">Başvuran</th>
                    <th className="text-left p-3 font-medium text-gray-600">İletişim</th>
                    <th className="text-left p-3 font-medium text-gray-600">Mesaj</th>
                    <th className="text-left p-3 font-medium text-gray-600">Durum</th>
                    <th className="text-left p-3 font-medium text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {claims.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">Bekleyen talep yok</td></tr>
                  ) : claims.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{c.fullName}</td>
                      <td className="p-3 text-gray-600">
                        <div>{c.email}</div>
                        <div className="text-xs text-gray-500">{c.phone}</div>
                        <div className="text-xs text-blue-600">{c.googlePlaceId}</div>
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs">
                        <div className="truncate" title={c.message ?? ""}>{c.message || "–"}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={c.status === "APPROVED" ? "default" : c.status === "REJECTED" ? "destructive" : "secondary"}>
                          {c.status === "PENDING" ? "Bekliyor" : c.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {c.status === "PENDING" && (
                          <div className="flex gap-2">
                            <button onClick={() => updateClaimStatus(c.id, "APPROVED")}
                              className="text-green-600 hover:text-green-800 text-xs font-medium">Onayla</button>
                            <button onClick={() => updateClaimStatus(c.id, "REJECTED")}
                              className="text-red-500 hover:text-red-700 text-xs font-medium">Reddet</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ZİYARETÇİ YORUMLARI ── */}
        {tab === "userreviews" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">💬 Ziyaretçi Yorumları</h3>
              <div className="flex items-center gap-2">
                {(["pending","approved","rejected"] as const).map(s => (
                  <button key={s} onClick={() => { setUrStatusFilter(s); loadUserReviews(s); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${urStatusFilter === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {s === "pending" ? "Beklemede" : s === "approved" ? "Onaylandı" : "Reddedildi"}
                  </button>
                ))}
                <button onClick={() => loadUserReviews()} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Yenile</button>
              </div>
            </div>
            {urLoading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}
            {!urLoading && userReviews.length === 0 && (
              <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">💬</p>
                <p>Bu durumda yorum yok.</p>
              </div>
            )}
            <div className="space-y-3">
              {userReviews.map(rev => (
                <div key={rev.id} className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900">{rev.nickname || "Anonim"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rev.status === "approved" ? "bg-green-100 text-green-700" : rev.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {rev.status === "approved" ? "Onaylandı" : rev.status === "rejected" ? "Reddedildi" : "Beklemede"}
                        </span>
                        {rev.businessName && <span className="text-xs text-gray-500 truncate">→ {rev.businessName}</span>}
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} className={`w-4 h-4 ${s <= rev.rating ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                      </div>
                      {rev.comment && <p className="text-sm text-gray-700 mb-2 leading-relaxed">{rev.comment}</p>}
                      {Array.isArray(rev.photos) && rev.photos.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-2">
                          {rev.photos.map((p, i) => (
                            <img key={i} src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400">{new Date(rev.createdAt).toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {rev.status !== "approved" && (
                        <button onClick={() => moderateReview(rev.id, "approved")}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition">
                          Onayla
                        </button>
                      )}
                      {rev.status !== "rejected" && (
                        <button onClick={() => moderateReview(rev.id, "rejected")}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition">
                          Reddet
                        </button>
                      )}
                      <button onClick={() => deleteReview(rev.id)}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition">
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ÖNE ÇIKARMA (fiyat + talepler) ── */}
        {tab === "featureboost" && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h3 className="font-semibold text-lg">🚀 Birim fiyatlar (gün / hafta / ay)</h3>
                <Button type="button" onClick={() => void saveFeaturePlacementPricing()}>Kaydet</Button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                İşletme panelindeki "Öne çıkar" bölümünde bu fiyatlar gösterilir. Keşfet / Harita ve modül yerleşimleri için ayrı satırlar tanımlıdır.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="p-2">Yer</th>
                      <th className="p-2">Etiket</th>
                      <th className="p-2">Gün ₺</th>
                      <th className="p-2">Hafta ₺</th>
                      <th className="p-2">Ay ₺</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fpRows.map((row, idx) => (
                      <tr key={row.placementKey} className="border-b">
                        <td className="p-2 font-mono text-xs text-gray-600">{row.placementKey}</td>
                        <td className="p-2">
                          <Input
                            value={row.labelTr}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, labelTr: v } : r)));
                            }}
                          />
                        </td>
                        <td className="p-2 w-24">
                          <Input
                            type="number"
                            value={row.priceDay}
                            onChange={(e) => {
                              const n = parseFloat(e.target.value) || 0;
                              setFpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, priceDay: n } : r)));
                            }}
                          />
                        </td>
                        <td className="p-2 w-24">
                          <Input
                            type="number"
                            value={row.priceWeek}
                            onChange={(e) => {
                              const n = parseFloat(e.target.value) || 0;
                              setFpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, priceWeek: n } : r)));
                            }}
                          />
                        </td>
                        <td className="p-2 w-24">
                          <Input
                            type="number"
                            value={row.priceMonth}
                            onChange={(e) => {
                              const n = parseFloat(e.target.value) || 0;
                              setFpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, priceMonth: n } : r)));
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h3 className="font-semibold text-lg">📥 Talepler</h3>
                <div className="flex gap-2 flex-wrap">
                  {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFpReqFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        fpReqFilter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {f === "pending" ? "Bekleyen" : f === "approved" ? "Onaylı" : f === "rejected" ? "Red" : "Tümü"}
                    </button>
                  ))}
                </div>
              </div>
              {fpLoading ? (
                <p className="text-gray-500 text-sm py-8 text-center">Yükleniyor…</p>
              ) : fpReqs.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">Kayıt yok</p>
              ) : (
                <div className="space-y-3">
                  {fpReqs.map((req) => (
                    <div key={req.id} className="border rounded-lg p-4 flex flex-wrap gap-3 justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{req.businessName || req.businessId}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {req.placementKey} · {req.billingPeriod} × {req.units} · ₺{Number(req.totalTry).toFixed(2)} · {req.paymentMethod}
                        </p>
                        {req.categorySuper && (
                          <p className="text-xs text-amber-700 mt-1">Süper kategori: {req.categorySuper}</p>
                        )}
                        {req.receiptUrl && (
                          <a href={req.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                            Dekont / belge →
                          </a>
                        )}
                        {req.createdAt && (
                          <p className="text-xs text-gray-400 mt-1">{new Date(req.createdAt).toLocaleString("tr-TR")}</p>
                        )}
                        <Badge className="mt-2" variant={req.status === "approved" ? "default" : req.status === "rejected" ? "destructive" : "secondary"}>
                          {req.status}
                        </Badge>
                      </div>
                      {req.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => void moderateFeaturePromotion(req.id, "approved")}>
                            Onayla
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => void moderateFeaturePromotion(req.id, "rejected")}>
                            Reddet
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SCRAPER ── */}
        {tab === "scraper" && (
          <div className="max-w-2xl">
            {/* Source toggle */}
            <div className="flex gap-2 mb-5 flex-wrap">
              <button
                onClick={() => setScraperTab("osm")}
                className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${scraperTab === "osm" ? "bg-green-600 text-white border-green-600 shadow" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}
              >
                🗺️ OpenStreetMap <span className="text-xs font-normal block opacity-80">Ücretsiz, API key yok</span>
              </button>
              <button
                onClick={() => setScraperTab("gmaps")}
                className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${scraperTab === "gmaps" ? "bg-red-600 text-white border-red-600 shadow" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"}`}
              >
                🤖 Google Maps Bot <span className="text-xs font-normal block opacity-80">Ücretsiz, otomasyon</span>
              </button>
              <button
                onClick={() => setScraperTab("google")}
                className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${scraperTab === "google" ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}
              >
                🔵 Google Places API <span className="text-xs font-normal block opacity-80">Resmi API, key gerekli</span>
              </button>
              <button
                onClick={() => setScraperTab("insaat")}
                className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${scraperTab === "insaat" ? "bg-orange-600 text-white border-orange-600 shadow" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}
              >
                🏗️ İnşaat Firmalarım <span className="text-xs font-normal block opacity-80">29 kategori × 81 il</span>
              </button>
              <button
                onClick={() => setScraperTab("yatport")}
                className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${scraperTab === "yatport" ? "bg-cyan-600 text-white border-cyan-600 shadow" : "bg-white text-gray-600 border-gray-200 hover:border-cyan-300"}`}
              >
                ⛵ Yatport <span className="text-xs font-normal block opacity-80">Tekne/yat kiralama API</span>
              </button>
            </div>

            {/* OSM Scraper */}
            {scraperTab === "osm" && (
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl shrink-0">🗺️</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">OpenStreetMap Kazıyıcı</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Önce il merkezini seçin, ardından sektörünüzü yazın. Geniş amenity taraması kapalıdır; cami/banka/eczane gibi toplu türler listelenmez.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">İl *</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white"
                      value={osmForm.ilPlaka}
                      onChange={async (e) => {
                        const plaka = e.target.value;
                        const row = trProvinces.find(p => p.plaka === plaka);
                        setOsmForm({ ...osmForm, ilPlaka: plaka });
                        if (!row) return;
                        try {
                          const q = encodeURIComponent(`${row.adi} ili, Türkiye`);
                          const geoRes = await fetch(
                            `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=tr`,
                            { headers: { "Accept-Language": "tr", "User-Agent": "Yekpare-Admin/1.0" } },
                          );
                          const geo = await geoRes.json();
                          if (Array.isArray(geo) && geo[0]?.lat && geo[0]?.lon) {
                            setOsmForm(o => ({ ...o, ilPlaka: plaka, lat: String(geo[0].lat), lng: String(geo[0].lon) }));
                          }
                        } catch { /* keep coords */ }
                      }}
                    >
                      <option value="">— İl seçin (81 il) —</option>
                      {trProvinces.map(p => (
                        <option key={p.plaka} value={p.plaka}>{p.adi}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-gray-500">Enlem *</label>
                      <Input type="number" step="any" value={osmForm.lat} onChange={(e) => setOsmForm({ ...osmForm, lat: e.target.value })} placeholder="39.9334" />
                    </div>
                    <div><label className="text-xs text-gray-500">Boylam *</label>
                      <Input type="number" step="any" value={osmForm.lng} onChange={(e) => setOsmForm({ ...osmForm, lng: e.target.value })} placeholder="32.8597" />
                    </div>
                    <div><label className="text-xs text-gray-500">Yarıçap (m)</label>
                      <Input type="number" value={osmForm.radius} onChange={(e) => setOsmForm({ ...osmForm, radius: e.target.value })} placeholder="3000" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Sektör / anahtar kelime *</label>
                    <Input value={osmForm.keyword} onChange={(e) => setOsmForm({ ...osmForm, keyword: e.target.value })} placeholder="Örn: restoran, kuaför, oto servis, berber..." className="mt-1" />
                  </div>
                  {discoverCategoryPickerBlock}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    💡 Eşleşen OSM etiketleri otomatik kullanılır; aksi halde işletme <strong>adında</strong> aranır. İl merkezine göre yarıçap içindeki kayıtlar gelir.
                    Sarı Sayfalar için kayıt sonrası işletmeyi düzenleyip <strong>Servis şeridi</strong> alanını <strong>Sarı Sayfalar / Firma Rehberi</strong> seçin.
                  </div>
                  <Button onClick={runOsmScraper} disabled={osmLoading || !osmForm.lat || !osmForm.lng || !osmForm.keyword.trim()} className="w-full bg-green-600 hover:bg-green-700">
                    {osmLoading ? "⏳ OpenStreetMap'ten çekiliyor..." : "🗺️ OpenStreetMap'ten Çek"}
                  </Button>
                  {osmResult && (
                    <div className={`p-3 rounded-lg text-sm ${osmResult.startsWith("✅") ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                      {osmResult}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Google Maps Bot Scraper */}
            {scraperTab === "gmaps" && (
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl shrink-0">🤖</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Google Maps Bot Kazıyıcı</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Tarayıcı otomasyonu ile Google Maps'ı açar ve işletmeleri çeker. API key gerektirmez. İsim, adres, puan, telefon bilgileri alınır.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Arama Sorgusu *</label>
                    <Input
                      value={gmapsForm.query}
                      onChange={(e) => setGmapsForm({ ...gmapsForm, query: e.target.value })}
                      placeholder="Örn: Ankara Kızılay restoranlar, Beşiktaş kafeler, İstanbul dişçi..."
                      className="mt-1"
                    />
                  </div>
                  {scraperCategoryPickerBlock}
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-gray-500">Enlem (opsiyonel)</label>
                      <Input type="number" step="any" value={gmapsForm.lat} onChange={(e) => setGmapsForm({ ...gmapsForm, lat: e.target.value })} placeholder="39.9334" />
                    </div>
                    <div><label className="text-xs text-gray-500">Boylam (opsiyonel)</label>
                      <Input type="number" step="any" value={gmapsForm.lng} onChange={(e) => setGmapsForm({ ...gmapsForm, lng: e.target.value })} placeholder="32.8597" />
                    </div>
                    <div><label className="text-xs text-gray-500">Maks. Sonuç</label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white" value={gmapsForm.maxResults} onChange={(e) => setGmapsForm({ ...gmapsForm, maxResults: e.target.value })}>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                        <option value="500">500 (üst sınır)</option>
                        <option value="0">Sınırsız (500&apos;e kadar)</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    ⏳ <strong>Not:</strong> Bot gerçek bir tarayıcı açar, 30-60 saniye sürebilir. Sunucu yükü fazlaysa zaman aşımına uğrayabilir.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => runGmapsScraper(true)}
                      disabled={gmapsLoading || gmapsImporting || !gmapsForm.query}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {gmapsImporting ? "Kaydediliyor..." : "✅ Kazı ve Kaydet (map_business)"}
                    </Button>
                    <Button
                      onClick={() => runGmapsScraper(false)}
                      disabled={gmapsLoading || gmapsImporting || !gmapsForm.query}
                      variant="outline"
                      className="flex-1"
                    >
                      {gmapsLoading ? "🤖 Bot çalışıyor..." : "🔍 Önce Ara (Kaydetme)"}
                    </Button>
                  </div>
                  {gmapsPreview.length > 0 && (
                    <Button
                      onClick={() => runGmapsScraper(true)}
                      disabled={gmapsImporting}
                      className="w-full bg-emerald-700 hover:bg-emerald-800"
                    >
                      {gmapsImporting ? "Kaydediliyor..." : `✅ Önizlemedeki ${gmapsPreview.length} kaydı map_business'e aktar`}
                    </Button>
                  )}
                  {gmapsResult && (
                    <div className={`p-3 rounded-lg text-sm ${gmapsResult.startsWith("✅") ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                      {gmapsResult}
                    </div>
                  )}
                  {gmapsPreview.length > 0 && (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 border-b">Önizleme — {gmapsPreview.length} işletme bulundu</div>
                      <div className="max-h-72 overflow-y-auto divide-y">
                        {gmapsPreview.map((b, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-gray-50">
                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{b.name}</p>
                              <p className="text-xs text-gray-500 truncate">{b.address || b.category || "—"}</p>
                            </div>
                            {b.rating && <span className="text-xs text-amber-600 font-semibold shrink-0">⭐ {b.rating}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">Google Maps İletişim Bakımı</h4>
                    <p className="text-xs text-slate-600 mb-3">
                      Yalnız <code className="text-[10px] bg-slate-100 px-1 rounded">gmaps_scrape</code> kayıtları. Telefon/adres tamamlama ve iletişimsiz kayıt temizliği.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={contactOpsLoading !== null}
                        onClick={() => runBackfillScrapedContacts(false)}
                        className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      >
                        {contactOpsLoading === "backfill" ? "⏳ Tamamlanıyor…" : "📞 Google Haritalar ile tamamla"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={contactOpsLoading !== null}
                        onClick={() => runBackfillScrapedContacts(true)}
                        className="text-xs"
                      >
                        Önizle (backfill)
                      </Button>
                      <Button
                        variant="outline"
                        disabled={contactOpsLoading !== null}
                        onClick={() => runPurgeIncompleteContacts(false)}
                        className="border-red-300 text-red-800 hover:bg-red-50"
                      >
                        {contactOpsLoading === "purge" ? "⏳ Siliniyor…" : "🗑️ İletişimsiz Kayıtları Sil"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={contactOpsLoading !== null}
                        onClick={() => runPurgeIncompleteContacts(true)}
                        className="text-xs"
                      >
                        Önizle (sil)
                      </Button>
                    </div>
                    {contactOpsResult ? (
                      <div className={`mt-3 p-3 rounded-lg text-xs whitespace-pre-wrap ${contactOpsResult.startsWith("❌") ? "bg-red-50 text-red-800 border border-red-200" : "bg-white text-slate-800 border border-slate-200"}`}>
                        {contactOpsResult}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Google Places Scraper */}
            {scraperTab === "google" && (
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                {!settings.googlePlacesEffectiveConfigured ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                    ⚠️ <strong>Sunucu</strong> Places anahtarı yok: Railway <code className="text-[11px] bg-white/70 px-1 rounded">GOOGLE_PLACES_API_KEY</code>,{" "}
                    <strong>Haritalar → Ayarlar</strong> veya <strong>Genel Ayarlar → Harita</strong> bölümündeki{" "}
                    <em>Places API</em> / <em>Google Maps server</em> alanlarından biri dolu olmalı. Tarayıcı (referrer) anahtarı
                    burada kullanılamaz. Kırmızı "billing" hatası: anahtarın projesinde faturalandırma açılmalıdır.
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-900">
                    ✓ Places anahtarı yapılandırılmış (Harita ayarı veya Genel Ayarlar).
                  </div>
                )}
                <h3 className="font-semibold mb-2">Google Places — kazıyıcı tarzı (basit)</h3>
                <p className="text-xs text-gray-500 mb-4">
                  <strong>Arama metnini</strong> yazın (ör. Ankara Çankaya restoranlar). Aşağıdan <strong>hangi servis kategorisinde</strong> kaydedileceğini seçin — listede Sarı Sayfalar/Firma Rehberi, turizm, seyahat, ulaşım, sipariş/mekan ve alışveriş türlerinin hepsi vardır.
                  Sunucu tarafında Text Search için <strong>HTTP referrer kısıtlı</strong> tarayıcı anahtarı kullanılamaz; çözüm: sunucuda <code className="text-[11px] bg-gray-100 px-1 rounded">GOOGLE_PLACES_API_KEY</code> veya IP kısıtlı sunucu anahtarı (Genel Ayarlar → Entegrasyonlar da yedek olarak okunur).
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Arama sorgusu</label>
                    <Input
                      value={placesImport.textQuery}
                      onChange={(e) => setPlacesImport((p) => ({ ...p, textQuery: e.target.value }))}
                      placeholder="Örn: Ankara Çankaya restoranlar, İstanbul Kadıköy otel…"
                      className="mt-1"
                    />
                  </div>
                  {scraperCategoryPickerBlock}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500">Maks. işletme</label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-white"
                        value={placesImport.maxResults}
                        onChange={(e) => setPlacesImport((p) => ({ ...p, maxResults: e.target.value }))}
                      >
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                        <option value="300">300 (API üst sınır)</option>
                        <option value="0">Sınırsız (300&apos;e kadar)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex flex-col justify-end gap-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={placesImport.markOpeningAll}
                          onChange={(e) => setPlacesImport((p) => ({ ...p, markOpeningAll: e.target.checked }))}
                        />
                        Tümünü &quot;açılış aşamasında&quot; işaretle
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={placesImport.hybridScrape}
                          onChange={(e) => setPlacesImport((p) => ({ ...p, hybridScrape: e.target.checked }))}
                        />
                        <span>
                          <strong>Hibrit:</strong> API ile çekilen ~10 foto ve yorumların üzerine, Chromium ile ek foto ve yorum birleştir (API dışı tamamlama)
                        </span>
                      </label>
                    </div>
                  </div>
                  <details className="rounded-lg border bg-gray-50/80 px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-gray-700 select-none">Koordinat / yarıçap / Google type / anahtar kelime (isteğe bağlı)</summary>
                    <p className="text-[11px] text-gray-500 mt-2 mb-2">Arama metni boşsa enlem, boylam ve yarıçap ile yakındaki işletmeler aranır.</p>
                    <div className="grid grid-cols-2 gap-3 pb-2">
                      <div><label className="text-xs text-gray-500">Enlem (Lat)</label>
                        <Input type="number" step="any" value={scraperForm.lat} onChange={(e) => setScraperForm({ ...scraperForm, lat: e.target.value })} placeholder="39.9334" />
                      </div>
                      <div><label className="text-xs text-gray-500">Boylam (Lng)</label>
                        <Input type="number" step="any" value={scraperForm.lng} onChange={(e) => setScraperForm({ ...scraperForm, lng: e.target.value })} placeholder="32.8597" />
                      </div>
                    </div>
                    <div className="pb-2"><label className="text-xs text-gray-500">Yarıçap (metre)</label>
                      <Input type="number" value={scraperForm.radius} onChange={(e) => setScraperForm({ ...scraperForm, radius: e.target.value })} placeholder="5000" />
                    </div>
                    <div className="pb-2"><label className="text-xs text-gray-500">Kategori (Google Place Type)</label>
                      <Input value={scraperForm.category} onChange={(e) => setScraperForm({ ...scraperForm, category: e.target.value })} placeholder="restaurant, cafe, lodging…" />
                    </div>
                    <div className="pb-2"><label className="text-xs text-gray-500">Anahtar kelime</label>
                      <Input value={scraperForm.keyword} onChange={(e) => setScraperForm({ ...scraperForm, keyword: e.target.value })} placeholder="pizza, burger…" />
                    </div>
                  </details>
                  <Button
                    onClick={() => void runScraper()}
                    disabled={loading || (!placesImport.textQuery.trim() && (!scraperForm.lat || !scraperForm.lng))}
                    className="w-full"
                  >
                    {loading ? "Çekiliyor..." : "🔵 Google'dan çek ve kaydet"}
                  </Button>
                  {scraperResult && (
                    <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap break-words ${scraperResult.startsWith("✅") ? "bg-green-50 text-green-800" : scraperResult.startsWith("⏳") ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"}`}>
                      {scraperResult}
                    </div>
                  )}
                  {placesPreview.length > 0 && (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 border-b">Sonuç önizlemesi — {placesPreview.length} kayıt</div>
                      <div className="max-h-72 overflow-y-auto divide-y">
                        {placesPreview.map((b, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-gray-50">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{b.name}</p>
                              <p className="text-xs text-gray-500 truncate">{b.address || "—"}{b.phone ? ` · ${b.phone}` : ""}</p>
                            </div>
                            {b.rating != null ? <span className="text-xs text-amber-600 font-semibold shrink-0">⭐ {b.rating}</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {scraperTab === "insaat" && (
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl shrink-0">🏗️</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">insaatfirmalarim.com Kazıyıcı</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      29 inşaat kategorisi × 81 il listelerinden firma URL&apos;leri toplanır; <code className="text-[10px] bg-gray-100 px-1 rounded">/firma/*</code> detayları çekilir.
                      Rate limit (~1.6sn/istek), robots.txt saygısı ve ad+adres+telefon dedupe uygulanır. Açıklamalar SEO/geo odaklı özgünleştirilir.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="if-mode"
                        checked={ifForm.mode === "city"}
                        onChange={() => setIfForm({ ...ifForm, mode: "city" })}
                      />
                      <span className="font-medium">İl bazlı</span>
                      <span className="text-xs text-gray-500">(29 kategori, tüm sayfalar)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="if-mode"
                        checked={ifForm.mode === "category"}
                        onChange={() => setIfForm({ ...ifForm, mode: "category" })}
                      />
                      <span className="font-medium">Kategori bazlı</span>
                      <span className="text-xs text-gray-500">(81 il, tüm sayfalar)</span>
                    </label>
                  </div>
                  {ifForm.mode === "city" ? (
                    <div>
                      <label className="text-xs text-gray-500 font-medium">İl</label>
                      <select
                        value={ifForm.citySlug}
                        onChange={(e) => setIfForm({ ...ifForm, citySlug: e.target.value })}
                        className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
                      >
                        {(insaatCityOptions).map((city) => (
                          <option key={city.slug} value={city.slug}>
                            {city.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">Seçilen il için 29 kategorinin tamamı kuyruğa alınır.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-500 font-medium">İnşaat kategorisi</label>
                      <select
                        value={ifForm.categorySlug}
                        onChange={(e) => setIfForm({ ...ifForm, categorySlug: e.target.value })}
                        className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
                      >
                        {insaatCategoryOptions.length === 0 ? (
                          <option value={ifForm.categorySlug}>{ifForm.categorySlug || "Kategoriler yükleniyor…"}</option>
                        ) : (
                          insaatCategoryOptions.map((cat) => (
                            <option key={cat.slug} value={cat.slug}>
                              {cat.label}
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {insaatCategoryOptions.length > 0
                          ? `${insaatCategoryOptions.length} kategori — seçilen kategori için 81 il kuyruğa alınır.`
                          : "Seçilen kategori için 81 ilin tamamı kuyruğa alınır."}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500">Maks. firma (opsiyonel — boş = sınırsız)</label>
                    <Input
                      type="number"
                      min={1}
                      max={50000}
                      value={ifForm.maxFirms}
                      onChange={(e) => setIfForm({ ...ifForm, maxFirms: e.target.value })}
                      placeholder="Tüm firmalar"
                      className="mt-1"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={ifForm.autoImport} onChange={(e) => setIfForm({ ...ifForm, autoImport: e.target.checked })} />
                    Otomatik <code className="text-[10px] bg-gray-100 px-1 rounded">map_businesses</code> içe aktar (importSource=insaatfirmalarim)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={ifForm.geocode} onChange={(e) => setIfForm({ ...ifForm, geocode: e.target.checked })} />
                    Koordinat geocode (Nominatim — yavaş; toplu kuyrukta kapalı bırakın)
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => runInsaatfirmalarimScraper(false)}
                      disabled={ifLoading}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {ifLoading
                        ? "⏳ Kazınıyor..."
                        : ifForm.autoImport
                          ? "🏗️ İnşaat Firmalarım İçe Aktar"
                          : "🔍 Önizle (içe aktarma yok)"}
                    </Button>
                    <Button onClick={() => runInsaatfirmalarimScraper(true)} disabled={ifLoading} variant="outline" className="flex-1">
                      📋 Arka Plan Kuyruğu
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIfQueueOpen((v) => !v)}
                      className="shrink-0"
                    >
                      📊 {ifQueueOpen ? "Paneli Gizle" : "Kuyruk"}
                    </Button>
                  </div>
                  {ifResult && (
                    <div className={`p-3 rounded-lg text-sm ${ifResult.startsWith("✅") ? "bg-green-50 text-green-800 border border-green-200" : ifResult.startsWith("⏳") ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                      {ifResult}
                    </div>
                  )}
                  {ifPreview.length > 0 && (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 border-b">Önizleme — {ifPreview.length} firma</div>
                      <div className="max-h-72 overflow-y-auto divide-y">
                        {ifPreview.map((f, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-gray-50">
                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{f.name ?? "—"}</p>
                              <p className="text-xs text-gray-500 truncate">{f.city ?? "—"}{f.phone ? ` · ${f.phone}` : ""}{f.address ? ` · ${f.address}` : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {ifQueueOpen && (
                    <div ref={ifQueuePanelRef} className="mt-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">Arka Plan Kuyruğu</h4>
                          {ifBatchId ? (
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">batch: {ifBatchId}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {(ifQueueData?.summary.queued ?? 0) > 0 || ifQueueData?.needsResume ? (
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="text-xs h-7 bg-orange-600 hover:bg-orange-700"
                              disabled={ifQueueOpsLoading}
                              onClick={() => void resumeInsaatfirmalarimQueue()}
                            >
                              {ifQueueOpsLoading ? "…" : "Bekleyenleri İşle"}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            disabled={ifQueueOpsLoading}
                            onClick={() => void recoverInsaatfirmalarimWorker()}
                          >
                            {ifQueueOpsLoading ? "…" : "Worker Kurtar"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 text-red-700 border-red-200"
                            disabled={ifQueueOpsLoading}
                            onClick={() => void clearInsaatfirmalarimQueue(Boolean(ifBatchId))}
                          >
                            {ifBatchId ? "Batch İptal" : "Kuyruk Temizle"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => { setIfQueueOpen(false); setIfBatchId(null); }}
                          >
                            Kapat
                          </Button>
                        </div>
                      </div>
                      {ifQueueData ? (
                        <>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-green-100 text-green-800 px-2 py-1 font-medium">
                              {ifQueueData.summary.done} tamamlandı
                            </span>
                            <span className="rounded-md bg-blue-100 text-blue-800 px-2 py-1 font-medium">
                              {ifQueueData.summary.running} devam ediyor
                            </span>
                            <span className="rounded-md bg-gray-100 text-gray-700 px-2 py-1 font-medium">
                              {ifQueueData.summary.queued} bekliyor
                            </span>
                            {ifQueueData.summary.error > 0 ? (
                              <span className="rounded-md bg-red-100 text-red-800 px-2 py-1 font-medium">
                                {ifQueueData.summary.error} hata
                              </span>
                            ) : null}
                            <span className="rounded-md bg-white border px-2 py-1 text-gray-600">
                              kuyruk derinliği: {ifQueueData.queueDepth}
                              {ifQueueData.inMemoryQueueDepth != null && ifQueueData.inMemoryQueueDepth !== ifQueueData.queueDepth
                                ? ` (bellek: ${ifQueueData.inMemoryQueueDepth})`
                                : ""}
                              {ifQueueData.workerRunning ? " · worker aktif" : " · worker boşta"}
                              {ifQueueData.jobTimeoutMinutes ? ` · iş limiti ${ifQueueData.jobTimeoutMinutes} dk` : ""}
                            </span>
                          </div>
                          {ifQueueData.currentJob ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-900">
                              <span className="font-semibold">Şu an çalışan:</span>{" "}
                              {ifQueueData.currentJob.city} / {ifQueueData.currentJob.category}
                              {" · "}
                              {Math.round(ifQueueData.currentJob.runningMs / 1000)} sn
                              {ifQueueData.currentJob.message ? ` — ${ifQueueData.currentJob.message}` : ""}
                            </div>
                          ) : ifQueueData.needsResume || (ifQueueData.summary.queued > 0 && !ifQueueData.workerRunning) ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                              {ifQueueData.summary.queued} iş bekliyor — worker otomatik devam ettiriliyor (sunucu watchdog ~20 sn).
                            </div>
                          ) : ifQueueData.queueDepth > 0 && !ifQueueData.workerRunning ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                              Kuyrukta {ifQueueData.queueDepth} iş var ama worker çalışmıyor — <strong>Worker Kurtar</strong> düğmesine basın.
                            </div>
                          ) : ifQueueData.summary.queued === 0 && ifQueueData.summary.running === 0 && ifQueueData.summary.total > 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                              Aktif kuyruk işi yok
                            </div>
                          ) : null}
                          {ifQueueData.lastWorkerError ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                              Son hata: {ifQueueData.lastWorkerError}
                            </div>
                          ) : null}
                          {ifQueueData.totalsByCity.length > 0 ? (
                            <div className="rounded-lg border bg-white p-2">
                              <p className="text-[11px] font-semibold text-gray-700 mb-1">İl bazında eklenen firma</p>
                              <div className="flex flex-wrap gap-1.5">
                                {ifQueueData.totalsByCity.slice(0, 12).map((row) => (
                                  <span key={row.citySlug} className="text-[10px] bg-orange-100 text-orange-900 rounded px-1.5 py-0.5">
                                    {row.city}: {row.imported} eklendi ({row.scraped} bulundu)
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <div className="rounded-lg border bg-white overflow-hidden">
                            <div className="max-h-72 overflow-auto">
                              <table className="w-full text-[11px]">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr className="text-left text-gray-600">
                                    <th className="px-2 py-1.5 font-semibold">Şehir</th>
                                    <th className="px-2 py-1.5 font-semibold">Kategori</th>
                                    <th className="px-2 py-1.5 font-semibold">Durum</th>
                                    <th className="px-2 py-1.5 font-semibold text-right">Bulunan</th>
                                    <th className="px-2 py-1.5 font-semibold text-right">Eklenen</th>
                                    <th className="px-2 py-1.5 font-semibold text-right">Sayfa</th>
                                    <th className="px-2 py-1.5 font-semibold text-right">Hata</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {ifQueueData.jobs.map((job) => {
                                    const statusLabel =
                                      job.status === "queued" ? (job.remaining ? `Bekliyor (#${job.remaining})` : "Bekliyor")
                                        : job.status === "running" ? "Çalışıyor"
                                          : job.status === "done" ? "Tamamlandı"
                                            : job.errors[0] ? `Hata: ${job.errors[0].slice(0, 48)}${job.errors[0].length > 48 ? "…" : ""}`
                                              : job.message?.startsWith("Kuyruk temizlendi") ? "İptal"
                                                : "Hata";
                                    const statusClass =
                                      job.status === "queued" ? "text-gray-600"
                                        : job.status === "running" ? "text-blue-700 font-medium"
                                          : job.status === "done" ? "text-green-700"
                                            : "text-red-700";
                                    return (
                                      <tr key={job.id} className="hover:bg-gray-50" title={[job.message, ...job.errors].filter(Boolean).join(" | ")}>
                                        <td className="px-2 py-1.5 whitespace-nowrap">{job.city}</td>
                                        <td className="px-2 py-1.5 max-w-[140px] truncate" title={job.category}>{job.category}</td>
                                        <td className={`px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate ${statusClass}`} title={job.message}>{statusLabel}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">{job.firmsFound}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">{job.firmsImported}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">{job.pagesScraped || "—"}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums text-red-600">{job.errorCount || "—"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {ifQueueData.jobs.length === 0 ? (
                              <p className="text-center text-gray-400 py-6 text-xs">Aktif kuyruk işi yok</p>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Kuyruk durumu yükleniyor… (5 sn&apos;de bir güncellenir)</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {scraperTab === "yatport" && (
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center text-xl shrink-0">⛵</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">yatport.com Kazıyıcı</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Resmi <code className="text-[10px] bg-gray-100 px-1 rounded">api.yatport.com</code> API üzerinden tekne listesi ve detayları çekilir.
                      İletişim, genel bilgiler, fiyat, imkanlar, şartlar, güvenlik, rotalar ve galeri{" "}
                      <code className="text-[10px] bg-gray-100 px-1 rounded">map_businesses</code> (importSource=yatport, storeType=turizm_yat) olarak kaydedilir.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="yp-mode"
                        checked={ypForm.mode === "listing"}
                        onChange={() => setYpForm({ ...ypForm, mode: "listing" })}
                      />
                      <span className="font-medium">Genel liste</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="yp-mode"
                        checked={ypForm.mode === "district"}
                        onChange={() => setYpForm({ ...ypForm, mode: "district" })}
                      />
                      <span className="font-medium">İstanbul ilçe</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="yp-mode"
                        checked={ypForm.mode === "boatType"}
                        onChange={() => setYpForm({ ...ypForm, mode: "boatType" })}
                      />
                      <span className="font-medium">Tekne tipi</span>
                    </label>
                  </div>
                  {ypForm.mode === "listing" ? (
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Liste slug</label>
                      <select
                        value={ypForm.listSlug}
                        onChange={(e) => setYpForm({ ...ypForm, listSlug: e.target.value })}
                        className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
                      >
                        {yatportListSlugOptions.map((slug) => (
                          <option key={slug} value={slug}>
                            {slug}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : ypForm.mode === "district" ? (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={ypForm.allDistricts}
                          onChange={(e) => setYpForm({ ...ypForm, allDistricts: e.target.checked })}
                        />
                        Tüm İstanbul ilçeleri (Bebek, Karaköy, Ortaköy…)
                      </label>
                      {!ypForm.allDistricts ? (
                        <div>
                          <label className="text-xs text-gray-500 font-medium">İlçe</label>
                          <select
                            value={ypForm.districtSlug}
                            onChange={(e) => setYpForm({ ...ypForm, districtSlug: e.target.value })}
                            className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
                          >
                            {yatportDistrictOptions.map((d) => (
                              <option key={d.slug} value={d.slug}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Tekne tipi</label>
                      <select
                        value={ypForm.boatTypeSlug}
                        onChange={(e) => setYpForm({ ...ypForm, boatTypeSlug: e.target.value })}
                        className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
                      >
                        {yatportBoatTypeOptions.map((bt) => (
                          <option key={bt.slug} value={bt.slug}>
                            {bt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500">Maks. tekne (boş = sınırsız; önizleme için 2 önerilir)</label>
                    <Input
                      type="number"
                      min={1}
                      max={50000}
                      value={ypForm.maxBoats}
                      onChange={(e) => setYpForm({ ...ypForm, maxBoats: e.target.value })}
                      placeholder="2"
                      className="mt-1"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={ypForm.autoImport} onChange={(e) => setYpForm({ ...ypForm, autoImport: e.target.checked })} />
                    Otomatik <code className="text-[10px] bg-gray-100 px-1 rounded">map_businesses</code> içe aktar
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={ypForm.downloadImages} onChange={(e) => setYpForm({ ...ypForm, downloadImages: e.target.checked })} />
                    Görselleri yerel depolamaya indir (CDN imzalı URL başarısızsa harici URL saklanır)
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => runYatportScraper(false)}
                      disabled={ypLoading}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                    >
                      {ypLoading
                        ? "⏳ Kazınıyor..."
                        : ypForm.autoImport
                          ? "⛵ Yatport İçe Aktar"
                          : "🔍 Önizle (içe aktarma yok)"}
                    </Button>
                    <Button onClick={() => runYatportScraper(true)} disabled={ypLoading} variant="outline" className="flex-1">
                      📋 Arka Plan Kuyruğu
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setYpQueueOpen((v) => !v)}
                      className="shrink-0"
                    >
                      📊 {ypQueueOpen ? "Paneli Gizle" : "Kuyruk"}
                    </Button>
                  </div>
                  {ypResult && (
                    <div className={`p-3 rounded-lg text-sm ${ypResult.startsWith("✅") ? "bg-green-50 text-green-800 border border-green-200" : ypResult.startsWith("⏳") ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                      {ypResult}
                    </div>
                  )}
                  {ypPreview.length > 0 && (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 border-b">Önizleme — {ypPreview.length} tekne</div>
                      <div className="max-h-72 overflow-y-auto divide-y">
                        {ypPreview.map((b, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-gray-50">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{b.name ?? "—"}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {b.district ?? b.city ?? "—"}
                                {b.phone ? ` · ${b.phone}` : ""}
                                {b.price ? ` · ${b.price}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {ypQueueOpen && (
                    <div ref={ypQueuePanelRef} className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">Arka Plan Kuyruğu</h4>
                          {ypBatchId ? (
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">batch: {ypBatchId}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            disabled={ypQueueOpsLoading}
                            onClick={() => void recoverYatportWorker()}
                          >
                            {ypQueueOpsLoading ? "…" : "Worker Kurtar"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 text-red-700 border-red-200"
                            disabled={ypQueueOpsLoading}
                            onClick={() => void clearYatportQueue(Boolean(ypBatchId))}
                          >
                            {ypBatchId ? "Batch İptal" : "Kuyruk Temizle"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => { setYpQueueOpen(false); setYpBatchId(null); }}
                          >
                            Kapat
                          </Button>
                        </div>
                      </div>
                      {ypQueueData ? (
                        <>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-green-100 text-green-800 px-2 py-1 font-medium">
                              {ypQueueData.summary.done} tamamlandı
                            </span>
                            <span className="rounded-md bg-blue-100 text-blue-800 px-2 py-1 font-medium">
                              {ypQueueData.summary.running} devam ediyor
                            </span>
                            <span className="rounded-md bg-gray-100 text-gray-700 px-2 py-1 font-medium">
                              {ypQueueData.summary.queued} bekliyor
                            </span>
                            {ypQueueData.summary.error > 0 ? (
                              <span className="rounded-md bg-red-100 text-red-800 px-2 py-1 font-medium">
                                {ypQueueData.summary.error} hata
                              </span>
                            ) : null}
                            <span className="rounded-md bg-white border px-2 py-1 text-gray-600">
                              kuyruk: {ypQueueData.queueDepth}
                              {ypQueueData.workerRunning ? " · worker aktif" : " · worker boşta"}
                              {ypQueueData.fetchTimeoutSeconds ? ` · API ${ypQueueData.fetchTimeoutSeconds} sn` : ""}
                              {ypQueueData.jobTimeoutMinutes ? ` · limit ${ypQueueData.jobTimeoutMinutes} dk` : ""}
                            </span>
                          </div>
                          {ypQueueData.queueDepth > 0 && !ypQueueData.workerRunning ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                              Kuyrukta {ypQueueData.queueDepth} iş var ama worker çalışmıyor — <strong>Worker Kurtar</strong> düğmesine basın.
                            </div>
                          ) : null}
                          {ypQueueData.lastWorkerError ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                              Son hata: {ypQueueData.lastWorkerError}
                            </div>
                          ) : null}
                          {ypQueueData.currentJob ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-900">
                              <span className="font-semibold">Şu an:</span> {ypQueueData.currentJob.label}
                              {" · "}
                              {Math.round(ypQueueData.currentJob.runningMs / 1000)} sn
                              {ypQueueData.currentJob.discovered != null && ypQueueData.currentJob.discovered > 0
                                ? ` · ${ypQueueData.currentJob.discovered} bulundu`
                                : ""}
                              {ypQueueData.currentJob.message ? ` — ${ypQueueData.currentJob.message}` : ""}
                            </div>
                          ) : null}
                          <div className="rounded-lg border bg-white overflow-hidden">
                            <div className="max-h-72 overflow-auto">
                              <table className="w-full text-[11px]">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr className="text-left text-gray-600">
                                    <th className="px-2 py-1.5 font-semibold">Mod</th>
                                    <th className="px-2 py-1.5 font-semibold">Hedef</th>
                                    <th className="px-2 py-1.5 font-semibold">Durum</th>
                                    <th className="px-2 py-1.5 font-semibold text-right">Kazınan</th>
                                    <th className="px-2 py-1.5 font-semibold text-right">Eklenen</th>
                                    <th className="px-2 py-1.5 font-semibold text-right">Hata</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {ypQueueData.jobs.map((job) => {
                                    const target =
                                      job.districtSlug || job.boatTypeSlug || job.listSlug || job.mode || "—";
                                    const statusLabel =
                                      job.status === "queued" ? "Bekliyor"
                                        : job.status === "running" ? "Çalışıyor"
                                          : job.status === "done"
                                            ? job.progress.scraped === 0 && job.progress.discovered === 0
                                              ? "Boş sonuç"
                                              : "Tamamlandı"
                                            : job.errors?.[0]
                                              ? `Hata: ${job.errors[0].slice(0, 48)}${job.errors[0].length > 48 ? "…" : ""}`
                                              : job.message?.startsWith("Kuyruk temizlendi") ? "İptal"
                                                : "Hata";
                                    const errorHint =
                                      job.errors?.[0]
                                        ? job.errors[0].slice(0, 64) + (job.errors[0].length > 64 ? "…" : "")
                                        : job.status === "done" && job.progress.scraped === 0
                                          ? job.message || "Sonuç yok"
                                          : job.errorCount > 0
                                            ? String(job.errorCount)
                                            : "—";
                                    const statusClass =
                                      job.status === "queued" ? "text-gray-600"
                                        : job.status === "running" ? "text-blue-700 font-medium"
                                          : job.status === "done"
                                            ? job.progress.scraped === 0 && job.progress.discovered === 0
                                              ? "text-amber-700"
                                              : "text-green-700"
                                            : "text-red-700";
                                    return (
                                      <tr key={job.id} className="hover:bg-gray-50" title={[job.message, ...(job.errors ?? [])].filter(Boolean).join(" | ")}>
                                        <td className="px-2 py-1.5 whitespace-nowrap">{job.mode ?? "—"}</td>
                                        <td className="px-2 py-1.5 max-w-[140px] truncate">{target}</td>
                                        <td className={`px-2 py-1.5 whitespace-nowrap max-w-[180px] truncate ${statusClass}`} title={job.message}>{statusLabel}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">{job.progress.scraped}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">{job.progress.imported}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums text-red-600 max-w-[120px] truncate" title={job.errors?.[0]}>{errorHint}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {ypQueueData.jobs.length === 0 ? (
                              <p className="text-center text-gray-400 py-6 text-xs">Aktif kuyruk işi yok</p>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Kuyruk durumu yükleniyor… (5 sn&apos;de bir güncellenir)</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── POPULAR LOCATIONS ── */}
        {tab === "locations" && (
          <div className="space-y-6">
            {/* Add/Edit form */}
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-4">{editingLoc ? "✏️ Lokasyon Düzenle" : "➕ Yeni Lokasyon Ekle"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="text-xs text-gray-500 font-medium">Şehir Adı *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} placeholder="İstanbul" /></div>
                <div><label className="text-xs text-gray-500 font-medium">Türkçe Ad</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={locForm.nameTr} onChange={e => setLocForm(f => ({ ...f, nameTr: e.target.value }))} placeholder="İstanbul" /></div>
                <div><label className="text-xs text-gray-500 font-medium">Sıra</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={locForm.sortOrder} onChange={e => setLocForm(f => ({ ...f, sortOrder: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-500 font-medium">Enlem *</label>
                  <input type="number" step="0.0001" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={locForm.latitude} onChange={e => setLocForm(f => ({ ...f, latitude: e.target.value }))} placeholder="41.0082" /></div>
                <div><label className="text-xs text-gray-500 font-medium">Boylam *</label>
                  <input type="number" step="0.0001" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={locForm.longitude} onChange={e => setLocForm(f => ({ ...f, longitude: e.target.value }))} placeholder="28.9784" /></div>
                <div><label className="text-xs text-gray-500 font-medium">Zoom (10-18)</label>
                  <input type="number" min={10} max={18} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={locForm.zoomLevel} onChange={e => setLocForm(f => ({ ...f, zoomLevel: e.target.value }))} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 font-medium">Kapak Fotoğrafı URL</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={locForm.imageUrl} onChange={e => setLocForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." /></div>
                <div><label className="text-xs text-gray-500 font-medium">Açıklama</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={locForm.description} onChange={e => setLocForm(f => ({ ...f, description: e.target.value }))} placeholder="Ege'nin incisi" /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveLocation} disabled={!locForm.name || !locForm.latitude || !locForm.longitude}
                  className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {editingLoc ? "💾 Güncelle" : "➕ Ekle"}
                </button>
                {editingLoc && (
                  <button onClick={() => { setEditingLoc(null); setLocForm({ name: "", nameTr: "", latitude: "", longitude: "", zoomLevel: "13", imageUrl: "", description: "", sortOrder: "0" }); }}
                    className="bg-gray-100 text-gray-700 rounded-lg px-5 py-2 text-sm hover:bg-gray-200">İptal</button>
                )}
              </div>
            </div>

            {/* Locations list */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold">{locations.length} Popüler Lokasyon</h3>
                <span className="text-xs text-gray-400">Keşfet anasayfasında görünür</span>
              </div>
              {locations.length === 0 ? (
                <div className="text-center py-10 text-gray-400">Henüz lokasyon eklenmemiş</div>
              ) : (
                <div className="divide-y">
                  {locations.map(loc => (
                    <div key={loc.id} className="flex items-center gap-4 px-5 py-3">
                      {loc.imageUrl && <img src={loc.imageUrl} alt={loc.name} className="w-14 h-14 object-cover rounded-lg shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      {!loc.imageUrl && <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center text-2xl shrink-0">🏙️</div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{loc.name}</span>
                          <span className="text-xs text-gray-400">Sıra: {loc.sortOrder}</span>
                          {!loc.isActive && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Gizli</span>}
                        </div>
                        <p className="text-xs text-gray-500">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)} · Zoom {loc.zoomLevel}</p>
                        {loc.description && <p className="text-xs text-gray-400 truncate">{loc.description}</p>}
                        {loc.businessCount !== null && loc.businessCount > 0 && <p className="text-xs text-blue-600">{loc.businessCount} işletme</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleLocationActive(loc)}
                          className={`text-xs px-2 py-1 rounded-lg font-medium ${loc.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                          {loc.isActive ? "Aktif" : "Gizli"}
                        </button>
                        <button onClick={() => { setEditingLoc(loc.id); setLocForm({ name: loc.name, nameTr: loc.nameTr || "", latitude: String(loc.latitude), longitude: String(loc.longitude), zoomLevel: String(loc.zoomLevel), imageUrl: loc.imageUrl || "", description: loc.description || "", sortOrder: String(loc.sortOrder) }); }}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100">Düzenle</button>
                        <button onClick={() => deleteLocation(loc.id)} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg hover:bg-red-100">Sil</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <strong>📍 Görüntüleme:</strong> Bu lokasyonlar Keşfet (<code>/kesfet</code>) sayfasının sol panelinde şehir seçim kartları olarak gösterilir. Kullanıcı bir şehre tıklayınca harita o şehre zoom yapar ve işletmeler listelenir.
            </div>
          </div>
        )}

        {/* ── PREMIUM İŞLETMELER ── */}
        {tab === "premium" && (
          <div className="flex gap-4 h-full">
            {/* Left: premium business list */}
            <div className="w-72 shrink-0">
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-amber-50 flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⭐</span>
                  <span className="font-semibold text-sm text-amber-900">Premium İşletmeler</span>
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{premiumBizinesses.length}</span>
                </div>
                {premiumLoading ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Yükleniyor...</div>
                ) : premiumBizinesses.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm px-4">
                    <div className="text-3xl mb-2">⭐</div>
                    <div>Henüz premium işletme yok.</div>
                    <div className="text-xs mt-1">İşletmeler sekmesinden premium yapabilirsiniz.</div>
                  </div>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {premiumBizinesses.map((b) => (
                      <button key={b.id} onClick={() => loadPremiumDetail(b)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 text-left transition-colors ${selectedPremiumBiz?.id === b.id ? "bg-amber-50 border-l-4 border-amber-400" : ""}`}>
                        {b.photoUrl ? (
                          <img src={b.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg shrink-0">🏢</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900 truncate">{b.name}</div>
                          {b.category && <div className="text-xs text-gray-500">{b.category.name}</div>}
                          {b.premiumExpiresAt ? (
                            (() => {
                              const days = subDaysLeft(b.premiumExpiresAt);
                              const isExpired = days !== null && days <= 0;
                              const isUrgent = days !== null && days > 0 && days <= 14;
                              return (
                                <div className={`text-[10px] font-medium mt-0.5 ${isExpired ? "text-red-600" : isUrgent ? "text-orange-600" : "text-green-700"}`}>
                                  {isExpired ? "❗ Süresi doldu" : days !== null ? `📅 ${days} gün kaldı` : "📅"}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-[10px] text-amber-600 mt-0.5">📅 Süresiz</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: detail panel */}
            <div className="flex-1 min-w-0">
              {!selectedPremiumBiz ? (
                <div className="bg-white border rounded-xl h-64 flex flex-col items-center justify-center text-gray-400">
                  <div className="text-4xl mb-3">👈</div>
                  <div className="font-medium">Sol taraftan bir işletme seçin</div>
                  <div className="text-sm mt-1">Ürünler, kampanyalar, rezervasyonlar ve siparişleri yönetin</div>
                </div>
              ) : (
                <div className="bg-white border rounded-xl overflow-hidden">
                  {/* Business header */}
                  <div className="flex items-center gap-4 px-5 py-4 border-b bg-amber-50">
                    {selectedPremiumBiz.photoUrl ? (
                      <img src={selectedPremiumBiz.photoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center text-xl">🏢</div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {selectedPremiumBiz.name}
                        <span className="text-amber-500 text-sm">⭐ Premium</span>
                      </div>
                      {selectedPremiumBiz.address && <div className="text-xs text-gray-500">{selectedPremiumBiz.address}</div>}
                      {selectedPremiumBiz.phone && <div className="text-xs text-gray-500">{selectedPremiumBiz.phone}</div>}
                    </div>
                    <a href={`/kesfet/isletme/${selectedPremiumBiz.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50">
                      Detay Sayfası ↗
                    </a>
                  </div>

                  {/* Sub tabs */}
                  <div className="flex border-b bg-gray-50">
                    {[
                      { id: "products" as const, label: "Ürünler", count: premiumProducts.length },
                      { id: "campaigns" as const, label: "Kampanyalar", count: premiumCampaigns.length },
                      { id: "reservations" as const, label: "Rezervasyonlar", count: premiumReservations.length },
                      { id: "orders" as const, label: "Siparişler", count: premiumOrders.length },
                    ].map((st) => (
                      <button key={st.id} onClick={() => setPremiumSubTab(st.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${premiumSubTab === st.id ? "border-amber-500 text-amber-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                        {st.label}
                        {st.count > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{st.count}</span>}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {/* Products */}
                    {premiumSubTab === "products" && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-700">Ürünler / Menü</h4>
                          <Button size="sm" onClick={() => { setProductForm({}); setEditingProduct(null); setShowProductForm(true); }}>+ Ürün Ekle</Button>
                        </div>
                        {showProductForm && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                            <h5 className="font-medium text-sm mb-3">{editingProduct ? "Ürünü Düzenle" : "Yeni Ürün"}</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-xs text-gray-500">Ürün Adı *</label>
                                <Input value={productForm.name ?? ""} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ürün adı" />
                              </div>
                              <div><label className="text-xs text-gray-500">Fiyat (TRY)</label>
                                <Input type="number" value={productForm.price ?? ""} onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })} placeholder="0" />
                              </div>
                              <div className="col-span-2"><label className="text-xs text-gray-500">Açıklama</label>
                                <Input value={productForm.description ?? ""} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Kısa açıklama" />
                              </div>
                              <div><label className="text-xs text-gray-500">Görsel URL</label>
                                <Input value={productForm.imageUrl ?? ""} onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })} placeholder="https://..." />
                              </div>
                              <div><label className="text-xs text-gray-500">Sıra</label>
                                <Input type="number" value={productForm.sortOrder ?? 0} onChange={(e) => setProductForm({ ...productForm, sortOrder: parseInt(e.target.value) })} />
                              </div>
                              <div className="flex items-center gap-2 pt-4">
                                <input type="checkbox" id="prodAvail" checked={productForm.isAvailable ?? true} onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })} />
                                <label htmlFor="prodAvail" className="text-sm">Mevcut</label>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={saveProduct}>{editingProduct ? "Güncelle" : "Kaydet"}</Button>
                              <Button size="sm" variant="outline" onClick={() => { setShowProductForm(false); setEditingProduct(null); setProductForm({}); }}>İptal</Button>
                            </div>
                          </div>
                        )}
                        {premiumProducts.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">Henüz ürün eklenmemiş</div>
                        ) : (
                          <div className="space-y-2">
                            {premiumProducts.map((p) => (
                              <div key={p.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                                {p.imageUrl && <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                                {!p.imageUrl && <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">🛍️</div>}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900">{p.name}</div>
                                  {p.description && <div className="text-xs text-gray-500 truncate">{p.description}</div>}
                                  <div className="text-xs text-green-700 font-medium">{p.price > 0 ? `${p.price} ${p.currency}` : "Fiyatsız"}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {!p.isAvailable && <Badge variant="secondary" className="text-xs">Yok</Badge>}
                                  <button onClick={() => { setProductForm(p); setEditingProduct(p.id); setShowProductForm(true); }}
                                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100">Düzenle</button>
                                  <button onClick={() => deleteProduct(p.id)}
                                    className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100">Sil</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campaigns */}
                    {premiumSubTab === "campaigns" && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-700">Kampanyalar</h4>
                          <Button size="sm" onClick={() => { setCampaignForm({}); setEditingCampaign(null); setShowCampaignForm(true); }}>+ Kampanya Ekle</Button>
                        </div>
                        {showCampaignForm && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                            <h5 className="font-medium text-sm mb-3">{editingCampaign ? "Kampanyayı Düzenle" : "Yeni Kampanya"}</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2"><label className="text-xs text-gray-500">Başlık *</label>
                                <Input value={campaignForm.title ?? ""} onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} placeholder="Kampanya başlığı" />
                              </div>
                              <div className="col-span-2"><label className="text-xs text-gray-500">Açıklama</label>
                                <Input value={campaignForm.description ?? ""} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} placeholder="Detay" />
                              </div>
                              <div><label className="text-xs text-gray-500">İndirim %</label>
                                <Input type="number" min="0" max="100" value={campaignForm.discountPercent ?? ""} onChange={(e) => setCampaignForm({ ...campaignForm, discountPercent: parseInt(e.target.value) })} placeholder="20" />
                              </div>
                              <div><label className="text-xs text-gray-500">Geçerlilik Tarihi</label>
                                <Input type="date" value={campaignForm.validUntil?.slice(0, 10) ?? ""} onChange={(e) => setCampaignForm({ ...campaignForm, validUntil: e.target.value })} />
                              </div>
                              <div><label className="text-xs text-gray-500">Görsel URL</label>
                                <Input value={campaignForm.imageUrl ?? ""} onChange={(e) => setCampaignForm({ ...campaignForm, imageUrl: e.target.value })} placeholder="https://..." />
                              </div>
                              <div className="flex items-center gap-2 pt-4">
                                <input type="checkbox" id="campActive" checked={campaignForm.isActive ?? true} onChange={(e) => setCampaignForm({ ...campaignForm, isActive: e.target.checked })} />
                                <label htmlFor="campActive" className="text-sm">Aktif</label>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={saveCampaign}>{editingCampaign ? "Güncelle" : "Kaydet"}</Button>
                              <Button size="sm" variant="outline" onClick={() => { setShowCampaignForm(false); setEditingCampaign(null); setCampaignForm({}); }}>İptal</Button>
                            </div>
                          </div>
                        )}
                        {premiumCampaigns.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">Henüz kampanya eklenmemiş</div>
                        ) : (
                          <div className="space-y-2">
                            {premiumCampaigns.map((c) => (
                              <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-xl shrink-0">🎁</div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900">{c.title}</div>
                                  {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {c.discountPercent && <span className="text-xs text-green-700 font-medium">%{c.discountPercent} indirim</span>}
                                    {c.validUntil && <span className="text-xs text-gray-400">Bitiş: {new Date(c.validUntil).toLocaleDateString("tr-TR")}</span>}
                                    {!c.isActive && <Badge variant="secondary" className="text-xs">Pasif</Badge>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button onClick={() => { setCampaignForm(c); setEditingCampaign(c.id); setShowCampaignForm(true); }}
                                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100">Düzenle</button>
                                  <button onClick={() => deleteCampaign(c.id)}
                                    className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100">Sil</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reservations */}
                    {premiumSubTab === "reservations" && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-4">Rezervasyonlar</h4>
                        {premiumReservations.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">Henüz rezervasyon yok</div>
                        ) : (
                          <div className="space-y-2">
                            {premiumReservations.map((r) => (
                              <div key={r.id} className="p-3 border rounded-lg bg-white">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900">{r.customerName}</div>
                                    <div className="text-xs text-gray-500 space-x-3">
                                      <span>📞 {r.customerPhone}</span>
                                      {r.customerEmail && <span>✉️ {r.customerEmail}</span>}
                                      {r.partySize && <span>👥 {r.partySize} kişi</span>}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      📅 {new Date(r.reservationDate).toLocaleString("tr-TR")}
                                    </div>
                                    {r.note && <div className="text-xs text-gray-400 italic mt-0.5">Not: {r.note}</div>}
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      r.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                                      r.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                                      r.status === "COMPLETED" ? "bg-blue-100 text-blue-700" :
                                      "bg-yellow-100 text-yellow-700"
                                    }`}>{r.status}</span>
                                    <div className="flex gap-1">
                                      {r.status === "PENDING" && <>
                                        <button onClick={() => updateReservationStatus(r.id, "CONFIRMED")} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded hover:bg-green-100">Onayla</button>
                                        <button onClick={() => updateReservationStatus(r.id, "CANCELLED")} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded hover:bg-red-100">İptal</button>
                                      </>}
                                      {r.status === "CONFIRMED" && <button onClick={() => updateReservationStatus(r.id, "COMPLETED")} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100">Tamamla</button>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Orders */}
                    {premiumSubTab === "orders" && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-4">Siparişler</h4>
                        {premiumOrders.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">Henüz sipariş yok</div>
                        ) : (
                          <div className="space-y-2">
                            {premiumOrders.map((o) => (
                              <div key={o.id} className="p-3 border rounded-lg bg-white">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900">{o.customerName}</div>
                                    <div className="text-xs text-gray-500">📞 {o.customerPhone}</div>
                                    <div className="text-xs text-green-700 font-medium mt-0.5">{o.totalAmount} {o.currency}</div>
                                    {o.note && <div className="text-xs text-gray-400 italic mt-0.5">Not: {o.note}</div>}
                                    <div className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString("tr-TR")}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      o.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                                      o.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                                      o.status === "DELIVERED" ? "bg-blue-100 text-blue-700" :
                                      o.status === "PREPARING" ? "bg-orange-100 text-orange-700" :
                                      "bg-yellow-100 text-yellow-700"
                                    }`}>{o.status}</span>
                                    <div className="flex gap-1">
                                      {o.status === "PENDING" && <>
                                        <button onClick={() => updateOrderStatus(o.id, "CONFIRMED")} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded hover:bg-green-100">Onayla</button>
                                        <button onClick={() => updateOrderStatus(o.id, "CANCELLED")} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded hover:bg-red-100">İptal</button>
                                      </>}
                                      {o.status === "CONFIRMED" && <button onClick={() => updateOrderStatus(o.id, "PREPARING")} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded hover:bg-orange-100">Hazırlanıyor</button>}
                                      {o.status === "PREPARING" && <button onClick={() => updateOrderStatus(o.id, "DELIVERED")} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100">Teslim Et</button>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HARİTA PLATFORMU ── */}
        {tab === "platform" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">🧭 Harita Platform Özellikleri</h3>
                  <p className="text-sm text-gray-500">Sunucu tarafı kayıtlar, kullanıcı harita düzenleme taslakları ve katman kullanılabilirliği.</p>
                </div>
                <Button size="sm" variant="outline" onClick={loadMapPlatform} disabled={platformLoading}>
                  {platformLoading ? "Yükleniyor..." : "Yenile"}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-xs font-bold text-emerald-700">Bekleyen Taslak</p>
                  <p className="text-2xl font-black text-emerald-950">{placeDrafts.filter((x) => x.status === "pending").length}</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                  <p className="text-xs font-bold text-blue-700">Onaylı Taslak</p>
                  <p className="text-2xl font-black text-blue-950">{placeDrafts.filter((x) => x.status === "approved").length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs font-bold text-slate-700">Backend Katman</p>
                  <p className="text-2xl font-black text-slate-950">{mapLayerDefinitions.length}</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <p className="text-xs font-bold text-amber-700">Dış Veri Bekleyen</p>
                  <p className="text-2xl font-black text-amber-950">{mapLayerDefinitions.filter((x) => x.requiresExternalData).length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-lg mb-3">✏️ Kullanıcı Harita Düzenleme Taslakları</h3>
              {placeDrafts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-gray-400">Henüz kullanıcı taslağı yok.</div>
              ) : (
                <div className="space-y-3">
                  {placeDrafts.map((draft) => {
                    const statusClass = draft.status === "approved" ? "bg-green-100 text-green-700" : draft.status === "rejected" ? "bg-red-100 text-red-700" : draft.status === "hidden" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-700";
                    const draftCategoryId = draft.metadata?.categoryId || draft.metadata?.selectedCategory?.id || "";
                    const draftCategoryRaw = draft.metadata?.categoryRawLabel ?? draft.category ?? "";
                    const draftCategoryName = draft.metadata?.categoryName || draft.metadata?.selectedCategory?.name || categories.find((cat) => cat.id === draftCategoryId)?.name || "";
                    return (
                      <div key={draft.id} className="rounded-xl border border-gray-100 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-bold text-gray-900">{draft.name}</p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass}`}>{draft.status}</span>
                              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{draft.type}</span>
                              {draftCategoryRaw && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{draftCategoryRaw}</span>}
                              {draftCategoryName && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">→ {draftCategoryName}</span>}
                            </div>
                            <p className="text-xs text-gray-500">{draft.address || "Adres yok"} · {Number(draft.latitude).toFixed(5)}, {Number(draft.longitude).toFixed(5)}</p>
                            <p className="text-xs text-gray-400 mt-1">Oluşturma: {new Date(draft.createdAt).toLocaleString("tr-TR")}</p>
                            {draft.adminNote && <p className="text-xs text-red-500 mt-1">Not: {draft.adminNote}</p>}
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-2">
                              <Input
                                value={draftCategoryRaw}
                                onChange={(e) => setPlaceDrafts((prev) => prev.map((row) => row.id === draft.id ? {
                                  ...row,
                                  category: e.target.value,
                                  metadata: { ...(row.metadata ?? {}), categoryRawLabel: e.target.value },
                                } : row))}
                                placeholder="Kullanıcının yazdığı kategori"
                                className="h-9 bg-white text-xs"
                              />
                              <select
                                value={draftCategoryId}
                                onChange={(e) => {
                                  const cat = categories.find((item) => item.id === e.target.value);
                                  setPlaceDrafts((prev) => prev.map((row) => row.id === draft.id ? {
                                    ...row,
                                    metadata: {
                                      ...(row.metadata ?? {}),
                                      categoryId: cat?.id || null,
                                      categorySlug: cat?.slug || null,
                                      categoryName: cat?.name || null,
                                      selectedCategory: cat ? { id: cat.id, slug: cat.slug, name: cat.name } : null,
                                    },
                                  } : row));
                                }}
                                className="h-9 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-emerald-400"
                              >
                                <option value="">Kategoriye dönüştürme</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => savePlaceDraftCategory(draft)}
                                className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Kategoriyi kaydet
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button onClick={() => promotePlaceDraft(draft.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">İşletmeye dönüştür</button>
                            <button onClick={() => updatePlaceDraft(draft.id, "approved")} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100">Onayla</button>
                            <button onClick={() => updatePlaceDraft(draft.id, "hidden", prompt("Gizleme notu:") || "")} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200">Gizle</button>
                            <button onClick={() => updatePlaceDraft(draft.id, "rejected", prompt("Red notu:") || "")} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100">Reddet</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-lg mb-3">🗺️ Backend Katman / Özellik Yönetimi</h3>
              <div className="space-y-3">
                {mapLayerDefinitions.map((layer) => (
                  <div key={layer.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900">{layer.icon || "▫️"} {layer.label}</p>
                        <p className="text-xs text-gray-500">{layer.key} · {layer.kind} · {layer.sourceType}{layer.requiresExternalData ? " · dış veri/medya gerekir" : ""}</p>
                        {layer.emptyState && <p className="text-xs text-amber-700 mt-1">{layer.emptyState}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                          <input type="checkbox" checked={layer.isEnabled} onChange={(e) => updateMapLayer(layer, { isEnabled: e.target.checked })} />
                          Aktif
                        </label>
                        <Input
                          className="w-20 h-8 text-xs"
                          type="number"
                          value={layer.sortOrder}
                          onChange={(e) => updateMapLayer(layer, { sortOrder: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PREMIUM BAŞVURULAR ── */}
        {tab === "applications" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">📝 Premium İşletme Başvuruları <span className="text-sm font-normal text-gray-500">({applications.length})</span></h3>
              <Button size="sm" variant="outline" onClick={loadApplications}>Yenile</Button>
            </div>
            {applications.length === 0 && (
              <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p>Henüz başvuru yok.</p>
              </div>
            )}
            <div className="space-y-3">
              {applications.map(app => {
                const statusColor = app.status === "approved" ? "bg-green-100 text-green-700" : app.status === "rejected" ? "bg-red-100 text-red-700" : app.status === "payment_pending" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";
                const statusLabel = app.status === "approved" ? "Onaylandı" : app.status === "rejected" ? "Reddedildi" : app.status === "payment_pending" ? "Ödeme Bekliyor" : "Beklemede";
                return (
                  <div key={app.id} className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-gray-900">{app.businessName}</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{app.paymentMethod === "wire" ? "🏦 Havale" : "💳 Kart"}</span>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{app.planMonths} aylık</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                          <span>👤 {app.ownerName}</span>
                          <span>📧 {app.ownerEmail}</span>
                          <span>📞 {app.ownerPhone}</span>
                          <span>📅 {new Date(app.createdAt).toLocaleDateString("tr-TR")}</span>
                          {app.wireTransferNote && <span className="col-span-2">💬 {app.wireTransferNote}</span>}
                          {app.adminNote && <span className="col-span-2 text-red-500">❗ {app.adminNote}</span>}
                        </div>
                      </div>
                      {app.status === "pending" || app.status === "payment_pending" ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => approveApplication(app.id)}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition"
                          >
                            ✓ Onayla
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt("Red nedeni (isteğe bağlı):");
                              if (note !== null) rejectApplication(app.id, note);
                            }}
                            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition"
                          >
                            ✕ Reddet
                          </button>
                        </div>
                      ) : app.status === "approved" && app.businessId ? (
                        <button
                          onClick={() => { setTab("businesses"); }}
                          className="text-xs text-blue-600 hover:underline shrink-0"
                        >
                          İşletmeyi Gör →
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="max-w-lg">
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-4">Haritalar Sistem Ayarları</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Google Places API Anahtarı (sunucu / Veri Kazıyıcı)</label>
                  <p className="text-xs text-gray-500 mb-1">
                    Bu alan <strong>map_system_settings</strong> tablosuna yazılır; tarayıcıdaki harita için değil. Anahtar zaten Railway{" "}
                    <code className="text-[10px] bg-gray-100 px-1 rounded">GOOGLE_PLACES_API_KEY</code> /{" "}
                    <code className="text-[10px] bg-gray-100 px-1 rounded">GOOGLE_MAPS_API_KEY</code> ile tanımlıysa burası bilerek boş kalır.
                  </p>
                  {settings.googlePlacesEffectiveConfigured ? (
                    <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5 mb-2">
                      Sunucuda geçerli bir Places anahtarı algılandı (bu form veya ortam değişkeni). Güvenlik için kayıtlı değer kutuda gösterilmez.
                    </p>
                  ) : null}
                  <Input
                    type="password"
                    value={settings.googlePlacesApiKey}
                    onChange={(e) => setSettings({ ...settings, googlePlacesApiKey: e.target.value })}
                    placeholder="Yeni anahtar yazın…"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Değiştirmek için yeni anahtarı yazıp aşağıdan kaydedin. Sadece katmanları kaydedecekseniz anahtar alanını boş bırakın.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="autoFetch" checked={settings.automaticGoogleDataFetch}
                    onChange={(e) => setSettings({ ...settings, automaticGoogleDataFetch: e.target.checked })}
                    className="w-4 h-4" />
                  <label htmlFor="autoFetch" className="text-sm font-medium">Otomatik Google Verisi Çekme</label>
                </div>
                <div className={`rounded-lg border p-3 text-sm ${settings.firmsWildfireConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-orange-200 bg-orange-50 text-orange-900"}`}>
                  <p className="font-semibold">NASA FIRMS Orman Yangınları</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    {settings.firmsWildfireConfigured
                      ? "Sunucuda FIRMS MAP_KEY algılandı; Keşfet haritasındaki Yangın katmanı canlı uydu sıcak noktalarını kullanır."
                      : "Canlı Yangın katmanı için API servisinde NASA_FIRMS_MAP_KEY veya FIRMS_MAP_KEY ortam değişkenini tanımlayın."}
                    {" "}Anahtar tarayıcıya gönderilmez ve bu panelde gösterilmez.
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-semibold mb-1">Haritalar Otomatik Çekme Ayarları</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Places içe aktarması ayrı kalır. Keşfet şehir/kategori arka plan dolumu Google Maps Bot ile yapılır, API tüketmez; aynı şehir/kategori varsayılan 90 gün dolmadan tekrar kazınmaz.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <label className="text-xs font-medium text-gray-700">
                      Fotoğraf adedi
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        value={settings.autoImportSettings.photoCount}
                        onChange={(e) => setSettings({
                          ...settings,
                          autoImportSettings: {
                            ...settings.autoImportSettings,
                            photoCount: Math.max(0, Math.min(5, Number(e.target.value) || 0)),
                          },
                        })}
                        className="mt-1"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-700">
                      Yorum adedi
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        value={settings.autoImportSettings.reviewCount}
                        onChange={(e) => setSettings({
                          ...settings,
                          autoImportSettings: {
                            ...settings.autoImportSettings,
                            reviewCount: Math.max(0, Math.min(5, Number(e.target.value) || 0)),
                          },
                        })}
                        className="mt-1"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-700">
                      Yenileme aralığı (gün)
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={settings.autoImportSettings.refreshIntervalDays}
                        onChange={(e) => setSettings({
                          ...settings,
                          autoImportSettings: {
                            ...settings.autoImportSettings,
                            refreshIntervalDays: Math.max(1, Math.min(365, Number(e.target.value) || 90)),
                          },
                        })}
                        className="mt-1"
                      />
                    </label>
                  </div>
                  <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <input
                        type="checkbox"
                        checked={settings.autoImportSettings.scraperBackfillEnabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          autoImportSettings: {
                            ...settings.autoImportSettings,
                            scraperBackfillEnabled: e.target.checked,
                          },
                        })}
                      />
                      Keşfet Google Maps Bot backfill açık
                    </label>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-xs font-medium text-emerald-900">
                        Kategori başına hedef işletme
                        <Input
                          type="number"
                          min={20}
                          max={5000}
                          value={settings.autoImportSettings.scraperBackfillTargetPerCategory}
                          onChange={(e) => setSettings({
                            ...settings,
                            autoImportSettings: {
                              ...settings.autoImportSettings,
                              scraperBackfillTargetPerCategory: Math.max(20, Math.min(5000, Number(e.target.value) || 1000)),
                            },
                          })}
                          className="mt-1 bg-white"
                        />
                      </label>
                      <label className="text-xs font-medium text-emerald-900">
                        Tarama yarıçapı (km)
                        <Input
                          type="number"
                          min={10}
                          max={50}
                          value={Math.round((settings.autoImportSettings.scraperBackfillRadiusMeters ?? 20000) / 1000)}
                          onChange={(e) => setSettings({
                            ...settings,
                            autoImportSettings: {
                              ...settings.autoImportSettings,
                              scraperBackfillRadiusMeters: Math.max(10, Math.min(50, Number(e.target.value) || 20)) * 1000,
                            },
                          })}
                          className="mt-1 bg-white"
                        />
                      </label>
                      <div className="rounded-md bg-white p-2 text-[11px] leading-relaxed text-emerald-800 border border-emerald-100">
                        Kapsam: Türkiye 81 il, KKTC ve Azerbaycan şehirleri, üst Keşfet kategorileri. Varsayılan hedef 1000 geçerli özel işletme ve 20 km yarıçaptır.
                      </div>
                    </div>
                  </div>
                  <div className="mb-3 rounded-lg border border-emerald-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-bold text-emerald-900">Gece Otomatik Kazıma Botu</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => refreshNightScraper()} disabled={nightScraperBusy}>
                        Yenile
                      </Button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-emerald-800 mb-2">
                      {nightScraper?.allDay
                        ? "7/24 sürekli (durmadan) çalışır"
                        : `Her gece ${nightScraper?.window?.label ?? "00:00–09:00"} (Türkiye saati) arasında çalışır`}
                      ; tüm şehir × kategori çiftlerini sırayla dolaşıp Google Maps'ten derin kazıma (yorum, fotoğraf, telefon, web, çalışma saati)
                      yapar ve siteye ekler. Google Places API kullanılmaz. Kaldığı yerden devam eder.
                    </p>
                    {nightScraper ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <div className="font-semibold">Durum</div>
                          <div>
                            {nightScraper.enabledOverride === false
                              ? "Kapalı (override)"
                              : nightScraper.running
                                ? "Çalışıyor — kazıyor"
                                : nightScraper.withinWindow || nightScraper.forcingUntil
                                  ? nightScraper.workerRunning
                                    ? "Aktif — kazıyor"
                                    : nightScraper.haritalarWake?.active
                                      ? "Haritalar uyandırması (aktif)"
                                      : nightScraper.allDay
                                        ? "Aktif (7/24)"
                                        : "Aktif — bekliyor"
                                  : "Boşta (pencere dışı)"}
                          </div>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <div className="font-semibold">TR saati</div>
                          <div>{nightScraper.turkeyTime}</div>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <div className="font-semibold">İlerleme</div>
                          <div>%{nightScraper.progressPercent} ({nightScraper.cursor}/{nightScraper.totalPairs})</div>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <div className="font-semibold">Tamamlanan tur</div>
                          <div>{nightScraper.cyclesCompleted}</div>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <div className="font-semibold">Kuyruk</div>
                          <div>{nightScraper.queueDepth} iş</div>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900 col-span-2">
                          <div className="font-semibold">Son eklenen</div>
                          <div>{nightScraper.lastPair ? `${nightScraper.lastPair.city} · ${nightScraper.lastPair.category}` : "—"}</div>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <div className="font-semibold">Son tick</div>
                          <div>{nightScraper.lastTickAt ? new Date(nightScraper.lastTickAt).toLocaleString("tr-TR") : "—"}</div>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <div className="font-semibold">Atlanma nedeni</div>
                          <div>{nightScraper.lastSkipReason ?? "—"}</div>
                        </div>
                        {nightScraper.haritalarWake?.lastAt ? (
                          <div className="rounded-md bg-sky-50 p-2 text-[11px] text-sky-900 col-span-2 border border-sky-200">
                            <div className="font-semibold">Haritalar uyandırması</div>
                            <div>
                              Son: {new Date(nightScraper.haritalarWake.lastAt).toLocaleString("tr-TR")}
                              {nightScraper.haritalarWake.active && nightScraper.haritalarWake.activeUntil
                                ? ` · Aktif: ${new Date(nightScraper.haritalarWake.activeUntil).toLocaleString("tr-TR")}'e kadar`
                                : ""}
                            </div>
                          </div>
                        ) : null}
                        {nightScraper.forcingUntil && nightScraper.forceSource === "admin" ? (
                          <div className="rounded-md bg-violet-50 p-2 text-[11px] text-violet-900 col-span-2 border border-violet-200">
                            <div className="font-semibold">Admin zorla çalıştırma</div>
                            <div>{new Date(nightScraper.forcingUntil).toLocaleString("tr-TR")}'e kadar</div>
                          </div>
                        ) : null}
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900 col-span-2">
                          <div className="font-semibold">Chromium</div>
                          <div>
                            {nightScraper.chromium?.ok === true
                              ? `OK — ${nightScraper.chromium.path ?? "?"}`
                              : nightScraper.chromium?.ok === false
                                ? `HATA — ${nightScraper.chromium.lastProbeError ?? nightScraper.backfillLastError ?? "Chromium açılamadı"}`
                                : "Doğrulanıyor…"}
                          </div>
                        </div>
                        {(nightScraper.backfillLastError || (nightScraper.backfillLastImported ?? 0) > 0) ? (
                          <div className="rounded-md bg-amber-50 p-2 text-[11px] text-amber-900 col-span-2 border border-amber-200">
                            <div className="font-semibold">Son iş sonucu</div>
                            <div>
                              {nightScraper.backfillLastImported ? `${nightScraper.backfillLastImported} içe aktarım` : ""}
                              {nightScraper.backfillLastRunAt ? ` · ${new Date(nightScraper.backfillLastRunAt).toLocaleString("tr-TR")}` : ""}
                              {nightScraper.backfillLastError ? ` · Hata: ${nightScraper.backfillLastError}` : ""}
                            </div>
                          </div>
                        ) : null}
                        <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <div className="font-semibold">Kapsam</div>
                          <div>{nightScraper.cityCount} şehir × {nightScraper.categoryCount} kategori</div>
                        </div>
                        {nightScraper.dbStats ? (
                          <div className="rounded-md bg-blue-50 p-2 text-[11px] text-blue-900 col-span-2 border border-blue-200">
                            <div className="font-semibold">Bugün gece (00:00 TR sonrası) map_businesses</div>
                            <div>
                              {nightScraper.dbStats.gmapsScrapeCreatedSinceMidnight} yeni kayıt ·{" "}
                              {nightScraper.dbStats.gmapsScrapeScrapedSinceMidnight} kazındı · toplam gmaps:{" "}
                              {nightScraper.dbStats.gmapsScrapeTotal}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 mb-3">Durum yükleniyor…</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => controlNightScraper("run-now", { minutes: 120 })} disabled={nightScraperBusy}>
                        Şimdi çalıştır (2 saat)
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => controlNightScraper("enable")} disabled={nightScraperBusy}>
                        Botu aç
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => controlNightScraper("disable")} disabled={nightScraperBusy}>
                        Botu kapat
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => controlNightScraper("auto")} disabled={nightScraperBusy}>
                        Otomatiğe al
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => controlNightScraper("reset-cursor")} disabled={nightScraperBusy}>
                        İmleci sıfırla
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      ["fetchAddress", "Adres"],
                      ["fetchPhone", "Telefon"],
                      ["fetchWebsite", "Web sitesi"],
                      ["fetchRating", "Puan / değerlendirme"],
                      ["fetchCoordinates", "Konum / koordinat"],
                      ["fetchPhoto", "Fotoğraf"],
                      ["fetchReview", "Yorum"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={Boolean(settings.autoImportSettings[key as keyof MapAutoImportSettings])}
                          onChange={(e) => setSettings({
                            ...settings,
                            autoImportSettings: {
                              ...settings.autoImportSettings,
                              [key]: e.target.checked,
                            },
                          })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-semibold mb-2">Katman Varsayılan Opaklığı</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={15}
                      max={100}
                      value={Math.round(settings.layerDefaultOpacity * 100)}
                      onChange={(e) => setSettings({ ...settings, layerDefaultOpacity: Math.max(0.15, Math.min(1, Number(e.target.value) / 100)) })}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right">%{Math.round(settings.layerDefaultOpacity * 100)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    id="forceAdminLayerConfig"
                    checked={settings.forceAdminLayerConfig}
                    onChange={(e) => setSettings({ ...settings, forceAdminLayerConfig: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="forceAdminLayerConfig" className="text-sm font-medium">
                    Admin katman ayarlarını zorla (kullanıcı local tercihlerini yok say)
                  </label>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-semibold mb-2">Taban Katmanlar (Açık / Sıra)</p>
                  <div className="space-y-1.5">
                    {baseLayerRows.map((row) => (
                      <div key={row.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                        <label className="text-sm flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => setBaseLayerRows((prev) => prev.map((x) => x.id === row.id ? { ...x, enabled: e.target.checked } : x))}
                          />
                          {row.label}
                        </label>
                        <span className="text-xs text-gray-500">Sıra</span>
                        <Input
                          type="number"
                          value={row.sortOrder}
                          onChange={(e) => setBaseLayerRows((prev) => prev.map((x) => x.id === row.id ? { ...x, sortOrder: Number(e.target.value) || 0 } : x))}
                          className="w-20 h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-semibold mb-2">Gelişmiş Katmanlar (WMS/WMTS)</p>
                  <div className="space-y-1.5">
                    {advancedLayerRows.map((row) => (
                      <div key={row.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                        <label className="text-sm flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => setAdvancedLayerRows((prev) => prev.map((x) => x.id === row.id ? { ...x, enabled: e.target.checked } : x))}
                          />
                          {row.label}
                        </label>
                        <span className="text-xs text-gray-500">Sıra</span>
                        <Input
                          type="number"
                          value={row.sortOrder}
                          onChange={(e) => setAdvancedLayerRows((prev) => prev.map((x) => x.id === row.id ? { ...x, sortOrder: Number(e.target.value) || 0 } : x))}
                          className="w-20 h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-semibold mb-2">Overlay Katmanları (Deprem / Hava / vb.)</p>
                  <div className="space-y-1.5">
                    {overlayRows.map((row) => (
                      <div key={row.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                        <label className="text-sm flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => setOverlayRows((prev) => prev.map((x) => x.id === row.id ? { ...x, enabled: e.target.checked } : x))}
                          />
                          {row.label}
                        </label>
                        <span className="text-xs text-gray-500">Sıra</span>
                        <Input
                          type="number"
                          value={row.sortOrder}
                          onChange={(e) => setOverlayRows((prev) => prev.map((x) => x.id === row.id ? { ...x, sortOrder: Number(e.target.value) || 0 } : x))}
                          className="w-20 h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <strong>Mobil giriş (Firebase Auth):</strong> Eski proje bağlantısı kaldırıldı. Yeni Firebase projesi için sunucuda
                  Admin SDK ortam değişkenlerini tanımladığınızda <code>/api/map/users/login</code> tekrar aktif olur.
                  Ayrıntılar için <code>artifacts/api-server/.env.example</code> dosyasına bakın.
                </div>
                <Button onClick={saveSettings} className="w-full">Kaydet</Button>
              </div>
            </div>
          </div>
        )}

        {/* ── İÇE / DIŞA AKTAR ── */}
        {tab === "importexport" && (
          <div className="space-y-6 max-w-4xl">

            {/* Export */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">📤 Dışa Aktar</h2>
              <p className="text-sm text-gray-500 mb-4">Tüm işletmeleri CSV veya JSON olarak indirin.</p>
              <div className="flex gap-3 flex-wrap">
                <a href="/api/map/businesses/export?format=csv" download className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                  📊 CSV olarak İndir
                </a>
                <a href="/api/map/businesses/export?format=json" download className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                  📋 JSON olarak İndir
                </a>
              </div>
            </div>

            {/* Import */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">📥 İçe Aktar (JSON)</h2>
              <p className="text-sm text-gray-500 mb-4">
                JSON dizisi yapıştırın. Gerekli alan: <code className="bg-gray-100 px-1 rounded">name</code>. Opsiyonel: <code className="bg-gray-100 px-1 rounded">address, phone, website, latitude, longitude, rating, tags, googlePlaceId, ...</code>
              </p>
              <div className="mb-3 flex items-center gap-2">
                <input type="checkbox" id="overwrite" checked={importOverwrite} onChange={e => setImportOverwrite(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="overwrite" className="text-sm text-gray-700">Mevcut işletmelerin üzerine yaz (googlePlaceId eşleşiyor ise)</label>
              </div>
              <Textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={`[\n  { "name": "Cafe Örnek", "address": "Ankara", "phone": "0555 000 0000" }\n]`}
                rows={10}
                className="font-mono text-xs mb-3"
              />
              {importResult && (
                <div className={`mb-3 p-3 rounded-xl text-sm font-medium ${importResult.startsWith("✓") ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  {importResult}
                </div>
              )}
              <Button
                onClick={async () => {
                  if (!importText.trim()) return;
                  setImportLoading(true); setImportResult(null);
                  try {
                    const data = JSON.parse(importText);
                    const res = await apiFetch(apiUrl("/api/map/businesses/import"), {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ data, overwrite: importOverwrite }),
                    });
                    const d = await res.json();
                    if (d.success) setImportResult(`✓ ${d.message}`);
                    else setImportResult(`✗ ${d.error || "Hata"}`);
                  } catch (e) {
                    setImportResult(`✗ JSON parse hatası: ${String(e)}`);
                  } finally { setImportLoading(false); }
                }}
                disabled={importLoading || !importText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {importLoading ? "İşleniyor..." : "📥 İçe Aktarmayı Başlat"}
              </Button>
            </div>

            {/* Slug generator */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">🔗 Slug Yönetimi</h2>
              <p className="text-sm text-gray-500 mb-4">Slug'ı olmayan işletmeler için otomatik slug oluşturur. İşletme adından Türkçe karakterler dönüştürülerek üretilir.</p>
              {slugGenResult && (
                <div className="mb-3 p-3 rounded-xl text-sm font-medium bg-green-50 text-green-800 border border-green-200">{slugGenResult}</div>
              )}
              <Button
                onClick={async () => {
                  const res = await apiFetch(apiUrl("/api/map/businesses/generate-slugs"), { method: "POST" });
                  const d = await res.json();
                  setSlugGenResult(d.success ? `✓ ${d.message}` : `✗ ${d.error}`);
                }}
                variant="outline" className="mr-3"
              >
                🔗 Eksik Slugları Oluştur
              </Button>
              <span className="text-xs text-gray-400">Son çalıştırma: slug olmayan işletmeleri günceller, mevcut slugları değiştirmez.</span>
            </div>
          </div>
        )}
      </div>

      {/* Premium Upgrade Modal */}
      {premiumModalBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setPremiumModalBiz(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4 text-white">
              <p className="text-xs font-medium opacity-80 mb-0.5">Premium Abonelik</p>
              <p className="font-bold text-lg truncate">{premiumModalBiz.name}</p>
              {premiumModalBiz.premiumExpiresAt && (
                <p className="text-xs opacity-80 mt-0.5">
                  Mevcut bitiş: {new Date(premiumModalBiz.premiumExpiresAt).toLocaleDateString("tr-TR")}
                  {" · "}
                  {(() => {
                    const days = subDaysLeft(premiumModalBiz.premiumExpiresAt);
                    if (days === null) return "Süresiz";
                    if (days <= 0) return "Süresi doldu";
                    return `${days} gün kaldı`;
                  })()}
                </p>
              )}
            </div>
            <div className="p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Haritada ana başlık (üst kategori)</label>
              <p className="text-xs text-gray-500 mb-2">Keşfet ve anasayfa şeritleri bu alana göre filtrelenir. Ayrıntılı türü işletme formunda «Mağaza türü»nden seçin.</p>
              <select
                value={premiumModalSuperCat}
                onChange={(e) => setPremiumModalSuperCat(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm mb-4 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="mekan_dukkan">🏪 Mekan & Dükkan</option>
                <option value="firma_rehberi">📒 Sarı Sayfalar / Firma Rehberi</option>
                <option value="alisveris">🛒 Alışveriş</option>
                <option value="turizm">✈️ Turizm</option>
                <option value="seyahat">🧳 Seyahat</option>
                <option value="ulasim">🚌 Ulaşım</option>
                <option value="yiyecek">🍽️ Yiyecek & İçecek (eski)</option>
                <option value="hizmet">🔧 Hizmet (eski)</option>
                <option value="siparis">🛵 Sipariş (eski)</option>
                <option value="mekan">🏛️ Mekan (eski)</option>
              </select>
              <p className="text-sm font-semibold text-gray-700 mb-3">Abonelik süresi seçin:</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { months: 1, label: "1 Ay", price: "₺299" },
                  { months: 6, label: "6 Ay", price: "₺1.499" },
                  { months: 12, label: "12 Ay", price: "₺2.499" },
                ].map(plan => (
                  <button key={plan.months} onClick={() => setPremiumModalMonths(plan.months)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      premiumModalMonths === plan.months
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                    }`}>
                    <span className="font-bold text-sm">{plan.label}</span>
                    <span className="text-xs opacity-70">{plan.price}</span>
                    {plan.months === 6 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">%16 indirim</span>}
                    {plan.months === 12 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">%30 indirim</span>}
                  </button>
                ))}
              </div>
              {/* Calculated expiry preview */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
                <span className="font-medium">Bitiş tarihi: </span>
                {(() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + premiumModalMonths);
                  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
                })()}
              </div>
              <button
                disabled={premiumModalSaving}
                onClick={() => setPremiumWithDuration(premiumModalBiz.id, premiumModalMonths)}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60 transition hover:brightness-105"
                style={{ background: "linear-gradient(135deg, #d97706, #ea580c)" }}>
                {premiumModalSaving ? "Kaydediliyor..." : `⭐ ${premiumModalMonths} Aylık Premium Yap`}
              </button>
              <button onClick={() => setPremiumModalBiz(null)}
                className="w-full mt-2 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Lat/Lng Picker Modal ── */}
      {showLatLngPicker && (
        <LatLngPickerModal
          mapsSettings={mapsGeocodeSettings}
          initial={
            bizForm.latitude && bizForm.longitude
              ? { lat: bizForm.latitude, lng: bizForm.longitude }
              : null
          }
          onSelect={(lat, lng) => {
            setBizForm({ ...bizForm, latitude: lat, longitude: lng });
            setShowLatLngPicker(false);
          }}
          onClose={() => setShowLatLngPicker(false)}
        />
      )}

      {/* ── Credentials Modal ── */}
      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setCredModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">🔑</div>
              <div>
                <div className="font-bold text-gray-900">Giriş Bilgileri</div>
                <div className="text-xs text-gray-500">{credModal.displayName}</div>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">Kullanıcı Adı (E-posta)</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-gray-900 break-all">{credModal.email}</code>
                  <button onClick={() => { navigator.clipboard.writeText(credModal.email); flash("success", "E-posta kopyalandı"); }}
                    className="shrink-0 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-100 transition">📋</button>
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <div className="text-xs font-medium text-amber-700 mb-1">Şifre</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-amber-900 tracking-wider">{credModal.password}</code>
                  <button onClick={() => { navigator.clipboard.writeText(credModal.password); flash("success", "Şifre kopyalandı"); }}
                    className="shrink-0 text-xs bg-white border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-100 transition">📋</button>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 mb-5">
              <div className="text-xs text-blue-700 font-medium mb-1">İşletme Giriş Sayfası</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-blue-800">turk.eco/isletme-giris</code>
                <button onClick={() => { navigator.clipboard.writeText("https://turk.eco/isletme-giris"); flash("success", "Link kopyalandı"); }}
                  className="shrink-0 text-xs bg-white border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-100 transition">📋</button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">Bu bilgileri işletme sahibiyle paylaşın. Tekrar "🔑 Giriş Bilgileri Üret" butonuna basılırsa şifre sıfırlanır.</p>
            <button onClick={() => setCredModal(null)}
              className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition">
              Kapat
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
