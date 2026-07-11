import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ChevronRight, Clock, LocateFixed, MapPin, Search, ShoppingBag, Star, UtensilsCrossed } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import {
  KesfetHeroLocationField,
  resolveLocationFromBrowser,
  type KesfetHeroLocationFieldHandle,
} from "@/components/kesfet-listinghub/KesfetHeroLocationField";
import { SERVICE_MODULE_CARD_PLAIN_CLASS } from "@/components/ServiceModuleCard";
import { DELIVERY_MODULES, type DeliveryBusinessModule } from "@/lib/deliveryModuleGroups";
import { effectiveMapsGeocodeSettings, forwardGeocodeAddressHybrid } from "@/lib/mapsGeocode";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import {
  formatPublicLocationLabel,
  PUBLIC_LOCATION_UPDATED_EVENT,
  readPublicLocation,
  type PublicLocationState,
} from "@/lib/publicLocation";
import {
  buildKonumaGoreHref,
  classifyMapBusinessModule,
  distanceKm,
  formatKonumaGoreDistance,
  isOrderableMapBusiness,
  mapBusinessLocationLine,
  normalizeKonumaGoreSearchParams,
  parseKonumaGoreModule,
  resolveKonumaGoreStoreHref,
  shouldRequireKonumaGoreCityScope,
  type KonumaGoreBusiness,
  type KonumaGoreLocation,
} from "@/lib/konumaGoreUtils";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import {
  SADE_HERO_EYEBROW_CLASS,
  SADE_PUBLIC_HERO_CONTENT_CLASS,
  SADE_PUBLIC_HERO_STAGE_CLASS,
  SADE_PUBLIC_HERO_SURFACE_CLASS,
  SADE_PUBLIC_PAGE_BG_SIPARIS,
  SADE_PUBLIC_POST_HERO_MAIN_CLASS,
  sadePublicHeroFadeStyle,
} from "@/lib/yekpareSadeTheme";
import "@/styles/sariSayfalar.css";

const API = "/api";
const DEFAULT_RADIUS_M = 50_000;
const FETCH_TIMEOUT_MS = 30_000;

const MODULE_ICONS: Record<DeliveryBusinessModule, typeof UtensilsCrossed> = {
  food: UtensilsCrossed,
  market: ShoppingBag,
  nearby: MapPin,
};

type TrAddressValue = { city: string; district: string; mahalle: string; sokak?: string };

function parseSearchLocation(search: string): Partial<KonumaGoreLocation> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  return normalizeKonumaGoreSearchParams({
    city: String(params.get("city") ?? "").trim(),
    district: String(params.get("district") ?? "").trim(),
    location: String(params.get("location") ?? "").trim(),
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  });
}

async function geocodeAddressLabel(
  mapsSettings: ReturnType<typeof effectiveMapsGeocodeSettings>,
  label: string,
  city: string,
  district: string,
): Promise<{ lat: number; lng: number } | null> {
  const query = [label, district, city, "Türkiye"].filter(Boolean).join(", ");
  if (!query.trim()) return null;
  try {
    const hit = await forwardGeocodeAddressHybrid(mapsSettings, query);
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  } catch {
    /* ignore */
  }
  return null;
}

