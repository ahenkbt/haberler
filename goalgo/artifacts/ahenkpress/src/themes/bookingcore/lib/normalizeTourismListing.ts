import { coerceRating } from "@/lib/formatRating";
import { tourismListingHref } from "./listingRoutes";

export interface TourismListingRow {
  id: number;
  type: string;
  title: string;
  slug: string;
  city: string | null;
  district?: string | null;
  image_url: string | null;
  price: string;
  sale_price: string | null;
  price_unit: string;
  star_rating: number | null;
  rating: number;
  review_count: number;
  href?: string | null;
  is_featured?: boolean;
  description?: string | null;
  map_business_fallback?: boolean;
  bc_client_fallback?: boolean;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Google Places priceLevel (ör. PRICE_LEVEL_MODERATE) — gerçek oda fiyatı değildir. */
  price_level?: string | null;
  /** Hotellook affiliate kartı — site içi detay sayfası yok. */
  hotellook_fallback?: boolean;
  external_booking?: boolean;
  has_nightly_price?: boolean;
  price_currency?: string | null;
}

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

export function normalizeTourismListing(raw: Record<string, unknown>): TourismListingRow {
  const type = String(raw.type ?? "");
  const externalBooking = Boolean(raw.external_booking || raw.hotellook_fallback);
  const row: TourismListingRow = {
    id: Number(raw.id) || 0,
    type,
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    city: raw.city != null ? String(raw.city) : null,
    district: raw.district != null ? String(raw.district) : null,
    image_url: raw.image_url != null ? String(raw.image_url) : null,
    price: String(raw.price ?? "0"),
    sale_price: raw.sale_price != null ? String(raw.sale_price) : null,
    price_unit: String(raw.price_unit ?? "gece"),
    star_rating:
      raw.star_rating != null && raw.star_rating !== ""
        ? Math.min(5, Math.max(0, Math.round(coerceRating(raw.star_rating))))
        : null,
    rating: coerceRating(raw.rating),
    review_count: Math.max(0, Math.round(coerceRating(raw.review_count))),
    href: raw.href != null ? String(raw.href) : null,
    is_featured: Boolean(raw.is_featured),
    description: raw.description != null ? String(raw.description) : null,
    map_business_fallback: Boolean(raw.map_business_fallback),
    lat: parseCoord(raw.lat),
    lng: parseCoord(raw.lng),
    price_level: raw.price_level != null && raw.price_level !== "" ? String(raw.price_level) : null,
    hotellook_fallback: Boolean(raw.hotellook_fallback),
    external_booking: externalBooking,
    has_nightly_price: Boolean(raw.has_nightly_price),
    price_currency: raw.price_currency != null ? String(raw.price_currency) : null,
  };
  if (!row.href && !externalBooking) row.href = tourismListingHref(row);
  return row;
}

export function normalizeTourismListings(rows: unknown[]): TourismListingRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map(normalizeTourismListing)
    .filter((r) => r.slug && r.title);
}
