import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { BookOpen, Building2, Compass, Eye, MapPin, Phone, Search, Share2, Star } from "lucide-react";
import { KESFET_LISTING_PATH } from "@/lib/kesfetDiscoverHub";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { haritalarNavHref, kesfetBusinessMapHref } from "@/lib/haritalarNav";
import { cityAccessibilityLabel, TURKEY_CITIES } from "@/lib/popularCities";
import { FeaturedBusinessesPanel } from "@/components/kesfet-listinghub/FeaturedBusinessesPanel";
import {
  KesfetHeroLocationField,
  type KesfetHeroLocationFieldHandle,
  resolveLocationFromBrowser,
} from "@/components/kesfet-listinghub/KesfetHeroLocationField";
import { SADE_PUBLIC_HERO_CONTENT_CLASS, SADE_PUBLIC_HERO_STAGE_CLASS, SADE_PUBLIC_HERO_SURFACE_CLASS, SADE_PUBLIC_PAGE_BG_WHITE, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";
import {
  KESFET_DISCOVERY_CATEGORIES,
  KESFET_PUBLIC_DISCOVERY_REGIONS,
  buildKesfetDiscoveryImportJobs,
  findKesfetDiscoveryCategory,
  findKesfetDiscoveryRegion,
  type KesfetDiscoveryCategory,
  type KesfetDiscoveryCity,
} from "@/lib/kesfetDiscoveryDirectory";
import { KESFET_DISCOVER_GROUPS } from "@/lib/kesfetDiscoverCategories";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import {
  findKesfetDirectoryKeywordEntry,
  listKesfetDirectoryEntries,
  normalizeKesfetDirectorySearch,
  resolveKesfetKeywordsParam,
} from "@/lib/kesfetDirectoryLookup";
import "@/styles/listinghubKesfet.css";
import "@/styles/sariSayfalar.css";

const API = "/api";

type TrAddressValue = { city: string; district: string; mahalle: string; sokak?: string };

type MapCategory = { id: string; name: string; icon?: string | null; slug?: string | null; count?: number };

type ListingBusiness = {
  id: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  isPremium?: boolean | null;
  /** Doğrulanmış/premium/vendor → özel `/kesfet/:slug` sayfası; aksi halde haritaya yönlendirilir. */
  hasPublicProfile?: boolean | null;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  homepageSuperCategory?: string | null;
  workingHours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
  description?: string | null;
  city?: { id?: string; name?: string | null; nameTr?: string | null } | null;
  /** Birleşik arama — modül rozeti (Otomotiv, Yemek, Sarı Sayfalar…) */
  typeLabel?: string | null;
  /** Birleşik arama — doğrudan detay rotası */
  detailHref?: string | null;
};

/** Sarı Sayfalar A–Z dizini için kategori grubu (API /map/discover-categories). */
type DiscoverDirectorySub = { id: string; name: string; slug: string; googleKeyword?: string | null };
type DiscoverDirectoryGroup = {
  id: string;
  key: string;
  label: string;
  icon: string;
  subcategories: DiscoverDirectorySub[];
};
type DirectoryEntry = { name: string; slug: string; keyword: string; group: string };

type BusinessFetchOverrides = {
  query?: string;
  city?: string;
  district?: string;
  category?: string;
  superCategory?: string;
  directoryCategory?: string;
  showLoading?: boolean;
  /** Sarı Sayfalar "Tümü" — şehirdeki tüm işletmeler, keywords filtresi yok */
  allCityBusinesses?: boolean;
};

const POPULAR_TAGS = ["Restoran", "Kafe", "Market", "Kuaför", "Eczane", "Otel", "Tamir", "Emlak"];
const BUSINESS_PAGE_SIZE = 12;
const KAMU_PAGE_SIZE = 30;
const CITY_IMPORT_CATEGORY_BATCH_SIZE = 2;
const CATEGORY_IMPORT_JOB_BATCH_SIZE = 2;
const DISCOVERY_IMPORT_TARGET = 100;
const CITY_IMPORT_MIN_RESULTS = DISCOVERY_IMPORT_TARGET;
const DISCOVERY_REGION_EMOJIS: Record<string, string> = {
  turkiye: "🇹🇷",
  kktc: "🇨🇾",
  azerbaycan: "🇦🇿",
};

function readKesfetSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function buildKesfetSearchPath(
  q: string,
  city: string,
  categoryId: string,
  superCategory = "",
  region = "",
  citySlug = "",
  directoryCategory = "",
): string {
  const params = new URLSearchParams();
  const trimmedQ = q.trim();
  const trimmedCity = city.trim();
  if (trimmedQ) params.set("q", trimmedQ);
  if (trimmedCity) params.set("city", trimmedCity);
  if (categoryId) params.set("category", categoryId);
  if (superCategory) params.set("superCategory", superCategory);
  if (region) params.set("country", region);
  if (citySlug) params.set("citySlug", citySlug);
  if (directoryCategory) params.set("directoryCategory", directoryCategory);
  const qs = params.toString();
  return qs ? `${KESFET_LISTING_PATH}?${qs}` : KESFET_LISTING_PATH;
}

/** POI / şehir rehberi — Keşfet vitrin kartlarında gösterilmez */
const HIDDEN_CATEGORY_SLUGS = new Set([
  "parklar",
  "camiler",
  "park",
  "mosque",
  "place_of_worship",
]);

function ratingLabel(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return n > 0 ? n.toFixed(1) : "Yeni";
}

function normalizeDiscoverySearch(value: string): string {
  return normalizeKesfetDirectorySearch(value);
}

function findDiscoveryCityBySlugOrLabel(
  citySlug: string,
  cityLabel: string,
  cityByLabel: Map<string, KesfetDiscoveryCity>,
): KesfetDiscoveryCity | undefined {
  if (citySlug) {
    for (const region of KESFET_PUBLIC_DISCOVERY_REGIONS) {
      const hit = region.cities.find((city) => city.slug === citySlug);
      if (hit) return hit;
    }
  }
  const trimmed = cityLabel.trim();
  if (!trimmed) return undefined;
  const byLabel = cityByLabel.get(trimmed.toLocaleLowerCase("tr-TR"));
  if (byLabel) return byLabel;
  const norm = normalizeDiscoverySearch(trimmed);
  for (const region of KESFET_PUBLIC_DISCOVERY_REGIONS) {
    const hit = region.cities.find(
      (city) =>
        normalizeDiscoverySearch(city.label) === norm
        || city.slug === norm.replace(/\s+/g, "-"),
    );
    if (hit) return hit;
  }
  return undefined;
}

const LISTING_KAMU_NAME_RE = /(?:^|[^a-z0-9çğıöşü])(?:belediye|büyükşehir|valilik|adalet saray[ıi]|adliye|kaymakaml[ıi]k|devlet dairesi|kamu kurumu|hükümet kona[ğg][ıi])(?:[^a-z0-9çğıöşü]|$)/i;

function isListingKamuBusiness(b: ListingBusiness): boolean {
  if (b.homepageSuperCategory === "kamu") return true;
  const blob = `${b.name ?? ""} ${b.address ?? ""} ${b.categoryName ?? ""}`.toLocaleLowerCase("tr-TR");
  return LISTING_KAMU_NAME_RE.test(blob) || /\bkamu\b/.test(blob);
}

function listingBusinessMatchesCityScope(
  b: ListingBusiness,
  scopeCity: string,
  scopeSlug: string,
): boolean {
  if (!scopeCity.trim() && !scopeSlug.trim()) return true;
  const scopeNorm = normalizeDiscoverySearch(scopeCity);
  const bizCity = String(b.city?.nameTr || b.city?.name || "").trim();
  if (bizCity && normalizeDiscoverySearch(bizCity) === scopeNorm) return true;
  if (scopeSlug && bizCity && normalizeDiscoverySearch(bizCity) === normalizeDiscoverySearch(scopeSlug.replace(/-/g, " "))) {
    return true;
  }
  const haystack = normalizeDiscoverySearch(`${b.name ?? ""} ${b.address ?? ""}`);
  if (scopeNorm && haystack.includes(scopeNorm)) return true;
  if (scopeSlug) {
    const slugNorm = normalizeDiscoverySearch(scopeSlug.replace(/-/g, " "));
    if (slugNorm && haystack.includes(slugNorm)) return true;
  }
  if (scopeNorm) {
    for (const region of KESFET_PUBLIC_DISCOVERY_REGIONS) {
      for (const city of region.cities) {
        const otherNorm = normalizeDiscoverySearch(city.label);
        if (!otherNorm || otherNorm === scopeNorm) continue;
        if (haystack.includes(otherNorm)) return false;
      }
    }
  }
  return false;
}

function filterListingBusinessesClientSide(
  items: ListingBusiness[],
  opts: { scopeCity: string; scopeSlug: string; excludeKamu: boolean },
): ListingBusiness[] {
  return items.filter((b) => {
    if (opts.excludeKamu && isListingKamuBusiness(b)) return false;
    if (opts.scopeCity || opts.scopeSlug) {
      return listingBusinessMatchesCityScope(b, opts.scopeCity, opts.scopeSlug);
    }
    return true;
  });
}

function getOpenStatus(wh: ListingBusiness["workingHours"]): { isOpen: boolean; text: string } | null {
  if (!wh || typeof wh !== "object") return null;
  const now = new Date();
  const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()];
  const hours = wh[day];
  if (!hours || hours.closed) return { isOpen: false, text: "Kapalı" };
  const [oh, om] = hours.open.split(":").map(Number);
  const [ch, cm] = hours.close.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  if (!Number.isFinite(open) || !Number.isFinite(close)) return null;
  // Gece yarısını aşan saatler (ör. 20:00–02:00): close <= open ise gece aşımı.
  const isOpen = close <= open ? (cur >= open || cur < close) : (cur >= open && cur < close);
  return { isOpen, text: isOpen ? "Açık" : "Kapalı" };
}

