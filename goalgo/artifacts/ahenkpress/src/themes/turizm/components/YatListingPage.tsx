import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  MapPin,
  Users,
  BedDouble,
  Bath,
  Ruler,
  Heart,
  Phone,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { BookingCoreShell } from "@/themes/bookingcore/BookingCoreShell";
import { TurizmCategoryPageFooter } from "@/themes/turizm/TurizmCategoryIntro";
import { TurizmCategoryHubHero } from "@/themes/turizm/TurizmCategoryHubHero";
import { BookingCoreHeroSearch } from "@/themes/bookingcore/components/BookingCoreHeroSearch";
import { useTurizmCms } from "@/themes/turizm/useTurizmCms";
import { fetchTourismListingsWithMeta } from "@/themes/bookingcore/lib/fetchTourismListings";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { tourismListingHref } from "@/themes/bookingcore/lib/listingRoutes";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { YATPORT_RENTAL_LABELS } from "@/themes/turizm/lib/yatportListing";
import "@/styles/yatListing.css";

const YAT_FALLBACK_IMG = "/assets/turizm-bc/boat/boat-1.jpg";
const CONTACT_PHONE = "0850 000 00 00";

export type YatFilterState = {
  activeOnly: boolean;
  availableOnly: boolean;
  priceMin: string;
  priceMax: string;
  rentalType: "gunluk" | "saatlik" | "haftalik" | "";
  guests: number;
  cabins: number;
  yearMin: string;
  yearMax: string;
  kaptanli: boolean;
  kaptansiz: boolean;
  lengthMin: string;
  lengthMax: string;
  sort: "recommended" | "popular" | "price-high" | "price-low";
};

const DEFAULT_YAT_FILTERS: YatFilterState = {
  activeOnly: true,
  availableOnly: false,
  priceMin: "",
  priceMax: "",
  rentalType: "saatlik",
  guests: 0,
  cabins: 0,
  yearMin: "",
  yearMax: "",
  kaptanli: false,
  kaptansiz: false,
  lengthMin: "",
  lengthMax: "",
  sort: "recommended",
};

type YachtSummary = {
  marka?: string;
  tekneTipi?: string;
  kapasite?: number;
  kabin?: number;
  wc?: number;
  uzunluk?: number;
  kaptanli?: boolean;
  rentalType?: string;
  kaporaOrani?: number;
  price?: number;
  priceUnit?: string;
};

type YatListing = {
  id: number | string;
  title: string;
  slug: string;
  type: string;
  city?: string | null;
  district?: string | null;
  image_url?: string | null;
  gallery?: string[];
  price?: string;
  price_unit?: string;
  yacht_summary?: YachtSummary;
  yatport_genel_bilgiler?: Record<string, unknown>;
};

function filtersToApiParams(f: YatFilterState): URLSearchParams {
  const q = new URLSearchParams();
  if (f.priceMin) q.set("priceMin", f.priceMin);
  if (f.priceMax) q.set("priceMax", f.priceMax);
  if (f.guests > 0) q.set("capacityMin", String(f.guests));
  if (f.cabins > 0) q.set("cabinMin", String(f.cabins));
  if (f.yearMin) q.set("yearMin", f.yearMin);
  if (f.yearMax) q.set("yearMax", f.yearMax);
  if (f.lengthMin) q.set("lengthMin", f.lengthMin);
  if (f.lengthMax) q.set("lengthMax", f.lengthMax);
  if (f.rentalType) q.set("rentalType", f.rentalType);
  if (f.kaptanli) q.set("kaptanli", "1");
  if (f.kaptansiz) q.set("kaptansiz", "1");
  if (f.activeOnly) q.set("activeOnly", "1");
  if (f.sort !== "recommended") q.set("sort", f.sort);
  return q;
}

function filtersFromSearchParams(qs: URLSearchParams): YatFilterState {
  return {
    ...DEFAULT_YAT_FILTERS,
    priceMin: qs.get("priceMin") ?? "",
    priceMax: qs.get("priceMax") ?? "",
    rentalType: (qs.get("rentalType") as YatFilterState["rentalType"]) || "saatlik",
    guests: Number(qs.get("capacityMin") ?? qs.get("guests") ?? "0") || 0,
    cabins: Number(qs.get("cabinMin") ?? "0") || 0,
    yearMin: qs.get("yearMin") ?? "",
    yearMax: qs.get("yearMax") ?? "",
    lengthMin: qs.get("lengthMin") ?? "",
    lengthMax: qs.get("lengthMax") ?? "",
    kaptanli: qs.get("kaptanli") === "1",
    kaptansiz: qs.get("kaptansiz") === "1",
    activeOnly: qs.get("activeOnly") !== "0",
    sort: (qs.get("sort") as YatFilterState["sort"]) || "recommended",
  };
}

