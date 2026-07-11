import { useState, type SyntheticEvent, type FormEvent } from "react";
import { Link } from "wouter";
import {
  MapPin,
  Users,
  CheckCircle,
  Phone,
  ChevronRight,
  MessageCircle,
  Anchor,
  Ship,
  Heart,
  Share2,
  BedDouble,
  Bath,
  Ruler,
  Shield,
  Clock,
  BadgeCheck,
  Calendar,
  Minus,
  Plus,
  Star,
} from "lucide-react";
import "@/styles/bookingCoreTurizm.css";
import "@/styles/yatDetail.css";
import {
  type BcBookingFormState,
  type BcDetailListing,
  type BcRelatedListing,
} from "@/themes/bookingcore/components/BookingCoreDetailLayout";
import { tourismListingHref } from "@/themes/bookingcore/lib/listingRoutes";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { formatRating } from "@/lib/formatRating";
import { buildTourismReviewStub } from "@/themes/bookingcore/lib/tourismReviewStub";
import {
  isYatportListing,
  YATPORT_RENTAL_LABELS,
  type YatportListing,
  type YachtFeatureCategory,
  type YachtExtraService,
  type YachtFaqItem,
} from "@/themes/turizm/lib/yatportListing";

const YAT_GALLERY_FALLBACK = "/assets/turizm-bc/boat/boat-1.jpg";
const CONTACT_PHONE = "0850 000 00 00";

type TabKey = "overview" | "features" | "location" | "reviews";

function onYatGalleryError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  img.src = YAT_GALLERY_FALLBACK;
}

