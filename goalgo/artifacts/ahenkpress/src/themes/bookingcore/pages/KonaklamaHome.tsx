import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { SlidersHorizontal } from "lucide-react";
import { BookingCoreShell } from "../BookingCoreShell";
import { BookingCoreHomeCard } from "../components/BookingCoreHomeCard";
import {
  BookingCoreFilterSidebar,
  DEFAULT_LISTING_FILTERS,
  type ListingFilterState,
} from "../components/BookingCoreFilterSidebar";
import type { TourismListing } from "../hooks/useTourismListings";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { fetchTourismListingsWithMeta } from "../lib/fetchTourismListings";
import {
  listingFiltersFromSearchParams,
  listingFiltersToSearchParams,
  MODULE_RESULT_LABEL,
  type TourismFilterModule,
} from "../lib/listingFilters";
import { BookingCoreListingMap } from "../components/BookingCoreListingMap";
import { BookingCoreHeroSearch } from "../components/BookingCoreHeroSearch";
import { TurizmCategoryPageFooter } from "@/themes/turizm/TurizmCategoryIntro";
import { TurizmCategoryHubHero } from "@/themes/turizm/TurizmCategoryHubHero";
import { YatListingPage } from "@/themes/turizm/components/YatListingPage";
import { TurizmSidebarPromos } from "@/themes/turizm/TurizmSidebarPromos";
import { useTurizmCms } from "@/themes/turizm/useTurizmCms";
import type { TurizmCategorySlug } from "@/themes/turizm/turizmCategoryIntroConfig";
import {
  fetchAffiliateLink,
  fetchHotelPrices,
  defaultHotelCheckIn,
  defaultHotelCheckOut,
  isInternationalPlace,
  resolveHotellookLocationFromPlace,
  travelLocationFromParams,
  travelLocationToParams,
  type HotelPriceResult,
  type TravelPlace,
} from "../lib/travelpayouts";

type Listing = TourismListing & {
  address?: string | null;
  map_business_fallback?: boolean;
  hotellook_fallback?: boolean;
  external_booking?: boolean;
};

type ShellModule = "konaklama" | "yat" | "villa-ev" | "turlar" | "arac";

const TYPE_TO_FILTER_MODULE: Record<string, TourismFilterModule> = {
  hotel: "hotel",
  villa: "villa",
  tour: "tour",
  car: "car",
  boat: "boat",
};

const TYPE_TO_HERO_TAB: Record<string, string> = {
  hotel: "hotel",
  villa: "villa",
  tour: "tour",
  car: "car",
  boat: "boat",
};