function listingSummary(listing: YatListing): YachtSummary {
  const s = listing.yacht_summary ?? {};
  const genel = listing.yatport_genel_bilgiler ?? {};
  const kap = s.kapasite ?? (genel.kapasite != null ? Number(genel.kapasite) : undefined);
  const kabin = s.kabin ?? (genel.kabinSayisi != null ? Number(genel.kabinSayisi) : undefined);
  const wc = s.wc ?? (genel.wcSayisi != null ? Number(genel.wcSayisi) : undefined);
  const uzunluk = s.uzunluk ?? (genel.uzunluk != null ? Number(genel.uzunluk) : undefined);
  return {
    marka: s.marka ?? String(genel.marka ?? ""),
    tekneTipi: s.tekneTipi ?? String(genel.tekneTipi ?? ""),
    kapasite: kap,
    kabin,
    wc,
    uzunluk,
    kaptanli: s.kaptanli !== false,
    rentalType: s.rentalType ?? "saatlik",
    kaporaOrani: s.kaporaOrani,
    price: s.price ?? (parseFloat(String(listing.price ?? "0")) || undefined),
    priceUnit: s.priceUnit ?? listing.price_unit ?? "saat",
  };
}

function cardTitle(listing: YatListing, summary: YachtSummary): string {
  const parts = [summary.marka, summary.tekneTipi].filter(Boolean);
  return parts.length ? parts.join(" - ") : listing.title;
}

