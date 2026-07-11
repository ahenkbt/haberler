import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Building2, Eye, MapPin, RefreshCw, Share2, ShoppingBag, Star } from "lucide-react";
import { Link } from "wouter";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { haritalarNavHref } from "@/lib/haritalarNav";
import {
  resolveMapBusinessDiscoverHref,
  resolveMapBusinessStoreHref,
} from "@/lib/mapBusinessCardLinks";
import { KESFET_PUBLIC_DISCOVERY_REGIONS } from "@/lib/kesfetDiscoveryDirectory";
import { TURKEY_CITIES } from "@/lib/popularCities";
import { KESFET_LISTING_PATH } from "@/lib/kesfetDiscoverHub";

const API = "/api";
export const FEATURED_VITRIN_SIZE = 4;

type FeaturedRegionSlug = "turkiye" | "kktc" | "azerbaycan";

const FEATURED_REGION_TABS: { slug: FeaturedRegionSlug; label: string }[] = [
  { slug: "turkiye", label: "TÜRKİYE" },
  { slug: "kktc", label: "KKTC" },
  { slug: "azerbaycan", label: "AZERBAYCAN" },
];

export type FeaturedBusiness = {
  id: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
  scrapedPhotos?: string[] | Record<string, unknown> | null;
  images?: Array<{ imageUrl?: string | null } | string> | null;
  isPremium?: boolean | null;
  homepageFeatured?: boolean | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: { id?: string; name?: string | null } | null;
  categoryName?: string | null;
  city?: { id?: string; name?: string | null; nameTr?: string | null } | null;
  district?: { id?: string; name?: string | null } | null;
  googlePlacesExtras?: Record<string, unknown> | null;
  hasPublicProfile?: boolean | null;
  hasDelivery?: boolean | null;
  hasOnlineOrder?: boolean | null;
  storeType?: string | null;
  discoverHref?: string | null;
  storefrontHref?: string | null;
  hasActiveStorefront?: boolean | null;
};

function ratingLabel(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return n > 0 ? n.toFixed(1) : "Yeni";
}

function isFeaturedBusiness(biz: FeaturedBusiness): boolean {
  return Boolean(biz.homepageFeatured || biz.isPremium);
}

function buildFeaturedRegionCityLabels(): Record<FeaturedRegionSlug, Set<string>> {
  const labels: Record<FeaturedRegionSlug, Set<string>> = {
    turkiye: new Set(TURKEY_CITIES.map((city) => city.name.toLocaleLowerCase("tr-TR"))),
    kktc: new Set(),
    azerbaycan: new Set(),
  };
  for (const region of KESFET_PUBLIC_DISCOVERY_REGIONS) {
    const slug = region.slug as FeaturedRegionSlug;
    if (!labels[slug]) continue;
    for (const city of region.cities) {
      labels[slug].add(city.label.toLocaleLowerCase("tr-TR"));
    }
  }
  return labels;
}

const FEATURED_REGION_CITY_LABELS = buildFeaturedRegionCityLabels();

function cityLabel(biz: FeaturedBusiness): string {
  return String(biz.city?.nameTr || biz.city?.name || "").trim();
}

function districtLabel(biz: FeaturedBusiness): string {
  return String(biz.district?.name || "").trim();
}

function inferFeaturedRegion(biz: FeaturedBusiness): FeaturedRegionSlug | null {
  const city = cityLabel(biz).toLocaleLowerCase("tr-TR");
  if (city) {
    if (FEATURED_REGION_CITY_LABELS.kktc.has(city)) return "kktc";
    if (FEATURED_REGION_CITY_LABELS.azerbaycan.has(city)) return "azerbaycan";
    if (FEATURED_REGION_CITY_LABELS.turkiye.has(city)) return "turkiye";
  }
  const lat = biz.latitude;
  const lng = biz.longitude;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    if (lat >= 34.5 && lat <= 35.9 && lng >= 32.5 && lng <= 34.6) return "kktc";
    if (lat >= 38.5 && lat <= 42.5 && lng >= 44.5 && lng <= 51.5) return "azerbaycan";
    if (lat >= 35.8 && lat <= 42.5 && lng >= 25.5 && lng <= 45.0) return "turkiye";
  }
  return null;
}

function matchesFeaturedRegion(biz: FeaturedBusiness, region: FeaturedRegionSlug): boolean {
  const inferred = inferFeaturedRegion(biz);
  if (inferred) return inferred === region;
  return region === "turkiye";
}

