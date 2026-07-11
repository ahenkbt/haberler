import { Link } from "wouter";
import { MapPin, Star } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

export type VipVehicleCard = {
  id: number;
  name: string;
  segment: string;
  maxPassengers: number;
  maxLuggage: number;
  amenities: string[];
  imageUrl?: string | null;
  netPrice?: number;
  hourlyPrice?: number | null;
  kdvDahil?: boolean;
  slug?: string;
};

export type VipBusinessResult = {
  id: string;
  title: string;
  slug: string;
  city?: string;
  district?: string;
  image_url?: string | null;
  rating?: number;
  review_count?: number;
  vehicles?: VipVehicleCard[];
  vehicle_count?: number;
  price?: string;
  href?: string;
};

function formatTry(amount: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(amount);
}

function detailHref(biz: VipBusinessResult) {
  return biz.href || `${TURIZM.stubs.servis}/${encodeURIComponent(biz.slug)}`;
}

function minPrices(biz: VipBusinessResult) {
  const vehicles = biz.vehicles ?? [];
  let zone = 0;
  let hourly = 0;
  for (const v of vehicles) {
    const p = v.netPrice ?? 0;
    const h = v.hourlyPrice ?? 0;
    if (p > 0 && (zone === 0 || p < zone)) zone = p;
    if (h > 0 && (hourly === 0 || h < hourly)) hourly = h;
  }
  const parsed = parseFloat(String(biz.price ?? "0"));
  if (!zone && Number.isFinite(parsed) && parsed > 0) zone = parsed;
  return { zone, hourly };
}

export function TurizmVipVehicleCards({
  businesses,
  loading,
}: {
  businesses: VipBusinessResult[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bc-card-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bc-skeleton" />
        ))}
      </div>
    );
  }

  if (!businesses.length) return null;

  return (
    <div className="bc-card-grid">
      {businesses.map((biz) => {
        const vehicles = biz.vehicles ?? [];
        const vehicleCount = biz.vehicle_count ?? vehicles.length;
        const cover = resolveClientMediaSrc(biz.image_url || vehicles[0]?.imageUrl) || null;
        const { zone, hourly } = minPrices(biz);
        const segments = [...new Set(vehicles.map((v) => v.segment).filter(Boolean))].slice(0, 3);
        const href = detailHref(biz);
        const rating = Number(biz.rating ?? 0);
        const reviews = Number(biz.review_count ?? 0);

        return (
          <Link key={biz.id} href={href} className="bc-home-card bc-home-card--vip">
            <div className="bc-home-card__media">
              {cover ? (
                <img src={cover} alt={biz.title} loading="lazy" />
              ) : (
                <div className="bc-home-card__placeholder">🚘</div>
              )}
              {vehicleCount > 0 ? (
                <span className="bc-home-card__badge">{vehicleCount} araç tipi</span>
              ) : null}
            </div>
            <div className="bc-home-card__body">
              <span className="bc-home-card__type">VIP Transfer</span>
              <h3>{biz.title}</h3>
              {biz.city || biz.district ? (
                <p className="bc-home-card__loc">
                  <MapPin className="w-3.5 h-3.5" />
                  {[biz.city, biz.district].filter(Boolean).join(", ")}
                </p>
              ) : null}
              {rating > 0 ? (
                <p className="bc-home-card__rating">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {rating.toFixed(1)}
                  {reviews > 0 ? ` (${reviews})` : ""}
                </p>
              ) : null}
              {segments.length > 0 ? (
                <p className="bc-home-card__tags">{segments.join(" · ")}</p>
              ) : null}
              {zone > 0 || hourly > 0 ? (
                <p className="bc-home-card__price">
                  <span className="bc-home-card__price-from">itibaren </span>
                  <strong>{formatTry(zone || hourly)}</strong>
                  <span> / {hourly > 0 && !zone ? "saat" : "transfer"}</span>
                  <small className="bc-home-card__kdv">KDV dahil</small>
                </p>
              ) : (
                <p className="bc-home-card__price bc-home-card__cta">
                  <strong>Detayları gör</strong>
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
