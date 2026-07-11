import { useState, useRef, type SyntheticEvent } from "react";
import { Link } from "wouter";
import {
  MapPin,
  Star,
  Users,
  BedDouble,
  Maximize2,
  Wifi,
  Car,
  Utensils,
  Waves,
  CheckCircle,
  Phone,
  Mail,
  Globe,
  ChevronRight,
} from "lucide-react";
import "@/styles/bookingCoreTurizm.css";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { formatRating, coerceRating } from "@/lib/formatRating";
import { resolveHotelRules } from "../lib/hotelRules";
import { buildTourismReviewStub } from "../lib/tourismReviewStub";
import { tourismListingHref } from "../lib/listingRoutes";

const TOURISM_GALLERY_FALLBACK = "/assets/turizm-bc/hotel/hotel-featured-1.jpg";

function onGalleryImageError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  img.src = TOURISM_GALLERY_FALLBACK;
}

export interface BcDetailRoom {
  id: number;
  name: string;
  description: string | null;
  beds: number;
  adults: number;
  children: number;
  size_sqm: number | null;
  price: string;
  count: number;
  amenities: string[];
  image_url: string | null;
}

export interface BcItineraryDay {
  day: string;
  title: string;
  body: string;
}

export interface BcCarExtra {
  name: string;
  price: string;
  unit?: string;
}

export interface BcPriceInfoRow {
  label?: string;
  value?: string;
}

export interface BcYatportOwner {
  ownerName?: string | null;
  ownerCompany?: string | null;
  ownerMemberYears?: number | null;
  phone?: string | null;
  whatsapp?: string | null;
}

export interface BcYatportRezervasyon {
  rentalTypes?: string[];
  departurePoints?: string[];
  minHours?: number | null;
  maxGuests?: number | null;
  priceBreakdown?: Record<string, string | number | null>;
}

export interface BcDetailListing {
  id: number;
  type: string;
  title: string;
  slug: string;
  description: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  gallery: string[];
  amenities: string[];
  features: Record<string, string>;
  price: string;
  sale_price: string | null;
  price_unit: string;
  star_rating: number | null;
  capacity: number | null;
  rating: number | string;
  review_count: number;
  extra_info: Record<string, string>;
  vendor_name: string | null;
  vendor_phone: string | null;
  vendor_whatsapp: string | null;
  rooms?: BcDetailRoom[];
  itinerary?: BcItineraryDay[];
  duration_days?: number;
  duration_nights?: number;
  extras?: BcCarExtra[];
  pickup_info?: string;
  yatport_guvenlik?: string[];
  yatport_sartlar?: string[];
  yatport_rotalar?: string;
  yatport_rezervasyon?: BcYatportRezervasyon;
  yatport_genel_bilgiler?: Record<string, unknown>;
  yatport_owner?: BcYatportOwner;
  yatport_fiyat_bilgileri?: BcPriceInfoRow[];
}

export interface BcRelatedListing {
  id: number;
  title: string;
  slug: string;
  type: string;
  city: string | null;
  image_url: string | null;
  price: string;
  sale_price?: string | null;
  rating: number | string;
  review_count?: number;
}

export interface BcBookingFormState {
  name: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  notes: string;
}

const TYPE_LABELS: Record<string, string> = {
  hotel: "Otel",
  car: "Araç Kiralama",
  villa: "Villa & Ev",
  tour: "Tur",
  boat: "Yat Tekne Kiralama",
};

const PRICE_UNIT_LABELS: Record<string, string> = {
  night: "gece",
  day: "gün",
  hour: "saat",
  person: "kişi",
  gece: "gece",
  gün: "gün",
  saat: "saat",
  kişi: "kişi",
};

const FEATURES_TAB: Record<string, string> = {
  hotel: "Otel Özellikleri",
  villa: "Özellikler",
  car: "Araç Özellikleri",
  tour: "Tur Programı",
  boat: "Tekne Özellikleri",
};

type TabKey = "overview" | "features" | "location" | "reviews";

export type BcAvailabilityState = "idle" | "checking" | "available" | "unavailable";
export type BcRoomAvailabilityMap = Record<number, { available: boolean; reason?: string }>;

function amenityIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("wifi") || n.includes("wi-fi") || n.includes("internet")) return Wifi;
  if (n.includes("havuz") || n.includes("pool")) return Waves;
  if (n.includes("otopark") || n.includes("park")) return Car;
  if (n.includes("restoran") || n.includes("yemek") || n.includes("kahvalt")) return Utensils;
  return CheckCircle;
}

