import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  Compass,
  Globe,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Star,
  Sparkles,
} from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { effectiveMapsGeocodeSettings } from "@/lib/mapsGeocode";
import {
  KesfetHeroLocationField,
  type KesfetHeroLocationFieldHandle,
} from "@/components/kesfet-listinghub/KesfetHeroLocationField";
import { KesfetHeroKeywordField } from "@/components/kesfet-listinghub/KesfetHeroKeywordField";
import { FeaturedBusinessesPanel } from "@/components/kesfet-listinghub/FeaturedBusinessesPanel";
import { PopularSearchesPanel } from "@/components/kesfet-listinghub/PopularSearchesPanel";
import { haritalarNavHref } from "@/lib/haritalarNav";
import { KESFET_LISTING_PATH } from "@/lib/kesfetDiscoverHub";
import { KESFET_DISCOVER_GROUPS } from "@/lib/kesfetDiscoverCategories";
import {
  findKesfetDirectoryKeywordEntry,
  listKesfetDirectoryEntries,
  resolveKesfetKeywordsParam,
  type KesfetSearchSuggestRow,
} from "@/lib/kesfetDirectoryLookup";
import { fetchTurkeyCityDistrictNames } from "@/lib/fetchTurkeyCityDistricts";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { useBrowserLocationSearch } from "@/hooks/useBrowserLocationSearch";
import { SariSayfalarNavLink } from "@/lib/sariSayfalarNav";
import { findTurkeyCityByNameOrSlug, TURKEY_CITIES, turkeyCitySlugFromName } from "@/lib/popularCities";
import { applySocialShareMeta, resetSeoToSiteDefaults, seoPlainSnippet } from "@/lib/pageSeo";
import {
  buildSariSayfalarGeoSeoText,
  buildSariSayfalarListPath,
  buildSariSayfalarDetailPath,
  buildSariSayfalarResultTitle,
  buildSariSayfalarSeoTitle,
  buildSariSayfalarSidebarTops,
  parseSariSayfalarSearchParams,
  readSariSayfalarSearchParams,
  resolveSariSayfalarSearchParams,
  resolveSariSayfalarActiveSubSlug,
  resolveSariSayfalarActiveTop,
  sariSayfalarUrlFingerprint,
  sariSayfalarFiltersFingerprint,
  SARI_SAYFALAR_INSAAT_TOP,
  type InsaatfirmalarimCatalogCategory,
  type SariSayfalarSidebarSub,
  type SariSayfalarSidebarTop,
} from "@/lib/sariSayfalarUtils";
import {
  SADE_PUBLIC_HERO_CONTENT_CLASS,
  SADE_PUBLIC_HERO_STAGE_CLASS,
  SADE_PUBLIC_HERO_SURFACE_CLASS,
  SADE_PUBLIC_PAGE_BG_WHITE,
  SADE_PUBLIC_POST_HERO_BODY_CLASS,
  sadePublicHeroFadeStyle,
} from "@/lib/yekpareSadeTheme";
import "@/styles/listinghubKesfet.css";
import "@/styles/sariSayfalar.css";

const API = "/api";
const PAGE_SIZE = 20;

export type SariSayfalarBusiness = {
  id: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
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
  category?: { id?: string; name?: string | null; slug?: string | null } | null;
  categoryName?: string | null;
  city?: { id?: string; name?: string | null; nameTr?: string | null } | null;
  district?: { id?: string; name?: string | null } | null;
  responsiblePerson?: string | null;
  authorizedPersonName?: string | null;
  googlePlacesExtras?: Record<string, unknown> | null;
};

type MapCategory = {
  id: string;
  name: string;
  slug?: string | null;
  icon?: string | null;
};

type TrLoc = { city: string; district: string };

type MapStats = {
  businesses: number;
  categories: number;
  activeBusinesses: number;
  insaatfirmalarim?: number;
};

const CATEGORY_TILE_ACCENTS = [
  "ss-category-tile-accent-0",
  "ss-category-tile-accent-1",
  "ss-category-tile-accent-2",
  "ss-category-tile-accent-3",
  "ss-category-tile-accent-4",
  "ss-category-tile-accent-5",
];