function ListingHubCard({
  business,
  categoryLabel,
}: {
  business: ListingBusiness;
  categoryLabel: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const image = imgFailed
    ? ""
    : resolveClientMediaSrc(business.coverPhotoUrl || business.photoUrl || null);
  // Salt kazınan (doğrulanmamış) işletmeler özel sayfa almaz; tıklama haritaya gider.
  const mapWindowHref = kesfetBusinessMapHref({
    id: business.id,
    name: business.name,
    lat: business.latitude,
    lng: business.longitude,
    googlePlaceId: business.googlePlaceId,
  });
  const href = business.detailHref
    ? business.detailHref
    : business.hasPublicProfile
      ? (business.slug ? `/kesfet/${business.slug}` : `/kesfet/isletme/${business.id}`)
      : mapWindowHref;
  const mapsHref = haritalarNavHref({
    id: business.id,
    slug: business.slug,
    lat: business.latitude,
    lng: business.longitude,
  });
  const openStatus = getOpenStatus(business.workingHours);
  const thumb = image || "";

  return (
    <article className="lh-listing-item">
      <div className="lh-listing-top">
        {thumb ? (
          <img src={thumb} alt={business.name} onError={() => setImgFailed(true)} />
        ) : (
          <div className="grid h-full place-items-center text-5xl bg-slate-200">🏪</div>
        )}
        <div className="lh-listing-badges">
          {business.typeLabel ? (
            <span className="lh-badge featured">{business.typeLabel}</span>
          ) : null}
          {openStatus ? (
            <span className={`lh-badge ${openStatus.isOpen ? "open" : "closed"}`}>{openStatus.text}</span>
          ) : null}
          {business.isPremium ? <span className="lh-badge featured">★ Öne çıkan</span> : null}
        </div>
      </div>
      <div className="lh-listing-middle">
        <div className="lh-listing-avatar">
          {thumb ? (
            <img src={thumb} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span>🏪</span>
          )}
        </div>
        <h3 className="lh-listing-title">
          <Link href={href}>{business.name}</Link>
        </h3>
        <p className="lh-listing-desc">
          {business.address || business.description || "Yekpare Keşfet işletme profili"}
        </p>
        <div className="lh-listing-meta">
          {business.rating ? (
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              {ratingLabel(business.rating)}
              {business.userRatingsTotal ? ` (${Number(business.userRatingsTotal).toLocaleString("tr-TR")})` : ""}
            </span>
          ) : null}
          {business.address ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{business.address.split(",")[0]}</span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="lh-listing-footer">
        <span className="lh-listing-cat">{business.typeLabel || categoryLabel || "İşletme"}</span>
        <div className="lh-listing-actions">
          <Link href={href} title="İncele">
            <Eye className="h-4 w-4" />
          </Link>
          <Link href={mapsHref} target="_blank" rel="noopener noreferrer" title="Konuma git">
            <MapPin className="h-4 w-4" />
          </Link>
          <Link href={href} title="Paylaş">
            <Share2 className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Sarı Sayfalar / Kamu kurumları için yoğun, kutu olmayan rehber satırı:
 * isim (harita linki), adres, telefon ve "Haritalar" bağlantısı.
 */
function YellowPagesRow({ business }: { business: ListingBusiness }) {
  const detailMapHref = kesfetBusinessMapHref({
    id: business.id,
    name: business.name,
    lat: business.latitude,
    lng: business.longitude,
    googlePlaceId: business.googlePlaceId,
  });
  const haritalarHref = haritalarNavHref({
    id: business.id,
    slug: business.slug,
    lat: business.latitude,
    lng: business.longitude,
  });
  return (
    <div className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <Link href={detailMapHref} className="font-bold text-slate-800 hover:text-[#0f766e] hover:underline">
          {business.name}
        </Link>
        {business.address ? (
          <div className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{business.address}</span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs">
        {business.phone ? (
          <a href={`tel:${business.phone}`} className="inline-flex items-center gap-1 text-slate-600 hover:text-[#0f766e]">
            <Phone className="h-3 w-3" />
            {business.phone}
          </a>
        ) : null}
        <Link
          href={haritalarHref}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-semibold text-[#0f766e] hover:bg-emerald-100"
        >
          <MapPin className="h-3 w-3" />
          Haritalar
        </Link>
      </div>
    </div>
  );
}

export default function KesfetListingHub() {
  const { data: siteSettings } = useGetSiteSettings();
  const initialSearch = readKesfetSearchParams();
  const initialQ = initialSearch.get("q") ?? "";
  const initialCity = initialSearch.get("city") ?? "";
  const initialCategory = initialSearch.get("category") ?? initialSearch.get("categoryId") ?? "";
  const initialSuperCategory = initialSearch.get("superCategory") ?? "";
  const initialRegionParam = initialSearch.get("country") ?? "turkiye";
  const initialRegion = KESFET_PUBLIC_DISCOVERY_REGIONS.some((region) => region.slug === initialRegionParam)
    ? initialRegionParam
    : "turkiye";
  const initialCitySlug = initialSearch.get("citySlug") ?? "";
  const initialDirectoryCategory = initialSearch.get("directoryCategory") ?? "";
  const initialYellowPages = ["1", "true", "yes"].includes((initialSearch.get("yellowPages") ?? "").toLowerCase());
  const initialYellowPagesAll = ["1", "true", "yes"].includes((initialSearch.get("yellowPagesAll") ?? "").toLowerCase());
  const initialCityResolved = findDiscoveryCityBySlugOrLabel(
    initialCitySlug,
    initialCity,
    (() => {
      const map = new Map<string, KesfetDiscoveryCity>();
      for (const region of KESFET_PUBLIC_DISCOVERY_REGIONS) {
        for (const city of region.cities) {
          map.set(city.label.toLocaleLowerCase("tr-TR"), city);
        }
      }
      return map;
    })(),
  );
  const [loc, setLoc] = useState<TrAddressValue>(() => ({
    city: initialCityResolved?.label ?? initialCity,
    district: "",
    mahalle: "",
  }));
  const [queryInput, setQueryInput] = useState(initialQ);
  const [appliedQuery, setAppliedQuery] = useState(initialQ);
  const [categories, setCategories] = useState<MapCategory[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [mapSuperCategory, setMapSuperCategory] = useState(initialSuperCategory);
  const [activeDiscoveryRegion, setActiveDiscoveryRegion] = useState(initialRegion);
  const [activeDiscoveryCity, setActiveDiscoveryCity] = useState(initialCityResolved?.slug ?? initialCitySlug);
  const [activeDiscoveryCategory, setActiveDiscoveryCategory] = useState(() => {
    const found = findKesfetDiscoveryCategory(initialDirectoryCategory);
    return found?.top.slug ?? "";
  });
  const [activeDiscoverySubcategory, setActiveDiscoverySubcategory] = useState(() => {
    const found = findKesfetDiscoveryCategory(initialDirectoryCategory);
    return found?.child?.slug ?? "";
  });
  const [discoveryImporting, setDiscoveryImporting] = useState(false);
  const [, setDiscoveryImportError] = useState<string | null>(null);
  const [cityImportCursor, setCityImportCursor] = useState(0);
  const [cityImportExhausted, setCityImportExhausted] = useState(false);
  const [businesses, setBusinesses] = useState<ListingBusiness[]>([]);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);
  const [locationQuery, setLocationQuery] = useState(initialCity);
  const [locating, setLocating] = useState(false);
  const locationFieldRef = useRef<KesfetHeroLocationFieldHandle>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const importAttemptKeysRef = useRef<Set<string>>(new Set());
  // Sıra koruması: yalnız en son başlatılan listeleme isteği yazabilir; eskimiş/iptal
  // edilmiş yanıt, ekrandaki geçerli sonuçların üzerine yazıp listeyi boşaltamaz.
  const fetchSeqRef = useRef(0);

  // Sarı Sayfalar (A–Z firma rehberi + Kamu/kamusal alan yoğun listesi)
  const [showYellowPages, setShowYellowPages] = useState(initialYellowPages);
  const [yellowPagesAllMode, setYellowPagesAllMode] = useState(initialYellowPagesAll);
  const [directoryGroups, setDirectoryGroups] = useState<DiscoverDirectoryGroup[]>([]);
  const [kamuBusinesses, setKamuBusinesses] = useState<ListingBusiness[]>([]);
  const [kamuTotal, setKamuTotal] = useState(0);
  const [kamuOffset, setKamuOffset] = useState(0);
  const [kamuLoading, setKamuLoading] = useState(false);
  const kamuLoadMoreRef = useRef<HTMLDivElement | null>(null);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filterCategories = useMemo(
    () => categories.filter((c) => !HIDDEN_CATEGORY_SLUGS.has((c.slug ?? "").toLowerCase())),
    [categories],
  );
  const activeDiscoveryRegionDef = useMemo(
    () =>
      KESFET_PUBLIC_DISCOVERY_REGIONS.find((region) => region.slug === activeDiscoveryRegion) ??
      KESFET_PUBLIC_DISCOVERY_REGIONS[0],
    [activeDiscoveryRegion],
  );
  const locLabel = useMemo(
    () => [loc.district, loc.city].filter(Boolean).join(", ") || `${activeDiscoveryRegionDef.label} geneli`,
    [activeDiscoveryRegionDef.label, loc.city, loc.district],
  );
  const activeDiscoveryCityDef = useMemo(
    () => activeDiscoveryRegionDef?.cities.find((city) => city.slug === activeDiscoveryCity),
    [activeDiscoveryCity, activeDiscoveryRegionDef],
  );
  const selectedDiscoveryCategory = useMemo(
    () => findKesfetDiscoveryCategory(activeDiscoveryCategory),
    [activeDiscoveryCategory],
  );
  const selectedDiscoveryCategoryJobs = useMemo(
    () => selectedDiscoveryCategory?.top ? buildKesfetDiscoveryImportJobs(selectedDiscoveryCategory.top) : [],
    [selectedDiscoveryCategory],
  );
  const publicDiscoveryCityByLabel = useMemo(() => {
    const map = new Map<string, KesfetDiscoveryCity>();
    for (const region of KESFET_PUBLIC_DISCOVERY_REGIONS) {
      for (const city of region.cities) {
        map.set(city.label.toLocaleLowerCase("tr-TR"), city);
      }
    }
    return map;
  }, []);
  const turkeyCityByName = useMemo(
    () => new Map<string, (typeof TURKEY_CITIES)[number]>(TURKEY_CITIES.map((city) => [city.name, city] as const)),
    [],
  );
  const activeRegionEmoji = DISCOVERY_REGION_EMOJIS[activeDiscoveryRegionDef.slug] ?? "📍";

  const directoryEntries = useMemo<DirectoryEntry[]>(() => {
    const source: DiscoverDirectoryGroup[] = directoryGroups.length
      ? directoryGroups
      : (KESFET_DISCOVER_GROUPS as unknown as DiscoverDirectoryGroup[]);
    return listKesfetDirectoryEntries(source as import("@/lib/kesfetDiscoverCategories").KesfetDiscoverGroup[]).map((entry) => ({
      name: entry.name,
      slug: entry.slug,
      keyword: entry.keyword,
      group: entry.group,
    })).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [directoryGroups]);

  const directoryByLetter = useMemo<Array<[string, DirectoryEntry[]]>>(() => {
    const map = new Map<string, DirectoryEntry[]>();
    for (const entry of directoryEntries) {
      const letter = entry.name.charAt(0).toLocaleUpperCase("tr-TR");
      const bucket = map.get(letter) ?? [];
      bucket.push(entry);
      map.set(letter, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "tr"));
  }, [directoryEntries]);

  // Bir kategori/anahtar kelime sorgusu (ör. ?q=Aile+Hekimleri) Sarı Sayfalar
  // dizinindeki bir alt kategoriye karşılık geliyorsa, sonuçları kutu kart yerine
  // yoğun (yellowpages) satır düzeninde listeleriz.
  const directoryEntryByQuery = useMemo<DirectoryEntry | null>(() => {
    if (!appliedQuery.trim()) return null;
    const hit = findKesfetDirectoryKeywordEntry(
      appliedQuery,
      directoryGroups.length ? (directoryGroups as Parameters<typeof findKesfetDirectoryKeywordEntry>[1]) : undefined,
    );
    if (!hit) return null;
    return { name: hit.name, slug: hit.slug, keyword: hit.keyword, group: hit.group };
  }, [appliedQuery, directoryGroups]);

  const isKeywordListingMode = Boolean(
    directoryEntryByQuery && !showYellowPages && !yellowPagesAllMode && (activeDiscoveryCityDef || loc.city.trim()),
  );

  const isDirectoryListingMode = isKeywordListingMode;

  useEffect(() => {
    if ((!showYellowPages && !isDirectoryListingMode) || directoryGroups.length) return;
    let cancelled = false;
    void fetchPublicJson<{ success?: boolean; data?: DiscoverDirectoryGroup[] }>(`${API}/map/discover-categories`)
      .then(({ data: d }) => {
        if (cancelled) return;
        if (d?.success && Array.isArray(d.data) && d.data.length) setDirectoryGroups(d.data);
        else setDirectoryGroups(KESFET_DISCOVER_GROUPS as unknown as DiscoverDirectoryGroup[]);
      })
      .catch(() => {
        if (!cancelled) setDirectoryGroups(KESFET_DISCOVER_GROUPS as unknown as DiscoverDirectoryGroup[]);
      });
    return () => { cancelled = true; };
  }, [showYellowPages, isDirectoryListingMode, directoryGroups.length]);

  const fetchKamuBusinesses = useCallback(
    async (offset: number, reset: boolean) => {
      const cityDef = activeDiscoveryCityDef ?? publicDiscoveryCityByLabel.get(loc.city.toLocaleLowerCase("tr-TR"));
      const params = new URLSearchParams({
        superCategory: "kamu",
        limit: String(KAMU_PAGE_SIZE),
        offset: String(offset),
      });
      if (cityDef) {
        params.set("city", cityDef.label);
        params.set("citySlug", cityDef.slug);
        params.set("requireCityScope", "1");
        params.set("lat", String(cityDef.lat));
        params.set("lng", String(cityDef.lng));
        params.set("radius", "25000");
        params.set("backfill", "1");
        params.set("backfillTarget", "120");
        params.set("backfillRadius", "25000");
        params.set("backfillCity", cityDef.label);
        params.set("backfillCategorySlug", "kamu-devlet-kurumlari");
        params.set("backfillCategoryLabel", "Devlet Kurumları ve Belediye");
        params.set("backfillKeyword", "kaymakamlık belediye valilik nüfus müdürlüğü devlet dairesi");
        params.set("storeType", "kamu_devlet");
        params.set("googlePlaceType", "local_government_office");
      } else if (loc.city) {
        params.set("city", loc.city);
        if (activeDiscoveryCity) params.set("citySlug", activeDiscoveryCity);
        params.set("requireCityScope", "1");
      }
      if (reset) setKamuLoading(true);
      try {
        const { ok: httpOk, data: d } = await fetchPublicJson<{ success?: boolean; data?: ListingBusiness[]; total?: number }>(
          `${API}/map/businesses?${params}`,
        );
        const items: ListingBusiness[] = httpOk && d?.success && Array.isArray(d.data) ? d.data : [];
        const total = typeof d?.total === "number" ? d.total : items.length;
        setKamuTotal(total);
        setKamuBusinesses((prev) => (reset ? items : [...prev, ...items]));
      } catch {
        if (reset) {
          setKamuBusinesses([]);
          setKamuTotal(0);
        }
      } finally {
        if (reset) setKamuLoading(false);
      }
    },
    [activeDiscoveryCityDef, loc.city, publicDiscoveryCityByLabel],
  );

  useEffect(() => {
    if (!showYellowPages) return;
    setKamuOffset(0);
    void fetchKamuBusinesses(0, true);
  }, [showYellowPages, fetchKamuBusinesses]);

  useEffect(() => {
    if (!showYellowPages || kamuOffset === 0) return;
    void fetchKamuBusinesses(kamuOffset, false);
  }, [kamuOffset, showYellowPages, fetchKamuBusinesses]);

  const hasMoreKamu = kamuBusinesses.length < kamuTotal;

  useEffect(() => {
    const el = kamuLoadMoreRef.current;
    if (!el || !showYellowPages || kamuLoading || !hasMoreKamu) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setKamuOffset((prev) => prev + KAMU_PAGE_SIZE);
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [showYellowPages, kamuLoading, hasMoreKamu, kamuBusinesses.length]);

  useEffect(() => {
    fetch(`${API}/map/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(d?.success && Array.isArray(d.data) ? d.data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!activeDiscoveryCityDef) return;
    setLoc((prev) => (
      prev.city === activeDiscoveryCityDef.label
        ? prev
        : { ...prev, city: activeDiscoveryCityDef.label, district: "" }
    ));
    setLocationQuery((prev) => prev === activeDiscoveryCityDef.label ? prev : activeDiscoveryCityDef.label);
  }, [activeDiscoveryCityDef]);

  const syncSearchUrl = useCallback((
    q: string,
    city: string,
    categoryId: string,
    superCategory = mapSuperCategory,
    region = activeDiscoveryRegion,
    citySlug = activeDiscoveryCity,
    directoryCategory = activeDiscoverySubcategory || activeDiscoveryCategory,
  ) => {
    if (typeof window === "undefined") return;
    const nextPath = buildKesfetSearchPath(q, city, categoryId, superCategory, region, citySlug, directoryCategory);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [activeDiscoveryCategory, activeDiscoveryCity, activeDiscoveryRegion, activeDiscoverySubcategory, mapSuperCategory]);

  const applySearch = useCallback(
    (nextQuery?: string, scrollToResults = true) => {
      const q = (nextQuery ?? queryInput).trim();
      setQueryInput(q);
      setAppliedQuery(q);
      syncSearchUrl(q, loc.city, category);
      if (scrollToResults) {
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },
    [category, loc.city, queryInput, syncSearchUrl],
  );

  const openDirectoryCategory = useCallback(
    (entry: DirectoryEntry) => {
      setShowYellowPages(false);
      setYellowPagesAllMode(false);
      setCategory("");
      setMapSuperCategory("");
      applySearch(entry.keyword);
    },
    [applySearch],
  );

  const fetchBusinesses = useCallback(
    async (offset: number, reset: boolean, overrides: BusinessFetchOverrides = {}) => {
      const urlParams = readKesfetSearchParams();
      const params = new URLSearchParams({
        limit: String(BUSINESS_PAGE_SIZE),
        offset: String(offset),
      });
      const nextQuery = overrides.query ?? appliedQuery;
      const nextCategory = overrides.category ?? category;
      const nextSuperCategory = overrides.superCategory ?? mapSuperCategory;
      const urlCity = urlParams.get("city") ?? "";
      const urlCitySlug = urlParams.get("citySlug") ?? "";
      const nextCity = overrides.city ?? (urlCity || loc.city);
      const nextCitySlug = urlCitySlug || activeDiscoveryCity;
      const nextDistrict = overrides.district ?? loc.district;
      const nextDirectoryCategory = overrides.directoryCategory ?? (activeDiscoverySubcategory || activeDiscoveryCategory);
      const showLoading = overrides.showLoading ?? true;
      const directoryCategory = nextDirectoryCategory ? findKesfetDiscoveryCategory(nextDirectoryCategory) : undefined;
      const directoryImportJob = directoryCategory
        ? (directoryCategory.child
            ? buildKesfetDiscoveryImportJobs(directoryCategory.top).find((job) => job.slug === directoryCategory.child?.slug)
            : buildKesfetDiscoveryImportJobs(directoryCategory.top)[0])
        : undefined;
      const directoryKeyword = directoryCategory?.child?.googleKeyword ?? directoryCategory?.top.googleKeyword ?? "";
      const listAllCityBusinesses = overrides.allCityBusinesses ?? (showYellowPages && yellowPagesAllMode);
      const keywordsParam = listAllCityBusinesses
        ? null
        : resolveKesfetKeywordsParam(
            nextQuery,
            directoryKeyword,
            directoryGroups.length ? (directoryGroups as import("@/lib/kesfetDiscoverCategories").KesfetDiscoverGroup[]) : undefined,
          );
      const cityForBackfill = activeDiscoveryCityDef
        ?? findDiscoveryCityBySlugOrLabel(nextCitySlug, nextCity, publicDiscoveryCityByLabel);
      const canonicalCityLabel = cityForBackfill?.label ?? nextCity;
      const useUnifiedSearch = Boolean(nextQuery.trim()) && !keywordsParam && !listAllCityBusinesses && !directoryImportJob && !nextCategory;

      if (useUnifiedSearch) {
        const unifiedParams = new URLSearchParams({
          q: nextQuery.trim(),
          limit: String(BUSINESS_PAGE_SIZE),
          offset: String(offset),
        });
        if (canonicalCityLabel) unifiedParams.set("city", canonicalCityLabel);

        if (reset) {
          if (showLoading) setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const myId = ++fetchSeqRef.current;
        try {
          const { ok: httpOk, data: d } = await fetchPublicJson<{
            success?: boolean;
            data?: Array<Record<string, unknown>>;
            total?: number;
          }>(`${API}/platform/search?${unifiedParams}`);
          if (myId !== fetchSeqRef.current) return;
          if (!httpOk || d?.success !== true || !Array.isArray(d?.data)) return;
          const items: ListingBusiness[] = d.data.map((row) => ({
            id: String(row.id ?? ""),
            name: String(row.name ?? ""),
            slug: (row.slug as string | null | undefined) ?? null,
            address: (row.address as string | null | undefined) ?? null,
            rating: typeof row.rating === "number" ? row.rating : null,
            userRatingsTotal: typeof row.userRatingsTotal === "number" ? row.userRatingsTotal : null,
            photoUrl: (row.photoUrl as string | null | undefined) ?? null,
            coverPhotoUrl: (row.coverPhotoUrl as string | null | undefined) ?? null,
            categoryName: (row.categoryName as string | null | undefined) ?? null,
            isPremium: null,
            hasPublicProfile: Boolean(row.hasPublicProfile),
            googlePlaceId: (row.googlePlaceId as string | null | undefined) ?? null,
            latitude: typeof row.latitude === "number" ? row.latitude : null,
            longitude: typeof row.longitude === "number" ? row.longitude : null,
            phone: (row.phone as string | null | undefined) ?? null,
            homepageSuperCategory: (row.homepageSuperCategory as string | null | undefined) ?? null,
            description: (row.description as string | null | undefined) ?? null,
            city: row.city ? { name: String(row.city) } : null,
            typeLabel: (row.typeLabel as string | null | undefined) ?? null,
            detailHref: (row.href as string | null | undefined) ?? null,
          }));
          const total = typeof d?.total === "number" ? d.total : items.length;
          setTotalBusinesses(total);
          setBusinesses((prev) => (reset ? items : [...prev, ...items]));
        } catch {
          /* mevcut liste korunur */
        } finally {
          if (myId === fetchSeqRef.current) {
            if (reset) setLoading(false);
            else setLoadingMore(false);
          }
        }
        return;
      }

      // Sarı Sayfalar / Popüler Arama alt kategorisi (ör. "Aile Hekimleri"): keywords filtresi.
      if (keywordsParam) {
        params.set("keywords", keywordsParam);
        params.set("backfillKeyword", keywordsParam);
      } else if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }
      if (nextCategory) params.set("category", nextCategory);
      if (directoryImportJob?.homepageSuperCategory) {
        params.set("superCategory", directoryImportJob.homepageSuperCategory);
      } else if (nextSuperCategory) {
        params.set("superCategory", nextSuperCategory);
      }
      if (canonicalCityLabel) params.set("city", canonicalCityLabel);
      if (nextCitySlug || cityForBackfill?.slug) {
        params.set("citySlug", nextCitySlug || cityForBackfill?.slug || "");
      }
      if (canonicalCityLabel || nextCitySlug || cityForBackfill?.slug) {
        params.set("requireCityScope", "1");
      }
      if (nextDistrict) params.set("district", nextDistrict);
      if (cityForBackfill) {
        params.set("lat", String(cityForBackfill.lat));
        params.set("lng", String(cityForBackfill.lng));
        params.set("radius", "20000");
        params.set("backfill", "1");
        params.set("backfillTarget", String(DISCOVERY_IMPORT_TARGET));
        params.set("backfillRadius", "20000");
        params.set("backfillCity", cityForBackfill.label);
        if (directoryImportJob) {
          params.set("backfillCategorySlug", directoryImportJob.slug);
          params.set("backfillCategoryLabel", directoryCategory?.child?.label ?? directoryCategory?.top.label ?? directoryImportJob.slug);
          params.set("backfillKeyword", directoryImportJob.keyword);
          params.set("storeType", directoryImportJob.storeType);
          params.set("superCategory", directoryImportJob.homepageSuperCategory);
          if (directoryImportJob.googlePlaceType) params.set("googlePlaceType", directoryImportJob.googlePlaceType);
        } else if (keywordsParam) {
          params.set("backfillCategorySlug", keywordsParam.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48));
          params.set("backfillCategoryLabel", keywordsParam);
        } else if (nextSuperCategory) {
          params.set("backfillCategorySlug", nextSuperCategory);
          params.set("backfillKeyword", nextQuery.trim() || "işletmeler");
        }
      } else if (!canonicalCityLabel && !nextCitySlug) {
        // Şehir seçilmediyse Türkiye geneli son eklenen işletmeler (demo/kamu hariç).
        params.set("recentFirst", "1");
      }

      if (reset) {
        if (showLoading) setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const myId = ++fetchSeqRef.current;
      try {
        const { ok: httpOk, data: d } = await fetchPublicJson<{ success?: boolean; data?: ListingBusiness[]; total?: number }>(
          `${API}/map/businesses?${params}`,
        );
        if (myId !== fetchSeqRef.current) return; // daha yeni bir istek başlatıldı; bu yanıtı yok say
        const ok = httpOk && d?.success === true && Array.isArray(d.data);
        if (!ok) {
          // Başarısız/eskimiş yanıt: reset olsa bile mevcut listeyi SİLME (geçici hata sonuçları yok etmesin).
          return;
        }
        const items: ListingBusiness[] = d.data as ListingBusiness[];
        const total = typeof d?.total === "number" ? d.total : items.length;
        const scopeSlug = nextCitySlug || cityForBackfill?.slug || "";
        const backendGeoScoped = Boolean(cityForBackfill);
        const clientFiltered = filterListingBusinessesClientSide(items, {
          scopeCity: backendGeoScoped ? "" : canonicalCityLabel,
          scopeSlug: backendGeoScoped ? "" : scopeSlug,
          excludeKamu: nextSuperCategory !== "kamu",
        });
        setTotalBusinesses(reset && !backendGeoScoped && (canonicalCityLabel || scopeSlug) ? clientFiltered.length : total);
        setBusinesses((prev) => (reset ? clientFiltered : [...prev, ...clientFiltered]));
      } catch {
        // Ağ hatası: mevcut liste korunur (boşaltma yapılmaz).
      } finally {
        // En güncel istek tamamlandığında yükleme bayrağını her zaman kapat; showLoading:false
        // arka plan yenilemeleri önceki isteğin loading=true bırakıp iskeleti sonsuza kilitlemesin.
        if (myId === fetchSeqRef.current) {
          if (reset) setLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    [activeDiscoveryCategory, activeDiscoveryCity, activeDiscoveryCityDef, activeDiscoverySubcategory, appliedQuery, category, directoryGroups, loc.city, loc.district, mapSuperCategory, publicDiscoveryCityByLabel, showYellowPages, yellowPagesAllMode],
  );

  // Filtre (fetchBusinesses kimliği) değişince: ilk sayfayı baştan yükle. Reset
  // sırasında "load more" effect'i ESKİ pageOffset (ör. 24) ile append çağırıp ilk
  // sayfayı atlamasın diye resetInFlightRef ile koru.
  const resetInFlightRef = useRef(false);
  useEffect(() => {
    resetInFlightRef.current = true;
    setPageOffset(0);
    void fetchBusinesses(0, true).finally(() => {
      resetInFlightRef.current = false;
    });
  }, [fetchBusinesses]);

  useEffect(() => {
    if (pageOffset === 0 || resetInFlightRef.current) return;
    void fetchBusinesses(pageOffset, false);
  }, [pageOffset, fetchBusinesses]);

  const hasMoreBusinesses = businesses.length < totalBusinesses;
  const cityForImport = activeDiscoveryCityDef ?? publicDiscoveryCityByLabel.get(loc.city.toLocaleLowerCase("tr-TR"));
  const suppressCityWideImport = Boolean(directoryEntryByQuery || yellowPagesAllMode);
  const canImportMoreForCity = Boolean(
    cityForImport &&
    !cityImportExhausted &&
    !suppressCityWideImport &&
    (activeDiscoveryCategory
      ? cityImportCursor < selectedDiscoveryCategoryJobs.length
      : cityImportCursor < KESFET_DISCOVERY_CATEGORIES.length),
  );

  // URL arama parametrelerini bileşen state'ine uygular. Hem tarayıcı geri/ileri
  // (popstate) hem de wouter Link/navigate ile (pushState) gelen URL değişimlerinde
  // çağrılır; böylece query değişince liste yeniden yüklenir (Popüler Aramalar çipleri).
  const applyParamsToState = useCallback((params: URLSearchParams) => {
    const q = params.get("q") ?? "";
    const city = params.get("city") ?? "";
    const cat = params.get("category") ?? params.get("categoryId") ?? "";
    const superCat = params.get("superCategory") ?? "";
    const regionParam = params.get("country") ?? "turkiye";
    const region = KESFET_PUBLIC_DISCOVERY_REGIONS.some((item) => item.slug === regionParam) ? regionParam : "turkiye";
    const citySlug = params.get("citySlug") ?? "";
    const directoryCat = params.get("directoryCategory") ?? "";
    const foundDirectoryCat = findKesfetDiscoveryCategory(directoryCat);
    const cityByLabel = new Map<string, KesfetDiscoveryCity>();
    for (const discoveryRegion of KESFET_PUBLIC_DISCOVERY_REGIONS) {
      for (const discoveryCity of discoveryRegion.cities) {
        cityByLabel.set(discoveryCity.label.toLocaleLowerCase("tr-TR"), discoveryCity);
      }
    }
    const cityResolved = findDiscoveryCityBySlugOrLabel(citySlug, city, cityByLabel);
    const resolvedCityLabel = cityResolved?.label ?? city;
    const resolvedCitySlug = citySlug || cityResolved?.slug || "";
    setQueryInput((prev) => (prev === q ? prev : q));
    setAppliedQuery((prev) => (prev === q ? prev : q));
    setLocationQuery((prev) => (prev === resolvedCityLabel ? prev : resolvedCityLabel));
    setLoc((prev) => (prev.city === resolvedCityLabel ? prev : { ...prev, city: resolvedCityLabel, district: "" }));
    setCategory((prev) => (prev === cat ? prev : cat));
    setMapSuperCategory((prev) => (prev === superCat ? prev : superCat));
    setActiveDiscoveryRegion((prev) => (prev === region ? prev : region));
    setActiveDiscoveryCity((prev) => (prev === resolvedCitySlug ? prev : resolvedCitySlug));
    setActiveDiscoveryCategory((prev) => (prev === (foundDirectoryCat?.top.slug ?? "") ? prev : (foundDirectoryCat?.top.slug ?? "")));
    setActiveDiscoverySubcategory((prev) => (prev === (foundDirectoryCat?.child?.slug ?? "") ? prev : (foundDirectoryCat?.child?.slug ?? "")));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      applyParamsToState(readKesfetSearchParams());
      setCityImportCursor(0);
      setCityImportExhausted(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyParamsToState]);

  // wouter location/search değişimi (Link/navigate pushState) popstate tetiklemez;
  // bu yüzden useSearch ile reaktif olarak dinleyip state'i URL ile eşitliyoruz.
  const routeSearch = useSearch();
  useEffect(() => {
    applyParamsToState(new URLSearchParams(routeSearch));
  }, [routeSearch, applyParamsToState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = readKesfetSearchParams();
    if (!["1", "true", "yes"].includes((params.get("featured") ?? "").toLowerCase())) return;
    params.delete("featured");
    const qs = params.toString();
    const next = qs ? `${KESFET_LISTING_PATH}?${qs}` : KESFET_LISTING_PATH;
    window.history.replaceState(null, "", `${next}#ss-featured-grid`);
    requestAnimationFrame(() => {
      document.getElementById("ss-featured-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [routeSearch]);

  function runSearch() {
    applySearch();
  }

  async function handleMyLocation() {
    setLocating(true);
    try {
      const { loc: resolved, label } = await resolveLocationFromBrowser(siteSettings ?? null);
      setLoc(resolved);
      setLocationQuery(label);
      syncSearchUrl(appliedQuery, resolved.city, category);
    } catch {
      window.alert("Konum alınamadı — tarayıcı konum iznini kontrol edin.");
    } finally {
      setLocating(false);
    }
  }

  const postDiscoveryImport = useCallback(async (
    city: KesfetDiscoveryCity,
    job: ReturnType<typeof buildKesfetDiscoveryImportJobs>[number],
  ): Promise<{ ok: boolean; warning: string | null; pending: boolean }> => {
    const params = new URLSearchParams({
      limit: "1",
      lat: String(city.lat),
      lng: String(city.lng),
      radius: "20000",
      backfill: "1",
      backfillTarget: String(DISCOVERY_IMPORT_TARGET),
      backfillRadius: "20000",
      backfillCity: city.label,
      superCategory: job.homepageSuperCategory,
      backfillCategorySlug: job.slug,
      backfillCategoryLabel: job.keyword,
      backfillKeyword: job.keyword,
      storeType: job.storeType,
    });
    if (job.googlePlaceType) params.set("googlePlaceType", job.googlePlaceType);
    const r = await fetch(`${API}/map/businesses?${params}`, { cache: "no-store" });
    const d = await r.json().catch(() => ({})) as {
      success?: boolean;
      backfill?: { status?: string; message?: string; error?: string; pending?: boolean };
    };
    const scrapeFailed = !r.ok || d.success !== true || d.backfill?.status === "error";
    return {
      ok: !scrapeFailed,
      warning: scrapeFailed
        ? (d.backfill?.message || d.backfill?.error || "İşletmeler arka planda hazırlanıyor; mevcut kayıtlar gösteriliyor.")
        : null,
      pending: d.backfill?.pending === true,
    };
  }, []);

  const syncDirectoryBusinesses = useCallback(async (
    city: KesfetDiscoveryCity,
    top: KesfetDiscoveryCategory,
    startIndex = cityImportCursor,
  ) => {
    const jobs = buildKesfetDiscoveryImportJobs(top);
    if (!jobs.length) return;
    const batch = jobs.slice(startIndex, startIndex + CATEGORY_IMPORT_JOB_BATCH_SIZE);
    if (!batch.length) {
      setCityImportExhausted(true);
      return;
    }
    setDiscoveryImporting(true);
    setDiscoveryImportError(null);
    try {
      let lastWarning: string | null = null;
      let hasPending = false;
      for (const job of batch) {
        const result = await postDiscoveryImport(city, job);
        if (!result.ok && result.warning) lastWarning = result.warning;
        if (result.pending) hasPending = true;
      }
      const nextCursor = startIndex + batch.length;
      setCityImportCursor(nextCursor);
      setCityImportExhausted(nextCursor >= jobs.length);
      setPageOffset(0);
      if (lastWarning) {
        setDiscoveryImportError(hasPending
          ? `${lastWarning} Kalan sonuçlar arka planda tamamlanıyor.`
          : lastWarning);
      }
      window.setTimeout(() => {
        void fetchBusinesses(0, true, {
          city: city.label,
          query: top.googleKeyword,
          category: "",
          superCategory: top.homepageSuperCategory,
          directoryCategory: top.slug,
          showLoading: false,
        });
      }, 250);
    } catch (err) {
      setDiscoveryImportError(err instanceof Error ? err.message : "İşletmeler yüklenirken bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.");
    } finally {
      setDiscoveryImporting(false);
    }
  }, [cityImportCursor, fetchBusinesses, postDiscoveryImport]);

  const syncCityDiscoveryBatch = useCallback(async (city: KesfetDiscoveryCity, startIndex = cityImportCursor) => {
    const batch = KESFET_DISCOVERY_CATEGORIES.slice(startIndex, startIndex + CITY_IMPORT_CATEGORY_BATCH_SIZE);
    if (!batch.length) {
      setCityImportExhausted(true);
      return;
    }

    setDiscoveryImporting(true);
    setDiscoveryImportError(null);
    try {
      let lastWarning: string | null = null;
      let hasPending = false;
      for (const top of batch) {
        const jobs = buildKesfetDiscoveryImportJobs(top);
        for (const job of jobs) {
          const result = await postDiscoveryImport(city, job);
          if (!result.ok && result.warning) lastWarning = result.warning;
          if (result.pending) hasPending = true;
        }
        setPageOffset(0);
        void fetchBusinesses(0, true, { city: city.label, showLoading: false });
      }
      const nextCursor = startIndex + batch.length;
      setCityImportCursor(nextCursor);
      setCityImportExhausted(nextCursor >= KESFET_DISCOVERY_CATEGORIES.length);
      setPageOffset(0);
      if (lastWarning) {
        setDiscoveryImportError(hasPending
          ? `${lastWarning} Kalan sonuçlar arka planda tamamlanıyor.`
          : lastWarning);
      }
      window.setTimeout(() => { void fetchBusinesses(0, true, { city: city.label, showLoading: false }); }, 250);
    } catch (err) {
      setDiscoveryImportError(err instanceof Error ? err.message : "İşletmeler yüklenirken bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.");
    } finally {
      setDiscoveryImporting(false);
    }
  }, [cityImportCursor, fetchBusinesses, postDiscoveryImport]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || loading || loadingMore || discoveryImporting || (!hasMoreBusinesses && !canImportMoreForCity)) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (hasMoreBusinesses) setPageOffset((prev) => prev + BUSINESS_PAGE_SIZE);
          else if (cityForImport && activeDiscoveryCategory && selectedDiscoveryCategory?.top) {
            void syncDirectoryBusinesses(cityForImport, selectedDiscoveryCategory.top, cityImportCursor);
          }           else if (cityForImport && !suppressCityWideImport) {
            void syncCityDiscoveryBatch(cityForImport, cityImportCursor);
          }
        }
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeDiscoveryCategory, canImportMoreForCity, cityForImport, cityImportCursor, discoveryImporting, hasMoreBusinesses, loading, loadingMore, businesses.length, selectedDiscoveryCategory, suppressCityWideImport, syncCityDiscoveryBatch, syncDirectoryBusinesses]);

  const selectDiscoveryRegion = useCallback((regionSlug: string) => {
    const region = findKesfetDiscoveryRegion(regionSlug);
    if (!region || !KESFET_PUBLIC_DISCOVERY_REGIONS.some((item) => item.slug === region.slug)) return;
    setActiveDiscoveryRegion(region.slug);
    setActiveDiscoveryCity("");
    setShowYellowPages(false);
    setYellowPagesAllMode(false);
    setLoc((prev) => ({ ...prev, city: "", district: "" }));
    setLocationQuery("");
    setActiveDiscoveryCategory("");
    setActiveDiscoverySubcategory("");
    setCityImportCursor(0);
    setCityImportExhausted(false);
    syncSearchUrl(appliedQuery, "", category, mapSuperCategory, region.slug, "", "");
  }, [appliedQuery, category, mapSuperCategory, syncSearchUrl]);

  const selectDiscoveryCity = useCallback((city: KesfetDiscoveryCity) => {
    setActiveDiscoveryCity(city.slug);
    setShowYellowPages(false);
    setYellowPagesAllMode(false);
    setLoc((prev) => ({ ...prev, city: city.label, district: "" }));
    setLocationQuery(city.label);
    setActiveDiscoveryCategory("");
    setActiveDiscoverySubcategory("");
    setCityImportCursor(0);
    setCityImportExhausted(false);
    syncSearchUrl(appliedQuery, city.label, category, mapSuperCategory, activeDiscoveryRegion, city.slug, "");
    void syncCityDiscoveryBatch(city, 0);
  }, [activeDiscoveryRegion, appliedQuery, category, mapSuperCategory, syncCityDiscoveryBatch, syncSearchUrl]);

  const openYellowPagesAll = useCallback(() => {
    setShowYellowPages(true);
    setYellowPagesAllMode(true);
    setActiveDiscoveryCategory("");
    setActiveDiscoverySubcategory("");
    setCategory("");
    setMapSuperCategory("");
    setQueryInput("");
    setAppliedQuery("");
    setCityImportCursor(0);
    setCityImportExhausted(false);
    syncSearchUrl("", loc.city, "", mapSuperCategory, activeDiscoveryRegion, activeDiscoveryCity, "");
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("yellowPages", "1");
      params.set("yellowPagesAll", "1");
      params.delete("q");
      params.delete("directoryCategory");
      window.history.replaceState(null, "", `${KESFET_LISTING_PATH}?${params.toString()}`);
    }
  }, [activeDiscoveryCity, activeDiscoveryRegion, loc.city, mapSuperCategory, syncSearchUrl]);

  const openYellowPagesDirectory = useCallback(() => {
    setShowYellowPages(true);
    setYellowPagesAllMode(false);
    setActiveDiscoveryCategory("");
    setActiveDiscoverySubcategory("");
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("yellowPages", "1");
      params.delete("yellowPagesAll");
      window.history.replaceState(null, "", `${KESFET_LISTING_PATH}?${params.toString()}`);
    }
  }, []);

  const selectDiscoveryCategory = useCallback((top: KesfetDiscoveryCategory) => {
    const keyword = top.googleKeyword;
    setShowYellowPages(false);
    setYellowPagesAllMode(false);
    setActiveDiscoveryCategory(top.slug);
    setActiveDiscoverySubcategory("");
    setCityImportCursor(0);
    setCityImportExhausted(false);
    setCategory("");
    setMapSuperCategory(top.homepageSuperCategory);
    setQueryInput(keyword);
    setAppliedQuery(keyword);
    syncSearchUrl(keyword, loc.city, "", top.homepageSuperCategory, activeDiscoveryRegion, activeDiscoveryCity, top.slug);
    if (activeDiscoveryCityDef) {
      void syncDirectoryBusinesses(activeDiscoveryCityDef, top, 0);
    }
  }, [activeDiscoveryCity, activeDiscoveryCityDef, activeDiscoveryRegion, loc.city, syncDirectoryBusinesses, syncSearchUrl]);

  const discoveryCityChipMeta = useCallback((city: KesfetDiscoveryCity) => {
    const turkeyCity = activeDiscoveryRegionDef.slug === "turkiye" ? turkeyCityByName.get(city.label) : undefined;
    return {
      emoji: turkeyCity?.emoji ?? activeRegionEmoji,
      title: turkeyCity ? cityAccessibilityLabel(turkeyCity) : city.label,
    };
  }, [activeDiscoveryRegionDef.slug, activeRegionEmoji, turkeyCityByName]);

  const syncLocationBusinesses = useCallback(async (q: string) => {
    const locationText = locationQuery.trim() || loc.city.trim();
    const selectedTop = selectedDiscoveryCategory?.top;
    const city = activeDiscoveryCityDef ?? publicDiscoveryCityByLabel.get(locationText.toLocaleLowerCase("tr-TR"));
    if (selectedTop && city) {
      await syncDirectoryBusinesses(city, selectedTop, 0);
      return;
    }
    if (!locationText && !q.trim()) return;

    const importKeyword = q.trim() || selectedTop?.googleKeyword || "işletmeler";
    setDiscoveryImporting(true);
    setDiscoveryImportError(null);
    try {
      if (!city) return;
      const result = await postDiscoveryImport(city, {
        slug: selectedTop?.slug ?? mapSuperCategory ?? "isletmeler",
        keyword: importKeyword,
        googlePlaceType: selectedTop?.googlePlaceType,
        homepageSuperCategory: selectedTop?.homepageSuperCategory ?? mapSuperCategory ?? "mekan_dukkan",
        storeType: selectedTop?.storeType ?? mapSuperCategory ?? "mekan_dukkan",
      });
      if (!result.ok && result.warning) {
        setDiscoveryImportError(result.pending
          ? `${result.warning} Kalan sonuçlar arka planda tamamlanıyor.`
          : result.warning);
      }
      setPageOffset(0);
      window.setTimeout(() => { void fetchBusinesses(0, true); }, 250);
    } catch (err) {
      setDiscoveryImportError(err instanceof Error ? err.message : "İşletmeler yüklenirken bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.");
    } finally {
      setDiscoveryImporting(false);
    }
  }, [activeDiscoveryCityDef, fetchBusinesses, loc.city, locationQuery, mapSuperCategory, postDiscoveryImport, publicDiscoveryCityByLabel, selectedDiscoveryCategory, syncDirectoryBusinesses]);

  const isPreparingCityBusinesses = Boolean(
    loading ||
    discoveryImporting,
  );

  useEffect(() => {
    if (loading || discoveryImporting || businesses.length >= CITY_IMPORT_MIN_RESULTS || !canImportMoreForCity) return;
    const hasImportableFilter = Boolean(
      appliedQuery.trim() ||
      locationQuery.trim() ||
      loc.city.trim() ||
      activeDiscoveryCategory ||
      activeDiscoveryCityDef,
    );
    if (!hasImportableFilter) return;
    const key = [
      appliedQuery.trim().toLocaleLowerCase("tr-TR"),
      locationQuery.trim().toLocaleLowerCase("tr-TR"),
      loc.city.trim().toLocaleLowerCase("tr-TR"),
      activeDiscoveryCityDef?.slug ?? "",
      activeDiscoveryCategory,
      mapSuperCategory,
    ].join("|");
    if (importAttemptKeysRef.current.has(key)) return;
    importAttemptKeysRef.current.add(key);
    if (cityForImport && activeDiscoveryCategory && selectedDiscoveryCategory?.top) {
      void syncDirectoryBusinesses(cityForImport, selectedDiscoveryCategory.top, cityImportCursor);
    } else if (cityForImport && !activeDiscoveryCategory && !appliedQuery.trim() && !suppressCityWideImport) {
      // Yalnız şehir seçili (anahtar kelime yok) → şehir geneli kategori taraması.
      void syncCityDiscoveryBatch(cityForImport, cityImportCursor);
    } else if (!suppressCityWideImport && appliedQuery.trim()) {
      // Kategori/anahtar kelime sorgusu (ör. "Aile Hekimleri") → o terime özel içe aktarım.
      void syncLocationBusinesses(appliedQuery);
    }
  }, [
    activeDiscoveryCategory,
    activeDiscoveryCityDef,
    appliedQuery,
    businesses.length,
    discoveryImporting,
    loading,
    loc.city,
    locationQuery,
    mapSuperCategory,
    canImportMoreForCity,
    cityForImport,
    cityImportCursor,
    selectedDiscoveryCategory,
    suppressCityWideImport,
    syncCityDiscoveryBatch,
    syncDirectoryBusinesses,
    syncLocationBusinesses,
  ]);

  return (
    <div className="lh-kesfet min-h-screen bg-white" data-page="kesfet-listing-hub">
      <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
        <section className={`lh-hero-full ${SADE_PUBLIC_HERO_SURFACE_CLASS}`} style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG_WHITE)}>
          <div className={`${SADE_PUBLIC_HERO_CONTENT_CLASS} lh-hero-panel text-center`}>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0f766e] ring-1 ring-emerald-100">
            <Compass className="h-3.5 w-3.5" />
            Yekpare Keşfet
          </span>
          <h1>Yakındaki işletmeleri keşfedin</h1>
          <p className="lh-hero-sub">
            Restoran, market, hizmet ve daha fazlasını puan, konum ve kategoriye göre arayın.
          </p>

          <form
            className="lh-hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              void locationFieldRef.current?.commit().then(() => {
                runSearch();
                void syncLocationBusinesses((queryInput || appliedQuery).trim());
              });
            }}
          >
            <div className="lh-hero-search-grid">
              <div className="lh-field">
                <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
                <input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Ne arıyorsunuz?"
                  aria-label="İşletme ara"
                />
              </div>
              <KesfetHeroLocationField
                ref={locationFieldRef}
                mapsSettings={siteSettings ?? null}
                displayValue={locationQuery}
                onDisplayChange={setLocationQuery}
                onLocationResolved={(nextLoc) => {
                  setLoc(nextLoc);
                  syncSearchUrl(appliedQuery, nextLoc.city, category);
                }}
              />
              <div className="lh-field">
                <select
                  value={category}
                  onChange={(e) => {
                    const nextCategory = e.target.value;
                    setCategory(nextCategory);
                    syncSearchUrl(appliedQuery, loc.city, nextCategory);
                  }}
                  aria-label="Kategori"
                >
                  <option value="">Tüm kategoriler</option>
                  {filterCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ""}
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="lh-btn-primary m-1 px-6">
                <Search className="mr-1 inline h-4 w-4" />
                Ara
              </button>
            </div>
          </form>

          <div className="lh-popular-tags">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={appliedQuery.trim().toLowerCase() === tag.toLowerCase() ? "active" : undefined}
                onClick={() => applySearch(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="lh-hero-actions">
            <button
              type="button"
              className="lh-hero-action lh-hero-action-map"
              disabled={locating}
              onClick={() => void handleMyLocation()}
            >
              <MapPin className="h-4 w-4" />
              {locating ? "Konum alınıyor…" : "Konumum"}
            </button>
            <Link href="/haritalar" className="lh-hero-action lh-hero-action-map">
              <Compass className="h-4 w-4" />
              Harita görünümü
            </Link>
            <Link href="/isletme-basvuru" className="lh-hero-action lh-hero-action-add">
              İşletmeni ekle
            </Link>
          </div>
        </div>
      </section>
      </div>

      <section className="lh-section bg-light">
        <div className="lh-container">
          <FeaturedBusinessesPanel title="Popüler işletmeler" />
        </div>
      </section>

      <section id="lh-popular-businesses" ref={resultsRef} className="lh-section bg-light">
        <div className="lh-container">
          <section className="ss-panel-card ss-directory-section lh-popular-businesses-panel" aria-label="İşletme listesi">
            <div className="ss-panel-card-head">
              <div className="ss-panel-card-head-icon" aria-hidden>
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="ss-panel-card-title">
                  İşletme listesi — <span>{locLabel}</span>
                </h2>
                <p className="ss-panel-card-sub">
                  {loading
                    ? "İşletmeler yükleniyor…"
                    : appliedQuery.trim()
                      ? `"${appliedQuery.trim()}" için ${totalBusinesses} sonuç`
                      : `${totalBusinesses} işletme listeleniyor`}
                </p>
              </div>
            </div>
            <div className="ss-panel-card-body">
          <div className="lh-business-city-filter">
            <div className="lh-discovery-scroll lh-discovery-country-row" aria-label="Ülke seçimi">
              {KESFET_PUBLIC_DISCOVERY_REGIONS.map((region) => {
                const active = region.slug === activeDiscoveryRegion;
                return (
                  <button
                    key={region.slug}
                    type="button"
                    onClick={() => selectDiscoveryRegion(region.slug)}
                    className={`lh-discovery-pill${active ? " active" : ""}`}
                    aria-pressed={active}
                  >
                    <span className="lh-all-cities-chip-emoji" aria-hidden>
                      {DISCOVERY_REGION_EMOJIS[region.slug] ?? "📍"}
                    </span>
                    {region.label}
                  </button>
                );
              })}
            </div>
            <h3 className="lh-all-cities-head">Tüm şehirler</h3>
            <div className="lh-all-cities-scroll" role="list" aria-label="Şehir filtreleri">
              <button
                type="button"
                role="listitem"
                className={`lh-all-cities-chip${!loc.city ? " active" : ""}`}
                onClick={() => selectDiscoveryRegion(activeDiscoveryRegion)}
                aria-pressed={!loc.city}
              >
                <span className="lh-all-cities-chip-emoji" aria-hidden>
                  {activeRegionEmoji}
                </span>
                {activeDiscoveryRegionDef.label} geneli
              </button>
              {activeDiscoveryRegionDef.cities.map((city) => {
                const isActive = city.slug === activeDiscoveryCity || loc.city === city.label;
                const meta = discoveryCityChipMeta(city);
                return (
                  <button
                    key={`${activeDiscoveryRegionDef.slug}-${city.slug}`}
                    type="button"
                    role="listitem"
                    className={`lh-all-cities-chip${isActive ? " active" : ""}`}
                    onClick={() => selectDiscoveryCity(city)}
                    aria-pressed={isActive}
                    title={meta.title}
                  >
                    <span className="lh-all-cities-chip-emoji" aria-hidden>
                      {meta.emoji}
                    </span>
                    {city.label}
                  </button>
                );
              })}
            </div>
            {activeDiscoveryCityDef ? (
              <div className="lh-discovery-taxonomy" aria-label="Kategori seçimi">
                <button
                  type="button"
                  onClick={() => void openYellowPagesAll()}
                  className={`lh-discovery-category-main${yellowPagesAllMode ? " active" : ""}`}
                  aria-pressed={yellowPagesAllMode}
                  title="Seçili konumdaki tüm işletmeler — Sarı Sayfalar dizini"
                >
                  <span>🏢</span>
                  <span>Tümü</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showYellowPages && !yellowPagesAllMode) setShowYellowPages(false);
                    else openYellowPagesDirectory();
                  }}
                  className={`lh-discovery-category-main${showYellowPages && !yellowPagesAllMode ? " active" : ""}`}
                  aria-pressed={showYellowPages && !yellowPagesAllMode}
                  title="Sarı Sayfalar — tüm kategorilerin A–Z firma rehberi ve kamu kurumları"
                >
                  <span>📒</span>
                  <span>Sarı Sayfalar</span>
                </button>
                {KESFET_DISCOVERY_CATEGORIES.map((top) => {
                  const active = selectedDiscoveryCategory?.top.slug === top.slug;
                  return (
                    <button
                      key={top.slug}
                      type="button"
                      onClick={() => selectDiscoveryCategory(top)}
                      className={`lh-discovery-category-main${active ? " active" : ""}`}
                      aria-pressed={active}
                    >
                      <span>{top.icon}</span>
                      <span>{top.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="lh-discovery-hint">Şehir seçince üst kategoriler açılır.</div>
            )}
          </div>
            </div>
          </section>

          {showYellowPages && activeDiscoveryCityDef ? (
            <div className="lh-yellowpages space-y-6">
              {yellowPagesAllMode ? (
                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#0f766e]" />
                      <h3 className="text-lg font-extrabold text-slate-800">Sarı Sayfalar — Tüm İşletmeler</h3>
                      {totalBusinesses ? <span className="text-xs text-slate-400">{totalBusinesses} kayıt</span> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => openYellowPagesDirectory()}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[#0f766e] hover:bg-emerald-100"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Kategori rehberi
                    </button>
                  </div>
                  <p className="mb-4 text-sm text-slate-500">
                    {locLabel} bölgesindeki tüm işletmeler — Sarı Sayfalar dizini.
                  </p>
                  {(loading || (isPreparingCityBusinesses && !businesses.length)) && !businesses.length ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                      ))}
                    </div>
                  ) : businesses.length ? (
                    <>
                      <div className="divide-y divide-slate-100">
                        {businesses.map((biz) => (
                          <YellowPagesRow key={biz.id} business={biz} />
                        ))}
                      </div>
                      {hasMoreBusinesses ? (
                        <div className="mt-4 text-center">
                          <button
                            type="button"
                            onClick={() => setPageOffset((prev) => prev + BUSINESS_PAGE_SIZE)}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#0f766e] hover:bg-emerald-100 disabled:opacity-60"
                          >
                            {loadingMore ? "Yükleniyor…" : "Daha fazla göster"}
                          </button>
                        </div>
                      ) : businesses.length > BUSINESS_PAGE_SIZE ? (
                        <p className="mt-3 text-center text-xs text-slate-400">Tüm kayıtlar listelendi.</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500">
                      Bu konum için henüz listelenecek işletme yok.
                    </p>
                  )}
                </div>
              ) : null}
              {!yellowPagesAllMode ? (
              <>
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#0f766e]" />
                  <h3 className="text-lg font-extrabold text-slate-800">Sarı Sayfalar — Tüm Kategoriler</h3>
                </div>
                <p className="mb-4 text-sm text-slate-500">
                  {locLabel} için A–Z firma rehberi. Bir kategori seçerek işletmeleri listeleyin.
                </p>
                {directoryByLetter.length ? (
                  <>
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {directoryByLetter.map(([letter]) => (
                        <a
                          key={letter}
                          href={`#sarisayfa-${letter}`}
                          className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-[#0f766e] hover:bg-emerald-100"
                        >
                          {letter}
                        </a>
                      ))}
                    </div>
                    <div className="space-y-5">
                      {directoryByLetter.map(([letter, entries]) => (
                        <div key={letter} id={`sarisayfa-${letter}`}>
                          <div className="mb-2 border-b border-emerald-100 pb-1 text-sm font-black text-[#0f766e]">
                            {letter}
                          </div>
                          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                            {entries.map((entry) => (
                              <button
                                key={`${entry.group}-${entry.slug}`}
                                type="button"
                                onClick={() => openDirectoryCategory(entry)}
                                className="truncate text-left text-sm text-slate-600 hover:text-[#0f766e] hover:underline"
                                title={`${entry.name} — ${entry.group}`}
                              >
                                {entry.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-sm text-slate-500">Kategori rehberi yükleniyor…</p>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#0f766e]" />
                  <h3 className="text-lg font-extrabold text-slate-800">Kamu ve Kamusal Alan</h3>
                  {kamuTotal ? <span className="text-xs text-slate-400">{kamuTotal} kayıt</span> : null}
                </div>
                {kamuLoading && !kamuBusinesses.length ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                ) : kamuBusinesses.length ? (
                  <>
                    <div className="divide-y divide-slate-100">
                      {kamuBusinesses.map((biz) => (
                        <YellowPagesRow key={biz.id} business={biz} />
                      ))}
                    </div>
                    {hasMoreKamu ? (
                      <div ref={kamuLoadMoreRef} className="h-6" aria-hidden />
                    ) : (
                      <p className="mt-3 text-center text-xs text-slate-400">Tüm kamu kayıtları listelendi.</p>
                    )}
                    {kamuLoading && kamuBusinesses.length ? (
                      <p className="mt-2 text-center text-xs text-slate-400">Daha fazla kayıt yükleniyor…</p>
                    ) : null}
                  </>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Bu şehir için kamu kaydı hazırlanıyor; lütfen biraz sonra tekrar deneyin.
                  </p>
                )}
              </div>
              </>
              ) : null}
            </div>
          ) : isDirectoryListingMode ? (
            <div className="lh-yellowpages space-y-6">
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#0f766e]" />
                    <h3 className="text-lg font-extrabold text-slate-800">
                      Sarı Sayfalar — {directoryEntryByQuery?.name}
                    </h3>
                    {totalBusinesses ? <span className="text-xs text-slate-400">{totalBusinesses} kayıt</span> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowYellowPages(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[#0f766e] hover:bg-emerald-100"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Tüm kategoriler
                  </button>
                </div>
                <p className="mb-4 text-sm text-slate-500">
                  {locLabel} için {directoryEntryByQuery?.name} firma rehberi.
                </p>
                {(loading || (isPreparingCityBusinesses && !businesses.length)) && !businesses.length ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                ) : businesses.length ? (
                  <>
                    <div className="divide-y divide-slate-100">
                      {businesses.map((biz) => (
                        <YellowPagesRow key={biz.id} business={biz} />
                      ))}
                    </div>
                    {hasMoreBusinesses ? (
                      <div className="mt-4 text-center">
                        <button
                          type="button"
                          onClick={() => setPageOffset((prev) => prev + BUSINESS_PAGE_SIZE)}
                          disabled={loadingMore}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#0f766e] hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {loadingMore ? "Yükleniyor…" : "Daha fazla göster"}
                        </button>
                      </div>
                    ) : businesses.length > BUSINESS_PAGE_SIZE ? (
                      <p className="mt-3 text-center text-xs text-slate-400">Tüm kayıtlar listelendi.</p>
                    ) : null}
                  </>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">
                    {directoryEntryByQuery?.name} için kayıtlar hazırlanıyor; lütfen biraz sonra tekrar deneyin.
                  </p>
                )}
              </div>
            </div>
          ) : loading || (isPreparingCityBusinesses && !businesses.length) ? (
            <div className="lh-listing-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="lh-listing-item h-80 animate-pulse bg-white" />
              ))}
            </div>
          ) : businesses.length ? (
            <>
              <div className="lh-listing-grid">
                {businesses.map((business) => (
                  <ListingHubCard
                    key={business.id}
                    business={business}
                    categoryLabel={
                      business.categoryName || categoryById[business.categoryId ?? ""]?.name || "İşletme"
                    }
                  />
                ))}
              </div>
              {hasMoreBusinesses || canImportMoreForCity ? (
                <div ref={loadMoreRef} className="lh-listing-load-sentinel" aria-hidden />
              ) : businesses.length > BUSINESS_PAGE_SIZE ? (
                <p className="lh-listing-end-note">Tüm işletmeler listelendi.</p>
              ) : null}
              {loadingMore ? (
                <div className="lh-listing-load-more" role="status" aria-live="polite">
                  <span className="lh-listing-load-spinner" aria-hidden />
                  Daha fazla işletme yükleniyor…
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <p className="font-semibold text-slate-600">
                {appliedQuery.trim() || loc.city || category
                  ? "Bu şehir için uygun özel işletme bulunamadı."
                  : "Henüz listelenecek işletme yok."}
              </p>
              {(appliedQuery.trim() || loc.city) ? (
                <p className="mt-2 text-sm text-slate-500">
                  Farklı bir üst kategori seçebilir veya aramayı daha genel bir ifadeyle tekrar deneyebilirsiniz.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="lh-section bg-light">
        <div className="lh-container text-center">
          <h2 className="mb-2 text-2xl font-extrabold">Yekpare Keşfet bülteni</h2>
          <p className="mb-6 text-slate-500">Yeni işletmeler ve kampanyalardan haberdar olun</p>
          <form
            className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="E-posta adresiniz"
              className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0f766e]"
            />
            <button type="button" className="lh-btn-primary rounded-lg px-6">
              Abone ol
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
