import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { SlidersHorizontal } from "lucide-react";
import { BookingCoreShell } from "../BookingCoreShell";
import { BookingCoreLocationInput } from "../components/BookingCoreLocationInput";
import { TurizmEventResultCards } from "../components/TurizmTravelResultCards";
import { TurizmTravelPageLayout } from "@/themes/turizm/TurizmTravelPageLayout";
import { TURIZM_CATEGORY_INTRO } from "@/themes/turizm/turizmCategoryIntroConfig";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { fetchAffiliateLink } from "../lib/travelpayouts";
import {
  fetchEtkinlikEvents,
  fetchEtkinlikStatus,
  fetchEtkinlikTaxonomy,
  isEtkinlikIntegrationConfigured,
  type EtkinlikEventResult,
  type EtkinlikTaxonomyItem,
} from "../lib/etkinlikEvents";
import "@/styles/bookingCoreTurizm.css";

type PriceFilter = "all" | "free" | "paid";

type SearchFilters = {
  category: string;
  format: string;
  startDate: string;
  endDate: string;
  priceFilter: PriceFilter;
};

const ETKINLIK_PROMO_CARDS = TURIZM_CATEGORY_INTRO.etkinlik.sections[0]?.cards.slice(0, 4) ?? [];

function shouldFetchAll(filters: SearchFilters): boolean {
  return (
    filters.category === "all" &&
    filters.format === "all" &&
    !filters.startDate &&
    !filters.endDate &&
    filters.priceFilter === "all"
  );
}

function etkinlikCategoryHref(categorySlug: string, cityName: string): string {
  const q = new URLSearchParams();
  if (cityName.trim()) q.set("city", cityName.trim());
  q.set("category", categorySlug);
  return `${TURIZM.stubs.etkinlik}?${q.toString()}`;
}

function categorySlugFromHref(href?: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, "https://local");
    return url.searchParams.get("category");
  } catch {
    return null;
  }
}

