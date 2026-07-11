import { useListAds, useListCategories, useGetSiteSettings } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Clock, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmCategoryRssLink, applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { apiUrl, resolveClientMediaSrc, rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { mapPublicHybridNewsLinkFields } from "@/lib/hybridNewsHref";
import { useHeadlineSliderInteraction } from "@/hooks/useHeadlineSliderInteraction";
import { isHmHybridRssEnabled, resolveHmUnifiedRssFeedRows } from "@/lib/newsSiteLayout";
import { hmCategorySlug, humanizeNewsCategorySlug, normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import {
  buildHmKnownCanonicalCategorySlugs,
  hmNewsItemMatchesHomeCategorySlug,
  type HmHomeCategoryMatchContext,
} from "@/lib/hmHomeCategorySectionPool";
import { HM_GLOBAL_NEWS_CATEGORY_SLUG, isHmGlobalNewsCategorySlug } from "@/lib/hmGlobalNewsCategory";
import { resolveHmOrGlobalSlotHtml } from "@/lib/hmResolveAdSlotHtml";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import {
  HmNewsImage,
  resolveNewsItemImageUrl,
  filterNewsItemsWithCoverImage,
  resolveHmNewsImageSrc,
} from "@/components/HmNewsImage";
import { HmLeadListSidebarBlock } from "@/components/HmLeadListSidebarBlock";
import { HmSuperLigTeamStrip } from "@/components/HmSuperLigTeamStrip";
import { getSuperligTeamMetaByKey, newsMatchesSuperligTeam } from "@/lib/superligTeamMeta";
import { resolveHmCategoryColor } from "@/lib/hmVitrinThemeTokens";
import {
  excludeHeadlineSliderItems,
  HM_LEAD_LIST_SIDEBAR_TOTAL,
  sortNewsByRecency,
} from "@/lib/hmHeadlinePool";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";

const PAGE_SIZE = 60;
/** Manşet altı kategori grid kutusu — ilk sayfa (4×5). PR #474 manşet dedupe korunur. */
const CATEGORY_GRID_BOX_LIMIT = 20;

type CategoryNewsPage =
  | { items: any[]; total: number }
  | any[];

function normalizeCategoryNewsPage(raw: CategoryNewsPage): { items: any[]; total: number } {
  const items = Array.isArray(raw) ? raw : raw.items ?? [];
  return {
    items: items.map(normalizeCategoryNewsItem),
    total: Array.isArray(raw) ? raw.length : raw.total ?? raw.items?.length ?? 0,
  };
}

function normalizeCategoryNewsItem(item: any): any {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  if (item.source !== "rss" && !String(item.id ?? "").startsWith("rss:") && !String(item.href ?? "").trim()) {
    return item;
  }
  const link = mapPublicHybridNewsLinkFields(item);
  return {
    ...item,
    id: link.id || item.id,
    slug: link.slug,
    source: link.source,
    href: link.href,
    createdAt: item.createdAt ?? item.publishedAt ?? null,
  };
}

function categoryNewsHref(item: any): string {
  const href = String(item?.href ?? "").trim();
  if (href.startsWith("/")) return href;
  const slug = String(item?.slug ?? "").trim();
  if (slug) return `/haber/${slug}`;
  return `/haber/${String(item?.id ?? "0").replace(/^db:/, "")}`;
}

function categoryItemImage(item: any): string | null | undefined {
  return resolveNewsItemImageUrl(item) || item?.imageUrl;
}

function categoryListPath(loc: string): string {
  return (loc.split("?")[0] || "/").trim() || "/";
}

function categoryDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Manşet havuzu: kapaklı haberler öncelikli; liste refetch ile sıra değişince önceki seçim korunur. */
function pickCategoryMansetPool(news: any[], prev: any[]): any[] {
  const limit = HM_LEAD_LIST_SIDEBAR_TOTAL;
  const withCover = filterNewsItemsWithCoverImage(news);
  const pool = withCover.length > 0 ? withCover : news;
  if (!pool.length) return [];
  if (!prev.length) return pool.slice(0, limit);

  const byId = new Map(pool.map((item) => [String(item?.id ?? item?.slug ?? ""), item]));
  const stable: any[] = [];
  for (const item of prev) {
    const key = String(item?.id ?? item?.slug ?? "");
    const next = byId.get(key);
    if (next) stable.push(next);
    if (stable.length >= limit) return stable;
  }
  for (const item of pool) {
    const key = String(item?.id ?? item?.slug ?? "");
    if (stable.some((row) => String(row?.id ?? row?.slug ?? "") === key)) continue;
    stable.push(item);
    if (stable.length >= limit) break;
  }
  return stable;
}

function preloadCategoryMansetImages(items: any[]): void {
  if (typeof window === "undefined") return;
  for (const item of items) {
    const url = resolveHmNewsImageSrc(categoryItemImage(item));
    if (!url) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

function Portal3CategoryHero({
  items,
  categoryLabel,
  categoryAccent,
  h,
}: {
  items: any[];
  categoryLabel: string;
  categoryAccent: string;
  h: (path: string) => string;
}) {
  const headlineItems = items.slice(0, 5);
  const slider = useHeadlineSliderInteraction(headlineItems.length, { autoplay: headlineItems.length > 1 });
  const activeIndex = slider.index;
  const lead = headlineItems[activeIndex] ?? headlineItems[0];
  const heroSide = items.slice(1, 5);
  const leadImageKey = `${lead?.source ?? "db"}:${lead?.id ?? lead?.slug ?? activeIndex}`;

  useEffect(() => {
    preloadCategoryMansetImages(headlineItems);
  }, [headlineItems]);

  if (!lead) return null;
  const smallCard = (item: any, index: number) => {
    return (
      <Link key={item.id ?? item.slug ?? index} href={h(categoryNewsHref(item))} className="hm-portal3-category-card group">
        <HmNewsImage src={categoryItemImage(item)} alt={item.title} />
        <strong>{item.title}</strong>
      </Link>
    );
  };

  return (
    <section className="hm-portal3-category-hero">
      <Link href={h(categoryNewsHref(lead))} className="hm-portal3-category-lead" style={slider.swipeStyle} aria-label={lead.title} {...slider.bind}>
        <HmNewsImage
          key={leadImageKey}
          src={categoryItemImage(lead)}
          alt={lead.title}
          wrapperClassName="absolute inset-0"
          priority
          loading="eager"
        />
        <div>
          <span>{lead.categoryName || lead.feedLabel || categoryLabel}</span>
          <h1>{lead.title}</h1>
        </div>
        {headlineItems.length > 1 ? (
          <nav aria-label={`${categoryLabel} manşetleri`}>
            {headlineItems.map((item, index) => (
              <span
                key={item.id ?? item.slug ?? index}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  slider.setIndex(index);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  slider.setIndex(index);
                }}
                style={{ background: index === activeIndex ? categoryAccent : undefined }}
                aria-label={`${index + 1}. manşet`}
              >
                {index + 1}
              </span>
            ))}
          </nav>
        ) : null}
      </Link>
      {heroSide.length > 0 ? <div className="hm-portal3-category-hero-side">{heroSide.map(smallCard)}</div> : null}
    </section>
  );
}

export default function KategoriDetay() {
  const params = useParams<{ slug?: string; catSlug?: string; pageSlug?: string }>();
  const slug = String(params.catSlug ?? params.pageSlug ?? params.slug ?? "").trim();
  const h = useHmPublicHref();
  const hmCtx = useHmPublicLinkContextOptional();
  const [loc, setLocation] = useLocation();
  const siteIdFromUrl = useMemo(() => {
    const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());
    const n = parseInt(String(q.get("siteId") ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [loc]);
  const siteIdEff = hmCtx?.siteId ?? siteIdFromUrl;
  const siteQs = siteIdEff != null ? `?siteId=${encodeURIComponent(String(siteIdEff))}` : "";
  const categoryPath = useMemo(() => categoryListPath(loc), [loc]);

  const hiddenCategorySlugs = useMemo(
    () =>
      new Set(
        (hmCtx?.layoutPrefs?.hmNavHiddenCategorySlugs ?? [])
          .map((s) => normalizeNewsCategorySlug(s))
          .filter(Boolean),
      ),
    [hmCtx?.layoutPrefs?.hmNavHiddenCategorySlugs],
  );
  const normalizedSlug = hmCategorySlug(slug);
  const isSporCategory = normalizedSlug === "spor";
  const [superligTeamKey, setSuperligTeamKey] = useState<string | null>(null);
  const isGlobalMapOnlyCategory = isHmGlobalNewsCategorySlug(normalizedSlug);
  const isPassiveHmCategory =
    isGlobalMapOnlyCategory || (!!hmCtx && hiddenCategorySlugs.has(normalizedSlug));
  const rssEnabled = hmCtx?.layoutPrefs?.hmNewsRssLinksEnabled !== false;
  const useHybridCategory =
    siteIdEff != null && (hmCtx == null || isHmHybridRssEnabled(hmCtx.layoutPrefs));

  /** Eski `?page=` bağlantıları — sayfa numarası yerine tek liste + “daha fazla”. */
  useEffect(() => {
    const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());
    if (!q.has("page")) return;
    q.delete("page");
    const nextQs = q.toString();
    const target = nextQs ? `${categoryPath}?${nextQs}` : categoryPath;
    if (target !== loc) setLocation(target, { replace: true });
  }, [loc, categoryPath, setLocation]);

  const { data: settings } = useGetSiteSettings();
  const { data: categories } = useListCategories();
  const { data: hmCategories } = useQuery<any[]>({
    queryKey: ["/api/categories", siteIdEff ?? "portal", "kategori-detay"],
    queryFn: () =>
      siteIdEff != null
        ? (apiRequest(`/api/categories?siteId=${encodeURIComponent(String(siteIdEff))}`) as Promise<any[]>)
        : Promise.resolve([]),
    enabled: siteIdEff != null,
    staleTime: 10 * 60 * 1000,
  });
  const categoryRows = siteIdEff != null ? hmCategories : categories;
  const rssCategoryRows = useMemo(() => {
    if (!hmCtx) return [];
    return resolveHmUnifiedRssFeedRows(hmCtx.layoutPrefs)
      .map((row) => ({
        slug: hmCategorySlug(row.label, row.id),
        label: String(row.label ?? row.id ?? "").trim(),
      }))
      .filter((row) => row.slug);
  }, [hmCtx]);
  const siteSlugPrefixes = useMemo(() => {
    const siteSlug = String(hmCtx?.slug ?? "").trim();
    return siteSlug ? [siteSlug] : [];
  }, [hmCtx?.slug]);
  const categoryIdBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of (categoryRows ?? []) as Array<{ id?: number; slug?: string | null; name?: string | null }>) {
      const slug = hmCategorySlug(cat.slug, cat.name);
      const id = Number(cat.id);
      if (slug && Number.isFinite(id) && id > 0) map.set(slug, id);
    }
    return map;
  }, [categoryRows]);
  const categoryMatchContext = useMemo((): HmHomeCategoryMatchContext => ({
    knownCanonicalSlugs: buildHmKnownCanonicalCategorySlugs({
      apiCategories: (categoryRows ?? []) as Array<{ slug?: string | null; name?: string | null }>,
      rssNavSlugs: rssCategoryRows.map((row) => row.slug),
      sectionSlugs: normalizedSlug ? [normalizedSlug] : [],
    }),
    siteSlugPrefixes,
    rssFeedRows: hmCtx ? resolveHmUnifiedRssFeedRows(hmCtx.layoutPrefs) : [],
    categoryIdBySlug,
  }), [categoryRows, categoryIdBySlug, hmCtx, normalizedSlug, rssCategoryRows, siteSlugPrefixes]);

  const {
    data: newsPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [useHybridCategory ? "/api/news/hybrid" : "/api/news/by-category", normalizedSlug || slug, siteIdEff ?? "all", "infinite", PAGE_SIZE],
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === "number" ? pageParam : 0;
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        includeTotal: "1",
      });
      if (siteIdEff != null) params.set("siteId", String(siteIdEff));
      if (useHybridCategory) {
        params.set("categorySlug", normalizedSlug || slug);
        params.set("rssScope", "all");
        const raw = (await apiRequest(`/api/news/hybrid?${params.toString()}`)) as CategoryNewsPage;
        return normalizeCategoryNewsPage(raw);
      }
      const raw = (await apiRequest(
        `/api/news/by-category/${encodeURIComponent(normalizedSlug || slug)}?${params.toString()}`,
      )) as CategoryNewsPage;
      return normalizeCategoryNewsPage(raw);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
    enabled: !!slug && !isPassiveHmCategory,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const news = useMemo(() => {
    const pages = newsPages?.pages ?? [];
    const seen = new Set<number | string>();
    const out: any[] = [];
    for (const page of pages) {
      for (const item of page.items) {
        const id = item?.id;
        if (id != null && seen.has(id)) continue;
        if (id != null) seen.add(id);
        out.push(item);
      }
    }
    const want = normalizedSlug || slug;
    return out.filter((item) => hmNewsItemMatchesHomeCategorySlug(item, want, categoryMatchContext));
  }, [newsPages?.pages, normalizedSlug, slug, categoryMatchContext]);

  useEffect(() => {
    setSuperligTeamKey(null);
  }, [normalizedSlug]);

  const superligTeamMeta = useMemo(
    () => getSuperligTeamMetaByKey(superligTeamKey),
    [superligTeamKey],
  );

  const categoryNews = useMemo(() => {
    if (!isSporCategory || !superligTeamMeta) return news;
    return news.filter((item) => newsMatchesSuperligTeam(item, superligTeamMeta));
  }, [news, isSporCategory, superligTeamMeta]);

  const sortedNews = useMemo(() => sortNewsByRecency(categoryNews), [categoryNews]);

  const mansetPoolRef = useRef<any[]>([]);
  useEffect(() => {
    mansetPoolRef.current = [];
  }, [normalizedSlug, siteIdEff, superligTeamKey]);
  const mansetNews = useMemo(() => {
    const next = pickCategoryMansetPool(sortedNews, mansetPoolRef.current);
    mansetPoolRef.current = next;
    return next;
  }, [sortedNews]);

  const gridNewsAll = useMemo(
    () => excludeHeadlineSliderItems(sortedNews, mansetNews),
    [sortedNews, mansetNews],
  );
  const loadedNewsPages = newsPages?.pages.length ?? 1;
  const gridVisibleLimit = CATEGORY_GRID_BOX_LIMIT * loadedNewsPages;
  const gridNews = useMemo(
    () => gridNewsAll.slice(0, gridVisibleLimit),
    [gridNewsAll, gridVisibleLimit],
  );

  useEffect(() => {
    preloadCategoryMansetImages(mansetNews);
  }, [mansetNews]);

  const newsTotal = newsPages?.pages[0]?.total ?? news.length;
  const hasMore = hasNextPage === true || gridNewsAll.length > gridNews.length;

  const { data: breakingNews = [] } = useQuery<any[]>({
    queryKey: ["/api/news/breaking", siteIdEff ?? "portal"],
    queryFn: () =>
      apiRequest(
        siteIdEff != null
          ? `/api/news/breaking?siteId=${encodeURIComponent(String(siteIdEff))}`
          : `/api/news/breaking`,
      ),
    staleTime: 60_000,
  });
  const currentCategory = useMemo(
    () => categoryRows?.find((c: { slug?: string; name?: string }) => hmCategorySlug(c.slug, c.name) === normalizedSlug),
    [categoryRows, normalizedSlug],
  );
  const currentRssCategory = useMemo(
    () => rssCategoryRows.find((row) => row.slug === normalizedSlug),
    [rssCategoryRows, normalizedSlug],
  );
  const categoryLabel = String(
    currentCategory?.name ||
      currentRssCategory?.label ||
      news.find((item) => String(item?.categoryName ?? item?.feedLabel ?? "").trim())?.categoryName ||
      news.find((item) => String(item?.feedLabel ?? "").trim())?.feedLabel ||
      humanizeNewsCategorySlug(slug),
  ).trim();
  const hmCategoryRssHref = hmCtx && rssEnabled && !isPassiveHmCategory
    ? apiUrl(`/api/rss/${encodeURIComponent(hmCtx.slug)}/${encodeURIComponent(slug)}.xml`)
    : null;

  const navLinks = useMemo(
    () =>
      [
        { href: "/", label: "ANASAYFA" },
        { href: "/kategori/gundem", label: "GÜNDEM" },
        { href: "/kategori/ekonomi", label: "EKONOMİ" },
        { href: "/kategori/spor", label: "SPOR" },
        { href: "/kategori/dunya", label: "DÜNYA" },
        { href: "/kategori/magazin", label: "MAGAZİN" },
        { href: "/kategori/teknoloji", label: "TEKNOLOJİ" },
        { href: "/kategori/saglik", label: "SAĞLIK" },
        { href: "/yektube", label: "YEKTUBE" },
      ].map((l) => {
        const raw =
          l.href.startsWith("/kategori/") && siteQs ? `${l.href}${siteQs}` : l.href;
        return { ...l, href: h(raw) };
      }),
    [siteQs, h],
  );

  useEffect(() => {
    if (!hmCtx) return;
    const path = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hmCtx.slug)}/kategori/${encodeURIComponent(slug)}`;
    const rssTitle = `${categoryLabel} RSS · ${hmCtx.displayName}`;
    applyHmNewsSiteHomeMeta({
      siteName: hmCtx.displayName,
      browserTitle: `${categoryLabel} · ${hmCtx.displayName}`,
      description: `${categoryLabel} haberleri — ${hmCtx.description || hmCtx.displayName}`,
      canonicalPath: path,
      canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
      imageUrl: hmCtx.layoutPrefs.logoUrl,
      logoUrl: hmCtx.layoutPrefs.logoUrl,
      faviconUrl: hmCtx.layoutPrefs.faviconUrl,
    });
    applyHmCategoryRssLink(rssTitle, hmCategoryRssHref);
    return () => applyHmCategoryRssLink("", null);
  }, [hmCtx, slug, categoryLabel, hmCategoryRssHref]);

  const showPortalLegacyNav = hmCtx == null;
  const navSticky = hmCtx ? "top-0" : "top-[52px]";
  const tumListe = siteIdEff != null ? h(`/tum-haberler?siteId=${encodeURIComponent(String(siteIdEff))}`) : h("/tum-haberler");
  const categoryAccent = resolveHmCategoryColor(
    normalizedSlug,
    hmCtx?.layoutPrefs?.hmCategoryColors ?? null,
    String((currentCategory as any)?.color ?? hmCtx?.layoutPrefs?.hmPrimaryColor ?? "#e61e25").trim() || "#e61e25",
  );
  const layoutPrefs = hmCtx?.layoutPrefs ?? null;
  const isPortal3Theme = layoutPrefs?.hmVitrinTheme === "portal3";
  const isEsenTheme = layoutPrefs?.hmVitrinTheme === "esen";
  const isWsjTheme = false;
  const { data: adSlots = [] } = useListAds();
  const portal3TopAdHtml = useMemo(() => {
    if (!layoutPrefs) return "";
    const raw = resolveHmOrGlobalSlotHtml(siteIdEff, layoutPrefs, "manset_alti", adSlots) ?? "";
    return sanitizeHtml(rewriteInlineHtmlImgSrc(raw));
  }, [adSlots, layoutPrefs, siteIdEff]);
  const portal3SidebarAdHtml = useMemo(() => {
    if (!layoutPrefs) return "";
    const raw = resolveHmOrGlobalSlotHtml(siteIdEff, layoutPrefs, "sidebar_top", adSlots) ?? "";
    return sanitizeHtml(rewriteInlineHtmlImgSrc(raw));
  }, [adSlots, layoutPrefs, siteIdEff]);

  if (isPortal3Theme) {
    const lead = mansetNews[0];
    const gridItems = gridNews;
    const rightNews = [...breakingNews, ...sortedNews].filter(Boolean).slice(0, 4);
    const smallCard = (item: any, index: number) => {
      return (
        <Link key={item.id ?? item.slug ?? index} href={h(categoryNewsHref(item))} className="hm-portal3-category-card group">
          <HmNewsImage src={categoryItemImage(item)} alt={item.title} />
          <strong>{item.title}</strong>
        </Link>
      );
    };

    return (
      <div className="hm-portal3-category-page min-w-0" data-hm-vitrin-theme="portal3">
        <main className="hm-portal3-category-frame">
          <section className="min-w-0">
            <div className="hm-portal3-category-title">
              <span>{categoryLabel}</span>
            </div>

            {isPassiveHmCategory ? (
              <div className="hm-portal3-empty">
                {isGlobalMapOnlyCategory
                  ? "Global haberler yalnızca haber haritasında görüntülenir."
                  : "Bu kategori yayında değil."}
              </div>
            ) : isLoading ? (
              <div className="hm-portal3-empty">Haberler yükleniyor...</div>
            ) : lead ? (
              <>
                <Portal3CategoryHero items={mansetNews} categoryLabel={categoryLabel} categoryAccent={categoryAccent} h={h} />

                {portal3TopAdHtml ? (
                  <div className="hm-portal3-wide-ad" dangerouslySetInnerHTML={{ __html: portal3TopAdHtml }} />
                ) : null}

                <div className="hm-portal3-category-grid">
                  {gridItems.map(smallCard)}
                </div>

                {hasMore ? (
                  <div className="mt-9 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isFetchingNextPage}
                      className="hm-portal3-load-more"
                      onClick={() => void fetchNextPage()}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Yükleniyor...
                        </>
                      ) : (
                        "Daha fazla göster"
                      )}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="hm-portal3-empty">Bu kategoride henüz haber bulunmuyor.</div>
            )}
          </section>

          <aside className="hm-portal3-category-sidebar">
            {portal3SidebarAdHtml ? (
              <div className="hm-portal3-sidebar-ad" dangerouslySetInnerHTML={{ __html: portal3SidebarAdHtml }} />
            ) : null}
            {rightNews.length > 0 ? (
              <section className="hm-portal3-side-news">
                <h2>Son Haberler</h2>
                {rightNews.map((item, index) => (
                  <Link key={item.id ?? item.slug ?? index} href={h(categoryNewsHref(item))}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                  </Link>
                ))}
              </section>
            ) : null}
          </aside>
        </main>
      </div>
    );
  }

  if (isWsjTheme) {
    const lead = mansetNews[0];
    const belowManset = gridNews;
    const topStories = belowManset.slice(0, 6);
    const midStories = belowManset.slice(6, 14);
    const videoStories = belowManset.slice(14, 20);
    const sideItems = [...breakingNews, ...sortedNews].filter(Boolean).slice(0, 10);
    const wsjStory = (item: any, index: number, large = false) => {
      return (
        <Link key={item.id ?? item.slug ?? index} href={h(categoryNewsHref(item))} className={`hm-wsj-cat-story ${large ? "hm-wsj-cat-story--large" : ""}`}>
          <HmNewsImage src={categoryItemImage(item)} alt={item.title} />
          <h2>{item.title}</h2>
          <p>{item.spot || item.summary || ""}</p>
          <time>{categoryDate(item.createdAt ?? item.publishedAt) || (item.source === "rss" ? "RSS" : "Haber")}</time>
        </Link>
      );
    };

    return (
      <div className="hm-wsj-category-page min-w-0" data-hm-vitrin-theme="wsj">
        <main className="hm-wsj-category-frame">
          <section className="hm-wsj-category-main">
            <header className="hm-wsj-category-title">
              <p>{hmCtx?.displayName || "Haber Merkezi"}</p>
              <h1>{categoryLabel}</h1>
            </header>

            {isPassiveHmCategory ? (
              <div className="hm-wsj-empty">
                {isGlobalMapOnlyCategory
                  ? "Global haberler yalnızca haber haritasında görüntülenir."
                  : "Bu kategori yayında değil."}
              </div>
            ) : isLoading ? (
              <div className="hm-wsj-empty">Haberler yükleniyor...</div>
            ) : lead ? (
              <>
                <div className="hm-wsj-category-top">
                  {wsjStory(lead, 0, true)}
                  <div className="hm-wsj-category-top-list hm-wsj-category-top-list--quad">
                    {topStories.slice(0, 4).map((item, index) => wsjStory(item, index))}
                  </div>
                </div>

                <div className="hm-wsj-category-grid">
                  {topStories.slice(3).concat(midStories).map((item, index) => wsjStory(item, index))}
                </div>

                {videoStories.length > 0 ? (
                  <section className="hm-wsj-video-list">
                    <h2>Video</h2>
                    {videoStories.map((item, index) => {
                      return (
                        <Link key={item.id ?? item.slug ?? index} href={h(categoryNewsHref(item))}>
                          <HmNewsImage src={categoryItemImage(item)} alt={item.title} />
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.spot || item.summary || ""}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </section>
                ) : null}

                {hasMore ? (
                  <div className="mt-9 flex justify-center">
                    <Button type="button" variant="outline" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Yükleniyor...
                        </>
                      ) : (
                        "Daha fazla göster"
                      )}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="hm-wsj-empty">Bu kategoride henüz haber bulunmuyor.</div>
            )}
          </section>

          <aside className="hm-wsj-category-sidebar">
            {portal3SidebarAdHtml ? (
              <div className="hm-wsj-ad" dangerouslySetInnerHTML={{ __html: portal3SidebarAdHtml }} />
            ) : null}
            {sideItems.length > 0 ? (
              <section>
                <h2>Çok Okunanlar</h2>
                {sideItems.slice(0, 6).map((item, index) => (
                  <Link key={item.id ?? item.slug ?? index} href={h(categoryNewsHref(item))}>
                    <span>{index + 1}</span>
                    <strong>{item.title}</strong>
                  </Link>
                ))}
              </section>
            ) : null}
            {sideItems.length > 6 ? (
              <section>
                <h2>Yorum</h2>
                {sideItems.slice(6, 10).map((item, index) => (
                  <Link key={item.id ?? item.slug ?? `op-${index}`} href={h(categoryNewsHref(item))}>
                    <strong>{item.title}</strong>
                  </Link>
                ))}
              </section>
            ) : null}
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`${hmCtx ? "min-w-0 bg-white font-sans" : "bg-gray-50 font-sans"} ${isEsenTheme ? "hm-esen-category-lite" : ""}`}
      data-hm-vitrin-theme={isEsenTheme ? "esen" : undefined}
    >
      {showPortalLegacyNav ? (
      <nav className={`bg-[#e61e25] sticky ${navSticky} z-40`}>
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-6 h-10 text-xs font-bold tracking-wide uppercase overflow-x-auto whitespace-nowrap text-white">
            <li>
              <Link href={tumListe} className="hover:text-red-200 transition-colors">
                Haberler
              </Link>
            </li>
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`hover:text-red-200 transition-colors ${
                    link.href.includes(`/kategori/${encodeURIComponent(slug)}`) ||
                    link.href.includes(`/kategori/${slug}`)
                      ? "border-b-2 border-white pb-0.5"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {categories?.filter(c => !navLinks.find(n => n.href.includes(`/kategori/${c.slug}`))).map(c => (
              <li key={c.slug}>
                <Link
                  href={h(siteIdEff != null ? `/kategori/${c.slug}${siteQs}` : `/kategori/${c.slug}`)}
                  className="hover:text-red-200 transition-colors"
                >
                  {c.name.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      ) : null}

      {showPortalLegacyNav && breakingNews && breakingNews.length > 0 ? (
        <div className="bg-zinc-900 text-white text-xs py-1.5">
          <div className="container mx-auto flex items-center gap-3">
            <span className="bg-[#e61e25] text-white text-[10px] font-bold px-2 py-0.5 rounded shrink-0">SON DAKİKA</span>
            <div className="flex-1 overflow-hidden">
              <div className="whitespace-nowrap truncate text-sm font-medium text-white">
                <Link href={h(`/haber/${breakingNews[0].slug ?? breakingNews[0].id}`)} className="hover:text-red-300 transition-colors">
                  {breakingNews[0].title}
                </Link>
                {breakingNews.length > 1 && (
                  <span className="text-zinc-400 ml-3">+{breakingNews.length - 1} daha</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main
        className={
          hmCtx
            ? hmSiteContentShellClass(layoutPrefs, "hm-category-detail-page pb-6 pt-0 sm:pb-8")
            : "container mx-auto px-4 pb-8 pt-0"
        }
      >
        {isPassiveHmCategory ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            {isGlobalMapOnlyCategory
              ? "Global haberler yalnızca haber haritasında görüntülenir."
              : "Bu kategori yayında değil."}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {isSporCategory && !isPassiveHmCategory ? (
              <HmSuperLigTeamStrip
                selectedTeamKey={superligTeamKey}
                onTeamSelect={setSuperligTeamKey}
              />
            ) : null}
            {mansetNews.length > 0 ? (
              <HmLeadListSidebarBlock
                title={`${categoryLabel} manşeti`}
                categoryTag={categoryLabel}
                items={mansetNews}
                accent={categoryAccent}
                categoryFallback={categoryLabel}
                getItemHref={(item) => h(categoryNewsHref(item))}
                href={tumListe}
                hmCategoryColors={hmCtx?.layoutPrefs?.hmCategoryColors ?? null}
                moduleId="categoryLeadListSidebar"
              />
            ) : null}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {gridNews.map(item => (
                <Link key={item.id} href={h(categoryNewsHref(item))} className="bg-white rounded shadow-sm overflow-hidden group flex flex-col hover:shadow-md transition-shadow">
                  <div className="relative aspect-video overflow-hidden bg-white">
                    <HmNewsImage
                      src={categoryItemImage(item)}
                      alt={item.title}
                      wrapperClassName="absolute inset-0"
                      className="group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-sm leading-tight text-slate-900 group-hover:text-red-600 transition-colors line-clamp-3 flex-1">{item.title}</h3>
                  </div>
                </Link>
              ))}
              {sortedNews.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  {superligTeamMeta
                    ? `${superligTeamMeta.label} ile ilgili haber bulunamadı.`
                    : "Bu kategoride henüz haber bulunmuyor."}
                </div>
              )}
            </div>

            {hasMore ? (
              <div className="mt-10 flex flex-col items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isFetchingNextPage}
                  className="min-w-[220px] border-slate-300 font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Yükleniyor…
                    </>
                  ) : (
                    "Daha fazla haber göster"
                  )}
                </Button>
                <p className="text-xs text-slate-500">
                  Her tıklamada {PAGE_SIZE} haber daha listeye eklenir.
                </p>
              </div>
            ) : sortedNews.length > 0 && sortedNews.length >= newsTotal ? (
              <p className="mt-8 text-center text-xs text-slate-500">Tüm haberler listelendi.</p>
            ) : null}
          </>
        )}
      </main>

      {!hmCtx ? (
        <footer className="bg-zinc-900 text-white py-8 mt-8">
          <div className="container mx-auto px-4 text-center">
            <div className="text-2xl font-black mb-2 tracking-tighter">
              <span className="text-[#e61e25]">{settings?.logoText1 || "Yek"}</span>
              <span>{settings?.logoText2 || "pare"}</span>
            </div>
            <p className="text-zinc-400 text-sm">{settings?.copyrightText || `© ${new Date().getFullYear()} Tüm Hakları Saklıdır.`}</p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
