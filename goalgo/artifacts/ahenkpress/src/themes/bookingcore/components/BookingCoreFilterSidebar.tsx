import { SlidersHorizontal } from "lucide-react";
import type { TourismFilterModule } from "../lib/listingFilters";
import { MODULE_PRICE_UNIT } from "../lib/listingFilters";

export type ListingFilterState = {
  priceMin: string;
  priceMax: string;
  ratingMin: string;
  stars: number[];
  amenities: string[];
  features: string[];
  capacityMin: string;
  sort: string;
};

export const DEFAULT_LISTING_FILTERS: ListingFilterState = {
  priceMin: "",
  priceMax: "",
  ratingMin: "",
  stars: [],
  amenities: [],
  features: [],
  capacityMin: "",
  sort: "recommended",
};

/** @deprecated use ListingFilterState */
export type HotelFilterState = ListingFilterState;

/** @deprecated use DEFAULT_LISTING_FILTERS */
export const DEFAULT_HOTEL_FILTERS = DEFAULT_LISTING_FILTERS;

type Props = {
  moduleType: TourismFilterModule;
  filters: ListingFilterState;
  draft: ListingFilterState;
  onDraftChange: (next: Partial<ListingFilterState>) => void;
  onApply: () => void;
  onReset: () => void;
  amenityOptions: string[];
  featureOptions?: string[];
  priceMax?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const STAR_OPTIONS = [5, 4, 3, 2, 1];
const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 12, 16, 20];

