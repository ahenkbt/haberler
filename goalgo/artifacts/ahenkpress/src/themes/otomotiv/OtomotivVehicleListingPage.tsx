import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, SlidersHorizontal, X, Gauge, Calendar, Fuel } from "lucide-react";
import type { OtomotivCategorySlug } from "./otomotivHubConfig";
import { CATEGORY_HERO, OTOMOTIV_DISCLAIMER } from "./otomotivHubConfig";
import { OTOMOTIV } from "./otomotivRoutes";
import { YekpareFooterDisclaimer } from "@/components/YekpareFooterDisclaimer";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import {
  DEFAULT_VEHICLE_FILTERS,
  fetchOtomotivListings,
  filtersFromSearchParams,
  filtersToSearchParams,
  formatVehiclePrice,
  listingPhotoUrl,
  vehicleDetailHref,
  type OtomotivVehicleListing,
  type VehicleListingFilters,
  type VehicleListingMode,
} from "./lib/vehicleListings";
import "@/styles/bookingCoreTurizm.css";
import "@/styles/otomotivHub.css";

type Brand = { id: number; name: string; slug: string };
type Model = { id: number; name: string; slug: string; brand_id: number };

const FUEL_OPTIONS = ["Benzin", "Dizel", "LPG", "Elektrik", "Hibrit"];
const TRANSMISSION_OPTIONS = ["Manuel", "Otomatik", "Yarı Otomatik"];

function slugToMode(slug: OtomotivCategorySlug): VehicleListingMode | null {
  if (slug === "galeri" || slug === "sifir" || slug === "ikinci-el") return slug;
  return null;
}

type Props = { slug: OtomotivCategorySlug };