export function EtkinlikHome() {
  const [, navigate] = useLocation();
  const [city, setCity] = useState("İstanbul");
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [results, setResults] = useState<EtkinlikEventResult[]>([]);
  const [total, setTotal] = useState(0);
  const [integrationConfigured, setIntegrationConfigured] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(false);
  const [configHint, setConfigHint] = useState<string | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [affiliateUrl, setAffiliateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [categories, setCategories] = useState<EtkinlikTaxonomyItem[]>([]);
  const [formats, setFormats] = useState<EtkinlikTaxonomyItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [taxonomySource, setTaxonomySource] = useState<"live" | "fallback" | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    void Promise.all([fetchEtkinlikStatus(), fetchEtkinlikTaxonomy()]).then(([status, tax]) => {
      const fromStatus = isEtkinlikIntegrationConfigured(status);
      const fromTax = isEtkinlikIntegrationConfigured(tax);
      setIntegrationConfigured(fromStatus || fromTax);
      if (tax) {
        setCategories(tax.categories);
        setFormats(tax.formats);
        setTaxonomySource(tax.source);
        if (fromTax && tax.source === "fallback" && tax.categories.length > 0) {
          setTaxonomySource("live");
        }
      }
    });
  }, []);

  const syncUrl = useCallback(
    (nextCity: string, overrides?: Partial<SearchFilters>) => {
      const cat = overrides?.category ?? category;
      const fmt = overrides?.format ?? format;
      const start = overrides?.startDate ?? startDate;
      const end = overrides?.endDate ?? endDate;
      const price = overrides?.priceFilter ?? priceFilter;

      const q = new URLSearchParams();
      if (nextCity.trim()) q.set("city", nextCity.trim());
      if (cat !== "all") q.set("category", cat);
      if (fmt !== "all") q.set("format", fmt);
      if (start) q.set("startDate", start);
      if (end) q.set("endDate", end);
      if (price !== "all") q.set("priceFilter", price);
      const qs = q.toString();
      navigate(qs ? `${TURIZM.stubs.etkinlik}?${qs}` : TURIZM.stubs.etkinlik, { replace: true });
    },
    [category, format, startDate, endDate, priceFilter, navigate],
  );

  const runSearch = useCallback(
    async (cityRaw: string, overrides?: Partial<SearchFilters>) => {
      const c = cityRaw.trim();
      if (c.length < 2) {
        setSearched(true);
        return;
      }

      const filters: SearchFilters = {
        category: overrides?.category ?? category,
        format: overrides?.format ?? format,
        startDate: overrides?.startDate ?? startDate,
        endDate: overrides?.endDate ?? endDate,
        priceFilter: overrides?.priceFilter ?? priceFilter,
      };

      setLoading(true);
      setSearched(true);
      setSearchFailed(false);

      const fetchAll = shouldFetchAll(filters);

      const [res, aff] = await Promise.all([
        fetchEtkinlikEvents({
          city: c,
          category: filters.category !== "all" ? filters.category : undefined,
          format: filters.format !== "all" ? filters.format : undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          priceFilter: filters.priceFilter,
          fetchAll,
          take: fetchAll ? undefined : 50,
        }),
        fetchAffiliateLink("activity", { location: c, query: c }),
      ]);

      if (res) {
        const apiConfigured = isEtkinlikIntegrationConfigured(res);
        setIntegrationConfigured((prev) => prev === true || apiConfigured);
        setConfigured(apiConfigured);
        const events = res.events ?? [];
        setResults(events);
        setTotal(res.total ?? events.length ?? 0);
        setConfigHint(res.configHint ?? null);
        setAffiliateUrl(aff?.affiliateUrl ?? res.affiliateUrl ?? null);
        if (fetchAll && events.length > 0) {
          const counts: Record<string, number> = {};
          for (const event of events) {
            const slug = event.category?.slug || (event.category?.id != null ? String(event.category.id) : null);
            if (!slug) continue;
            counts[slug] = (counts[slug] ?? 0) + 1;
          }
          setCategoryCounts(counts);
        }
      } else {
        setSearchFailed(true);
        setResults([]);
        setTotal(0);
        setConfigHint(null);
        setAffiliateUrl(aff?.affiliateUrl ?? null);
      }
      setLoading(false);
    },
    [category, format, startDate, endDate, priceFilter],
  );

  useEffect(() => {
    const qs = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const c = qs.get("city")?.trim();
    const cat = qs.get("category")?.trim();
    const fmt = qs.get("format")?.trim();
    const start = qs.get("startDate")?.trim();
    const end = qs.get("endDate")?.trim();
    const price = qs.get("priceFilter")?.trim();

    if (c) setCity(c);
    if (cat) setCategory(cat);
    if (fmt) setFormat(fmt);
    if (start) setStartDate(start);
    if (end) setEndDate(end);
    if (price === "free" || price === "paid") setPriceFilter(price);

    void runSearch(c || city, {
      category: cat || "all",
      format: fmt || "all",
      startDate: start || "",
      endDate: end || "",
      priceFilter: price === "free" || price === "paid" ? price : "all",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial URL hydration once
  }, []);

  function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    void runSearch(city);
    syncUrl(city);
  }

  function handleCategoryChip(slug: string) {
    setCategory(slug);
    void runSearch(city, { category: slug });
    syncUrl(city, { category: slug });
    setMobileFiltersOpen(false);
  }

  function handleFormatToggle(slug: string) {
    const next = slug === "all" ? "all" : format === slug ? "all" : slug;
    setFormat(next);
    void runSearch(city, { format: next });
    syncUrl(city, { format: next });
    setMobileFiltersOpen(false);
  }

  function handlePriceFilterChange(value: string) {
    if (value === "all" || value === "free" || value === "paid") {
      setPriceFilter(value);
      void runSearch(city, { priceFilter: value });
      syncUrl(city, { priceFilter: value });
    }
  }

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const slugA = a.slug || String(a.id);
      const slugB = b.slug || String(b.id);
      return (categoryCounts[slugB] ?? 0) - (categoryCounts[slugA] ?? 0);
    });
  }, [categories, categoryCounts]);

  const topCategorySlug = useMemo(() => {
    if (sortedCategories.length === 0) return null;
    const slug = sortedCategories[0].slug || String(sortedCategories[0].id);
    return (categoryCounts[slug] ?? 0) > 0 ? slug : null;
  }, [sortedCategories, categoryCounts]);

  const showGrouped = category === "all" && format === "all" && results.length > 0;

  const groupedResults = useMemo(() => {
    if (!showGrouped) return null;
    const map = new Map<string, EtkinlikEventResult[]>();
    for (const event of results) {
      const key = event.category?.name ?? "Diğer";
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [results, showGrouped]);

  const resultLabel = loading
    ? "Yükleniyor…"
    : searched
      ? total > results.length
        ? `${total.toLocaleString("tr-TR")} etkinlik · ${results.length.toLocaleString("tr-TR")} gösteriliyor`
        : `${results.length.toLocaleString("tr-TR")} etkinlik`
      : "Şehir seçip arayın";

  const taxonomyLive = integrationConfigured === true || taxonomySource === "live";

  function renderCategoryRail(): ReactNode {
    if (categories.length === 0) return null;

    return (
      <nav className="bc-etkinlik-category-rail-wrap" aria-label="Etkinlik kategorileri">
        <div className="bc-etkinlik-taxonomy">
          <p className="bc-etkinlik-taxonomy__label">Kategoriler</p>
          <div className="bc-filter-chips bc-etkinlik-chip-rail bc-etkinlik-category-rail">
            <button
              type="button"
              className={`bc-filter-chip bc-etkinlik-category-chip${category === "all" ? " is-active" : ""}`}
              onClick={() => handleCategoryChip("all")}
            >
              Tümü
            </button>
            {sortedCategories.map((c) => {
              const slug = c.slug || String(c.id);
              const count = categoryCounts[slug];
              const isPopular = slug === topCategorySlug;
              return (
                <button
                  key={slug}
                  type="button"
                  className={`bc-filter-chip bc-etkinlik-category-chip${category === slug ? " is-active" : ""}${isPopular ? " is-popular" : ""}`}
                  onClick={() => handleCategoryChip(slug)}
                >
                  <span className="bc-etkinlik-category-chip__name">{c.name}</span>
                  {isPopular ? <span className="bc-etkinlik-category-chip__popular">Popüler</span> : null}
                  {count != null && count > 0 ? (
                    <span className="bc-etkinlik-category-chip__count">{count.toLocaleString("tr-TR")}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  function renderFilterSidebar(onMobileClose?: () => void): ReactNode {
    if (formats.length === 0) return null;

    return (
      <aside className="bc-filter-sidebar bc-etkinlik-filter-sidebar" aria-label="Etkinlik tür filtreleri">
        <div className="bc-filter-sidebar__head">
          <h3>
            <SlidersHorizontal className="w-4 h-4" />
            Filtrele
          </h3>
          {onMobileClose ? (
            <button type="button" className="bc-filter-sidebar__close" onClick={onMobileClose}>
              Kapat
            </button>
          ) : null}
        </div>

        <div className="bc-filter-group bc-etkinlik-format-filter">
          <span className="bc-filter-group__label">Türler</span>
          <div className="bc-filter-checks">
            <label className="bc-filter-check">
              <input
                type="checkbox"
                checked={format === "all"}
                onChange={() => handleFormatToggle("all")}
              />
              <span>Tüm türler</span>
            </label>
            {formats.map((f) => {
              const slug = f.slug || String(f.id);
              return (
                <label key={slug} className="bc-filter-check">
                  <input
                    type="checkbox"
                    checked={format === slug}
                    onChange={() => handleFormatToggle(slug)}
                  />
                  <span>{f.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <p className="bc-etkinlik-filter-sidebar__meta">
          {taxonomyLive
            ? `${formats.length} tür (Etkinlik.io canlı)`
            : integrationConfigured === false
              ? `${formats.length} tür (önbellek — API anahtarı gerekli)`
              : `${formats.length} tür`}
        </p>

        {ETKINLIK_PROMO_CARDS.length > 0 ? (
          <div className="bc-etkinlik-sidebar-promos" aria-label="Popüler etkinlik kategorileri">
            {ETKINLIK_PROMO_CARDS.map((card) => {
              const slug = categorySlugFromHref(card.href);
              const href = slug ? etkinlikCategoryHref(slug, city) : card.href || TURIZM.stubs.etkinlik;
              return (
                <Link key={card.title} href={href} className="bc-etkinlik-sidebar-promo">
                  <div className="bc-etkinlik-sidebar-promo__media">
                    <img src={card.image} alt="" loading="lazy" />
                  </div>
                  <div className="bc-etkinlik-sidebar-promo__body">
                    <h4>{card.title}</h4>
                    <p>{card.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </aside>
    );
  }

  const searchWidget = (
    <form className="bc-hero-search bc-travel-search-widget" onSubmit={handleSearch}>
      <div className="bc-hero-search__form bc-travel-search-widget__form bc-travel-search-widget__form--etkinlik-row">
        <div className="bc-hero-search__field bc-hero-search__field--grow bc-location-input bc-location-input--inline">
          <BookingCoreLocationInput
            id="etkinlik-city"
            label="Şehir"
            value={city}
            onChange={setCity}
            type="activity"
            placeholder="Şehir veya konum (Google Maps)"
          />
        </div>
        <div className="bc-hero-search__field">
          <label htmlFor="etkinlik-start">Başlangıç (isteğe bağlı)</label>
          <input id="etkinlik-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="bc-hero-search__field">
          <label htmlFor="etkinlik-end">Bitiş (isteğe bağlı)</label>
          <input
            id="etkinlik-end"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="bc-hero-search__field">
          <label htmlFor="etkinlik-price">Fiyat</label>
          <select id="etkinlik-price" value={priceFilter} onChange={(e) => handlePriceFilterChange(e.target.value)}>
            <option value="all">Tümü</option>
            <option value="free">Ücretsiz</option>
            <option value="paid">Biletli</option>
          </select>
        </div>
        <button type="submit" className="bc-hero-search__submit">
          Etkinlik ara
        </button>
      </div>
    </form>
  );

  const cardsConfigured = integrationConfigured === true || configured;

  const listingBody = (
    <>
      {!loading && searched && integrationConfigured === false ? (
        <div className="bc-info-banner" role="status">
          <strong>Etkinlik.io API anahtarı sunucuda tanımlı değil.</strong>{" "}
          {configHint ?? "Railway api-server servisine ETKINLIK_IO_API_KEY ekleyip redeploy yapın."}{" "}
          Teşhis: <code>/api/travel/events/status</code> veya <code>/api/healthz</code> →{" "}
          <code>integrations.etkinlikIo</code>. Partner sitelerinden aramaya devam edebilirsiniz.
        </div>
      ) : null}

      {!loading && searched && searchFailed && integrationConfigured !== false ? (
        <div className="bc-info-banner bc-info-banner--warn" role="status">
          Etkinlik araması şu an yüklenemedi. Birkaç saniye sonra tekrar deneyin veya partner sitelerine göz atın.
        </div>
      ) : null}

      {!loading && searched && configured && configHint ? (
        <div className="bc-info-banner bc-info-banner--warn" role="status">
          Etkinlik.io: {configHint}
        </div>
      ) : null}

      {showGrouped && groupedResults ? (
        <div className="bc-etkinlik-grouped">
          {groupedResults.map(([categoryName, events]) => (
            <section key={categoryName} className="bc-etkinlik-category-section" aria-label={categoryName}>
              <h3 className="bc-etkinlik-category-section__title">
                {categoryName}
                <span className="bc-etkinlik-category-section__count">{events.length}</span>
              </h3>
              <TurizmEventResultCards
                results={events}
                loading={false}
                configured={cardsConfigured}
                city={city}
                affiliateUrl={affiliateUrl}
                compact
              />
            </section>
          ))}
        </div>
      ) : (
        <TurizmEventResultCards
          results={results}
          loading={loading}
          configured={cardsConfigured}
          city={city}
          affiliateUrl={affiliateUrl}
        />
      )}

      <Link href={TURIZM.hub} className="bc-stub__back">
        ← Seyahat ana sayfa
      </Link>
    </>
  );

  return (
    <BookingCoreShell module="konaklama">
      <TurizmTravelPageLayout
        slug="etkinlik"
        pageTitle="Etkinlik & Aktivite"
        heroTitle="Konser, spor, müze — biletli etkinlikler"
        heroSubtitle="Etkinlik.io kataloğu ve partner aktivite siteleri tek aramada."
        search={searchWidget}
        showBlogRow={false}
        listingsAnchorId="etkinlik-listings"
      >
        <div className="bc-list-wrap bc-list-wrap--etkinlik" id="etkinlik-listings">
          {renderCategoryRail()}

          <div className="bc-list-toolbar">
            <p className="bc-result-count">{resultLabel}</p>
            {formats.length > 0 ? (
              <button type="button" className="bc-filter-mobile-btn" onClick={() => setMobileFiltersOpen(true)}>
                <SlidersHorizontal className="w-4 h-4" />
                Tür filtreleri
              </button>
            ) : null}
          </div>

          {formats.length > 0 ? (
            <div className="bc-list-layout bc-list-layout--filtered">
              <div className="bc-filter-sidebar-desktop">{renderFilterSidebar()}</div>

              {mobileFiltersOpen ? (
                <button
                  type="button"
                  className="bc-filter-backdrop"
                  aria-label="Filtreleri kapat"
                  onClick={() => setMobileFiltersOpen(false)}
                />
              ) : null}

              <div className={`bc-filter-drawer${mobileFiltersOpen ? " is-open" : ""}`}>
                {renderFilterSidebar(() => setMobileFiltersOpen(false))}
              </div>

              <div className="bc-list-main">{listingBody}</div>
            </div>
          ) : (
            listingBody
          )}
        </div>
      </TurizmTravelPageLayout>
    </BookingCoreShell>
  );
}
