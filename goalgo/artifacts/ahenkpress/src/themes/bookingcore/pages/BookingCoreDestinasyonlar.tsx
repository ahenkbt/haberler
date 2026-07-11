import { Link, useRoute, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, ChevronRight, Home, Palmtree, SlidersHorizontal } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { BookingCoreShell } from "../BookingCoreShell";
import { BookingCoreDestinationTile, BookingCoreHomeCard } from "../components/BookingCoreHomeCard";
import {
  BookingCoreFilterSidebar,
  DEFAULT_LISTING_FILTERS,
  type ListingFilterState,
} from "../components/BookingCoreFilterSidebar";
import { useTourismDestinations } from "../hooks/useTourismListings";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import type { TourismListing } from "../hooks/useTourismListings";
import { tourismListingHref } from "../lib/listingRoutes";
import {
  listingFiltersFromSearchParams,
  listingFiltersToApiParams,
  listingFiltersToSearchParams,
  type TourismFilterModule,
} from "../lib/listingFilters";
import "@/styles/bookingCoreTurizm.css";

type DestTab = "hotels" | "tours" | "villas";

type DestinationDetail = {
  destination: {
    title: string;
    slug: string;
    excerpt?: string;
    detailTitle?: string;
    image?: string;
    hotels?: number;
    tours?: number;
    villas?: number;
    listings?: number;
    gallery?: string[];
  };
  hotels: TourismListing[];
  tours: TourismListing[];
  villas: TourismListing[];
};

const DEST_TAB_LABEL: Record<DestTab, string> = {
  hotels: "Oteller",
  tours: "Turlar",
  villas: "Villalar",
};

const DEST_TAB_EMPTY: Record<DestTab, string> = {
  hotels: "Bu destinasyonda henüz otel ilanı bulunmuyor.",
  tours: "Bu destinasyonda henüz tur ilanı bulunmuyor.",
  villas: "Bu destinasyonda henüz villa ilanı bulunmuyor.",
};

export default function BookingCoreDestinasyonlar() {
  const { destinations, loading } = useTourismDestinations();

  return (
    <BookingCoreShell module="turlar" title="Destinasyonlar">
      <p className="bc-list-intro">
        Türkiye&apos;nin öne çıkan turizm rotalarını keşfedin; her destinasyondaki turlar ve konaklama seçenekleri.
      </p>
      {loading ? (
        <div className="bc-dest-grid bc-home-section__skeleton">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bc-skeleton bc-skeleton--tile" />
          ))}
        </div>
      ) : destinations.length === 0 ? (
        <div className="bc-empty">
          <p>Destinasyon bulunamadı.</p>
          <Link href={TURIZM.turlar.home}>Turlara dön</Link>
        </div>
      ) : (
        <div className="bc-dest-grid">
          {destinations.map((d) => (
            <BookingCoreDestinationTile
              key={d.slug}
              title={d.title}
              slug={d.slug}
              image={d.image}
              listings={d.listings}
              hotels={d.hotels}
              tours={d.tours}
            />
          ))}
        </div>
      )}
    </BookingCoreShell>
  );
}

const DEST_TAB_MODULE: Record<DestTab, TourismFilterModule> = {
  hotels: "hotel",
  tours: "tour",
  villas: "villa",
};