function BusinessRow({
  biz,
  loc,
}: {
  biz: KonumaGoreBusiness;
  loc: KonumaGoreLocation | null;
}) {
  const href = resolveKonumaGoreStoreHref(biz, loc);
  if (!href) return null;
  const thumb = resolveClientMediaSrc(String(biz.coverPhotoUrl || biz.photoUrl || ""));
  const distanceLabel = formatKonumaGoreDistance(biz.distance);
  const categoryLabel = String(biz.categoryName || biz.category?.name || "").trim();

  const inner = (
    <article className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
        {thumb ? (
          <img src={thumb} alt={biz.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="grid h-full w-full place-items-center text-2xl">🏪</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-black text-slate-950">{biz.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-500">{mapBusinessLocationLine(biz)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
          {biz.rating ? (
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(biz.rating).toFixed(1)}
              {biz.userRatingsTotal ? ` (${Number(biz.userRatingsTotal).toLocaleString("tr-TR")})` : ""}
            </span>
          ) : null}
          {distanceLabel ? (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {distanceLabel}
            </span>
          ) : null}
          {categoryLabel ? <span>{categoryLabel}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white">
          Sipariş ver
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );

  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}

export default function KonumaGore() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { data: siteSettings } = useGetSiteSettings();
  const mapsSettings = useMemo(
    () => effectiveMapsGeocodeSettings(siteSettings),
    [siteSettings?.mapsGoogleBrowserKey, siteSettings?.mapsGoogleEnabled],
  );

  const urlBits = useMemo(() => parseSearchLocation(search), [search]);
  const [activeModule, setActiveModule] = useState<DeliveryBusinessModule>(() =>
    parseKonumaGoreModule(new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("module")),
  );
  const [loc, setLoc] = useState<TrAddressValue>({ city: "", district: "", mahalle: "" });
  const [locDisplay, setLocDisplay] = useState("");
  const [resolvedLoc, setResolvedLoc] = useState<KonumaGoreLocation | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [businesses, setBusinesses] = useState<KonumaGoreBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const locRef = useRef<KesfetHeroLocationFieldHandle>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const resolveSeq = useRef(0);

  const syncUrl = useCallback(
    (nextLoc: KonumaGoreLocation | null, module: DeliveryBusinessModule) => {
      const href = buildKonumaGoreHref({
        city: nextLoc?.city || loc.city,
        district: nextLoc?.district || loc.district,
        location: nextLoc?.location || locDisplay,
        lat: nextLoc?.lat,
        lng: nextLoc?.lng,
        module,
      });
      setLocation(href, { replace: true });
    },
    [loc.city, loc.district, locDisplay, setLocation],
  );

  const resolveCoordinates = useCallback(
    async (input: {
      city: string;
      district: string;
      locationLabel: string;
      lat?: number;
      lng?: number;
    }): Promise<KonumaGoreLocation | null> => {
      let lat = input.lat;
      let lng = input.lng;
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        setGeoBusy(true);
        const geocoded = await geocodeAddressLabel(
          mapsSettings,
          input.locationLabel || input.district || input.city,
          input.city,
          input.district,
        );
        setGeoBusy(false);
        if (!geocoded) return null;
        lat = geocoded.lat;
        lng = geocoded.lng;
      }
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
      return {
        lat: Number(lat),
        lng: Number(lng),
        city: input.city,
        district: input.district,
        location: input.locationLabel || [input.district, input.city].filter(Boolean).join(", "),
      };
    },
    [mapsSettings],
  );

  const fetchBusinesses = useCallback(async (scope: KonumaGoreLocation, module: DeliveryBusinessModule) => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        lat: String(scope.lat),
        lng: String(scope.lng),
        radius: String(DEFAULT_RADIUS_M),
        limit: "200",
      });
      if (scope.city && shouldRequireKonumaGoreCityScope(scope.city)) {
        params.set("city", scope.city);
        params.set("requireCityScope", "1");
      }
      if (scope.district) params.set("district", scope.district);
      if (module === "food") params.set("superCategory", "siparis");

      const { ok, data } = await fetchPublicJson<{ success?: boolean; data?: KonumaGoreBusiness[] }>(
        `${API}/map/businesses?${params.toString()}`,
        { signal: controller.signal, retries: 2 },
      );
      if (controller.signal.aborted) return;

      if (!ok || !data?.success) {
        setBusinesses([]);
        setError("İşletme listesi yüklenemedi. Lütfen biraz sonra tekrar deneyin.");
        return;
      }
      const rows = (Array.isArray(data.data) ? data.data : []) as KonumaGoreBusiness[];
      const filtered = rows
        .filter(isOrderableMapBusiness)
        .map((biz) => {
          const blat = Number(biz.latitude);
          const blng = Number(biz.longitude);
          const dist =
            Number.isFinite(blat) && Number.isFinite(blng)
              ? distanceKm(scope.lat, scope.lng, blat, blng)
              : null;
          return { ...biz, distance: dist };
        })
        .filter((biz) => module === "nearby" || classifyMapBusinessModule(biz) === module)
        .sort((a, b) => Number(a.distance ?? 999) - Number(b.distance ?? 999));
      setBusinesses(filtered);
    } catch {
      if (controller.signal.aborted) return;
      setBusinesses([]);
      setError("İşletme listesi yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      window.clearTimeout(timeout);
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const module = parseKonumaGoreModule(new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("module"));
    setActiveModule(module);
  }, [search]);

  useEffect(() => {
    const mySeq = ++resolveSeq.current;
    let cancelled = false;

    void (async () => {
      const publicLoc = readPublicLocation();
      const normalized = normalizeKonumaGoreSearchParams({
        city: urlBits.city || publicLoc?.city || "",
        district: urlBits.district || publicLoc?.district || "",
        location: urlBits.location || formatPublicLocationLabel(publicLoc, "") || "",
        lat: urlBits.lat ?? publicLoc?.lat,
        lng: urlBits.lng ?? publicLoc?.lng,
      });

      setLoc({ city: normalized.city, district: normalized.district, mahalle: "" });
      setLocDisplay(normalized.location || normalized.city || "Konum seçin");

      const scope = await resolveCoordinates({
        city: normalized.city,
        district: normalized.district,
        locationLabel: normalized.location,
        lat: normalized.lat,
        lng: normalized.lng,
      });
      if (cancelled || mySeq !== resolveSeq.current) return;

      setResolvedLoc(scope);
      if (!scope) {
        setBusinesses([]);
        setError(
          normalized.city || normalized.location
            ? "Konum koordinatları çözülemedi."
            : "Sipariş verebileceğiniz işletmeleri görmek için konum seçin.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlBits.city, urlBits.district, urlBits.location, urlBits.lat, urlBits.lng, resolveCoordinates]);

  useEffect(() => {
    if (!resolvedLoc) return;
    void fetchBusinesses(resolvedLoc, activeModule);
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, [activeModule, resolvedLoc, fetchBusinesses]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<PublicLocationState>).detail ?? readPublicLocation();
      if (!detail) return;
      const label = formatPublicLocationLabel(detail, "");
      setLoc({ city: detail.city, district: detail.district, mahalle: "" });
      setLocDisplay(label);
      void resolveCoordinates({
        city: detail.city,
        district: detail.district,
        locationLabel: label,
        lat: detail.lat,
        lng: detail.lng,
      }).then((scope) => {
        if (!scope) return;
        setResolvedLoc(scope);
        syncUrl(scope, activeModule);
      });
    };
    window.addEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
    return () => window.removeEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
  }, [activeModule, resolveCoordinates, syncUrl]);

  const moduleMeta = DELIVERY_MODULES.find((row) => row.key === activeModule) ?? DELIVERY_MODULES[0];

  const applyLocationSearch = async (override?: TrAddressValue) => {
    const nextLoc = override ?? loc;
    const nextLabel =
      override?.district || override?.city
        ? [override.district, override.city].filter(Boolean).join(", ")
        : locDisplay;

    await locRef.current?.commit();
    const scope = await resolveCoordinates({
      city: nextLoc.city,
      district: nextLoc.district,
      locationLabel: nextLabel,
    });
    if (!scope) {
      setError("Konum bulunamadı. Lütfen şehir veya adres seçin.");
      return;
    }
    setResolvedLoc(scope);
    syncUrl(scope, activeModule);
  };

  const useBrowserLocation = async () => {
    setGeoBusy(true);
    setError("");
    try {
      const { loc: browserLoc, label } = await resolveLocationFromBrowser(mapsSettings);
      setLoc({ city: browserLoc.city, district: browserLoc.district, mahalle: browserLoc.mahalle ?? "" });
      setLocDisplay(label);
      await applyLocationSearch(browserLoc);
    } catch {
      setError("Konum izni alınamadı. Lütfen adresi elle girin.");
    } finally {
      setGeoBusy(false);
    }
  };

  const selectModule = (module: DeliveryBusinessModule) => {
    setActiveModule(module);
    syncUrl(resolvedLoc, module);
  };

  return (
    <div className={`ss-hub ss-konumagore min-h-screen ${SADE_PUBLIC_PAGE_BG_SIPARIS}`} data-page="konumagore">
      <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
        <div className={SADE_PUBLIC_HERO_SURFACE_CLASS} style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG_SIPARIS)} />
        <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} ${SADE_PUBLIC_HERO_CONTENT_CLASS}`}>
          <div className="mx-auto max-w-4xl text-center">
            <span className={SADE_HERO_EYEBROW_CLASS}>Konuma göre sipariş</span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {resolvedLoc?.location || locDisplay || "Konumunuzda sipariş verin"}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Yemek, market ve yakınınızdaki sipariş verilebilir işletmeleri tek ekranda keşfedin.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-5xl">
            <form
              className="ss-search-bar ss-konumagore-search"
              onSubmit={(e) => {
                e.preventDefault();
                void applyLocationSearch();
              }}
            >
              <label className="ss-search-field ss-search-field-location flex-1">
                <span className="ss-search-label">Nerede?</span>
                <KesfetHeroLocationField
                  ref={locRef}
                  mapsSettings={mapsSettings}
                  displayValue={locDisplay}
                  onDisplayChange={setLocDisplay}
                  onLocationResolved={(v) => {
                    setLoc({ city: v.city, district: v.district, mahalle: v.mahalle ?? "" });
                    if (v.city && !v.district) setLocDisplay(v.city);
                    else if (v.district || v.city) setLocDisplay([v.district, v.city].filter(Boolean).join(", "));
                  }}
                  onSuggestionSelect={(v) => {
                    void applyLocationSearch(v);
                  }}
                />
              </label>
              <button type="button" className="ss-konumagore-locate" disabled={geoBusy} onClick={() => void useBrowserLocation()}>
                <LocateFixed className="h-4 w-4" />
                <span className="hidden sm:inline">Konumum</span>
              </button>
              <button type="submit" className="ss-search-submit" disabled={geoBusy || loading}>
                <Search className="h-4 w-4" />
                {geoBusy ? "..." : "Bul"}
              </button>
            </form>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {DELIVERY_MODULES.map((module) => {
                const Icon = MODULE_ICONS[module.key];
                const active = activeModule === module.key;
                return (
                  <button
                    key={module.key}
                    type="button"
                    onClick={() => selectModule(module.key)}
                    className={`${SERVICE_MODULE_CARD_PLAIN_CLASS} text-left transition ${active ? "border-[#039D55] ring-2 ring-[#039D55]/20 shadow-md" : "hover:border-emerald-200"}`}
                    aria-pressed={active}
                  >
                    <span
                      className="mb-1.5 grid h-[40px] w-[40px] place-items-center rounded-lg shadow-sm"
                      style={{ backgroundColor: active ? "#039D55" : "#039D5518", color: active ? "#fff" : "#039D55" }}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                    </span>
                    <span className="text-xs font-bold sm:text-sm md:text-[15px]">{module.shortLabel}</span>
                    <span className="mt-0.5 line-clamp-2 text-[10px] text-slate-500 sm:text-[11px] md:text-xs">
                      {module.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className={`mx-auto max-w-5xl px-4 pb-12 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}>
        <section className="ss-panel-card" aria-label="Sipariş verilebilir işletmeler">
          <div className="ss-panel-card-head">
            <div className="ss-panel-card-head-icon" aria-hidden>
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="ss-panel-card-title">
                {moduleMeta.label} — sipariş verilebilir işletmeler
              </h2>
              <p className="ss-panel-card-sub">
                {resolvedLoc
                  ? `${resolvedLoc.location}${!loading && businesses.length ? ` · ${businesses.length.toLocaleString("tr-TR")} işletme` : ""}`
                  : "Konum seçildiğinde yakınınızdaki mağazalar listelenir."}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm font-semibold text-slate-500">
              <Clock className="h-6 w-6 animate-spin text-emerald-600" />
              <span>İşletmeler yükleniyor…</span>
              <span className="text-xs font-medium text-slate-400">Bu birkaç saniye sürebilir</span>
            </div>
          ) : error && businesses.length === 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-8 text-center">
              <p className="text-sm font-bold text-amber-900">{error}</p>
              <p className="mt-2 text-xs font-medium text-amber-800/80">
                Farklı bir konum deneyin, «Konumum» ile GPS kullanın veya modül sekmesini değiştirin.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-800 px-4 py-2 text-xs font-bold text-white hover:bg-amber-900"
                onClick={() => resolvedLoc && void fetchBusinesses(resolvedLoc, activeModule)}
              >
                Tekrar dene
              </button>
            </div>
          ) : businesses.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-bold text-slate-700">Bu konumda sipariş verilebilir işletme bulunamadı.</p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Başka bir il/ilçe seçebilir veya Yakınımdakiler sekmesine geçebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {businesses.map((biz) => (
                <BusinessRow key={biz.id} biz={biz} loc={resolvedLoc} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-500">
          <Link href="/haritalar" className="inline-flex items-center gap-1 text-[#0f766e] hover:underline">
            <MapPin className="h-3.5 w-3.5" />
            Harita görünümü
          </Link>
          <span aria-hidden>·</span>
          <Link href="/kesfet/sarisayfalar" className="text-[#0f766e] hover:underline">
            Sarı Sayfalar
          </Link>
          <span aria-hidden>·</span>
          <Link href={moduleMeta.href} className="text-[#0f766e] hover:underline">
            {moduleMeta.label} vitrini
          </Link>
        </div>
      </main>
    </div>
  );
}