function BookingCoreListe({
  type,
  title,
  module,
  categorySlug,
  enableFilters = true,
}: {
  type: string;
  title: string;
  module: ShellModule;
  categorySlug: TurizmCategorySlug;
  enableFilters?: boolean;
}) {
  const filterModule = TYPE_TO_FILTER_MODULE[type] ?? "hotel";
  const [loc, setLoc] = useLocation();
  const initialQs = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
    [loc],
  );
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [city, setCity] = useState(initialQs.get("city") || "");
  const [checkIn, setCheckIn] = useState(
    initialQs.get("checkIn") || initialQs.get("date") || defaultHotelCheckIn(),
  );
  const [checkOut, setCheckOut] = useState(
    initialQs.get("checkOut") || initialQs.get("returnDate") || defaultHotelCheckOut(
      initialQs.get("checkIn") || initialQs.get("date") || defaultHotelCheckIn(),
    ),
  );
  const [guests, setGuests] = useState(initialQs.get("guests") || "2");
  const [loading, setLoading] = useState(true);
  const [hotellookMeta, setHotellookMeta] = useState<{
    source?: string;
    configured?: boolean;
    affiliateUrl?: string | null;
    error?: string | null;
  } | null>(null);
  const [filters, setFilters] = useState<ListingFilterState>(() =>
    enableFilters ? listingFiltersFromSearchParams(initialQs) : DEFAULT_LISTING_FILTERS,
  );
  const [draftFilters, setDraftFilters] = useState<ListingFilterState>(() =>
    enableFilters ? listingFiltersFromSearchParams(initialQs) : DEFAULT_LISTING_FILTERS,
  );
  const [amenityOptions, setAmenityOptions] = useState<string[]>([]);
  const [featureOptions, setFeatureOptions] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(25000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [location, setLocation] = useState<TravelPlace | null>(() => travelLocationFromParams(initialQs));
  const [hotelPrices, setHotelPrices] = useState<HotelPriceResult[]>([]);
  const [hotelPriceCurrency, setHotelPriceCurrency] = useState("TRY");
  const [hotelAffiliateUrl, setHotelAffiliateUrl] = useState<string | null>(null);
  const [verticalAffiliateUrl, setVerticalAffiliateUrl] = useState<string | null>(null);

  const affiliateVertical: "hotel" | "car" | "tour" | "boat" | null =
    type === "hotel" || type === "villa"
      ? "hotel"
      : type === "car"
        ? "car"
        : type === "tour"
          ? "tour"
          : type === "boat"
            ? "boat"
            : null;

  const loadListings = useCallback(async () => {
    setLoading(true);
    let effectiveCheckIn = checkIn || defaultHotelCheckIn();
    let effectiveCheckOut = checkOut || defaultHotelCheckOut(effectiveCheckIn);
    if (effectiveCheckOut <= effectiveCheckIn) {
      effectiveCheckOut = defaultHotelCheckOut(effectiveCheckIn);
    }
    try {
      const result = await fetchTourismListingsWithMeta({
        type,
        city: city || undefined,
        limit: 48,
        filters: enableFilters ? filters : undefined,
        iata: location?.code ?? undefined,
        cc: location?.countryCode ?? undefined,
        locType: location?.type,
        loc: location?.name ?? undefined,
        checkIn: effectiveCheckIn,
        checkOut: effectiveCheckOut,
      });
      setListings(result.listings as Listing[]);
      setTotal(result.total || result.listings.length);
      setHotellookMeta(result.hotellookMeta ?? null);
      if (result.filterMeta?.amenities?.length) {
        setAmenityOptions(result.filterMeta.amenities);
      }
      if (result.filterMeta?.features?.length) {
        setFeatureOptions(result.filterMeta.features);
      }
      if (result.filterMeta?.priceMax) {
        setPriceMax(result.filterMeta.priceMax);
      }
    } catch {
      setListings([]);
      setTotal(0);
      setHotellookMeta(null);
    } finally {
      setLoading(false);
    }
  }, [type, city, filters, enableFilters, location, checkIn, checkOut]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Seçilen lokasyona göre Travelpayouts: otel → Hotellook fiyatları, araç/tur → affiliate CTA.
  useEffect(() => {
    let cancelled = false;
    if (!affiliateVertical) {
      setHotelPrices([]);
      setHotelAffiliateUrl(null);
      setVerticalAffiliateUrl(null);
      return;
    }
    const locationName = location ? location.cityName || location.name : city || "";
    const hotellookLocation = resolveHotellookLocationFromPlace(location, city || locationName);
    if (affiliateVertical === "hotel") {
      setVerticalAffiliateUrl(null);
      if (!locationName && !hotellookLocation) {
        setHotelPrices([]);
        setHotelAffiliateUrl(null);
        return;
      }
      void fetchHotelPrices({
        location: hotellookLocation || locationName,
        checkIn: checkIn || defaultHotelCheckIn(),
        checkOut: checkOut || defaultHotelCheckOut(checkIn || defaultHotelCheckIn()),
        propertyType: type === "villa" ? "apartment" : undefined,
      })
        .then((res) => {
          if (cancelled) return;
          setHotelPrices(res?.hotels ?? []);
          setHotelPriceCurrency(res?.currency || "TRY");
          setHotelAffiliateUrl(res?.affiliateUrl ?? null);
        })
        .catch(() => {
          if (!cancelled) {
            setHotelPrices([]);
            setHotelAffiliateUrl(null);
          }
        });
    } else {
      setHotelPrices([]);
      setHotelAffiliateUrl(null);
      void fetchAffiliateLink(affiliateVertical, {
        location: locationName || undefined,
        query: locationName || undefined,
      })
        .then((res) => {
          if (!cancelled) setVerticalAffiliateUrl(res?.affiliateUrl ?? null);
        })
        .catch(() => {
          if (!cancelled) setVerticalAffiliateUrl(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [affiliateVertical, location, city, checkIn, checkOut]);

  function syncUrl(nextCity: string, nextFilters: ListingFilterState, nextLoc: TravelPlace | null = location) {
    const base = new URLSearchParams();
    if (nextCity) base.set("city", nextCity);
    if (checkIn) base.set("checkIn", checkIn);
    if (checkOut) base.set("checkOut", checkOut);
    if (guests) base.set("guests", guests);
    travelLocationToParams(nextLoc, base);
    const q = enableFilters ? listingFiltersToSearchParams(nextFilters, base, priceMax) : base;
    const suffix = q.toString() ? `?${q.toString()}` : "";
    const path = loc.split("?")[0] ?? loc;
    setLoc(`${path}${suffix}`, { replace: true });
  }

  function normalizeAppliedFilters(next: ListingFilterState): ListingFilterState {
    return {
      ...next,
      priceMin: next.priceMin && next.priceMin !== "0" ? next.priceMin : "",
      priceMax: next.priceMax && next.priceMax !== String(priceMax) ? next.priceMax : "",
    };
  }

  function applyFilters() {
    const applied = normalizeAppliedFilters(draftFilters);
    setDraftFilters(applied);
    setFilters(applied);
    syncUrl(city, applied);
    setMobileFiltersOpen(false);
  }

  function resetFilters() {
    const next = { ...DEFAULT_LISTING_FILTERS };
    setDraftFilters(next);
    setFilters(next);
    syncUrl(city, next);
    setMobileFiltersOpen(false);
  }

  function handleIntroCardFilter(patch: Partial<ListingFilterState>) {
    const next = normalizeAppliedFilters({ ...DEFAULT_LISTING_FILTERS, ...patch });
    setDraftFilters(next);
    setFilters(next);
    syncUrl(city, next);
  }

  const resultLabel = loading
    ? "Yükleniyor…"
    : `${total.toLocaleString("tr-TR")} ${MODULE_RESULT_LABEL[filterModule]}`;

  const locationName = location ? location.cityName || location.name : city || "";
  const isInternational = isInternationalPlace(location);
  const hotellookAffiliateUrl = hotellookMeta?.affiliateUrl || hotelAffiliateUrl;
  const { cms } = useTurizmCms(categorySlug);

  return (
    <BookingCoreShell module={module}>
      <div className={`bc-hub bc-hub--listing bc-hub--${categorySlug}`}>
        <TurizmCategoryHubHero
          slug={categorySlug}
          search={<BookingCoreHeroSearch defaultTab={TYPE_TO_HERO_TAB[type] ?? "hotel"} />}
          onCardFilter={handleIntroCardFilter}
          listingsAnchorId="bc-listings"
          blogTitle={null}
        />

      {affiliateVertical === "hotel" && !isInternational && hotelPrices.length > 0 ? (
        <div className="bc-hl-strip">
          <div className="bc-hl-strip__head">
            <h3>
              {locationName} için {type === "villa" ? "tatil evi & konaklama" : "Hotellook"} fiyatları
            </h3>
            {hotelAffiliateUrl ? (
              <a href={hotelAffiliateUrl} target="_blank" rel="noopener noreferrer sponsored" className="bc-hl-strip__all">
                Tümünü gör →
              </a>
            ) : null}
          </div>
          <div className="bc-hl-strip__grid">
            {hotelPrices.slice(0, 8).map((h, i) => (
              <a
                key={`${h.hotelName}-${i}`}
                href={hotelAffiliateUrl || "#"}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="bc-hl-card"
              >
                <strong className="bc-hl-card__name">{h.hotelName}</strong>
                {h.stars ? <span className="bc-hl-card__stars">{"★".repeat(Math.min(5, Math.round(h.stars)))}</span> : null}
                {h.priceFrom && h.priceFrom > 0 ? (
                  <span className="bc-hl-card__price">
                    itibaren {Math.round(h.priceFrom).toLocaleString("tr-TR")} {hotelPriceCurrency}
                  </span>
                ) : (
                  <span className="bc-hl-card__price bc-hl-card__price--enq">Fiyat için bilgi alın</span>
                )}
              </a>
            ))}
          </div>
          <p className="bc-hl-strip__note">Fiyatlar Hotellook iş ortağından gelir; rezervasyon partner sitesinde tamamlanır.</p>
        </div>
      ) : null}

      {affiliateVertical && affiliateVertical !== "hotel" && verticalAffiliateUrl && locationName ? (
        <div className="bc-aff-cta">
          <p>
            <strong>{locationName}</strong> için tüm seçenekleri iş ortağı sitesinde fiyatlarıyla görüntüleyin.
          </p>
          <a href={verticalAffiliateUrl} target="_blank" rel="noopener noreferrer sponsored" className="bc-search-btn">
            Müsaitlik &amp; fiyatları gör
          </a>
        </div>
      ) : null}

      <div className="bc-list-wrap" id="bc-listings">
        {enableFilters ? (
          <div className="bc-list-toolbar">
            <p className="bc-result-count">{resultLabel}</p>
            <div className="bc-list-toolbar__actions">
              <div className="bc-view-toggle" role="group" aria-label="Görünüm">
                <button
                  type="button"
                  className={viewMode === "list" ? "is-active" : ""}
                  onClick={() => setViewMode("list")}
                >
                  Liste
                </button>
                <button
                  type="button"
                  className={viewMode === "map" ? "is-active" : ""}
                  onClick={() => setViewMode("map")}
                  title="İşletmeleri harita üzerinde göster"
                >
                  Harita
                </button>
              </div>
              <button
                type="button"
                className="bc-filter-mobile-btn"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtreler
              </button>
            </div>
          </div>
        ) : (
          <p className="bc-result-count">{resultLabel}</p>
        )}

        <div className={`bc-list-layout${enableFilters ? " bc-list-layout--filtered" : ""}`}>
          {enableFilters ? (
            <>
              <div className="bc-filter-sidebar-desktop">
                <BookingCoreFilterSidebar
                  moduleType={filterModule}
                  filters={filters}
                  draft={draftFilters}
                  onDraftChange={(next) => setDraftFilters((prev) => ({ ...prev, ...next }))}
                  onApply={applyFilters}
                  onReset={resetFilters}
                  amenityOptions={amenityOptions}
                  featureOptions={featureOptions}
                  priceMax={priceMax}
                />
                <TurizmSidebarPromos
                  cards={cms.sidebarCards}
                  onCardFilter={handleIntroCardFilter}
                />
              </div>
              <BookingCoreFilterSidebar
                moduleType={filterModule}
                filters={filters}
                draft={draftFilters}
                onDraftChange={(next) => setDraftFilters((prev) => ({ ...prev, ...next }))}
                onApply={applyFilters}
                onReset={resetFilters}
                amenityOptions={amenityOptions}
                featureOptions={featureOptions}
                priceMax={priceMax}
                mobileOpen={mobileFiltersOpen}
                onMobileClose={() => setMobileFiltersOpen(false)}
              />
            </>
          ) : null}

          <div className="bc-list-main">
            {viewMode === "map" && enableFilters ? (
              loading ? (
                <div className="bc-empty">
                  <p>Harita yükleniyor…</p>
                </div>
              ) : listings.length === 0 ? (
                <div className="bc-empty">
                  <p>Haritada gösterilecek işletme bulunamadı.</p>
                  <button type="button" className="bc-search-btn" onClick={() => setViewMode("list")}>
                    Listeye dön
                  </button>
                </div>
              ) : (
                <BookingCoreListingMap listings={listings} />
              )
            ) : loading ? (
              <div className="bc-card-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bc-skeleton" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="bc-empty">
                {hotellookMeta?.error ? (
                  <p>{hotellookMeta.error}</p>
                ) : isInternational && locationName ? (
                  <p>
                    <strong>{locationName}</strong> için yerel otel kaydı bulunamadı. Hotellook üzerinden fiyatları
                    karşılaştırabilirsiniz.
                  </p>
                ) : (
                  <p>Filtrelere uygun ilan bulunamadı.</p>
                )}
                {hotellookAffiliateUrl ? (
                  <a
                    href={hotellookAffiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="bc-search-btn"
                  >
                    Hotellook&apos;da ara
                  </a>
                ) : null}
                {enableFilters ? (
                  <button type="button" className="bc-search-btn" onClick={resetFilters}>
                    Filtreleri sıfırla
                  </button>
                ) : null}
                <Link href={TURIZM.hub}>Seyahat ana sayfaya dön</Link>
              </div>
            ) : (
              <div className="bc-card-grid">
                {listings.map((l) => (
                  <BookingCoreHomeCard key={`${l.id}-${l.slug}`} listing={l} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <TurizmCategoryPageFooter title={title} description={cms.pageDescription} />
      </div>
    </BookingCoreShell>
  );
}

export default function KonaklamaHome() {
  return (
    <BookingCoreListe type="hotel" module="konaklama" title="Otel" categorySlug="konaklama" />
  );
}

export function VillaEvHome() {
  return (
    <BookingCoreListe type="villa" module="villa-ev" title="Villa & Ev Kiralama" categorySlug="villa-ev" />
  );
}

export function YatTurlariHome() {
  return <YatListingPage />;
}

export function TurlarHome() {
  return (
    <BookingCoreListe type="tour" module="turlar" title="Turlar" categorySlug="turlar" />
  );
}

export function AracKiralamaHome() {
  return (
    <BookingCoreListe type="car" module="arac" title="Araç Kiralama" categorySlug="arac" />
  );
}

export { UcusHome } from "./TurizmUcusPage";
export { ServisHome } from "./TurizmServisPage";
export { EtkinlikHome } from "./TurizmEtkinlikPage";