/** Araç pazarı — galeri / sıfır / 2. el liste sayfası */
export function OtomotivVehicleListingPage({ slug }: Props) {
  const mode = slugToMode(slug);
  const hero = CATEGORY_HERO[slug];
  const [loc, setLoc] = useLocation();
  const initialQs = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
    [loc],
  );
  const [listings, setListings] = useState<OtomotivVehicleListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VehicleListingFilters>(() => filtersFromSearchParams(initialQs));
  const [draftFilters, setDraftFilters] = useState<VehicleListingFilters>(() => filtersFromSearchParams(initialQs));
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchCity, setSearchCity] = useState(initialQs.get("city") ?? "");

  useEffect(() => {
    void apiFetch(apiUrl("/api/otomotiv/brands"))
      .then((r) => r.json())
      .then((d: { brands?: Brand[] }) => setBrands(Array.isArray(d.brands) ? d.brands : []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    const brandId = draftFilters.brandId;
    if (!brandId) {
      setModels([]);
      return;
    }
    void apiFetch(apiUrl(`/api/otomotiv/models?brand_id=${brandId}`))
      .then((r) => r.json())
      .then((d: { models?: Model[] }) => setModels(Array.isArray(d.models) ? d.models : []))
      .catch(() => setModels([]));
  }, [draftFilters.brandId]);

  const loadListings = useCallback(async () => {
    if (!mode) return;
    setLoading(true);
    try {
      const activeFilters = { ...filters, city: searchCity || filters.city };
      const result = await fetchOtomotivListings(mode, activeFilters);
      setListings(result.listings);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [mode, filters, searchCity]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const applyFilters = () => {
    const next = { ...draftFilters, city: searchCity || draftFilters.city };
    setFilters(next);
    const path = loc.split("?")[0] ?? OTOMOTIV.galeri.home;
    const qs = filtersToSearchParams(next);
    if (searchCity) qs.set("city", searchCity);
    const q = qs.toString();
    setLoc(q ? `${path}?${q}` : path);
    setMobileFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_VEHICLE_FILTERS);
    setFilters(DEFAULT_VEHICLE_FILTERS);
    setSearchCity("");
    setLoc(loc.split("?")[0] ?? "/otomotiv/galeri");
    setMobileFiltersOpen(false);
  };

  if (!mode) return null;

  const filterSidebar = (
    <aside className="oto-listing__filters">
      <h3 className="oto-listing__filters-title">Filtreler</h3>
      <label className="oto-listing__field">
        <span>Marka</span>
        <select
          value={draftFilters.brandId}
          onChange={(e) => setDraftFilters((f) => ({ ...f, brandId: e.target.value, modelId: "" }))}
        >
          <option value="">Tümü</option>
          {brands.map((b) => (
            <option key={b.id} value={String(b.id)}>{b.name}</option>
          ))}
        </select>
      </label>
      <label className="oto-listing__field">
        <span>Model</span>
        <select
          value={draftFilters.modelId}
          disabled={!draftFilters.brandId}
          onChange={(e) => setDraftFilters((f) => ({ ...f, modelId: e.target.value }))}
        >
          <option value="">Tümü</option>
          {models.map((m) => (
            <option key={m.id} value={String(m.id)}>{m.name}</option>
          ))}
        </select>
      </label>
      <label className="oto-listing__field">
        <span>Yıl (min – max)</span>
        <div className="oto-listing__range">
          <input type="number" placeholder="Min" value={draftFilters.yearMin} onChange={(e) => setDraftFilters((f) => ({ ...f, yearMin: e.target.value }))} />
          <input type="number" placeholder="Max" value={draftFilters.yearMax} onChange={(e) => setDraftFilters((f) => ({ ...f, yearMax: e.target.value }))} />
        </div>
      </label>
      <label className="oto-listing__field">
        <span>Km (min – max)</span>
        <div className="oto-listing__range">
          <input type="number" placeholder="Min" value={draftFilters.kmMin} onChange={(e) => setDraftFilters((f) => ({ ...f, kmMin: e.target.value }))} />
          <input type="number" placeholder="Max" value={draftFilters.kmMax} onChange={(e) => setDraftFilters((f) => ({ ...f, kmMax: e.target.value }))} />
        </div>
      </label>
      <label className="oto-listing__field">
        <span>Fiyat (₺ min – max)</span>
        <div className="oto-listing__range">
          <input type="number" placeholder="Min" value={draftFilters.priceMin} onChange={(e) => setDraftFilters((f) => ({ ...f, priceMin: e.target.value }))} />
          <input type="number" placeholder="Max" value={draftFilters.priceMax} onChange={(e) => setDraftFilters((f) => ({ ...f, priceMax: e.target.value }))} />
        </div>
      </label>
      <label className="oto-listing__field">
        <span>Yakıt</span>
        <select value={draftFilters.fuel} onChange={(e) => setDraftFilters((f) => ({ ...f, fuel: e.target.value }))}>
          <option value="">Tümü</option>
          {FUEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
      <label className="oto-listing__field">
        <span>Vites</span>
        <select value={draftFilters.transmission} onChange={(e) => setDraftFilters((f) => ({ ...f, transmission: e.target.value }))}>
          <option value="">Tümü</option>
          {TRANSMISSION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
      <label className="oto-listing__field">
        <span>Sıralama</span>
        <select value={draftFilters.sort} onChange={(e) => setDraftFilters((f) => ({ ...f, sort: e.target.value as VehicleListingFilters["sort"] }))}>
          <option value="featured">Öne çıkanlar</option>
          <option value="price-asc">Fiyat (artan)</option>
          <option value="price-desc">Fiyat (azalan)</option>
          <option value="year-desc">Yıl (yeni)</option>
          <option value="km-asc">Km (düşük)</option>
        </select>
      </label>
      <div className="oto-listing__filter-actions">
        <button type="button" className="oto-hub__cta oto-hub__cta--primary" onClick={applyFilters}>Uygula</button>
        <button type="button" className="oto-hub__cta oto-hub__cta--ghost" onClick={resetFilters}>Sıfırla</button>
      </div>
    </aside>
  );

  return (
    <div className="oto-listing" data-category={slug}>
      <section
        className="bc-hub-hero bc-hub-hero--bus bc-hub-hero--category oto-stub__hero"
        style={{ backgroundImage: `url(${hero.bg})` }}
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">{hero.title}</h1>
          <p className="bc-hub-hero__subtitle">{hero.subtitle}</p>
          <div className="oto-listing__hero-search">
            <input
              type="search"
              placeholder="Şehir veya ilçe ara…"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
            <button type="button" className="oto-hub__cta oto-hub__cta--primary" onClick={applyFilters}>
              Ara
            </button>
          </div>
        </div>
      </section>

      <div className="oto-listing__toolbar">
        <p className="oto-listing__count">
          {loading ? "Yükleniyor…" : `${total} ilan`}
        </p>
        <button type="button" className="oto-listing__mobile-filter-btn" onClick={() => setMobileFiltersOpen(true)}>
          <SlidersHorizontal size={16} /> Filtreler
        </button>
      </div>

      <div className="oto-listing__body">
        {filterSidebar}
        <div className="oto-listing__grid-wrap">
          {loading ? (
            <div className="oto-listing__empty">İlanlar yükleniyor…</div>
          ) : listings.length === 0 ? (
            <div className="oto-listing__empty">
              <p>Henüz bu kriterlere uygun araç ilanı yok.</p>
              <Link href={OTOMOTIV.hub} className="oto-hub__cta oto-hub__cta--ghost">← Otomotiv ana sayfa</Link>
            </div>
          ) : (
            <div className="oto-listing__grid">
              {listings.map((item) => (
                <Link key={item.id} href={vehicleDetailHref(mode, item.slug)} className="oto-listing__card">
                  <div className="oto-listing__card-img-wrap">
                    <img src={listingPhotoUrl(item)} alt="" loading="lazy" />
                    {item.is_featured ? <span className="oto-listing__badge">Öne çıkan</span> : null}
                    {item.is_zero_km ? <span className="oto-listing__badge oto-listing__badge--zero">Sıfır km</span> : null}
                  </div>
                  <div className="oto-listing__card-body">
                    <h2>{item.title}</h2>
                    <p className="oto-listing__price">{formatVehiclePrice(item.price, item.currency)}</p>
                    <ul className="oto-listing__meta">
                      {item.year ? <li><Calendar size={14} /> {item.year}</li> : null}
                      {item.km != null ? <li><Gauge size={14} /> {item.km.toLocaleString("tr-TR")} km</li> : null}
                      {item.fuel ? <li><Fuel size={14} /> {item.fuel}</li> : null}
                      {(item.business_city || item.business_district) ? (
                        <li><MapPin size={14} /> {[item.business_district, item.business_city].filter(Boolean).join(", ")}</li>
                      ) : null}
                    </ul>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {mobileFiltersOpen ? (
        <div className="oto-listing__mobile-overlay" role="dialog" aria-modal="true">
          <div className="oto-listing__mobile-panel">
            <div className="oto-listing__mobile-head">
              <h3>Filtreler</h3>
              <button type="button" aria-label="Kapat" onClick={() => setMobileFiltersOpen(false)}><X size={20} /></button>
            </div>
            {filterSidebar}
          </div>
        </div>
      ) : null}

      <aside className="oto-hub__disclaimer-wrap">
        <YekpareFooterDisclaimer className="oto-hub__disclaimer" />
        <p className="oto-hub__disclaimer-extra">{OTOMOTIV_DISCLAIMER}</p>
      </aside>
    </div>
  );
}