function normalizeWebsite(url: string | null | undefined): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function contactLabel(biz: SariSayfalarBusiness): string {
  const fromApi = String(biz.responsiblePerson ?? biz.authorizedPersonName ?? "").trim();
  if (fromApi) return fromApi;
  const extras = (biz.googlePlacesExtras ?? null) as Record<string, unknown> | null;
  for (const key of ["responsiblePerson", "authorizedPersonName"]) {
    const val = String(extras?.[key] ?? "").trim();
    if (val) return val;
  }
  const desc = String(biz.description ?? "");
  const m = desc.match(/Yetkili:\s*([^.\n]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  return "";
}

function cityLabel(biz: SariSayfalarBusiness): string {
  return String(biz.city?.nameTr || biz.city?.name || "").trim();
}

function districtLabel(biz: SariSayfalarBusiness): string {
  return String(biz.district?.name || "").trim();
}

function categoryLabel(biz: SariSayfalarBusiness): string {
  return String(biz.category?.name || biz.categoryName || "").trim();
}

function verifyHref(biz: SariSayfalarBusiness, field: "phone" | "address"): string {
  const base = `/isletme-basvuru?mapBusinessId=${encodeURIComponent(biz.id)}&businessName=${encodeURIComponent(biz.name)}`;
  return `${base}&missing=${field}`;
}

function isFeaturedBusiness(biz: SariSayfalarBusiness): boolean {
  return Boolean(biz.homepageFeatured || biz.isPremium);
}

function SariSayfalarBreadcrumb({
  city,
  district,
  categoryLabel: catLabel,
  onCityClick,
  onDistrictClick,
  onCategoryClick,
}: {
  city: string;
  district: string;
  categoryLabel: string;
  onCityClick?: () => void;
  onDistrictClick?: () => void;
  onCategoryClick?: () => void;
}) {
  const onHub = !city && !district && !catLabel;
  return (
    <nav className="ss-breadcrumb" aria-label="Konum">
      <SariSayfalarNavLink href="/">Ana Sayfa</SariSayfalarNavLink>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
      <SariSayfalarNavLink href="/kesfet">Keşfet</SariSayfalarNavLink>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
      {onHub ? (
        <span aria-current="page">Sarı Sayfalar</span>
      ) : (
        <SariSayfalarNavLink href="/kesfet/sarisayfalar">Sarı Sayfalar</SariSayfalarNavLink>
      )}
      {city ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          {onCityClick ? (
            <button type="button" onClick={onCityClick}>{city}</button>
          ) : (
            <SariSayfalarNavLink href={buildSariSayfalarListPath({ city })}>{city}</SariSayfalarNavLink>
          )}
        </>
      ) : null}
      {district ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          {onDistrictClick ? (
            <button type="button" onClick={onDistrictClick}>{district}</button>
          ) : (
            <SariSayfalarNavLink href={buildSariSayfalarListPath({ city, district })}>{district}</SariSayfalarNavLink>
          )}
        </>
      ) : null}
      {catLabel ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          {onCategoryClick ? (
            <button type="button" onClick={onCategoryClick}>{catLabel}</button>
          ) : (
            <span aria-current="page">{catLabel}</span>
          )}
        </>
      ) : null}
    </nav>
  );
}