export function BookingCoreDestinasyonDetay() {
  const [, params] = useRoute("/turizm/destinasyon/:slug");
  const slug = params?.slug ?? "";
  const [loc, setLoc] = useLocation();
  const initialQs = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
    [loc],
  );
  const [tab, setTab] = useState<DestTab>("hotels");
  const [detail, setDetail] = useState<DestinationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ListingFilterState>(() => listingFiltersFromSearchParams(initialQs));
  const [draftFilters, setDraftFilters] = useState<ListingFilterState>(() =>
    listingFiltersFromSearchParams(initialQs),
  );
  const [amenityOptions, setAmenityOptions] = useState<string[]>([]);
  const [featureOptions, setFeatureOptions] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(25000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = listingFiltersToApiParams(filters);
    fetch(`/api/tourism/destinations/${encodeURIComponent(slug)}?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setDetail(null);
          return;
        }
        const mapRows = (rows: Record<string, unknown>[]) =>
          rows.map((row) => ({
            ...row,
            type: String(row.type ?? "hotel"),
            slug: String(row.slug ?? ""),
            href: String(row.href ?? tourismListingHref({
              type: String(row.type ?? "hotel"),
              slug: String(row.slug ?? ""),
            })),
          })) as TourismListing[];
        setDetail({
          destination: d.destination,
          hotels: mapRows(d.hotels ?? []),
          tours: mapRows(d.tours ?? []),
          villas: mapRows(d.villas ?? []),
        });
        if (d.filterMeta?.amenities?.length) setAmenityOptions(d.filterMeta.amenities);
        if (d.filterMeta?.features?.length) setFeatureOptions(d.filterMeta.features);
        if (d.filterMeta?.priceMax) setPriceMax(d.filterMeta.priceMax);
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [slug, filters]);

  function syncUrl(nextFilters: ListingFilterState) {
    const q = listingFiltersToSearchParams(nextFilters, new URLSearchParams(), priceMax);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    const path = loc.split("?")[0] ?? loc;
    setLoc(`${path}${suffix}`, { replace: true });
  }

  function applyFilters() {
    setFilters(draftFilters);
    syncUrl(draftFilters);
    setMobileFiltersOpen(false);
  }

  function resetFilters() {
    const next = { ...DEFAULT_LISTING_FILTERS };
    setDraftFilters(next);
    setFilters(next);
    syncUrl(next);
    setMobileFiltersOpen(false);
  }

  const dest = detail?.destination;
  const activeList =
    tab === "hotels" ? detail?.hotels ?? [] : tab === "tours" ? detail?.tours ?? [] : detail?.villas ?? [];
  const hotelCount = detail?.hotels.length ?? dest?.hotels ?? 0;
  const tourCount = detail?.tours.length ?? dest?.tours ?? 0;
  const villaCount = detail?.villas.length ?? dest?.villas ?? 0;
  const filterModule = DEST_TAB_MODULE[tab];
  const heroImage =
    resolveClientMediaSrc(dest?.image) ||
    resolveClientMediaSrc(dest?.gallery?.[0]) ||
    dest?.image ||
    dest?.gallery?.[0] ||
    "";

  return (
    <BookingCoreShell module="turlar">
      <div className="bc-dest-detail">
        {loading ? (
          <div className="bc-dest-detail__skeleton">
            <div className="bc-skeleton bc-skeleton--tile bc-dest-detail__skeleton-hero" />
            <div className="bc-skeleton bc-skeleton--tile bc-dest-detail__skeleton-tabs" />
            <div className="bc-dest-detail-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bc-skeleton bc-skeleton--tile" />
              ))}
            </div>
          </div>
        ) : !dest ? (
          <div className="bc-dest-detail__empty bc-dest-detail__empty--page">
            <span className="bc-dest-detail__empty-icon" aria-hidden>
              🗺️
            </span>
            <h3>Destinasyon bulunamadı</h3>
            <p>Aradığınız şehir veya bölge listede yok olabilir.</p>
            <Link href={TURIZM.turlar.destinasyonlar} className="bc-dest-detail__back">
              <ArrowLeft className="bc-dest-detail__back-icon" aria-hidden />
              Destinasyonlara dön
            </Link>
          </div>
        ) : (
          <>
            <section className="bc-dest-detail__hero">
              <nav className="bc-dest-detail__breadcrumb" aria-label="Breadcrumb">
                <span className="bc-dest-detail__crumb">
                  <Link href={TURIZM.turlar.home}>Seyahat</Link>
                  <ChevronRight className="bc-dest-detail__crumb-sep" aria-hidden />
                </span>
                <span className="bc-dest-detail__crumb">
                  <Link href={TURIZM.turlar.destinasyonlar}>Destinasyonlar</Link>
                  <ChevronRight className="bc-dest-detail__crumb-sep" aria-hidden />
                </span>
                <span className="bc-dest-detail__crumb" aria-current="page">
                  {dest.title}
                </span>
              </nav>

              <div className="bc-dest-detail__hero-card">
                {heroImage ? (
                  <div className="bc-dest-detail__hero-media">
                    <img src={heroImage} alt={dest.title} loading="eager" />
                  </div>
                ) : null}
                <div className="bc-dest-detail__hero-body">
                  <Link href={TURIZM.turlar.destinasyonlar} className="bc-dest-detail__back">
                    <ArrowLeft className="bc-dest-detail__back-icon" aria-hidden />
                    Destinasyonlara dön
                  </Link>
                  <h1>{dest.detailTitle || dest.title}</h1>
                  <p>
                    {dest.excerpt ||
                      `${dest.title} bölgesindeki oteller, turlar ve villa seçeneklerini keşfedin.`}
                  </p>
                  <div className="bc-dest-detail__chips" aria-label="İlan sayıları">
                    <span className="bc-dest-detail__chip">
                      <Building2 className="bc-dest-detail__chip-icon" aria-hidden />
                      {hotelCount} Otel
                    </span>
                    <span className="bc-dest-detail__chip">
                      <Palmtree className="bc-dest-detail__chip-icon" aria-hidden />
                      {tourCount} Tur
                    </span>
                    <span className="bc-dest-detail__chip">
                      <Home className="bc-dest-detail__chip-icon" aria-hidden />
                      {villaCount} Villa
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bc-dest-detail__content">
              <div className="bc-list-toolbar">
                <p className="bc-result-count">{activeList.length.toLocaleString("tr-TR")} sonuç</p>
                <button
                  type="button"
                  className="bc-filter-mobile-btn"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtreler
                </button>
              </div>

              <div className="bc-dest-tabs" role="tablist" aria-label="Destinasyon kategorileri">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "hotels"}
                  className={tab === "hotels" ? "bc-dest-tabs__btn bc-dest-tabs__btn--active" : "bc-dest-tabs__btn"}
                  onClick={() => setTab("hotels")}
                >
                  Oteller ({hotelCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "tours"}
                  className={tab === "tours" ? "bc-dest-tabs__btn bc-dest-tabs__btn--active" : "bc-dest-tabs__btn"}
                  onClick={() => setTab("tours")}
                >
                  Turlar ({tourCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "villas"}
                  className={tab === "villas" ? "bc-dest-tabs__btn bc-dest-tabs__btn--active" : "bc-dest-tabs__btn"}
                  onClick={() => setTab("villas")}
                >
                  Villalar ({villaCount})
                </button>
              </div>

              <div className="bc-list-layout bc-list-layout--filtered">
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

                <div className="bc-list-main">
              {activeList.length === 0 ? (
                <div className="bc-dest-detail__empty">
                  <span className="bc-dest-detail__empty-icon" aria-hidden>
                    {tab === "hotels" ? "🏨" : tab === "tours" ? "🧭" : "🏡"}
                  </span>
                  <h3>{DEST_TAB_LABEL[tab]} bulunamadı</h3>
                  <p>{DEST_TAB_EMPTY[tab]}</p>
                  <button type="button" className="bc-search-btn" onClick={resetFilters}>
                    Filtreleri sıfırla
                  </button>
                  <Link href={TURIZM.turlar.destinasyonlar} className="bc-dest-detail__back">
                    <ArrowLeft className="bc-dest-detail__back-icon" aria-hidden />
                    Diğer destinasyonlara göz at
                  </Link>
                </div>
              ) : (
                <div className="bc-dest-detail-grid">
                  {activeList.map((listing) => (
                    <BookingCoreHomeCard key={`${listing.type}-${listing.slug}`} listing={listing} />
                  ))}
                </div>
              )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </BookingCoreShell>
  );
}
