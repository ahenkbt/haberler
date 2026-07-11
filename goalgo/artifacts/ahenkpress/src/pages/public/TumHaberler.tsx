import { useQuery, useQueries, useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatTrDisplayLabel, decodeHmDisplayText } from "@/lib/hmDisplayText";
import { Link, useLocation } from "wouter";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { ChevronRight, Clock, Rss, Tags } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { hmVitrinAccentHex, resolveHmCategoryColor } from "@/lib/hmVitrinThemeTokens";
import { resolveSadeAccent } from "@/lib/yekpareSadeTheme";
import {
  parseNewsSiteLayoutFromJson,
  normalizeHmVitrinTheme,
} from "@/lib/newsSiteLayout";
import { useHeadlineSliderInteraction } from "@/hooks/useHeadlineSliderInteraction";
import { mapPublicHybridNewsLinkFields } from "@/lib/hybridNewsHref";
import { sortHmCategoriesForNav } from "@/lib/hmCategoryNav";
import { mergeHmStandardNewsCategoryRows } from "@/lib/hmStandardNewsCategories";
import { hmCategorySlug, hmCategorySlugCandidates, humanizeNewsCategorySlug, normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import {
  pickPortalCategoryDisplayName,
  resolveCanonicalPortalCategorySlug,
  resolvePortalCategoryLabel,
  isPortalNonNewsCategory,
} from "@/lib/portalCategorySlug";
import { HmRssNewsBand, type HmRssNewsBandItem, type HmRssCategoryTab } from "@/components/HmRssNewsBand";
import { HmCategoryBoxGrid } from "@/components/HmCategoryBoxLayout";
import {
  CATEGORY_BOX_DISPLAY_TOTAL,
  ensureNewsBoxItems,
  splitCategoryBoxItems,
} from "@/lib/hmCategoryBoxItems";
import { dedupeHmCategoryTabsByCanonicalSlug, dedupeHmCategoryTabsByRepairedLabel } from "@/lib/hmCategoryTabs";
import { passesCategoryContentGuard } from "@/lib/hmCategoryContentGuard";
import { isGlobalNewsCategoryActiveInLayout, isHmGlobalNewsCategorySlug } from "@/lib/hmGlobalNewsCategory";
import { HM_HOME_HEADLINE_SLIDER_LIMIT, resolveHeadlineSliderDisplayCount } from "@/lib/hmHeadlinePool";
import { deferSimilarNewsItems } from "@/lib/hmNewsTitleSimilarity";
import { filterNewsItemsWithCoverImage } from "@/components/HmNewsImage";
import { isKoseArticle } from "@/lib/isKoseArticle";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { Badge } from "@/components/ui/badge";
import { HM_CATEGORIES_NEWS_LOADING_LABEL } from "@/lib/hmNewsPlaceholder";

const NEWS_POOL_LIMIT = 400;
const LIST_PAGE_SIZE = 24;
const CATEGORY_FETCH_LIMIT = 80;
const CATEGORY_BOX_ITEM_LIMIT = 12;
/** Bir kategori kutusu ancak kendi havuzundan en az bir öğe doldurabiliyorsa gösterilir. */
const CATEGORY_BOX_MIN_ITEMS = 1;
const TOPIC_LINK_COUNT = 18;

type TumHaberlerView = "index" | "list";

type CombinedCategoryRow = {
  label: string;
  slug: string;
  sortOrder?: number | null;
  source: "site" | "rss" | "hybrid";
  count: number;
};

function mapNewsToBandItem(item: Record<string, unknown>): HmRssNewsBandItem {
  const cat = item.category as { name?: string; slug?: string } | null | undefined;
  const { id, slug, source, href } = mapPublicHybridNewsLinkFields(item);
  return {
    id,
    slug,
    title: String(item.title ?? ""),
    spot: (item.spot as string | null) ?? (item.summary as string | null) ?? null,
    imageUrl: (item.imageUrl as string | null) ?? null,
    categoryName: (cat?.name as string | null) ?? (item.categoryName as string | null) ?? null,
    categorySlug: (cat?.slug as string | null) ?? (item.categorySlug as string | null) ?? null,
    categoryColor: (item.categoryColor as string | null) ?? null,
    createdAt: (item.publishedAt as string | null) ?? (item.createdAt as string | null) ?? null,
    isBreaking: (item.isBreaking as boolean | null) ?? null,
    href,
    source,
  };
}

/** Köşe yazısı / makale — haber akışına dahil edilmez. */
function isHaberBandItem(item: HmRssNewsBandItem): boolean {
  return !isKoseArticle({
    hmSyncKind: item.hmSyncKind ?? null,
    categorySlug: item.categorySlug ?? null,
    rssSourceUrl: item.rssSourceUrl ?? null,
  });
}

function filterHaberBandItems(items: readonly HmRssNewsBandItem[]): HmRssNewsBandItem[] {
  return items.filter(isHaberBandItem);
}

function categoryHref(slug: string, h: (path: string) => string, siteId?: number | null): string {
  const qs = siteId != null ? `?siteId=${encodeURIComponent(String(siteId))}` : "";
  return h(`/kategori/${encodeURIComponent(slug)}${qs}`);
}

function newsHref(item: HmRssNewsBandItem, h: (path: string) => string): string {
  const href = String(item.href ?? "").trim();
  if (href.startsWith("/")) return h(href);
  const slug = String(item.slug ?? "").trim();
  if (slug) return h(`/haber/${encodeURIComponent(slug)}`);
  return h(`/haber/${encodeURIComponent(String(item.id ?? ""))}`);
}

function itemCategorySlug(item: HmRssNewsBandItem): string {
  return hmCategorySlug(item.categorySlug, item.categoryName, item.feedLabel);
}

function itemCategorySlugs(item: HmRssNewsBandItem): string[] {
  const slug = normalizeNewsCategorySlug(item.categorySlug);
  if (slug) return [slug];
  return hmCategorySlugCandidates(item.categorySlug, item.categoryName, item.feedLabel);
}

function itemCanonicalCategorySlug(item: HmRssNewsBandItem, knownCanonicalSlugs: ReadonlySet<string>, siteSlugPrefixes: readonly string[]): string {
  for (const candidate of itemCategorySlugs(item)) {
    const canonical = resolveCanonicalPortalCategorySlug(candidate, knownCanonicalSlugs, siteSlugPrefixes);
    if (canonical) return canonical;
  }
  return resolveCanonicalPortalCategorySlug(itemCategorySlug(item), knownCanonicalSlugs, siteSlugPrefixes);
}

function itemCanonicalCategorySlugs(item: HmRssNewsBandItem, knownCanonicalSlugs: ReadonlySet<string>, siteSlugPrefixes: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const candidate of itemCategorySlugs(item)) {
    const canonical = resolveCanonicalPortalCategorySlug(candidate, knownCanonicalSlugs, siteSlugPrefixes);
    if (canonical && !seen.has(canonical)) seen.add(canonical);
  }
  return Array.from(seen);
}