function formatMoney(val: number) {
  return val.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function buildTitle(listing: YatportListing): string {
  const genel = (listing.yatport_genel_bilgiler ?? {}) as Record<string, unknown>;
  const summary = listing.yacht_summary;
  const yil = summary?.yapimYili ?? genel.yapimYili;
  const tip = summary?.tekneTipi ?? genel.tekneTipi;
  const marka = summary?.marka ?? genel.marka;
  const kap = summary?.kapasite ?? genel.kapasite;
  const ilan = summary?.ilanNo ?? genel.ilanNo ?? listing.extra_info?.yatport_ilan_no;
  const parts = [
    yil ? `${yil} Model` : null,
    marka,
    tip,
    kap ? `${kap} Kişilik` : null,
    ilan ? `#${ilan}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : listing.title;
}

type Props = {
  listing: YatportListing;
  breadcrumbs: { label: string; href?: string }[];
  gallery: string[];
  form: BcBookingFormState;
  onFormChange: (patch: Partial<BcBookingFormState>) => void;
  onSubmit: (e: FormEvent) => void;
  sending: boolean;
  err: string;
  success: string;
  reservationEnabled?: boolean;
  verifyHref?: string;
  relatedListings?: BcRelatedListing[];
};

export function YatportDetailPage({
  listing,
  breadcrumbs,
  gallery,
  form,
  onFormChange,
  onSubmit,
  sending,
  err,
  success,
  reservationEnabled = true,
  verifyHref = "/isletme-giris",
  relatedListings = [],
}: Props) {
  const [activeImg, setActiveImg] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [descExpanded, setDescExpanded] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [fav, setFav] = useState(false);
  const [rentalType, setRentalType] = useState("");
  const [departurePoint, setDeparturePoint] = useState("");
  const [durationHours, setDurationHours] = useState("4");
  const [bringFood, setBringFood] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());

  const owner = listing.yatport_owner;
  const genel = (listing.yatport_genel_bilgiler ?? {}) as Record<string, unknown>;
  const summary = listing.yacht_summary;
  const rezervasyon = listing.yatport_rezervasyon;
  const featureCategories: YachtFeatureCategory[] = listing.yacht_feature_categories ?? [];
  const sunulanHizmetler: string[] = listing.yacht_sunulan_hizmetler ?? [];
  const ekstraHizmetler: YachtExtraService[] = listing.yacht_ekstra_hizmetler ?? [];
  const teknik = listing.yacht_teknik_detaylar ?? {};
  const faqItems: YachtFaqItem[] = listing.yacht_faq ?? [];
  const kdvDahil = listing.yacht_kdv_dahil !== false;
  const kaporaOrani = listing.yacht_kapora_orani ?? summary?.kaporaOrani;

  const rentalTypes = rezervasyon?.rentalTypes?.length
    ? rezervasyon.rentalTypes
    : ["saatlik"];
  const departurePoints = rezervasyon?.departurePoints?.length
    ? rezervasyon.departurePoints
    : String(listing.extra_info?.yatport_departure_points ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const effectiveRental = rentalType || rentalTypes[0] || "saatlik";
  const minHours = rezervasyon?.minHours ?? listing.yacht_extras?.minSureSaat ?? 2;
  const hours = Math.max(minHours, Number(durationHours) || minHours);
  const maxGuests = rezervasyon?.maxGuests ?? listing.capacity ?? 99;

  const hourlyPrice = parseFloat(String(listing.sale_price || listing.price || "0"));
  const unitPrice = hourlyPrice;
  const isHourly = effectiveRental.includes("saat");
  const estimatedTotal = isHourly && unitPrice > 0 ? unitPrice * hours : unitPrice > 0 ? unitPrice : 0;

  const locationLine = [listing.district, listing.city].filter(Boolean).join(", ");
  const whatsapp = listing.vendor_whatsapp || owner?.whatsapp;
  const phone = listing.vendor_phone || owner?.phone || CONTACT_PHONE;

  const ratingLabel = formatRating(listing.rating);
  const reviewBundle = buildTourismReviewStub(listing.slug || listing.id, listing.rating, listing.review_count);

  const visibleFeatureCats = featuresExpanded ? featureCategories : featureCategories.slice(0, 2);
  const totalFeatures = featureCategories.reduce((n, c) => n + c.items.length, 0);
  const visibleServices = servicesExpanded ? sunulanHizmetler : sunulanHizmetler.slice(0, 6);

  const related =
    relatedListings.length > 0
      ? relatedListings
      : ((listing as YatportListing & { related_listings?: BcRelatedListing[] }).related_listings ?? []);

  const mapEmbed =
    listing.lat != null && listing.lng != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${listing.lng - 0.015}%2C${listing.lat - 0.01}%2C${listing.lng + 0.015}%2C${listing.lat + 0.01}&layer=mapnik&marker=${listing.lat}%2C${listing.lng}`
      : null;

  if (!isYatportListing(listing)) return null;

  function handleBookingSubmit(e: FormEvent) {
    const notes = [
      form.notes,
      rentalTypes.length ? `Kiralama: ${YATPORT_RENTAL_LABELS[effectiveRental] ?? effectiveRental}` : null,
      departurePoint || departurePoints[0] ? `Kalkış: ${departurePoint || departurePoints[0]}` : null,
      form.checkIn ? `Tarih: ${form.checkIn}` : null,
      isHourly ? `Süre: ${hours} saat` : null,
      bringFood ? "Yemek/İçecek getireceğim" : null,
      selectedExtras.size ? `Ekstra: ${[...selectedExtras].join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    onFormChange({ notes });
    onSubmit(e);
  }

  function adjustGuests(delta: number) {
    const cur = Number(form.guests) || 1;
    onFormChange({ guests: String(Math.min(maxGuests, Math.max(1, cur + delta))) });
  }

  function adjustHours(delta: number) {
    setDurationHours(String(Math.min(24, Math.max(minHours, hours + delta))));
  }

  const pageTitle = buildTitle(listing);

  return (
    <div className="bc-yekpare bc-detail bc-detail--yatport" data-listing-type="boat">
      <div className="bc-detail__wrap">
        <div className="yat-detail__topbar">
          <nav className="bc-detail__breadcrumb" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="bc-detail__crumb">
                {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
                {i < breadcrumbs.length - 1 ? <ChevronRight className="bc-detail__crumb-sep" /> : null}
              </span>
            ))}
          </nav>
          <div className="yat-detail__actions">
            <button type="button" className="yat-detail__icon-btn" onClick={() => setFav((v) => !v)}>
              <Heart size={16} fill={fav ? "#ff4d6d" : "none"} color={fav ? "#ff4d6d" : undefined} /> Favori
            </button>
            <button
              type="button"
              className="yat-detail__icon-btn"
              onClick={() => navigator.share?.({ title: listing.title, url: window.location.href }).catch(() => {})}
            >
              <Share2 size={16} /> Paylaş
            </button>
          </div>
        </div>

        <header className="bc-detail__header">
          <div className="bc-detail__title-row">
            <div>
              <p className="bc-detail__type">Yat & Tekne Kiralama</p>
              <h1>{pageTitle}</h1>
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
              <div className="bc-detail__gallery yat-detail__gallery-compact">
                <div className="bc-detail__gallery-main">
                  <img src={gallery[activeImg]} alt={pageTitle} onError={onYatGalleryError} />
                  {gallery.length > 1 ? (
                    <button type="button" className="yat-detail__gallery-all" onClick={() => setGalleryOpen(true)}>
                      Tüm Fotoğrafları Görüntüle ({gallery.length})
                    </button>
                  ) : null}
                </div>
                {gallery.length > 1 ? (
                  <div className="bc-detail__gallery-thumbs">
                    {gallery.slice(0, 5).map((img, i) => (
                      <button
                        key={`${img}-${i}`}
                        type="button"
                        className={i === activeImg ? "bc-detail__thumb bc-detail__thumb--active" : "bc-detail__thumb"}
                        onClick={() => setActiveImg(i)}
                      >
                        <img src={img} alt="" onError={onYatGalleryError} />
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
                  ["features", "Özellikler"],
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
              {tab === "overview" ? (
                <>
                  {listing.description ? (
                    <div className="bc-detail__section">
                      <h2>Açıklama</h2>
                      <p className={`bc-detail__desc${descExpanded ? "" : " yat-detail__desc--clamp"}`}>{listing.description}</p>
                      {listing.description.length > 200 ? (
                        <button type="button" className="bc-detail__link-btn" onClick={() => setDescExpanded((v) => !v)}>
                          {descExpanded ? "Daha Az Göster" : "Devamını Oku"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="yat-detail__contact-banner">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex" }}>
                        {["AY", "MK", "ST"].map((initials, i) => (
                          <span
                            key={initials}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "#5191fa",
                              border: "2px solid #fff",
                              marginLeft: i ? -8 : 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {initials}
                          </span>
                        ))}
                      </div>
                      <div>
                        <strong>Uzman ekibimiz yardımcı olsun</strong>
                        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>{owner?.ownerCompany || listing.vendor_name}</p>
                      </div>
                    </div>
                    <a href={`tel:${String(phone).replace(/\s/g, "")}`} className="yat-detail__contact-cta">
                      <Phone size={18} /> Bizi Arayın {phone}
                    </a>
                  </div>

                  <div className="yat-detail__trust">
                    <div className="yat-detail__trust-item">
                      <Shield size={20} style={{ display: "block", margin: "0 auto 6px", color: "#5191fa" }} />
                      Rezervasyon Koruması
                    </div>
                    <div className="yat-detail__trust-item">
                      <CheckCircle size={20} style={{ display: "block", margin: "0 auto 6px", color: "#22c55e" }} />
                      İlan Doğruluğu
                    </div>
                    <div className="yat-detail__trust-item">
                      <Clock size={20} style={{ display: "block", margin: "0 auto 6px", color: "#5191fa" }} />
                      7/24 Destek
                    </div>
                  </div>

                  {faqItems.length > 0 ? (
                    <div className="bc-detail__section yat-detail__faq">
                      <h2>Sık Sorulan Sorular</h2>
                      {faqItems.map((item, i) => (
                        <details key={item.question} open={openFaq === i}>
                          <summary onClick={() => setOpenFaq(openFaq === i ? null : i)}>{item.question}</summary>
                          <p>{item.answer}</p>
                        </details>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}

              {tab === "features" ? (
                <>
                  {featureCategories.length > 0 ? (
                    <div className="bc-detail__section">
                      <h2>Teknenin Özellikleri</h2>
                      <div className="yat-detail__feature-cats">
                        {visibleFeatureCats.map((cat) => (
                          <div key={cat.category} className="yat-detail__feature-cat">
                            <h3>{cat.category}</h3>
                            <ul className="yat-detail__feature-list">
                              {cat.items.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      {totalFeatures > 8 ? (
                        <button type="button" className="bc-detail__link-btn" onClick={() => setFeaturesExpanded((v) => !v)}>
                          {featuresExpanded ? "Daha Az Göster" : `Tüm Özellikleri Görüntüle (${totalFeatures})`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {sunulanHizmetler.length > 0 ? (
                    <div className="bc-detail__section">
                      <h2>Sunulan Hizmetler</h2>
                      <div className="yat-detail__services">
                        {visibleServices.map((s) => (
                          <span key={s} className="yat-detail__service-chip">
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                      {sunulanHizmetler.length > 6 ? (
                        <button type="button" className="bc-detail__link-btn" onClick={() => setServicesExpanded((v) => !v)}>
                          {servicesExpanded ? "Daha Az" : "Tümünü Gör"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {ekstraHizmetler.length > 0 ? (
                    <div className="bc-detail__section">
                      <h2>Ekstra Hizmetler</h2>
                      {ekstraHizmetler.map((ex) => (
                        <div key={ex.name} className="yat-detail__extra-row">
                          <div>
                            <strong>{ex.name}</strong>
                            {ex.description ? (
                              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#697488" }}>{ex.description}</p>
                            ) : null}
                            <span style={{ fontSize: "0.85rem", color: "#5191fa", fontWeight: 700 }}>
                              ₺{formatMoney(ex.pricePerPerson)} / kişi
                            </span>
                          </div>
                          <button
                            type="button"
                            className="yat-detail__extra-select"
                            onClick={() =>
                              setSelectedExtras((prev) => {
                                const next = new Set(prev);
                                if (next.has(ex.name)) next.delete(ex.name);
                                else next.add(ex.name);
                                return next;
                              })
                            }
                          >
                            {selectedExtras.has(ex.name) ? "Seçildi" : "Seç"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="bc-detail__section">
                    <h2>Teknik Detaylar</h2>
                    <div className="yat-detail__tech-grid">
                      <div>
                        <h3>Tekne Bilgileri</h3>
                        {[
                          ["Marka", teknik.marka ?? genel.marka],
                          ["Model", teknik.model ?? genel.model],
                          ["Yapım Yılı", teknik.yapimYili ?? genel.yapimYili],
                          ["Uzunluk", teknik.uzunluk ? `${teknik.uzunluk} m` : null],
                          ["Kabin", teknik.kabin ?? genel.kabinSayisi],
                          ["Yakıt Dahil", teknik.yakitDahil ? "Evet" : teknik.yakitDahil === false ? "Hayır" : "Evet"],
                        ]
                          .filter(([, v]) => v != null && v !== "")
                          .map(([k, v]) => (
                            <div key={String(k)} className="yat-detail__tech-row">
                              <span>{String(k)}</span>
                              <strong>{String(v)}</strong>
                            </div>
                          ))}
                      </div>
                      <div>
                        <h3>Mürettebat Bilgileri</h3>
                        {[
                          ["Kaptan", summary?.kaptanli !== false ? "Kaptanlı" : "Kaptansız"],
                          ["Mürettebat", teknik.murettebatSayisi ?? genel.murettebat],
                          ["Kapasite", summary?.kapasite ?? genel.kapasite],
                        ]
                          .filter(([, v]) => v != null && v !== "")
                          .map(([k, v]) => (
                            <div key={String(k)} className="yat-detail__tech-row">
                              <span>{String(k)}</span>
                              <strong>{String(v)}</strong>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
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
            </div>

            {related.length > 0 ? (
              <section className="yat-detail__related">
                <h2>Bu Tekneyi İnceleyenler Şunları da Görüntüledi</h2>
                <div className="yat-detail__related-track">
                  {related.map((r) => {
                    const img = resolveClientMediaSrc(r.image_url) || YAT_GALLERY_FALLBACK;
                    const ys = (r as BcRelatedListing & { yacht_summary?: { price?: number; kapasite?: number } }).yacht_summary;
                    const price = ys?.price ?? parseFloat(String(r.price ?? "0"));
                    return (
                      <Link key={r.slug} href={tourismListingHref(r)} className="yat-detail__related-card">
                        <img src={img} alt={r.title} onError={onYatGalleryError} />
                        <div className="yat-detail__related-body">
                          <strong style={{ fontSize: "0.9rem" }}>{r.title}</strong>
                          {price > 0 ? (
                            <p style={{ margin: "4px 0 0", color: "#5191fa", fontWeight: 700 }}>
                              ₺{formatMoney(price)}/saat
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="bc-detail__sidebar" id="yat-book">
            <div className="bc-detail__book">
              <h3 className="bc-detail__book-title">Rezervasyon</h3>
              {unitPrice > 0 ? (
                <div className="bc-detail__book-price">
                  <strong>₺{formatMoney(unitPrice)}</strong>
                  <span>/ {isHourly ? "Saatlik" : "Günlük"}</span>
                </div>
              ) : (
                <div className="bc-detail__book-price bc-detail__book-price--enquiry">
                  <strong>Fiyat için bilgi alın</strong>
                </div>
              )}

              {!reservationEnabled ? (
                <div className="bc-detail__reservation-locked">
                  <p>Online rezervasyon henüz aktif değil. Talep formu veya telefon ile ulaşın.</p>
                  <Link href={verifyHref} className="bc-detail__verify-btn">
                    İşletme Paneli
                  </Link>
                </div>
              ) : success ? (
                <div className="bc-detail__success">
                  <CheckCircle className="bc-detail__success-icon" />
                  <p>{success}</p>
                </div>
              ) : (
                <form className="bc-detail__book-form" onSubmit={handleBookingSubmit}>
                  <label>
                    <span>
                      <Calendar size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                      Tarih Seçiniz
                    </span>
                    <input
                      type="date"
                      value={form.checkIn}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => onFormChange({ checkIn: e.target.value })}
                    />
                  </label>

                  {departurePoints.length > 0 ? (
                    <label>
                      <span>Liman Seçiniz</span>
                      <select value={departurePoint || departurePoints[0]} onChange={(e) => setDeparturePoint(e.target.value)}>
                        {departurePoints.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label>
                    <span>Yolcu Sayısı</span>
                    <div className="yat-detail__counter">
                      <button type="button" onClick={() => adjustGuests(-1)}>
                        <Minus size={14} />
                      </button>
                      <span style={{ minWidth: 32, textAlign: "center", fontWeight: 700 }}>{form.guests}</span>
                      <button type="button" onClick={() => adjustGuests(1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </label>

                  {isHourly ? (
                    <label>
                      <span>Süre (Saat)</span>
                      <div className="yat-detail__counter">
                        <button type="button" onClick={() => adjustHours(-1)}>
                          <Minus size={14} />
                        </button>
                        <span style={{ minWidth: 32, textAlign: "center", fontWeight: 700 }}>{hours}</span>
                        <button type="button" onClick={() => adjustHours(1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                    </label>
                  ) : null}

                  <label className="yat-filter-check" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={bringFood} onChange={(e) => setBringFood(e.target.checked)} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#1a2b48" }}>Yemek/İçecek getireceğim</span>
                  </label>

                  <label>
                    <span>Ad Soyad *</span>
                    <input value={form.name} required onChange={(e) => onFormChange({ name: e.target.value })} />
                  </label>
                  <label>
                    <span>Telefon *</span>
                    <input value={form.phone} required type="tel" onChange={(e) => onFormChange({ phone: e.target.value })} />
                  </label>

                  {estimatedTotal > 0 ? (
                    <div className="bc-detail__book-total">
                      <span>
                        ₺{formatMoney(unitPrice)} × {isHourly ? `${hours} saat` : "1 gün"}
                      </span>
                      <strong>₺{formatMoney(estimatedTotal)}</strong>
                    </div>
                  ) : null}

                  {err ? <p className="yat-detail__err">{err}</p> : null}

                  <button type="submit" className="bc-detail__book-btn" disabled={sending}>
                    <Anchor size={18} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                    {sending ? "Gönderiliyor…" : "Rezervasyon Talep Et"}
                  </button>

                  {kdvDahil ? <p className="yat-detail__kdv">Fiyatlara KDV dahildir</p> : null}
                  {kaporaOrani ? (
                    <a href="#iptal" className="yat-detail__cancel-link">
                      Ücretsiz İptal Şartı · %{kaporaOrani} kapora
                    </a>
                  ) : (
                    <a href="#iptal" className="yat-detail__cancel-link">
                      Ücretsiz İptal Şartı
                    </a>
                  )}

                  {whatsapp ? (
                    <a
                      href={`https://wa.me/90${String(whatsapp).replace(/\D/g, "").replace(/^90/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bc-detail__book-btn bc-detail__book-btn--secondary"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}
                    >
                      <MessageCircle size={18} /> WhatsApp
                    </a>
                  ) : null}
                </form>
              )}
            </div>

            <div className="bc-detail__side-card">
              <h3>Tekne Özeti</h3>
              <ul className="bc-detail__checklist bc-detail__checklist--compact">
                {(summary?.kapasite ?? genel.kapasite) ? (
                  <li>
                    <Users size={16} className="bc-detail__check-icon" />
                    Kapasite: {String(summary?.kapasite ?? genel.kapasite ?? "")} kişi
                  </li>
                ) : null}
                <li>
                  <Ship size={16} className="bc-detail__check-icon" />
                  {summary?.kaptanli !== false ? "Kaptanlı" : "Kaptansız"}
                </li>
                {(summary?.uzunluk ?? genel.uzunluk) ? (
                  <li>
                    <Ruler size={16} className="bc-detail__check-icon" />
                    Uzunluk: {String(summary?.uzunluk ?? genel.uzunluk ?? "")} m
                  </li>
                ) : null}
                {(summary?.kabin ?? genel.kabinSayisi) != null ? (
                  <li>
                    <BedDouble size={16} className="bc-detail__check-icon" />
                    Kabin: {String(summary?.kabin ?? genel.kabinSayisi ?? "")}
                  </li>
                ) : null}
                {(summary?.wc ?? genel.wcSayisi) != null ? (
                  <li>
                    <Bath size={16} className="bc-detail__check-icon" />
                    WC: {String(summary?.wc ?? genel.wcSayisi ?? "")}
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="bc-detail__side-card">
              <div className="yat-detail__verify" style={{ marginBottom: 0 }}>
                <BadgeCheck size={18} />
                <span>Doğrulanmış ilan · Rezervasyon koruması aktif</span>
              </div>
              <ul className="bc-detail__contact-list" style={{ marginTop: "0.75rem" }}>
                <li>
                  <Phone className="bc-detail__contact-icon" />
                  <a href={`tel:${String(phone).replace(/\s/g, "")}`}>{phone}</a>
                </li>
                {owner?.ownerCompany || listing.vendor_name ? (
                  <li>
                    <span>{owner?.ownerCompany || listing.vendor_name}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {galleryOpen ? (
        <div className="yat-detail__gallery-modal" onClick={() => setGalleryOpen(false)}>
          <button type="button" className="yat-detail__gallery-modal-close" onClick={() => setGalleryOpen(false)}>
            ✕
          </button>
          <img src={gallery[activeImg]} alt="" onClick={(e) => e.stopPropagation()} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImg((i) => (i - 1 + gallery.length) % gallery.length);
              }}
            >
              ‹
            </button>
            <span style={{ color: "#fff" }}>
              {activeImg + 1} / {gallery.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImg((i) => (i + 1) % gallery.length);
              }}
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type { BcDetailListing };
