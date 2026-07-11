import { Link } from "wouter";
import { MapPin, Star, Heart } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { formatRating, coerceRating } from "@/lib/formatRating";
import { priceLevelToSymbols } from "../lib/googlePlaceMeta";
import type { EtkinlikEventResult } from "../lib/etkinlikEvents";
import { etkinlikDetailPath } from "../lib/etkinlikEvents";
import type { TourismListing } from "../hooks/useTourismListings";

const UNIT: Record<string, string> = {
  gece: "gece",
  gecelik: "gece",
  night: "gece",
  gun: "gün",
  gün: "gün",
  day: "gün",
  kisi: "kişi",
  kişi: "kişi",
  person: "kişi",
};

const TYPE_LABEL: Record<string, string> = {
  hotel: "Otel",
  villa: "Villa & Ev",
  car: "Araç",
  boat: "Yat/Tekne",
  tour: "Tur",
};

/** Harita kaynaklı ilanlarda fiyat yok — kullanıcıya veri kaynağı gösterilmez */
const FALLBACK_CTA: Record<string, string> = {
  hotel: "Detayları gör",
  villa: "İncele",
  car: "Detayları gör",
  boat: "Kiralamayı incele",
  tour: "Turu incele",
};

function safeStarCount(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(5, n);
}

function safePrice(value: string | null | undefined): string {
  const n = parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n.toLocaleString("tr-TR") : "0";
}

export function BookingCoreHomeCard({
  listing,
  featured,
}: {
  listing: TourismListing;
  featured?: boolean;
}) {
  const img = resolveClientMediaSrc(listing.image_url);
  const basePrice = parseFloat(String(listing.price ?? "0"));
  const salePrice = listing.sale_price ? parseFloat(String(listing.sale_price)) : NaN;
  const nightly =
    Number.isFinite(salePrice) && salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const hasNightlyPrice =
    listing.has_nightly_price ?? (Number.isFinite(nightly) && nightly > 0);
  const priceUnit = UNIT[listing.price_unit] || listing.price_unit || "gece";
  const href = listing.href || "#";
  const isExternal = Boolean(listing.external_booking || listing.hotellook_fallback);
  const currency = listing.price_currency || "TRY";
  const stars = safeStarCount(listing.star_rating);
  const ratingLabel = formatRating(listing.rating);
  const reviewCount = Math.max(0, Math.round(coerceRating(listing.review_count)));
  const isStayListing = listing.type === "hotel" || listing.type === "villa" || priceUnit === "gece";

  const cardInner = (
    <>
      <div className="bc-home-card__media">
        {img ? (
          <img src={img} alt={listing.title} loading="lazy" />
        ) : (
          <div className="bc-home-card__placeholder">{isExternal ? "🏨" : "🏨"}</div>
        )}
        {featured ? <span className="bc-home-card__badge">Öne Çıkanlar</span> : null}
        {isExternal ? <span className="bc-home-card__badge bc-home-card__badge--hl">Hotellook</span> : null}
        <button type="button" className="bc-home-card__fav" aria-label="Favorilere ekle" onClick={(e) => e.preventDefault()}>
          <Heart className="w-4 h-4" />
        </button>
      </div>
      <div className="bc-home-card__body">
        <span className="bc-home-card__type">{TYPE_LABEL[listing.type] || listing.type}</span>
        <h3>{listing.title}</h3>
        {listing.city || listing.address ? (
          <p className="bc-home-card__loc">
            <MapPin className="w-3.5 h-3.5" />
            {listing.city || listing.address}
          </p>
        ) : null}
        {stars > 0 ? (
          <p className="bc-home-card__stars" aria-label={`${stars} yıldız`}>
            {"★".repeat(stars)}
            <span className="bc-home-card__star-label">{stars} yıldız</span>
          </p>
        ) : ratingLabel && reviewCount > 0 ? (
          <p className="bc-home-card__rating">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {ratingLabel} ({reviewCount})
          </p>
        ) : null}
        {hasNightlyPrice ? (
          <p className="bc-home-card__price">
            {isStayListing ? <span className="bc-home-card__price-from">itibaren </span> : null}
            <strong>{safePrice(String(nightly))} {currency}</strong>
            <span> / {isStayListing ? "gece" : priceUnit}</span>
          </p>
        ) : listing.map_business_fallback ? (
          <p className="bc-home-card__price bc-home-card__cta">
            {priceLevelToSymbols(listing.price_level) ? (
              <span className="bc-home-card__price-level" title="Google fiyat seviyesi">
                {priceLevelToSymbols(listing.price_level)}
              </span>
            ) : null}
            <strong>{FALLBACK_CTA[listing.type] || "Detayları gör"}</strong>
          </p>
        ) : isExternal ? (
          <p className="bc-home-card__price bc-home-card__cta">
            <strong>Fiyatları gör</strong>
          </p>
        ) : (
          <p className="bc-home-card__price">
            <strong>{safePrice(String(listing.price))} ₺</strong>
            <span> / {priceUnit}</span>
          </p>
        )}
      </div>
    </>
  );

  if (isExternal && href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className="bc-home-card">
        {cardInner}
      </a>
    );
  }

  return (
    <Link href={href} className="bc-home-card">
      {cardInner}
    </Link>
  );
}

