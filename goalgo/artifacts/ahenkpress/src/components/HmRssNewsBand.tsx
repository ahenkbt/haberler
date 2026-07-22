import { useEffect, useMemo, useState, useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, X } from "lucide-react";
import { Link } from "wouter";
import { HmNewsImage, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { HM_HOME_LATEST_BAND_ITEM_COUNT } from "@/lib/newsSiteLayout";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { coercePublicHybridNewsHref, mapPublicHybridNewsLinkFields } from "@/lib/hybridNewsHref";
import { fetchPortalRssPreview, mapHybridNewsToBandItem, type PortalRssPreview } from "@/hooks/useHomeHybridNews";
import { apiRequest } from "@/lib/queryClient";
import { deferSimilarNewsItems } from "@/lib/hmNewsTitleSimilarity";
import { sanitizeHtml, stripExternalAnchorsFromHtml } from "@/lib/sanitizeHtml";
import { hmCategorySlug, hmCategorySlugCandidates } from "@/lib/hmCategorySlug";
import {
  hmNewsItemMatchesHomeCategorySlug,
  type HmHomeCategoryMatchContext,
} from "@/lib/hmHomeCategorySectionPool";
import { newsItemMatchesCategorySlug } from "@/lib/hmHomeModuleCategories";
import { dedupeHmCategoryTabsByCanonicalSlug, type HmRssCategoryTab } from "@/lib/hmCategoryTabs";
import { passesCategoryContentGuard } from "@/lib/hmCategoryContentGuard";
import { isKoseArticle } from "@/lib/isKoseArticle";

function RssBandGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="hm-rss-news-band__grid" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="hm-rss-news-band__card">
          <div className="hm-rss-news-band__media animate-pulse bg-slate-100" />
          <div className="hm-rss-news-band__body space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

export type HmRssNewsBandItem = {
  id: number | string;
  slug?: string | null;
  title: string;
  spot?: string | null;
  content?: string | null;
  contentHtml?: string | null;
  contentText?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryColor?: string | null;
  feedLabel?: string | null;
  createdAt?: string | null;
  isBreaking?: boolean | null;
  /** Hibrit RSS satırı için site içi yol (`/haberler/rss/...` veya `/haber/...`). */
  href?: string | null;
  source?: "db" | "rss";
  hmSyncKind?: "news" | "makale" | null;
  contentKind?: "news" | "makale";
  authorId?: number | null;
  rssSourceUrl?: string | null;
  isEditorManual?: boolean | null;
  isFeatured?: boolean | null;
};

export type { HmRssCategoryTab };

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function normalizeSlug(raw: unknown): string {
  return hmCategorySlug(raw);
}

/** Haber satırı kategori slug'ı ile sekme slug'ını eşleştirir (RSS feed alias + canonical slug). */
function itemMatchesCategory(
  item: HmRssNewsBandItem,
  tabSlug: string,
  matchContext?: HmHomeCategoryMatchContext,
): boolean {
  const want = normalizeSlug(tabSlug);
  if (!want) return true;
  if (matchContext) {
    return hmNewsItemMatchesHomeCategorySlug(item, want, matchContext);
  }
  return newsItemMatchesCategorySlug(item, want);
}

/** Sekme seçiliyken: API → kategori havuzu → eşleşen öğeler. Boş kutu — yanlış kategoriye düşme. */
export function resolveRssBandCategoryItems(opts: {
  activeSlug: string;
  categoryNewsItems: readonly HmRssNewsBandItem[];
  items: readonly HmRssNewsBandItem[];
  tabSourceItems?: readonly HmRssNewsBandItem[];
  matchContext?: HmHomeCategoryMatchContext;
}): HmRssNewsBandItem[] {
  const pool = opts.tabSourceItems ?? opts.items;
  const slug = normalizeSlug(opts.activeSlug);
  if (!slug) return [...pool];

  const match = (item: HmRssNewsBandItem) => itemMatchesCategory(item, slug, opts.matchContext);

  if (opts.categoryNewsItems.length > 0) {
    const fromApi = opts.categoryNewsItems.filter(match);
    if (fromApi.length > 0) return fromApi;
  }

  const fromPool = pool.filter(match);
  if (fromPool.length > 0) return fromPool;

  return opts.items.filter(match);
}

function vitrinImgSrc(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  return resolveClientMediaSrc(u) || u;
}

function stripHtmlText(raw: string): string {
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function newsExcerpt(item: HmRssNewsBandItem): string {
  const spot = stripHtmlText(String(item.spot ?? ""));
  if (spot) return spot.length > 120 ? `${spot.slice(0, 117)}…` : spot;
  return "";
}

function isRssNewsItem(item: HmRssNewsBandItem): boolean {
  const rawId = String(item.id ?? "");
  const href = String(item.href ?? "");
  return item.source === "rss" || rawId.startsWith("rss:") || /\/haberler\/rss\//.test(href);
}

function rssItemId(item: HmRssNewsBandItem): string {
  const rawId = String(item.id ?? "").trim();
  if (rawId.startsWith("rss:")) return rawId.slice(4).trim();
  const href = String(item.href ?? "").trim();
  const match = href.match(/\/haberler\/rss\/([^/?#]+)/);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return rawId;
}

function rssFallbackPreview(item: HmRssNewsBandItem | null): PortalRssPreview | null {
  if (!item) return null;
  const spot = String(item.spot ?? "").trim();
  const contentHtml =
    String(item.contentHtml ?? "").trim() ||
    String(item.content ?? "").trim() ||
    (spot ? `<p>${spot}</p>` : "");
  return {
    id: rssItemId(item),
    title: item.title,
    spot,
    contentHtml: contentHtml || null,
    imageUrl: item.imageUrl ?? null,
    publishedAt: item.createdAt ?? null,
    categoryName: item.categoryName ?? null,
    feedLabel: null,
  };
}

function resolveCategoryColor(
  item: HmRssNewsBandItem,
  accent: string,
  hmCategoryColors?: Record<string, string> | null,
): string {
  const slug = normalizeSlug(item.categorySlug);
  const fromMap = slug && hmCategoryColors?.[slug];
  if (typeof fromMap === "string" && HEX_COLOR.test(fromMap.trim())) return fromMap.trim();
  const raw = String(item.categoryColor ?? "").trim();
  if (HEX_COLOR.test(raw)) return raw;
  return accent;
}

function buildTabsFromItems(items: HmRssNewsBandItem[]): HmRssCategoryTab[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const slug = hmCategorySlug(item.categorySlug, item.categoryName, item.feedLabel);
    if (!slug || seen.has(slug)) continue;
    const label = String(item.categoryName ?? slug).trim() || slug;
    seen.set(slug, label.toLocaleUpperCase("tr-TR"));
  }
  return Array.from(seen.entries()).map(([slug, label]) => ({ slug, label }));
}

type Props = {
  title: string;
  titleHref?: string;
  items: HmRssNewsBandItem[];
  /** Sekmeler; boşsa haber havuzundan türetilir. İlk madde «Tümü» olabilir. */
  categoryTabs?: HmRssCategoryTab[];
  /** Sekme listesi için tam havuz (görünür dilimden geniş). */
  tabSourceItems?: HmRssNewsBandItem[];
  initialCategorySlug?: string;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  pending?: boolean;
  error?: boolean;
  moreHref?: string;
  moreLabel?: string;
  className?: string;
  /** Liste üst sınırı (anasayfa bandında 15). */
  maxVisibleItems?: number;
  /** Doluysa sekme seçilince `/api/news/by-category` ile tüm kategori haberleri yüklenir. */
  categoryQuerySiteId?: number | null;
  /** Kategori API isteğindeki limit (tüm haberler sayfası vb.). */
  categoryFetchLimit?: number;
  /** Kategori API isteğinde hangi RSS havuzu kullanılacak. */
  categoryRssScope?: "site" | "box" | "all";
  /** Izgara sütun sayısı (lg+); varsayılan 3. */
  gridColumns?: 3 | 4;
  /** Başlık satırını gizle (yalnızca kategori sekmeleri + ızgara). */
  hideTitleRow?: boolean;
  /** RSS feed alias + canonical slug eşleştirmesi (anasayfa kategori kutuları ile aynı). */
  categoryMatchContext?: HmHomeCategoryMatchContext;
  /** true: köşe yazısı / makale satırlarını gösterme (haber akışı). */
  newsOnly?: boolean;
  /** inline: «Daha Fazla Haber» aynı sayfada satır ekler; navigate: eski davranış (moreHref). */
  loadMoreMode?: "navigate" | "inline";
  /** inline modda «Daha Fazla Haber» yanındaki kategori indeks linki. */
  categoriesHref?: string;
  /** inline modda «Daha Fazla Haber» yanındaki tüm haberler linki. */
  allNewsHref?: string;
  /** inline modda her tıklamada gösterilecek ek satır sayısı. */
  loadMoreBatchSize?: number;
};

function isHaberBandRow(item: HmRssNewsBandItem): boolean {
  return !isKoseArticle({
    contentKind: item.contentKind ?? undefined,
    authorId: item.authorId ?? null,
    hmSyncKind: item.hmSyncKind ?? null,
    categorySlug: item.categorySlug ?? null,
    rssSourceUrl: item.rssSourceUrl ?? null,
  });
}

function maybeNewsOnly(items: readonly HmRssNewsBandItem[], newsOnly: boolean): HmRssNewsBandItem[] {
  if (!newsOnly) return [...items];
  return items.filter(isHaberBandRow);
}

export function HmRssNewsBand({
  title,
  titleHref,
  items,
  categoryTabs,
  tabSourceItems,
  initialCategorySlug = "",
  accent,
  hmCategoryColors,
  pending = false,
  error = false,
  moreHref,
  moreLabel = "Daha Fazla Haber",
  className = "",
  maxVisibleItems,
  categoryQuerySiteId = null,
  categoryFetchLimit,
  categoryRssScope = "site",
  gridColumns = 3,
  hideTitleRow = false,
  categoryMatchContext,
  newsOnly = false,
  loadMoreMode = "navigate",
  categoriesHref,
  allNewsHref,
  loadMoreBatchSize,
}: Props) {
  const h = useHmPublicHref();
  const [activeSlug, setActiveSlug] = useState(normalizeSlug(initialCategorySlug));
  const [selectedRssItem, setSelectedRssItem] = useState<HmRssNewsBandItem | null>(null);
  const inlineLoadMore = loadMoreMode === "inline";
  const baseVisibleLimit = maxVisibleItems ?? HM_HOME_LATEST_BAND_ITEM_COUNT;
  const batchSize = Math.max(loadMoreBatchSize ?? baseVisibleLimit, 6);
  const [inlineVisibleLimit, setInlineVisibleLimit] = useState(baseVisibleLimit);
  const [apiExtraItems, setApiExtraItems] = useState<HmRssNewsBandItem[]>([]);
  const [apiOffset, setApiOffset] = useState(0);
  const [apiExhausted, setApiExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const selectedRssId = selectedRssItem ? rssItemId(selectedRssItem) : "";
  const categoryLimit = Math.max(
    categoryFetchLimit ?? 0,
    maxVisibleItems ?? HM_HOME_LATEST_BAND_ITEM_COUNT,
    40,
  );

  useEffect(() => {
    setActiveSlug(normalizeSlug(initialCategorySlug));
  }, [initialCategorySlug]);

  useEffect(() => {
    if (!inlineLoadMore) return;
    setInlineVisibleLimit(baseVisibleLimit);
    setApiExtraItems([]);
    setApiOffset(0);
    setApiExhausted(false);
    setLoadingMore(false);
  }, [activeSlug, baseVisibleLimit, inlineLoadMore, items, tabSourceItems]);

  const { data: categoryNewsRaw, isPending: categoryPending } = useQuery({
    queryKey: ["/api/news/by-category", "rss-band", categoryQuerySiteId ?? "portal", activeSlug, categoryLimit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(categoryLimit));
      if (categoryQuerySiteId != null && Number.isFinite(categoryQuerySiteId) && categoryQuerySiteId > 0) {
        params.set("siteId", String(categoryQuerySiteId));
      } else {
        params.set("siteScope", "portal");
      }
      const raw = await apiRequest(
        `/api/news/by-category/${encodeURIComponent(activeSlug)}?${params.toString()}`,
      );
      return Array.isArray(raw) ? raw : ((raw as { items?: unknown[] })?.items ?? []);
    },
    enabled: !!activeSlug,
    staleTime: 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const { data: selectedRssPreview, isPending: selectedRssPending } = useQuery({
    queryKey: ["/api/news/hybrid/rss", "inline-band", selectedRssId, categoryQuerySiteId ?? "portal"],
    queryFn: () => fetchPortalRssPreview(selectedRssId, categoryQuerySiteId),
    enabled: Boolean(selectedRssId),
    retry: 1,
    staleTime: 60 * 1000,
  });

  const categoryNewsItems = useMemo((): HmRssNewsBandItem[] => {
    const rows = Array.isArray(categoryNewsRaw) ? categoryNewsRaw : [];
    const mapped = rows.map((n: Record<string, unknown>) => {
      const mapped = mapHybridNewsToBandItem(n as Parameters<typeof mapHybridNewsToBandItem>[0]);
      if (mapped.id != null && mapped.title) return mapped;
      const { id, slug, source, href } = mapPublicHybridNewsLinkFields(n);
      return {
        id,
        slug,
        title: String(n.title ?? ""),
        spot: (n.spot as string | null) ?? null,
        content: (n.content as string | null) ?? null,
        contentHtml: (n.contentHtml as string | null) ?? null,
        contentText: (n.contentText as string | null) ?? null,
        imageUrl: (n.imageUrl as string | null) ?? null,
        categoryName: (n.categoryName as string | null) ?? null,
        categorySlug: (n.categorySlug as string | null) ?? null,
        categoryColor: (n.categoryColor as string | null) ?? null,
        createdAt: (n.createdAt as string | null) ?? null,
        isBreaking: (n.isBreaking as boolean | null) ?? null,
        href,
        source,
      };
    });
    return maybeNewsOnly(mapped, newsOnly);
  }, [categoryNewsRaw, newsOnly]);

  const tabs = useMemo(() => {
    const pool = tabSourceItems ?? items;
    const base = categoryTabs?.length ? categoryTabs : buildTabsFromItems(pool);
    const hasAll = base.some((t) => !normalizeSlug(t.slug));
    const normalized = base.map((t) => ({
      label: String(t.label ?? "").trim() || "TÜMÜ",
      slug: normalizeSlug(t.slug),
    }));
    const merged = hasAll ? normalized : [{ label: "TÜMÜ", slug: "" }, ...normalized];
    if (!categoryMatchContext) return merged;
    return dedupeHmCategoryTabsByCanonicalSlug(
      merged,
      categoryMatchContext.knownCanonicalSlugs,
      categoryMatchContext.siteSlugPrefixes,
    );
  }, [categoryTabs, categoryMatchContext, items, tabSourceItems]);

  const filteredAll = useMemo(() => {
    const fullPool = tabSourceItems ?? items;
    let list = activeSlug
      ? resolveRssBandCategoryItems({
          activeSlug,
          categoryNewsItems,
          items,
          tabSourceItems,
          matchContext: categoryMatchContext,
        })
      : fullPool;
    if (!activeSlug && list.length === 0 && fullPool.length > 0) {
      list = [...fullPool];
    }
    if (!activeSlug && list.length === 0 && items.length > 0) {
      list = [...items];
    }
    if (activeSlug) {
      list = list.filter((item) => passesCategoryContentGuard(item, activeSlug));
    }
    const deduped = deferSimilarNewsItems(list);
    return maybeNewsOnly(deduped, newsOnly);
  }, [
    activeSlug,
    categoryMatchContext,
    categoryNewsItems,
    items,
    tabSourceItems,
    newsOnly,
  ]);

  const filtered = useMemo(() => {
    if (inlineLoadMore) {
      const localSlice = filteredAll.slice(0, inlineVisibleLimit);
      const seen = new Set(localSlice.map((item) => String(item.id ?? item.slug ?? item.title ?? "")));
      const extras = apiExtraItems.filter((item) => {
        const key = String(item.id ?? item.slug ?? item.title ?? "");
        return key && !seen.has(key);
      });
      return [...localSlice, ...extras];
    }
    if (maxVisibleItems == null || maxVisibleItems <= 0) return filteredAll;
    return filteredAll.slice(0, maxVisibleItems);
  }, [apiExtraItems, filteredAll, inlineLoadMore, inlineVisibleLimit, maxVisibleItems]);

  const canLoadMoreInline = useMemo(() => {
    if (!inlineLoadMore) return false;
    if (inlineVisibleLimit < filteredAll.length) return true;
    return !apiExhausted;
  }, [apiExhausted, filteredAll.length, inlineLoadMore, inlineVisibleLimit]);

  const handleLoadMoreInline = useCallback(async () => {
    if (!inlineLoadMore || loadingMore) return;
    if (inlineVisibleLimit < filteredAll.length) {
      setInlineVisibleLimit((prev) => prev + batchSize);
      return;
    }
    if (apiExhausted) return;

    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: String(batchSize),
        offset: String(apiOffset),
        status: "published",
      });
      if (categoryQuerySiteId != null && Number.isFinite(categoryQuerySiteId) && categoryQuerySiteId > 0) {
        params.set("siteId", String(categoryQuerySiteId));
      } else {
        params.set("siteScope", "portal");
      }
      if (activeSlug) params.set("categorySlug", activeSlug);

      const raw = await apiRequest(`/api/news?${params.toString()}`);
      const rows = Array.isArray(raw) ? raw : ((raw as { items?: unknown[] })?.items ?? []);
      const mapped = rows.map((n: Record<string, unknown>) => {
        const mappedItem = mapHybridNewsToBandItem(n as Parameters<typeof mapHybridNewsToBandItem>[0]);
        if (mappedItem.id != null && mappedItem.title) return mappedItem;
        const { id, slug, source, href } = mapPublicHybridNewsLinkFields(n);
        return {
          id,
          slug,
          title: String(n.title ?? ""),
          spot: (n.spot as string | null) ?? null,
          content: (n.content as string | null) ?? null,
          contentHtml: (n.contentHtml as string | null) ?? null,
          contentText: (n.contentText as string | null) ?? null,
          imageUrl: (n.imageUrl as string | null) ?? null,
          categoryName: (n.categoryName as string | null) ?? null,
          categorySlug: (n.categorySlug as string | null) ?? null,
          categoryColor: (n.categoryColor as string | null) ?? null,
          createdAt: (n.createdAt as string | null) ?? null,
          isBreaking: (n.isBreaking as boolean | null) ?? null,
          href,
          source,
        } satisfies HmRssNewsBandItem;
      });
      const nextItems = maybeNewsOnly(mapped, newsOnly);
      setApiExtraItems((prev) => [...prev, ...nextItems]);
      setApiOffset((prev) => prev + batchSize);
      if (nextItems.length < batchSize) setApiExhausted(true);
    } catch {
      setApiExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [
    activeSlug,
    apiExhausted,
    apiOffset,
    batchSize,
    categoryQuerySiteId,
    filteredAll.length,
    inlineLoadMore,
    inlineVisibleLimit,
    loadingMore,
    newsOnly,
  ]);

  const listPending = pending || (!!activeSlug && categoryPending);
  const showGridSkeleton = listPending && filtered.length === 0;
  const showGridRefreshing = listPending && filtered.length > 0;

  const newsHref = (n: HmRssNewsBandItem) => h(coercePublicHybridNewsHref(n));
  const inlinePreview = selectedRssPreview ?? rssFallbackPreview(selectedRssItem);
  const inlineImage = inlinePreview?.imageUrl ? vitrinImgSrc(inlinePreview.imageUrl) : "";
  const inlineHtml = inlinePreview?.contentHtml
    ? sanitizeHtml(stripExternalAnchorsFromHtml(inlinePreview.contentHtml))
    : inlinePreview?.spot
      ? sanitizeHtml(`<p>${inlinePreview.spot}</p>`)
      : "";

  const gridClass =
    gridColumns === 4 ? "hm-rss-news-band--cols-4" : gridColumns === 3 ? "hm-rss-news-band--cols-3" : "";

  return (
    <section className={`hm-rss-news-band ${gridClass} ${className}`.trim()} data-hm-news-list>
      <div className="hm-rss-news-band__head">
        {!hideTitleRow ? (
          <div className="hm-rss-news-band__title-row">
            <span className="hm-rss-news-band__accent" style={{ background: accent }} aria-hidden />
            <h2 className="hm-rss-news-band__title">{title}</h2>
            {titleHref ? (
              <Link href={titleHref} className="hm-rss-news-band__all" style={{ color: accent }}>
                Tümü <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
        {tabs.length > 1 ? (
          <div className="hm-rss-news-band__tabs" role="tablist" aria-label="Haber kategorileri">
            {tabs.map((tab) => {
              const active = tab.slug === activeSlug;
              return (
                <button
                  key={tab.slug || "__all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`hm-rss-news-band__tab${active ? " hm-rss-news-band__tab--active" : ""}`}
                  style={active ? { background: accent } : undefined}
                  onClick={() => setActiveSlug(tab.slug)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {selectedRssItem && inlinePreview ? (
        <article className="hm-rss-news-band__reader">
          <div className="hm-rss-news-band__reader-top">
            <div>
              <p className="hm-rss-news-band__reader-kicker" style={{ color: accent }}>
                {inlinePreview.categoryName || selectedRssItem.categoryName || "Son dakika"}
              </p>
              <h3 className="hm-rss-news-band__reader-title">{inlinePreview.title}</h3>
              {inlinePreview.publishedAt ? (
                <p className="hm-rss-news-band__reader-date">
                  {new Date(inlinePreview.publishedAt).toLocaleString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="hm-rss-news-band__reader-close"
              onClick={() => setSelectedRssItem(null)}
              aria-label="Haberi kapat"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {inlineImage ? <img src={inlineImage} alt="" className="hm-rss-news-band__reader-img" /> : null}
          {selectedRssPending && !selectedRssPreview ? (
            <p className="hm-rss-news-band__reader-loading">Haber metni yükleniyor…</p>
          ) : null}
          {inlineHtml ? (
            <div
              className="hm-rss-news-band__reader-body"
              dangerouslySetInnerHTML={{ __html: inlineHtml }}
            />
          ) : (
            <p className="hm-rss-news-band__reader-loading">
              RSS kaynağı bu haber için metin paylaşmamış; yalnızca başlık ve görsel gösteriliyor.
            </p>
          )}
        </article>
      ) : null}

      {showGridSkeleton ? (
        <RssBandGridSkeleton count={maxVisibleItems ?? HM_HOME_LATEST_BAND_ITEM_COUNT} />
      ) : error ? (
        <div className="hm-rss-news-band__empty hm-rss-news-band__empty--error">
          Haber listesi yüklenemedi. Sayfayı yenileyin.
        </div>
      ) : filtered.length > 0 ? (
        <div className={`hm-rss-news-band__grid${showGridRefreshing ? " opacity-80 transition-opacity" : ""}`}>
          {filtered.map((item, index) => {
            const catColor = resolveCategoryColor(item, accent, hmCategoryColors);
            const excerpt = newsExcerpt(item);
            const isRss = isRssNewsItem(item);
            const cardContent = (
              <>
                <div className="hm-rss-news-band__media">
                  <HmNewsImage
                    src={resolveNewsItemImageUrl(item)}
                    alt={item.title}
                    className="hm-rss-news-band__img"
                    loading={index < 8 ? "eager" : "lazy"}
                    priority={index < 8}
                  />
                  {item.categoryName ? (
                    <span className="hm-rss-news-band__badge" style={{ background: catColor }}>
                      {item.categoryName}
                    </span>
                  ) : null}
                </div>
                <div className="hm-rss-news-band__body">
                  <h3 className="hm-rss-news-band__headline">{item.title}</h3>
                  {excerpt ? <p className="hm-rss-news-band__excerpt">{excerpt}</p> : null}
                </div>
              </>
            );
            if (isRss) {
              return (
                <Link
                  key={item.id}
                  href={newsHref(item)}
                  className="hm-rss-news-band__card"
                  data-hm-news-row
                >
                  {cardContent}
                </Link>
              );
            }
            return (
              <Link key={item.id} href={newsHref(item)} className="hm-rss-news-band__card" data-hm-news-row>
                {cardContent}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="hm-rss-news-band__empty">
          {activeSlug ? "Bu kategoride henüz haber yok." : "Henüz haber yok."}
        </div>
      )}

      {inlineLoadMore && (canLoadMoreInline || categoriesHref || allNewsHref) ? (
        <div className="hm-rss-news-band__more hm-rss-news-band__more--inline">
          {categoriesHref ? (
            <Link href={categoriesHref} className="hm-rss-news-band__more-link">
              Tüm Kategoriler
            </Link>
          ) : null}
          {canLoadMoreInline ? (
            <button
              type="button"
              className="hm-rss-news-band__more-btn"
              style={{ background: accent }}
              disabled={loadingMore}
              onClick={() => void handleLoadMoreInline()}
            >
              {loadingMore ? "Yükleniyor…" : moreLabel}{" "}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {allNewsHref ? (
            <Link href={allNewsHref} className="hm-rss-news-band__more-link">
              Tüm Haberler
            </Link>
          ) : null}
        </div>
      ) : moreHref ? (
        <div className="hm-rss-news-band__more">
          <Link href={moreHref} className="hm-rss-news-band__more-btn" style={{ background: accent }}>
            {moreLabel} <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
