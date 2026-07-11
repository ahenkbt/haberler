import { apiUrl, apiFetch } from "@/lib/apiBase";

export type OtomotivVehicleListing = {
  id: number;
  business_id: number;
  listing_kind: string;
  title: string;
  slug: string;
  brand_id: number | null;
  model_id: number | null;
  year: number | null;
  km: number | null;
  fuel: string | null;
  transmission: string | null;
  price: string | number | null;
  currency: string;
  is_zero_km: boolean;
  is_featured: boolean;
  photos_json: string[] | unknown;
  description: string | null;
  business_name?: string;
  business_slug?: string;
  business_type?: string;
  business_city?: string | null;
  business_district?: string | null;
  business_phone?: string | null;
  brand_name?: string | null;
  brand_slug?: string | null;
  model_name?: string | null;
  model_slug?: string | null;
};

export type VehicleListingFilters = {
  brandId: string;
  modelId: string;
  city: string;
  fuel: string;
  transmission: string;
  priceMin: string;
  priceMax: string;
  yearMin: string;
  yearMax: string;
  kmMin: string;
  kmMax: string;
  sort: "featured" | "price-asc" | "price-desc" | "year-desc" | "km-asc";
};

export const DEFAULT_VEHICLE_FILTERS: VehicleListingFilters = {
  brandId: "",
  modelId: "",
  city: "",
  fuel: "",
  transmission: "",
  priceMin: "",
  priceMax: "",
  yearMin: "",
  yearMax: "",
  kmMin: "",
  kmMax: "",
  sort: "featured",
};

export type VehicleListingMode = "galeri" | "sifir" | "ikinci-el";

export function vehicleListingApiParams(
  mode: VehicleListingMode,
  filters: VehicleListingFilters,
  page = 1,
): URLSearchParams {
  const q = new URLSearchParams();
  q.set("type", "vehicle");
  q.set("page", String(page));
  q.set("limit", "24");
  if (mode === "sifir") q.set("is_zero_km", "true");
  if (mode === "ikinci-el") q.set("is_zero_km", "false");
  if (mode === "galeri") q.set("business_type", "galeri");
  if (filters.brandId) q.set("brand_id", filters.brandId);
  if (filters.modelId) q.set("model_id", filters.modelId);
  if (filters.city) q.set("city", filters.city);
  if (filters.fuel) q.set("fuel", filters.fuel);
  if (filters.transmission) q.set("transmission", filters.transmission);
  if (filters.priceMin) q.set("price_min", filters.priceMin);
  if (filters.priceMax) q.set("price_max", filters.priceMax);
  if (filters.yearMin) q.set("year_min", filters.yearMin);
  if (filters.yearMax) q.set("year_max", filters.yearMax);
  if (filters.kmMin) q.set("km_min", filters.kmMin);
  if (filters.kmMax) q.set("km_max", filters.kmMax);
  return q;
}

export function filtersFromSearchParams(qs: URLSearchParams): VehicleListingFilters {
  return {
    brandId: qs.get("brand_id") ?? qs.get("brandId") ?? "",
    modelId: qs.get("model_id") ?? qs.get("modelId") ?? "",
    city: qs.get("city") ?? "",
    fuel: qs.get("fuel") ?? "",
    transmission: qs.get("transmission") ?? "",
    priceMin: qs.get("price_min") ?? qs.get("priceMin") ?? "",
    priceMax: qs.get("price_max") ?? qs.get("priceMax") ?? "",
    yearMin: qs.get("year_min") ?? qs.get("yearMin") ?? "",
    yearMax: qs.get("year_max") ?? qs.get("yearMax") ?? "",
    kmMin: qs.get("km_min") ?? qs.get("kmMin") ?? "",
    kmMax: qs.get("km_max") ?? qs.get("kmMax") ?? "",
    sort: (qs.get("sort") as VehicleListingFilters["sort"]) || "featured",
  };
}

export function filtersToSearchParams(filters: VehicleListingFilters): URLSearchParams {
  const q = new URLSearchParams();
  if (filters.brandId) q.set("brand_id", filters.brandId);
  if (filters.modelId) q.set("model_id", filters.modelId);
  if (filters.city) q.set("city", filters.city);
  if (filters.fuel) q.set("fuel", filters.fuel);
  if (filters.transmission) q.set("transmission", filters.transmission);
  if (filters.priceMin) q.set("price_min", filters.priceMin);
  if (filters.priceMax) q.set("price_max", filters.priceMax);
  if (filters.yearMin) q.set("year_min", filters.yearMin);
  if (filters.yearMax) q.set("year_max", filters.yearMax);
  if (filters.kmMin) q.set("km_min", filters.kmMin);
  if (filters.kmMax) q.set("km_max", filters.kmMax);
  if (filters.sort !== "featured") q.set("sort", filters.sort);
  return q;
}

export async function fetchOtomotivListings(
  mode: VehicleListingMode,
  filters: VehicleListingFilters,
  page = 1,
): Promise<{ listings: OtomotivVehicleListing[]; total: number }> {
  const params = vehicleListingApiParams(mode, filters, page);
  const res = await apiFetch(apiUrl(`/api/otomotiv/listings?${params}`));
  const data = (await res.json()) as { listings?: OtomotivVehicleListing[]; total?: number };
  let listings = Array.isArray(data.listings) ? data.listings : [];
  if (filters.sort === "price-asc") {
    listings = [...listings].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
  } else if (filters.sort === "price-desc") {
    listings = [...listings].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
  } else if (filters.sort === "year-desc") {
    listings = [...listings].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  } else if (filters.sort === "km-asc") {
    listings = [...listings].sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  }
  return { listings, total: data.total ?? listings.length };
}

export async function fetchOtomotivListingBySlug(slug: string): Promise<OtomotivVehicleListing | null> {
  const res = await apiFetch(apiUrl(`/api/otomotiv/listings/${encodeURIComponent(slug)}`));
  if (!res.ok) return null;
  const data = (await res.json()) as { listing?: OtomotivVehicleListing };
  return data.listing ?? null;
}

export function listingPhotoUrl(listing: OtomotivVehicleListing): string {
  const photos = listing.photos_json;
  if (Array.isArray(photos) && photos.length > 0 && typeof photos[0] === "string") {
    return photos[0];
  }
  return "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80";
}

export function formatVehiclePrice(price: string | number | null | undefined, currency = "TRY"): string {
  if (price == null || price === "") return "Fiyat sorunuz";
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (!Number.isFinite(n)) return "Fiyat sorunuz";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function vehicleDetailHref(mode: VehicleListingMode, slug: string): string {
  const base = mode === "sifir" ? "/otomotiv/sifir" : mode === "ikinci-el" ? "/otomotiv/ikinci-el" : "/otomotiv/galeri";
  return `${base}/${encodeURIComponent(slug)}`;
}