function SariSayfalarCard({
  biz,
  onCityFilter,
  onDistrictFilter,
  onCategoryFilter,
}: {
  biz: SariSayfalarBusiness;
  onCityFilter: (city: string) => void;
  onDistrictFilter: (district: string) => void;
  onCategoryFilter: (categoryId: string) => void;
}) {
  const featured = isFeaturedBusiness(biz);
  const web = normalizeWebsite(biz.website);
  const detailHref = buildSariSayfalarDetailPath(biz);
  const mapsHref = haritalarNavHref({
    id: biz.id,
    slug: biz.slug,
    lat: biz.latitude,
    lng: biz.longitude,
  });
  const city = cityLabel(biz);
  const district = districtLabel(biz);
  const category = categoryLabel(biz);
  const contact = contactLabel(biz);
  const address = String(biz.address ?? "").trim();
  const phone = String(biz.phone ?? "").trim();

  return (
    <article className={`ss-card${featured ? " featured" : ""}`}>
      <div className="ss-card-body">
        <div className="ss-card-info">
          {featured ? (
            <span className="ss-featured-badge">
              <Star className="h-3 w-3 fill-white" />
              Öne çıkan
            </span>
          ) : null}
          <h2 className="ss-card-name">
            <SariSayfalarNavLink href={detailHref}>{biz.name}</SariSayfalarNavLink>
            {contact ? <span className="ss-card-contact">({contact})</span> : null}
          </h2>

          {address ? (
            <p className="ss-card-address">{address}</p>
          ) : (
            <SariSayfalarNavLink href={verifyHref(biz, "address")} className="ss-ekle-link">
              Adres ekle →
            </SariSayfalarNavLink>
          )}

          {(city || district) ? (
            <div className="ss-card-loc">
              {city ? (
                <button type="button" className="ss-link-city" onClick={() => onCityFilter(city)}>
                  {city}
                </button>
              ) : null}
              {district ? (
                <>
                  {city ? <span className="text-slate-300">·</span> : null}
                  <button type="button" className="ss-link-district" onClick={() => onDistrictFilter(district)}>
                    {district}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {category ? (
            <button
              type="button"
              className="ss-card-category"
              onClick={() => {
                const catId = biz.category?.id || biz.category?.slug || "";
                if (catId) onCategoryFilter(catId);
              }}
            >
              {category}
            </button>
          ) : null}
        </div>

        <div className="ss-card-actions">
          {phone ? (
            <a href={`tel:${phone}`} className="ss-vbtn">
              <Phone className="h-3.5 w-3.5" />
              Telefon
            </a>
          ) : (
            <SariSayfalarNavLink href={verifyHref(biz, "phone")} className="ss-vbtn">
              Telefon ekle
            </SariSayfalarNavLink>
          )}
          <SariSayfalarNavLink href={mapsHref} className="ss-vbtn">
            <MapPin className="h-3.5 w-3.5" />
            Harita
          </SariSayfalarNavLink>
          {web ? (
            <a href={web} target="_blank" rel="noopener noreferrer" className="ss-vbtn">
              <Globe className="h-3.5 w-3.5" />
              Web
            </a>
          ) : (
            <span className="ss-vbtn muted">Web</span>
          )}
          <SariSayfalarNavLink href={detailHref} className="ss-vbtn primary">
            Detaylar
            <ArrowRight className="h-3.5 w-3.5" />
          </SariSayfalarNavLink>
        </div>
      </div>
    </article>
  );
}

function SariSayfalarMapSidebar({ businesses, city }: { businesses: SariSayfalarBusiness[]; city: string }) {
  const embed = useMemo(() => {
    const withCoords = businesses.find(
      (b) => b.latitude != null && b.longitude != null && Number.isFinite(b.latitude) && Number.isFinite(b.longitude),
    );
    if (withCoords) {
      const lat = withCoords.latitude as number;
      const lng = withCoords.longitude as number;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.04}%2C${lat - 0.03}%2C${lng + 0.04}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`;
    }
    return null;
  }, [businesses]);

  return (
    <aside className="ss-map-sidebar" aria-label="Harita önizleme">
      <div className="ss-map-sidebar-title">
        <MapPin className="h-4 w-4 text-[#0f766e]" />
        {city ? `${city} haritası` : "Harita"}
      </div>
      {embed ? (
        <iframe title={`${city} firma haritası`} src={embed} loading="lazy" />
      ) : (
        <div className="ss-map-sidebar-empty">
          Konum bilgisi olan firmalar haritada gösterilir.
        </div>
      )}
    </aside>
  );
}

function SariSayfalarPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav className="ss-pagination" aria-label="Sayfalama">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Önceki
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={p === page ? "active" : undefined}
          aria-current={p === page ? "page" : undefined}
          onClick={() => onPage(p)}
        >
          {p}
        </button>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Sonraki
      </button>
    </nav>
  );
}

export default function SariSayfalarHub() {
  const [, navigate] = useLocation();
  const initial = readSariSayfalarSearchParams();
  const initialQ = initial.get("q") ?? initial.get("keywords") ?? "";
  const initialCity = initial.get("city") ?? "";
  const initialDistrict = initial.get("district") ?? "";
  const initialCategory = initial.get("category") ?? "";
  const initialPage = Math.max(1, parseInt(initial.get("page") ?? "1", 10) || 1);

  const routeSearch = useSearch();
  const browserSearch = useBrowserLocationSearch();
  const urlFingerprintRef = useRef(
    sariSayfalarFiltersFingerprint(initialQ, initialCity, initialDistrict, initialCategory, initialPage),
  );

  const { data: siteSettings } = useGetSiteSettings();
  const mapsSettings = effectiveMapsGeocodeSettings(siteSettings ?? null);
  const locRef = useRef<KesfetHeroLocationFieldHandle>(null);

  const [keywordsInput, setKeywordsInput] = useState(initialQ);
  const [locDisplay, setLocDisplay] = useState(
    [initialDistrict, initialCity].filter(Boolean).join(", ") || initialCity,
  );
  const [loc, setLoc] = useState<TrLoc>({ city: initialCity, district: initialDistrict });
  const [categoryInput, setCategoryInput] = useState(initialCategory);

  const [appliedQ, setAppliedQ] = useState(initialQ);
  const [appliedCity, setAppliedCity] = useState(initialCity);
  const [appliedDistrict, setAppliedDistrict] = useState(initialDistrict);
  const [appliedCategory, setAppliedCategory] = useState(initialCategory);
  const [page, setPage] = useState(initialPage);

  const [businesses, setBusinesses] = useState<SariSayfalarBusiness[]>([]);
  const [categories, setCategories] = useState<MapCategory[]>([]);
  const [insaatCatalog, setInsaatCatalog] = useState<InsaatfirmalarimCatalogCategory[]>([]);
  const [cityDistricts, setCityDistricts] = useState<string[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mapStats, setMapStats] = useState<MapStats | null>(null);
  const fetchSeqRef = useRef(0);

  const categoryOptions = useMemo(
    () => categories.slice().sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [categories],
  );

  const sidebarTops = useMemo(
    () => buildSariSayfalarSidebarTops({ mapCategories: categoryOptions, insaatCatalog }),
    [categoryOptions, insaatCatalog],
  );

  const landingCategoryTiles = useMemo(() => {
    const tiles = sidebarTops.map((top) => ({
      id: top.id,
      slug: top.slug,
      name: top.name,
      icon: top.icon,
    }));
    if (!tiles.some((t) => t.slug === SARI_SAYFALAR_INSAAT_TOP.slug)) {
      tiles.push({
        id: SARI_SAYFALAR_INSAAT_TOP.id,
        slug: SARI_SAYFALAR_INSAAT_TOP.slug,
        name: SARI_SAYFALAR_INSAAT_TOP.name,
        icon: SARI_SAYFALAR_INSAAT_TOP.icon,
      });
    }
    return tiles.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [sidebarTops]);

  const activeTopCategory = useMemo(
    () => resolveSariSayfalarActiveTop(appliedCategory, appliedQ, sidebarTops),
    [appliedCategory, appliedQ, sidebarTops],
  );

  const activeSubSlug = useMemo(
    () => resolveSariSayfalarActiveSubSlug(appliedCategory, appliedQ, activeTopCategory),
    [appliedCategory, appliedQ, activeTopCategory],
  );

  const sidebarSubcategories = activeTopCategory?.subcategories ?? [];

  const directoryEntries = useMemo(
    () => listKesfetDirectoryEntries(KESFET_DISCOVER_GROUPS).sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [],
  );

  const keywordSuggestionPool = useMemo(() => {
    const seen = new Set<string>();
    const rows: KesfetSearchSuggestRow[] = [];
    for (const cat of categoryOptions) {
      const key = cat.name.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        id: `map:${cat.id}`,
        label: cat.name,
        categoryId: cat.slug || cat.id,
        group: "Harita kategorisi",
      });
    }
    for (const entry of directoryEntries) {
      const key = entry.name.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        id: `discover:${entry.slug}`,
        label: entry.name,
        keyword: entry.keyword,
        group: entry.group,
      });
    }
    rows.push({
      id: `map:${SARI_SAYFALAR_INSAAT_TOP.id}`,
      label: SARI_SAYFALAR_INSAAT_TOP.name,
      categoryId: SARI_SAYFALAR_INSAAT_TOP.slug,
      group: "İnşaat rehberi",
    });
    return rows.sort((a, b) => a.label.localeCompare(b.label, "tr"));
  }, [categoryOptions, directoryEntries]);

  const resolvedKeywords = useMemo(() => {
    const kw = resolveKesfetKeywordsParam(appliedQ, "", KESFET_DISCOVER_GROUPS);
    return kw || appliedQ.trim();
  }, [appliedQ]);

  const activeCategoryLabel = useMemo(() => {
    if (activeSubSlug && activeTopCategory) {
      const sub = activeTopCategory.subcategories.find((s) => s.slug === activeSubSlug);
      if (sub) return sub.name;
    }
    if (appliedCategory === SARI_SAYFALAR_INSAAT_TOP.slug) return SARI_SAYFALAR_INSAAT_TOP.name;
    if (!appliedCategory) {
      const entry = findKesfetDirectoryKeywordEntry(appliedQ, KESFET_DISCOVER_GROUPS);
      return entry?.name ?? "";
    }
    const hit = sidebarTops.find((c) => c.id === appliedCategory || c.slug === appliedCategory);
    return hit?.name ?? appliedCategory;
  }, [activeSubSlug, activeTopCategory, appliedCategory, appliedQ, sidebarTops]);

  const hasSearchFilters = Boolean(resolvedKeywords || appliedCategory.trim() || appliedQ.trim());

  const showResults = Boolean(appliedCity.trim() || hasSearchFilters);

  const showDistrictChips = Boolean(appliedCity.trim() && !appliedDistrict.trim());

  const showDirectoryLanding = !appliedCity.trim() && !hasSearchFilters;

  const cityBrowseList = useMemo(
    () => TURKEY_CITIES.map((city) => ({ name: city.name, emoji: city.emoji })),
    [],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const syncUrl = useCallback(
    (q: string, city: string, district: string, category: string, nextPage: number) => {
      const next = buildSariSayfalarListPath({ q, city, district, category, page: nextPage });
      if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` !== next) {
        navigate(next, { replace: true });
      }
    },
    [navigate],
  );

  const fetchBusinesses = useCallback(
    async (
      nextPage: number,
      q: string,
      city: string,
      district: string,
      category: string,
    ) => {
      const kw = resolveKesfetKeywordsParam(q, "", KESFET_DISCOVER_GROUPS) || q.trim();
      const hasCity = Boolean(city.trim());
      const hasFilters = Boolean(kw || category.trim());

      if (!hasCity && !hasFilters) {
        setBusinesses([]);
        setTotal(0);
        return;
      }

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((nextPage - 1) * PAGE_SIZE),
      });
      if (hasCity) {
        const cityTrim = city.trim();
        const cityDef = findTurkeyCityByNameOrSlug(cityTrim);
        const canonicalCity = cityDef?.name ?? cityTrim;
        params.set("city", canonicalCity);
        params.set("citySlug", turkeyCitySlugFromName(canonicalCity));
        params.set("requireCityScope", "1");
      }
      if (kw) params.set("keywords", kw);
      if (district.trim()) params.set("district", district.trim());
      if (category.trim()) params.set("category", category.trim());

      setLoading(true);
      const myId = ++fetchSeqRef.current;
      try {
        const { ok, data: d } = await fetchPublicJson<{
          success?: boolean;
          data?: SariSayfalarBusiness[];
          total?: number;
        }>(`${API}/map/businesses?${params}`);
        if (myId !== fetchSeqRef.current) return;
        const items: SariSayfalarBusiness[] = ok && d?.success && Array.isArray(d.data) ? d.data : [];
        const nextTotal = typeof d?.total === "number" ? d.total : items.length;
        setTotal(nextTotal);
        setBusinesses(items);
      } catch {
        if (myId !== fetchSeqRef.current) return;
        setBusinesses([]);
        setTotal(0);
      } finally {
        if (myId === fetchSeqRef.current) setLoading(false);
      }
    },
    [],
  );

  const runFilteredSearch = useCallback(
    (_q: string, _city: string, _district: string, _category: string, _nextPage: number) => {
      /* fetch, applied* state değişince aşağıdaki useEffect ile tetiklenir */
    },
    [],
  );

  const applyFilters = useCallback(
    (q: string, city: string, district: string, category: string, nextPage = 1) => {
      setKeywordsInput(q);
      setLoc({ city, district });
      setLocDisplay([district, city].filter(Boolean).join(", ") || city);
      setAppliedQ(q);
      setAppliedCity(city);
      setAppliedDistrict(district);
      setAppliedCategory(category);
      setCategoryInput(category);
      setPage(nextPage);
      urlFingerprintRef.current = sariSayfalarFiltersFingerprint(q, city, district, category, nextPage);
      syncUrl(q, city, district, category, nextPage);
      runFilteredSearch(q, city, district, category, nextPage);
    },
    [runFilteredSearch, syncUrl],
  );

  const applySidebarSubcategory = useCallback(
    (sub: SariSayfalarSidebarSub) => {
      if (sub.filterCategory) {
        applyFilters("", loc.city, loc.district, sub.filterCategory, 1);
        return;
      }
      applyFilters(sub.filterKeyword || sub.name, loc.city, loc.district, "", 1);
    },
    [applyFilters, loc.city, loc.district],
  );

  const selectTopCategory = useCallback(
    (top: SariSayfalarSidebarTop) => {
      applyFilters("", loc.city, loc.district, top.slug, 1);
    },
    [applyFilters, loc.city, loc.district],
  );

  const applyParamsFromUrl = useCallback(
    (params: URLSearchParams) => {
      const fp = sariSayfalarUrlFingerprint(params);
      if (fp === urlFingerprintRef.current) return;
      urlFingerprintRef.current = fp;

      const q = params.get("q") ?? params.get("keywords") ?? "";
      const city = params.get("city") ?? "";
      const district = params.get("district") ?? "";
      const category = params.get("category") ?? "";
      const nextPage = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

      setKeywordsInput(q);
      setLoc({ city, district });
      setLocDisplay([district, city].filter(Boolean).join(", ") || city);
      setAppliedQ(q);
      setAppliedCity(city);
      setAppliedDistrict(district);
      setAppliedCategory(category);
      setCategoryInput(category);
      setPage(nextPage);
      runFilteredSearch(q, city, district, category, nextPage);
    },
    [runFilteredSearch],
  );

  const selectCity = useCallback(
    (cityName: string) => {
      setLoc({ city: cityName, district: "" });
      setLocDisplay(cityName);
      applyFilters(keywordsInput, cityName, "", categoryInput, 1);
    },
    [applyFilters, categoryInput, keywordsInput],
  );

  const setCategoryAndSearch = (category: string, nextPage = 1) => {
    setCategoryInput(category);
    applyFilters(keywordsInput, loc.city, loc.district, category, nextPage);
  };

  useEffect(() => {
    const params = readSariSayfalarSearchParams();
    if (!["1", "true", "yes"].includes((params.get("featured") ?? "").toLowerCase())) return;
    navigate(`${KESFET_LISTING_PATH}#ss-featured-grid`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [categoriesRes, statsRes, insaatRes] = await Promise.all([
        fetchPublicJson<{ success?: boolean; data?: MapCategory[] }>(`${API}/map/categories`),
        fetchPublicJson<{ success?: boolean; data?: Record<string, unknown> }>(`${API}/map/stats`),
        fetchPublicJson<{ success?: boolean; data?: { categories?: InsaatfirmalarimCatalogCategory[] } }>(
          `${API}/map/insaatfirmalarim/catalog`,
        ),
      ]);
      if (cancelled) return;
      if (categoriesRes.ok && categoriesRes.data?.success && Array.isArray(categoriesRes.data.data)) {
        setCategories(categoriesRes.data.data);
      }
      if (statsRes.ok && statsRes.data?.success && statsRes.data.data) {
        const d = statsRes.data.data;
        setMapStats({
          businesses: Number(d.businesses ?? d.activeBusinesses ?? 0),
          categories: Number(d.categories ?? 0),
          activeBusinesses: Number(d.activeBusinesses ?? d.businesses ?? 0),
          insaatfirmalarim: Number(d.insaatfirmalarim ?? 0),
        });
      }
      if (
        insaatRes.ok &&
        insaatRes.data?.success &&
        Array.isArray(insaatRes.data.data?.categories)
      ) {
        setInsaatCatalog(insaatRes.data.data.categories as InsaatfirmalarimCatalogCategory[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onPopState = () => applyParamsFromUrl(readSariSayfalarSearchParams());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyParamsFromUrl]);

  useEffect(() => {
    applyParamsFromUrl(resolveSariSayfalarSearchParams(routeSearch, browserSearch));
  }, [routeSearch, browserSearch, applyParamsFromUrl]);

  useEffect(() => {
    if (!showResults) {
      setBusinesses([]);
      setTotal(0);
      return;
    }
    void fetchBusinesses(page, appliedQ, appliedCity, appliedDistrict, appliedCategory);
  }, [
    showResults,
    page,
    appliedQ,
    appliedCity,
    appliedDistrict,
    appliedCategory,
    fetchBusinesses,
  ]);

  useEffect(() => {
    if (!appliedCity.trim()) {
      setCityDistricts([]);
      return;
    }
    let cancelled = false;
    setDistrictsLoading(true);
    void (async () => {
      try {
        const names = await fetchTurkeyCityDistrictNames(API, appliedCity);
        if (!cancelled && names.length) {
          setCityDistricts(names);
          return;
        }
      } catch {
        /* fallback below */
      }
      if (!cancelled) {
        setCityDistricts([]);
      }
    })().finally(() => {
      if (!cancelled) setDistrictsLoading(false);
    });
    return () => { cancelled = true; };
  }, [appliedCity]);

  useEffect(() => {
    const seoTitle = buildSariSayfalarSeoTitle(
      appliedCity,
      appliedDistrict,
      resolvedKeywords || appliedQ,
      activeCategoryLabel,
    );
    const geoText = buildSariSayfalarGeoSeoText(
      appliedCity,
      appliedDistrict,
      activeCategoryLabel || resolvedKeywords || appliedQ,
      total,
    );
    applySocialShareMeta({
      title: seoTitle,
      descriptionPrimary: seoPlainSnippet(geoText, 160),
      canonicalPath: buildSariSayfalarListPath({
        q: appliedQ,
        city: appliedCity,
        district: appliedDistrict,
        category: appliedCategory,
        page,
      }),
    });
    return () => resetSeoToSiteDefaults();
  }, [
    appliedCity,
    appliedDistrict,
    appliedQ,
    appliedCategory,
    activeCategoryLabel,
    page,
    resolvedKeywords,
    total,
  ]);

  const premiumFirst = useMemo(() => {
    const premium = businesses.filter((b) => b.isPremium);
    const regular = businesses.filter((b) => !b.isPremium);
    return [...premium, ...regular];
  }, [businesses]);

  const runPopularSearch = useCallback(
    (entry: (typeof directoryEntries)[number]) => {
      applyFilters(entry.keyword || entry.name, appliedCity, appliedDistrict, "", 1);
    },
    [applyFilters, appliedCity, appliedDistrict],
  );

  const handlePopularSearchSelect = useCallback(
    (selection: { label: string; category?: string; keyword?: string }) => {
      if (selection.category) {
        applyFilters(selection.keyword || "", appliedCity, appliedDistrict, selection.category, 1);
        return;
      }
      applyFilters(selection.keyword || selection.label, appliedCity, appliedDistrict, "", 1);
    },
    [applyFilters, appliedCity, appliedDistrict],
  );

  return (
    <div className="ss-hub min-h-screen bg-white" data-page="sari-sayfalar-hub">
      <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
        <section
          className={`lh-hero-full ${SADE_PUBLIC_HERO_SURFACE_CLASS}`}
          style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG_WHITE)}
        >
          <div className={`${SADE_PUBLIC_HERO_CONTENT_CLASS} text-center`}>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0f766e] ring-1 ring-emerald-100">
              <BookOpen className="h-3.5 w-3.5" />
              Yekpare Sarı Sayfalar
            </span>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Firma rehberi ve işletme dizini
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Ne arıyorsunuz, nerede arıyorsunuz — şehir ve sektöre göre firmaları bulun; telefon, adres ve harita bağlantılarına tek ekrandan ulaşın.
            </p>

            <form
              className="ss-search-bar"
              onSubmit={(e) => {
                e.preventDefault();
                void locRef.current?.commit().then(() => {
                  applyFilters(keywordsInput, loc.city, loc.district, categoryInput, 1);
                });
              }}
            >
              <label className="ss-search-field">
                <span className="ss-search-label">Ne?</span>
                <KesfetHeroKeywordField
                  value={keywordsInput}
                  onChange={setKeywordsInput}
                  suggestions={keywordSuggestionPool}
                  onSelect={(row) => {
                    if (row.categoryId) {
                      setKeywordsInput(row.label);
                      applyFilters(row.label, loc.city, loc.district, row.categoryId, 1);
                      return;
                    }
                    const nextQ = row.keyword || row.label;
                    setKeywordsInput(nextQ);
                    applyFilters(nextQ, loc.city, loc.district, categoryInput, 1);
                  }}
                />
              </label>
              <label className="ss-search-field ss-search-field-location">
                <span className="ss-search-label">Nerede?</span>
                <KesfetHeroLocationField
                  ref={locRef}
                  mapsSettings={mapsSettings}
                  displayValue={locDisplay}
                  onDisplayChange={setLocDisplay}
                  onLocationResolved={(v) => {
                    setLoc({ city: v.city, district: v.district });
                    if (v.city && !v.district) setLocDisplay(v.city);
                    else if (v.district || v.city) setLocDisplay([v.district, v.city].filter(Boolean).join(", "));
                  }}
                  onSuggestionSelect={(v) => {
                    applyFilters(keywordsInput, v.city, v.district, categoryInput, 1);
                  }}
                />
              </label>
              <button type="submit" className="ss-search-submit">
                <Search className="h-4 w-4" />
                Bul
              </button>
            </form>

            {mapStats ? (
              <div className="ss-hero-stats" aria-label="Rehber istatistikleri">
                <div className="ss-hero-stat">
                  <strong>{mapStats.businesses.toLocaleString("tr-TR")}</strong>
                  <span>Kayıtlı firma</span>
                </div>
                <div className="ss-hero-stat">
                  <strong>{(categoryOptions.length || mapStats.categories).toLocaleString("tr-TR")}</strong>
                  <span>Sektör / kategori</span>
                </div>
                <div className="ss-hero-stat">
                  <strong>{TURKEY_CITIES.length.toLocaleString("tr-TR")}</strong>
                  <span>İl</span>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-500">
              <SariSayfalarNavLink href="/konumagore" className="inline-flex items-center gap-1 text-[#0f766e] hover:underline">
                <ShoppingBag className="h-3.5 w-3.5" />
                Konuma göre sipariş
              </SariSayfalarNavLink>
              <span aria-hidden>·</span>
              <SariSayfalarNavLink href={KESFET_LISTING_PATH} className="inline-flex items-center gap-1 text-[#0f766e] hover:underline">
                <Compass className="h-3.5 w-3.5" />
                Keşfet listesi
              </SariSayfalarNavLink>
              <span aria-hidden>·</span>
              <SariSayfalarNavLink href="/haritalar" className="inline-flex items-center gap-1 text-[#0f766e] hover:underline">
                <MapPin className="h-3.5 w-3.5" />
                Harita görünümü
              </SariSayfalarNavLink>
              <span aria-hidden>·</span>
              <SariSayfalarNavLink href="/isletme-basvuru" className="text-[#0f766e] hover:underline">
                İşletmeni ekle
              </SariSayfalarNavLink>
            </div>
          </div>
        </section>
      </div>

      <main className={`mx-auto max-w-7xl px-4 pb-12 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <SariSayfalarBreadcrumb
          city={appliedCity}
          district={appliedDistrict}
          categoryLabel={activeCategoryLabel}
          onCityClick={() => applyFilters("", appliedCity, "", "", 1)}
          onDistrictClick={() => applyFilters(appliedQ, appliedCity, appliedDistrict, "", 1)}
          onCategoryClick={() => setCategoryAndSearch("")}
        />

        {showDirectoryLanding ? (
          <div className="ss-directory-landing">
            <section
              id="ss-popular-searches"
              className="ss-panel-card ss-landing-panel ss-directory-section"
              aria-label="Popüler Aramalar"
            >
              <div className="ss-panel-card-head">
                <div className="ss-panel-card-head-icon" aria-hidden>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="ss-panel-card-title">Popüler Aramalar</h2>
                  <p className="ss-panel-card-sub">Kategori seçin, alt aramalardan birini tıklayın</p>
                </div>
              </div>
              <div className="ss-panel-card-body ss-landing-panel-body">
                <PopularSearchesPanel
                  variant="ss"
                  embedded
                  insaatCatalog={insaatCatalog}
                  onSelect={handlePopularSearchSelect}
                />
              </div>
            </section>

            <FeaturedBusinessesPanel title="Popüler işletmeler" className="ss-directory-section" />

            <section className="ss-directory-section ss-directory-section-cities" aria-label="Şehirler">
              <div className="ss-directory-section-head">
                <h2>
                  <MapPin className="inline h-4 w-4 text-[#0f766e]" aria-hidden />
                  Şehirler
                </h2>
                <p>
                  {TURKEY_CITIES.length} il — tıklayarak ilçe ve firmalara gidin
                  {" · "}
                  <SariSayfalarNavLink href={haritalarNavHref({})} className="text-[#0f766e] hover:underline">
                    Haritada görüntüle
                  </SariSayfalarNavLink>
                </p>
              </div>
              <div className="ss-hscroll-row ss-city-grid">
                {cityBrowseList.map((city) => (
                  <div key={city.name} className="ss-city-chip-wrap">
                    <button
                      type="button"
                      className="ss-city-chip"
                      onClick={() => selectCity(city.name)}
                    >
                      <span className="ss-city-chip-emoji" aria-hidden>{city.emoji}</span>
                      {city.name}
                    </button>
                    <SariSayfalarNavLink
                      href={haritalarNavHref({ city: city.name })}
                      className="ss-city-map-link"
                      title={`${city.name} — haritada görüntüle`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Haritada görüntüle
                    </SariSayfalarNavLink>
                  </div>
                ))}
              </div>
            </section>

            <section className="ss-panel-card ss-directory-section ss-directory-section-categories" aria-label="Kategoriler">
              <div className="ss-panel-card-head">
                <div className="ss-panel-card-head-icon" aria-hidden>
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="ss-panel-card-title">Kategoriler</h2>
                  <p className="ss-panel-card-sub">Sektöre göre firma arayın — tıklayarak sonuçlara gidin</p>
                </div>
              </div>
              <div className="ss-panel-card-body">
              {landingCategoryTiles.length ? (
                <div className="ss-category-grid grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
                  {landingCategoryTiles.map((cat, idx) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`ss-category-tile ${CATEGORY_TILE_ACCENTS[idx % CATEGORY_TILE_ACCENTS.length]}`}
                      onClick={() => {
                        const top = sidebarTops.find((t) => t.id === cat.id || t.slug === cat.slug);
                        if (top) selectTopCategory(top);
                      }}
                    >
                      {cat.icon ? (
                        <span className="ss-category-tile-icon" aria-hidden>{cat.icon}</span>
                      ) : (
                        <Building2 className="h-5 w-5 text-[#0f766e]" aria-hidden />
                      )}
                      {cat.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="ss-category-groups">
                  {KESFET_DISCOVER_GROUPS.map((group) => (
                    <div key={group.id} className="ss-category-group">
                      <div className="ss-category-group-title">
                        <span aria-hidden>{group.icon}</span>
                        {group.label}
                      </div>
                      <div className="ss-category-group-links">
                        {group.subcategories.slice(0, 8).map((sub) => (
                          <button
                            key={sub.slug}
                            type="button"
                            className="ss-category-link"
                            onClick={() => applyFilters(sub.googleKeyword || sub.name, "", "", "", 1)}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </section>

            <section className="ss-popular-searches ss-directory-section" aria-label="Popüler aramalar A–Z">
              <h2 className="ss-popular-searches-title">Popüler aramalar — A–Z</h2>
              <p className="ss-popular-searches-sub">
                Kategori listesi; tıklayarak firmalara gidin.
              </p>
              <div className="ss-popular-searches-list">
                {directoryEntries.map((entry) => (
                  <button
                    key={entry.slug}
                    type="button"
                    className="ss-popular-searches-link"
                    onClick={() => runPopularSearch(entry)}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : showResults ? (
          <>
            {appliedCity.trim() ? (
              <section
                className="ss-panel-card ss-city-popular-panel ss-directory-section"
                aria-label="Popüler Aramalar"
              >
                <div className="ss-panel-card-head">
                  <div className="ss-panel-card-head-icon" aria-hidden>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="ss-panel-card-title">Popüler Aramalar</h2>
                    <p className="ss-panel-card-sub">
                      {appliedCity} için kategori seçin, alt aramalardan birini tıklayın
                    </p>
                  </div>
                </div>
                <div className="ss-panel-card-body ss-landing-panel-body">
                  <PopularSearchesPanel
                    variant="ss"
                    embedded
                    insaatCatalog={insaatCatalog}
                    onSelect={handlePopularSearchSelect}
                  />
                </div>
              </section>
            ) : null}

            {showDistrictChips ? (
              <section className="ss-district-panel ss-district-panel-compact ss-directory-section" aria-label="İlçe filtresi">
                <h2 className="ss-district-title">{appliedCity} — ilçe filtresi</h2>
                <p className="ss-district-sub">
                  Tüm {appliedCity} firmaları listeleniyor. İlçe seçerek daraltın veya yukarıdan kategori arayın.
                  {" "}
                  <SariSayfalarNavLink
                    href={haritalarNavHref({ city: appliedCity })}
                    className="text-[#0f766e] hover:underline"
                  >
                    {appliedCity} — Haritada görüntüle
                  </SariSayfalarNavLink>
                </p>
                {districtsLoading ? (
                  <div className="ss-hscroll-row ss-district-grid">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="h-10 w-28 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                ) : (
                  <div className="ss-hscroll-row ss-district-grid">
                    {cityDistricts.map((name) => (
                      <div key={name} className="ss-district-chip-wrap shrink-0">
                        <button
                          type="button"
                          className="ss-district-chip"
                          onClick={() => {
                            setLoc((prev) => ({ ...prev, district: name }));
                            setLocDisplay([name, appliedCity].filter(Boolean).join(", "));
                            applyFilters(keywordsInput, appliedCity, name, categoryInput, 1);
                          }}
                        >
                          {name}
                        </button>
                        <SariSayfalarNavLink
                          href={haritalarNavHref({ city: appliedCity, district: name })}
                          className="ss-district-map-link"
                          title={`${name}, ${appliedCity} — haritada görüntüle`}
                        >
                          Haritada görüntüle
                        </SariSayfalarNavLink>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

          <div className={`ss-layout${appliedCity.trim() ? " ss-layout-with-map" : ""}`}>
            <aside className="ss-sidebar" aria-label="Kategoriler">
              <div className="ss-sidebar-title">Kategoriler</div>
              {activeTopCategory ? (
                <>
                  <button
                    type="button"
                    className="ss-sidebar-back"
                    onClick={() => setCategoryAndSearch("")}
                  >
                    ← Tüm kategoriler
                  </button>
                  <div className="ss-sidebar-parent">
                    {activeTopCategory.icon ? `${activeTopCategory.icon} ` : ""}
                    {activeTopCategory.name}
                  </div>
                  <div className="ss-sidebar-list">
                    <button
                      type="button"
                      className={`ss-sidebar-item${!activeSubSlug ? " active" : ""}`}
                      onClick={() => selectTopCategory(activeTopCategory)}
                    >
                      Tümü
                    </button>
                    {sidebarSubcategories.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        className={`ss-sidebar-item${activeSubSlug === sub.slug ? " active" : ""}`}
                        onClick={() => applySidebarSubcategory(sub)}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="ss-sidebar-list">
                  <button
                    type="button"
                    className={`ss-sidebar-item${!appliedCategory ? " active" : ""}`}
                    onClick={() => setCategoryAndSearch("")}
                  >
                    Tümü
                  </button>
                  {sidebarTops.map((top) => (
                    <button
                      key={top.id}
                      type="button"
                      className={`ss-sidebar-item${appliedCategory === top.id || appliedCategory === top.slug ? " active" : ""}`}
                      onClick={() => selectTopCategory(top)}
                    >
                      {top.icon ? `${top.icon} ` : ""}
                      {top.name}
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className="ss-main min-w-0">
              {activeTopCategory && sidebarSubcategories.length ? (
                <div className="ss-chips mb-3" aria-label="Alt kategori filtreleri">
                  <button
                    type="button"
                    className={`ss-chip${!activeSubSlug ? " active" : ""}`}
                    onClick={() => selectTopCategory(activeTopCategory)}
                  >
                    Tümü
                  </button>
                  {sidebarSubcategories.slice(0, 16).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`ss-chip${activeSubSlug === sub.slug ? " active" : ""}`}
                      onClick={() => applySidebarSubcategory(sub)}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              ) : sidebarTops.length ? (
                <div className="ss-chips mb-3" aria-label="Kategori filtreleri">
                  <button
                    type="button"
                    className={`ss-chip${!appliedCategory ? " active" : ""}`}
                    onClick={() => setCategoryAndSearch("")}
                  >
                    Tümü
                  </button>
                  {sidebarTops.slice(0, 16).map((top) => (
                    <button
                      key={top.id}
                      type="button"
                      className={`ss-chip${appliedCategory === top.id || appliedCategory === top.slug ? " active" : ""}`}
                      onClick={() => selectTopCategory(top)}
                    >
                      {top.name}
                    </button>
                  ))}
                </div>
              ) : null}

              {loading ? (
                <div className="ss-cards">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : premiumFirst.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
                  <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-lg font-black text-slate-800">0 sonuç</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {resolvedKeywords || activeCategoryLabel
                      ? `"${resolvedKeywords || activeCategoryLabel}" için ${appliedCity.trim() ? [appliedDistrict, appliedCity].filter(Boolean).join(", ") : "Türkiye geneli"} sonucu yok.`
                      : `${appliedCity || "Seçilen bölge"} için henüz kayıt yok.`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="ss-result-head">
                    <h2>
                      {appliedCity.trim()
                        ? buildSariSayfalarResultTitle(
                            appliedCity,
                            appliedDistrict,
                            resolvedKeywords || appliedQ,
                            activeCategoryLabel,
                            total,
                          )
                        : `${activeCategoryLabel || resolvedKeywords || appliedQ || "Firmalar"} — Türkiye geneli — ${total.toLocaleString("tr-TR")} sonuç`}
                    </h2>
                    {appliedCity.trim() ? (
                      <SariSayfalarNavLink
                        href={haritalarNavHref({
                          city: appliedCity,
                          district: appliedDistrict || undefined,
                        })}
                        className="ss-result-map-link"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Haritada görüntüle
                      </SariSayfalarNavLink>
                    ) : null}
                  </div>

                  <div className="ss-cards">
                    {premiumFirst.map((biz) => (
                      <SariSayfalarCard
                        key={biz.id}
                        biz={biz}
                        onCityFilter={selectCity}
                        onDistrictFilter={(d) => {
                          setLoc((prev) => ({ ...prev, district: d }));
                          setLocDisplay([d, loc.city].filter(Boolean).join(", "));
                          applyFilters(keywordsInput, loc.city, d, categoryInput, 1);
                        }}
                        onCategoryFilter={(catId) => setCategoryAndSearch(catId)}
                      />
                    ))}
                  </div>

                  <SariSayfalarPagination
                    page={page}
                    totalPages={totalPages}
                    onPage={(p) => {
                      applyFilters(appliedQ, appliedCity, appliedDistrict, appliedCategory, p);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </>
              )}

              <section className="ss-geo-text" aria-label="Bölge bilgisi">
                <p>
                  {buildSariSayfalarGeoSeoText(
                    appliedCity,
                    appliedDistrict,
                    activeCategoryLabel || resolvedKeywords || appliedQ,
                    total,
                  )}
                </p>
              </section>
            </div>

            {appliedCity.trim() ? (
              <SariSayfalarMapSidebar businesses={premiumFirst} city={appliedCity} />
            ) : null}
          </div>
          </>
        ) : null}

      </main>
    </div>
  );
}