function formatEventDateShort(iso: string | null, tz: string): string {
  if (!iso) return "Tarih yakında";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      timeZone: tz || "Europe/Istanbul",
    });
  } catch {
    return d.toLocaleString("tr-TR", { day: "numeric", month: "short" });
  }
}

export function BookingCoreEventHomeCard({ event }: { event: EtkinlikEventResult }) {
  const href = etkinlikDetailPath(event);

  return (
    <Link href={href} className="bc-home-card bc-home-card--event">
      <div className="bc-home-card__media">
        {event.posterUrl ? (
          <img src={event.posterUrl} alt={event.name} loading="lazy" />
        ) : (
          <div className="bc-home-card__placeholder">🎫</div>
        )}
        <span className="bc-home-card__badge bc-home-card__badge--event">Etkinlik</span>
      </div>
      <div className="bc-home-card__body">
        <span className="bc-home-card__type">{event.category?.name || "Etkinlik"}</span>
        <h3>{event.name}</h3>
        <p className="bc-home-card__loc">
          <MapPin className="w-3.5 h-3.5" />
          {[event.venueName, event.venueCity].filter(Boolean).join(" · ") || "Konum yakında"}
        </p>
        <p className="bc-home-card__rating">{formatEventDateShort(event.startAt, event.timezone)}</p>
        <p className="bc-home-card__price">
          <strong>{event.isFree ? "Ücretsiz" : "Biletli"}</strong>
        </p>
      </div>
    </Link>
  );
}

export function BookingCoreDestinationTile({
  title,
  slug,
  image,
  listings,
  hotels,
  tours,
}: {
  title: string;
  slug: string;
  image: string;
  listings?: number;
  hotels?: number;
  tours?: number;
}) {
  const img = resolveClientMediaSrc(image) || image;
  return (
    <Link href={`/turizm/destinasyon/${slug}`} className="bc-dest-tile">
      <img src={img} alt={title} loading="lazy" />
      <div className="bc-dest-tile__overlay">
        <h3>{title.toUpperCase()}</h3>
        <p>
          {hotels ?? Math.max(1, Math.floor((listings ?? 12) * 0.4))} Otel · {tours ?? listings ?? 12} Tur
        </p>
      </div>
    </Link>
  );
}

export function BookingCoreBlogCard({
  title,
  category,
  date,
  image,
  href,
  excerpt,
}: {
  title: string;
  category: string;
  date: string;
  image: string;
  href: string;
  excerpt: string;
}) {
  const img = resolveClientMediaSrc(image) || image;
  return (
    <Link href={href} className="bc-blog-card">
      <img src={img} alt="" loading="lazy" />
      <div className="bc-blog-card__body">
        <p className="bc-blog-card__meta">
          {category} · {date}
        </p>
        <h3>{title}</h3>
        <p className="bc-blog-card__excerpt">{excerpt}</p>
        <span className="bc-blog-card__more">Devamını oku</span>
      </div>
    </Link>
  );
}

export function BookingCoreTestimonial({
  name,
  text,
  rating,
  avatar,
}: {
  name: string;
  text: string;
  rating: number;
  avatar?: string;
}) {
  return (
    <div className="bc-testimonial">
      <div className="bc-testimonial__head">
        <div className="bc-testimonial__avatar">{avatar ? <img src={avatar} alt="" /> : name[0]}</div>
        <div>
          <strong>{name}</strong>
          <p>{"★".repeat(rating)}</p>
        </div>
      </div>
      <p className="bc-testimonial__text">{text}</p>
    </div>
  );
}
