import type { ListingFilterState } from "../components/BookingCoreFilterSidebar";
import { DEFAULT_LISTING_FILTERS } from "../components/BookingCoreFilterSidebar";

export type TourismFilterModule = "hotel" | "villa" | "tour" | "car" | "boat";

export function listingFiltersFromSearchParams(qs: URLSearchParams): ListingFilterState {
  const starsRaw = qs.get("stars") ?? "";
  const amenitiesRaw = qs.get("amenities") ?? "";
  const featuresRaw = qs.get("features") ?? "";
  return {
    priceMin: qs.get("priceMin") ?? "",
    priceMax: qs.get("priceMax") ?? "",
    ratingMin: qs.get("ratingMin") ?? "",
    stars: starsRaw
      ? starsRaw
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5)
      : [],
    amenities: amenitiesRaw ? amenitiesRaw.split(",").map((s) => s.trim()).filter(Boolean) : [],
    features: featuresRaw ? featuresRaw.split(",").map((s) => s.trim()).filter(Boolean) : [],
    capacityMin: qs.get("capacityMin") ?? "",
    sort: qs.get("sort") ?? "recommended",
  };
}

export function listingFiltersToSearchParams(
  filters: ListingFilterState,
  base: URLSearchParams,
  priceMaxDefault = 25000,
): URLSearchParams {
  const q = new URLSearchParams(base);
  const setOrDelete = (key: string, value: string) => {
    if (value) q.set(key, value);
    else q.delete(key);
  };
  setOrDelete("priceMin", filters.priceMin);
  setOrDelete(
    "priceMax",
    filters.priceMax && filters.priceMax !== String(priceMaxDefault) ? filters.priceMax : "",
  );
  setOrDelete("ratingMin", filters.ratingMin);
  setOrDelete("stars", filters.stars.length ? filters.stars.join(",") : "");
  setOrDelete("amenities", filters.amenities.length ? filters.amenities.join(",") : "");
  setOrDelete("features", filters.features.length ? filters.features.join(",") : "");
  setOrDelete("capacityMin", filters.capacityMin);
  setOrDelete("sort", filters.sort !== "recommended" ? filters.sort : "");
  return q;
}

export function listingFiltersToApiParams(filters: ListingFilterState): URLSearchParams {
  const q = new URLSearchParams();
  if (filters.priceMin) q.set("priceMin", filters.priceMin);
  if (filters.priceMax) q.set("priceMax", filters.priceMax);
  if (filters.ratingMin) q.set("ratingMin", filters.ratingMin);
  if (filters.stars.length) q.set("stars", filters.stars.join(","));
  if (filters.amenities.length) q.set("amenities", filters.amenities.join(","));
  if (filters.features.length) q.set("features", filters.features.join(","));
  if (filters.capacityMin) q.set("capacityMin", filters.capacityMin);
  if (filters.sort && filters.sort !== "recommended") q.set("sort", filters.sort);
  return q;
}

export const MODULE_RESULT_LABEL: Record<TourismFilterModule, string> = {
  hotel: "otel seçeneği bulundu",
  villa: "villa seçeneği bulundu",
  tour: "tur seçeneği bulundu",
  car: "araç seçeneği bulundu",
  boat: "tekne seçeneği bulundu",
};

export const MODULE_PRICE_UNIT: Record<TourismFilterModule, string> = {
  hotel: "gece",
  villa: "gece",
  tour: "kişi",
  car: "gün",
  boat: "gün",
};

export { DEFAULT_LISTING_FILTERS };

/** @deprecated use listingFiltersFromSearchParams */
export function hotelFiltersFromSearchParams(qs: URLSearchParams): ListingFilterState {
  return listingFiltersFromSearchParams(qs);
}

/** @deprecated use listingFiltersToSearchParams */
export function hotelFiltersToSearchParams(
  filters: ListingFilterState,
  base: URLSearchParams,
): URLSearchParams {
  return listingFiltersToSearchParams(filters, base);
}

/** @deprecated use listingFiltersToApiParams */
export function hotelFiltersToApiParams(filters: ListingFilterState): URLSearchParams {
  return listingFiltersToApiParams(filters);
}

/** @deprecated use DEFAULT_LISTING_FILTERS */
export { DEFAULT_LISTING_FILTERS as DEFAULT_HOTEL_FILTERS };
