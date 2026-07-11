import { Link } from "wouter";
import { MapPin, Star } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { formatRating, coerceRating } from "@/lib/formatRating";
import { tourismListingHref } from "@/themes/bookingcore/lib/listingRoutes";

interface Listing {
  id: number;
  type: string;
  title: string;
  slug: string;
  city: string | null;
  image_url: string | null;
  price: string;
  sale_price: string | null;
  price_unit: string;
  star_rating: number | null;
  rating: number | string;
  review_count: number;
  href?: string | null;
  map_business_fallback?: boolean;
}

function PriceUnit(unit: string) {
  const m: Record<string, string> = {
    gece: "gece",
    gun: "gün",
    kisi: "kişi başı",
    gün: "gün",
    gecelik: "gece",
    günlük: "gün",
  };
  return m[unit] || unit;
}

function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeStarCount(value: unknown): number {
  const n = Math.round(safeNum(value));
  if (n <= 0) return 0;
  return Math.min(5, n);
}

/** Otel / araç / villa legacy liste kartı — /turizm/car vb. */
export function ListingCard({ listing }: { listing: Listing }) {
  const l = listing;
  const catIcon: Record<string, string> = { hotel: "🏨", car: "🚗", villa: "🏡", tour: "🗺️", boat: "⛵" };
  const catLabel: Record<string, string> = {
    hotel: "Otel",
    car: "Rent a Car",
    villa: "Villa",
    tour: "Tur",
    boat: "Yat Tekne Kiralama",
  };
  const basePrice = safeNum(l.price);
  const salePrice = l.sale_price != null ? safeNum(l.sale_price) : NaN;
  const price = Number.isFinite(salePrice) && salePrice < basePrice ? l.sale_price! : l.price;
  const hasDiscount = Number.isFinite(salePrice) && salePrice < basePrice;
  const ratingLabel = formatRating(l.rating);
  const reviewCount = Math.max(0, Math.round(coerceRating(l.review_count)));
  const stars = safeStarCount(l.star_rating);
  const imageSrc = resolveClientMediaSrc(l.image_url);
  const href = l.href || tourismListingHref(l);
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden flex flex-col"
    >
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-cyan-100 to-blue-100">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={l.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{catIcon[l.type]}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-bold px-2.5 py-1 rounded-full text-gray-700 shadow-sm">
          {catIcon[l.type]} {catLabel[l.type]}
        </div>
        {stars > 0 ? (
          <div className="absolute top-3 right-3 bg-amber-400 text-white text-xs font-black px-2 py-0.5 rounded-full">
            ★ {stars}
          </div>
        ) : null}
        {hasDiscount ? (
          <div className="absolute bottom-3 left-3 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
            İNDİRİM
          </div>
        ) : null}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-black text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-cyan-700 transition-colors leading-snug">
          {l.title}
        </h3>
        {l.city ? (
          <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
            <MapPin className="w-3 h-3" />
            {l.city}
          </div>
        ) : null}
        {ratingLabel && reviewCount > 0 ? (
          <div className="flex items-center gap-1 text-xs mb-2">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-bold text-gray-700">{ratingLabel}</span>
            <span className="text-gray-400">({reviewCount.toLocaleString("tr-TR")})</span>
          </div>
        ) : null}
        <div className="mt-auto pt-2 border-t border-gray-50">
          {l.map_business_fallback ? (
            <div className="text-cyan-700 font-black text-sm">Keşfet sayfasını görüntüle</div>
          ) : hasDiscount ? (
            <div className="text-gray-400 line-through text-xs">{basePrice.toLocaleString("tr-TR")}₺</div>
          ) : null}
          {!l.map_business_fallback ? (
            <div className="flex items-baseline gap-1">
              <span className="text-cyan-700 font-black text-xl">{safeNum(price).toLocaleString("tr-TR")}₺</span>
              <span className="text-gray-400 text-xs">/{PriceUnit(l.price_unit)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
