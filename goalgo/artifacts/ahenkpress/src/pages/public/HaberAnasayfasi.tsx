import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  asArray,
  fetchPublicNewsJson,
  HM_HOME_NEWS_BOOTSTRAP_MAX_MS,
} from "@/lib/queryClient";
import { Link } from "wouter";
import { Component, Fragment, useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronRight, ChevronLeft, Clock, Flame, TrendingUp } from "lucide-react";
import { APP_NAV_HEIGHT } from "@/components/AppNav";
import { useGetSiteSettings, getGetSiteSettingsQueryKey, getListAdsQueryOptions } from "@workspace/api-client-react";
import { useNewsSiteLayoutPrefs } from "@/hooks/useNewsSiteLayout";
import type { HmCorporateDonationSettings, HmNewsHomeModuleId, MansetVariant, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import {
  HM_HOME_LATEST_BAND_ITEM_COUNT,
  HM_NEWS_HOME_MODULE_ORDER,
  isHmDonationActive,
  resolveHmNewsHomeModuleEnabled,
  resolveHmNewsEditorModuleEnabled,
  resolveHmNewsClassicHeroLatestEnabled,
  HM_NEWS_VITRIN_TOGGLE_MODULE_LABELS,
  isHmNewsVitrinToggleModule,
  resolveHmNewsHomeModuleGallerySource,
  resolveHmNewsHomeModuleGalleryVideoTvRef,
  resolveHmDonationIbanModule,
  resolveHmHomeModuleOrder,
  resolveHmNewsAnyAuthorsEnabled,
  resolveHmNewsHorizontalAuthorsEnabled,
  resolveHmNewsSidebarAuthorsEnabled,
  resolveHmNewsLatestGridMainEnabled,
  resolveHmNewsLatestGridSidebarEnabled,
  resolveHmNewsVideoTvEnabled,
  resolveTickerFinanceEnabled,
  resolveTickerWeatherEnabled,
  resolveFinanceWeatherInSidebar,
  isHmHybridRssEnabled,
  resolveHmHomeHybridNewsFetchEnabled,
  resolveHmYekparePoolReceiveEnabled,
  collectHmRssCategoryNavItems,
  resolveHmUnifiedRssFeedRows,
  normalizeHmVitrinTheme,
  isHmNewsRetiredHomeModule,
  filterHmHomeModulesForPortalHub,
} from "@/lib/newsSiteLayout";
import { fetchHybridNewsList, mapHybridNewsToBandItem } from "@/hooks/useHomeHybridNews";
import {
  HM_HOME_HYBRID_BOOTSTRAP_LIMIT,
  HM_HOME_HYBRID_HERO_LIMIT,
  hmHomeHybridBootstrapQueryKey,
  useHmHomeHybridBootstrapFull,
  useHmHomeHybridBootstrapHero,
} from "@/hooks/useHmHomeHybridBootstrap";
import { HmLazyHomeSection } from "@/components/HmLazyHomeSection";
import { isHmHomeAboveFoldModule } from "@/lib/hmHomeLazyModules";
import { defaultNewsSiteLayoutPrefs, parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";
import { resolveHmOrGlobalSlotHtml } from "@/lib/hmResolveAdSlotHtml";
import { FinanceWeatherTicker } from "@/components/news/FinanceWeatherTicker";
import { MatchResultsWidget } from "@/components/news/MatchResultsWidget";
import { HmRssBreakingBand, type RssBreakingBandFallbackItem } from "@/components/HmRssBreakingBand";
import { HmNewsSearchBox } from "@/components/HmNewsSearchBox";
import { HmYekpareFeaturesBand } from "@/components/HmYekpareFeaturesBand";
import { HmYekpareKategorilerKutusu } from "@/components/HmYekpareKategorilerKutusu";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { resetSeoToSiteDefaults } from "@/lib/pageSeo";
import { rewriteHmSiteAnchorsInHtml } from "@/lib/rewriteNewsBodyLinksForHm";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { hmVitrinAccentHex } from "@/lib/hmVitrinThemeTokens";
import { HmSehitSearchModule } from "@/components/HmSehitSearchModule";
import { isBlogCategoryNews } from "@/lib/blogNews";
import { isKoseArticle } from "@/lib/isKoseArticle";
import { apiUrl, resolveClientMediaSrc, rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useHmTabQueryParam, useSiteIdQueryParam } from "@/hooks/useBrowserLocationSearch";
import { useHeadlineSliderInteraction } from "@/hooks/useHeadlineSliderInteraction";
import { HmPopularCitiesSection } from "@/components/HmPopularCitiesSection";
import { DunyadanKisaKisaBand } from "@/components/DunyadanKisaKisaBand";
import { HmCorporateHome } from "@/components/HmCorporateHome";
import { coercePublicHybridNewsHref } from "@/lib/hybridNewsHref";
import { HmCorporateIbanDonationCard } from "@/components/HmCorporateIbanDonationCard";
import { isLegacyHmDonationHtml, stripLegacyHmDonationHtml } from "@/lib/hmLegacyDonationHtml";
import { HmAtaturkCornerBand } from "@/components/HmAtaturkCornerBand";
import { HmAuthorsStrip } from "@/components/HmAuthorsStrip";
import { HmSidebarBalancedGrid } from "@/components/HmSidebarBalancedGrid";
import { HmNewsMansetSplit } from "@/components/HmNewsMansetSplit";
import { HmMansetHomeIconBand } from "@/components/HmMansetHomeIconBand";
import { HmFinanceWeatherPlacementBand } from "@/components/HmFinanceWeatherPlacementBand";
import { HmRssNewsBand, type HmRssCategoryTab } from "@/components/HmRssNewsBand";
import { CULTURE_PORTAL_ITEMS, HM_WAR_PAGES, NATIONAL_DAY_HIGHLIGHTS, corporateWarPath, culturePortalPath } from "@/lib/hmCorporateHeritage";
import { HM_LAYOUT_UPDATED_EVENT } from "@/lib/hmLayoutUpdatedEvent";
import { resolveSadeAccent, SADE_PUBLIC_POST_HERO_BODY_CLASS, YEKPARE_SADE_ACCENT } from "@/lib/yekpareSadeTheme";
import { sortHmCategoriesForNav } from "@/lib/hmCategoryNav";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";
import { isHmPublicNavExternal, normalizeHmPublicExternalHref } from "@/lib/hmPublicLinks";
import {
  buildClassicHeadlineSliderPool,
  buildCenterMansetSliderPool,
  buildHeadlineSidePrimaryPool,
  buildHomeHeroDedupeSeedItems,
  buildHomeMansetSideHeadlineSeedItems,
  buildManualHeadlineOnlyPool,
  buildTepeMansetPool,
  buildRssAwareHeadlinePool,
  createHeadlineVisitSeed,
  createHomeNewsDedupeTracker,
  excludeHeadlineSliderItems,
  type HomeNewsDedupeTracker,
  homeNewsAliasKeys,
  HM_HOME_FEATURED_STRIP_ITEM_COUNT,
  HM_HOME_HEADLINE_SLIDER_LIMIT,
  HM_HOME_HEADLINE_SLIDER_MIN,
  HM_LEAD_LIST_SIDEBAR_TOTAL,
  HM_ESEN_LEAD_PACK_TOTAL,
  HM_MANSET_SPLIT_SIDE_COUNT,
  HM_MANSET_FULL_NUMBERED_SIDE_COUNT,
  resolveFullNumberedSideCount,
  resolveFullNumberedSideGridRows,
  resolveExternalSondakikaEnabled,
  resolveMansetSideCount,
  isHeadlineFreshEnough,
  isTodayHeadlineNews,
  isHmEditorManualNewsItem,
  isRssHybridItem,
  mergeUniqueNews,
  newsKeyOf,
  pickHomeModuleNewsItems,
  pickHomeDisplayNewsItems,
  pickHeroSideHeadlines,
  preferFreshHeadlineCandidates,
  hasEnoughNewsForHeroSideHeadlines,
  resolveCenterTrioSideHeadlines,
  resolveClassicHeroSideCount,
  resolveClassicTopGridState,
  resolveSplitSideHeadlines,
  HM_MANSET_SPLIT_SIDE_ROWS,
  sortNewsByRecency,
  sliderHeadlineKeys,
} from "@/lib/hmHeadlinePool";
import { HmCategoryBoxGrid } from "@/components/HmCategoryBoxLayout";
import { HmNewsImage, filterNewsItemsWithCoverImage, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { HmTepeManset, HM_TEPE_MANSET_ITEM_COUNT } from "@/components/HmTepeManset";
import {
  HmAhenkAnkaraGrid,
  HmAhenkDunyaBlock,
  HmAhenkEkonomiGrid,
  HmAhenkGundemLeadSide,
  HmAhenkGununSesiAuthors,
  HmAhenkIconCategoryRow,
  HmAhenkPopulerHaberler,
  HmAhenkSonEklenenler,
  HmAhenkSporGrid,
  resolveAhenkCategorySlug,
  titleForAhenkSlug,
  type AhenkHaberBlockContext,
} from "@/components/HmAhenkHaberHomeBlocks";
import {
  CATEGORY_BOX_DISPLAY_TOTAL,
  CATEGORY_BOX_LIST_SLOTS,
  createCategoryBoxModuleDedupeTracker,
  dedupeCategoryBoxItems,
  ensureNewsBoxItems,
  ensureNewsBoxSections,
  normalizeEvenDisplayCount,
  normalizeYekpareCategoryBoxCount,
  pickModuleSectionCategoryItems,
  splitCategoryBoxItems,
  yekpareCategoryBoxGridClass,
} from "@/lib/hmCategoryBoxItems";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import { formatTrDisplayLabel } from "@/lib/hmDisplayText";
import { applyHmGallerySpotlightForModule, fetchHmMediaSpotlightPool, hmMediaGallerySourceLabel, hmMediaGallerySourceListHref } from "@/lib/hmMediaSpotlightPool";
import {
  buildHomeModuleCategoryCandidates,
  HOME_NEWS_AUTO_CATEGORY_MODULES,
  HOME_NEWS_MULTI_CATEGORY_SECTION_MODULES,
  newsItemMatchesCategorySlug,
  normalizeHomeModuleCategorySlug,
  normalizeCategorySlugList,
  pickCategorySectionsBySlugs,
  resolveAutomaticHomeModuleCategorySlugs,
} from "@/lib/hmHomeModuleCategories";
import { hmCategorySlug, humanizeNewsCategorySlug, normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import {
  buildHmKnownCanonicalCategorySlugs,
  hmNewsItemMatchesHomeCategorySlug,
  resolveHomeCategorySectionPool,
  type HmHomeCategoryMatchContext,
} from "@/lib/hmHomeCategorySectionPool";
import { useHmHomeCategorySectionItems } from "@/hooks/useHmHomeCategorySectionItems";
import { passesCategoryContentGuard } from "@/lib/hmCategoryContentGuard";
import { dedupeHmCategoryTabsByCanonicalSlug } from "@/lib/hmCategoryTabs";
import { HM_STANDARD_NEWS_CATEGORIES, mergeHmStandardNewsCategoryRows } from "@/lib/hmStandardNewsCategories";
import {
  filterHmPublicCategoryRows,
  resolveHmPublicActiveGlobalSlugs,
  resolveHmPublicHiddenCategorySlugs,
} from "@/lib/hmPublicCategoryFilter";
import "@/styles/hmThemeBlockHeadline.css";

const LazyHmNewsMapModule = lazy(() =>
  import("@/components/HmNewsMapModule").then((m) => ({ default: m.HmNewsMapModule })),
);
const LazyHmSporModule = lazy(() =>
  import("@/components/HmSporModule").then((m) => ({ default: m.HmSporModule })),
);
const LazyHmRecentVideosBox = lazy(() =>
  import("@/components/HmRecentVideosBox").then((m) => ({ default: m.HmRecentVideosBox })),
);
const LazyHmRssNewsBand = lazy(() =>
  import("@/components/HmRssNewsBand").then((m) => ({ default: m.HmRssNewsBand })),
);

const HM_HOME_CATEGORY_BOX_MAX = 6;

/* ── Helpers ── */

const DEFAULT_RED = YEKPARE_SADE_ACCENT;
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Esen tema gövdesinde zaten özel render edilen modüller — ek döngüde tekrarlanmaz. */
const ESEN_NATIVE_HOME_MODULES = new Set<HmNewsHomeModuleId>([
  "breakingBand",
  "googleNewsBand",
  "tepeManset",
  "hero",
  "mansetAd",
  "authorsStrip",
]);

/** Klasik / Portal3 tema gövdesinde zaten özel render edilen modüller. */
const CLASSIC_NATIVE_HOME_MODULES = new Set<HmNewsHomeModuleId>([
  "breakingBand",
  "googleNewsBand",
  "tepeManset",
  "hero",
  "mansetAd",
  "authorsStrip",
  "homeMiddleAd",
  "recentVideosSidebar",
]);

/** Klasik / portal3 üst bant — kayıtlı sıra ne olursa olsun sabit sıra (tepeManset hero öncesi). */
const CLASSIC_TOP_MODULE_CANONICAL_ORDER: HmNewsHomeModuleId[] = [
  "breakingBand",
  "googleNewsBand",
  "tepeManset",
  "hero",
  "mansetAd",
  "authorsStrip",
];

class HmHomeBlockBoundary extends Component<
  { moduleId: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[HaberAnasayfasi] Homepage block skipped after render error", {
      moduleId: this.props.moduleId,
      error,
    });
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function vitrinImgSrc(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  return resolveClientMediaSrc(u) || u;
}

function catColor(c: any, accent: string, hmCategoryColors?: Record<string, string> | null) {
  const slug = String(c?.categorySlug ?? "").trim().toLowerCase();
  const raw = slug && hmCategoryColors?.[slug];
  if (typeof raw === "string" && HEX_COLOR.test(raw.trim())) return raw.trim();
  return c?.categoryColor || accent;
}

function stripTabColor(
  slug: string,
  hmCategoryColors: Record<string, string> | null | undefined,
  accent: string,
): string {
  if (!slug) return accent;
  const raw = hmCategoryColors?.[slug];
  if (typeof raw === "string" && HEX_COLOR.test(raw.trim())) return raw.trim();
  return accent;
}

function isExternalHref(href: string): boolean {
  return isHmPublicNavExternal(href);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  try { return format(new Date(d), "d MMM, HH:mm", { locale: tr }); }
  catch { return ""; }
}

function fmtDateShort(d: string | null | undefined) {
  if (!d) return "";
  try { return format(new Date(d), "d MMM yyyy", { locale: tr }); }
  catch { return ""; }
}

function newsDisplayTitle(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? ""));
}

/* ÔöÇÔöÇ Section header ÔöÇÔöÇ */
function SectionHead({ title, color = DEFAULT_RED, href, categoryTag }: { title: string; color?: string; href?: string; categoryTag?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="hm-vitrin-section-accent h-6 w-1 shrink-0 rounded-sm shadow-sm" style={{ background: color }} />
      <h2 className="text-base font-black uppercase tracking-[0.04em] text-gray-900">{title}</h2>
      {categoryTag ? (
        <span className="rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: color }}>
          {categoryTag}
        </span>
      ) : null}
      <div className="hm-vitrin-section-line min-h-px min-w-[12px]" />
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-xs font-bold hover:opacity-70 transition" style={{ color }}>
          Tümü <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function hybridNewsItemHref(
  n: { slug?: string | null; id?: string | number | null; href?: string | null; source?: string },
  h: (path: string) => string,
): string {
  return h(coercePublicHybridNewsHref(n));
}

function normalizeNewsCategoryKey(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR");
}

function newsMatchesCategory(
  item: any,
  categorySlug: string,
  matchContext?: HmHomeCategoryMatchContext,
): boolean {
  if (!passesCategoryContentGuard(item, categorySlug)) return false;
  if (matchContext && hmNewsItemMatchesHomeCategorySlug(item, categorySlug, matchContext)) return true;
  return newsItemMatchesCategorySlug(item, categorySlug);
}

function rememberItemAliasKeys(item: unknown, seen: Set<string>): void {
  for (const key of homeNewsAliasKeys(item as Parameters<typeof homeNewsAliasKeys>[0])) {
    seen.add(key);
  }
}

function isItemAliasSeen(item: unknown, seen: Set<string>): boolean {
  return homeNewsAliasKeys(item as Parameters<typeof homeNewsAliasKeys>[0]).some((key) => seen.has(key));
}

/** Havuzdan eksik kalan slotları doldurur; manşet/üst blok dedupe havuzunu ihlal etmez. */
function padNewsItemsToLimit<T>(
  items: readonly T[],
  pool: readonly T[],
  limit: number,
  dedupe?: HomeNewsDedupeTracker,
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  const push = (item: T, allowAlreadyUsed = false) => {
    if (!allowAlreadyUsed && dedupe?.has(item)) return;
    if (isItemAliasSeen(item, seen)) return;
    rememberItemAliasKeys(item, seen);
    out.push(item);
  };
  for (const item of items) push(item, true);
  const backfill = dedupe ? dedupe.filterUnused(pool) : pool;
  for (const item of backfill) {
    if (out.length >= limit) break;
    push(item, false);
  }
  const result = out.slice(0, limit);
  dedupe?.rememberMany(result);
  return result;
}

function cssToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function HmNewsModuleEmpty({
  title,
  className = "",
  moduleId,
  message,
}: {
  title?: string;
  className?: string;
  moduleId?: HmNewsHomeModuleId;
  message?: string;
}) {
  return (
    <section
      className={`hm-news-module-empty hm-vitrin-card mb-6 rounded-2xl p-6 text-center ${className}`.trim()}
      data-hm-home-module={moduleId}
    >
      {title ? (
        <div className="mb-3">
          <h2 className="text-sm font-black uppercase tracking-[0.04em] text-gray-900">{title}</h2>
        </div>
      ) : null}
      {message ? <p className="text-sm font-medium text-slate-500">{message}</p> : null}
    </section>
  );
}

function HmNewsInlinePulse({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-2 ${className}`.trim()} aria-hidden>
      <div className="aspect-[16/10] animate-pulse rounded-xl bg-slate-100/90" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100/80" />
    </div>
  );
}

function HmNewsModuleSkeleton({
  title,
  className = "",
  moduleId,
}: {
  title?: string;
  className?: string;
  moduleId?: HmNewsHomeModuleId;
}) {
  return (
    <section
      className={`hm-news-module-empty hm-vitrin-card mb-6 rounded-2xl p-4 sm:p-6 ${className}`.trim()}
      data-hm-home-module={moduleId}
      aria-busy="true"
      aria-label={title ? `${title} yükleniyor` : "Haberler yükleniyor"}
    >
      {title ? (
        <div className="mb-4 h-4 w-40 animate-pulse rounded bg-slate-200/90" />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-slate-100 p-3">
            <div className="aspect-[16/10] animate-pulse rounded-lg bg-slate-200/80" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-200/70" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200/60" />
          </div>
        ))}
      </div>
    </section>
  );
}

async function fetchCorporateDbNewsForSite(
  siteId: number,
  query: string,
): Promise<{ items?: any[]; total?: number }> {
  try {
    return await fetchPublicNewsJson<{ items?: any[]; total?: number }>(
      `/api/news?siteId=${encodeURIComponent(String(siteId))}${query}&includeHiddenCategories=1`,
    );
  } catch {
    return { items: [], total: 0 };
  }
}

async function fetchPublicNewsList(url: string): Promise<{ items?: any[]; total?: number }> {
  // Hata/timeout'u YUTMA: yutulursa React Query bunu "başarılı boş sonuç" sayar,
  // 2 dk staleTime boyunca cache'ler ve yeniden denemez → soğuk/yavaş API'de
  // (Railway cold start ~28sn) editör anasayfası HİÇ haber göstermez. Fırlat ki
  // React Query otomatik yeniden denesin ve backend ısınınca kendini toparlasın.
  return await fetchPublicNewsJson<{ items?: any[]; total?: number }>(url);
}

/* ÔöÇÔöÇ Horizontal card (image left + text right) ÔöÇÔöÇ */
function CardHoriz({
  n,
  size = "md",
  accent,
  hmCategoryColors,
  className = "",
}: {
  n: any;
  size?: "sm" | "md" | "lg";
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  className?: string;
}) {
  const h = useHmPublicHref();
  const thumbClass =
    size === "lg" ? "w-28 aspect-[16/10]" : size === "md" ? "w-20 aspect-[16/10]" : "w-16 aspect-[16/10]";
  return (
    <Link href={hybridNewsItemHref(n, h)}
      className={`group flex gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors rounded px-1 ${className}`}>
      <div className={`relative shrink-0 overflow-hidden rounded-lg ${thumbClass}`}>
        <HmNewsImage src={resolveNewsItemImageUrl(n)} alt={newsDisplayTitle(n.title)} className="transition-transform group-hover:scale-105" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        {n.categoryName && (
          <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: catColor(n, accent, hmCategoryColors) }}>{n.categoryName}</span>
        )}
        <p className={`font-bold text-gray-900 leading-snug line-clamp-2 mt-0.5 ${size === "lg" ? "text-sm" : "text-xs"}`}>{newsDisplayTitle(n.title)}</p>
        <p className="text-gray-400 text-[10px] mt-1 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />{fmtDate(n.createdAt)}
        </p>
      </div>
    </Link>
  );
}

/* ÔöÇÔöÇ Vertical card (image top + text bottom) ÔöÇÔöÇ */
function CardVert({
  n,
  imgHeight = 140,
  accent,
  hmCategoryColors,
  className = "",
}: {
  n: any;
  imgHeight?: number;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  className?: string;
}) {
  const h = useHmPublicHref();
  return (
    <Link href={hybridNewsItemHref(n, h)}
      className={`hm-vitrin-card group flex flex-col overflow-hidden rounded-xl shadow transition-all hover:-translate-y-0.5 hover:shadow-lg ${className}`}>
      <div
        className="hm-vitrin-card-thumb relative shrink-0 overflow-hidden"
        style={imgHeight ? { height: imgHeight } : undefined}
      >
        <HmNewsImage src={resolveNewsItemImageUrl(n)} alt={newsDisplayTitle(n.title)} className="transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        {n.categoryName && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-sm text-[9px] font-black uppercase text-white"
            style={{ background: catColor(n, accent, hmCategoryColors) }}>{n.categoryName}</span>
        )}
        {n.isBreaking && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-sm text-[9px] font-black uppercase text-white bg-orange-500">SON DAKİKA</span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="hm-vitrin-card__title font-bold text-gray-900 text-sm leading-snug line-clamp-2 sm:line-clamp-3 flex-1">{newsDisplayTitle(n.title)}</p>
        <p className="hm-vitrin-card__meta text-gray-400 text-[10px] mt-2 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />{fmtDate(n.createdAt)}
        </p>
      </div>
    </Link>
  );
}

/* ÔöÇÔöÇ Hero Slider ÔöÇÔöÇ */
function HeroSlider({
  slides,
  accent,
  aspectRatio = "16/9",
  thumbStripBelow = false,
  numberedTabsBelow = false,
  hmCategoryColors,
}: {
  slides: any[];
  accent: string;
  aspectRatio?: string;
  thumbStripBelow?: boolean;
  numberedTabsBelow?: boolean;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const h = useHmPublicHref();
  const len = slides.length;
  const slider = useHeadlineSliderInteraction(len);
  const idx = slider.index;
  const n = slides[idx];
  if (!n) return null;

  return (
    <div className="space-y-2">
    <div
      className="hm-vitrin-hero relative overflow-hidden rounded-xl"
      style={{ aspectRatio, ...slider.swipeStyle }}
      {...slider.bind}
    >
      {/* Active slide only — opacity stacking breaks under .hm-vitrin-home { opacity: 1 !important } */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <HmNewsImage
          src={resolveNewsItemImageUrl(n)}
          alt={n.title}
          wrapperClassName="absolute inset-0"
          className="hm-vitrin-hero-img w-full h-full object-cover"
          priority
          loading="eager"
        />
      </div>
      {/* Gradient overlay — tıklamaları engellemesin; başlantı / kontroller üstte */}
      <div className="hm-vitrin-hero-overlay pointer-events-none absolute inset-0 z-10" />
      {/* Content */}
      <Link
        href={hybridNewsItemHref(n, h)}
        className="absolute inset-0 z-[12] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-xl"
        aria-label={newsDisplayTitle(n.title)}
      />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 max-sm:max-h-[22%] max-sm:overflow-hidden p-1.5 pb-1.5 sm:max-h-none sm:p-4 sm:pb-4">
        <div
          className="hm-vitrin-hero-title-rail flex min-h-0 flex-col max-sm:gap-1"
          style={{ ["--hero-accent" as string]: accent } as CSSProperties}
        >
          <h2 className="order-1 font-black text-white drop-shadow-sm max-sm:line-clamp-2 max-sm:text-xs max-sm:leading-snug sm:order-2 sm:text-xl sm:leading-snug sm:line-clamp-3 sm:tracking-normal">
            {newsDisplayTitle(n.title ?? n.spot)}
          </h2>
          {n.categoryName && (
            <span
              className="order-2 inline-block self-start rounded-sm px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-white max-sm:mb-0 sm:order-1 sm:mb-2 sm:px-2.5 sm:text-[10px]"
              style={{ background: catColor(n, accent, hmCategoryColors) }}
            >
              {n.categoryName}
            </span>
          )}
          <div className="order-4 flex flex-wrap items-center gap-x-2 gap-y-0 max-sm:mt-0 sm:order-4 sm:mt-2 sm:gap-x-3">
            {n.authorName ? (
              <span className="hidden text-white/70 text-xs sm:inline sm:text-white/60">✍️ {n.authorName}</span>
            ) : null}
            <span className="text-white/60 text-[10px] flex items-center gap-0.5 sm:text-xs sm:gap-1 sm:text-white/50">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              {fmtDate(n.createdAt)}
            </span>
          </div>
        </div>
      </div>
      {/* Prev/Next */}
      {len > 1 && <>
        <button type="button" onClick={e => { e.preventDefault(); slider.prev(); }}
          className="absolute left-2 top-1/2 z-[25] -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button type="button" onClick={e => { e.preventDefault(); slider.next(); }}
          className="absolute right-2 top-1/2 z-[25] -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition">
          <ChevronRight className="w-5 h-5" />
        </button>
      </>}
      {/* Dots */}
      {len > 1 && (
        <div className="absolute bottom-3 right-4 z-[25] flex gap-1.5">
          {slides.map((_, i) => (
            <button type="button" key={i} onClick={() => slider.setIndex(i)}
              className={`rounded-full transition-all ${i === idx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"}`} />
          ))}
        </div>
      )}
    </div>
    {thumbStripBelow && len > 1 && (
      <div className="flex gap-2 overflow-x-auto pb-1 pt-1" style={{ scrollbarWidth: "none" }}>
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => slider.setIndex(i)}
            className={`shrink-0 rounded-lg overflow-hidden border-2 transition ${i === idx ? "" : "opacity-80 hover:opacity-100"}`}
            style={{ borderColor: i === idx ? accent : "transparent", boxShadow: i === idx ? `0 0 0 2px ${accent}44` : undefined }}
          >
            <div className="h-[52px] w-[76px] overflow-hidden sm:h-16 sm:w-24">
              <HmNewsImage src={resolveNewsItemImageUrl(s)} alt="" loading="lazy" />
            </div>
          </button>
        ))}
      </div>
    )}
    {numberedTabsBelow && len > 1 && (
      <div className="hm-headline-number-tabs flex items-center overflow-x-auto rounded-b-xl bg-slate-950 px-3 py-2" style={{ scrollbarWidth: "none" }}>
        {slides.map((s, i) => (
          <button
            key={s.id ?? `${s.slug ?? "slide"}-${i}`}
            type="button"
            onClick={() => slider.setIndex(i)}
            className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
              i === idx ? "bg-white text-slate-950" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            aria-label={`${i + 1}. manşet`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    )}
    </div>
  );
}

/* ÔöÇÔöÇ Breaking News Ticker ÔöÇÔöÇ */
function SonDakikaTicker({ items }: { items: any[] }) {
  const h = useHmPublicHref();
  if (!items.length) return null;
  return (
    <div className="hm-vitrin-ticker mb-5 flex items-center overflow-hidden rounded-lg" style={{ background: "var(--hm-ticker-bg, #111)" }}>
      <div className="hm-vitrin-ticker__label flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white">
        <Flame className="w-3.5 h-3.5" /> SON DAKİKA
      </div>
      <div className="hm-vitrin-ticker__rail relative flex-1 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...items, ...items].map((n, i) => (
            <Link
              key={`${n.id}-${i}`}
              href={hybridNewsItemHref(n, h)}
              className="hm-ticker-marquee-link inline-flex shrink-0 items-center gap-3 px-6 text-xs font-semibold leading-none transition-colors duration-150"
            >
              <span className="max-w-[min(70vw,28rem)] truncate">{newsDisplayTitle(n.title)}</span>
              <span className="hm-ticker-marquee-sep shrink-0 select-none" aria-hidden>
                |
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeadlineOverlayCard({
  n,
  accent,
  hmCategoryColors,
  className = "",
  titleClassName = "text-sm",
}: {
  n: any;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  className?: string;
  titleClassName?: string;
}) {
  const h = useHmPublicHref();
  return (
    <Link
      href={hybridNewsItemHref(n, h)}
      className={`hm-vitrin-card group relative block min-h-[180px] overflow-hidden rounded-xl bg-slate-900 shadow transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <HmNewsImage
        src={resolveNewsItemImageUrl(n)}
        alt={newsDisplayTitle(n.title)}
        className="transition-transform duration-500 group-hover:scale-105"
        loading="eager"
        priority
        wrapperClassName="absolute inset-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        {n.categoryName ? (
          <span
            className="mb-2 inline-block rounded-sm px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white"
            style={{ background: catColor(n, accent, hmCategoryColors) }}
          >
            {n.categoryName}
          </span>
        ) : null}
        <h3 className={`line-clamp-3 font-black leading-tight text-white ${titleClassName}`}>{newsDisplayTitle(n.title)}</h3>
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/60">
          <Clock className="h-2.5 w-2.5" />
          {fmtDate(n.createdAt)}
        </p>
      </div>
    </Link>
  );
}

function StableContainedHeadline({
  items,
  sideItems,
  accent,
  hmCategoryColors,
  title = "Manşet",
  href,
  className = "",
  embedded = false,
}: {
  items: any[];
  sideItems: any[];
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  title?: string;
  href?: string;
  className?: string;
  /** Dış section başlığı varken iç içe kart/section oluşturma. */
  embedded?: boolean;
}) {
  const slides = items.filter(Boolean).slice(0, HM_HOME_HEADLINE_SLIDER_LIMIT);
  if (slides.length === 0) return null;
  const cards = pickHeroSideHeadlines({
    pool: sideItems,
    sliderItems: slides,
    sideCount: HM_MANSET_SPLIT_SIDE_COUNT,
  });

  const grid = (
    <div
      className={`grid grid-cols-1 gap-3 lg:items-stretch ${cards.length > 0 ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]" : ""}`}
      data-manset-variant="split"
    >
      <div className="min-w-0">
        <HeroSlider slides={slides} accent={accent} aspectRatio="16/9" hmCategoryColors={hmCategoryColors} numberedTabsBelow />
      </div>
      {cards.length > 0 ? (
        <div className="flex min-w-0 flex-col lg:h-full">
          <div
            className="hm-manset-split-side grid min-h-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-2 lg:auto-rows-fr"
            style={{ ["--hm-split-side-rows" as string]: String(HM_MANSET_SPLIT_SIDE_ROWS) }}
          >
            {cards.map((n: any, index: number) => (
              <CardVert
                key={n.id ?? n.slug ?? index}
                n={n}
                accent={accent}
                hmCategoryColors={hmCategoryColors}
                className="min-h-[140px] lg:h-full"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className={className.trim()}>{grid}</div>;
  }

  return (
    <section className={`hm-vitrin-card mb-6 overflow-hidden rounded-2xl p-3 shadow sm:p-4 ${className}`.trim()}>
      <SectionHead title={title} color={accent} href={href} />
      {grid}
    </section>
  );
}

function CategorySection({
  title,
  slug,
  color = DEFAULT_RED,
  accent,
  siteId,
  hmCategoryColors,
}: {
  title: string;
  slug: string;
  color?: string;
  accent: string;
  siteId?: number | null;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const h = useHmPublicHref();
  const siteQs = siteId != null ? `?siteId=${encodeURIComponent(String(siteId))}` : "";
  const { data = [] } = useQuery<any[]>({
    queryKey: ["/api/news/by-category", slug, siteId ?? "all"],
    queryFn: () => apiRequest(`/api/news/by-category/${slug}${siteQs}`),
    staleTime: 5 * 60 * 1000,
  });
  const sortedData = useMemo(() => sortNewsByRecency(data), [data]);
  const { lead, listItems } = useMemo(() => splitCategoryBoxItems(sortedData), [sortedData]);

  if (!lead) return null;

  const sectionColor =
    (typeof hmCategoryColors?.[slug] === "string" && HEX_COLOR.test(hmCategoryColors[slug]!.trim())
      ? hmCategoryColors[slug]!.trim()
      : null) ??
    color ??
    DEFAULT_RED;
  const categoryHref = h(
    siteId != null
      ? `/kategori/${slug}?siteId=${encodeURIComponent(String(siteId))}`
      : `/kategori/${slug}`,
  );

  return (
    <div className="mb-8">
      <SectionHead title={`${title} Haberleri`} color={sectionColor} href={categoryHref} />
      <HmCategoryBoxGrid
        lead={lead}
        listItems={listItems}
        color={sectionColor}
        getHref={(n) => hybridNewsItemHref(n, h)}
        categorySlug={slug}
      />
    </div>
  );
}

function resolveHmHref(h: (path: string) => string, href: string): string {
  const raw = String(href ?? "").trim();
  if (!raw) return "/";
  const normalizedExternal = normalizeHmPublicExternalHref(raw);
  if (normalizedExternal) return normalizedExternal;
  if (isExternalHref(raw)) return raw;
  return h(raw.startsWith("/") ? raw : `/${raw}`);
}

function NewsCulturePortalSection({ accent }: { accent: string }) {
  const h = useHmPublicHref();
  return (
    <section className="hm-vitrin-card hm-news-culture-portal mb-3 overflow-hidden rounded-2xl shadow sm:mb-4">
      <div className="p-4 sm:p-5" style={{ background: "linear-gradient(135deg,var(--hm-header-bg,#111827),var(--hm-nav-strip-bg,#1f2937))" }}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "var(--hm-brand-label,#d4af37)" }}>
              Kültür Portalı
            </p>
            <h2 className="mt-1 text-lg font-black uppercase tracking-wide text-white">Kültür, turizm ve sanat rehberi</h2>
          </div>
          <Link href={h("/kultur-portali")} className="inline-flex items-center gap-1 text-xs font-bold text-white/75 hover:text-white">
            Tümü <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="hm-culture-scroll-row grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {CULTURE_PORTAL_ITEMS.map((item) => (
            <Link
              key={item.slug}
              href={h(culturePortalPath(item.slug))}
              className="hm-culture-scroll-card rounded-xl border border-white/10 bg-white/10 p-3 text-center text-white transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <span className="text-2xl" aria-hidden>{item.icon}</span>
              <span className="mt-2 block text-[11px] font-black uppercase leading-tight">{item.title}</span>
              <span className="mt-1 block text-[10px] leading-snug text-white/55">{item.subtitle}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsAtaturkCornerSection({ accent }: { accent: string }) {
  return <HmAtaturkCornerBand accent={accent} className="mb-8" />;
}

function NewsHeritageInfoSection({
  accent,
  showWars,
  showNationalDays,
  warsHref,
  nationalDaysHref,
}: {
  accent: string;
  showWars: boolean;
  showNationalDays: boolean;
  warsHref?: string | null;
  nationalDaysHref?: string | null;
}) {
  const h = useHmPublicHref();
  if (!showWars && !showNationalDays) return null;
  const resolvedWarsHref = resolveHmHref(h, warsHref || "/savaslar");
  const resolvedDaysHref = resolveHmHref(h, nationalDaysHref || "/milli-gunler");
  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-2">
      {showWars ? (
        <article className="hm-vitrin-card overflow-hidden rounded-2xl shadow">
          <div className="px-4 py-3 text-white" style={{ background: "linear-gradient(135deg,var(--hm-header-bg,#111827),var(--hm-accent-2,#7f1d1d))" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Tarih</p>
            <h2 className="text-base font-black uppercase">Türk Milletinin Savaşları</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {HM_WAR_PAGES.slice(0, 4).map((page) => (
              <Link key={page.slug} href={h(corporateWarPath(page.slug))} className="grid grid-cols-[76px_1fr] gap-3 p-4 transition hover:bg-slate-50">
                <span className="text-lg font-black" style={{ color: accent }}>{page.year}</span>
                <span>
                  <strong className="block text-sm font-black text-gray-900">{page.shortTitle}</strong>
                  <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{page.summary}</span>
                </span>
              </Link>
            ))}
          </div>
          {isExternalHref(resolvedWarsHref) ? (
            <a href={resolvedWarsHref} className="block px-4 py-3 text-right text-xs font-black uppercase hover:underline" style={{ color: accent }} target="_blank" rel="noopener noreferrer">
              Tüm savaşlar »
            </a>
          ) : (
            <Link href={resolvedWarsHref} className="block px-4 py-3 text-right text-xs font-black uppercase hover:underline" style={{ color: accent }}>
              Tüm savaşlar »
            </Link>
          )}
        </article>
      ) : null}
      {showNationalDays ? (
        <article className="hm-vitrin-card overflow-hidden rounded-2xl shadow">
          <div className="px-4 py-3 text-white" style={{ background: "linear-gradient(135deg,var(--hm-nav-strip-bg,#1f2937),var(--hm-accent,#b91c1c))" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Anma Takvimi</p>
            <h2 className="text-base font-black uppercase">Millî Günler</h2>
          </div>
          <div className="grid max-h-[420px] grid-cols-2 gap-px overflow-y-auto bg-slate-100 p-px sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {NATIONAL_DAY_HIGHLIGHTS.map((day) => (
              <Link key={`${day.day}-${day.title}`} href={resolvedDaysHref} className="bg-white p-3 transition hover:bg-[var(--hm-accent-soft,#fff1f2)]">
                <span className="text-xs font-black" style={{ color: accent }}>{day.day}</span>
                <strong className="mt-1 block text-[13px] font-black leading-snug text-gray-900">{day.title}</strong>
              </Link>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function NewsDonationSupport({ donation, accent }: { donation: HmCorporateDonationSettings; accent: string }) {
  const band = donation.supportBand;
  const items = (band?.enabled !== false ? (band?.items ?? []) : [])
    .filter((item) => item.trim())
    .slice(0, 3);
  const title = donation.title || band?.title || "Desteğiniz haber merkezinin yanında";
  const highlightsHtml = (band?.highlightsHtml ?? "").trim();

  return (
    <section className="hm-vitrin-card mb-8 overflow-hidden rounded-2xl shadow">
      <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
        <div
          className="p-5 text-white"
          style={{ background: "linear-gradient(135deg,var(--hm-header-bg,#111827),var(--hm-nav-strip-bg,#1f2937))" }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "var(--hm-brand-label,#d4af37)" }}>
            Destek Bandı
          </p>
          <h2 className="mt-1 text-xl font-black leading-tight">{title}</h2>
          {highlightsHtml ? (
            <div
              className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 [&_li]:mb-2 [&_ul]:list-none [&_ul]:p-0"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(highlightsHtml) }}
            />
          ) : null}
          {items.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {items.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white/85"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <HmCorporateIbanDonationCard donation={donation} variant="news" accent={accent} showHeading={false} />
      </div>
    </section>
  );
}

/* ÔöÇÔöÇ Popular card ÔöÇÔöÇ */
function PopulerCard({
  n,
  rank,
  accent,
  hmCategoryColors,
}: {
  n: any;
  rank: number;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const h = useHmPublicHref();
  return (
    <Link href={hybridNewsItemHref(n, h)}
      className="group flex gap-3 items-start py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition rounded px-1">
      <span className="text-3xl font-black leading-none shrink-0" style={{ color: rank <= 3 ? accent : "#d1d5db", lineHeight: 1 }}>
        {String(rank).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        {n.categoryName && (
          <span className="text-[9px] font-black uppercase" style={{ color: catColor(n, accent, hmCategoryColors) }}>
            {n.categoryName}
          </span>
        )}
        <p className="font-bold text-gray-800 text-xs leading-snug line-clamp-3 mt-0.5">{newsDisplayTitle(n.title)}</p>
        <p className="text-gray-400 text-[10px] mt-1 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{fmtDate(n.createdAt)}</p>
      </div>
    </Link>
  );
}

function ClassicSectionTitle({ title, href, accent, categoryTag }: { title: string; href?: string; accent: string; categoryTag?: string }) {
  return (
    <div className="hm-classic-section-head">
      <h2>
        {title}
        {categoryTag ? (
          <span className="hm-classic-section-category" style={{ background: accent }}>
            {categoryTag}
          </span>
        ) : null}
      </h2>
      <span />
      {href ? (
        <Link href={href} className="hm-classic-more" style={{ color: accent }}>
          Tümü
        </Link>
      ) : null}
    </div>
  );
}

function FeaturedCategoryTabs({
  tabs,
  selectedSlug,
  accent,
  onSelect,
}: {
  tabs: HmRssCategoryTab[];
  selectedSlug: string;
  accent: string;
  onSelect: (slug: string) => void;
}) {
  if (tabs.length <= 1) return null;
  return (
    <div className="hm-featured-category-tabs" role="tablist" aria-label="Öne çıkan kategori sekmeleri">
      {tabs.map((tab) => {
        const active = tab.slug === selectedSlug;
        return (
          <button
            key={tab.slug || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? "is-active" : ""}
            style={active ? { background: accent, borderColor: accent } : undefined}
            onClick={() => onSelect(tab.slug)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ClassicImage({ n, className = "" }: { n: any; className?: string }) {
  return (
    <HmNewsImage src={resolveNewsItemImageUrl(n)} alt={n?.title ?? ""} className={className} loading="lazy" />
  );
}

function ClassicBadge({
  label,
  color,
  className = "",
}: {
  label?: string | null;
  color: string;
  className?: string;
}) {
  if (!label) return null;
  return (
    <span className={`hm-classic-badge ${className}`} style={{ background: color }}>
      {label}
    </span>
  );
}

function ClassicSideHeadlineSkeleton({ large = false }: { large?: boolean }) {
  return (
    <div
      className={`hm-classic-side-headline-skeleton animate-pulse ${large ? "hm-classic-side-headline-skeleton--large" : ""}`}
      aria-hidden="true"
    />
  );
}

function VitrinSideHeadlineSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`hm-vitrin-side-headline-skeleton animate-pulse rounded-xl bg-slate-200/80 shadow ${className}`}
      aria-hidden="true"
    />
  );
}

function ClassicFeatureCard({
  n,
  accent,
  hmCategoryColors,
  large = false,
}: {
  n: any;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  large?: boolean;
}) {
  const h = useHmPublicHref();
  const color = catColor(n, accent, hmCategoryColors);
  return (
    <Link href={hybridNewsItemHref(n, h)} className={`hm-classic-feature-card ${large ? "hm-classic-feature-card--large" : ""}`}>
      <ClassicImage n={n} />
      <div className="hm-classic-feature-shade" />
      <div className="hm-classic-feature-body">
        <ClassicBadge label={n.categoryName} color={color} />
        <h3>{newsDisplayTitle(n.title)}</h3>
        <time>{fmtDate(n.createdAt)}</time>
      </div>
    </Link>
  );
}

function ClassicMainHeadlineSlider({
  items,
  accent,
  hmCategoryColors,
  tabsClassName,
  maxTabs,
  className = "hm-classic-main-headline",
}: {
  items: any[];
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  tabsClassName: string;
  maxTabs: number;
  className?: string;
}) {
  const sliderItems = items.filter(Boolean);
  const slider = useHeadlineSliderInteraction(sliderItems.length);
  const activeIndex = slider.index;
  const active = sliderItems[activeIndex] ?? sliderItems[0];
  if (!active) return null;

  return (
    <div className={className} style={slider.swipeStyle} {...slider.bind}>
      <ClassicFeatureCard n={active} accent={accent} hmCategoryColors={hmCategoryColors} large />
      {sliderItems.length > 1 ? (
        <div className={tabsClassName}>
          {sliderItems.slice(0, maxTabs).map((item, index) => (
            <button
              key={item.id ?? item.slug ?? index}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                slider.setIndex(index);
              }}
              style={{ background: index === activeIndex ? accent : undefined }}
              aria-label={`${index + 1}. manşet`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ClassicCompactCard({
  n,
  accent,
  hmCategoryColors,
  horizontal = false,
}: {
  n: any;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  horizontal?: boolean;
}) {
  const h = useHmPublicHref();
  const color = catColor(n, accent, hmCategoryColors);
  return (
    <Link href={hybridNewsItemHref(n, h)} className={`hm-classic-compact-card ${horizontal ? "hm-classic-compact-card--horizontal" : ""}`}>
      <ClassicImage n={n} />
      <div className="hm-classic-compact-body">
        <ClassicBadge label={n.categoryName} color={color} />
        <h3>{newsDisplayTitle(n.title)}</h3>
        <time>{fmtDate(n.createdAt)}</time>
      </div>
    </Link>
  );
}

function ClassicTextList({
  title,
  items,
  accent,
  href,
  className = "",
}: {
  title: string;
  items: any[];
  accent: string;
  href?: string;
  className?: string;
}) {
  const h = useHmPublicHref();
  if (!items.length) return null;
  return (
    <section className={`hm-classic-widget ${className}`.trim()}>
      <ClassicSectionTitle title={title} href={href} accent={accent} />
      <div className="hm-classic-text-list">
        {items.map((n, index) => (
          <Link key={n.id ?? n.slug ?? `${title}-${index}`} href={hybridNewsItemHref(n, h)} className="hm-classic-text-row">
            <span style={{ color: index < 3 ? accent : undefined }}>{String(index + 1).padStart(2, "0")}</span>
            <strong>{newsDisplayTitle(n.title)}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ClassicAuthorsWidget({ authors, yazarlarHref, accent }: { authors: any[]; yazarlarHref: string; accent: string }) {
  const h = useHmPublicHref();
  if (!authors.length) return null;
  return (
    <section className="hm-classic-widget">
      <ClassicSectionTitle title="Yazarlar" href={yazarlarHref} accent={accent} />
      <div className="hm-classic-authors">
        {authors.slice(0, 5).map((a) => (
          <Link key={a.id ?? a.name} href={h(`/yazar/${a.id}`)} className="hm-classic-author-row">
            {a.avatarUrl ? (
              <img src={vitrinImgSrc(a.avatarUrl)} alt={a.name} />
            ) : (
              <span style={{ background: accent }}>{String(a.name ?? "Y").charAt(0)}</span>
            )}
            <span>
              <strong>{a.name}</strong>
              {a.latestArticle?.title || a.title ? <em>{a.latestArticle?.title ?? a.title}</em> : null}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ClassicCategoryLinks({
  cats,
  siteId,
  accent,
}: {
  cats: any[];
  siteId?: number | null;
  accent: string;
}) {
  const h = useHmPublicHref();
  if (!cats.length) return null;
  return (
    <section className="hm-classic-widget">
      <ClassicSectionTitle title="Kategoriler" accent={accent} />
      <div className="hm-classic-cat-links">
        {cats.slice(0, 12).map((c: any) => (
          <Link
            key={c.slug}
            href={h(siteId != null ? `/kategori/${c.slug}?siteId=${encodeURIComponent(String(siteId))}` : `/kategori/${c.slug}`)}
          >
            {c.name || c.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ÔöÇÔöÇ Main ÔöÇÔöÇ */
const NEWS_CATS = [
  { label: "Tümü", slug: "" },
  ...HM_STANDARD_NEWS_CATEGORIES,
  { label: "Kültür", slug: "kultur" },
  { label: "Yaşam", slug: "yasam" },
  { label: "Sağlık", slug: "saglik" },
];

export type HaberAnasayfasiProps = {
  /** `/tr/:slug` içinden: URL `siteId` yerine bu siteye sabitlenmiş haber vitrini */
  fixedSiteId?: number | null;
  /** HM `layout_json` — sunucudaki manşet düzeni vb. (localStorage yerine) */
  serverLayoutPrefs?: NewsSiteLayoutPrefs | null;
  /** Üst Yekpare AppNav yok; sticky offset 0 */
  hmBareChrome?: boolean;
  /** HM alt sayfa linkleri için slug */
  hmSlug?: string | null;
};

export default function HaberAnasayfasi(props: HaberAnasayfasiProps = {}) {
  const {
    fixedSiteId: fixedSiteIdProp,
    serverLayoutPrefs: serverLayoutPrefsProp,
    hmBareChrome = false,
    hmSlug: hmSlugProp,
  } = props;
  const hmCtx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const siteIdFromUrl = useSiteIdQueryParam();
  const queryClient = useQueryClient();

  const siteId =
    fixedSiteIdProp != null && fixedSiteIdProp > 0
      ? fixedSiteIdProp
      : hmCtx?.siteId ?? siteIdFromUrl;

  useEffect(() => {
    if (hmCtx != null || fixedSiteIdProp != null) return;
    resetSeoToSiteDefaults();
  }, [hmCtx, fixedSiteIdProp]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLayoutUpdated = () => {
      if (hmCtx != null || fixedSiteIdProp != null) return;
      void queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
    };
    window.addEventListener(HM_LAYOUT_UPDATED_EVENT, onLayoutUpdated);
    return () => window.removeEventListener(HM_LAYOUT_UPDATED_EVENT, onLayoutUpdated);
  }, [queryClient, hmCtx, fixedSiteIdProp]);

  /** Hem HM vitrin (`?hmTab=`) hem portal `/haberler?hmTab=` — tek kaynak URL (yenilemede kaybolmaz). */
  const activeTab = useHmTabQueryParam();
  const [featuredCategorySlug, setFeaturedCategorySlug] = useState(activeTab || "");
  /** Her sayfa yüklemesinde manşet lead rotasyonu (en güncel haberler arasında). */
  const [headlineVisitSeed] = useState(() => createHeadlineVisitSeed());
  const [homeBootstrapDeadlinePassed, setHomeBootstrapDeadlinePassed] = useState(false);
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  const markBelowFoldReady = useCallback(() => {
    setBelowFoldReady((prev) => (prev ? prev : true));
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => markBelowFoldReady(), { timeout: 2200 });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => markBelowFoldReady(), 900);
    return () => window.clearTimeout(id);
  }, [markBelowFoldReady]);
  // KRİTİK: Sonsuz "Haberler yükleniyor" güvenlik ağı. Bu zaman aşımı TEK sefer, mount'ta
  // kurulur ve `siteId` değişiminden ETKİLENMEZ. Önceden effect `[siteId]`'e bağlıydı; site
  // bağlamı (hmCtx) yeniden render olduğunda siteId kimliği oynayınca timer her seferinde
  // temizlenip yeniden kuruluyor ve deadline HİÇ dolmuyordu → skeleton sonsuza kadar kalıyordu
  // (kategori kutuları da bu bayrağın arkasına kilitliydi). Artık deadline her koşulda dolar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => setHomeBootstrapDeadlinePassed(true), HM_HOME_NEWS_BOOTSTRAP_MAX_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setFeaturedCategorySlug(activeTab || "");
  }, [activeTab]);
  const { data: settings } = useGetSiteSettings();
  const localLayoutPrefs = useNewsSiteLayoutPrefs();
  const isPortalHaberler = hmCtx == null && fixedSiteIdProp == null;
  const portalLayoutPrefs = useMemo((): NewsSiteLayoutPrefs | null => {
    if (!isPortalHaberler || serverLayoutPrefsProp != null) return null;
    const raw = settings?.newsLayoutJson ?? null;
    if (raw) return parseNewsSiteLayoutFromJson(raw, null);
    return { ...defaultNewsSiteLayoutPrefs };
  }, [isPortalHaberler, serverLayoutPrefsProp, settings?.newsLayoutJson]);
  /** Portal: sunucu vitrini kullan; eski localStorage eski/bozuk grid'i geri getirmesin. */
  const layoutPrefs =
    serverLayoutPrefsProp ??
    hmCtx?.layoutPrefs ??
    portalLayoutPrefs ??
    (isPortalHaberler ? { ...defaultNewsSiteLayoutPrefs } : localLayoutPrefs);
  const hmVitrinContentShell = (extra?: string) =>
    hmCtx
      ? hmSiteContentShellClass(layoutPrefs, extra)
      : `mx-auto max-w-screen-xl px-3${extra ? ` ${extra}` : ""}`;
  const corporateDonation = layoutPrefs.hmCorporateDonation ?? null;
  const vitrinTheme = normalizeHmVitrinTheme(layoutPrefs.hmVitrinTheme);
  const themeAccentFallback = hmVitrinAccentHex(vitrinTheme ?? "default");
  const fromLpColor =
    (layoutPrefs.hmPrimaryColor?.trim() ?? "").length >= 3 ? layoutPrefs.hmPrimaryColor!.trim() : "";
  const accent =
    fromLpColor ||
    themeAccentFallback ||
    resolveSadeAccent(settings?.primaryColor) ||
    DEFAULT_RED;
  const isCorporateTheme = vitrinTheme === "corporate";
  const isClassicTheme = vitrinTheme === "classic";
  const isPortal3Theme = vitrinTheme === "portal3";
  const isEsenTheme = vitrinTheme === "esen";
  /** Portal `/haberler` — `hmRssNewsBand.css` yalnızca `[data-hm-vitrin-theme]` altında; HM'de üst `hm-vitrin-root` verir. */
  const vitrinThemeAttr =
    vitrinTheme === "corporate"
      ? "corporate"
      : vitrinTheme === "gold"
        ? "gold"
        : vitrinTheme === "ankara"
          ? "ankara"
          : vitrinTheme === "classic"
            ? "classic"
            : vitrinTheme === "portal3"
              ? "portal3"
              : vitrinTheme === "esen"
                ? "esen"
                : vitrinTheme === "manset24"
                  ? "manset24"
                  : vitrinTheme === "renkli"
                    ? "renkli"
                    : vitrinTheme === "ahenkhaber"
                          ? "ahenkhaber"
                          : vitrinTheme === "modern"
                            ? "modern"
                            : vitrinTheme === "sumbul"
                              ? "sumbul"
                            : "news";
  const isAhenkHaberTheme = vitrinTheme === "ahenkhaber";
  const hmCat = layoutPrefs.hmCategoryColors ?? null;
  const hmHybridRssEnabled = siteId != null && isHmHybridRssEnabled(layoutPrefs);
  const hmHybridNewsFetchEnabled = siteId != null && !isCorporateTheme && resolveHmHomeHybridNewsFetchEnabled(layoutPrefs, siteId);
  const hmYekparePoolReceiveEnabled = resolveHmYekparePoolReceiveEnabled(layoutPrefs);
  const newsSliderEnabled = layoutPrefs.hmNewsSliderEnabled !== false;
  const tepeMansetEnabled = layoutPrefs.hmNewsTepeMansetEnabled === true;
  const rssHeadlineEnabled = layoutPrefs.hmNewsRssHeadlineEnabled !== false;
  const newsBandEnabled = layoutPrefs.hmNewsBreakingBandEnabled !== false;
  const mansetCategorySlug = String(layoutPrefs.mansetCategorySlug ?? "").trim() || null;
  const externalSondakikaEnabled = resolveExternalSondakikaEnabled(layoutPrefs, {
    siteId,
    mansetVariant: layoutPrefs.mansetVariant,
  });
  const effectiveNewsBandEnabled = newsBandEnabled && externalSondakikaEnabled;
  const googleNewsBandEnabled = layoutPrefs.hmNewsGoogleNewsBandEnabled === true;
  const newsCategorySectionsEnabled = layoutPrefs.hmNewsCategorySectionsEnabled !== false;
  const newsQuickLinksEnabled = layoutPrefs.hmNewsQuickLinksEnabled !== false;
  const newsAuthorsEnabled = resolveHmNewsAnyAuthorsEnabled(layoutPrefs);
  const newsHorizontalAuthorsEnabled = resolveHmNewsHorizontalAuthorsEnabled(layoutPrefs);
  const newsSidebarAuthorsEnabled = resolveHmNewsSidebarAuthorsEnabled(layoutPrefs);
  const corporateAuthorsEnabled = layoutPrefs.hmCorporateAuthorsEnabled === true;
  const newsSidebarEnabled = layoutPrefs.hmNewsSidebarEnabled !== false;
  const latestGridMainEnabled = resolveHmNewsLatestGridMainEnabled(layoutPrefs);
  const latestGridSidebarBoxEnabled = resolveHmNewsLatestGridSidebarEnabled(layoutPrefs);
  const newsSidebarCategoriesEnabled = layoutPrefs.hmNewsSidebarCategoriesEnabled !== false;
  const newsSidebarMenuItems = (layoutPrefs.hmNewsSidebarMenuItems ?? [])
    .filter((item) => item.enabled !== false && item.label.trim() && item.href.trim())
    .slice(0, 12);
  const navTop = hmBareChrome ? 0 : APP_NAV_HEIGHT;
  const [homeAdsReady, setHomeAdsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) setHomeAdsReady(true);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2_000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const timer = window.setTimeout(run, 2_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);
  const { data: adSlots = [] } = useQuery({
    ...getListAdsQueryOptions(),
    enabled: homeAdsReady,
  });
  const mansetBelowHtml = useMemo(
    () => resolveHmOrGlobalSlotHtml(siteId, layoutPrefs, "manset_alti", adSlots),
    [siteId, layoutPrefs, adSlots],
  );
  const homeMiddleHtml = useMemo(
    () => resolveHmOrGlobalSlotHtml(siteId, layoutPrefs, "home_middle", adSlots),
    [siteId, layoutPrefs, adSlots],
  );
  const sidebarTopHtml = useMemo(
    () => resolveHmOrGlobalSlotHtml(siteId, layoutPrefs, "sidebar_top", adSlots),
    [siteId, layoutPrefs, adSlots],
  );
  const financeBg = "var(--hm-ticker-bg, #0F172A)";

  /** P1-1: HM anasayfa featured + breaking + popular tek istek. */
  const hmHomeBundleEnabled = siteId != null && !isCorporateTheme;
  const { data: hmHomeBundle } = useQuery<{
    siteId: number;
    featured: any[];
    manualEditor?: any[];
    centerHeadlines?: any[];
    breaking: any[];
    popular: any[];
  }>({
    queryKey: ["/api/hm/home-bundle", siteId, HM_HOME_HEADLINE_SLIDER_MIN, mansetCategorySlug ?? ""],
    queryFn: () => {
      const qs = new URLSearchParams({
        siteId: String(siteId),
        sliderLimit: String(HM_HOME_HEADLINE_SLIDER_MIN),
      });
      if (mansetCategorySlug) qs.set("mansetCategorySlug", mansetCategorySlug);
      return apiRequest(`/api/hm/home-bundle?${qs.toString()}`);
    },
    staleTime: 2 * 60 * 1000,
    enabled: hmHomeBundleEnabled,
  });
  const useHmHomeBundle = Boolean(hmHomeBundle);

  /* Slider / featured */
  const { data: featuredGlobal = [] } = useQuery<any[]>({
    queryKey: ["/api/news/featured", HM_HOME_HEADLINE_SLIDER_LIMIT],
    queryFn: () => apiRequest(`/api/news/featured?limit=${HM_HOME_HEADLINE_SLIDER_LIMIT}`),
    staleTime: 2 * 60 * 1000,
    enabled: !isCorporateTheme && newsSliderEnabled && siteId == null,
  });

  /** Tepe Manşet: yalnızca `isFeatured` (strict API — son haber yedeklemesi yok). */
  const { data: tepeFeaturedStrict = [] } = useQuery<any[]>({
    queryKey: ["/api/news/tepe-featured", siteId ?? "portal"],
    queryFn: async () => {
      const qs =
        siteId != null
          ? `siteId=${encodeURIComponent(String(siteId))}&strict=1&limit=20`
          : "strict=1&limit=20";
      const rows = (await apiRequest(`/api/news/featured?${qs}`)) as any[];
      if (!Array.isArray(rows)) return [];
      return rows.filter((x) => !isBlogCategoryNews(x) && !isKoseArticle(x));
    },
    staleTime: 2 * 60 * 1000,
    enabled: tepeMansetEnabled && !isCorporateTheme,
  });

  const { data: featuredHm = [] } = useQuery<any[]>({
    queryKey: ["/api/news/hm-slider", siteId, hmHybridRssEnabled ? "hybrid" : "db", rssHeadlineEnabled ? "rss" : "manset"],
    queryFn: async () => {
      const featured = (await apiRequest(
        `/api/news/featured?siteId=${encodeURIComponent(String(siteId))}&strict=1&limit=${HM_HOME_HEADLINE_SLIDER_LIMIT}`,
      )) as any[];
      const pool: any[] = [];
      const pushNoBlog = (arr: any[]) => {
        for (const x of arr) {
          if (isBlogCategoryNews(x) || isKoseArticle(x)) continue;
          pool.push(x);
          if (pool.length >= HM_HOME_HEADLINE_SLIDER_LIMIT * 2) break;
        }
      };
      pushNoBlog(Array.isArray(featured) ? featured : []);
      if (!rssHeadlineEnabled) {
        return mergeUniqueNews(pool).slice(0, HM_HOME_HEADLINE_SLIDER_LIMIT);
      }
      if (pool.length < HM_HOME_HEADLINE_SLIDER_LIMIT) {
        const [newsPage, hybridRows] = await Promise.all([
          fetchPublicNewsList(`/api/news?siteId=${siteId}&status=published&limit=80`),
          hmHybridRssEnabled && siteId != null
            ? queryClient.fetchQuery({
                queryKey: hmHomeHybridBootstrapQueryKey(siteId, "hero"),
                // Manşet slider'ı üst-katlama; DB-first havuzla doldur, RSS ısınmasını bekleme.
                queryFn: () =>
                  fetchHybridNewsList({
                    siteId,
                    limit: HM_HOME_HYBRID_HERO_LIMIT,
                    offset: 0,
                    rssScope: "all",
                    dbFirst: true,
                    timeoutMs: 8_000,
                    retries: 0,
                  }),
                staleTime: 2 * 60 * 1000,
              })
            : Promise.resolve([]),
        ]);
        pushNoBlog(newsPage?.items ?? []);
        if (pool.length < HM_HOME_HEADLINE_SLIDER_LIMIT) {
          pushNoBlog(hybridRows.map(mapHybridNewsToBandItem));
        }
      }
      return mergeUniqueNews(pool).slice(0, HM_HOME_HEADLINE_SLIDER_LIMIT);
    },
    staleTime: 2 * 60 * 1000,
    enabled: !isCorporateTheme && newsSliderEnabled && siteId != null && !(useHmHomeBundle && !rssHeadlineEnabled),
  });

  const featuredHmFromBundle = useHmHomeBundle && !rssHeadlineEnabled ? asArray(hmHomeBundle?.featured) : null;
  const featuredHmResolved = featuredHmFromBundle ?? featuredHm;

  const featured = useMemo(
    () => (newsSliderEnabled ? asArray(siteId != null ? featuredHmResolved : featuredGlobal) : []),
    [newsSliderEnabled, siteId, featuredHmResolved, featuredGlobal],
  );

  /** Kurumsal vitrin manşeti: yalnızca isFeatured=true (RSS otomatik doldurma yok). */
  const { data: corporateFeaturedNews = [] } = useQuery<any[]>({
    queryKey: ["/api/news/featured-strict", siteId],
    queryFn: async () => {
      const featured = (await apiRequest(
        `/api/news/featured?siteId=${encodeURIComponent(String(siteId))}&strict=1&includeHiddenCategories=1`,
      )) as any[];
      return Array.isArray(featured) ? featured : [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: isCorporateTheme && siteId != null,
  });

  /* Breaking */
  const { data: breakingGlobal = [] } = useQuery<any[]>({
    queryKey: ["/api/news/breaking"],
    queryFn: () => apiRequest("/api/news/breaking"),
    staleTime: 60 * 1000,
    enabled: !isCorporateTheme && effectiveNewsBandEnabled && siteId == null,
  });

  const { data: breakingHm = [] } = useQuery<any[]>({
    queryKey: ["/api/news/hm-breaking", siteId],
    queryFn: async () => {
      const j = await fetchPublicNewsList(`/api/news?siteId=${siteId}&status=published&limit=40`);
      const items = j?.items ?? [];
      const breakingItems = items.filter((x) => x.isBreaking).slice(0, 15);
      return breakingItems.length > 0 ? breakingItems : items.slice(0, 15);
    },
    staleTime: 60 * 1000,
    enabled: !isCorporateTheme && effectiveNewsBandEnabled && siteId != null && !useHmHomeBundle,
  });

  const breakingHmResolved = useHmHomeBundle ? asArray(hmHomeBundle?.breaking) : breakingHm;

  const breaking = useMemo(
    () => (effectiveNewsBandEnabled ? asArray(siteId != null ? breakingHmResolved : breakingGlobal) : []),
    [effectiveNewsBandEnabled, siteId, breakingHmResolved, breakingGlobal],
  );

  const useHybridHomeNewsPool = hmHybridNewsFetchEnabled && siteId != null;
  const deferBelowFoldFetches = !belowFoldReady && !homeBootstrapDeadlinePassed;
  const {
    data: hybridBootstrapHero = [],
    isPending: hybridBootstrapHeroPending,
    isError: hybridBootstrapHeroError,
  } = useHmHomeHybridBootstrapHero(siteId, useHybridHomeNewsPool);
  const {
    data: hybridBootstrapFull = [],
    isPending: hybridBootstrapFullPending,
    isError: hybridBootstrapFullError,
  } = useHmHomeHybridBootstrapFull(siteId, useHybridHomeNewsPool, deferBelowFoldFetches);
  const hybridBootstrap = useMemo(
    () => mergeUniqueNews(hybridBootstrapHero, hybridBootstrapFull),
    [hybridBootstrapHero, hybridBootstrapFull],
  );
  const hybridBootstrapPending = hybridBootstrapHeroPending || (belowFoldReady && hybridBootstrapFullPending);
  const hybridBootstrapError = hybridBootstrapHeroError || hybridBootstrapFullError;

  const hybridBandItems = useMemo(
    () => (useHybridHomeNewsPool ? hybridBootstrap.map(mapHybridNewsToBandItem) : []),
    [useHybridHomeNewsPool, hybridBootstrap],
  );
  const hybridHeadlineReady = useHybridHomeNewsPool && hybridBandItems.length > 0;

  const { data: yekparePoolHybrid = [] } = useQuery({
    queryKey: ["/api/news/hybrid", "yekpare-pool-manset-side", siteId ?? "none", mansetCategorySlug ?? ""],
    queryFn: () =>
      fetchHybridNewsList({
        siteId,
        yekparePool: true,
        categorySlug: mansetCategorySlug ?? undefined,
        limit: 40,
        dbFirst: true,
        timeoutMs: 8_000,
        retries: 0,
      }),
    staleTime: 2 * 60 * 1000,
    enabled: siteId != null && !isCorporateTheme && newsSliderEnabled && hmYekparePoolReceiveEnabled,
  });
  const yekparePoolSideItems = useMemo(
    () => sortNewsByRecency(yekparePoolHybrid.map(mapHybridNewsToBandItem)),
    [yekparePoolHybrid],
  );

  /* Latest (sayfa hmTab filtresi — manşet / üst bloklar) */
  const heroLatestLimit = activeTab
    ? 40
    : Math.max(newsSidebarEnabled ? 45 : 50, HM_HOME_HEADLINE_SLIDER_LIMIT);
  const fullLatestLimit = activeTab
    ? 40
    : Math.max(newsSidebarEnabled ? 60 : 80, HM_HOME_HEADLINE_SLIDER_LIMIT);
  const latestFetchLimit = deferBelowFoldFetches ? heroLatestLimit : fullLatestLimit;
  const latestBandFetchReady = belowFoldReady || homeBootstrapDeadlinePassed;
  const {
    data: latestDb,
    isPending: latestDbPending,
    isError: latestDbError,
  } = useQuery<any>({
    queryKey: ["/api/news/latest", activeTab, siteId, "db", latestFetchLimit],
    queryFn: async () => {
      const cat = activeTab ? `&categorySlug=${encodeURIComponent(activeTab)}` : "";
      if (isCorporateTheme && siteId != null) {
        return fetchCorporateDbNewsForSite(siteId, `&limit=${latestFetchLimit}&offset=0&status=published${cat}`);
      }
      return siteId != null
        ? fetchPublicNewsList(`/api/news?siteId=${siteId}&limit=${latestFetchLimit}&offset=0&status=published${cat}`)
        : fetchPublicNewsList(`/api/news?siteScope=portal&limit=${latestFetchLimit}&offset=0&status=published${cat}`);
    },
    staleTime: 2 * 60 * 1000,
  });

  /** Sol RSS haber bandı: kategori sekmeleri tüm yayınlanmş haberlerden filtreler (hmTab'tan başımsız). */
  const {
    data: latestBandDb,
    isPending: latestBandDbPending,
    isError: latestBandDbError,
  } = useQuery<any>({
    queryKey: ["/api/news/latest", "rss-band", siteId ?? "portal", "db"],
    queryFn: async () => {
      const limit = 80;
      if (isCorporateTheme && siteId != null) {
        return fetchCorporateDbNewsForSite(siteId, `&limit=${limit}&offset=0&status=published`);
      }
      return siteId != null
        ? fetchPublicNewsList(`/api/news?siteId=${siteId}&limit=${limit}&offset=0&status=published`)
        : fetchPublicNewsList(`/api/news?siteScope=portal&limit=${limit}&offset=0&status=published`);
    },
    staleTime: 2 * 60 * 1000,
    enabled: latestBandFetchReady,
  });

  const latest = useMemo(() => {
    const limit = activeTab ? 40 : Math.max(newsSidebarEnabled ? 60 : 80, HM_HOME_HEADLINE_SLIDER_LIMIT);
    const dbItems = asArray((latestDb as { items?: unknown })?.items);
    let items = dbItems;
    if (useHybridHomeNewsPool && hybridHeadlineReady) {
      items = mergeUniqueNews(dbItems, hybridBandItems);
    }
    if (activeTab) {
      items = items.filter(
        (item) =>
          newsItemMatchesCategorySlug(item, activeTab) ||
          hmNewsItemMatchesHomeCategorySlug(item, activeTab, {
            knownCanonicalSlugs: new Set<string>(),
            siteSlugPrefixes: [],
            rssFeedRows: resolveHmUnifiedRssFeedRows(layoutPrefs),
          }),
      );
    }
    return { items: items.slice(0, limit) };
  }, [
    useHybridHomeNewsPool,
    hybridHeadlineReady,
    hybridBandItems,
    latestDb,
    activeTab,
    newsSidebarEnabled,
    layoutPrefs,
  ]);

  const latestBandRaw = useMemo(() => {
    const dbItems = asArray((latestBandDb as { items?: unknown })?.items);
    if (!useHybridHomeNewsPool) return latestBandDb;
    const items = hybridHeadlineReady
      ? mergeUniqueNews(dbItems, hybridBandItems)
      : dbItems;
    return { items: items.slice(0, 80) };
  }, [useHybridHomeNewsPool, hybridHeadlineReady, hybridBandItems, latestBandDb]);

  const dbNewsReady = useMemo(
    () =>
      mergeUniqueNews(
        asArray((latestDb as { items?: unknown })?.items),
        asArray((latestBandDb as { items?: unknown })?.items),
      ).length > 0,
    [latestDb, latestBandDb],
  );

  const latestMergedHasItems = useMemo(
    () =>
      mergeUniqueNews(
        asArray((latestDb as { items?: unknown })?.items),
        asArray((latestBandDb as { items?: unknown })?.items),
        hybridHeadlineReady ? hybridBandItems : [],
      ).length > 0,
    [latestDb, latestBandDb, hybridHeadlineReady, hybridBandItems],
  );

  // Bootstrap süresi dolduğunda yükleme durumunu zorla kapat — hiçbir zaman sonsuz "Haberler yükleniyor" gösterme.
  const latestPending =
    dbNewsReady || latestMergedHasItems || hybridHeadlineReady || homeBootstrapDeadlinePassed ? false : latestDbPending;
  const latestBandPending =
    dbNewsReady || latestMergedHasItems || hybridHeadlineReady || homeBootstrapDeadlinePassed ? false : latestBandDbPending;
  const latestError = useHybridHomeNewsPool ? hybridBootstrapError && latestDbError : latestDbError;
  const latestBandError = useHybridHomeNewsPool ? hybridBootstrapError && latestBandDbError : latestBandDbError;

  /* Popular */
  const { data: popularGlobal = [] } = useQuery<any[]>({
    queryKey: ["/api/news/popular"],
    queryFn: () => apiRequest("/api/news/popular"),
    staleTime: 5 * 60 * 1000,
    enabled: siteId == null,
  });

  const { data: popularHm = [] } = useQuery<any[]>({
    queryKey: ["/api/news/popular", "hm", siteId],
    queryFn: () =>
      apiRequest(`/api/news/popular?siteId=${encodeURIComponent(String(siteId))}&limit=12`) as Promise<any[]>,
    staleTime: 5 * 60 * 1000,
    enabled: siteId != null && !useHmHomeBundle && latestBandFetchReady,
  });

  const popularHmResolved = useHmHomeBundle ? asArray(hmHomeBundle?.popular) : popularHm;

  const popular = useMemo(
    () => asArray(siteId != null ? popularHmResolved : popularGlobal),
    [siteId, popularHmResolved, popularGlobal],
  );

  /* Authors */
  const { data: authorsData } = useQuery<any>({
    queryKey: ["/api/authors", siteId ?? "global"],
    queryFn: () =>
      siteId != null
        ? apiRequest(`/api/authors?hmSiteId=${encodeURIComponent(String(siteId))}`)
        : apiRequest("/api/authors?limit=10"),
    staleTime: 10 * 60 * 1000,
    enabled: isCorporateTheme ? corporateAuthorsEnabled : newsAuthorsEnabled,
  });
  const { data: globalAuthorsFallbackData } = useQuery<any>({
    queryKey: ["/api/authors", "global-fallback", siteId ?? "portal"],
    queryFn: () => apiRequest("/api/authors?limit=10"),
    staleTime: 10 * 60 * 1000,
    enabled: siteId != null && (isCorporateTheme ? corporateAuthorsEnabled : newsAuthorsEnabled),
  });

  /* Categories */
  const { data: apiCats = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", siteId ?? "portal"],
    queryFn: () =>
      siteId != null
        ? (apiRequest(`/api/categories?siteId=${encodeURIComponent(String(siteId))}`) as Promise<any[]>)
        : apiRequest("/api/categories"),
    staleTime: 10 * 60 * 1000,
  });

  const allItems = useMemo(() => asArray((latest as { items?: unknown })?.items), [latest]);
  const bandNewsItems = useMemo(() => asArray((latestBandRaw as { items?: unknown })?.items), [latestBandRaw]);
  const tepeMansetItems = useMemo(() => {
    if (!tepeMansetEnabled) return [];
    const pool = buildTepeMansetPool({
      items: tepeFeaturedStrict,
      limit: HM_TEPE_MANSET_ITEM_COUNT,
    });
    const withCover = filterNewsItemsWithCoverImage(pool);
    return withCover.slice(0, HM_TEPE_MANSET_ITEM_COUNT);
  }, [tepeMansetEnabled, tepeFeaturedStrict]);
  const tepeMansetActive = tepeMansetEnabled && tepeMansetItems.length > 0;
  const manualHeadlinePool = useMemo(
    () => buildManualHeadlineOnlyPool({ manualItems: featured, latestItems: allItems, limit: HM_HOME_HEADLINE_SLIDER_LIMIT }),
    [featured, allItems],
  );
  const centerMansetSliderItems = useMemo(() => {
    // Orta (site) manşet: isSiteManset varsa onlar; yoksa en son eklenenler.
    // Bundle/featured manşet etiketi buraya girmez (tepe manşet isFeatured’e özel).
    const pool = filterNewsItemsWithCoverImage(
      buildCenterMansetSliderPool({
        manualItems: [],
        latestItems: allItems,
        categorySlug: mansetCategorySlug,
        limit: HM_HOME_HEADLINE_SLIDER_LIMIT,
      }),
    );
    return tepeMansetActive ? excludeHeadlineSliderItems(pool, tepeMansetItems) : pool;
  }, [allItems, mansetCategorySlug, tepeMansetActive, tepeMansetItems]);
  const mansetTaggedSideFallbackItems = useMemo(
    () =>
      sortNewsByRecency(
        mergeUniqueNews(allItems).filter(
          (item) =>
            !isRssHybridItem(item) &&
            (item as { isFeatured?: boolean }).isFeatured !== true,
        ),
      ),
    [allItems],
  );
  const sliderNews = useMemo(() => {
    let pool: any[];
    if (!newsSliderEnabled) return [];
    if (activeTab) {
      pool = sortNewsByRecency(allItems).slice(0, HM_HOME_HEADLINE_SLIDER_LIMIT);
    } else if (siteId != null) {
      // HM editör siteleri: normal manşet = en son eklenen haberler (RSS / isFeatured yok).
      pool = centerMansetSliderItems;
    } else {
      pool = buildRssAwareHeadlinePool({
        manualItems: featured,
        latestItems: allItems,
        rssEnabled: rssHeadlineEnabled && (siteId == null || hmHybridRssEnabled),
        rssBootstrapReady: hybridHeadlineReady,
        limit: HM_HOME_HEADLINE_SLIDER_LIMIT,
        minManual: 3,
        visitSeed: headlineVisitSeed,
      });
    }
    return tepeMansetActive ? excludeHeadlineSliderItems(pool, tepeMansetItems) : pool;
  }, [featured, allItems, siteId, newsSliderEnabled, activeTab, rssHeadlineEnabled, hmHybridRssEnabled, hybridHeadlineReady, headlineVisitSeed, centerMansetSliderItems, tepeMansetActive, tepeMansetItems]);
  const sliderSide = useMemo(() => {
    const slideKeys = sliderHeadlineKeys(sliderNews);
    const pool: any[] = [];
    const seen = new Set<string>(slideKeys);
    const push = (n: any) => {
      const aliases = homeNewsAliasKeys(n);
      if (aliases.length === 0 || aliases.some((key) => seen.has(key))) return;
      for (const key of aliases) seen.add(key);
      pool.push(n);
    };

    // Yan kartlar: yeniden eskiye; manşet etiketli (tepe) haberler dahil edilmez.
    const sideSource =
      siteId != null
        ? sortNewsByRecency(
            mergeUniqueNews(allItems).filter(
              (item) =>
                !isRssHybridItem(item) &&
                (item as { isFeatured?: boolean }).isFeatured !== true,
            ),
          )
        : mergeUniqueNews(featured, allItems).filter((item) => !isRssHybridItem(item)).filter(isHeadlineFreshEnough);
    sideSource
      .filter((item) => !homeNewsAliasKeys(item).some((key) => slideKeys.has(key)))
      .slice(0, 6)
      .forEach(push);
    if (siteId == null) {
      mergeUniqueNews(breaking, allItems, featured).filter(isHeadlineFreshEnough).forEach(push);
    }
    const trimmed = pool.slice(0, 6);
    return tepeMansetActive ? excludeHeadlineSliderItems(trimmed, tepeMansetItems) : trimmed;
  }, [sliderNews, allItems, featured, breaking, siteId, tepeMansetActive, tepeMansetItems]);
  const authors: any[] = useMemo(() => {
    const d = authorsData as any;
    const primary = Array.isArray(d) ? d : asArray(d?.authors);
    const fallback = Array.isArray(globalAuthorsFallbackData)
      ? globalAuthorsFallbackData
      : asArray(globalAuthorsFallbackData?.authors);
    const raw = primary.length > 0 ? primary : fallback;
    const out = new Map<string, any>();
    for (const a of raw) {
      const key = String(a?.name ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
      if (!key) continue;
      const prev = out.get(key);
      const prevScore = prev ? (prev.avatarUrl ? 2 : 0) + (prev.latestArticle ? 2 : 0) + (prev.title ? 1 : 0) : -1;
      const nextScore = (a?.avatarUrl ? 2 : 0) + (a?.latestArticle ? 2 : 0) + (a?.title ? 1 : 0);
      if (!prev || nextScore > prevScore) out.set(key, a);
    }
    return Array.from(out.values());
  }, [authorsData, globalAuthorsFallbackData]);
  const esenAuthorsScrollRef = useRef<HTMLDivElement>(null);
  const scrollEsenAuthors = useCallback((direction: -1 | 1) => {
    esenAuthorsScrollRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }, []);
  const navHiddenSet = useMemo(() => resolveHmPublicHiddenCategorySlugs(layoutPrefs), [layoutPrefs]);
  const safeApiCats = useMemo(() => asArray(apiCats), [apiCats]);
  const publicApiCats = useMemo(
    () =>
      filterHmPublicCategoryRows(
        safeApiCats as Array<{ slug?: string; exclusiveSiteId?: number | null }>,
        layoutPrefs,
        siteId ?? null,
        hmSlugProp ?? hmCtx?.slug ?? null,
      ),
    [hmCtx?.slug, hmSlugProp, layoutPrefs, safeApiCats, siteId],
  );
  const activeGlobalSlugs = useMemo(() => {
    const globals = safeApiCats
      .filter((c: any) => c.exclusiveSiteId == null)
      .map((c: any) => normalizeNewsCategorySlug(c.slug))
      .filter(Boolean);
    return resolveHmPublicActiveGlobalSlugs(layoutPrefs, globals);
  }, [layoutPrefs, safeApiCats]);
  const cats = useMemo(() => {
    const apiRows = publicApiCats.map((c: any) => ({
      label: String(c.name ?? c.slug ?? "").trim() || String(c.slug ?? ""),
      slug: normalizeNewsCategorySlug(c.slug),
      sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : null,
    }));
    const source = !isCorporateTheme
      ? mergeHmStandardNewsCategoryRows(apiRows, { hiddenSlugs: navHiddenSet, activeGlobalSlugs })
      : apiRows.length > 0
        ? apiRows
        : NEWS_CATS.slice(1).map((c) => ({ label: c.label, slug: c.slug, sortOrder: null }));
    return source.filter((c) => c.slug && !navHiddenSet.has(c.slug));
  }, [publicApiCats, activeGlobalSlugs, isCorporateTheme, navHiddenSet]);

  /** HM vitrininde API + RSS kategorileri, `Tüm Haberler` sayfasındaki tekilleştirme mantışıyla. */
  const tabStripCatsRaw = useMemo((): HmRssCategoryTab[] => {
    const bySlug = new Map<string, { label: string; slug: string; sortOrder: number | null }>();
    const dbRows = publicApiCats.map((c: any) => ({
      label: String(c.name ?? c.slug ?? "").trim() || String(c.slug ?? ""),
      slug: hmCategorySlug(c.slug, c.name),
      sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : null,
    }));

    let seededRows = dbRows.filter((c) => c.slug.length > 0 && !navHiddenSet.has(c.slug));
    if (!isCorporateTheme) {
      seededRows = mergeHmStandardNewsCategoryRows(
        seededRows.map((c) => ({
          label: c.label,
          slug: normalizeNewsCategorySlug(c.slug) || c.slug,
          sortOrder: c.sortOrder,
        })),
        { hiddenSlugs: navHiddenSet, activeGlobalSlugs },
      ).map((c) => ({ label: c.label, slug: hmCategorySlug(c.slug, c.label), sortOrder: c.sortOrder ?? null }));
    } else if (seededRows.length === 0) {
      seededRows = NEWS_CATS.filter((c) => c.slug && !navHiddenSet.has(c.slug))
        .map((c) => ({ label: c.label, slug: hmCategorySlug(c.slug, c.label), sortOrder: null }));
    }

    const sortedDbRows = sortHmCategoriesForNav(seededRows, layoutPrefs.hmCategorySortSlugs);
    for (const c of sortedDbRows) {
      bySlug.set(c.slug, { label: c.label, slug: c.slug, sortOrder: c.sortOrder });
    }

    // Kurumsal vitrin: yalnızca editörde açık kategoriler; haber sitesi RSS sekmelerini korur.
    if (!isCorporateTheme) {
      for (const item of bandNewsItems) {
        const slug = hmCategorySlug(item?.categorySlug, item?.categoryName, item?.feedLabel);
        if (!slug || navHiddenSet.has(slug) || !activeGlobalSlugs.has(normalizeNewsCategorySlug(slug)) || bySlug.has(slug)) continue;
        if (item?.source !== "rss") continue;
        const label = String(item?.categoryName ?? item?.feedLabel ?? slug).trim() || slug;
        bySlug.set(slug, { label, slug, sortOrder: null });
      }
    }

    const rows = sortHmCategoriesForNav(Array.from(bySlug.values()), layoutPrefs.hmCategorySortSlugs);
    return [{ label: "TÜMÜ", slug: "" }, ...rows.map((c) => ({ label: formatTrDisplayLabel(c.label), slug: c.slug }))];
  }, [publicApiCats, activeGlobalSlugs, bandNewsItems, isCorporateTheme, layoutPrefs.hmCategorySortSlugs, navHiddenSet]);

  const tickerBreaking = useMemo(() => {
    if (breaking.length > 0) {
      return breaking.map((n: any) => ({ id: n.id, slug: n.slug, title: n.title }));
    }
    if (siteId != null) return [];
    return allItems.slice(0, 8).map((n: any) => ({ id: n.id, slug: n.slug, title: n.title }));
  }, [breaking, allItems, siteId]);

  const tickerFinanceEnabled = resolveTickerFinanceEnabled(layoutPrefs);
  const tickerWeatherEnabled = resolveTickerWeatherEnabled(layoutPrefs);
  const mansetVariant = layoutPrefs.mansetVariant ?? "split";
  const effectiveMansetVariant: MansetVariant = mansetVariant;
  const showFinanceWeatherBand = tickerFinanceEnabled || tickerWeatherEnabled;
  const showBreakingTicker = effectiveNewsBandEnabled && tickerBreaking.length > 0;
  const showBand = showFinanceWeatherBand || showBreakingTicker;
  /** HM: son dakika üst logoda; yalnızca son dakika olan boş şerit gösterilmesin. */
  const hmBreakingOnlyStrip =
    siteId != null && showBand && !showFinanceWeatherBand && tickerBreaking.length > 0;
  /** HM sitelerde döviz/hava bandı logo yanında; son dakika menü altında. Gövdede tekrarlanmaz. */
  const showFinanceWeatherInPageBody = showFinanceWeatherBand && hmCtx == null;

  const CAT_SECTIONS = useMemo(() => {
    const pick = (slug: string, fallback: string) => {
      const raw = hmCat?.[slug];
      if (typeof raw === "string" && HEX_COLOR.test(raw.trim())) return raw.trim();
      return fallback;
    };
    const PALETTE: Record<string, string> = {
      gundem: accent,
      dunya: "#2563eb",
      ekonomi: "#f97316",
      politika: "#7c3aed",
      spor: "#16a34a",
      teknoloji: "#9333ea",
      kultur: "#9333ea",
      yasam: "#0d9488",
      saglik: "#059669",
      magazin: "#a855f7",
    };
    const fromApi = publicApiCats
      .map((c: any) => {
        const slug = String(c.slug ?? "").trim().toLowerCase();
        const title = String(c.name ?? slug ?? "").trim() || slug;
        return { title, slug, color: pick(slug, PALETTE[slug] ?? accent) };
      })
      .filter((c) => c.slug && !navHiddenSet.has(c.slug));

    if (!isCorporateTheme) {
      const bySlug = new Map(fromApi.map((c) => [c.slug, c]));
      for (const std of HM_STANDARD_NEWS_CATEGORIES) {
        if (navHiddenSet.has(std.slug) || !activeGlobalSlugs.has(std.slug)) continue;
        if (!bySlug.has(std.slug)) {
          bySlug.set(std.slug, {
            title: std.label,
            slug: std.slug,
            color: pick(std.slug, PALETTE[std.slug] ?? accent),
          });
        }
      }
      const merged = Array.from(bySlug.values());
      if (merged.length > 0) return merged;
    } else if (fromApi.length > 0) {
      return fromApi;
    }

    return NEWS_CATS.filter((c) => c.slug && !navHiddenSet.has(c.slug) && (isCorporateTheme || activeGlobalSlugs.has(c.slug))).map((c) => ({
      title: c.label,
      slug: c.slug,
      color: pick(c.slug, PALETTE[c.slug] ?? accent),
    }));
  }, [publicApiCats, activeGlobalSlugs, hmCat, accent, isCorporateTheme, navHiddenSet]);

  const siteSlugPrefixes = useMemo(() => {
    const slug = String(hmSlugProp ?? hmCtx?.slug ?? "").trim();
    return slug ? [slug] : [];
  }, [hmCtx?.slug, hmSlugProp]);

  const rssFeedRows = useMemo(
    () =>
      collectHmRssCategoryNavItems(resolveHmUnifiedRssFeedRows(layoutPrefs)).filter(
        (row) => row.slug && !navHiddenSet.has(row.slug) && activeGlobalSlugs.has(row.slug),
      ),
    [activeGlobalSlugs, layoutPrefs, navHiddenSet],
  );

  const homeCategoryMatchContext = useMemo((): HmHomeCategoryMatchContext => {
    const categoryIdBySlug = new Map<string, number>();
    for (const cat of safeApiCats as Array<{ id?: number; slug?: string | null; name?: string | null }>) {
      const slug = hmCategorySlug(cat.slug, cat.name);
      const id = Number(cat.id);
      if (slug && Number.isFinite(id) && id > 0) categoryIdBySlug.set(slug, id);
    }
    return {
      knownCanonicalSlugs: buildHmKnownCanonicalCategorySlugs({
        apiCategories: safeApiCats as Array<{ slug?: string | null; name?: string | null }>,
        rssNavSlugs: rssFeedRows.map((row) => row.slug),
        sectionSlugs: CAT_SECTIONS.map((section) => section.slug),
      }),
      siteSlugPrefixes,
      rssFeedRows: resolveHmUnifiedRssFeedRows(layoutPrefs),
      categoryIdBySlug,
    };
  }, [CAT_SECTIONS, safeApiCats, layoutPrefs, rssFeedRows, siteSlugPrefixes]);

  const tabStripCats = useMemo(() => {
    try {
      return dedupeHmCategoryTabsByCanonicalSlug(
        tabStripCatsRaw,
        homeCategoryMatchContext.knownCanonicalSlugs,
        siteSlugPrefixes,
      );
    } catch (error) {
      console.error("[HaberAnasayfasi] tabStripCats dedupe failed; using raw tabs", error);
      return tabStripCatsRaw;
    }
  }, [tabStripCatsRaw, homeCategoryMatchContext.knownCanonicalSlugs, siteSlugPrefixes]);

  useEffect(() => {
    if (!featuredCategorySlug) return;
    if (!tabStripCats.some((tab) => tab.slug === featuredCategorySlug)) setFeaturedCategorySlug("");
  }, [featuredCategorySlug, tabStripCats]);

  const hmSlug = hmSlugProp ?? hmCtx?.slug ?? null;
  const portalHubOnly = useMemo(() => {
    const host =
      typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
    return isYekparePortalHubOnly(host, hmSlug);
  }, [hmSlug]);
  const hmDomain = hmCtx?.domain ?? null;
  const stripDonationChromeFromSlot = useCallback(
    (raw: string) => {
      let h = raw ?? "";
      if (isHmDonationActive(corporateDonation) && h.trim()) {
        h = isLegacyHmDonationHtml(h) ? stripLegacyHmDonationHtml(h) : h;
      }
      return h;
    },
    [corporateDonation],
  );

  const mansetBelowHtmlDisplay = useMemo(() => {
    let h = stripDonationChromeFromSlot(mansetBelowHtml ?? "");
    if (h.trim() && siteId != null && hmSlug) {
      h = rewriteHmSiteAnchorsInHtml(h, { slug: hmSlug, siteId, domain: hmDomain });
    }
    return sanitizeHtml(rewriteInlineHtmlImgSrc(h));
  }, [mansetBelowHtml, siteId, hmSlug, hmDomain, stripDonationChromeFromSlot]);
  const homeMiddleHtmlDisplay = useMemo(() => {
    let h = stripDonationChromeFromSlot(homeMiddleHtml ?? "");
    if (h.trim() && siteId != null && hmSlug) {
      h = rewriteHmSiteAnchorsInHtml(h, { slug: hmSlug, siteId, domain: hmDomain });
    }
    return sanitizeHtml(rewriteInlineHtmlImgSrc(h));
  }, [homeMiddleHtml, siteId, hmSlug, hmDomain, stripDonationChromeFromSlot]);
  const sidebarTopHtmlDisplay = useMemo(() => {
    let h = sidebarTopHtml ?? "";
    if (h.trim() && siteId != null && hmSlug) {
      h = rewriteHmSiteAnchorsInHtml(h, { slug: hmSlug, siteId, domain: hmDomain });
    }
    return sanitizeHtml(rewriteInlineHtmlImgSrc(h));
  }, [sidebarTopHtml, siteId, hmSlug, hmDomain]);
  const showNewsSidebar =
    newsSidebarEnabled &&
    !!(
      sidebarTopHtmlDisplay?.trim() ||
      popular.length > 0 ||
      (newsSidebarAuthorsEnabled && authors.length > 0) ||
      layoutPrefs.moduleMacSonuclari ||
      newsSidebarCategoriesEnabled ||
      newsSidebarMenuItems.length > 0
    );
  const showLatestGridSidebar =
    latestGridSidebarBoxEnabled &&
    !!(
      resolveFinanceWeatherInSidebar(layoutPrefs) ||
      sidebarTopHtmlDisplay?.trim() ||
      popular.length > 0 ||
      (newsSidebarAuthorsEnabled && authors.length > 0) ||
      layoutPrefs.moduleMacSonuclari ||
      newsSidebarCategoriesEnabled ||
      newsSidebarMenuItems.length > 0
    );

  const latestNewsPool = useMemo(
    () => sortNewsByRecency(mergeUniqueNews(bandNewsItems, allItems)).slice(0, 80),
    [bandNewsItems, allItems],
  );

  const tumHaberlerHref = h(
    siteId != null ? `/tum-haberler?siteId=${encodeURIComponent(String(siteId))}` : "/tum-haberler",
  );
  const sonDakikaHref = h(
    siteId != null ? `/sondakika?siteId=${encodeURIComponent(String(siteId))}` : "/sondakika",
  );
  const yazarlarHref = h("/yazarlar");
  const hmHomeHref = hmSlug ? h("/") : "/";
  const hmVideoTvEnabled = resolveHmNewsVideoTvEnabled(layoutPrefs) && portalHubOnly;
  const hmVideoTvHref =
    hmVideoTvEnabled && hmSlug != null
      ? h(`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hmSlug)}/video-tv`)
      : null;
  const mediaDarkModulesEnabled =
    resolveHmNewsHomeModuleEnabled(layoutPrefs, "mediaDarkBlock") && portalHubOnly;
  const { data: mediaSpotlightPool = [] } = useQuery({
    queryKey: ["/api/hm-media-spotlight", siteId ?? "portal", hmSlug ?? "none"],
    queryFn: () =>
      fetchHmMediaSpotlightPool({
        fotoHref: (id) => h(`/foto-galeri/${id}`),
        videoGalleryHref: (id) => h(`/video-galeri/${id}`),
        videoTvHref: (sourceId, videoId) => h(`/video-tv/kanal/${sourceId}/${encodeURIComponent(videoId)}`),
        limit: 12,
      }),
    staleTime: 5 * 60 * 1000,
    enabled: !isCorporateTheme && mediaDarkModulesEnabled && latestBandFetchReady,
  });
  const siteneEkleHref = h("/sitene-ekle");
  const quickLinks = [
    { key: "sd", label: "Son Dakika", href: sonDakikaHref, icon: "🔴" },
    { key: "th", label: "Tüm Haberler", href: tumHaberlerHref, icon: "📰" },
    ...(newsAuthorsEnabled ? ([{ key: "yz", label: "Yazarlar", href: yazarlarHref, icon: "✍️" }] as const) : []),
    { key: "se", label: "Sitene ekle", href: siteneEkleHref, icon: "📋" },
    ...(hmBareChrome || hmCtx != null ? ([] as const) : ([{ key: "kf", label: "Keşfet", href: "/kesfet", icon: "✨" }] as const)),
  ];

  const siteDisplayName = hmCtx?.displayName ?? "Haber Merkezi";
  const siteDescription =
    (hmCtx?.description ?? "").trim() ||
    "Güncel haberler, duyurular, analizler ve köşe yazıları kurumsal bir vitrin düzeninde yayında.";
  const currentCategoryName =
    activeTab ? String((cats as any[]).find((c: any) => String(c.slug ?? "") === activeTab)?.label ?? (cats as any[]).find((c: any) => String(c.slug ?? "") === activeTab)?.name ?? "Haberler") : "";
  const orderedNewsModules = filterHmHomeModulesForPortalHub(
    resolveHmHomeModuleOrder<HmNewsHomeModuleId>(
      layoutPrefs.hmNewsHomeModuleOrder,
      HM_NEWS_HOME_MODULE_ORDER,
    ).filter((id) => !isHmNewsRetiredHomeModule(id)),
    portalHubOnly,
  );
  const automaticHomeModuleCategorySlugs = useMemo(
    () =>
      resolveAutomaticHomeModuleCategorySlugs({
        orderedModules: orderedNewsModules,
        manualSlugs: layoutPrefs.hmNewsHomeModuleCategorySlugs,
        autoAssignableModules: HOME_NEWS_AUTO_CATEGORY_MODULES,
        candidates: buildHomeModuleCategoryCandidates({
          tabStripSlugs: tabStripCats.map((tab) => tab.slug).filter(Boolean),
          sectionSlugs: CAT_SECTIONS.map((section) => section.slug),
          siteCategories: safeApiCats as Array<{ slug?: string; name?: string }>,
          newsItems: mergeUniqueNews(latestNewsPool, bandNewsItems, allItems),
        }),
      }),
    [
      CAT_SECTIONS,
      allItems,
      safeApiCats,
      bandNewsItems,
      latestNewsPool,
      layoutPrefs.hmNewsHomeModuleCategorySlugs,
      orderedNewsModules,
      tabStripCats,
    ],
  );
  const newsAuthorsStripModuleEnabled = orderedNewsModules.includes("authorsStrip");
  const newsDonationIbanModule = resolveHmDonationIbanModule(orderedNewsModules, "news");
  const showNewsFallbackDonation = isHmDonationActive(corporateDonation) && newsDonationIbanModule == null;
  const classicHeadlinePool = useMemo(() => {
    const pool = mergeUniqueNews(sliderNews, sliderSide, latestNewsPool, allItems, popular);
    return sortNewsByRecency(preferFreshHeadlineCandidates(pool));
  }, [sliderNews, sliderSide, latestNewsPool, allItems, popular]);
  /** Klasik / portal3 üst manşet: HM editör sitelerinde yalnızca MANŞET etiketli + manuel haberler. */
  const classicHeadlineSliderItems = useMemo(
    () => {
      let pool: any[];
      if (siteId != null) {
        pool = centerMansetSliderItems;
      } else {
        pool = buildClassicHeadlineSliderPool({
          sliderItems: sliderNews,
          fallbackGroups: [classicHeadlinePool, latestNewsPool, allItems, bandNewsItems, popular],
          limit: HM_HOME_HEADLINE_SLIDER_LIMIT,
        });
      }
      return tepeMansetActive ? excludeHeadlineSliderItems(pool, tepeMansetItems) : pool;
    },
    [siteId, centerMansetSliderItems, sliderNews, classicHeadlinePool, latestNewsPool, allItems, bandNewsItems, popular, tepeMansetActive, tepeMansetItems],
  );
  const classicLatestMini = useMemo(() => {
    const pool = mergeUniqueNews(bandNewsItems, allItems, popular, sliderSide);
    const fresh = pool.filter(isHeadlineFreshEnough);
    return sortNewsByRecency(fresh.length > 0 ? fresh : pool).slice(0, 10);
  }, [bandNewsItems, allItems, popular, sliderSide]);
  const todayHighlightMini = useMemo(
    () => sortNewsByRecency(classicLatestMini.filter(isTodayHeadlineNews)).slice(0, 6),
    [classicLatestMini],
  );
  /** Manşet split/full-numbered gerçekten «Son Haberler» sütunu gösteriyorsa latestGrid orta bandı gizlenir. */
  const mansetRendersSonHaberler =
    !isCorporateTheme &&
    resolveHmNewsClassicHeroLatestEnabled(layoutPrefs) &&
    classicLatestMini.length > 0 &&
    (effectiveMansetVariant === "split" ||
      effectiveMansetVariant === "slider-side-band" ||
      effectiveMansetVariant === "full-numbered");
  const rssBreakingFallbackItems = useMemo((): RssBreakingBandFallbackItem[] => {
    return sortNewsByRecency(mergeUniqueNews(bandNewsItems, allItems, latestNewsPool))
      .slice(0, 10)
      .map((item: any) => ({
        id: item.id,
        slug: item.slug,
        title: String(item.title ?? ""),
        summary: item.spot ?? item.summary ?? null,
        spot: item.spot ?? null,
        imageUrl: item.imageUrl ?? null,
        categoryName: item.categoryName ?? null,
        publishedAt: item.publishedAt ?? item.createdAt ?? null,
        createdAt: item.createdAt ?? null,
        source: item.source,
        href: item.href ?? null,
      }));
  }, [allItems, bandNewsItems, latestNewsPool]);
  const classicCategorySections = useMemo(() => {
    if (!newsCategorySectionsEnabled) return [];

    const rawSourcePool = mergeUniqueNews(latestNewsPool, allItems, bandNewsItems, sliderNews);
    const freshSourcePool = rawSourcePool.filter(isHeadlineFreshEnough);
    const sourcePool = freshSourcePool.length > 0 ? freshSourcePool : rawSourcePool;
    const selectedSlugs = normalizeCategorySlugList(layoutPrefs.hmClassicAraMansetCategorySlugs);
    const baseSections = selectedSlugs.length > 0
      ? selectedSlugs.map((slug) => {
        const known = CAT_SECTIONS.find((section) => section.slug === slug);
        return known ?? { title: slug.replace(/-/g, " "), slug, color: accent };
      })
      : CAT_SECTIONS;
    const bySection = baseSections.map((cs) => {
      const slug = hmCategorySlug(cs.slug, cs.title);
      const title = cs.title || slug;
      const matching = sortNewsByRecency(
        sourcePool.filter(
          (item) =>
            hmNewsItemMatchesHomeCategorySlug(item, slug, homeCategoryMatchContext) ||
            hmNewsItemMatchesHomeCategorySlug(item, title, homeCategoryMatchContext),
        ),
      );
      const deduped = dedupeCategoryBoxItems(matching);
      const items = deduped.slice(0, CATEGORY_BOX_DISPLAY_TOTAL);
      return { ...cs, items };
    });

    const preferredSlugs = selectedSlugs.length > 0 ? selectedSlugs : ["gundem", "spor"];
    const preferred = preferredSlugs
      .map((slug) => bySection.find((section) => section.slug === slug))
      .filter(Boolean) as Array<(typeof bySection)[number]>;
    const rest = bySection.filter((section) => !preferredSlugs.includes(section.slug));
    const ordered = [...preferred, ...rest.filter((section) => !preferred.includes(section))];
    const sections = ordered.length > 0 ? ordered : bySection;

    if (sections.length > 0) return sections.slice(0, activeTab ? 1 : 6);
    if (sourcePool.length === 0) {
      return baseSections.slice(0, activeTab ? 1 : 6).map((section) => ({ ...section, items: [] }));
    }

    if (activeTab) {
      const tabMeta = baseSections.find((section) => section.slug === activeTab);
      return [{
        title: tabMeta?.title ?? currentCategoryName ?? humanizeNewsCategorySlug(activeTab),
        slug: activeTab,
        color: tabMeta?.color ?? accent,
        items: [],
      }];
    }

    return [{
      title: "Gündem",
      slug: "gundem",
      color: accent,
      items: dedupeCategoryBoxItems(sortNewsByRecency(sourcePool)).slice(0, CATEGORY_BOX_DISPLAY_TOTAL),
    }];
  }, [CAT_SECTIONS, activeTab, allItems, bandNewsItems, latestNewsPool, sliderNews, currentCategoryName, accent, layoutPrefs.hmClassicAraMansetCategorySlugs, newsCategorySectionsEnabled, homeCategoryMatchContext]);

  const featuredCategoryStripSections = useMemo(() => {
    const manualSlugs = normalizeCategorySlugList(layoutPrefs.hmNewsFeaturedCategoryStripSlugs);
    if (manualSlugs.length > 0) {
      const picked = pickCategorySectionsBySlugs(classicCategorySections, manualSlugs);
      if (picked.length > 0) return picked.slice(0, HM_HOME_CATEGORY_BOX_MAX);
      const baseBySlug = new Map(
        CAT_SECTIONS.map((section) => [hmCategorySlug(section.slug, section.title), section]),
      );
      return manualSlugs
        .map((slug) => {
          const known = baseBySlug.get(slug);
          if (known) return known;
          return {
            title: humanizeNewsCategorySlug(slug),
            slug,
            color: accent,
            items: [],
          };
        })
        .slice(0, HM_HOME_CATEGORY_BOX_MAX) as typeof classicCategorySections;
    }
    if (classicCategorySections.length >= HM_HOME_CATEGORY_BOX_MAX) {
      return classicCategorySections.slice(0, HM_HOME_CATEGORY_BOX_MAX);
    }
    const seen = new Set(classicCategorySections.map((section) => hmCategorySlug(section.slug, section.title)));
    const padded = [...classicCategorySections];
    for (const section of CAT_SECTIONS) {
      if (padded.length >= HM_HOME_CATEGORY_BOX_MAX) break;
      const slug = hmCategorySlug(section.slug, section.title);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      padded.push({ ...section, items: [] });
    }
    return padded;
  }, [CAT_SECTIONS, classicCategorySections, layoutPrefs.hmNewsFeaturedCategoryStripSlugs]);

  const yekpareKutuItemTotal = CATEGORY_BOX_DISPLAY_TOTAL;
  const yekpareKutuListSlots = CATEGORY_BOX_LIST_SLOTS;
  const yekpareCategoryBoxCount = normalizeYekpareCategoryBoxCount(layoutPrefs.hmYekpareCategoryBoxCount);

  const yekpareKategorilerKutusuSections = useMemo(() => {
    const boxLimit = yekpareCategoryBoxCount;
    const manualSlugs = normalizeCategorySlugList(layoutPrefs.hmYekpareKategorilerKutusuSlugs);
    if (manualSlugs.length > 0) {
      const picked = pickCategorySectionsBySlugs(classicCategorySections, manualSlugs);
      if (picked.length > 0) return picked.slice(0, boxLimit);
      const baseBySlug = new Map(
        CAT_SECTIONS.map((section) => [hmCategorySlug(section.slug, section.title), section]),
      );
      return manualSlugs
        .map((slug) => {
          const known = baseBySlug.get(slug);
          if (known) return known;
          return {
            title: humanizeNewsCategorySlug(slug),
            slug,
            color: accent,
            items: [],
          };
        })
        .slice(0, boxLimit) as typeof classicCategorySections;
    }
    if (classicCategorySections.length > 0) {
      return classicCategorySections.slice(0, boxLimit);
    }
    return CAT_SECTIONS.slice(0, boxLimit).map((section) => ({
      ...section,
      items: [],
    }));
  }, [CAT_SECTIONS, accent, classicCategorySections, layoutPrefs.hmYekpareKategorilerKutusuSlugs, yekpareCategoryBoxCount]);

  const homeMansetSideSeedItems = useMemo(() => {
    const heroSliderNews = classicHeadlineSliderItems;
    if (heroSliderNews.length === 0) return [];
    const legacyHeadlineSidePool = sortNewsByRecency(
      mergeUniqueNews(
        sliderSide,
        latestNewsPool,
        allItems,
        bandNewsItems,
        popular,
        siteId != null ? breaking : [],
      ).filter(isHeadlineFreshEnough),
    );
    const headlineSidePool = buildHeadlineSidePrimaryPool({
      siteId,
      sliderItems: heroSliderNews,
      tepeMansetItems,
      tepeMansetActive,
      yekparePoolItems: yekparePoolSideItems,
      legacySidePool: legacyHeadlineSidePool,
      yekparePoolReceiveEnabled: hmYekparePoolReceiveEnabled,
      mansetFallbackItems: mansetTaggedSideFallbackItems,
    });
    const heroSideWidenPools =
      siteId != null ? ([] as const) : ([classicHeadlinePool, latestNewsPool, popular] as const);
    const heroSideCount = resolveMansetSideCount(effectiveMansetVariant);
    const mansetSideResolve =
      effectiveMansetVariant === "center-trio" || effectiveMansetVariant === "slider-side-band"
        ? resolveCenterTrioSideHeadlines
        : resolveSplitSideHeadlines;
    return buildHomeMansetSideHeadlineSeedItems({
      pool: headlineSidePool,
      widenPools: heroSideWidenPools,
      sliderItems: heroSliderNews,
      sideCount: heroSideCount,
      resolve: mansetSideResolve,
    });
  }, [
    classicHeadlineSliderItems,
    sliderSide,
    latestNewsPool,
    allItems,
    bandNewsItems,
    popular,
    breaking,
    siteId,
    tepeMansetItems,
    tepeMansetActive,
    yekparePoolSideItems,
    classicHeadlinePool,
    effectiveMansetVariant,
    hmYekparePoolReceiveEnabled,
    mansetTaggedSideFallbackItems,
  ]);

  const homeHeroSeedItems = useMemo(
    () =>
      buildHomeHeroDedupeSeedItems({
        tepeMansetItems: tepeMansetActive ? tepeMansetItems : [],
        sliderItems: classicHeadlineSliderItems,
        sideHeadlineItems: homeMansetSideSeedItems,
        breakingItems: effectiveNewsBandEnabled ? breaking : [],
        sonDakikaItems: bandNewsItems,
        extraItems: sliderSide,
      }),
    [
      tepeMansetActive,
      tepeMansetItems,
      classicHeadlineSliderItems,
      homeMansetSideSeedItems,
      sliderSide,
      effectiveNewsBandEnabled,
      breaking,
      bandNewsItems,
    ],
  );
  const moduleSectionSourcePool = useMemo(() => {
    const raw = mergeUniqueNews(featured, latestNewsPool, allItems, bandNewsItems, sliderNews, popular);
    const fresh = raw.filter(isHeadlineFreshEnough);
    return sortNewsByRecency(fresh.length > 0 ? fresh : raw);
  }, [featured, latestNewsPool, allItems, bandNewsItems, sliderNews, popular]);
  const siteHasAnyNews = moduleSectionSourcePool.length > 0;
  const hasInstantNewsPool = latestMergedHasItems || hybridHeadlineReady;
  /** Hibrit önbellek / DB gelene kadar metin yerine skeleton veya sessiz bekleme. */
  const homeNewsBootstrapping =
    !dbNewsReady &&
    !hasInstantNewsPool &&
    (latestDbPending || latestBandDbPending || (useHybridHomeNewsPool && hybridBootstrapPending));

  const homeCategoryBoxFetchSlugs = useMemo(() => {
    const slugs = new Set<string>();
    const push = (...values: unknown[]) => {
      const slug = hmCategorySlug(...values);
      if (slug) slugs.add(slug);
    };
    for (const section of classicCategorySections.slice(0, HM_HOME_CATEGORY_BOX_MAX)) {
      push(section.slug, section.title);
    }
    if (resolveHmNewsHomeModuleEnabled(layoutPrefs, "yekpareKategorilerKutusu")) {
      for (const section of yekpareKategorilerKutusuSections) {
        push(section.slug, section.title);
      }
    }
    if (resolveHmNewsHomeModuleEnabled(layoutPrefs, "featuredCategoryStrip")) {
      for (const slug of normalizeCategorySlugList(layoutPrefs.hmNewsFeaturedCategoryStripSlugs)) push(slug);
    }
    for (const slug of normalizeCategorySlugList(layoutPrefs.hmClassicAraMansetCategorySlugs)) push(slug);
    return Array.from(slugs);
  }, [
    classicCategorySections,
    yekpareKategorilerKutusuSections,
    layoutPrefs,
    layoutPrefs.hmClassicAraMansetCategorySlugs,
    layoutPrefs.hmNewsFeaturedCategoryStripSlugs,
  ]);

  const { bySlug: homeCategoryFetchedBySlug } = useHmHomeCategorySectionItems({
    slugs: homeCategoryBoxFetchSlugs,
    siteId,
    enabled: !isCorporateTheme,
    limit: CATEGORY_BOX_DISPLAY_TOTAL,
    rssScope: "all",
    fallbackPool: moduleSectionSourcePool,
    matchContext: homeCategoryMatchContext,
    // Kategori kutularını bootstrap'ı BEKLEMEDEN, t=0'da paralel çek. Önceden
    // `homeNewsBootstrapping`'e ertelenmişti; bootstrap takılırsa kutular hiç istek atmıyor
    // ve sonsuza kadar "Haberler yükleniyor"da kalıyordu. Artık DB-first ve hızlı dolar.
    deferRemoteFetch: deferBelowFoldFetches,
  });
  const homeNewsDedupe = createHomeNewsDedupeTracker(homeHeroSeedItems);

  const pickSidebarNews = <T,>(items: readonly T[], limit: number): T[] =>
    pickHomeDisplayNewsItems(homeNewsDedupe, sortNewsByRecency([...items]), limit);

  const moduleCategorySlug = (moduleId: HmNewsHomeModuleId): string => {
    const manual = normalizeHomeModuleCategorySlug(String(layoutPrefs.hmNewsHomeModuleCategorySlugs?.[moduleId] ?? ""));
    if (manual) return manual;
    return automaticHomeModuleCategorySlugs[moduleId] ?? "";
  };
  const moduleCategoryTitle = (slug: string): string => {
    if (!slug) return "";
    const section = CAT_SECTIONS.find((row) => hmCategorySlug(row.slug, row.title) === slug);
    return section?.title ?? humanizeNewsCategorySlug(slug);
  };
  const rememberModuleItems = (items: any[]) => {
    homeNewsDedupe.rememberMany(items);
  };
  const pickAndPadModuleItems = <T,>(
    pool: readonly T[],
    limit: number,
    backfillPool?: readonly T[],
    opts?: { exactLimit?: boolean },
  ): T[] => {
    const evenLimit = opts?.exactLimit
      ? Math.max(1, Math.round(limit))
      : normalizeEvenDisplayCount(limit, limit <= 4 ? 4 : 6);
    const primary = sortNewsByRecency([...pool]);
    const backfill = sortNewsByRecency(
      mergeUniqueNews([...primary], [...(backfillPool ?? moduleSectionSourcePool)]) as T[],
    );
    const seed = pickHomeModuleNewsItems(homeNewsDedupe, primary, { limit: evenLimit });
    return padNewsItemsToLimit(seed, backfill, evenLimit, homeNewsDedupe);
  };
  const selectModuleItems = <T extends any[],>(
    moduleId: HmNewsHomeModuleId,
    items: T,
    limitOrOpts?: number | { limit?: number; minItems?: number },
  ): T[number][] => {
    const safeItems = Array.isArray(items) ? items : [];
    const opts = typeof limitOrOpts === "number" ? { limit: limitOrOpts } : limitOrOpts ?? {};
    const limit = opts.limit;
    const minItems = opts.minItems ?? (typeof limit === "number" ? Math.min(4, limit) : 1);
    const targetLimit = typeof limit === "number" ? limit : minItems;
    const slug = moduleCategorySlug(moduleId);
    const categorized = slug
      ? safeItems.filter((item) => newsMatchesCategory(item, slug, homeCategoryMatchContext))
      : safeItems;
    const primaryPool = sortNewsByRecency(categorized.length > 0 ? categorized : safeItems);
    return pickAndPadModuleItems(primaryPool, targetLimit, safeItems);
  };
  const resolveSectionPoolItems = (
    section: { slug: string; title: string; items?: any[] },
    opts?: { allowGlobalPoolFallback?: boolean },
  ) =>
    resolveHomeCategorySectionPool({
      sectionSlug: hmCategorySlug(section.slug, section.title),
      sectionTitle: section.title,
      fetchedItems: homeCategoryFetchedBySlug.has(hmCategorySlug(section.slug, section.title))
        ? homeCategoryFetchedBySlug.get(hmCategorySlug(section.slug, section.title))
        : undefined,
      prefilledItems: section.items,
      fallbackPool: moduleSectionSourcePool,
      matchContext: homeCategoryMatchContext,
      allowGlobalPoolFallback: opts?.allowGlobalPoolFallback ?? false,
    });
  const selectModuleSections = <T extends { slug: string; title: string; items?: any[] }>(
    moduleId: HmNewsHomeModuleId,
    sections: T[],
    limit?: number,
    itemLimit?: number,
  ): T[] => {
    const safeSections = Array.isArray(sections) ? sections : [];
    const boxTotal = itemLimit ?? CATEGORY_BOX_DISPLAY_TOTAL;
    const slug = moduleCategorySlug(moduleId);
    const skipCategoryFilter = HOME_NEWS_MULTI_CATEGORY_SECTION_MODULES.has(moduleId);
    const categorized = skipCategoryFilter || !slug ? safeSections : safeSections.filter((section) => {
      const sectionSlug = hmCategorySlug(section.slug, section.title);
      return sectionSlug === slug || newsItemMatchesCategorySlug({ categorySlug: section.slug, categoryName: section.title }, slug);
    });
    const moduleBoxDedupe = skipCategoryFilter ? createCategoryBoxModuleDedupeTracker() : null;
    const globalBackfillPool = sortNewsByRecency([...moduleSectionSourcePool]);
    const sectionsToUse = typeof limit === "number" ? categorized.slice(0, limit) : categorized;
    return ensureNewsBoxSections(
      sectionsToUse,
      globalBackfillPool,
      boxTotal,
      (section, sectionPool) => {
        const resolvedPool = resolveSectionPoolItems(section, { allowGlobalPoolFallback: false });
        const pool = resolvedPool.length > 0 ? resolvedPool : sectionPool;
        return moduleBoxDedupe
          ? pickModuleSectionCategoryItems(moduleBoxDedupe, pool, boxTotal, homeNewsDedupe)
          : pickAndPadModuleItems(pool.length > 0 ? pool : sectionPool, boxTotal);
      },
      (section) => resolveSectionPoolItems(section, { allowGlobalPoolFallback: false }),
      homeNewsDedupe,
    ).map((section) => {
      const sectionGuardSlug = hmCategorySlug(section.slug, section.title);
      section.items = (section.items ?? []).filter((it: any) => passesCategoryContentGuard(it, sectionGuardSlug));
      rememberModuleItems(section.items);
      return section as T & { items: any[] };
    });
  };
  const mediaSpotlightItemsForModule = (moduleId: "mediaDarkBlock", limit = 6) => {
    const sourceId = resolveHmNewsHomeModuleGallerySource(layoutPrefs, moduleId);
    const tvRef = resolveHmNewsHomeModuleGalleryVideoTvRef(layoutPrefs, moduleId);
    return applyHmGallerySpotlightForModule(mediaSpotlightPool, sourceId, tvRef).slice(0, limit);
  };
  const mediaGalleryModuleTitle = (moduleId: "mediaDarkBlock") =>
    hmMediaGallerySourceLabel(resolveHmNewsHomeModuleGallerySource(layoutPrefs, moduleId));
  const mediaGalleryModuleHref = (moduleId: "mediaDarkBlock") =>
    hmMediaGallerySourceListHref(
      resolveHmNewsHomeModuleGallerySource(layoutPrefs, moduleId),
      h,
      hmVideoTvHref ?? h("/foto-galeri"),
    );

  const AHENK_MODULE_DEFAULT_SLUGS: Partial<Record<HmNewsHomeModuleId, string>> = {
    ahenkAnkaraGrid: "ankara",
    ahenkGundemLeadSide: "gundem",
    ahenkSporGrid: "spor",
    sporModule: "spor",
    ahenkDunyaBlock: "dunya",
    ahenkEkonomiGrid: "ekonomi",
  };

  const ahenkKategoriHref = (slug: string) =>
    h(
      siteId != null
        ? `/kategori/${encodeURIComponent(slug)}?siteId=${encodeURIComponent(String(siteId))}`
        : `/kategori/${encodeURIComponent(slug)}`,
    );

  const buildAhenkBlockContext = (moduleId: HmNewsHomeModuleId, limit: number, fallbackTitle: string): AhenkHaberBlockContext => {
    const categorySlug = resolveAhenkCategorySlug(moduleId, moduleCategorySlug(moduleId), AHENK_MODULE_DEFAULT_SLUGS);
    const pool = sortNewsByRecency(
      mergeUniqueNews(moduleSectionSourcePool, latestNewsPool, popular, allItems, featured).filter(isHeadlineFreshEnough),
    );
    const categorized = categorySlug
      ? pool.filter((item) => hmNewsItemMatchesHomeCategorySlug(item, categorySlug, homeCategoryMatchContext))
      : pool;
    const items = pickAndPadModuleItems(categorized.length > 0 ? categorized : pool, limit, pool);
    const rawItems = items.length > 0 ? items : ensureNewsBoxItems([], pool, limit, homeNewsDedupe);
    // İçerik koruması: SPOR grid'ine (ahenkSporGrid) global havuzdan siyaset sızmasın.
    const guardedItems = rawItems.filter((it) => passesCategoryContentGuard(it, categorySlug));
    return {
      moduleId,
      accent,
      hmCategoryColors: hmCat,
      categorySlug,
      categoryTitle: titleForAhenkSlug(categorySlug, fallbackTitle),
      items: guardedItems,
      authors,
      yazarlarHref,
      newsHref: (n) => hybridNewsItemHref(n, h),
      kategoriHref: ahenkKategoriHref,
    };
  };

  const renderNewsHomeModule = (moduleId: HmNewsHomeModuleId) => {
    if (isHmNewsRetiredHomeModule(moduleId)) return null;
    switch (moduleId) {
      case "breakingBand":
        return (
          <>
            {(showFinanceWeatherInPageBody || (showBand && !hmBreakingOnlyStrip && !showFinanceWeatherBand)) &&
            hmCtx == null ? (
              <FinanceWeatherTicker
                primaryColor={accent}
                financeBg={financeBg}
                showFinance={tickerFinanceEnabled}
                showWeather={tickerWeatherEnabled}
                breakingItems={siteId != null ? [] : tickerBreaking}
              />
            ) : null}
            {breaking.length > 0 && !showBand && siteId == null ? <SonDakikaTicker items={breaking} /> : null}
          </>
        );
      case "yekpareSearchBox":
        return layoutPrefs.hmNewsSearchBoxEnabled === true ? <HmNewsSearchBox accent={accent} className="mb-4" /> : null;
      case "googleNewsBand":
        return googleNewsBandEnabled ? (
          <HmRssBreakingBand
            accent={accent}
            layoutPrefs={layoutPrefs}
            siteId={siteId}
            fallbackNewsItems={rssBreakingFallbackItems.length ? rssBreakingFallbackItems : undefined}
          />
        ) : null;
      case "tepeManset":
        return tepeMansetItems.length > 0 ? (
          <HmTepeManset
            items={tepeMansetItems}
            getItemHref={(n) => hybridNewsItemHref(n, h)}
            accent={accent}
          />
        ) : null;
      case "hero": {
        const heroSliderNews = classicHeadlineSliderItems;
        if (heroSliderNews.length === 0) return null;
        const legacyHeadlineSidePool = sortNewsByRecency(
          mergeUniqueNews(
            sliderSide,
            latestNewsPool,
            allItems,
            bandNewsItems,
            popular,
            siteId != null ? breaking : [],
          ).filter(isHeadlineFreshEnough),
        );
        const legacyHeadlineSidePoolFiltered = tepeMansetActive
          ? excludeHeadlineSliderItems(legacyHeadlineSidePool, tepeMansetItems)
          : legacyHeadlineSidePool;
        const headlineSidePool = buildHeadlineSidePrimaryPool({
          siteId,
          sliderItems: heroSliderNews,
          tepeMansetItems,
          tepeMansetActive,
          yekparePoolItems: yekparePoolSideItems,
          legacySidePool: legacyHeadlineSidePoolFiltered,
          yekparePoolReceiveEnabled: hmYekparePoolReceiveEnabled,
          mansetFallbackItems: mansetTaggedSideFallbackItems,
        });
        const heroSideWidenPools = siteId != null ? ([] as const) : ([moduleSectionSourcePool, latestNewsPool, popular] as const);
        const heroSideSourcePool = sortNewsByRecency(
          mergeUniqueNews(headlineSidePool, ...(siteId != null ? [] : heroSideWidenPools)),
        );
        const mansetSideResolve =
          effectiveMansetVariant === "center-trio" || effectiveMansetVariant === "slider-side-band"
            ? resolveCenterTrioSideHeadlines
            : resolveSplitSideHeadlines;
        const heroSideCount = resolveMansetSideCount(effectiveMansetVariant);
        const splitSideItems = pickHeroSideHeadlines({
          pool: headlineSidePool,
          widenPools: heroSideWidenPools,
          sliderItems: heroSliderNews,
          sideCount: heroSideCount,
          dedupe: homeNewsDedupe,
          resolve: mansetSideResolve,
        });
        const splitSideHasPool = hasEnoughNewsForHeroSideHeadlines(
          heroSideSourcePool,
          heroSliderNews,
          heroSideCount,
        );
        const splitSidePlaceholderCount =
          (latestPending || latestBandPending) && splitSideHasPool
            ? Math.max(0, heroSideCount - splitSideItems.length)
            : 0;
        const renderQuickLinks = () =>
          newsQuickLinksEnabled ? (
            <div className="hm-vitrin-card mt-2 rounded-xl p-3 shadow">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-gray-900">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: accent }} /> Hızlı Erişim
              </p>
              <div className="grid grid-cols-2 gap-1">
                {quickLinks.map((l) => (
                  <Link
                    key={l.key}
                    href={l.href}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:underline"
                  >
                    <span>{l.icon}</span>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null;

        if (effectiveMansetVariant === "center-trio") {
          const sideItems = splitSideItems;
          const left = sideItems[0] ?? null;
          const right = sideItems.slice(1, 3);
          const centerTrioSideLoading = latestPending || latestBandPending;
          return (
            <div
              className={`mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.7fr)_minmax(0,0.85fr)] `}
              data-manset-variant="center-trio"
            >
              <div className="min-w-0">
                {left ? (
                  <HeadlineOverlayCard
                    n={left}
                    accent={accent}
                    hmCategoryColors={hmCat}
                    className="min-h-[230px] lg:min-h-full"
                    titleClassName="text-base"
                  />
                ) : centerTrioSideLoading ? (
                  <VitrinSideHeadlineSkeleton className="min-h-[230px] lg:min-h-full" />
                ) : null}
              </div>
              <div className="min-w-0">
                <HeroSlider slides={heroSliderNews} accent={accent} aspectRatio="3/2" hmCategoryColors={hmCat} numberedTabsBelow />
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:auto-rows-fr">
                {right.map((n: any) => (
                  <HeadlineOverlayCard key={n.id ?? n.slug} n={n} accent={accent} hmCategoryColors={hmCat} className="min-h-[150px] lg:h-full" />
                ))}
                {centerTrioSideLoading
                  ? Array.from({ length: Math.max(0, 2 - right.length) }, (_, index) => (
                      <VitrinSideHeadlineSkeleton key={`center-trio-right-sk-${index}`} className="min-h-[150px] lg:h-full" />
                    ))
                  : null}
              </div>
            </div>
          );
        }

        if (effectiveMansetVariant === "full-numbered") {
          const hasSidebarAd = !!sidebarTopHtmlDisplay?.trim();
          const heroLatestEnabled = resolveHmNewsClassicHeroLatestEnabled(layoutPrefs);
          const heroLatestItems = pickAndPadModuleItems(sortNewsByRecency(classicLatestMini), 6);
          const hasHeroLatest = heroLatestEnabled && heroLatestItems.length > 0;
          const numberedSideCount = resolveFullNumberedSideCount({ hasSidebarAd, hasHeroLatest });
          const numberedSideItems = pickHeroSideHeadlines({
            pool: headlineSidePool,
            widenPools: heroSideWidenPools,
            sliderItems: heroSliderNews,
            sideCount: numberedSideCount,
            dedupe: homeNewsDedupe,
          });
          const numberedHasPool = hasEnoughNewsForHeroSideHeadlines(
            heroSideSourcePool,
            heroSliderNews,
            numberedSideCount,
          );
          const showNumberedSide = hasSidebarAd || numberedSideItems.length > 0 || numberedHasPool;
          const fullNumberedGridClass = [
            "hm-manset-full-numbered mb-6 grid grid-cols-1 gap-3 lg:items-stretch",
            showNumberedSide ? "hm-manset-full-numbered--with-side" : "",
            hasHeroLatest ? "hm-manset-full-numbered--with-latest" : "",
          ].filter(Boolean).join(" ");
          return (
            <div className={fullNumberedGridClass} data-manset-variant="full-numbered">
              <div className="hm-manset-full-numbered__main min-w-0">
                <HeroSlider slides={heroSliderNews} accent={accent} aspectRatio="3/2" hmCategoryColors={hmCat} numberedTabsBelow />
              </div>
              {showNumberedSide ? (
                <div className="hm-manset-full-numbered__side flex min-w-0 flex-col gap-2 lg:h-full">
                  {hasSidebarAd ? (
                    <div
                      className="hm-manset-full-numbered__ad hm-vitrin-card shrink-0 overflow-hidden rounded-xl bg-white text-center shadow"
                      dangerouslySetInnerHTML={{ __html: sidebarTopHtmlDisplay }}
                    />
                  ) : null}
                  {numberedSideItems.length > 0 ? (
                    <div
                      className="hm-manset-full-numbered__cards grid min-h-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-2 lg:auto-rows-fr"
                      style={{ ["--hm-fn-side-rows" as string]: String(resolveFullNumberedSideGridRows(numberedSideItems.length)) }}
                    >
                      {numberedSideItems.map((n: any) => (
                        <CardVert
                          key={n.id ?? n.slug}
                          n={n}
                          imgHeight={96}
                          accent={accent}
                          hmCategoryColors={hmCat}
                          className="min-h-[140px] lg:h-full"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {hasHeroLatest ? (
                <aside className="hm-manset-full-numbered__latest hm-manset-hero-latest flex min-w-0 flex-col lg:h-full">
                  <section className="hm-vitrin-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl shadow">
                    <SectionHead title="Son Haberler" color={accent} href={tumHaberlerHref} />
                    <div className="hm-vitrin-latest-panel min-h-0 flex-1 divide-y divide-slate-100 overflow-hidden">
                      {heroLatestItems.map((n: any) => (
                        <CardHoriz
                          key={n.id ?? n.slug}
                          n={n}
                          size="sm"
                          accent={accent}
                          hmCategoryColors={hmCat}
                          className="min-h-[86px]"
                        />
                      ))}
                    </div>
                  </section>
                </aside>
              ) : null}
            </div>
          );
        }

        if (effectiveMansetVariant === "magazine-grid") {
          const magazineSideItems = pickHeroSideHeadlines({
            pool: headlineSidePool,
            widenPools: heroSideWidenPools,
            sliderItems: heroSliderNews,
            sideCount: 8,
            dedupe: homeNewsDedupe,
          });
          const lead = heroSliderNews[0] ?? magazineSideItems[0] ?? null;
          const featureCards = magazineSideItems.slice(0, 4);
          const latestCards = magazineSideItems.slice(4, 8);
          const magazineGridClass =
            latestCards.length > 0
              ? "hm-manset-magazine-grid-inner--12 lg:grid-cols-12"
              : featureCards.length > 0
                ? "hm-manset-magazine-grid-inner--9 lg:grid-cols-9"
                : "hm-manset-magazine-grid-inner--5";
          return (
            <section className={`hm-vitrin-card mb-6 overflow-hidden rounded-2xl p-3 shadow sm:p-4 `} data-manset-variant="magazine-grid">
              <SectionHead title="Manşet" color={accent} href={tumHaberlerHref} />
              <div className={`hm-manset-magazine-grid-inner grid grid-cols-1 gap-2.5 ${magazineGridClass}`}>
                {lead ? (
                  <div className={featureCards.length > 0 || latestCards.length > 0 ? "lg:col-span-5" : ""}>
                    <HeadlineOverlayCard
                      n={lead}
                      accent={accent}
                      hmCategoryColors={hmCat}
                      className="min-h-[320px] lg:min-h-[440px]"
                      titleClassName="text-xl sm:text-2xl"
                    />
                  </div>
                ) : null}
                {featureCards.length > 0 ? (
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:col-span-4 lg:auto-rows-fr">
                    {featureCards.map((n: any) => (
                      <CardVert
                        key={n.id ?? n.slug}
                        n={n}
                        imgHeight={118}
                        accent={accent}
                        hmCategoryColors={hmCat}
                        className="min-h-[206px] lg:h-full"
                      />
                    ))}
                  </div>
                ) : null}
                {latestCards.length > 0 ? (
                  <div className="hm-vitrin-latest-panel min-w-0 divide-y divide-slate-100 overflow-hidden rounded-xl lg:col-span-3">
                    {latestCards.map((n: any) => (
                      <CardHoriz
                        key={n.id ?? n.slug}
                        n={n}
                        size="sm"
                        accent={accent}
                        hmCategoryColors={hmCat}
                        className="min-h-[86px]"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          );
        }

        const splitHeroLatestEnabled = resolveHmNewsClassicHeroLatestEnabled(layoutPrefs);
        const splitHeroLatestItems = pickAndPadModuleItems(sortNewsByRecency(classicLatestMini), 6);
        const hasSplitHeroLatest = splitHeroLatestEnabled && splitHeroLatestItems.length > 0;

        return (
          <>
            {effectiveMansetVariant === "split" ? (
              <div
                className={[
                  "hm-manset-split-layout mb-6 grid grid-cols-1 gap-4 lg:items-stretch",
                  hasSplitHeroLatest
                    ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)_minmax(260px,0.72fr)] hm-manset-split-layout--with-latest"
                    : "lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]",
                  isAhenkHaberTheme ? "hm-ahenk-hero-layout hm-ahenk-hero-layout--split" : "",
                  hasSplitHeroLatest && isAhenkHaberTheme ? "hm-ahenk-hero-layout--with-latest" : "",
                ].filter(Boolean).join(" ")}
                data-manset-variant="split"
              >
                <div className="min-w-0">
                  <HeroSlider slides={heroSliderNews} accent={accent} aspectRatio="4/3" hmCategoryColors={hmCat} />
                </div>
                <div className="flex min-w-0 flex-col gap-2 lg:h-full">
                  {splitSideItems.length > 0 || splitSidePlaceholderCount > 0 ? (
                    <div
                      className="hm-manset-split-side grid min-h-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-2 lg:auto-rows-fr"
                      style={{ ["--hm-split-side-rows" as string]: String(HM_MANSET_SPLIT_SIDE_ROWS) }}
                    >
                      {splitSideItems.map((n: any) => (
                        <Link key={n.id ?? n.slug} href={hybridNewsItemHref(n, h)}
                          className="hm-vitrin-card group flex min-h-[94px] gap-2.5 overflow-hidden rounded-xl p-2.5 shadow transition-all hover:-translate-y-0.5 hover:shadow-md lg:h-full xl:min-h-0">
                          <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-white sm:h-[72px] sm:w-[72px] xl:h-[78px] xl:w-[78px]">
                            <HmNewsImage
                              src={resolveNewsItemImageUrl(n)}
                              alt={newsDisplayTitle(n.title)}
                              className="transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            {n.categoryName && (
                              <span className="text-[9px] font-black uppercase" style={{ color: catColor(n, accent, hmCat) }}>{n.categoryName}</span>
                            )}
                            <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-snug text-gray-900 sm:line-clamp-3 sm:text-xs xl:text-sm">{newsDisplayTitle(n.title)}</p>
                            <p className="text-gray-400 text-[10px] mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />{fmtDate(n.createdAt)}
                            </p>
                          </div>
                        </Link>
                      ))}
                      {splitSidePlaceholderCount > 0
                        ? Array.from({ length: splitSidePlaceholderCount }, (_, index) => (
                            <VitrinSideHeadlineSkeleton key={`split-side-sk-${index}`} className="min-h-[94px] lg:h-full" />
                          ))
                        : null}
                    </div>
                  ) : null}
                  {renderQuickLinks()}
                </div>
                {hasSplitHeroLatest ? (
                  <aside className="hm-manset-hero-latest flex min-w-0 flex-col lg:h-full">
                    <section className="hm-vitrin-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl shadow">
                      <SectionHead title="Son Haberler" color={accent} href={tumHaberlerHref} />
                      <div className="hm-vitrin-latest-panel min-h-0 flex-1 divide-y divide-slate-100 overflow-hidden">
                        {splitHeroLatestItems.map((n: any) => (
                          <CardHoriz
                            key={n.id ?? n.slug}
                            n={n}
                            size="sm"
                            accent={accent}
                            hmCategoryColors={hmCat}
                            className="min-h-[86px]"
                          />
                        ))}
                      </div>
                    </section>
                  </aside>
                ) : null}
              </div>
            ) : null}
            {effectiveMansetVariant === "slider-side-band" ? (
              <div className="mb-6 space-y-3" data-manset-variant="slider-side-band">
                <div
                  className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.7fr)_minmax(0,0.85fr)]"
                >
                  <div className="min-w-0">
                    {splitSideItems[0] ? (
                      <HeadlineOverlayCard
                        n={splitSideItems[0]}
                        accent={accent}
                        hmCategoryColors={hmCat}
                        className="min-h-[230px] lg:min-h-full"
                        titleClassName="text-base"
                      />
                    ) : splitSidePlaceholderCount > 0 ? (
                      <VitrinSideHeadlineSkeleton className="min-h-[230px] lg:min-h-full" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <HeroSlider
                      slides={heroSliderNews}
                      accent={accent}
                      aspectRatio="3/2"
                      hmCategoryColors={hmCat}
                      numberedTabsBelow
                    />
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:auto-rows-fr">
                    {splitSideItems.slice(1, 3).map((n: any) => (
                      <HeadlineOverlayCard
                        key={n.id ?? n.slug}
                        n={n}
                        accent={accent}
                        hmCategoryColors={hmCat}
                        className="min-h-[150px] lg:h-full"
                      />
                    ))}
                    {splitSidePlaceholderCount > 0
                      ? Array.from(
                          { length: Math.max(0, Math.min(2, splitSidePlaceholderCount)) },
                          (_, index) => (
                            <VitrinSideHeadlineSkeleton key={`slider-band-right-sk-${index}`} className="min-h-[150px] lg:h-full" />
                          ),
                        )
                      : null}
                  </div>
                </div>
                <HmMansetHomeIconBand
                  accent={accent}
                  quickLinks={layoutPrefs.hmCorporateQuickLinks}
                  className="mt-1"
                />
              </div>
            ) : null}
            {effectiveMansetVariant === "full-thumbs" ? (
              <div className={`mb-6 `} data-manset-variant="full-thumbs">
                <HeroSlider slides={heroSliderNews} accent={accent} hmCategoryColors={hmCat} thumbStripBelow />
              </div>
            ) : null}
          </>
        );
      }
      case "mansetAd":
        if (layoutPrefs.hmNewsMansetAdModuleEnabled === false) return null;
        return mansetBelowHtmlDisplay ? (
          <div
            className="mb-6 rounded-xl border border-slate-200 bg-white overflow-hidden text-center"
            dangerouslySetInnerHTML={{ __html: mansetBelowHtmlDisplay }}
          />
        ) : null;
      case "authorsStrip":
        return newsHorizontalAuthorsEnabled && authors.length > 0 ? (
          <HmAuthorsStrip authors={authors} accent={accent} yazarlarHref={yazarlarHref} className="mb-6" />
        ) : null;
      case "yekpareKategorilerKutusu": {
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "yekpareKategorilerKutusu")) return null;
        const sections = selectModuleSections(
          "yekpareKategorilerKutusu",
          yekpareKategorilerKutusuSections,
          activeTab ? 1 : yekpareCategoryBoxCount,
          yekpareKutuItemTotal,
        );
        const hasBoxItems = sections.some((section) => (section.items?.length ?? 0) > 0);
        if (!hasBoxItems && homeNewsBootstrapping) {
          return (
            <HmNewsModuleSkeleton
              title="Yekpare Kategoriler Kutusu"
              className="hm-yekpare-kategori-kutusu hm-cross-theme-module"
              moduleId="yekpareKategorilerKutusu"
            />
          );
        }
        if (!hasBoxItems && !siteHasAnyNews) {
          return (
            <HmNewsModuleEmpty
              title="Yekpare Kategoriler Kutusu"
              className="hm-yekpare-kategori-kutusu hm-cross-theme-module"
              moduleId="yekpareKategorilerKutusu"
            />
          );
        }
        return (
          <div className="hm-cross-theme-module mb-6">
            <HmYekpareKategorilerKutusu
              className="hm-yekpare-kategori-kutusu"
              gridClassName={yekpareCategoryBoxGridClass(yekpareCategoryBoxCount)}
              globalDedupe={homeNewsDedupe}
              sections={sections.map((section) => ({
                slug: section.slug,
                title: section.title,
                color: section.color || accent,
                items: section.items ?? [],
              }))}
              getCategoryHref={(slug) =>
                h(
                  siteId != null
                    ? `/kategori/${slug}?siteId=${encodeURIComponent(String(siteId))}`
                    : `/kategori/${slug}`,
                )
              }
              getItemHref={(n) => hybridNewsItemHref(n, h)}
              listSlots={yekpareKutuListSlots}
            />
          </div>
        );
      }
      case "leadListSidebar": {
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "leadListSidebar")) return null;
        const categorySlug = moduleCategorySlug("leadListSidebar");
        const categoryTag = moduleCategoryTitle(categorySlug);
        const leadListPool = sortNewsByRecency(
          mergeUniqueNews(moduleSectionSourcePool, featured, latestNewsPool, classicHeadlinePool, popular).filter(isHeadlineFreshEnough),
        );
        const blockItemsRaw = selectModuleItems(
          "leadListSidebar",
          leadListPool,
          { limit: HM_LEAD_LIST_SIDEBAR_TOTAL, minItems: HM_LEAD_LIST_SIDEBAR_TOTAL },
        );
        const blockItems =
          blockItemsRaw.length > 0
            ? blockItemsRaw
            : ensureNewsBoxItems([], leadListPool.length > 0 ? leadListPool : moduleSectionSourcePool, HM_LEAD_LIST_SIDEBAR_TOTAL, homeNewsDedupe);
        rememberModuleItems(blockItems);
        const { lead, listItems } = splitCategoryBoxItems(blockItems, HM_LEAD_LIST_SIDEBAR_TOTAL - 1);
        if (!lead && listItems.length === 0 && homeNewsBootstrapping) {
          return (
            <HmNewsModuleSkeleton
              title="Öne Çıkan Haber Dosyası"
              className="hm-vitrin-card"
              moduleId="leadListSidebar"
            />
          );
        }
        if (!lead && listItems.length === 0 && moduleSectionSourcePool.length === 0) {
          return <HmNewsModuleEmpty title="Öne Çıkan Haber Dosyası" className="hm-vitrin-card" moduleId="leadListSidebar" />;
        }
        return (
          <section
            className="hm-vitrin-card mb-6 overflow-hidden rounded-2xl p-3 shadow sm:p-4"
            data-hm-home-module="leadListSidebar"
          >
            <SectionHead title="Öne Çıkan Haber Dosyası" categoryTag={categoryTag || undefined} color={accent} href={tumHaberlerHref} />
            <div className="hm-lead-list-mobile-grid sm:hidden">
              {[lead, ...listItems].filter(Boolean).slice(0, 6).map((n: any) => (
                <CardVert key={`m-${n.id ?? n.slug}`} n={n} imgHeight={72} accent={accent} hmCategoryColors={hmCat} className="!shadow-sm" />
              ))}
            </div>
            <div className="hm-lead-list-desktop-only relative isolate hidden gap-4 sm:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
              {lead ? (
                <HeadlineOverlayCard n={lead} accent={accent} hmCategoryColors={hmCat} className="min-h-[260px] sm:min-h-[320px]" titleClassName="text-xl sm:text-2xl" />
              ) : homeNewsBootstrapping ? (
                <HmNewsInlinePulse />
              ) : null}
              <div className="hm-vitrin-latest-panel min-h-0 overflow-hidden divide-y divide-slate-100 rounded-xl">
                {listItems.length > 0 ? listItems.map((n: any) => (
                  <CardHoriz key={n.id ?? n.slug} n={n} size="sm" accent={accent} hmCategoryColors={hmCat} className="min-h-[84px] !border-b-0" />
                )) : homeNewsBootstrapping ? (
                  <div className="space-y-2 p-2" aria-hidden>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex min-h-[84px] gap-2 rounded-lg border border-slate-100 p-2">
                        <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                        <div className="flex flex-1 flex-col justify-center gap-2">
                          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                          <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100/80" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        );
      }
      case "mediaDarkBlock": {
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "mediaDarkBlock")) return null;
        const galleryTitle = mediaGalleryModuleTitle("mediaDarkBlock");
        const galleryHref = mediaGalleryModuleHref("mediaDarkBlock");
        const items = mediaSpotlightItemsForModule("mediaDarkBlock", 6);
        if (items.length === 0 && homeNewsBootstrapping) {
          return (
            <HmNewsModuleSkeleton
              title={galleryTitle}
              className="hm-news-media-dark"
              moduleId="mediaDarkBlock"
            />
          );
        }
        if (items.length === 0 && !siteHasAnyNews) {
          return (
            <HmNewsModuleEmpty
              title={galleryTitle}
              className="hm-news-media-dark"
              moduleId="mediaDarkBlock"
              message={`Henüz ${galleryTitle.toLocaleLowerCase("tr-TR")} içeriği yok`}
            />
          );
        }
        if (items.length === 0) return null;
        return (
          <section className="hm-news-media-dark mb-6 rounded-2xl bg-slate-950 p-4 text-white shadow" data-hm-home-module="mediaDarkBlock">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-sm font-black uppercase tracking-wide">{galleryTitle}</h2>
              <div className="h-px flex-1 bg-white/20" />
              <Link href={galleryHref} className="text-xs font-bold text-white/80 hover:text-white">Tümü</Link>
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {items.map((n: any, index: number) => (
                <HeadlineOverlayCard
                  key={n.id ?? n.slug ?? index}
                  n={n}
                  accent={accent}
                  hmCategoryColors={hmCat}
                  className={`min-h-[120px] sm:min-h-[138px] ${index === 0 ? "hm-news-media-dark__card--hero md:min-h-[280px] md:col-span-2 md:row-span-2" : ""}`}
                  titleClassName={index === 0 ? "text-sm sm:text-xl" : "text-xs sm:text-sm"}
                />
              ))}
            </div>
          </section>
        );
      }
      case "recentVideosSidebar": {
        if (!portalHubOnly) return null;
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "recentVideosSidebar")) return null;
        if (!hmVideoTvHref) return null;
        return (
          <Suspense fallback={null}>
            <LazyHmRecentVideosBox
              videoTvHref={(sourceId, videoId) => h(`/video-tv/kanal/${sourceId}/${encodeURIComponent(videoId)}`)}
              listHref={hmVideoTvHref}
              accent={accent}
            />
          </Suspense>
        );
      }
      case "newsMapModule":
        if (!portalHubOnly) return null;
        if (!resolveHmNewsEditorModuleEnabled(layoutPrefs, "newsMapModule", { portalHubOnly })) return null;
        return (
          <Suspense fallback={null}>
            <LazyHmNewsMapModule
              siteId={siteId}
              linkMode="hm-editor"
              accent={accent}
              className="mb-6"
            />
          </Suspense>
        );
      case "worldBriefs":
        if (!resolveHmNewsEditorModuleEnabled(layoutPrefs, "worldBriefs")) return null;
        return <DunyadanKisaKisaBand accent={accent} className="mb-6" />;
      case "popularCities":
        return hmSlug && portalHubOnly && layoutPrefs.sadeNewsCitiesBandEnabled === true ? (
          <HmPopularCitiesSection hmSlug={hmSlug} accent={accent} />
        ) : null;
      case "culturePortal":
        return layoutPrefs.hmCorporateCulturePortalBandEnabled === true ? <NewsCulturePortalSection accent={accent} /> : null;
      case "ataturkCorner":
        return layoutPrefs.hmCorporateAtaturkCornerEnabled === true ? <NewsAtaturkCornerSection accent={accent} /> : null;
      case "heritageInfo":
        if (layoutPrefs.hmCorporateWarsSectionEnabled !== true && layoutPrefs.hmCorporateNationalDaysSectionEnabled !== true) {
          return null;
        }
        return (
          <NewsHeritageInfoSection
            accent={accent}
            showWars={layoutPrefs.hmCorporateWarsSectionEnabled === true}
            showNationalDays={layoutPrefs.hmCorporateNationalDaysSectionEnabled === true}
            warsHref={layoutPrefs.hmCorporateWarsSectionHref ?? null}
            nationalDaysHref={layoutPrefs.hmCorporateNationalDaysSectionHref ?? null}
          />
        );
      case "sehitSearch":
        return layoutPrefs.hmSehitSearchEnabled === true ? <HmSehitSearchModule variant="home" /> : null;
      case "homeMiddleAd":
        if (layoutPrefs.hmNewsHomeMiddleAdModuleEnabled === false) return null;
        return homeMiddleHtmlDisplay ? (
          <div
            className="mb-6 rounded-xl border border-slate-200 bg-white overflow-hidden text-center"
            dangerouslySetInnerHTML={{ __html: homeMiddleHtmlDisplay }}
          />
        ) : null;
      case "latestGrid": {
        const effectiveLatestGridMain = latestGridMainEnabled && !mansetRendersSonHaberler;
        if (!effectiveLatestGridMain && !showLatestGridSidebar) return null;

        const latestGridTabPool = sortNewsByRecency(
          mergeUniqueNews(bandNewsItems, allItems, popular),
        ).slice(0, 80);
        const latestGridOpeningSlugManual = hmCategorySlug(
          layoutPrefs.hmNewsHomeModuleCategorySlugs?.latestGrid,
        );
        const latestGridDisplayPool = (() => {
          if (!latestGridOpeningSlugManual) return latestGridTabPool;
          const matchesOpeningCategory = (item: any) =>
            hmNewsItemMatchesHomeCategorySlug(item, latestGridOpeningSlugManual, homeCategoryMatchContext) ||
            newsMatchesCategory(item, latestGridOpeningSlugManual);
          const matched = latestGridTabPool.filter(matchesOpeningCategory);
          return matched.length > 0 ? matched : latestGridTabPool;
        })();
        const latestGridItems = padNewsItemsToLimit(
          latestGridDisplayPool,
          latestGridTabPool,
          HM_HOME_LATEST_BAND_ITEM_COUNT,
          homeNewsDedupe,
        );
        const latestSectionTitle = latestGridOpeningSlugManual
          ? moduleCategoryTitle(latestGridOpeningSlugManual) || "Haberler"
          : "Son Haberler";

        const latestBand = (visible: typeof latestNewsPool) => (
          <Suspense
            fallback={
              <HmNewsModuleSkeleton title={latestSectionTitle} moduleId="latestGrid" className="!mb-0" />
            }
          >
            <LazyHmRssNewsBand
              title={latestSectionTitle}
              titleHref={tumHaberlerHref}
              items={visible.length > 0 ? visible : latestGridTabPool}
              tabSourceItems={latestGridTabPool}
              categoryTabs={tabStripCats}
              initialCategorySlug={latestGridOpeningSlugManual}
              accent={accent}
              hmCategoryColors={hmCat}
              pending={latestPending || latestBandPending}
              error={latestError || latestBandError}
              moreHref={tumHaberlerHref}
              moreLabel="Daha Fazla Haber"
              loadMoreMode="inline"
              categoriesHref={tumHaberlerHref}
              allNewsHref={sonDakikaHref}
              maxVisibleItems={HM_HOME_LATEST_BAND_ITEM_COUNT}
              categoryQuerySiteId={siteId}
              categoryRssScope="all"
              categoryMatchContext={homeCategoryMatchContext}
              className="flex h-full min-h-0 w-full max-w-none flex-1 flex-col"
            />
          </Suspense>
        );

        const sidebarColumn = showLatestGridSidebar ? (
          <div className="space-y-5">
                {resolveFinanceWeatherInSidebar(layoutPrefs) ? (
                  <HmFinanceWeatherPlacementBand variant="sidebar" />
                ) : null}
                {sidebarTopHtmlDisplay?.trim() ? (
                  <div
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden text-center p-2"
                    dangerouslySetInnerHTML={{ __html: sidebarTopHtmlDisplay }}
                  />
                ) : null}
                {newsSidebarMenuItems.length > 0 ? (
                  <div className="hm-vitrin-sidebar-panel rounded-xl p-4 shadow">
                    <div className="mb-3 flex items-center gap-2 border-b pb-2">
                      <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Sidebar Menü</h3>
                    </div>
                    <div className="space-y-0.5">
                      {newsSidebarMenuItems.map((item) => {
                        const rawHref = item.href.trim();
                        const normalizedExternal = normalizeHmPublicExternalHref(rawHref);
                        const href = normalizedExternal ?? (isExternalHref(rawHref) ? rawHref : h(rawHref.startsWith("/") ? rawHref : `/${rawHref}`));
                        const cls = "hm-vitrin-catlink group flex items-center justify-between rounded-lg px-3 py-2 transition";
                        const content = (
                          <>
                            <span className="hm-vitrin-catlink-text text-sm font-semibold text-gray-700">{item.label.trim()}</span>
                            <ChevronRight className="hm-vitrin-catlink-chev h-3.5 w-3.5 shrink-0 text-gray-400" />
                          </>
                        );
                        return isExternalHref(href) ? (
                          <a key={item.id} href={href} className={cls} rel="noopener noreferrer" target="_blank">
                            {content}
                          </a>
                        ) : (
                          <Link key={item.id} href={href} className={cls}>
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {popular.length > 0 && (
                  <div className="hm-vitrin-sidebar-panel rounded-xl p-4 shadow">
                    <SectionHead title="Popüler Haberler" color={accent} />
                    {pickSidebarNews(popular, 7).map((n, i) => (
                      <PopulerCard key={n.id} n={n} rank={i + 1} accent={accent} hmCategoryColors={hmCat} />
                    ))}
                  </div>
                )}

                {newsSidebarAuthorsEnabled && authors.length > 0 ? (
                  <div className="hm-vitrin-sidebar-panel rounded-xl border-t-4 p-4 shadow" style={{ borderTopColor: accent }}>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Köşe Yazarları</h3>
                      <div className="flex-1" />
                      <Link href={yazarlarHref} className="text-xs font-bold hover:opacity-70 transition" style={{ color: accent }}>
                        Tümü
                      </Link>
                    </div>
                    {authors.slice(0, 8).map((a) => (
                      <Link
                        key={a.id}
                        href={h(`/yazar/${a.id}`)}
                        className="flex items-center gap-3 py-2.5 border-b last:border-0 hover:bg-gray-50 transition rounded-lg px-1"
                      >
                        {a.avatarUrl ? (
                          <img
                            src={vitrinImgSrc(a.avatarUrl)}
                            alt={a.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: `linear-gradient(135deg,${accent},var(--hm-accent-2,${accent}))` }}
                          >
                            {a.name?.[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{a.name}</p>
                          {a.title ? <p className="text-[10px] text-gray-400 line-clamp-2">{a.title}</p> : null}
                        </div>
                      </Link>
                    ))}
                    <Link
                      href={yazarlarHref}
                      className="block mt-3 text-center text-xs font-bold py-2.5 rounded-xl text-white transition hover:opacity-90"
                      style={{ background: accent }}
                    >
                      Tüm Yazarlar →
                    </Link>
                  </div>
                ) : null}

                {layoutPrefs.moduleMacSonuclari ? <MatchResultsWidget accent={accent} /> : null}

                {newsSidebarCategoriesEnabled ? (
                  <div className="hm-vitrin-sidebar-panel rounded-xl p-4 shadow">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Kategoriler</h3>
                    </div>
                    <div className="space-y-0.5">
                      {(cats as any[]).slice(0, 10).map((c: any) => (
                        <Link
                          key={c.slug}
                          href={h(
                            siteId != null
                              ? `/kategori/${c.slug}?siteId=${encodeURIComponent(String(siteId))}`
                              : `/kategori/${c.slug}`,
                          )}
                          className="hm-vitrin-catlink group flex items-center justify-between rounded-lg px-3 py-2 transition"
                        >
                          <span className="hm-vitrin-catlink-text text-sm font-semibold text-gray-700">{c.name || c.label}</span>
                          <ChevronRight className="hm-vitrin-catlink-chev h-3.5 w-3.5 shrink-0 text-gray-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
          </div>
        ) : null;

        if (effectiveLatestGridMain && showLatestGridSidebar) {
          return (
            <HmSidebarBalancedGrid
              enabled
              className="mb-8 grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-stretch"
              mainClassName="min-w-0 w-full"
              sidebarClassName="min-w-0 w-full space-y-5"
              items={latestGridItems}
              columnsPerRow={3}
              fixedVisibleCount={HM_HOME_LATEST_BAND_ITEM_COUNT}
              mainHeader={null}
              mainFooter={null}
              renderItems={latestBand}
              sidebar={sidebarColumn}
            />
          );
        }

        if (effectiveLatestGridMain) {
          return (
            <div className="mb-8">
              {latestBand(latestGridItems.slice(0, HM_HOME_LATEST_BAND_ITEM_COUNT))}
            </div>
          );
        }

        return (
          <div className="mb-8">
            {sidebarColumn}
          </div>
        );
      }
      case "donationSupport":
        return isHmDonationActive(corporateDonation) && layoutPrefs.hmCorporateDonation?.enabled === true ? (
          <NewsDonationSupport donation={corporateDonation!} accent={accent} />
        ) : null;
      case "ahenkIconCategoryRow":
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkIconCategoryRow")) return null;
        return <HmAhenkIconCategoryRow kategoriHref={ahenkKategoriHref} />;
      case "ahenkGununSesiAuthors":
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkGununSesiAuthors")) return null;
        return <HmAhenkGununSesiAuthors {...buildAhenkBlockContext("ahenkGununSesiAuthors", 1, "GÜNÜN SESİ")} />;
      case "ahenkAnkaraGrid":
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkAnkaraGrid")) return null;
        return <HmAhenkAnkaraGrid {...buildAhenkBlockContext("ahenkAnkaraGrid", 4, "ANKARA")} />;
      case "ahenkGundemLeadSide":
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkGundemLeadSide")) return null;
        return <HmAhenkGundemLeadSide {...buildAhenkBlockContext("ahenkGundemLeadSide", 4, "GÜNDEM")} />;
      case "ahenkSporGrid":
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkSporGrid")) return null;
        return <HmAhenkSporGrid {...buildAhenkBlockContext("ahenkSporGrid", 6, "SPOR")} />;
      case "sporModule": {
        if (!resolveHmNewsEditorModuleEnabled(layoutPrefs, "sporModule")) return null;
        const sporSlug = "spor";
        const sporPool = sortNewsByRecency(
          mergeUniqueNews(moduleSectionSourcePool, latestNewsPool, popular, allItems, featured).filter(isHeadlineFreshEnough),
        );
        const sporCategorized = sporPool.filter(
          (item) =>
            hmNewsItemMatchesHomeCategorySlug(item, sporSlug, homeCategoryMatchContext) &&
            passesCategoryContentGuard(item, sporSlug),
        );
        const sporItems = pickAndPadModuleItems(
          sporCategorized.length > 0 ? sporCategorized : sporPool,
          4,
          sporPool,
        );
        rememberModuleItems(sporItems);
        return (
          <Suspense fallback={null}>
            <LazyHmSporModule
              items={sporItems}
              newsHref={(n) => hybridNewsItemHref(n, h)}
              kategoriHref={ahenkKategoriHref(sporSlug)}
              categoryTitle="SPOR"
              className="mb-6"
            />
          </Suspense>
        );
      }
      case "ahenkDunyaBlock":
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkDunyaBlock")) return null;
        return <HmAhenkDunyaBlock {...buildAhenkBlockContext("ahenkDunyaBlock", 5, "DÜNYA")} />;
      case "ahenkEkonomiGrid":
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkEkonomiGrid")) return null;
        return <HmAhenkEkonomiGrid {...buildAhenkBlockContext("ahenkEkonomiGrid", 8, "EKONOMİ")} />;
      case "ahenkSonEklenenler": {
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkSonEklenenler")) return null;
        const ctx = buildAhenkBlockContext("ahenkSonEklenenler", 10, "Son Eklenenler");
        ctx.items = pickAndPadModuleItems(latestNewsPool, 10, moduleSectionSourcePool);
        return <HmAhenkSonEklenenler items={ctx.items} newsHref={ctx.newsHref} accent={ctx.accent} hmCategoryColors={ctx.hmCategoryColors} />;
      }
      case "ahenkPopulerHaberler": {
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "ahenkPopulerHaberler")) return null;
        const ctx = buildAhenkBlockContext("ahenkPopulerHaberler", 8, "Popüler Haberler");
        ctx.items = pickAndPadModuleItems(popular.length > 0 ? popular : moduleSectionSourcePool, 8, moduleSectionSourcePool);
        return <HmAhenkPopulerHaberler items={ctx.items} newsHref={ctx.newsHref} accent={ctx.accent} hmCategoryColors={ctx.hmCategoryColors} />;
      }
      case "portal3ThemeBlock": {
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "portal3ThemeBlock")) return null;
        const categorySlug = moduleCategorySlug("portal3ThemeBlock");
        const categoryTag = moduleCategoryTitle(categorySlug);
        const portalPool = sortNewsByRecency(
          categorySlug
            ? moduleSectionSourcePool.filter((item) => newsMatchesCategory(item, categorySlug, homeCategoryMatchContext))
            : moduleSectionSourcePool,
        );
        const pool = portalPool.length > 0 ? portalPool : moduleSectionSourcePool;
        const sliderItems = pickAndPadModuleItems(pool, HM_HOME_HEADLINE_SLIDER_LIMIT);
        const sideItems = pickAndPadModuleItems(pool, HM_MANSET_SPLIT_SIDE_COUNT);
        const blockTitle = siteId == null ? "Yekpare Haberler" : "Gazete Vitrini";
        if (sliderItems.length === 0 && sideItems.length === 0 && !siteHasAnyNews) {
          return (
            <section className="hm-theme-block mb-6 rounded-2xl border border-slate-200 bg-[#e9e9e9] p-3" data-hm-vitrin-theme="portal3" data-hm-home-module="portal3ThemeBlock">
              <ClassicSectionTitle title={blockTitle} categoryTag={categoryTag || undefined} href={tumHaberlerHref} accent={accent} />
              <HmNewsModuleEmpty title={blockTitle} moduleId="portal3ThemeBlock" className="!mb-0 !shadow-none" />
            </section>
          );
        }
        if (sliderItems.length === 0 && sideItems.length === 0) return null;
        return (
          <section className="hm-theme-block mb-6 rounded-2xl border border-slate-200 bg-[#e9e9e9] p-3" data-hm-vitrin-theme="portal3" data-hm-home-module="portal3ThemeBlock">
            <ClassicSectionTitle title={blockTitle} categoryTag={categoryTag || undefined} href={tumHaberlerHref} accent={accent} />
            {sliderItems.length > 0 ? (
              <StableContainedHeadline
                items={sliderItems}
                sideItems={sideItems}
                accent={accent}
                hmCategoryColors={hmCat}
                href={tumHaberlerHref}
                embedded
                className="hm-contained-headline--portal3"
              />
            ) : null}
            {sideItems.length > 0 && sliderItems.length === 0 ? (
              <div className="hm-classic-mini-grid mt-2">
                {sideItems.map((n, index) => (
                  <ClassicCompactCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} />
                ))}
              </div>
            ) : null}
          </section>
        );
      }
      case "esenThemeBlock": {
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "esenThemeBlock")) return null;
        const esenManualBackfill = sortNewsByRecency(
          mergeUniqueNews(
            manualHeadlinePool,
            moduleSectionSourcePool.filter((item) => !isRssHybridItem(item)),
          ),
        );
        const esenSliderPool = sortNewsByRecency(
          mergeUniqueNews(centerMansetSliderItems, esenManualBackfill),
        );
        const esenSliderSource = esenSliderPool.length > 0 ? esenSliderPool : esenManualBackfill;
        const sliderItems = pickAndPadModuleItems(
          esenSliderSource,
          HM_HOME_HEADLINE_SLIDER_LIMIT,
          esenManualBackfill,
        );
        const sideItems = esenManualBackfill;
        if (sliderItems.length === 0 && !siteHasAnyNews) {
          if (homeNewsBootstrapping) {
            return (
              <HmNewsModuleSkeleton
                title="MANŞET HABER"
                className="!mb-6"
                moduleId="esenThemeBlock"
              />
            );
          }
          return null;
        }
        if (sliderItems.length === 0) return null;
        return (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-3" data-hm-vitrin-theme="esen" data-hm-home-module="esenThemeBlock">
            <ClassicSectionTitle title="MANŞET HABER" href={tumHaberlerHref} accent={accent} />
            <StableContainedHeadline
              items={sliderItems}
              sideItems={sideItems}
              accent={accent}
              hmCategoryColors={hmCat}
              href={tumHaberlerHref}
              embedded
              className="hm-contained-headline--esen min-h-0"
            />
          </section>
        );
      }
      case "featuredCategoryStrip": {
        if (!resolveHmNewsHomeModuleEnabled(layoutPrefs, "featuredCategoryStrip")) return null;
        const sections = selectModuleSections(
          "featuredCategoryStrip",
          featuredCategoryStripSections,
          activeTab ? 1 : HM_HOME_CATEGORY_BOX_MAX,
        );
        const visibleSections = sections.filter((section) => (section.items?.length ?? 0) > 0);
        if (visibleSections.length === 0 && homeNewsBootstrapping) {
          return (
            <HmNewsModuleSkeleton
              title="Kategori Vitrini"
              className="hm-news-featured-strip"
              moduleId="featuredCategoryStrip"
            />
          );
        }
        if (visibleSections.length === 0 && !siteHasAnyNews) {
          return <HmNewsModuleEmpty title="Kategori Vitrini" className="hm-news-featured-strip" moduleId="featuredCategoryStrip" />;
        }
        if (visibleSections.length === 0) return null;
        return (
          <section className="hm-news-featured-strip mb-6" data-hm-home-module="featuredCategoryStrip">
            <SectionHead title="Kategori Vitrini" color={accent} href={tumHaberlerHref} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {visibleSections.map((section) => {
                const item = section.items[0];
                const href = h(siteId != null ? `/kategori/${section.slug}?siteId=${encodeURIComponent(String(siteId))}` : `/kategori/${section.slug}`);
                const src = vitrinImgSrc(item?.imageUrl);
                return (
                  <Link key={section.slug || section.title} href={href} className="hm-vitrin-card group overflow-hidden rounded-xl shadow">
                    <div className="relative aspect-[16/10] bg-slate-100">
                      {src ? <img src={src} alt={newsDisplayTitle(item?.title ?? section.title)} className="h-full w-full object-cover transition group-hover:scale-105" /> : null}
                      <span className="absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-black uppercase text-white" style={{ background: section.color || accent }}>
                        {section.title}
                      </span>
                    </div>
                    <strong className="line-clamp-3 block p-3 text-xs font-black leading-snug text-slate-900">{newsDisplayTitle(item?.title ?? section.title)}</strong>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      }
      default:
        return null;
    }
  };
  const renderSafeNewsHomeModule = (moduleId: HmNewsHomeModuleId) => {
    if (!resolveHmNewsEditorModuleEnabled(layoutPrefs, moduleId, { portalHubOnly })) {
      return null;
    }
    const toggleEnabled =
      isHmNewsVitrinToggleModule(moduleId) && resolveHmNewsHomeModuleEnabled(layoutPrefs, moduleId);
    const toggleModuleTitle =
      moduleId === "mediaDarkBlock"
        ? mediaGalleryModuleTitle(moduleId)
        : HM_NEWS_VITRIN_TOGGLE_MODULE_LABELS[moduleId];
    let content: ReactNode = null;
    try {
      content = renderNewsHomeModule(moduleId);
    } catch (error) {
      console.error("[HaberAnasayfasi] Homepage block skipped before render", { moduleId, error });
      if (!toggleEnabled) return null;
      if (siteHasAnyNews) return null;
      content = homeNewsBootstrapping ? (
        <HmNewsModuleSkeleton title={toggleModuleTitle} moduleId={moduleId} />
      ) : (
        <HmNewsModuleEmpty
          title={toggleModuleTitle}
          moduleId={moduleId}
        />
      );
    }
    if (content == null && toggleEnabled && homeNewsBootstrapping) {
      content = (
        <HmNewsModuleSkeleton
          title={toggleModuleTitle}
          moduleId={moduleId}
        />
      );
    }
    if (content == null && toggleEnabled && !siteHasAnyNews && !homeNewsBootstrapping) {
      content = (
        <HmNewsModuleEmpty
          title={toggleModuleTitle}
          moduleId={moduleId}
        />
      );
    }
    if (content == null) return null;
    const wrapped = (
      <HmHomeBlockBoundary moduleId={moduleId}>
        {content}
      </HmHomeBlockBoundary>
    );
    if (isHmHomeAboveFoldModule(moduleId)) return wrapped;
    return (
      <HmLazyHomeSection
        moduleId={moduleId}
        onNearViewport={markBelowFoldReady}
        skeletonTitle={toggleEnabled ? toggleModuleTitle : undefined}
      >
        {wrapped}
      </HmLazyHomeSection>
    );
  };

  if (isCorporateTheme) {
    const corporateTepeMansetEnabled = resolveHmNewsEditorModuleEnabled(layoutPrefs, "tepeManset", { portalHubOnly });
    return (
      <>
        {corporateTepeMansetEnabled && tepeMansetItems.length > 0 ? (
          <div
            className="hm-vitrin-home hm-corporate-tepe-manset-wrap min-h-0"
            data-hm-vitrin-theme="corporate"
            style={{ background: "var(--hm-page-bg, #ffffff)" }}
          >
            <div className={hmVitrinContentShell("pt-3")}>
              <HmTepeManset
                items={tepeMansetItems}
                getItemHref={(n) => hybridNewsItemHref(n, h)}
                accent={accent}
              />
            </div>
          </div>
        ) : null}
      <HmCorporateHome
        siteId={siteId}
        accent={accent}
        hmCategoryColors={hmCat}
        siteDisplayName={siteDisplayName}
        siteDescription={siteDescription}
        latestList={latestNewsPool}
        featuredNewsList={corporateFeaturedNews}
        authors={authors}
        popular={popular}
        catSections={CAT_SECTIONS}
        activeTab={activeTab}
        currentCategoryName={currentCategoryName}
        latestPending={latestPending || latestBandPending}
        latestError={latestError || latestBandError}
        mansetBelowHtmlDisplay={mansetBelowHtmlDisplay}
        homeMiddleHtmlDisplay={homeMiddleHtmlDisplay}
        tumHaberlerHref={tumHaberlerHref}
        yazarlarHref={yazarlarHref}
        hmVideoTvHref={hmVideoTvHref}
        siteneEkleHref={siteneEkleHref}
        hmSlug={hmSlug}
        corporateSliderItems={layoutPrefs.corporateSliderItems ?? null}
        corporateBandItems={layoutPrefs.corporateBandItems ?? null}
        corporateQuickLinks={layoutPrefs.hmCorporateQuickLinks ?? null}
        corporateDonation={layoutPrefs.hmCorporateDonation ?? null}
        hmCorporateAtaturkCornerEnabled={layoutPrefs.hmCorporateAtaturkCornerEnabled}
        hmCorporateCulturePortalBandEnabled={layoutPrefs.hmCorporateCulturePortalBandEnabled}
        hmCorporateWarsSectionEnabled={layoutPrefs.hmCorporateWarsSectionEnabled}
        hmCorporateNationalDaysSectionEnabled={layoutPrefs.hmCorporateNationalDaysSectionEnabled}
        hmCorporateWarsSectionHref={layoutPrefs.hmCorporateWarsSectionHref ?? null}
        hmCorporateNationalDaysSectionHref={layoutPrefs.hmCorporateNationalDaysSectionHref ?? null}
        hmCorporateCategorySectionsEnabled={layoutPrefs.hmCorporateCategorySectionsEnabled}
        hmCorporateRssBandEnabled={layoutPrefs.hmCorporateRssBandEnabled === true}
        hmCorporateLatestNewsEnabled={layoutPrefs.hmCorporateLatestNewsEnabled}
        hmCorporateLatestDevelopmentsEnabled={layoutPrefs.hmCorporateLatestDevelopmentsEnabled}
        hmCorporateSidebarInfoEnabled={layoutPrefs.hmCorporateSidebarInfoEnabled}
        hmCorporateGoogleNewsBandEnabled={layoutPrefs.hmCorporateGoogleNewsBandEnabled === true}
        hmCorporateAuthorsEnabled={corporateAuthorsEnabled}
        hmSehitSearchEnabled={layoutPrefs.hmSehitSearchEnabled}
        layoutPrefs={layoutPrefs}
        hmCorporateHomeModuleOrder={layoutPrefs.hmCorporateHomeModuleOrder ?? null}
        categoryTabs={tabStripCats}
      />
      </>
    );
  }

  if (isEsenTheme) {
    const esenVideoModuleEnabled = mediaDarkModulesEnabled;
    const headlineRest = classicHeadlinePool.slice(1);
    const belowHeroPool = mergeUniqueNews(classicLatestMini, headlineRest.slice(4), latestNewsPool, bandNewsItems)
      .filter(isHeadlineFreshEnough);
    const belowHeroItems = pickAndPadModuleItems(
      featuredCategorySlug
        ? belowHeroPool.filter((item) => newsMatchesCategory(item, featuredCategorySlug, homeCategoryMatchContext))
        : belowHeroPool,
      HM_ESEN_LEAD_PACK_TOTAL,
      belowHeroPool,
      { exactLimit: true },
    );
    rememberModuleItems(belowHeroItems);
    const esenSidebarPopularItems = pickSidebarNews(popular.length > 0 ? popular : classicLatestMini, 6);
    const esenTodayHighlightItems = pickSidebarNews(todayHighlightMini, 6);
    const esenBottomWidgetNews =
      homeNewsDedupe.filterUnused(belowHeroPool)[0]
      ?? homeNewsDedupe.filterUnused(headlineRest)[0]
      ?? belowHeroPool.find((n) => !homeNewsDedupe.has(n))
      ?? null;
    const videoItems = pickAndPadModuleItems(
      sortNewsByRecency(mergeUniqueNews(headlineRest.slice(8), classicLatestMini, latestNewsPool)),
      6,
    );
    const hasEsenContent = belowHeroItems.length > 0 || classicHeadlinePool.length > 0;
    return (
      <div
        className="hm-vitrin-home hm-esen-home min-h-screen"
        data-hm-vitrin-theme={vitrinThemeAttr}
        data-hm-manset-variant={effectiveMansetVariant}
        style={{ background: "var(--hm-page-bg, #ffffff)" }}
      >
        {hmCtx == null ? (
          <div className="hm-esen-tab-strip sticky z-40" style={{ top: navTop }}>
            <div className="mx-auto flex max-w-screen-xl items-center overflow-x-auto px-3">
              {tabStripCats.map((c) => {
                const active = activeTab === c.slug;
                const catHref = c.slug ? `/haberler?hmTab=${encodeURIComponent(c.slug)}` : "/haberler";
                return (
                  <Link key={c.slug || "all"} href={catHref} className={active ? "is-active" : ""}>
                    {c.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <main className={hmVitrinContentShell(`hm-esen-shell pb-8 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`)}>
          {hasEsenContent ? (
            <>
              {renderSafeNewsHomeModule("tepeManset")}
              {renderNewsHomeModule("hero")}

              {newsAuthorsStripModuleEnabled && newsHorizontalAuthorsEnabled && authors.length > 0 ? (
                <section className="hm-esen-authors-band">
                  <button
                    type="button"
                    className="hm-esen-authors-nav hm-esen-authors-nav--prev"
                    aria-label="Önceki yazarlar"
                    onClick={() => scrollEsenAuthors(-1)}
                  >
                    ‹
                  </button>
                  <div ref={esenAuthorsScrollRef} className="hm-esen-authors-row">
                    {authors.map((a) => (
                      <Link key={a.id ?? a.name} href={h(`/yazar/${a.id}`)} className="hm-esen-author">
                        {a.avatarUrl ? <img src={vitrinImgSrc(a.avatarUrl)} alt={a.name} /> : <span>{String(a.name ?? "Y").charAt(0)}</span>}
                        <strong>{a.name}</strong>
                        {a.latestArticle?.title || a.title ? <em>{a.latestArticle?.title ?? a.title}</em> : null}
                      </Link>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="hm-esen-authors-nav hm-esen-authors-nav--next"
                    aria-label="Sonraki yazarlar"
                    onClick={() => scrollEsenAuthors(1)}
                  >
                    ›
                  </button>
                  <Link href={yazarlarHref} className="hm-esen-authors-more">Yazarlar</Link>
                </section>
              ) : null}

              {showFinanceWeatherInPageBody ? (
                <FinanceWeatherTicker
                  primaryColor={accent}
                  financeBg={financeBg}
                  showFinance={tickerFinanceEnabled}
                  showWeather={tickerWeatherEnabled}
                  breakingItems={siteId != null ? [] : tickerBreaking}
                />
              ) : null}
              {breaking.length > 0 && !showBand && siteId == null ? <SonDakikaTicker items={breaking} /> : null}
              {googleNewsBandEnabled ? (
                <HmRssBreakingBand
                  accent={accent}
                  layoutPrefs={layoutPrefs}
                  siteId={siteId}
                  fallbackNewsItems={rssBreakingFallbackItems.length ? rssBreakingFallbackItems : undefined}
                />
              ) : null}

              {mansetBelowHtmlDisplay ? (
                <div className="hm-esen-ad hm-esen-ad--wide" dangerouslySetInnerHTML={{ __html: mansetBelowHtmlDisplay }} />
              ) : null}

              {belowHeroPool.length > 0 ? (
                <section className="hm-esen-lead-pack">
                  <ClassicSectionTitle title="Günün Öne Çıkanları" href={tumHaberlerHref} accent={accent} />
                  <FeaturedCategoryTabs
                    tabs={tabStripCats}
                    selectedSlug={featuredCategorySlug}
                    accent={accent}
                    onSelect={setFeaturedCategorySlug}
                  />
                  {belowHeroItems.length > 0 ? (
                    <div className="hm-esen-lead-pack-grid">
                      {belowHeroItems[0] ? <ClassicFeatureCard n={belowHeroItems[0]} accent={accent} hmCategoryColors={hmCat} large /> : null}
                      {belowHeroItems.length > 1 ? (
                        <div className="hm-esen-lead-pack-small">
                          {belowHeroItems.slice(1).map((n, index) => (
                            <ClassicCompactCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : siteHasAnyNews ? (
                    <div className="hm-esen-lead-pack-grid">
                      {pickAndPadModuleItems(belowHeroPool, HM_ESEN_LEAD_PACK_TOTAL, belowHeroPool, { exactLimit: true }).map((n, index) => (
                        index === 0 ? (
                          <ClassicFeatureCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} large />
                        ) : (
                          <ClassicCompactCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} />
                        )
                      ))}
                    </div>
                  ) : homeNewsBootstrapping ? (
                    <HmNewsInlinePulse className="max-w-md" />
                  ) : null}
                </section>
              ) : null}

              {esenVideoModuleEnabled && videoItems.length > 0 && hmVideoTvHref ? (
                <section className="hm-esen-section hm-esen-section--video">
                  <ClassicSectionTitle title="Video Haber" href={hmVideoTvHref} accent={accent} />
                  <div className="hm-esen-video-grid">
                    {videoItems.map((n, index) => (
                      <ClassicFeatureCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} large={index === 0} />
                    ))}
                  </div>
                </section>
              ) : null}

              {homeMiddleHtmlDisplay ? (
                <div className="hm-esen-ad hm-esen-ad--wide" dangerouslySetInnerHTML={{ __html: homeMiddleHtmlDisplay }} />
              ) : null}

              <section className="hm-esen-bottom-widgets">
                {esenSidebarPopularItems.length > 0 ? <ClassicTextList title="Gündemde Öne Çıkanlar" items={esenSidebarPopularItems} accent={accent} href={tumHaberlerHref} /> : null}
                {esenTodayHighlightItems.length > 0 ? (
                  <ClassicTextList title="Günün Öne Çıkanları" items={esenTodayHighlightItems} accent="#2563eb" href={tumHaberlerHref} />
                ) : null}
                {esenBottomWidgetNews ? (
                  <aside className="hm-esen-bottom-widgets-feature">
                    <ClassicFeatureCard n={esenBottomWidgetNews} accent={accent} hmCategoryColors={hmCat} />
                  </aside>
                ) : null}
              </section>
            </>
          ) : latestPending || latestBandPending || homeNewsBootstrapping ? (
            <HmNewsModuleSkeleton className="!mb-6" />
          ) : latestError || latestBandError ? (
            <div className="hm-classic-empty-panel hm-classic-empty-panel--error">Haberler yüklenemedi.</div>
          ) : null}

          {orderedNewsModules
            .filter((moduleId) => !ESEN_NATIVE_HOME_MODULES.has(moduleId))
            .map((moduleId) => (
              <Fragment key={`esen-extra-${moduleId}`}>{renderSafeNewsHomeModule(moduleId)}</Fragment>
            ))}

          {showNewsFallbackDonation && corporateDonation ? (
            <NewsDonationSupport donation={corporateDonation} accent={accent} />
          ) : null}

          {hmCtx ? <HmYekpareFeaturesBand className="mt-6" /> : null}
        </main>

        {!hmBareChrome && hmCtx == null && fixedSiteIdProp == null && siteIdFromUrl == null ? (
          <footer className="hm-esen-footer">
            <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-9 sm:grid-cols-4">
              <div>
                <strong className="hm-esen-footer-logo">HABER <span>MERKEZİ</span></strong>
                <p>© {new Date().getFullYear()} Tüm hakları saklıdır.</p>
              </div>
              <ClassicCategoryLinks cats={(cats as any[]).slice(0, 8)} siteId={siteId} accent={accent} />
              <ClassicTextList title="Servisler" items={esenSidebarPopularItems.slice(0, 4)} accent={accent} href={tumHaberlerHref} />
              <div className="hm-esen-footer-links">
                <Link href={tumHaberlerHref}>Tüm Haberler</Link>
                <Link href={yazarlarHref}>Yazarlar</Link>
                <Link href={siteneEkleHref}>Sitene ekle</Link>
              </div>
            </div>
          </footer>
        ) : null}
      </div>
    );
  }

  if (isClassicTheme || isPortal3Theme) {
    const classicMainSliderItems = classicHeadlineSliderItems;
    const lead = classicMainSliderItems[0];
    const classicMansetVariant = effectiveMansetVariant;
    const classicHeroLatestEnabled = resolveHmNewsClassicHeroLatestEnabled(layoutPrefs);
    const classicTopListCount = classicMansetVariant === "magazine-grid" ? 4 : 6;
    const hasClassicSidebarAd = !!sidebarTopHtmlDisplay?.trim();
    const hasClassicHeroLatestList = classicHeroLatestEnabled && classicLatestMini.length > 0;
    const classicSideCount =
      classicMansetVariant === "full-numbered"
        ? resolveFullNumberedSideCount({
            hasSidebarAd: hasClassicSidebarAd,
            hasHeroLatest: hasClassicHeroLatestList,
          })
        : resolveClassicHeroSideCount(classicMansetVariant);
    const classicBelowHeroPoolRaw = sortNewsByRecency(
      mergeUniqueNews(classicLatestMini, latestNewsPool, bandNewsItems, allItems, popular, siteId != null ? breaking : []).filter(
        isHeadlineFreshEnough,
      ),
    );
    const classicBelowHeroPool = tepeMansetActive
      ? excludeHeadlineSliderItems(classicBelowHeroPoolRaw, tepeMansetItems)
      : classicBelowHeroPoolRaw;
    const classicMansetSidePrimaryPool = buildHeadlineSidePrimaryPool({
      siteId,
      sliderItems: classicMainSliderItems,
      tepeMansetItems,
      tepeMansetActive,
      yekparePoolItems: yekparePoolSideItems,
      legacySidePool: classicBelowHeroPool,
      yekparePoolReceiveEnabled: hmYekparePoolReceiveEnabled,
      mansetFallbackItems: mansetTaggedSideFallbackItems,
    });
    const classicSideWidenPools = siteId != null ? ([] as const) : ([moduleSectionSourcePool, latestNewsPool, popular] as const);
    const classicSideSourcePool = sortNewsByRecency(
      mergeUniqueNews(
        classicMansetSidePrimaryPool.length > 0 ? classicMansetSidePrimaryPool : classicBelowHeroPool,
        ...classicSideWidenPools,
      ),
    );
    const classicUsesSliderAwareSides =
      classicSideCount > 0 && classicMansetVariant !== "full-thumbs";
    const sideHeadlinesRaw = pickAndPadModuleItems(classicBelowHeroPool, classicSideCount);
    const classicSideResolve =
      classicMansetVariant === "center-trio" || classicMansetVariant === "slider-side-band"
        ? resolveCenterTrioSideHeadlines
        : resolveSplitSideHeadlines;
    const sideHeadlines = classicUsesSliderAwareSides
      ? pickHeroSideHeadlines({
          pool: classicMansetSidePrimaryPool.length > 0 ? classicMansetSidePrimaryPool : classicBelowHeroPool,
          widenPools: classicSideWidenPools,
          sliderItems: classicMainSliderItems,
          sideCount: classicSideCount,
          dedupe: homeNewsDedupe,
          resolve: classicSideResolve,
        })
      : sideHeadlinesRaw;
    const classicForceSideLayout = hasEnoughNewsForHeroSideHeadlines(
      classicSideSourcePool,
      classicMainSliderItems,
      classicSideCount,
    );
    const featuredStripBasePool = classicBelowHeroPool;
    const featuredStripUnused = homeNewsDedupe.filterUnused(featuredStripBasePool);
    const featuredCategoryPool = featuredCategorySlug
      ? featuredStripUnused.filter((item) =>
          newsMatchesCategory(item, featuredCategorySlug, homeCategoryMatchContext),
        )
      : featuredStripUnused;
    const latestStripItems = pickAndPadModuleItems(
      featuredCategorySlug
        ? featuredCategoryPool
        : featuredCategoryPool.length > 0
          ? featuredCategoryPool
          : featuredStripUnused,
      HM_HOME_FEATURED_STRIP_ITEM_COUNT,
      featuredStripBasePool,
    );
    const editorialItems = pickAndPadModuleItems(classicBelowHeroPool, 6);
    const classicCategoryBoxDedupe = createCategoryBoxModuleDedupeTracker();
    const classicCategorySectionsDisplay = ensureNewsBoxSections(
      classicCategorySections,
      moduleSectionSourcePool,
      CATEGORY_BOX_DISPLAY_TOTAL,
      (_section, sectionPool) =>
        pickModuleSectionCategoryItems(
          classicCategoryBoxDedupe,
          sectionPool,
          CATEGORY_BOX_DISPLAY_TOTAL,
          homeNewsDedupe,
        ),
      (section) => resolveSectionPoolItems(section, { allowGlobalPoolFallback: false }),
      homeNewsDedupe,
    ).map((section) => {
      const sectionGuardSlug = hmCategorySlug(section.slug, section.title);
      return {
        ...section,
        items: (section.items ?? []).filter((it: any) =>
          passesCategoryContentGuard(it, sectionGuardSlug),
        ),
      };
    });
    const classicHeroLatestItems = pickAndPadModuleItems(
      sortNewsByRecency(classicLatestMini),
      classicTopListCount,
    );
    const classicSidebarPopularItems = pickSidebarNews(popular.length > 0 ? popular : classicLatestMini, 7);
    const hasClassicContent = !!lead || featuredStripBasePool.length > 0 || classicCategorySections.length > 0;
    const hasClassicHeroSidebar = hasClassicSidebarAd || (classicHeroLatestEnabled && classicHeroLatestItems.length > 0);
    const classicTopGridState = resolveClassicTopGridState({
      isPortal3Theme,
      mansetVariant: classicMansetVariant,
      sideHeadlineCount: sideHeadlines.length,
      targetSideCount: classicSideCount,
      forceSideLayout: classicForceSideLayout,
      hasHeroSidebar: hasClassicHeroSidebar,
    });
    const classicTopGridClass = [
      "hm-classic-top-grid",
      `hm-classic-top-grid--${cssToken(classicMansetVariant)}`,
      classicTopGridState,
    ].filter(Boolean).join(" ");
    const renderClassicMainHeadline = () =>
      lead ? (
        <ClassicMainHeadlineSlider
          items={classicMainSliderItems}
          accent={accent}
          hmCategoryColors={hmCat}
          tabsClassName="hm-classic-number-tabs"
          maxTabs={HM_HOME_HEADLINE_SLIDER_LIMIT}
        />
      ) : null;
    const centerTrioSideLoading = latestPending || latestBandPending;
    const classicSidePlaceholderCount =
      centerTrioSideLoading && classicForceSideLayout && sideHeadlines.length < classicSideCount
        ? classicSideCount - sideHeadlines.length
        : 0;
    const renderClassicSideHeadlines = (
      items = sideHeadlines,
      single = false,
      placeholderCount = 0,
    ) => {
      const minSlots = classicForceSideLayout
        ? single
          ? 1
          : classicMansetVariant === "center-trio"
            ? 2
            : classicSideCount
        : 0;
      const slots = Math.max(items.length, placeholderCount, minSlots);
      if (slots === 0) return null;
      const fullNumberedGrid = classicMansetVariant === "full-numbered";
      const splitSideGrid = classicMansetVariant === "split" || classicMansetVariant === "slider-side-band";
      const sideClass = [
        "hm-classic-side-headlines",
        single ? "hm-classic-side-headlines--single" : "",
        fullNumberedGrid ? "hm-classic-side-headlines--full-numbered-grid" : "",
        splitSideGrid ? "hm-classic-side-headlines--split" : "",
      ].filter(Boolean).join(" ");
      return (
        <div
          className={sideClass}
          style={
            fullNumberedGrid
              ? { ["--hm-fn-side-rows" as string]: String(resolveFullNumberedSideGridRows(slots)) }
              : splitSideGrid
                ? { ["--hm-split-side-rows" as string]: String(HM_MANSET_SPLIT_SIDE_ROWS) }
                : undefined
          }
        >
          {items.map((n, index) => (
            <ClassicFeatureCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} />
          ))}
          {items.length < slots
            ? Array.from({ length: slots - items.length }, (_, index) => (
                <ClassicSideHeadlineSkeleton key={`side-sk-${index}`} large={single} />
              ))
            : null}
        </div>
      );
    };
    const renderClassicHeroSidebar = () => {
      const hasSidebarAd = !!sidebarTopHtmlDisplay?.trim();
      const hasLatestList = classicHeroLatestEnabled && classicHeroLatestItems.length > 0;
      if (!hasSidebarAd && !hasLatestList) return null;
      return (
      <aside className="hm-classic-hero-sidebar">
        {hasSidebarAd ? (
          <div className="hm-classic-ad" data-hm-ad-slot="sidebar_top" dangerouslySetInnerHTML={{ __html: sidebarTopHtmlDisplay }} />
        ) : null}
        {hasLatestList ? (
          <ClassicTextList title="Son Haberler" items={classicHeroLatestItems} accent={accent} href={tumHaberlerHref} className="hm-classic-top-news-list" />
        ) : null}
      </aside>
      );
    };
    const renderClassicHero = () => {
      if (classicMansetVariant === "center-trio" || classicMansetVariant === "slider-side-band") {
        const leftCard = sideHeadlines[0];
        const rightCards = sideHeadlines.slice(1, 3);
        const leftPlaceholderCount =
          !leftCard && (centerTrioSideLoading || classicForceSideLayout) ? 1 : 0;
        const rightPlaceholderCount =
          centerTrioSideLoading || classicForceSideLayout
            ? Math.max(0, 2 - rightCards.length)
            : 0;
        return (
          <section className={classicTopGridClass} data-manset-variant={classicMansetVariant}>
            <div className="hm-classic-hero-col hm-classic-hero-col--left min-w-0">
              {renderClassicSideHeadlines(leftCard ? [leftCard] : [], true, leftPlaceholderCount)}
            </div>
            <div className="hm-classic-hero-col hm-classic-hero-col--center min-w-0">
              {renderClassicMainHeadline()}
            </div>
            <div className="hm-classic-hero-col hm-classic-hero-col--right min-w-0">
              {renderClassicSideHeadlines(rightCards, false, rightPlaceholderCount)}
            </div>
            {hasClassicHeroSidebar ? renderClassicHeroSidebar() : null}
          </section>
        );
      }

      if (classicMansetVariant === "full-numbered" && isPortal3Theme) {
        return (
          <section className={classicTopGridClass} data-manset-variant="full-numbered">
            {renderClassicMainHeadline()}
            <div className="hm-classic-full-numbered-right">
              {renderClassicSideHeadlines(undefined, false, classicSidePlaceholderCount)}
              {renderClassicHeroSidebar()}
            </div>
          </section>
        );
      }

      return (
        <section className={classicTopGridClass} data-manset-variant={classicMansetVariant}>
          {renderClassicMainHeadline()}
          {renderClassicSideHeadlines(undefined, false, classicSidePlaceholderCount)}
          {renderClassicHeroSidebar()}
        </section>
      );
    };
    const renderClassicOrderedTopModule = (moduleId: HmNewsHomeModuleId) => {
      switch (moduleId) {
        case "breakingBand":
          return (
            <>
              {showFinanceWeatherInPageBody ? (
                <FinanceWeatherTicker
                  primaryColor={accent}
                  financeBg={financeBg}
                  showFinance={tickerFinanceEnabled}
                  showWeather={tickerWeatherEnabled}
                  breakingItems={siteId != null ? [] : tickerBreaking}
                />
              ) : null}
              {breaking.length > 0 && !showBand && siteId == null ? <SonDakikaTicker items={breaking} /> : null}
            </>
          );
        case "googleNewsBand":
          return googleNewsBandEnabled ? (
            <HmRssBreakingBand
              accent={accent}
              layoutPrefs={layoutPrefs}
              siteId={siteId}
              fallbackNewsItems={rssBreakingFallbackItems.length ? rssBreakingFallbackItems : undefined}
            />
          ) : null;
        case "tepeManset":
          if (!resolveHmNewsEditorModuleEnabled(layoutPrefs, "tepeManset", { portalHubOnly })) return null;
          return tepeMansetItems.length > 0 ? (
            <HmTepeManset
              items={tepeMansetItems}
              getItemHref={(n) => hybridNewsItemHref(n, h)}
              accent={accent}
            />
          ) : null;
        case "hero":
          return hasClassicContent ? (
            <>
              {renderClassicHero()}
              {classicMansetVariant === "slider-side-band" ? (
                <HmMansetHomeIconBand
                  accent={accent}
                  quickLinks={layoutPrefs.hmCorporateQuickLinks}
                  className="mb-6"
                />
              ) : null}
            </>
          ) : null;
        case "mansetAd":
          return mansetBelowHtmlDisplay ? (
            <div className="hm-classic-ad hm-classic-ad--wide" data-hm-ad-slot="manset_alti" dangerouslySetInnerHTML={{ __html: mansetBelowHtmlDisplay }} />
          ) : null;
        case "authorsStrip":
          return newsAuthorsEnabled && authors.length > 0 ? (
            <HmAuthorsStrip authors={authors} accent={accent} yazarlarHref={yazarlarHref} className="hm-classic-authors-strip mb-4" />
          ) : null;
        default:
          return null;
      }
    };
    const classicOrderedTopModules = CLASSIC_TOP_MODULE_CANONICAL_ORDER.filter((moduleId) =>
      orderedNewsModules.includes(moduleId),
    );
    const renderSafeClassicOrderedTopModule = (moduleId: HmNewsHomeModuleId) => {
      let content: ReactNode = null;
      try {
        content = renderClassicOrderedTopModule(moduleId);
      } catch (error) {
        console.error("[HaberAnasayfasi] Classic homepage block skipped before render", { moduleId, error });
        return null;
      }
      if (content == null) return null;
      return (
        <HmHomeBlockBoundary moduleId={moduleId}>
          {content}
        </HmHomeBlockBoundary>
      );
    };

    return (
      <div
        className={`hm-vitrin-home hm-classic-home ${isPortal3Theme ? "hm-portal3-home" : ""} min-h-screen`}
        data-hm-vitrin-theme={vitrinThemeAttr}
        data-hm-manset-variant={effectiveMansetVariant}
        style={{ background: "var(--hm-page-bg, #f4f5f7)" }}
      >
        {hmCtx == null ? (
          <div className="sticky z-40 border-b border-slate-800 shadow-sm" style={{ background: "#0f172a", top: navTop }}>
            <div className="max-w-screen-xl mx-auto px-3">
              <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {tabStripCats.map((c) => {
                  const active = activeTab === c.slug;
                  const pill = stripTabColor(c.slug, hmCat, accent);
                  const catHref = c.slug ? `/haberler?hmTab=${encodeURIComponent(c.slug)}` : "/haberler";
                  return (
                    <Link
                      key={c.slug || "all"}
                      href={catHref}
                      className="my-1 mr-1 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide transition"
                      style={{
                        background: active ? pill : "rgba(255,255,255,0.08)",
                        color: "#fff",
                        boxShadow: active ? "0 1px 0 rgba(0,0,0,0.35)" : undefined,
                      }}
                    >
                      {c.label}
                    </Link>
                  );
                })}
                <Link href={yazarlarHref} className="shrink-0 whitespace-nowrap px-4 py-2 text-xs font-black uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.72)" }}>
                  Yazarlar
                </Link>
                {hmVideoTvHref ? (
                  <Link href={hmVideoTvHref} className="shrink-0 whitespace-nowrap px-4 py-2 text-xs font-black uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.72)" }}>
                    Video TV
                  </Link>
                ) : null}
                <Link href={siteneEkleHref} className="shrink-0 whitespace-nowrap px-4 py-2 text-xs font-black uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.72)" }}>
                  Sitene ekle
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <main className={hmVitrinContentShell(`hm-classic-shell pb-6 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`)}>
          {classicOrderedTopModules.map((moduleId) => (
            <Fragment key={moduleId}>{renderSafeClassicOrderedTopModule(moduleId)}</Fragment>
          ))}

          {orderedNewsModules.includes("recentVideosSidebar") &&
          portalHubOnly &&
          resolveHmNewsHomeModuleEnabled(layoutPrefs, "recentVideosSidebar") ? (
            <Fragment key="recentVideosSidebar">{renderSafeNewsHomeModule("recentVideosSidebar")}</Fragment>
          ) : null}

          {hasClassicContent ? (
            <>
              {featuredStripBasePool.length > 0 &&
              resolveHmNewsHomeModuleEnabled(layoutPrefs, "featuredCategoryStrip") ? (
                <section className="hm-classic-partner-ring">
                  <ClassicSectionTitle title="Öne Çıkanlar" href={tumHaberlerHref} accent={accent} />
                  <FeaturedCategoryTabs
                    tabs={tabStripCats}
                    selectedSlug={featuredCategorySlug}
                    accent={accent}
                    onSelect={setFeaturedCategorySlug}
                  />
                  {latestStripItems.length > 0 ? (
                    <div className="hm-classic-mini-grid">
                      {latestStripItems.map((n, index) => (
                        <ClassicCompactCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} />
                      ))}
                    </div>
                  ) : siteHasAnyNews ? (
                    <div className="hm-classic-mini-grid">
                      {pickAndPadModuleItems(featuredStripBasePool, HM_HOME_FEATURED_STRIP_ITEM_COUNT).map((n, index) => (
                        <ClassicCompactCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} />
                      ))}
                    </div>
                  ) : homeNewsBootstrapping ? (
                    <HmNewsInlinePulse className="max-w-md" />
                  ) : null}
                </section>
              ) : null}

              <section className="hm-classic-content-layout">
                <div className="hm-classic-main-column">
                  {classicCategorySectionsDisplay.map((section) => {
                    const [mainItem, ...gridItems] = section.items;
                    if (!mainItem) return null;
                    const sectionHref = h(siteId != null ? `/kategori/${section.slug}?siteId=${encodeURIComponent(String(siteId))}` : `/kategori/${section.slug}`);
                    const sideItems = gridItems.slice(0, CATEGORY_BOX_LIST_SLOTS);
                    return (
                      <section key={section.slug || section.title} className="hm-classic-category-section">
                        <ClassicSectionTitle title={section.title} href={sectionHref} accent={section.color || accent} />
                        <div className="hm-classic-category-grid">
                          <ClassicFeatureCard n={mainItem} accent={section.color || accent} hmCategoryColors={hmCat} large />
                          {sideItems.length > 0 ? (
                            <div className="hm-classic-category-cards">
                              {sideItems.map((n, index) => (
                                <ClassicCompactCard
                                  key={n.id ?? n.slug ?? `${section.slug}-${index}`}
                                  n={n}
                                  accent={section.color || accent}
                                  hmCategoryColors={hmCat}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </section>
                    );
                  })}

                  {homeMiddleHtmlDisplay ? (
                    <div className="hm-classic-ad hm-classic-ad--wide" data-hm-ad-slot="home_middle" dangerouslySetInnerHTML={{ __html: homeMiddleHtmlDisplay }} />
                  ) : null}

                  {editorialItems.length > 0 ? (
                    <section className="hm-classic-editor-picks">
                      <ClassicSectionTitle title="Editörün Seçtikleri" href={tumHaberlerHref} accent={accent} />
                      <div className="hm-classic-editor-grid">
                        {editorialItems.map((n, index) => (
                          <ClassicCompactCard key={n.id ?? n.slug ?? index} n={n} accent={accent} hmCategoryColors={hmCat} horizontal={index > 0} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>

                <aside className="hm-classic-sidebar">
                  {newsAuthorsEnabled && authors.length > 0 && newsSidebarEnabled ? <ClassicAuthorsWidget authors={authors} yazarlarHref={yazarlarHref} accent={accent} /> : null}
                  <div className="hm-classic-social-widget">
                    <ClassicSectionTitle title="Takipte Kalın" accent={accent} />
                    <div>
                      {quickLinks.slice(0, 4).map((item) => (
                        <Link key={item.key} href={item.href}>
                          <span>{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <ClassicTextList title="Popüler Haberler" items={classicSidebarPopularItems} accent={accent} href={tumHaberlerHref} />
                  {layoutPrefs.moduleMacSonuclari ? <MatchResultsWidget accent={accent} /> : null}
                  {newsSidebarCategoriesEnabled ? <ClassicCategoryLinks cats={cats as any[]} siteId={siteId} accent={accent} /> : null}
                  {newsSidebarMenuItems.length > 0 ? (
                    <section className="hm-classic-widget">
                      <ClassicSectionTitle title="Hızlı Linkler" accent={accent} />
                      <div className="hm-classic-cat-links">
                        {newsSidebarMenuItems.map((item) => {
                          const rawHref = item.href.trim();
                          const href = isExternalHref(rawHref) ? rawHref : h(rawHref.startsWith("/") ? rawHref : `/${rawHref}`);
                          return isExternalHref(rawHref) ? (
                            <a key={item.id} href={href} rel="noopener noreferrer" target="_blank">
                              {item.label.trim()}
                            </a>
                          ) : (
                            <Link key={item.id} href={href}>
                              {item.label.trim()}
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                </aside>
              </section>
            </>
          ) : latestPending || latestBandPending || homeNewsBootstrapping ? (
            <HmNewsModuleSkeleton className="!mb-6" />
          ) : latestError || latestBandError ? (
            <div className="hm-classic-empty-panel hm-classic-empty-panel--error">Haberler yüklenemedi.</div>
          ) : null}

          {orderedNewsModules
            .filter((moduleId) => !CLASSIC_NATIVE_HOME_MODULES.has(moduleId))
            .map((moduleId) => (
              <Fragment key={`classic-extra-${moduleId}`}>{renderSafeNewsHomeModule(moduleId)}</Fragment>
            ))}

          {showNewsFallbackDonation && corporateDonation ? (
            <NewsDonationSupport donation={corporateDonation} accent={accent} />
          ) : null}

          {hmCtx ? <HmYekpareFeaturesBand className="mt-6" /> : null}
        </main>

        {!hmBareChrome && hmCtx == null && fixedSiteIdProp == null && siteIdFromUrl == null ? (
          <footer className="mt-4 py-8 px-4 text-center text-gray-500 text-xs border-t bg-white">
            <p className="font-bold text-gray-700 mb-1">Yekpare</p>
            <p>© {new Date().getFullYear()} Tüm hakları saklıdır.</p>
            <div className="flex flex-wrap justify-center gap-5 mt-3">
              <Link href="/" className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
                Ana Sayfa
              </Link>
              <Link href={tumHaberlerHref} className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
                Tüm Haberler
              </Link>
              <Link href={yazarlarHref} className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
                Yazarlar
              </Link>
              <Link href={siteneEkleHref} className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
                Sitene ekle
              </Link>
              <Link href="/kesfet" className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
                Keşfet
              </Link>
            </div>
          </footer>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="hm-vitrin-home min-h-screen"
      data-hm-vitrin-theme={vitrinThemeAttr}
      data-hm-manset-variant={effectiveMansetVariant}
      style={{ background: "var(--hm-page-bg, #ffffff)" }}
    >

      {/* ÔöÇÔöÇ Kategori şeridi: HM vitrinde `HmNestedLayout` içindeki ortak şerit kullanılır (`hmTab`). ÔöÇÔöÇ */}
      {hmCtx == null ? (
        <div className="sticky z-40 border-b border-slate-800 shadow-sm" style={{ background: "#0f172a", top: navTop }}>
          <div className="max-w-screen-xl mx-auto px-3">
            <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {tabStripCats.map((c) => {
                const active = activeTab === c.slug;
                const pill = stripTabColor(c.slug, hmCat, accent);
                const catHref = c.slug ? `/haberler?hmTab=${encodeURIComponent(c.slug)}` : "/haberler";
                return (
                  <Link
                    key={c.slug || "all"}
                    href={catHref}
                    className="my-1 mr-1 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide transition"
                    style={{
                      background: active ? pill : "rgba(255,255,255,0.08)",
                      color: "#fff",
                      boxShadow: active ? "0 1px 0 rgba(0,0,0,0.35)" : undefined,
                    }}
                  >
                    {c.label}
                  </Link>
                );
              })}
              <Link
                href={yazarlarHref}
                className="shrink-0 whitespace-nowrap px-4 py-2 text-xs font-black uppercase tracking-wide"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                Yazarlar
              </Link>
              {hmVideoTvHref ? (
                <Link
                  href={hmVideoTvHref}
                  className="shrink-0 whitespace-nowrap px-4 py-2 text-xs font-black uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.72)" }}
                >
                  Video TV
                </Link>
              ) : null}
              <Link
                href={siteneEkleHref}
                className="shrink-0 whitespace-nowrap px-4 py-2 text-xs font-black uppercase tracking-wide"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                Sitene ekle
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className={hmVitrinContentShell(`pb-4 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`)}>
        {orderedNewsModules.map((moduleId) => (
          <Fragment key={moduleId}>{renderSafeNewsHomeModule(moduleId)}</Fragment>
        ))}
        {showNewsFallbackDonation && corporateDonation ? (
          <NewsDonationSupport donation={corporateDonation} accent={accent} />
        ) : null}
        {hmCtx ? <HmYekpareFeaturesBand className="mt-6" /> : null}
      </div>

      {!hmBareChrome && hmCtx == null && fixedSiteIdProp == null && siteIdFromUrl == null ? (
        <footer className="mt-4 py-8 px-4 text-center text-gray-500 text-xs border-t bg-white">
          <p className="font-bold text-gray-700 mb-1">Yekpare</p>
          <p>© {new Date().getFullYear()} Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap justify-center gap-5 mt-3">
            <Link href="/" className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
              Ana Sayfa
            </Link>
            <Link href={tumHaberlerHref} className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
              Tüm Haberler
            </Link>
            <Link href={yazarlarHref} className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
              Yazarlar
            </Link>
            <Link href={siteneEkleHref} className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
              Sitene ekle
            </Link>
            <Link href="/kesfet" className="hover:opacity-80 transition font-medium" style={{ color: accent }}>
              Keşfet
            </Link>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