export function BookingCoreFilterSidebar({
  moduleType,
  filters,
  draft,
  onDraftChange,
  onApply,
  onReset,
  amenityOptions,
  featureOptions = [],
  priceMax = 25000,
  mobileOpen,
  onMobileClose,
}: Props) {
  const maxVal = Number(draft.priceMax || priceMax) || priceMax;
  const minVal = Number(draft.priceMin || 0) || 0;
  const priceUnit = MODULE_PRICE_UNIT[moduleType];
  const showStars = moduleType === "hotel";
  const showCapacity = moduleType === "villa" || moduleType === "boat";
  const showAmenities = amenityOptions.length > 0;
  const showFeatures = featureOptions.length > 0;
  const featureLabel =
    moduleType === "car" ? "Araç özellikleri" : moduleType === "tour" ? "Süre / kategori" : "Özellikler";

  function toggleStar(star: number) {
    const next = draft.stars.includes(star)
      ? draft.stars.filter((s) => s !== star)
      : [...draft.stars, star].sort((a, b) => b - a);
    onDraftChange({ stars: next });
  }

  function toggleAmenity(label: string) {
    const next = draft.amenities.includes(label)
      ? draft.amenities.filter((a) => a !== label)
      : [...draft.amenities, label];
    onDraftChange({ amenities: next });
  }

  function toggleFeature(label: string) {
    const next = draft.features.includes(label)
      ? draft.features.filter((a) => a !== label)
      : [...draft.features, label];
    onDraftChange({ features: next });
  }

  const hasActiveFilters =
    filters.priceMin ||
    filters.priceMax ||
    filters.ratingMin ||
    filters.stars.length ||
    filters.amenities.length ||
    filters.features.length ||
    filters.capacityMin ||
    filters.sort !== "recommended";

  const panel = (
    <aside className="bc-filter-sidebar">
      <div className="bc-filter-sidebar__head">
        <h3>
          <SlidersHorizontal className="w-4 h-4" />
          Filtrele
        </h3>
        {onMobileClose ? (
          <button type="button" className="bc-filter-sidebar__close" onClick={onMobileClose}>
            Kapat
          </button>
        ) : null}
      </div>

      <div className="bc-filter-group">
        <label className="bc-filter-group__label">Fiyat aralığı (₺ / {priceUnit})</label>
        <div className="bc-filter-range">
          <input
            type="range"
            min={0}
            max={priceMax}
            step={100}
            value={minVal}
            onChange={(e) => onDraftChange({ priceMin: e.target.value })}
          />
          <input
            type="range"
            min={0}
            max={priceMax}
            step={100}
            value={maxVal}
            onChange={(e) => onDraftChange({ priceMax: e.target.value })}
          />
        </div>
        <p className="bc-filter-range__value">
          {minVal.toLocaleString("tr-TR")} ₺ – {maxVal.toLocaleString("tr-TR")} ₺
        </p>
      </div>

      {showStars ? (
        <div className="bc-filter-group">
          <label className="bc-filter-group__label">Yıldız sınıfı</label>
          <div className="bc-filter-chips">
            {STAR_OPTIONS.map((star) => (
              <button
                key={star}
                type="button"
                className={`bc-filter-chip${draft.stars.includes(star) ? " is-active" : ""}`}
                onClick={() => toggleStar(star)}
              >
                {star}★
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="bc-filter-group">
        <label className="bc-filter-group__label" htmlFor="bc-filter-rating">
          Minimum puan
        </label>
        <select
          id="bc-filter-rating"
          value={draft.ratingMin}
          onChange={(e) => onDraftChange({ ratingMin: e.target.value })}
        >
          <option value="">Tümü</option>
          <option value="3">3+</option>
          <option value="3.5">3.5+</option>
          <option value="4">4+</option>
          <option value="4.5">4.5+</option>
        </select>
      </div>

      {showCapacity ? (
        <div className="bc-filter-group">
          <label className="bc-filter-group__label" htmlFor="bc-filter-capacity">
            Minimum kapasite (kişi)
          </label>
          <select
            id="bc-filter-capacity"
            value={draft.capacityMin}
            onChange={(e) => onDraftChange({ capacityMin: e.target.value })}
          >
            <option value="">Tümü</option>
            {CAPACITY_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}+ kişi
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showAmenities ? (
        <div className="bc-filter-group">
          <span className="bc-filter-group__label">
            {moduleType === "tour" ? "Tur hizmetleri" : "Olanaklar"}
          </span>
          <div className="bc-filter-checks">
            {amenityOptions.map((label) => (
              <label key={label} className="bc-filter-check">
                <input
                  type="checkbox"
                  checked={draft.amenities.includes(label)}
                  onChange={() => toggleAmenity(label)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {showFeatures ? (
        <div className="bc-filter-group">
          <span className="bc-filter-group__label">{featureLabel}</span>
          <div className="bc-filter-chips">
            {featureOptions.map((label) => (
              <button
                key={label}
                type="button"
                className={`bc-filter-chip${draft.features.includes(label) ? " is-active" : ""}`}
                onClick={() => toggleFeature(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="bc-filter-group">
        <label className="bc-filter-group__label" htmlFor="bc-filter-sort">
          Sıralama
        </label>
        <select
          id="bc-filter-sort"
          value={draft.sort}
          onChange={(e) => onDraftChange({ sort: e.target.value })}
        >
          <option value="recommended">Önerilen</option>
          <option value="price_asc">Fiyat (düşükten yükseğe)</option>
          <option value="price_desc">Fiyat (yüksekten düşüğe)</option>
          <option value="rating">Puan (yüksek)</option>
        </select>
      </div>

      <div className="bc-filter-actions">
        <button type="button" className="bc-search-btn bc-filter-actions__apply" onClick={onApply}>
          Uygula
        </button>
        <button type="button" className="bc-filter-actions__reset" onClick={onReset}>
          Sıfırla
        </button>
      </div>

      {hasActiveFilters ? <p className="bc-filter-sidebar__active">Aktif filtreler uygulandı</p> : null}
    </aside>
  );

  if (mobileOpen != null) {
    return (
      <>
        <div className={`bc-filter-drawer${mobileOpen ? " is-open" : ""}`}>{panel}</div>
        {mobileOpen ? (
          <button
            type="button"
            className="bc-filter-backdrop"
            aria-label="Filtreleri kapat"
            onClick={onMobileClose}
          />
        ) : null}
      </>
    );
  }

  return panel;
}