function collectImageCandidates(biz: FeaturedBusiness): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string | null | undefined) => {
    const value = String(raw ?? "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };

  add(biz.coverPhotoUrl);
  add(biz.photoUrl);

  if (Array.isArray(biz.scrapedPhotos)) {
    for (const photo of biz.scrapedPhotos) {
      if (typeof photo === "string") add(photo);
    }
  }

  if (Array.isArray(biz.images)) {
    for (const image of biz.images) {
      if (typeof image === "string") add(image);
      else if (image && typeof image === "object") add(image.imageUrl);
    }
  }

  const extras = (biz.googlePlacesExtras ?? null) as Record<string, unknown> | null;
  if (extras) {
    add(String(extras.imageUrl ?? extras.photoUrl ?? extras.coverPhotoUrl ?? ""));
    const photos = extras.photos;
    if (Array.isArray(photos)) {
      for (const photo of photos) {
        if (typeof photo === "string") add(photo);
        else if (photo && typeof photo === "object" && "url" in photo) {
          add(String((photo as { url?: string }).url ?? ""));
        }
      }
    }
  }

  return out;
}

function resolveBusinessImage(biz: FeaturedBusiness, candidateIndex = 0): string {
  const candidates = collectImageCandidates(biz);
  const raw = candidates[candidateIndex] ?? "";
  return raw ? resolveClientMediaSrc(raw) : "";
}

function FeaturedCard({
  biz,
  categoryLabel,
}: {
  biz: FeaturedBusiness;
  categoryLabel: string;
}) {
  const imageCandidates = useMemo(() => collectImageCandidates(biz), [biz]);
  const [imgIndex, setImgIndex] = useState(0);
  const image = resolveBusinessImage(biz, imgIndex);
  const detailHref = resolveMapBusinessDiscoverHref(biz);
  const storeHref = resolveMapBusinessStoreHref(biz);
  const mapsHref = haritalarNavHref({
    id: biz.id,
    slug: biz.slug,
    lat: biz.latitude,
    lng: biz.longitude,
  });
  const city = cityLabel(biz);
  const district = districtLabel(biz);
  const address = String(biz.address ?? "").trim();
  const locationLine = [district, city].filter(Boolean).join(", ") || address.split(",")[0] || "Türkiye";
  const thumb = image || "";

  return (
    <article className="ss-vitrin-card">
      <Link href={detailHref} className="ss-vitrin-card-hit" aria-label={`${biz.name} — detay`} />
      <div className="ss-vitrin-thumb">
        {thumb ? (
          <img
            src={thumb}
            alt={biz.name}
            onError={() => {
              if (imgIndex + 1 < imageCandidates.length) setImgIndex((prev) => prev + 1);
            }}
          />
        ) : (
          <div className="ss-vitrin-thumb-fallback" aria-hidden>🏪</div>
        )}
        {isFeaturedBusiness(biz) ? (
          <span className="ss-vitrin-badge">★ Öne çıkan</span>
        ) : null}
      </div>
      <div className="ss-vitrin-body">
        <h3 className="ss-vitrin-title">
          <Link href={detailHref}>{biz.name}</Link>
        </h3>
        <p className="ss-vitrin-desc">{address || categoryLabel || "İşletme profili"}</p>
        <div className="ss-vitrin-meta">
          {biz.rating ? (
            <span className="ss-vitrin-rating">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {ratingLabel(biz.rating)}
              {biz.userRatingsTotal ? ` (${Number(biz.userRatingsTotal).toLocaleString("tr-TR")})` : ""}
            </span>
          ) : null}
          {locationLine ? (
            <span className="ss-vitrin-loc">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{locationLine}</span>
            </span>
          ) : null}
        </div>
        <div className="ss-vitrin-footer">
          {storeHref ? (
            <Link href={storeHref} className="ss-vitrin-cat ss-vitrin-store-link" title="Mağaza sayfası">
              Mağaza
            </Link>
          ) : (
            <span className="ss-vitrin-cat">{categoryLabel || "İşletme"}</span>
          )}
          <div className="ss-vitrin-actions">
            <Link href={detailHref} title="Detay">
              <Eye className="h-4 w-4" />
            </Link>
            {storeHref ? (
              <Link href={storeHref} title="Mağaza">
                <ShoppingBag className="h-4 w-4" />
              </Link>
            ) : null}
            <Link href={mapsHref} target="_blank" rel="noopener noreferrer" title="Konuma git">
              <MapPin className="h-4 w-4" />
            </Link>
            <Link href={detailHref} title="Paylaş">
              <Share2 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

type Props = {
  title?: string;
  moreHref?: string;
  className?: string;
};

export function FeaturedBusinessesPanel({
  title = "Popüler işletmeler",
  moreHref = `${KESFET_LISTING_PATH}#ss-featured-grid`,
  className = "",
}: Props) {
  const [allFeaturedBusinesses, setAllFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(false);
  const [featuredRegion, setFeaturedRegion] = useState<FeaturedRegionSlug>("turkiye");
  const fetchSeqRef = useRef(0);

  const fetchFeaturedBusinesses = useCallback(async () => {
    setFeaturedLoading(true);
    setFeaturedError(false);
    const myId = ++fetchSeqRef.current;
    try {
      const { ok, data } = await fetchPublicJson<{ success?: boolean; data?: FeaturedBusiness[] }>(
        `${API}/map/homepage-businesses`,
      );
      if (myId !== fetchSeqRef.current) return;
      const items: FeaturedBusiness[] = ok && data?.success && Array.isArray(data.data) ? data.data : [];
      if (!ok) {
        setFeaturedError(true);
        if (!items.length) setAllFeaturedBusinesses([]);
        return;
      }
      setAllFeaturedBusinesses(items);
    } catch {
      if (myId !== fetchSeqRef.current) return;
      setFeaturedError(true);
    } finally {
      if (myId === fetchSeqRef.current) setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFeaturedBusinesses();
  }, [fetchFeaturedBusinesses]);

  const regionFeatured = useMemo(
    () => allFeaturedBusinesses.filter((biz) => matchesFeaturedRegion(biz, featuredRegion)),
    [allFeaturedBusinesses, featuredRegion],
  );

  const featuredBusinesses = useMemo(
    () => regionFeatured.slice(0, FEATURED_VITRIN_SIZE),
    [regionFeatured],
  );

  const featuredTotal = regionFeatured.length;
  const showSkeleton = featuredLoading && !featuredBusinesses.length;
  const showRetry = featuredError && !featuredLoading && !featuredBusinesses.length;
  const showEmpty = !featuredLoading && !featuredError && !featuredBusinesses.length;

  return (
    <section
      id="ss-featured-grid"
      className={`ss-panel-card ss-featured-panel${className ? ` ${className}` : ""}`}
      aria-label={title}
    >
      <div className="ss-panel-card-head ss-featured-panel-head">
        <div className="ss-featured-head-left">
          <div className="ss-panel-card-head-icon" aria-hidden>
            <Star className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="ss-panel-card-title">{title}</h2>
            <p className="ss-panel-card-sub">
              {featuredLoading
                ? "Öne çıkan firmalar yükleniyor…"
                : `${featuredTotal.toLocaleString("tr-TR")} öne çıkan firma — vitrinde ${FEATURED_VITRIN_SIZE} firma`}
            </p>
          </div>
        </div>
        <div className="ss-featured-region-tabs" role="tablist" aria-label="Bölge seçimi">
          {FEATURED_REGION_TABS.map((tab) => (
            <button
              key={tab.slug}
              type="button"
              role="tab"
              aria-selected={featuredRegion === tab.slug}
              className={`ss-featured-region-tab${featuredRegion === tab.slug ? " active" : ""}`}
              onClick={() => setFeaturedRegion(tab.slug)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ss-featured-head-right">
          {featuredTotal > FEATURED_VITRIN_SIZE ? (
            <Link href={moreHref} className="ss-featured-more-link shrink-0">
              Tüm öne çıkanlar
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="ss-panel-card-body">
        {showSkeleton ? (
          <div className="ss-vitrin-row">
            {Array.from({ length: FEATURED_VITRIN_SIZE }).map((_, i) => (
              <div key={i} className="ss-vitrin-card h-52 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : featuredBusinesses.length ? (
          <div className="ss-vitrin-row">
            {featuredBusinesses.map((biz) => (
              <FeaturedCard
                key={biz.id}
                biz={biz}
                categoryLabel={biz.category?.name || biz.categoryName || "İşletme"}
              />
            ))}
          </div>
        ) : showRetry ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-8 text-center">
            <p className="font-semibold text-slate-700">Öne çıkan firmalar şu an yüklenemedi.</p>
            <p className="mt-2 text-sm text-slate-500">Bağlantı yoğunluğu veya geçici bir hata olabilir.</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white hover:bg-[#0d655e]"
              onClick={() => void fetchFeaturedBusinesses()}
            >
              <RefreshCw className="h-4 w-4" />
              Tekrar dene
            </button>
          </div>
        ) : showEmpty ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-600">Henüz öne çıkan firma yok.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
