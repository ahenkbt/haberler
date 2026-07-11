import {
  normalizeTourismListings,
  normalizeTourismListing,
  type TourismListingRow,
} from "./normalizeTourismListing";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { getTourismBcClientFallback } from "./tourismBcClientFallback";
import type { ListingFilterState } from "../components/BookingCoreFilterSidebar";
import { listingFiltersToApiParams } from "./listingFilters";

export type TourismListingsResponse = {
  listings: TourismListingRow[];
  total: number;
  filterMeta?: {
    amenities?: string[];
    features?: string[];
    priceMax?: number;
    priceUnit?: string;
  };
  hotellookMeta?: {
    source?: string;
    configured?: boolean;
    affiliateUrl?: string | null;
    error?: string | null;
    currency?: string;
    checkIn?: string;
    checkOut?: string;
  };
};

export async function fetchTourismListings(params: {
  type?: string;
  city?: string;
  featured?: boolean;
  limit?: number;
  page?: number;
  filters?: ListingFilterState;
  /** When true (default), use BC demo cards if API returns nothing. */
  useClientFallback?: boolean;
}): Promise<TourismListingRow[]> {
  const result = await fetchTourismListingsWithMeta(params);
  return result.listings;
}

export async function fetchTourismListingsWithMeta(params: {
  type?: string;
  city?: string;
  featured?: boolean;
  limit?: number;
  page?: number;
  filters?: ListingFilterState;
  useClientFallback?: boolean;
  iata?: string;
  cc?: string;
  locType?: string;
  loc?: string;
  checkIn?: string;
  checkOut?: string;
  extraParams?: URLSearchParams;
}): Promise<TourismListingsResponse> {
  const useClientFallback = params.useClientFallback !== false;
  const q = new URLSearchParams({
    limit: String(params.limit ?? 24),
    page: String(params.page ?? 1),
  });
  if (params.type) q.set("type", params.type);
  if (params.city) q.set("city", params.city);
  if (params.featured) q.set("featured", "1");
  if (params.iata) q.set("iata", params.iata);
  if (params.cc) q.set("cc", params.cc);
  if (params.locType) q.set("locType", params.locType);
  if (params.loc) q.set("loc", params.loc);
  if (params.checkIn) q.set("checkIn", params.checkIn);
  if (params.checkOut) q.set("checkOut", params.checkOut);
  if (params.filters) {
    const fq = listingFiltersToApiParams(params.filters);
    fq.forEach((value, key) => q.set(key, value));
  }
  if (params.extraParams) {
    params.extraParams.forEach((value, key) => q.set(key, value));
  }

  try {
    const { ok, data } = await fetchPublicJson<{
      listings?: unknown[];
      total?: number;
      filterMeta?: { amenities?: string[]; features?: string[]; priceMax?: number; priceUnit?: string };
      hotellookMeta?: TourismListingsResponse["hotellookMeta"];
    }>(`/api/tourism/listings?${q}`);
    if (!ok) throw new Error(`HTTP tourism listings`);
    let rows = normalizeTourismListings(data?.listings ?? []);

    if (rows.length === 0 && params.featured && params.type) {
      const retry = await fetchPublicJson<{ listings?: unknown[]; total?: number }>(
        `/api/tourism/listings?${new URLSearchParams({
          type: params.type,
          limit: String(params.limit ?? 24),
        })}`,
      );
      rows = normalizeTourismListings(retry.data?.listings ?? []);
    }

    if (rows.length === 0 && useClientFallback && params.type && params.type !== "hotel") {
      return {
        listings: getTourismBcClientFallback(params.type, params.limit ?? 24).map((row) =>
          normalizeTourismListing({ ...row } as Record<string, unknown>),
        ),
        total: 0,
      };
    }

    return {
      listings: rows,
      total: Number(data?.total ?? rows.length),
      filterMeta: data?.filterMeta,
      hotellookMeta: data?.hotellookMeta,
    };
  } catch {
    if (useClientFallback && params.type && params.type !== "hotel") {
      const listings = getTourismBcClientFallback(params.type, params.limit ?? 24).map((row) =>
        normalizeTourismListing({ ...row } as Record<string, unknown>),
      );
      return { listings, total: listings.length };
    }
    return { listings: [], total: 0 };
  }
}