function itemMatchesCategory(item: HmRssNewsBandItem, slug: string, knownCanonicalSlugs: ReadonlySet<string>, siteSlugPrefixes: readonly string[]): boolean {
  const want = normalizeNewsCategorySlug(slug);
  if (!want) return true;
  return itemCanonicalCategorySlugs(item, knownCanonicalSlugs, siteSlugPrefixes).includes(want);
}

function formatCategoryDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function imageSrc(url: string | null | undefined): string {
  const u = String(url ?? "").trim();
  if (!u) return "";
  return resolveClientMediaSrc(u) || u;
}

function categoryColor(slug: string, accent: string, hmCategoryColors?: Record<string, string> | null): string {
  return resolveHmCategoryColor(slug, hmCategoryColors ?? null, accent);
}

function CategoryNewsCard({
  item,
  accent,
  h,
  large = false,
  hmCategoryColors,
  className = "",
  fillColumn = false,
  aspect = "main",
}: {
  item: HmRssNewsBandItem;
  accent: string;
  h: (path: string) => string;
  large?: boolean;
  hmCategoryColors?: Record<string, string> | null;
  className?: string;
  /** Sol/sağ sütun: orta slider yüksekliğine uzanır */
  fillColumn?: boolean;
  /** large kart görsel oranı */
  aspect?: "main" | "side";
}) {
  const slug = itemCategorySlug(item);
  const color = categoryColor(slug, accent, hmCategoryColors);
  const img = imageSrc(item.imageUrl);
  if (large) {
    const heightClass = fillColumn
      ? "min-h-[260px] lg:min-h-full lg:h-full"
      : aspect === "side"
        ? "min-h-[260px] lg:min-h-[360px]"
        : "min-h-[320px] lg:min-h-[440px]";
    return (
      <Link
        href={newsHref(item, h)}
        className={`group relative block overflow-hidden rounded-2xl border border-slate-100 bg-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${heightClass} ${className}`}
      >
        {img ? (
          <img
            src={img}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-slate-800 text-xs font-black uppercase text-slate-400">
            Haber
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <span className="mb-2 inline-flex rounded px-2 py-0.5 text-[10px] font-black uppercase text-white" style={{ background: color }}>
            {item.categoryName || humanizeNewsCategorySlug(slug)}
          </span>
          <h3 className="line-clamp-3 text-xl font-black leading-tight text-white drop-shadow-md">{item.title}</h3>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-white/70">
            <Clock className="h-3 w-3" />
            {formatCategoryDate(item.createdAt) || (item.source === "rss" ? "RSS" : "Haber")}
          </p>
        </div>
      </Link>
    );
  }
  return (
    <Link
      href={newsHref(item, h)}
      className={`group flex min-h-[118px] gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <div className="relative h-[92px] w-[116px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {img ? (
          <img src={img} alt={item.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-slate-100 text-xs font-black uppercase text-slate-400">Haber</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="text-[10px] font-black uppercase" style={{ color }}>
          {item.categoryName || humanizeNewsCategorySlug(slug)}
        </span>
        <h3 className="mt-1 line-clamp-3 text-sm font-bold leading-snug text-slate-900 group-hover:text-[var(--hm-accent,#e61e25)]">
          {item.title}
        </h3>
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          <Clock className="h-3 w-3" />
          {formatCategoryDate(item.createdAt) || (item.source === "rss" ? "RSS" : "Haber")}
        </p>
      </div>
    </Link>
  );
}

function MagazineHeadlineCompactCard({
  item,
  accent,
  h,
  hmCategoryColors,
}: {
  item: HmRssNewsBandItem;
  accent: string;
  h: (path: string) => string;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const slug = itemCategorySlug(item);
  const color = categoryColor(slug, accent, hmCategoryColors);
  const img = imageSrc(item.imageUrl);
  return (
    <Link
      href={newsHref(item, h)}
      className="group grid min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] min-h-[104px] overflow-hidden bg-slate-100">
        {img ? (
          <img src={img} alt={item.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-slate-100 text-[10px] font-black uppercase text-slate-400">Haber</div>
        )}
        <span className="absolute left-2 top-2 rounded px-2 py-0.5 text-[9px] font-black uppercase text-white" style={{ background: color }}>
          {item.categoryName || humanizeNewsCategorySlug(slug)}
        </span>
      </div>
      <div className="grid min-w-0 content-between gap-2 p-3">
        <h3 className="line-clamp-3 text-sm font-black leading-snug text-slate-900 group-hover:text-[var(--hm-accent,#e61e25)]">
          {item.title}
        </h3>
        <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          <Clock className="h-3 w-3" />
          {formatCategoryDate(item.createdAt) || (item.source === "rss" ? "RSS" : "Haber")}
        </p>
      </div>
    </Link>
  );
}

function MagazineHeadlineListItem({
  item,
  accent,
  h,
  hmCategoryColors,
}: {
  item: HmRssNewsBandItem;
  accent: string;
  h: (path: string) => string;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const slug = itemCategorySlug(item);
  const color = categoryColor(slug, accent, hmCategoryColors);
  return (
    <Link
      href={newsHref(item, h)}
      className="group block px-3 py-3 transition hover:bg-slate-50"
    >
      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color }}>
        {item.categoryName || item.feedLabel || humanizeNewsCategorySlug(slug)}
      </p>
      <h3 className="mt-1 line-clamp-2 text-sm font-black leading-snug text-slate-900 group-hover:text-[var(--hm-accent,#e61e25)]">
        {item.title}
      </h3>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
        <Clock className="h-3 w-3" />
        {formatCategoryDate(item.createdAt) || (item.source === "rss" ? "RSS" : "Haber")}
      </p>
    </Link>
  );
}

function MagazineHeadlineManset({
  items,
  categoryTabs,
  accent,
  h,
  hmCategoryColors,
  knownCanonicalSlugs,
  siteSlugPrefixes,
}: {
  items: HmRssNewsBandItem[];
  categoryTabs: HmRssCategoryTab[];
  accent: string;
  h: (path: string) => string;
  hmCategoryColors?: Record<string, string> | null;
  knownCanonicalSlugs: ReadonlySet<string>;
  siteSlugPrefixes: readonly string[];
}) {
  const [activeSlug, setActiveSlug] = useState("");
  const filtered = useMemo(
    () => (!activeSlug ? items : items.filter((item) => itemMatchesCategory(item, activeSlug, knownCanonicalSlugs, siteSlugPrefixes))),
    [activeSlug, items, knownCanonicalSlugs, siteSlugPrefixes],
  );
  const pool = filtered.length > 0 ? filtered : items;
  const poolWithCover = filterNewsItemsWithCoverImage(pool);
  const headlinePool = poolWithCover.length > 0 ? poolWithCover : [];
  const leftCard = headlinePool.length > 1 ? headlinePool[0] : null;
  const sliderPool = headlinePool.length > 1 ? headlinePool.slice(1) : headlinePool;
  const sliderItems = sliderPool.slice(
    0,
    resolveHeadlineSliderDisplayCount(sliderPool.length, HM_HOME_HEADLINE_SLIDER_LIMIT),
  );
  const slider = useHeadlineSliderInteraction(sliderItems.length);
  const slideIndex = slider.index;
  useEffect(() => slider.setIndex(0), [activeSlug, filtered.length, slider.setIndex]);
  if (!headlinePool.length) return null;
  const activeSlide = sliderItems[slideIndex % Math.max(sliderItems.length, 1)];
  const reserved = new Set([leftCard, activeSlide].filter(Boolean).map((item) => `${item?.source ?? "db"}:${item?.id ?? item?.slug ?? item?.title}`));
  const rightCards = headlinePool
    .filter((item) => !reserved.has(`${item.source ?? "db"}:${item.id ?? item.slug ?? item.title}`))
    .slice(0, 4);
  const cols =
    leftCard && rightCards.length > 0
      ? "xl:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)_minmax(360px,0.9fr)]"
      : rightCards.length > 0
        ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]"
        : leftCard
          ? "lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]"
          : "";
  return (
    <section className="hm-vitrin-card overflow-hidden rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1 rounded-full" style={{ background: accent }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
              Manşet
            </p>
            <h2 className="text-xl font-black text-slate-950">Tüm haberlerden öne çıkanlar</h2>
          </div>
        </div>
        {categoryTabs.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Manşet kategorileri">
            {categoryTabs.map((tab) => {
              const active = normalizeNewsCategorySlug(tab.slug) === activeSlug;
              return (
                <button
                  key={tab.slug || "__all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSlug(normalizeNewsCategorySlug(tab.slug))}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                    active ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                  }`}
                  style={active ? { background: accent } : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {activeSlide ? (
        <div className={`grid grid-cols-1 items-stretch gap-3 ${cols}`}>
          {leftCard ? (
            <div className="min-w-0 lg:flex lg:flex-col">
              <CategoryNewsCard
                item={leftCard}
                accent={accent}
                h={h}
                large
                aspect="side"
                fillColumn
                hmCategoryColors={hmCategoryColors}
                className="lg:flex-1"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex flex-col">
            <div style={slider.swipeStyle} {...slider.bind}>
              <CategoryNewsCard item={activeSlide} accent={accent} h={h} large aspect="main" hmCategoryColors={hmCategoryColors} />
            </div>
            {sliderItems.length > 1 ? (
              <div className="mt-2 flex items-center gap-2 overflow-x-auto rounded-xl bg-slate-950 px-3 py-2" style={{ scrollbarWidth: "none" }}>
                {sliderItems.map((item, index) => (
                  <button
                    key={`${item.source ?? "db"}:${item.id}:${index}`}
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      slider.setIndex(index);
                    }}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black transition ${
                      index === slideIndex ? "bg-white text-slate-950" : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                    aria-label={`${index + 1}. haber`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {rightCards.length > 0 ? (
            <div className="grid min-w-0 grid-cols-2 gap-3 lg:auto-rows-fr">
              {rightCards.map((item) => (
                <MagazineHeadlineCompactCard key={`${item.source ?? "db"}:${item.id}`} item={item} accent={accent} h={h} hmCategoryColors={hmCategoryColors} />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          Bu kategori filtresi için manşet haberi bulunamadı.
        </div>
      )}
    </section>
  );
}

function CategoryDirectoryCard({
  category,
  items,
  accent,
  h,
  siteId,
  hmCategoryColors,
}: {
  category: CombinedCategoryRow;
  items: HmRssNewsBandItem[];
  accent: string;
  h: (path: string) => string;
  siteId?: number | null;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const color = categoryColor(category.slug, accent, hmCategoryColors);
  const imageItems = filterNewsItemsWithCoverImage(items);
  const filledItems = ensureNewsBoxItems(imageItems, imageItems, CATEGORY_BOX_DISPLAY_TOTAL);
  const { lead, listItems } = splitCategoryBoxItems(filledItems);
  return (
    <article
      className="hm-category-directory-card rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow"
      data-hm-cat-slug={category.slug}
      style={{ ["--hm-cat-box-accent" as string]: color }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={categoryHref(category.slug, h, siteId)} className="font-black uppercase tracking-wide text-slate-950 hover:text-[var(--hm-accent,#e61e25)]">
            {category.label}
          </Link>
        </div>
        <Link
          href={categoryHref(category.slug, h, siteId)}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-[var(--hm-accent,#e61e25)]"
        >
          tümü
        </Link>
      </div>
      {lead ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <HmCategoryBoxGrid
            lead={lead}
            listItems={listItems}
            color={color}
            categorySlug={category.slug}
            getHref={(item) => newsHref(item as HmRssNewsBandItem, h)}
          />
        </div>
      ) : null}
    </article>
  );
}

export default function TumHaberler({ view = "index" }: { view?: TumHaberlerView }) {
  const h = useHmPublicHref();
  const hmCtx = useHmPublicLinkContextOptional();
  const [loc, navigate] = useLocation();
  const { data: settings } = useGetSiteSettings();
  const isListView = view === "list";

  const siteIdFromUrl = useMemo(() => {
    const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());
    const n = parseInt(String(q.get("siteId") ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [loc]);
  const siteId = hmCtx?.siteId ?? siteIdFromUrl;
  const isPortalPage = hmCtx == null;
  const siteSlugPrefixes = useMemo(() => {
    const slug = String(hmCtx?.slug ?? "").trim();
    return slug ? [slug] : [];
  }, [hmCtx?.slug]);
  const portalLayoutPrefs = useMemo(() => {
    if (hmCtx != null) return null;
    const raw = settings?.newsLayoutJson ?? null;
    if (!raw) return null;
    return parseNewsSiteLayoutFromJson(raw, null);
  }, [hmCtx, settings?.newsLayoutJson]);
  const layoutPrefs = hmCtx?.layoutPrefs ?? portalLayoutPrefs;
  const isCorporate = layoutPrefs?.hmVitrinTheme === "corporate";
  /** Portal — `hmRssNewsBand.css` yalnızca `[data-hm-vitrin-theme]` altında çalışır. */
  const vitrinThemeAttr = (() => {
    const theme = normalizeHmVitrinTheme(layoutPrefs?.hmVitrinTheme);
    if (theme === "default" || theme === "news") return "news";
    return theme;
  })();

  const hiddenCategorySlugs = useMemo(
    () =>
      new Set(
        (layoutPrefs?.hmNavHiddenCategorySlugs ?? [])
          .map((s) => normalizeNewsCategorySlug(s))
          .filter(Boolean),
      ),
    [layoutPrefs?.hmNavHiddenCategorySlugs],
  );

  const urlSearch = useMemo(() => {
    const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());
    return String(q.get("q") ?? "").trim();
  }, [loc]);

  const [search, setSearch] = useState(urlSearch);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const sitePart =
    siteId != null
      ? `&siteId=${encodeURIComponent(String(siteId))}`
      : `&siteScope=${encodeURIComponent("portal")}`;

  const accent = useMemo(() => {
    const fromLp = (layoutPrefs?.hmPrimaryColor?.trim() ?? "").length >= 3 ? layoutPrefs!.hmPrimaryColor!.trim() : "";
    if (fromLp) return fromLp;
    const locked = hmVitrinAccentHex(layoutPrefs?.hmVitrinTheme ?? "default");
    if (locked) return locked;
    return resolveSadeAccent(settings?.primaryColor);
  }, [layoutPrefs, settings?.primaryColor]);

  const hmCat = layoutPrefs?.hmCategoryColors ?? null;
  const pageTitle = isListView ? "Son Dakika" : "Tüm Haberler";
  const pageDescription = isListView
    ? "Son dakika ve tüm haber akışı"
    : "Kategori manşetleri ve haber kategorileri";

  useEffect(() => {
    if (!hmCtx) return;
    applyHmNewsSiteHomeMeta({
      siteName: hmCtx.displayName,
      browserTitle: `${pageTitle} · ${hmCtx.displayName}`,
      description: hmCtx.description || `${pageDescription} — ${hmCtx.displayName}`,
      canonicalPath: `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hmCtx.slug)}/${isListView ? "sondakika" : "tum-haberler"}`,
      canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
      imageUrl: hmCtx.layoutPrefs.logoUrl,
      logoUrl: hmCtx.layoutPrefs.logoUrl,
      faviconUrl: hmCtx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [hmCtx, isListView, pageDescription, pageTitle]);

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", siteId ?? "portal"],
    queryFn: () =>
      siteId != null
        ? (apiRequest(`/api/categories?siteId=${encodeURIComponent(String(siteId))}`) as Promise<any[]>)
        : apiRequest("/api/categories"),
    staleTime: 10 * 60 * 1000,
    enabled: !search || !isListView,
  });

  const { data: poolData, isLoading: poolLoading } = useQuery<{ items: HmRssNewsBandItem[] }>({
    queryKey: ["/api/news", "tum-haberler-pool", siteId ?? "all"],
    queryFn: async () => {
      const raw = await apiRequest(
        `/api/news?limit=${NEWS_POOL_LIMIT}&offset=0&status=published${sitePart}`,
      );
      const rows = (raw as { items?: unknown[] })?.items ?? [];
      return { items: filterHaberBandItems(rows.map((n) => mapNewsToBandItem(n as Record<string, unknown>))) };
    },
    staleTime: 60 * 1000,
    enabled: !isListView && !search.trim(),
  });

  const {
    data: listPages,
    isLoading: listInfiniteLoading,
    isFetchingNextPage: listFetchingMore,
    hasNextPage: listHasMore,
    fetchNextPage: fetchNextListPage,
    isError: listInfiniteError,
  } = useInfiniteQuery({
    queryKey: ["/api/news", "tum-haberler-infinite", siteId ?? "all", LIST_PAGE_SIZE],
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === "number" ? pageParam : 0;
      const raw = (await apiRequest(
        `/api/news?limit=${LIST_PAGE_SIZE}&offset=${offset}&status=published&includeTotal=1${sitePart}`,
      )) as { items?: unknown[]; total?: number };
      const rows = raw?.items ?? [];
      return {
        items: filterHaberBandItems(rows.map((n) => mapNewsToBandItem(n as Record<string, unknown>))),
        total: typeof raw?.total === "number" ? raw.total : rows.length,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
    enabled: isListView && !search.trim(),
    staleTime: 60 * 1000,
  });

  const {
    data: searchPages,
    isLoading: searchLoading,
    isFetchingNextPage: searchFetchingMore,
    hasNextPage: searchHasMore,
    fetchNextPage: fetchNextSearchPage,
  } = useInfiniteQuery({
    queryKey: ["/api/news", "tum-haberler-search-infinite", search, siteId ?? "all", LIST_PAGE_SIZE],
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === "number" ? pageParam : 0;
      const raw = (await apiRequest(
        `/api/news?limit=${LIST_PAGE_SIZE}&offset=${offset}&status=published&includeTotal=1&q=${encodeURIComponent(search)}${sitePart}`,
      )) as { items?: unknown[]; total?: number };
      const rows = raw?.items ?? [];
      return {
        items: filterHaberBandItems(rows.map((n) => mapNewsToBandItem(n as Record<string, unknown>))),
        total: typeof raw?.total === "number" ? raw.total : rows.length,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
    enabled: isListView && !!search.trim(),
    staleTime: 60 * 1000,
  });

  const poolItems = useMemo(() => {
    const rows = (poolData as { items?: HmRssNewsBandItem[] })?.items ?? [];
    return deferSimilarNewsItems(rows);
  }, [poolData]);

  const flattenInfinitePages = useCallback(
    (pages: Array<{ items: HmRssNewsBandItem[] }> | undefined): HmRssNewsBandItem[] => {
      const seen = new Set<string>();
      const out: HmRssNewsBandItem[] = [];
      for (const page of pages ?? []) {
        for (const item of page.items) {
          const key = String(item.slug ?? item.id ?? item.title ?? "").trim();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          out.push(item);
        }
      }
      return deferSimilarNewsItems(out);
    },
    [],
  );

  const listItems = useMemo(
    () => flattenInfinitePages(listPages?.pages),
    [flattenInfinitePages, listPages?.pages],
  );

  const searchItems = useMemo(
    () => flattenInfinitePages(searchPages?.pages),
    [flattenInfinitePages, searchPages?.pages],
  );

  const searchTotal: number = searchPages?.pages[0]?.total ?? searchItems.length;
  const listTotal: number = listPages?.pages[0]?.total ?? listItems.length;

  const infiniteScrollActive = isListView && (search.trim() ? searchHasMore : listHasMore);
  const fetchMore = search.trim() ? fetchNextSearchPage : fetchNextListPage;
  const fetchingMore = search.trim() ? searchFetchingMore : listFetchingMore;

  useEffect(() => {
    if (!isListView || !infiniteScrollActive) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !fetchingMore) {
          void fetchMore();
        }
      },
      { rootMargin: "320px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isListView, infiniteScrollActive, fetchingMore, fetchMore]);

  const activatedCategorySlugs = useMemo(() => {
    const slugs = (layoutPrefs?.hmActivatedCategorySlugs ?? [])
      .map((s) => normalizeNewsCategorySlug(s))
      .filter(Boolean);
    return slugs.filter((slug) => !hiddenCategorySlugs.has(slug));
  }, [hiddenCategorySlugs, layoutPrefs?.hmActivatedCategorySlugs]);

  const knownCanonicalSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const cat of categories as any[]) {
      const slug = normalizeNewsCategorySlug(cat?.slug);
      if (slug) slugs.add(slug);
    }
    for (const slug of activatedCategorySlugs) {
      if (slug) slugs.add(slug);
    }
    return slugs;
  }, [activatedCategorySlugs, categories]);

  const categoryLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories as any[]) {
      const slug = normalizeNewsCategorySlug(cat?.slug);
      if (!slug || (isPortalPage && isPortalNonNewsCategory(slug, cat?.name))) continue;
      const label =
        decodeHmDisplayText(cat?.name ?? "").trim() ||
        humanizeNewsCategorySlug(slug);
      map.set(slug, pickPortalCategoryDisplayName(label, slug));
    }
    for (const slug of layoutPrefs?.hmActivatedCategorySlugs ?? []) {
      const normalized = normalizeNewsCategorySlug(slug);
      if (!normalized || map.has(normalized)) continue;
      map.set(normalized, pickPortalCategoryDisplayName(humanizeNewsCategorySlug(normalized), normalized));
    }
    return map;
  }, [categories, isPortalPage, layoutPrefs?.hmActivatedCategorySlugs]);

  const categoryTabs = useMemo((): HmRssCategoryTab[] => {
    const bySlug = new Map<string, HmRssCategoryTab & { sortOrder?: number | null }>();
    const rows = (categories as any[])
      .filter((cat: any) => {
        const slug = normalizeNewsCategorySlug(cat.slug);
        const label = String(cat.name ?? cat.slug ?? "").trim();
        return slug && !hiddenCategorySlugs.has(slug) && !(isPortalPage && isPortalNonNewsCategory(slug, label));
      })
      .map((cat: any) => ({
        label: (String(cat.name ?? cat.slug ?? "").trim() || String(cat.slug ?? "")).toUpperCase(),
        slug: normalizeNewsCategorySlug(cat.slug),
        sortOrder: typeof cat.sortOrder === "number" ? cat.sortOrder : null,
      }));
    const sorted = sortHmCategoriesForNav(rows, layoutPrefs?.hmCategorySortSlugs);
    for (const c of sorted) {
      if (c.slug) bySlug.set(c.slug, { label: c.label, slug: c.slug, sortOrder: c.sortOrder });
    }
    for (const slug of layoutPrefs?.hmActivatedCategorySlugs ?? []) {
      const normalized = normalizeNewsCategorySlug(slug);
      if (!normalized || bySlug.has(normalized) || hiddenCategorySlugs.has(normalized)) continue;
      if (isPortalPage && isPortalNonNewsCategory(normalized, slug)) continue;
      const label = categoryLabelBySlug.get(normalized) ?? humanizeNewsCategorySlug(normalized);
      bySlug.set(normalized, { label: formatTrDisplayLabel(label), slug: normalized, sortOrder: null });
    }
    let tabRows = Array.from(bySlug.values());
    if (!isCorporate) {
      tabRows = mergeHmStandardNewsCategoryRows(tabRows, { hiddenSlugs: hiddenCategorySlugs });
    }
    const rssAwareRows = sortHmCategoriesForNav(tabRows, layoutPrefs?.hmCategorySortSlugs);
    const rawTabs = [{ label: "TÜMÜ", slug: "" }, ...rssAwareRows.map((c) => ({ label: formatTrDisplayLabel(c.label), slug: c.slug }))];
    const slugDeduped = dedupeHmCategoryTabsByCanonicalSlug(rawTabs, knownCanonicalSlugs, siteSlugPrefixes);
    return dedupeHmCategoryTabsByRepairedLabel(slugDeduped);
  }, [categories, categoryLabelBySlug, hiddenCategorySlugs, isCorporate, isPortalPage, knownCanonicalSlugs, layoutPrefs?.hmActivatedCategorySlugs, layoutPrefs?.hmCategorySortSlugs, siteSlugPrefixes]);

  const combinedCategories = useMemo((): CombinedCategoryRow[] => {
    const bySlug = new Map<string, CombinedCategoryRow>();
    const ensure = (slugRaw: unknown, labelRaw: unknown, source: "site" | "rss", sortOrder?: number | null) => {
      const rawSlug = normalizeNewsCategorySlug(slugRaw) || normalizeNewsCategorySlug(labelRaw);
      const slug = resolveCanonicalPortalCategorySlug(rawSlug, knownCanonicalSlugs, siteSlugPrefixes) || rawSlug;
      if (!slug || hiddenCategorySlugs.has(slug)) return null;
      if (isPortalPage && isPortalNonNewsCategory(slug, labelRaw)) return null;
      const label = resolvePortalCategoryLabel(
        slug,
        String(labelRaw ?? "").trim() || humanizeNewsCategorySlug(slug),
        categoryLabelBySlug,
      );
      const prev = bySlug.get(slug);
      if (prev) {
        prev.source = prev.source === source ? prev.source : "hybrid";
        if (source === "site" && label) prev.label = label;
        if (sortOrder != null && prev.sortOrder == null) prev.sortOrder = sortOrder;
        return prev;
      }
      const row: CombinedCategoryRow = { label, slug, source, sortOrder: sortOrder ?? null, count: 0 };
      bySlug.set(slug, row);
      return row;
    };

    for (const cat of categories as any[]) {
      ensure(cat?.slug, cat?.name ?? cat?.slug, "site", typeof cat?.sortOrder === "number" ? cat.sortOrder : null);
    }
    for (const slug of layoutPrefs?.hmActivatedCategorySlugs ?? []) {
      ensure(slug, categoryLabelBySlug.get(normalizeNewsCategorySlug(slug) ?? "") ?? humanizeNewsCategorySlug(slug), "site", null);
    }
    if (!isCorporate) {
      for (const item of poolItems) {
        for (const slug of itemCanonicalCategorySlugs(item, knownCanonicalSlugs, siteSlugPrefixes)) {
          if (!slug) continue;
          const row = ensure(
            slug,
            item.categoryName ?? slug,
            "site",
            null,
          );
          if (row) row.count += 1;
        }
      }
    }

    let combinedRows = Array.from(bySlug.values());
    if (siteId != null && activatedCategorySlugs.length > 0) {
      const activated = new Set(activatedCategorySlugs);
      combinedRows = combinedRows.filter((row) => activated.has(row.slug));
    }
    if (!isGlobalNewsCategoryActiveInLayout(layoutPrefs?.hmActivatedCategorySlugs)) {
      combinedRows = combinedRows.filter((row) => !isHmGlobalNewsCategorySlug(row.slug));
    }
    if (!isCorporate) {
      combinedRows = mergeHmStandardNewsCategoryRows(combinedRows, { hiddenSlugs: hiddenCategorySlugs });
    }
    const sorted = sortHmCategoriesForNav(combinedRows, layoutPrefs?.hmCategorySortSlugs).map((row) => ({
      ...row,
      label: formatTrDisplayLabel(row.label),
    }));
    const dedupedTabs = dedupeHmCategoryTabsByRepairedLabel(
      sorted.map((row) => ({ label: row.label, slug: row.slug })),
    );
    const rowBySlug = new Map(sorted.map((row) => [row.slug, row]));
    return dedupedTabs
      .filter((tab) => tab.slug)
      .map((tab) => {
        const row = rowBySlug.get(tab.slug);
        return row ? { ...row, label: tab.label } : { label: tab.label, slug: tab.slug, source: "site" as const, sortOrder: null, count: 0 };
      });
  }, [activatedCategorySlugs, categories, categoryLabelBySlug, hiddenCategorySlugs, isCorporate, isPortalPage, knownCanonicalSlugs, layoutPrefs?.hmActivatedCategorySlugs, layoutPrefs?.hmCategorySortSlugs, poolItems, siteId, siteSlugPrefixes]);

  const categorySlugsForBoxFetch = useMemo(
    () => combinedCategories.map((category) => category.slug).filter(Boolean),
    [combinedCategories],
  );

  const categoryBoxQueries = useQueries({
    queries: categorySlugsForBoxFetch.map((slug) => ({
      queryKey: ["/api/news", "tum-haberler-cat-box", siteId ?? "portal", slug, CATEGORY_FETCH_LIMIT],
      queryFn: async () => {
        const raw = await apiRequest(
          `/api/news?limit=${CATEGORY_FETCH_LIMIT}&offset=0&status=published&categorySlug=${encodeURIComponent(slug)}${sitePart}`,
        );
        const rows = (raw as { items?: unknown[] })?.items ?? [];
        return deferSimilarNewsItems(rows.map((n) => mapNewsToBandItem(n as Record<string, unknown>)));
      },
      staleTime: 60 * 1000,
      enabled: !search && !isListView && Boolean(slug),
    })),
  });

  const categoryItemsBySlug = useMemo(() => {
    const bySlug = new Map<string, HmRssNewsBandItem[]>();
    categorySlugsForBoxFetch.forEach((slug, index) => {
      const fetched = categoryBoxQueries[index]?.data;
      const matchedPool = poolItems.filter((item) =>
        itemMatchesCategory(item, slug, knownCanonicalSlugs, siteSlugPrefixes),
      );
      const primary = Array.isArray(fetched) && fetched.length > 0 ? fetched : matchedPool;
      const guarded = primary.filter((item) => passesCategoryContentGuard(item, slug));
      const filled = ensureNewsBoxItems(guarded, guarded, CATEGORY_BOX_DISPLAY_TOTAL);
      if (filled.length > 0) bySlug.set(slug, filled.slice(0, CATEGORY_BOX_ITEM_LIMIT));
    });
    return bySlug;
  }, [categoryBoxQueries, categorySlugsForBoxFetch, knownCanonicalSlugs, poolItems, siteSlugPrefixes]);

  const categoryCountsBySlug = useMemo(() => {
    const counts = new Map<string, number>();
    categorySlugsForBoxFetch.forEach((slug, index) => {
      const fetched = categoryBoxQueries[index]?.data;
      if (Array.isArray(fetched) && fetched.length > 0) {
        counts.set(slug, fetched.filter((item) => passesCategoryContentGuard(item, slug)).length);
        return;
      }
      const fromPool = poolItems.filter(
        (item) =>
          itemMatchesCategory(item, slug, knownCanonicalSlugs, siteSlugPrefixes) &&
          passesCategoryContentGuard(item, slug),
      ).length;
      if (fromPool > 0) counts.set(slug, fromPool);
    });
    return counts;
  }, [categoryBoxQueries, categorySlugsForBoxFetch, knownCanonicalSlugs, poolItems, siteSlugPrefixes]);

  const categoriesWithItems = useMemo(
    () =>
      combinedCategories.filter((category) => {
        const boxCount = categoryItemsBySlug.get(category.slug)?.length ?? 0;
        if (boxCount >= CATEGORY_BOX_MIN_ITEMS) return true;
        return (categoryCountsBySlug.get(category.slug) ?? 0) >= CATEGORY_BOX_MIN_ITEMS;
      }),
    [categoryItemsBySlug, categoryCountsBySlug, combinedCategories],
  );

  const categoryBoxesPending =
    !search &&
    !isListView &&
    categorySlugsForBoxFetch.length > 0 &&
    categoryBoxQueries.some((query) => query.isPending || query.isFetching);

  const topicLinks = useMemo(() => {
    return combinedCategories.slice(0, TOPIC_LINK_COUNT).map((cat) => ({ slug: cat.slug, label: cat.label }));
  }, [combinedCategories]);

  const clearSearch = () => {
    const basePath = loc.split("?")[0] || h(isListView ? "/sondakika" : "/tum-haberler");
    navigate(basePath);
  };

  const pageBg = hmCtx ? "var(--hm-page-bg, #ffffff)" : "#ffffff";
  const contentMax = isCorporate ? "max-w-[1280px]" : "max-w-screen-xl";
  const listPagePadding = "pt-2 pb-8";

  return (
    <div className="min-h-screen" data-hm-vitrin-theme={vitrinThemeAttr} style={{ background: pageBg }}>
      <main className={`hm-news-list-page mx-auto px-4 ${listPagePadding} ${contentMax} w-full`}>
        {isListView ? (
        search ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">Arama sonuçları:</span>
              <Badge variant="outline">{search}</Badge>
              <button
                type="button"
                onClick={clearSearch}
                className="text-xs text-red-600 hover:underline"
              >
                Temizle
              </button>
            </div>
            <HmRssNewsBand
              title="Arama"
              items={searchItems}
              accent={accent}
              hmCategoryColors={hmCat}
              pending={searchLoading}
              hideTitleRow
              gridColumns={4}
              newsOnly
              className="hm-tum-haberler-band"
            />
            {searchFetchingMore ? (
              <p className="mt-6 text-center text-sm text-slate-400">Daha fazla haber yükleniyor…</p>
            ) : null}
            {!searchHasMore && searchItems.length > 0 ? (
              <p className="mt-6 text-center text-sm text-slate-400">Tüm arama sonuçları listelendi.</p>
            ) : null}
            {searchTotal > 0 ? (
              <p className="mt-2 text-center text-sm text-slate-400">Toplam {searchTotal} haber</p>
            ) : null}
            <div ref={loadMoreRef} className="h-4 w-full" aria-hidden />
          </>
        ) : (
          <>
          <HmRssNewsBand
            title={pageTitle}
            items={listItems}
            tabSourceItems={listItems}
            categoryTabs={categoryTabs}
            accent={accent}
            hmCategoryColors={hmCat}
            pending={listInfiniteLoading}
            error={listInfiniteError}
            hideTitleRow
            gridColumns={4}
            newsOnly
            categoryQuerySiteId={siteId}
            categoryFetchLimit={CATEGORY_FETCH_LIMIT}
            className="hm-tum-haberler-band"
          />
          {listFetchingMore ? (
            <p className="mt-6 text-center text-sm text-slate-400">Daha fazla haber yükleniyor…</p>
          ) : null}
          {!listHasMore && listItems.length > 0 ? (
            <p className="mt-6 text-center text-sm text-slate-400">Tüm haberler listelendi.</p>
          ) : null}
          {listTotal > 0 ? (
            <p className="mt-2 text-center text-sm text-slate-400">{listItems.length} / {listTotal} haber</p>
          ) : null}
          <div ref={loadMoreRef} className="h-4 w-full" aria-hidden />
          </>
        )
        ) : (
          <div className="space-y-8">
            {poolLoading ? (
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                  <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <MagazineHeadlineManset
                items={filterNewsItemsWithCoverImage(poolItems)}
                categoryTabs={categoryTabs}
                accent={accent}
                h={h}
                hmCategoryColors={hmCat}
                knownCanonicalSlugs={knownCanonicalSlugs}
                siteSlugPrefixes={siteSlugPrefixes}
              />
            )}

            <section id="kategoriler" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-2">
                  <Rss className="h-5 w-5" style={{ color: accent }} />
                  <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
                    Haber Kategorileri
                  </p>
                </div>
                <Link
                  href={h(siteId != null ? `/sondakika?siteId=${encodeURIComponent(String(siteId))}` : "/sondakika")}
                  className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-950"
                >
                  Son dakika listesi <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {categoryBoxesPending ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  {HM_CATEGORIES_NEWS_LOADING_LABEL}
                </div>
              ) : categoriesWithItems.length > 0 ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {categoriesWithItems.map((category) => (
                    <CategoryDirectoryCard
                      key={category.slug}
                      category={category}
                      items={categoryItemsBySlug.get(category.slug) ?? []}
                      accent={accent}
                      h={h}
                      siteId={siteId}
                      hmCategoryColors={hmCat}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Kategori haberleri henüz yüklenemedi. Sayfayı yenileyin veya biraz sonra tekrar deneyin.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Tags className="h-5 w-5" style={{ color: accent }} />
                <h2 className="text-xl font-black text-slate-950">Konu bağlantıları</h2>
              </div>
              {topicLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topicLinks.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={categoryHref(topic.slug, h, siteId)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      #{topic.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Konu bağlantısı için yeterli kategori verisi yok.</p>
              )}
            </section>
          </div>
        )}
      </main>

      {!hmCtx ? (
        <footer className="mt-12 bg-zinc-900 py-8 text-white">
          <div className="container mx-auto px-4 text-center text-sm text-zinc-400">
            © {new Date().getFullYear()} Yekpare. Tüm hakları saklıdır.
          </div>
        </footer>
      ) : null}
    </div>
  );
}