function formatPrice(val: number) {
  return val.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function YatFilterPanel({
  draft,
  onChange,
  onApply,
  onReset,
}: {
  draft: YatFilterState;
  onChange: (patch: Partial<YatFilterState>) => void;
  onApply: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="yat-list__filters">
      <h2>Filtreler</h2>

      <div className="yat-filter-group">
        <label className="yat-filter-check">
          <input
            type="checkbox"
            checked={draft.activeOnly}
            onChange={(e) => onChange({ activeOnly: e.target.checked })}
          />
          Sadece Aktif Tekneleri Göster
        </label>
        <label className="yat-filter-check">
          <input
            type="checkbox"
            checked={draft.availableOnly}
            onChange={(e) => onChange({ availableOnly: e.target.checked })}
          />
          Sadece uygun olanları göster
        </label>
      </div>

      <div className="yat-filter-group">
        <span>Fiyat Aralığı (Günlük)</span>
        <div className="yat-filter-row">
          <input
            type="number"
            placeholder="Min"
            value={draft.priceMin}
            onChange={(e) => onChange({ priceMin: e.target.value })}
          />
          <input
            type="number"
            placeholder="Max"
            value={draft.priceMax}
            onChange={(e) => onChange({ priceMax: e.target.value })}
          />
        </div>
      </div>

      <div className="yat-filter-group">
        <span>Kiralama Tipi</span>
        <div className="yat-filter-radios">
          {(["gunluk", "saatlik", "haftalik"] as const).map((rt) => (
            <label key={rt} className="yat-filter-check">
              <input
                type="radio"
                name="rentalType"
                checked={draft.rentalType === rt}
                onChange={() => onChange({ rentalType: rt })}
              />
              {YATPORT_RENTAL_LABELS[rt] ?? rt}
            </label>
          ))}
        </div>
      </div>

      <div className="yat-filter-group">
        <span>Yolcu Sayısı</span>
        <div className="yat-filter-counter">
          <button type="button" onClick={() => onChange({ guests: Math.max(0, draft.guests - 1) })}>−</button>
          <span>{draft.guests}</span>
          <button type="button" onClick={() => onChange({ guests: draft.guests + 1 })}>+</button>
        </div>
      </div>

      <div className="yat-filter-group">
        <span>Kabin Sayısı</span>
        <div className="yat-filter-counter">
          <button type="button" onClick={() => onChange({ cabins: Math.max(0, draft.cabins - 1) })}>−</button>
          <span>{draft.cabins}</span>
          <button type="button" onClick={() => onChange({ cabins: draft.cabins + 1 })}>+</button>
        </div>
      </div>

      <div className="yat-filter-group">
        <span>Yapım Yılı</span>
        <div className="yat-filter-row">
          <input
            type="number"
            placeholder="Min"
            value={draft.yearMin}
            onChange={(e) => onChange({ yearMin: e.target.value })}
          />
          <input
            type="number"
            placeholder="Max"
            value={draft.yearMax}
            onChange={(e) => onChange({ yearMax: e.target.value })}
          />
        </div>
      </div>

      <div className="yat-filter-group">
        <span>Mürettebat</span>
        <label className="yat-filter-check">
          <input type="checkbox" checked={draft.kaptanli} onChange={(e) => onChange({ kaptanli: e.target.checked })} />
          Kaptanlı
        </label>
        <label className="yat-filter-check">
          <input type="checkbox" checked={draft.kaptansiz} onChange={(e) => onChange({ kaptansiz: e.target.checked })} />
          Kaptansız
        </label>
      </div>

      <div className="yat-filter-group">
        <span>Tekne Uzunluğu (Metre)</span>
        <div className="yat-filter-row">
          <input
            type="number"
            placeholder="Min"
            value={draft.lengthMin}
            onChange={(e) => onChange({ lengthMin: e.target.value })}
          />
          <input
            type="number"
            placeholder="Max"
            value={draft.lengthMax}
            onChange={(e) => onChange({ lengthMax: e.target.value })}
          />
        </div>
      </div>

      <button type="button" className="yat-filter-apply" onClick={onApply}>
        Uygula
      </button>
      {onReset ? (
        <button type="button" className="yat-filter-apply" style={{ marginTop: 8, background: "#eef1f6", color: "#1a2b48" }} onClick={onReset}>
          Sıfırla
        </button>
      ) : null}
    </div>
  );
}

function YatListingCard({ listing, fav, onToggleFav }: { listing: YatListing; fav: boolean; onToggleFav: () => void }) {
  const summary = listingSummary(listing);
  const images = (listing.gallery?.length ? listing.gallery : listing.image_url ? [listing.image_url] : [])
    .map((img) => resolveClientMediaSrc(img) || img)
    .filter(Boolean);
  const [imgIdx, setImgIdx] = useState(0);
  const href = tourismListingHref({ type: "boat", slug: listing.slug });
  const loc = [listing.district, listing.city].filter(Boolean).join(" ");
  const price = summary.price ?? 0;
  const unit = summary.priceUnit === "saat" ? "saatlik" : summary.priceUnit ?? "saatlik";
  const kapora = summary.kaporaOrani;

  return (
    <article className="yat-card">
      <div className="yat-card__media">
        <Link href={href}>
          <img
            src={images[imgIdx] || YAT_FALLBACK_IMG}
            alt={listing.title}
            onError={(e) => {
              e.currentTarget.src = YAT_FALLBACK_IMG;
            }}
          />
        </Link>
        {images.length > 1 ? (
          <div className="yat-card__media-nav">
            <button type="button" onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}>‹</button>
            <button type="button" onClick={() => setImgIdx((i) => (i + 1) % images.length)}>›</button>
          </div>
        ) : null}
        <button type="button" className={`yat-card__fav${fav ? " yat-card__fav--on" : ""}`} onClick={onToggleFav} aria-label="Favori">
          <Heart size={18} fill={fav ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="yat-card__body">
        <div>
          <h3 className="yat-card__title">
            <Link href={href}>{cardTitle(listing, summary)}</Link>
          </h3>
          {loc ? (
            <p className="yat-card__loc">
              <MapPin size={14} /> {loc}
            </p>
          ) : null}
          <div className="yat-card__specs">
            {summary.kapasite ? (
              <span className="yat-card__spec">
                <Users size={14} /> {summary.kapasite} Kişi
              </span>
            ) : null}
            {summary.kabin != null && summary.kabin > 0 ? (
              <span className="yat-card__spec">
                <BedDouble size={14} /> {summary.kabin} Kabin
              </span>
            ) : null}
            {summary.wc != null && summary.wc > 0 ? (
              <span className="yat-card__spec">
                <Bath size={14} /> {summary.wc} WC
              </span>
            ) : null}
            {summary.uzunluk ? (
              <span className="yat-card__spec">
                <Ruler size={14} /> {summary.uzunluk} Mt
              </span>
            ) : null}
          </div>
          {summary.kaptanli !== false ? (
            <p className="yat-card__captain">Kaptanlı Kiralanmaktadır</p>
          ) : (
            <p className="yat-card__captain" style={{ color: "#697488" }}>
              Kaptansız Kiralanmaktadır
            </p>
          )}
        </div>
        <div className="yat-card__footer">
          <div className="yat-card__price">
            {price > 0 ? (
              <>
                <strong>₺{formatPrice(price)}</strong>
                <span>/{unit}</span>
              </>
            ) : (
              <strong style={{ fontSize: "1rem", color: "#697488" }}>Fiyat için bilgi alın</strong>
            )}
          </div>
          {kapora && kapora > 0 ? (
            <span className="yat-card__badge">%{kapora} Ön Ödeme, Kalanı Ödeme Kapıda</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PromoBanner() {
  return (
    <div className="yat-promo-banner">
      <div className="yat-promo-banner__team">
        <div className="yat-promo-banner__avatars">
          <span>AY</span>
          <span>MK</span>
          <span>ST</span>
        </div>
        <div>
          <strong>Size yardımcı olalım</strong>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>Uzman ekibimiz tekne seçiminde yanınızda</p>
        </div>
      </div>
      <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="yat-promo-banner__cta">
        <Phone size={18} /> Bizi Arayın {CONTACT_PHONE}
      </a>
    </div>
  );
}

const SORT_TABS: { key: YatFilterState["sort"]; label: string }[] = [
  { key: "recommended", label: "Önerilenler" },
  { key: "popular", label: "Popüler Tekneler" },
  { key: "price-high", label: "Yüksek Fiyatlılar" },
  { key: "price-low", label: "Düşük Fiyatlılar" },
];

export function YatListingPage() {
  const [loc, setLoc] = useLocation();
  const initialQs = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
    [loc],
  );
  const [listings, setListings] = useState<YatListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<YatFilterState>(() => filtersFromSearchParams(initialQs));
  const [draft, setDraft] = useState<YatFilterState>(() => filtersFromSearchParams(initialQs));
  const [mobileFilters, setMobileFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("yat-favorites");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const { cms } = useTurizmCms("yat");

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const apiQ = filtersToApiParams(filters);
      const result = await fetchTourismListingsWithMeta({
        type: "boat",
        limit: 48,
        filters: {
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          capacityMin: filters.guests > 0 ? String(filters.guests) : "",
          sort: filters.sort,
          ratingMin: "",
          stars: [],
          amenities: [],
          features: [],
        },
        extraParams: apiQ,
      });
      setListings(result.listings as YatListing[]);
      setTotal(result.total || result.listings.length);
    } catch {
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  function syncUrl(next: YatFilterState) {
    const q = filtersToApiParams(next);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    const path = loc.split("?")[0] ?? TURIZM.yat.home;
    setLoc(`${path}${suffix}`, { replace: true });
  }

  function applyFilters() {
    setFilters(draft);
    syncUrl(draft);
    setMobileFilters(false);
  }

  function setSort(sort: YatFilterState["sort"]) {
    const next = { ...filters, sort };
    setFilters(next);
    setDraft(next);
    syncUrl(next);
  }

  function toggleFav(slug: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      localStorage.setItem("yat-favorites", JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <BookingCoreShell module="yat">
      <div className="bc-hub bc-hub--listing bc-hub--yat">
        <TurizmCategoryHubHero
          slug="yat"
          search={<BookingCoreHeroSearch defaultTab="boat" />}
          listingsAnchorId="bc-listings"
          blogTitle={null}
        />
      <div className="yat-list">
        <div className="yat-list__wrap">
          <header className="yat-list__head">
            <p className="yat-list__count">
              {loading ? "Yükleniyor…" : `${total.toLocaleString("tr-TR")} Kiralık Tekne Bulundu`}
            </p>
          </header>

          <button type="button" className="yat-filter-mobile-btn" onClick={() => setMobileFilters(true)}>
            <SlidersHorizontal size={16} /> Filtreler
          </button>

          <div className="yat-list__layout">
            <div className="yat-list__filters--desktop">
              <YatFilterPanel draft={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} onApply={applyFilters} />
            </div>

            <div className="yat-list__main">
              <div className="yat-sort-tabs" role="tablist">
                {SORT_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    className={`yat-sort-tab${filters.sort === key ? " yat-sort-tab--active" : ""}`}
                    onClick={() => setSort(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="yat-cards">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="yat-list__skeleton" />
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="yat-list__empty">
                  <p>Filtrelere uygun tekne bulunamadı.</p>
                  <button type="button" className="yat-filter-apply" onClick={() => { setDraft(DEFAULT_YAT_FILTERS); setFilters(DEFAULT_YAT_FILTERS); }}>
                    Filtreleri sıfırla
                  </button>
                </div>
              ) : (
                <div className="yat-cards">
                  {listings.flatMap((listing, i) => {
                    const card = (
                      <YatListingCard
                        key={`${listing.id}-${listing.slug}`}
                        listing={listing}
                        fav={favorites.has(listing.slug)}
                        onToggleFav={() => toggleFav(listing.slug)}
                      />
                    );
                    if (i > 0 && i % 4 === 0) {
                      return [
                        <div key={`promo-${i}`} className="yat-cards__full">
                          <PromoBanner />
                        </div>,
                        card,
                      ];
                    }
                    return [card];
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`yat-list__filters--mobile${mobileFilters ? "" : ""}`} hidden={!mobileFilters}>
        <div style={{ width: "100%" }} onClick={() => setMobileFilters(false)} />
        <div style={{ position: "relative" }}>
          <button
            type="button"
            style={{ position: "absolute", top: 12, right: 12, zIndex: 2, border: "none", background: "transparent" }}
            onClick={() => setMobileFilters(false)}
          >
            <X />
          </button>
          <YatFilterPanel draft={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} onApply={applyFilters} />
        </div>
      </div>

      <TurizmCategoryPageFooter title="Yat Tekne Kiralama" description={cms.pageDescription} />
      </div>
    </BookingCoreShell>
  );
}

export default YatListingPage;