function formatMoney(val: number) {
  return val.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function availabilityStatusClass(state: BcAvailabilityState) {
  if (state === "available") return "bc-detail__avail-status bc-detail__avail-status--ok";
  if (state === "unavailable") return "bc-detail__avail-status bc-detail__avail-status--bad";
  return "bc-detail__avail-status bc-detail__avail-status--pending";
}

type Props = {
  listing: BcDetailListing;
  breadcrumbs: { label: string; href?: string }[];
  gallery: string[];
  activeImg: number;
  onActiveImgChange: (i: number) => void;
  selectedRoom: BcDetailRoom | null;
  onSelectRoom: (room: BcDetailRoom) => void;
  showForm: boolean;
  onShowForm: (show: boolean) => void;
  form: BcBookingFormState;
  onFormChange: (patch: Partial<BcBookingFormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
  sending: boolean;
  err: string;
  success: string;
  calcNights: () => number;
  calcTotal: () => number;
  relatedListings?: BcRelatedListing[];
  availabilityState?: BcAvailabilityState;
  availabilityMessage?: string;
  roomAvailability?: BcRoomAvailabilityMap;
  onCheckAvailability?: () => void;
  /** Doğrulanmış/sahiplenilmiş işletme mi? false ise rezervasyon kapalıdır. */
  reservationEnabled?: boolean;
  /** İşletme doğrulama / panel giriş bağlantısı (rezervasyon kapalıyken). */
  verifyHref?: string;
  /** Travelpayouts affiliate URL'si (varsa rezervasyon adımında harici siteye yönlendirir). */
  affiliateUrl?: string | null;
  /** Affiliate program adı (örn. "Hotellook"). */
  affiliateProgram?: string | null;
};

export function BookingCoreDetailLayout({
  listing,
  breadcrumbs,
  gallery,
  activeImg,
  onActiveImgChange,
  selectedRoom,
  onSelectRoom,
  showForm,
  onShowForm,
  form,
  onFormChange,
  onSubmit,
  sending,
  err,
  success,
  calcNights,
  calcTotal,
  relatedListings = [],
  availabilityState = "idle",
  availabilityMessage = "",
  roomAvailability = {},
  onCheckAvailability,
  reservationEnabled = true,
  verifyHref = "/isletme-giris",
  affiliateUrl = null,
  affiliateProgram = null,
}: Props) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [roomMode, setRoomMode] = useState<"book" | "enquiry">("book");
  const [boatAmenitiesExpanded, setBoatAmenitiesExpanded] = useState(false);
  const roomsRef = useRef<HTMLDivElement>(null);

  const ratingValue = coerceRating(listing.rating);
  const ratingLabel = formatRating(listing.rating);
  const reviewCount = Math.max(0, Math.round(coerceRating(listing.review_count)));
  const starCount =
    listing.star_rating != null
      ? Math.min(5, Math.max(0, Math.round(coerceRating(listing.star_rating))))
      : 0;
  const effectivePrice = parseFloat(String(listing.sale_price || listing.price || "0"));
  const hasRealPrice = Number.isFinite(effectivePrice) && effectivePrice > 0;
  const unitLabel = PRICE_UNIT_LABELS[listing.price_unit] || listing.price_unit;
  const typeLabel = TYPE_LABELS[listing.type] || listing.type;
  const featuresTabLabel = FEATURES_TAB[listing.type] || "Özellikler";
  const locationLine = [listing.district, listing.city].filter(Boolean).join(", ");
  const showStayDates = ["hotel", "villa", "boat"].includes(listing.type);
  const showSingleDate = ["car", "tour"].includes(listing.type);
  const hasRooms = listing.type === "hotel" && listing.rooms && listing.rooms.length > 0;
  const hotelRules = listing.type === "hotel" ? resolveHotelRules(listing.features, listing.extra_info) : null;
  const reviewBundle = buildTourismReviewStub(listing.slug || listing.id, listing.rating, listing.review_count);
  const relatedHotels = listing.type === "hotel" ? relatedListings : [];
  const isBoat = listing.type === "boat";
  const boatOwner = listing.yatport_owner;
  const boatGuvenlik = listing.yatport_guvenlik ?? [];
  const boatSartlar = listing.yatport_sartlar ?? [];
  const boatFiyatRows = listing.yatport_fiyat_bilgileri ?? [];
  const boatRezervasyon = listing.yatport_rezervasyon;
  const boatRotalar = (listing.yatport_rotalar ?? listing.extra_info?.yatport_rotalar ?? "").trim();
  const boatAmenities = listing.amenities ?? [];
  const visibleBoatAmenities = boatAmenitiesExpanded ? boatAmenities : boatAmenities.slice(0, 12);

  function scrollToRooms() {
    setTab("overview");
    roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCheckAvailability() {
    if (onCheckAvailability) {
      onCheckAvailability();
      return;
    }
    if (hasRooms) scrollToRooms();
    else onShowForm(true);
  }

  const availabilityStatusEl =
    availabilityState === "checking" ? (
      <p className={availabilityStatusClass("checking")}>Müsaitlik kontrol ediliyor…</p>
    ) : availabilityMessage ? (
      <p className={availabilityStatusClass(availabilityState)}>{availabilityMessage}</p>
    ) : null;

  const checkingAvailability = availabilityState === "checking";
  const datesUnavailable = availabilityState === "unavailable";

  const mapEmbed =
    listing.lat != null && listing.lng != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${listing.lng - 0.015}%2C${listing.lat - 0.01}%2C${listing.lng + 0.015}%2C${listing.lat + 0.01}&layer=mapnik&marker=${listing.lat}%2C${listing.lng}`
      : null;

  return (
    <div className="bc-yekpare bc-detail" data-listing-type={listing.type}>
      <div className="bc-detail__wrap">
        <nav className="bc-detail__breadcrumb" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="bc-detail__crumb">
              {crumb.href ? (
                <Link href={crumb.href}>{crumb.label}</Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
              {i < breadcrumbs.length - 1 ? <ChevronRight className="bc-detail__crumb-sep" /> : null}
            </span>
          ))}
        </nav>

        <header className="bc-detail__header">
          <div className="bc-detail__title-row">
            <div>
              <p className="bc-detail__type">{typeLabel}</p>
              <h1>{listing.title}</h1>
              {starCount > 0 ? (
                <div className="bc-detail__stars" aria-label={`${starCount} yıldız`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={s <= starCount ? "bc-detail__star bc-detail__star--on" : "bc-detail__star"}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            {ratingLabel ? (
              <div className="bc-detail__rating-badge">
                <strong>{ratingLabel}</strong>
                <span>/5</span>
              </div>
            ) : null}
          </div>
          {locationLine || listing.address ? (
            <p className="bc-detail__location">
              <MapPin className="bc-detail__loc-icon" />
              {[listing.address, locationLine].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </header>

        <div className="bc-detail__grid">
          <div className="bc-detail__main">
            {gallery.length > 0 ? (
              <div className="bc-detail__gallery">
                <div className="bc-detail__gallery-main">
                  <img src={gallery[activeImg]} alt={listing.title} onError={onGalleryImageError} />
                </div>
                {gallery.length > 1 ? (
                  <div className="bc-detail__gallery-thumbs">
                    {gallery.slice(0, 5).map((img, i) => (
                      <button
                        key={`${img}-${i}`}
                        type="button"
                        className={i === activeImg ? "bc-detail__thumb bc-detail__thumb--active" : "bc-detail__thumb"}
                        onClick={() => onActiveImgChange(i)}
                      >
                        <img src={img} alt="" onError={onGalleryImageError} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="bc-detail__tabs" role="tablist">
              {(
                [
                  ["overview", "Genel Bakış"],
                  ["features", featuresTabLabel],
                  ["location", "Konum"],
                  ["reviews", "Yorumlar"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? "bc-detail__tab bc-detail__tab--active" : "bc-detail__tab"}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="bc-detail__panel">
              {tab === "overview" && listing.description ? (
                <div className="bc-detail__section">
                  <p className="bc-detail__desc">{listing.description}</p>
                </div>
              ) : null}

              {tab === "features" && listing.amenities?.length > 0 ? (
                <div className="bc-detail__section">
                  <h2>{featuresTabLabel}</h2>
                  <div className="bc-detail__amenity-grid">
                    {listing.amenities.map((a) => {
                      const Icon = amenityIcon(a);
                      return (
                        <div key={a} className="bc-detail__amenity">
                          <Icon className="bc-detail__amenity-icon" />
                          <span>{a}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {tab === "features" && listing.type === "tour" && listing.itinerary && listing.itinerary.length > 0 ? (
                <div className="bc-detail__section">
                  <h2>Tur Programı</h2>
                  {(listing.duration_days || listing.duration_nights) ? (
                    <p className="bc-detail__meta">
                      {listing.duration_days ? `${listing.duration_days} gün` : ""}
                      {listing.duration_nights ? ` · ${listing.duration_nights} gece` : ""}
                    </p>
                  ) : null}
                  <div className="bc-detail__itinerary">
                    {listing.itinerary.map((step, i) => (
                      <div key={i} className="bc-detail__itinerary-day">
                        <div className="bc-detail__itinerary-label">{step.day}</div>
                        <div>
                          <strong>{step.title}</strong>
                          <p>{step.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {tab === "features" && listing.type === "car" ? (
                <div className="bc-detail__section">
                  <h2>Araç Bilgileri</h2>
                  {listing.pickup_info ? <p className="bc-detail__desc">{listing.pickup_info}</p> : null}
                  {listing.features && Object.keys(listing.features).length > 0 ? (
                    <div className="bc-detail__spec-grid">
                      {Object.entries(listing.features).map(([k, v]) =>
                        v ? (
                          <div key={k}>
                            <span className="bc-detail__spec-key">{k.replace(/_/g, " ")}</span>
                            <span className="bc-detail__spec-val">{String(v)}</span>
                          </div>
                        ) : null,
                      )}
                    </div>
                  ) : null}
                  {listing.extras && listing.extras.length > 0 ? (
                    <>
                      <h3>Opsiyonel ekstralar</h3>
                      <ul className="bc-detail__extras">
                        {listing.extras.map((ex, i) => (
                          <li key={i}>
                            <span>{ex.name}</span>
                            <strong>
                              +{formatMoney(parseFloat(ex.price || "0"))} ₺
                              {ex.unit ? ` / ${ex.unit}` : ""}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}

              {tab === "features" && isBoat ? (
                <>
                  {(boatOwner?.ownerName || boatOwner?.ownerCompany || listing.vendor_name) ? (
                    <div className="bc-detail__section">
                      <h2>İletişim</h2>
                      <div className="bc-detail__spec-grid">
                        {boatOwner?.ownerName ? (
                          <div>
                            <span className="bc-detail__spec-key">Yetkili</span>
                            <span className="bc-detail__spec-val">{boatOwner.ownerName}</span>
                          </div>
                        ) : null}
                        {(boatOwner?.ownerCompany || listing.vendor_name) ? (
                          <div>
                            <span className="bc-detail__spec-key">Firma</span>
                            <span className="bc-detail__spec-val">{boatOwner?.ownerCompany || listing.vendor_name}</span>
                          </div>
                        ) : null}
                        {boatOwner?.ownerMemberYears != null ? (
                          <div>
                            <span className="bc-detail__spec-key">Üyelik</span>
                            <span className="bc-detail__spec-val">{boatOwner.ownerMemberYears} yıl</span>
                          </div>
                        ) : null}
                        {(listing.vendor_phone || boatOwner?.phone) ? (
                          <div>
                            <span className="bc-detail__spec-key">Telefon</span>
                            <span className="bc-detail__spec-val">
                              <a href={`tel:${listing.vendor_phone || boatOwner?.phone}`}>
                                {listing.vendor_phone || boatOwner?.phone}
                              </a>
                            </span>
                          </div>
                        ) : null}
                        {(listing.vendor_whatsapp || boatOwner?.whatsapp) ? (
                          <div>
                            <span className="bc-detail__spec-key">WhatsApp</span>
                            <span className="bc-detail__spec-val">
                              <a
                                href={`https://wa.me/${String(listing.vendor_whatsapp || boatOwner?.whatsapp).replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {listing.vendor_whatsapp || boatOwner?.whatsapp}
                              </a>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {listing.features && Object.keys(listing.features).length > 0 ? (
                    <div className="bc-detail__section">
                      <h2>Genel Bilgiler</h2>
                      <div className="bc-detail__spec-grid">
                        {Object.entries(listing.features).map(([k, v]) =>
                          v ? (
                            <div key={k}>
                              <span className="bc-detail__spec-key">{k}</span>
                              <span className="bc-detail__spec-val">{String(v)}</span>
                            </div>
                          ) : null,
                        )}
                      </div>
                    </div>
                  ) : null}

                  {boatFiyatRows.length > 0 ? (
                    <div className="bc-detail__section">
                      <h2>Fiyat Bilgileri</h2>
                      <ul className="bc-detail__rules-list">
                        {boatFiyatRows.map((row, i) => (
                          <li key={`${row.label}-${i}`}>
                            <strong>{row.label ?? "—"}</strong>
                            <span>{row.value ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {boatAmenities.length > 0 ? (
                    <div className="bc-detail__section">
                      <h2>İmkanlar</h2>
                      <ul className="bc-detail__checklist">
                        {visibleBoatAmenities.map((a) => (
                          <li key={a}>
                            <CheckCircle className="bc-detail__check-icon" /> {a}
                          </li>
                        ))}
                      </ul>
                      {boatAmenities.length > 12 ? (
                        <button
                          type="button"
                          className="bc-detail__cancel-btn"
                          onClick={() => setBoatAmenitiesExpanded((v) => !v)}
                        >
                          {boatAmenitiesExpanded ? "Daha Az Göster" : `Daha Fazla Göster (${boatAmenities.length - 12})`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {boatSartlar.length > 0 ? (
                    <div className="bc-detail__section bc-detail__rules">
                      <h2>Kullanım Şartları</h2>
                      <ul className="bc-detail__rules-list">
                        {boatSartlar.map((s, i) => (
                          <li key={i}>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {boatGuvenlik.length > 0 ? (
                    <div className="bc-detail__section">
                      <h2>Güvenlik Ekipmanları</h2>
                      <ul className="bc-detail__checklist">
                        {boatGuvenlik.map((g) => (
                          <li key={g}>
                            <CheckCircle className="bc-detail__check-icon" /> {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {boatRotalar ? (
                    <div className="bc-detail__section">
                      <h2>Rotalar</h2>
                      <p className="bc-detail__desc">{boatRotalar}</p>
                    </div>
                  ) : null}

                  {boatRezervasyon ? (
                    <div className="bc-detail__section">
                      <h2>Rezervasyon Bilgileri</h2>
                      <div className="bc-detail__spec-grid">
                        {boatRezervasyon.rentalTypes?.length ? (
                          <div>
                            <span className="bc-detail__spec-key">Kiralama şekli</span>
                            <span className="bc-detail__spec-val">{boatRezervasyon.rentalTypes.join(", ")}</span>
                          </div>
                        ) : null}
                        {boatRezervasyon.departurePoints?.length ? (
                          <div>
                            <span className="bc-detail__spec-key">Kalkış noktası</span>
                            <span className="bc-detail__spec-val">{boatRezervasyon.departurePoints.join(", ")}</span>
                          </div>
                        ) : null}
                        {boatRezervasyon.minHours != null ? (
                          <div>
                            <span className="bc-detail__spec-key">Min. kiralama</span>
                            <span className="bc-detail__spec-val">{boatRezervasyon.minHours} saat</span>
                          </div>
                        ) : null}
                        {boatRezervasyon.maxGuests != null ? (
                          <div>
                            <span className="bc-detail__spec-key">Maks. misafir</span>
                            <span className="bc-detail__spec-val">{boatRezervasyon.maxGuests} kişi</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {tab === "location" ? (
                <div className="bc-detail__section">
                  <h2>Konum</h2>
                  <p className="bc-detail__desc">
                    {[listing.address, listing.district, listing.city].filter(Boolean).join(", ") ||
                      "Konum bilgisi yakında eklenecek."}
                  </p>
                  {mapEmbed ? (
                    <div className="bc-detail__map">
                      <iframe title="Konum haritası" src={mapEmbed} loading="lazy" />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {tab === "reviews" ? (
                <div className="bc-detail__section bc-detail__reviews">
                  <h2>Yorumlar</h2>
                  <div className="bc-detail__review-summary">
                    <div className="bc-detail__review-score">
                      <strong>{formatRating(reviewBundle.average) || ratingLabel || "—"}</strong>
                      <span>{reviewBundle.total} değerlendirme</span>
                    </div>
                    <div className="bc-detail__review-bars">
                      {reviewBundle.breakdown.map((row) => (
                        <div key={row.stars} className="bc-detail__review-bar">
                          <span>{row.stars} yıldız</span>
                          <div className="bc-detail__review-track">
                            <div className="bc-detail__review-fill" style={{ width: `${row.pct}%` }} />
                          </div>
                          <span>{row.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ul className="bc-detail__review-list">
                    {reviewBundle.reviews.map((rev) => (
                      <li key={rev.id} className="bc-detail__review-item">
                        <div className="bc-detail__review-head">
                          <strong>{rev.author}</strong>
                          <span>{rev.date}</span>
                          <span className="bc-detail__review-stars" aria-label={`${rev.rating} yıldız`}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={s <= rev.rating ? "bc-detail__star bc-detail__star--on" : "bc-detail__star"}
                              />
                            ))}
                          </span>
                        </div>
                        <p>{rev.text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {tab === "overview" && listing.amenities?.length > 0 ? (
                <div className="bc-detail__section">
                  <h2>{featuresTabLabel}</h2>
                  <div className="bc-detail__amenity-grid">
                    {listing.amenities.slice(0, 8).map((a) => {
                      const Icon = amenityIcon(a);
                      return (
                        <div key={a} className="bc-detail__amenity">
                          <Icon className="bc-detail__amenity-icon" />
                          <span>{a}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {tab === "overview" && hotelRules ? (
                <div className="bc-detail__section bc-detail__rules">
                  <h2>Otel Kuralları</h2>
                  <div className="bc-detail__rules-times">
                    <div>
                      <span>Giriş (check-in)</span>
                      <strong>{hotelRules.checkIn}</strong>
                    </div>
                    <div>
                      <span>Çıkış (check-out)</span>
                      <strong>{hotelRules.checkOut}</strong>
                    </div>
                  </div>
                  <ul className="bc-detail__rules-list">
                    {hotelRules.policies.map((p) => (
                      <li key={p.label}>
                        <strong>{p.label}</strong>
                        <span>{p.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {reservationEnabled && (showStayDates || showSingleDate) && !hasRooms ? (
              <div className="bc-detail__avail">
                <h2>Müsaitlik Kontrol</h2>
                <div className="bc-detail__avail-form">
                  {showStayDates ? (
                    <label>
                      <span>Giriş — Çıkış</span>
                      <div className="bc-detail__date-range">
                        <input
                          type="date"
                          value={form.checkIn}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => onFormChange({ checkIn: e.target.value })}
                        />
                        <input
                          type="date"
                          value={form.checkOut}
                          min={form.checkIn || new Date().toISOString().slice(0, 10)}
                          onChange={(e) => onFormChange({ checkOut: e.target.value })}
                        />
                      </div>
                    </label>
                  ) : (
                    <label>
                      <span>Tarih</span>
                      <input
                        type="date"
                        value={form.checkIn}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => onFormChange({ checkIn: e.target.value })}
                      />
                    </label>
                  )}
                  <label>
                    <span>Misafirler</span>
                    <select value={form.guests} onChange={(e) => onFormChange({ guests: e.target.value })}>
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} kişi
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="bc-detail__avail-btn"
                    onClick={handleCheckAvailability}
                    disabled={checkingAvailability}
                  >
                    {checkingAvailability ? "Kontrol ediliyor…" : "Müsaitlik ve Fiyatları Görüntüle"}
                  </button>
                  {availabilityStatusEl}
                </div>
              </div>
            ) : null}

            {reservationEnabled && hasRooms ? (
              <div className="bc-detail__rooms" ref={roomsRef}>
                <h2>Müsait Odalar</h2>
                <div className="bc-detail__room-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={roomMode === "book"}
                    className={roomMode === "book" ? "bc-detail__room-tab bc-detail__room-tab--active" : "bc-detail__room-tab"}
                    onClick={() => setRoomMode("book")}
                  >
                    Rezervasyon
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={roomMode === "enquiry"}
                    className={roomMode === "enquiry" ? "bc-detail__room-tab bc-detail__room-tab--active" : "bc-detail__room-tab"}
                    onClick={() => setRoomMode("enquiry")}
                  >
                    Bilgi Al
                  </button>
                </div>

                {roomMode === "book" ? (
                  <>
                    <div className="bc-detail__avail-form bc-detail__avail-form--rooms">
                      <label>
                        <span>Giriş — Çıkış</span>
                        <div className="bc-detail__date-range">
                          <input
                            type="date"
                            value={form.checkIn}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => onFormChange({ checkIn: e.target.value })}
                          />
                          <input
                            type="date"
                            value={form.checkOut}
                            min={form.checkIn || new Date().toISOString().slice(0, 10)}
                            onChange={(e) => onFormChange({ checkOut: e.target.value })}
                          />
                        </div>
                      </label>
                      <label>
                        <span>Misafirler</span>
                        <select value={form.guests} onChange={(e) => onFormChange({ guests: e.target.value })}>
                          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} kişi
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="bc-detail__avail-btn"
                        onClick={handleCheckAvailability}
                        disabled={checkingAvailability}
                      >
                        {checkingAvailability ? "Kontrol ediliyor…" : "Müsaitliği Kontrol Et"}
                      </button>
                      {availabilityStatusEl}
                    </div>
                    <div className="bc-detail__room-list">
                      {listing.rooms!.map((room) => {
                        const roomImg = resolveClientMediaSrc(room.image_url) || room.image_url;
                        const roomPrice = parseFloat(room.price || "0");
                        const roomAvail = roomAvailability[room.id];
                        const roomChecked = room.id in roomAvailability;
                        const roomIsUnavail = roomChecked && !roomAvail.available;
                        return (
                          <div
                            key={room.id}
                            className={
                              selectedRoom?.id === room.id
                                ? roomIsUnavail
                                  ? "bc-detail__room bc-detail__room--selected bc-detail__room--unavail"
                                  : "bc-detail__room bc-detail__room--selected"
                                : roomIsUnavail
                                  ? "bc-detail__room bc-detail__room--unavail"
                                  : "bc-detail__room"
                            }
                          >
                            <div className="bc-detail__room-media">
                              {roomImg ? (
                                <img src={roomImg} alt={room.name} />
                              ) : (
                                <div className="bc-detail__room-placeholder">🏨</div>
                              )}
                            </div>
                            <div className="bc-detail__room-body">
                              <strong>
                                {room.name}
                                {roomChecked ? (
                                  <span
                                    className={
                                      roomAvail.available
                                        ? "bc-detail__room-badge bc-detail__room-badge--ok"
                                        : "bc-detail__room-badge bc-detail__room-badge--bad"
                                    }
                                  >
                                    {roomAvail.available ? "Müsait" : roomAvail.reason || "Dolu"}
                                  </span>
                                ) : null}
                              </strong>
                              <div className="bc-detail__room-meta">
                                <span>
                                  <Users className="bc-detail__room-icon" /> {room.adults}
                                  {room.children > 0 ? `+${room.children}` : ""}
                                </span>
                                <span>
                                  <BedDouble className="bc-detail__room-icon" /> {room.beds}
                                </span>
                                {room.size_sqm ? (
                                  <span>
                                    <Maximize2 className="bc-detail__room-icon" /> {room.size_sqm} m²
                                  </span>
                                ) : null}
                              </div>
                              {room.amenities?.length ? (
                                <div className="bc-detail__room-amenities">
                                  {room.amenities.slice(0, 4).map((a) => {
                                    const Icon = amenityIcon(a);
                                    return (
                                      <span key={a}>
                                        <Icon className="bc-detail__room-icon" /> {a}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : null}
                              {room.description ? <p>{room.description}</p> : null}
                            </div>
                            <div className="bc-detail__room-action">
                              <div className="bc-detail__room-price">
                                <strong>{formatMoney(roomPrice)} ₺</strong>
                                <span>/ gece</span>
                              </div>
                              <button
                                type="button"
                                className="bc-detail__select-btn"
                                disabled={roomIsUnavail || checkingAvailability}
                                onClick={() => {
                                  onSelectRoom(room);
                                  onShowForm(true);
                                }}
                              >
                                Rezervasyon Yap
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="bc-detail__enquiry">
                    <p className="bc-detail__desc">
                      Tarih veya özel istekleriniz için doğrudan iletişime geçin; ekibimiz en kısa sürede dönüş yapar.
                    </p>
                    <button type="button" className="bc-detail__book-btn" onClick={() => onShowForm(true)}>
                      Bilgi Talebi Gönder
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {listing.lat != null && listing.lng != null && tab !== "location" ? (
              <div className="bc-detail__map bc-detail__map--bottom">
                <iframe title="Konum" src={mapEmbed!} loading="lazy" />
              </div>
            ) : null}
          </div>

          <aside className="bc-detail__sidebar">
            <div className="bc-detail__book">
              {!reservationEnabled && affiliateUrl ? (
                <div className="bc-detail__affiliate">
                  {hasRealPrice ? (
                    <div className="bc-detail__book-price">
                      <strong>{formatMoney(effectivePrice)} ₺</strong>
                      <span>/ {unitLabel}</span>
                    </div>
                  ) : null}
                  <p className="bc-detail__affiliate-note">
                    Müsaitlik ve güncel fiyatlar{affiliateProgram ? ` ${affiliateProgram}` : " partner sitesi"} üzerinden
                    sağlanır. Rezervasyonu tamamlamak için partner sitesine yönlendirileceksiniz.
                  </p>
                  <a
                    href={affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="bc-detail__book-btn bc-detail__affiliate-btn"
                  >
                    Müsaitlik &amp; fiyatları gör
                  </a>
                  <p className="bc-detail__affiliate-disclaimer">Partner bağlantısı · yeni sekmede açılır</p>
                </div>
              ) : !reservationEnabled ? (
                <div className="bc-detail__reservation-locked">
                  <h3>Bu işletme henüz rezervasyon almıyor</h3>
                  <p>
                    Rezervasyona açmak için işletme panelinden giriş yapın. İşletmenizi doğrulayıp
                    sahiplendiğinizde online rezervasyon alabilirsiniz.
                  </p>
                  <Link href={verifyHref} className="bc-detail__verify-btn">
                    İşletme panelinden giriş yap
                  </Link>
                  {listing.vendor_phone ? (
                    <a href={`tel:${listing.vendor_phone}`} className="bc-detail__contact-link">
                      <Phone className="bc-detail__contact-icon" /> İşletmeyi ara
                    </a>
                  ) : null}
                </div>
              ) : (
                <>
              {listing.sale_price && parseFloat(listing.sale_price) < parseFloat(listing.price) ? (
                <div className="bc-detail__book-was">{formatMoney(parseFloat(listing.price))} ₺</div>
              ) : null}
              {hasRealPrice ? (
                <div className="bc-detail__book-price">
                  <strong>{formatMoney(effectivePrice)} ₺</strong>
                  <span>/ {unitLabel}</span>
                </div>
              ) : (
                <div className="bc-detail__book-price bc-detail__book-price--enquiry">
                  <strong>Fiyat için bilgi alın</strong>
                </div>
              )}
              {selectedRoom && listing.type === "hotel" ? (
                <p className="bc-detail__book-room">Seçili oda: {selectedRoom.name}</p>
              ) : null}

              {success ? (
                <div className="bc-detail__success">
                  <CheckCircle className="bc-detail__success-icon" />
                  <p>{success}</p>
                </div>
              ) : !showForm ? (
                <button
                  type="button"
                  className="bc-detail__book-btn"
                  onClick={() => onShowForm(true)}
                  disabled={showStayDates && datesUnavailable}
                >
                  Rezervasyon Yap
                </button>
              ) : (
                <form className="bc-detail__book-form" onSubmit={onSubmit}>
                  <label>
                    <span>Ad Soyad *</span>
                    <input
                      value={form.name}
                      required
                      onChange={(e) => onFormChange({ name: e.target.value })}
                      placeholder="Adınız"
                    />
                  </label>
                  <label>
                    <span>Telefon *</span>
                    <input
                      value={form.phone}
                      required
                      type="tel"
                      onChange={(e) => onFormChange({ phone: e.target.value })}
                      placeholder="05XX XXX XX XX"
                    />
                  </label>
                  <label>
                    <span>E-posta</span>
                    <input
                      value={form.email}
                      type="email"
                      onChange={(e) => onFormChange({ email: e.target.value })}
                      placeholder="mail@example.com"
                    />
                  </label>
                  {showStayDates ? (
                    <div className="bc-detail__book-dates">
                      <label>
                        <span>Giriş</span>
                        <input
                          type="date"
                          value={form.checkIn}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => onFormChange({ checkIn: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Çıkış</span>
                        <input
                          type="date"
                          value={form.checkOut}
                          min={form.checkIn || new Date().toISOString().slice(0, 10)}
                          onChange={(e) => onFormChange({ checkOut: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : showSingleDate ? (
                    <label>
                      <span>Tarih</span>
                      <input
                        type="date"
                        value={form.checkIn}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => onFormChange({ checkIn: e.target.value })}
                      />
                    </label>
                  ) : null}
                  <label>
                    <span>Kişi sayısı</span>
                    <input
                      type="number"
                      min={1}
                      max={listing.capacity || 99}
                      value={form.guests}
                      onChange={(e) => onFormChange({ guests: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Notlar</span>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => onFormChange({ notes: e.target.value })}
                      placeholder="İstek veya sorularınız..."
                    />
                  </label>
                  {calcNights() > 0 ? (
                    <div className="bc-detail__book-total">
                      <span>
                        {formatMoney(effectivePrice)} ₺ × {calcNights()} {unitLabel}
                      </span>
                      <strong>{formatMoney(calcTotal())} ₺</strong>
                    </div>
                  ) : null}
                  {err ? <p className="bc-detail__err">{err}</p> : null}
                  <div className="bc-detail__book-actions">
                    <button type="button" className="bc-detail__cancel-btn" onClick={() => onShowForm(false)}>
                      İptal
                    </button>
                    <button type="submit" className="bc-detail__book-btn" disabled={sending || (showStayDates && datesUnavailable)}>
                      {sending ? "Gönderiliyor…" : "Rezervasyon Yap"}
                    </button>
                  </div>
                </form>
              )}

              {listing.vendor_phone ? (
                <a href={`tel:${listing.vendor_phone}`} className="bc-detail__contact-link">
                  <Phone className="bc-detail__contact-icon" /> Ara
                </a>
              ) : null}
                </>
              )}
            </div>

            {listing.amenities?.length > 0 ? (
              <div className="bc-detail__side-card">
                <h3>{featuresTabLabel}</h3>
                <ul className="bc-detail__checklist">
                  {listing.amenities.slice(0, 10).map((a) => (
                    <li key={a}>
                      <CheckCircle className="bc-detail__check-icon" /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="bc-detail__side-card">
              <h3>İletişim Bilgileri</h3>
              <ul className="bc-detail__contact-list">
                {listing.vendor_name ? (
                  <li>
                    <strong>{listing.vendor_name}</strong>
                  </li>
                ) : null}
                {listing.vendor_phone ? (
                  <li>
                    <Phone className="bc-detail__contact-icon" />
                    <a href={`tel:${listing.vendor_phone}`}>{listing.vendor_phone}</a>
                  </li>
                ) : null}
                {listing.extra_info?.email ? (
                  <li>
                    <Mail className="bc-detail__contact-icon" />
                    <a href={`mailto:${listing.extra_info.email}`}>{listing.extra_info.email}</a>
                  </li>
                ) : null}
                {listing.extra_info?.website ? (
                  <li>
                    <Globe className="bc-detail__contact-icon" />
                    <a href={listing.extra_info.website} target="_blank" rel="noopener noreferrer">
                      Web sitesi
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>

            {relatedHotels.length > 0 ? (
              <div className="bc-detail__side-card bc-detail__related">
                <h3>Benzer oteller</h3>
                <ul className="bc-detail__related-list">
                  {relatedHotels.map((rel) => {
                    const img = resolveClientMediaSrc(rel.image_url) || rel.image_url;
                    const relPrice = parseFloat(String(rel.sale_price || rel.price || "0"));
                    const relRating = formatRating(rel.rating);
                    return (
                      <li key={rel.id}>
                        <Link href={tourismListingHref(rel)} className="bc-detail__related-item">
                          <div className="bc-detail__related-thumb">
                            {img ? <img src={img} alt="" /> : <span>🏨</span>}
                          </div>
                          <div className="bc-detail__related-body">
                            <strong>{rel.title}</strong>
                            {rel.city ? <span>{rel.city}</span> : null}
                            <div className="bc-detail__related-meta">
                              {relRating ? <span>{relRating} ★</span> : null}
                              {relPrice > 0 ? <span>{formatMoney(relPrice)} ₺</span> : null}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
