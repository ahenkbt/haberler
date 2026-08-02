import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, Redirect, useLocation, useParams } from "wouter";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { SADE_PUBLIC_HERO_CONTENT_CLASS, SADE_PUBLIC_HERO_CONTENT_COMPACT_CLASS, SADE_PUBLIC_HERO_STAGE_CLASS, SADE_PUBLIC_HERO_SURFACE_CLASS, SADE_PUBLIC_PAGE_BG, SADE_PUBLIC_PAGE_BG_WHITE, SADE_PUBLIC_POST_HERO_BODY_CLASS, SADE_PUBLIC_POST_HERO_MAIN_CLASS, SADE_PUBLIC_POST_HERO_STACK_CLASS, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";
import {
  YEKPARE_PLATFORM_NAV,
  YEKPARE_SERVICE_MODULE_META,
  YEKPARE_SERVICE_MODULE_ORDER,
  resolveSixAmMartActiveFromPath,
  type SixAmMartModuleKey,
} from "@/lib/yekpareServiceNav";
import { kesfetSearchTarget, filterPublicTopNavForHeader, resolvePublicTopNav } from "@/lib/kesfetDiscoverHub";
import { isTurizmNavActive } from "@/themes/turizm/turizmRoutes";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Clock,
  Heart,
  LocateFixed,
  Bot,
  Map,
  MapPin,
  Menu,
  Newspaper,
  Radio,
  PenLine,
  Phone,
  PlayCircle,
  Search,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
  UserRound,
  Users,
  Utensils,
  Wrench,
} from "lucide-react";
import {
  useGetSiteSettings,
} from "@workspace/api-client-react";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { GoogleTrAddressQuickFill } from "@/components/GoogleTrAddressQuickFill";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { SadeHeaderLocationPill } from "@/components/SadeHeaderLocationPill";
import { SearchEngineFooter } from "@/components/SearchEngineFooter";
import { SearchEngineHeader } from "@/components/SearchEngineHeader";
import { SearchEngineSubNavStack } from "@/components/SearchEngineSubNavStack";
import { useSearchEngineHeaderState } from "@/hooks/useSearchEngineHeaderState";
import { useYekpareTheme } from "@/hooks/useYekpareTheme";
import { shouldShowGlobalCategoryPills } from "@/lib/searchEngineNav";
import { isPortalNewsPlatformHost } from "@/lib/portalPlatformPolicy";
import { SadeLocationPickerModal } from "@/components/SadeLocationPickerModal";
import {
  formatPublicLocationLabel,
  PUBLIC_LOCATION_UPDATED_EVENT,
  readPublicLocation,
  type PublicLocationState,
} from "@/lib/publicLocation";
import { resolveClientMediaSrc, normalizeAiNewsHtml, rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { NewsArticleBody } from "@/components/NewsArticleBody";
import { EditorialNewsDetailHeader } from "@/components/EditorialNewsDetailHeader";
import { HmNewsDetailSidebar } from "@/components/HmNewsDetailSidebar";
import { coercePublicHybridNewsHref, mapPublicHybridNewsLinkFields, newsItemIsRssSource } from "@/lib/hybridNewsHref";
import { resolveNewsExcerpt } from "@/lib/resolveNewsExcerpt";
import { estimateNewsReadMinutes } from "@/lib/newsArticleMetrics";
import { usePortalNewsLayoutPrefs } from "@/hooks/useNewsSiteLayout";
import {
  isSadeNewsPortalModuleEnabled,
  resolveSadeNewsPortalModuleOrder,
  resolveTickerFinanceEnabled,
  resolveTickerWeatherEnabled,
  type SadeNewsPortalModuleId,
} from "@/lib/newsSiteLayout";
import { NewsCategorySubNav } from "@/components/NewsCategorySubNav";
import { SadePublicFooter } from "./SadePublicFooter";
import { KesfetRegionsExploreBlock } from "@/components/kesfet-listinghub/KesfetRegionsExploreBlock";
import { HmRssNewsBand, type HmRssCategoryTab } from "@/components/HmRssNewsBand";
import {
  KoseAuthorArticlesBand,
  KoseAuthorByline,
  KoseOtherAuthorsBand,
  type KoseAuthorBrief,
  type KoseArticleBrief,
} from "@/components/HmKoseCarouselBands";
import { buildKoseArticlePublicPath, hasKoseAuthorId, isKoseArticle } from "@/lib/isKoseArticle";
import {
  SadeAtaturkBand,
  SadeBreakingBand,
  SadeEditorialTimeline,
  SadeFinanceWeatherStrip,
  SadeHistoryNationalDaysBand,
  SadeHomeCitiesBandCompact,
  SadeNewsHeadlineGrid,
  SadeNewsletterCta,
  SadeRssBreakingBand,
  SadePublicInfoCards,
  SadeYekpareHaberlerBlock,
  useSadeFeaturedHeadlines,
} from "./SadeNewsModules";
import { HomeTravelTabs } from "./HomeTravelTabs";
import { HmYekpareCategoryBox } from "@/components/HmYekpareKategorilerKutusu";
import { CATEGORY_BOX_DISPLAY_TOTAL, ensureNewsBoxItems } from "@/lib/hmCategoryBoxItems";
import { HmRecentVideosBox } from "@/components/HmRecentVideosBox";
import { HmNewsImage, resolveNewsItemImageUrl, resolveNewsItemImageFallbackUrl } from "@/components/HmNewsImage";
import { HmNewsMapModule } from "@/components/HmNewsMapModule";
import { DunyadanKisaKisaBand } from "@/components/DunyadanKisaKisaBand";

const API = "/api";

const SADE_ACCENT = "#0EA5E9";
const SADE_ACCENT_DARK = "#0284C7";

const NEWS_CATEGORY_MODULES = [
  { slug: "gundem", label: "Gündem", color: SADE_ACCENT },
  { slug: "ekonomi", label: "Ekonomi", color: "#f97316" },
  { slug: "spor", label: "Spor", color: "#16a34a" },
  { slug: "dunya", label: "Dünya", color: "#2563eb" },
  { slug: "teknoloji", label: "Teknoloji", color: "#7c3aed" },
  { slug: "kultur", label: "Kültür", color: "#9333ea" },
] as const;

const STANDARD_PORTAL_NEWS_TABS: HmRssCategoryTab[] = [
  { label: "Tümü", slug: "" },
  ...NEWS_CATEGORY_MODULES.map((cat) => ({ label: cat.label.toLocaleUpperCase("tr-TR"), slug: cat.slug })),
];

const SERVICE_RAIL_ICON: Record<
  SixAmMartModuleKey,
  { icon: typeof Utensils; color: string; bg: string }
> = {
  rental: { icon: Building2, color: "#0284c7", bg: "bg-sky-50" },
};

const PLATFORM_RAIL_ICON: Record<string, { icon: typeof Compass; color: string; bg: string }> = {
  "/kesfet": { icon: Compass, color: "#3b82f6", bg: "bg-blue-50" },
  "/haritalar": { icon: Map, color: "#0284C7", bg: "bg-sky-50" },
  "/haberler": { icon: Newspaper, color: SADE_ACCENT, bg: "bg-sky-50" },
  "/yektube": { icon: PlayCircle, color: "#dc2626", bg: "bg-red-50" },
  "/habermerkezi": { icon: Radio, color: "#7c3aed", bg: "bg-violet-50" },
  "/ai-cagri-merkezi": { icon: Bot, color: "#0284C7", bg: "bg-sky-50" },
};

const HOME_SERVICE_RAILS = [
  ...YEKPARE_SERVICE_MODULE_ORDER.map((key) => {
    const meta = YEKPARE_SERVICE_MODULE_META[key];
    const rail = SERVICE_RAIL_ICON[key];
    return { label: meta.label, href: meta.href, icon: rail.icon, color: rail.color, bg: rail.bg };
  }),
  ...YEKPARE_PLATFORM_NAV.map((item) => {
    const rail = PLATFORM_RAIL_ICON[item.href] ?? PLATFORM_RAIL_ICON["/kesfet"];
    return { label: item.label, href: item.href, icon: rail.icon, color: rail.color, bg: rail.bg };
  }),
  {
    label: "Haber Merkezi",
    href: "/habermerkezi",
    icon: Radio,
    color: "#7c3aed",
    bg: "bg-violet-50",
  },
  {
    label: "AI Çağrı",
    href: "/ai-cagri-merkezi",
    icon: Bot,
    color: "#0284C7",
    bg: "bg-sky-50",
  },
] as const;

const YEKPARE_PLATFORM_MODULES = [
  { title: "Keşfet", href: "/kesfet", icon: Compass, accent: "#3b82f6", description: "Sipariş, alışveriş, haritalar, seyahat, haberler, YekTube, Bilgi Ağacı ve daha fazlası — tek merkezden." },
  { title: "Haritalar", href: "/haritalar", icon: Map, accent: "#0284C7", description: "İşletmeleri haritada keşfet, rota ve konum ara." },
  { title: "Haberler", href: "/haberler", icon: Newspaper, accent: SADE_ACCENT, description: "Gündem, manşet ve kategori haber akışı." },
  { title: "YekTube", href: "/yektube", icon: PlayCircle, accent: "#dc2626", description: "Canlı TV, kanallar ve video içerikleri." },
  { title: "Haber Merkezi", href: "/habermerkezi", icon: Radio, accent: "#7c3aed", description: "Yayın siteleri, RSS ve haber merkezi vitrinleri." },
  { title: "AI Çağrı Merkezi", href: "/ai-cagri-merkezi", icon: Bot, accent: "#0284C7", description: "Yapay zeka destekli çağrı ve mesajlaşma hizmetleri." },
] as const;

type SadeAuthor = {
  id: number | string;
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  latestArticle?: { id: number | string; title: string; slug: string } | null;
};

export type { SixAmMartModuleKey };
type TrAddressValue = { city: string; district: string; mahalle: string; sokak?: string };

type ModuleDef = {
  key: SixAmMartModuleKey;
  label: string;
  title: string;
  href: string;
  icon: typeof Store;
  accent: string;
  bg: string;
  description: string;
};

const MODULE_ICON: Record<SixAmMartModuleKey, { icon: typeof Store; accent: string; bg: string }> = {
  rental: { icon: Building2, accent: "#0284c7", bg: "bg-sky-50" },
};

const MODULES: ModuleDef[] = YEKPARE_SERVICE_MODULE_ORDER.map((key) => {
  const meta = YEKPARE_SERVICE_MODULE_META[key];
  const visual = MODULE_ICON[key];
  return {
    key,
    label: meta.label,
    title: meta.title,
    href: meta.href,
    icon: visual.icon,
    accent: visual.accent,
    bg: visual.bg,
    description: meta.description,
  };
});

const PUBLIC_LINK_ICONS: Record<string, typeof Compass> = {
  "/kesfet": Compass,
  "/haritalar": Map,
  "/turizm": Building2,
  "/haberler": Newspaper,
  "/yektube": PlayCircle,
  "/bilgiagaci": BookOpen,
  "/iletisim": Phone,
};

function platformLinkIcon(href: string) {
  const path = href.split("?")[0] ?? href;
  return PUBLIC_LINK_ICONS[path] ?? Compass;
}

function isShellNavLinkActive(pathOnly: string, href: string): boolean {
  if (href === "/turizm") return isTurizmNavActive(pathOnly);
  if (href === "/") return pathOnly === "/";
  if (href === "/yektube") return pathOnly === "/yektube" || pathOnly.startsWith("/yektube/");
  if (href === "/kesfet") return pathOnly === "/kesfet" || pathOnly.startsWith("/kesfet/");
  return pathOnly.startsWith(href);
}

type HomepageBusiness = {
  id: string;
  name: string;
  photoUrl?: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  storefrontHref?: string | null;
  discoverHref?: string | null;
  slug?: string | null;
};

type VendorCategory = {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  position?: number | null;
  superCategory?: string | null;
};

type Vendor = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  storefrontHref?: string | null;
  categoryId?: number | null;
  imageUrl?: string | null;
  coverUrl?: string | null;
  city?: string | null;
  district?: string | null;
  deliveryFee?: string | null;
  minOrderAmount?: string | null;
  deliveryTime?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  isOpen?: boolean;
  featured?: boolean;
  tags?: string[];
};

type Product = {
  id: number | string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | string | null;
  salePrice?: number | string | null;
  vendorName?: string | null;
  vendorSlug?: string | null;
  vendorImageUrl?: string | null;
  vendorRating?: number | null;
  href?: string | null;
  storefrontHref?: string | null;
  categoryName?: string | null;
};

type CategoryNode = {
  id: number;
  name: string;
  slug?: string | null;
  icon?: string | null;
  children?: CategoryNode[];
};

type MarketplacePayload = {
  vendors?: Vendor[];
  categories?: CategoryNode[];
  products?: Product[];
  featuredProducts?: Product[];
  bestSelling?: Product[];
  newest?: Product[];
  campaigns?: Array<{
    id: number;
    title: string;
    description?: string | null;
    vendorName?: string | null;
    storefrontHref?: string | null;
    vendorImageUrl?: string | null;
    vendorCoverUrl?: string | null;
  }>;
  stats?: { vendorCount?: number; productCount?: number; categoryCount?: number };
};

type TourismListing = {
  id: number;
  type: string;
  title: string;
  slug: string;
  city?: string | null;
  image_url?: string | null;
  price?: string | number | null;
  sale_price?: string | number | null;
  price_unit?: string | null;
  star_rating?: number | null;
  rating?: number | null;
  review_count?: number | null;
  href?: string | null;
  map_business_fallback?: boolean;
};

type NewsCardItem = {
  id: number | string;
  slug?: string | null;
  title: string;
  spot?: string | null;
  summary?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  imageFallbackUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  authorName?: string | null;
  authorId?: number | null;
  contentKind?: "news" | "makale";
  hmSyncKind?: "news" | "makale" | null;
  rssSourceUrl?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  source?: "db" | "rss";
  feedLabel?: string | null;
  href?: string | null;
};

function mapHybridNewsRow(row: Record<string, unknown>): NewsCardItem {
  const { id, slug, source, href } = mapPublicHybridNewsLinkFields(row);
  return {
    id,
    slug,
    title: String(row.title ?? ""),
    spot: (row.spot as string | null) ?? null,
    imageUrl: (row.imageUrl as string | null) ?? null,
    imageFallbackUrl: (row.imageFallbackUrl as string | null) ?? null,
    categoryName: (row.categoryName as string | null) ?? null,
    categorySlug: (row.categorySlug as string | null) ?? null,
    authorName: (row.authorName as string | null) ?? (row.feedLabel as string | null) ?? null,
    publishedAt: (row.publishedAt as string | null) ?? null,
    createdAt: (row.publishedAt as string | null) ?? null,
    source,
    feedLabel: (row.feedLabel as string | null) ?? null,
    href,
  };
}

async function fetchHybridNews(params: {
  categorySlug?: string;
  limit: number;
  offset?: number;
  rssOnly?: boolean;
  rssScope?: "site" | "box" | "all";
  fresh?: boolean;
}): Promise<NewsCardItem[]> {
  const qs = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset ?? 0),
    fresh: "1",
  });
  if (params.categorySlug) qs.set("categorySlug", params.categorySlug);
  if (params.rssOnly) qs.set("rssOnly", "1");
  if (params.rssScope) qs.set("rssScope", params.rssScope);
  const r = await fetch(`${API}/news/hybrid?${qs}`);
  const d = await r.json();
  const rows = Array.isArray(d?.items) ? d.items : [];
  return rows.map((row: Record<string, unknown>) => mapHybridNewsRow(row));
}

function newsItemIsRss(item: NewsCardItem): boolean {
  return newsItemIsRssSource(item);
}

function newsItemHref(item: NewsCardItem): string {
  if (newsItemIsRss(item)) {
    return coercePublicHybridNewsHref({
      id: item.id,
      slug: item.slug ?? null,
      source: "rss",
      href: null,
    });
  }
  return coercePublicHybridNewsHref(item);
}

function newsItemKey(item: Pick<NewsCardItem, "id" | "slug" | "title">): string {
  const id = String(item.id ?? "").trim();
  if (id) return id;
  const slug = String(item.slug ?? "").trim();
  if (slug) return `slug:${slug}`;
  return `title:${String(item.title ?? "").trim().toLocaleLowerCase("tr-TR")}`;
}

function pickOneRssHeadlinePerCategory(items: NewsCardItem[]): NewsCardItem[] {
  const byCategory = new globalThis.Map<string, NewsCardItem>();
  for (const item of items) {
    if (!newsItemIsRss(item)) continue;
    const category = String(item.categorySlug ?? item.categoryName ?? item.feedLabel ?? "").trim().toLocaleLowerCase("tr-TR");
    if (!category || byCategory.has(category)) continue;
    byCategory.set(category, item);
  }
  return [...byCategory.values()];
}

function mergeUniqueNewsItems(...groups: NewsCardItem[][]): NewsCardItem[] {
  const seen = new Set<string>();
  const out: NewsCardItem[] = [];
  for (const group of groups) {
    for (const item of group) {
      const key = newsItemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function buildPortalHeadlinePool(opts: {
  manualItems: NewsCardItem[];
  latestItems: NewsCardItem[];
  rssEnabled: boolean;
  limit?: number;
  /** turk.eco: eski belediye «öne çıkan» DB manşetlerini RSS’in önüne geçirme */
  portalRssFirst?: boolean;
}): NewsCardItem[] {
  const limit = opts.limit ?? 12;
  if (opts.portalRssFirst) {
    const rssPicks = opts.rssEnabled ? pickOneRssHeadlinePerCategory(opts.latestItems) : [];
    const rssStream = opts.latestItems.filter((item) => newsItemIsRss(item));
    return mergeUniqueNewsItems(rssPicks, rssStream, opts.latestItems, opts.manualItems).slice(0, limit);
  }
  const manual = mergeUniqueNewsItems(
    opts.manualItems.filter((item) => !newsItemIsRss(item)),
    opts.latestItems.filter((item) => !newsItemIsRss(item)),
  ).slice(0, 1);
  const rss = opts.rssEnabled ? pickOneRssHeadlinePerCategory(opts.latestItems) : [];
  return mergeUniqueNewsItems(manual, rss, opts.manualItems, opts.latestItems).slice(0, limit);
}

function excludeNewsItems(items: NewsCardItem[], excluded: NewsCardItem[], limit: number): NewsCardItem[] {
  const blocked = new Set(excluded.map((item) => newsItemKey(item)));
  const out: NewsCardItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = newsItemKey(item);
    if (blocked.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function NewsItemLink({ item, className, children }: { item: NewsCardItem; className?: string; children: ReactNode }) {
  const href = newsItemHref(item);
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function isKosePortalArticle(n: NewsCardItem | null): boolean {
  return isKoseArticle(n);
}

function money(value: number | string | null | undefined, digits = 0): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: digits })
    : "₺0";
}

function ratingLabel(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return n > 0 ? n.toFixed(1) : "Yeni";
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function stripHtml(value: string | null | undefined): string {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function currentModule(key?: SixAmMartModuleKey): ModuleDef {
  return MODULES.find((module) => module.key === key) ?? MODULES[0];
}

function moduleFromQuery(defaultModule: SixAmMartModuleKey = "rental"): SixAmMartModuleKey {
  if (typeof window === "undefined") return defaultModule;
  const raw = new URLSearchParams(window.location.search).get("module")?.toLowerCase();
  return MODULES.some((module) => module.key === raw) ? (raw as SixAmMartModuleKey) : defaultModule;
}

function categoryKey(cat: CategoryNode): string {
  return cat.slug || cat.name.toLocaleLowerCase("tr-TR");
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children ?? [])]);
}

function Section({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`sixam-section mx-auto w-full max-w-[1440px] px-4 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-black tracking-tight text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Shell({
  active,
  locationLabel = "Adres seç",
  staticLocationLabel,
  searchPlaceholder = "Restoran, mağaza veya ürün ara",
  footerVariant = "default",
  subHeader,
  subHeaderInHero = false,
  heroChrome = false,
  heroExtension,
  mapEmbed = false,
  portalNewsPage = false,
  showHeaderSearch = true,
  headerSearchReplacement,
  children,
}: {
  active?: SixAmMartModuleKey;
  locationLabel?: string;
  /** Sabit konum etiketi — masaüstü seçici kapalı (ör. «Türkiye») */
  staticLocationLabel?: string;
  searchPlaceholder?: string;
  /** Turizm rotalarında BC tarzı footer (§5.3) */
  footerVariant?: "default" | "turizm";
  /** Header altına yapışık alt şerit (ör. /haberler kategori menüsü) */
  subHeader?: React.ReactNode;
  /** Alt şerit ana menü altındaki hero gradient içinde (cam yüzey) */
  subHeaderInHero?: boolean;
  /** Sade krem-yeşil hero + alt fade — header ve isteğe bağlı üst modüller */
  heroChrome?: boolean;
  /** heroChrome içinde kategori nav altına eklenen içerik (ör. /haberler vitrin modülleri) */
  heroExtension?: React.ReactNode;
  /** /haberler turk.eco — gece temasında bile açık header/gövde */
  portalNewsPage?: boolean;
  /** /haritalar masaüstü: header/footer arasında esnek harita gövdesi */
  mapEmbed?: boolean;
  /** false: SERP arama kutusu gizlenir; `headerSearchReplacement` kullanılır */
  showHeaderSearch?: boolean;
  headerSearchReplacement?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [loc] = useLocation();
  const pathOnly = loc.split("?")[0] ?? "";
  const { searchValue, setSearchValue, onSearchSubmit } = useSearchEngineHeaderState();
  const { theme } = useYekpareTheme();
  const nightPageBg = "#020617";
  const pageBg = theme === "night" ? nightPageBg : SADE_PUBLIC_PAGE_BG_WHITE;
  const heroSubHeaderBar = "border-b border-sky-100/40 bg-transparent";
  const heroSubHeaderGlass =
    "border-b border-sky-100/40 bg-white/25 backdrop-blur-md supports-[backdrop-filter]:bg-white/20";
  const heroHasExtension = heroChrome && heroExtension;
  const showHeroBand = (subHeaderInHero && subHeader) || heroHasExtension;
  const heroSurfaceClasses = [
    SADE_PUBLIC_HERO_SURFACE_CLASS,
    showHeroBand && subHeaderInHero && subHeader && !heroHasExtension
      ? "sade-public-hero-surface--subnav-only"
      : "",
    heroHasExtension ? "sade-public-hero-surface--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showCategories = shouldShowGlobalCategoryPills(pathOnly);
  const moduleSubNav = subHeader && !subHeaderInHero ? subHeader : null;

  const categoryRow = showCategories ? (
    <SearchEngineSubNavStack part="categories" showCategories />
  ) : null;

  const moduleSubNavRow = moduleSubNav ? (
    <SearchEngineSubNavStack part="secondary" secondary={moduleSubNav} showCategories={false} />
  ) : null;

  return (
    <div
      className={`sixam-native yekpare-home-root yekpare-search-home yekpare-chrome-shell font-sans ${
        mapEmbed ? "haritalar-map-shell flex flex-col overflow-hidden" : "min-h-screen"
      }`}
      data-page="sade-shell"
      data-yekpare-theme={theme}
      data-home-theme={theme}
      data-portal-news-page={portalNewsPage ? "1" : undefined}
    >
      <SearchEngineHeader
        mode="serp"
        sticky
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchSubmit={onSearchSubmit}
        searchPlaceholder={searchPlaceholder}
        listId={`sade-shell-suggest-${pathOnly.replace(/\//g, "-") || "home"}`}
        showDefaultSubNav={false}
        showLocationPill={false}
        showSearch={showHeaderSearch}
        searchReplacement={headerSearchReplacement}
        beforeCategories={categoryRow}
        afterSearch={moduleSubNavRow}
      />

      {showHeroBand ? (
        <div className={`${SADE_PUBLIC_HERO_STAGE_CLASS} shrink-0`}>
          <div className={heroSurfaceClasses} style={sadePublicHeroFadeStyle(pageBg)}>
            {subHeaderInHero && subHeader ? <div className={heroSubHeaderGlass}>{subHeader}</div> : null}
            {heroHasExtension ? (
              <div className={`relative space-y-2 pb-3 pt-0 ${SADE_PUBLIC_HERO_CONTENT_COMPACT_CLASS}`}>{heroExtension}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {children}

      {!mapEmbed ? <SearchEngineFooter /> : null}
      {!mapEmbed ? <SadePublicFooter variant={footerVariant} /> : null}
    </div>
  );
}

export function SadePublicChrome({
  active,
  locationLabel = "Adres / konum seç",
  staticLocationLabel,
  searchPlaceholder = "Yekpare'de ara",
  fullBleed = false,
  footerVariant = "default",
  mapEmbed = false,
  subHeader,
  subHeaderInHero = false,
  heroChrome = false,
  children,
}: {
  active?: SixAmMartModuleKey;
  locationLabel?: string;
  staticLocationLabel?: string;
  searchPlaceholder?: string;
  fullBleed?: boolean;
  footerVariant?: "default" | "turizm";
  mapEmbed?: boolean;
  subHeader?: React.ReactNode;
  subHeaderInHero?: boolean;
  heroChrome?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Shell
      active={active}
      locationLabel={locationLabel}
      staticLocationLabel={staticLocationLabel}
      searchPlaceholder={searchPlaceholder}
      footerVariant={footerVariant}
      mapEmbed={mapEmbed}
      subHeader={subHeader}
      subHeaderInHero={subHeaderInHero}
      heroChrome={heroChrome}
    >
      {fullBleed ? (
        <main
          className={
            mapEmbed
              ? "yekpare-chrome-main haritalar-map-main flex min-h-0 flex-1 flex-col"
              : "yekpare-chrome-main min-h-[70vh]"
          }
        >
          {children}
        </main>
      ) : (
        <main className={`yekpare-chrome-main min-h-[70vh] pb-6 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
          <div className={YEKPARE_PAGE_CONTAINER_CLASS}>
            {children}
          </div>
        </main>
      )}
    </Shell>
  );
}

function Hero({
  active,
  title,
  subtitle,
  kicker,
  kickerHref,
  ctaHref,
  ctaLabel,
  locationLabel,
  onLocationClick,
  quickActions,
  searchPlaceholder,
  fadeToBg,
  aside,
  children,
}: {
  active?: SixAmMartModuleKey;
  title: string;
  subtitle?: string;
  kicker: string;
  kickerHref?: string;
  ctaHref: string;
  ctaLabel: string;
  locationLabel: string;
  onLocationClick?: () => void;
  quickActions?: React.ReactNode;
  searchPlaceholder: string;
  /** Hero alt fade hedefi — hemen altındaki bölüm zemini (ör. beyaz konum kartları) */
  fadeToBg?: string;
  aside?: React.ReactNode | false;
  children?: React.ReactNode;
}) {
  const module = active ? currentModule(active) : MODULES[1];
  const Icon = module.icon;
  const showAside = aside !== false;
  return (
    <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
      <section
        className={SADE_PUBLIC_HERO_SURFACE_CLASS}
        style={sadePublicHeroFadeStyle(fadeToBg ?? SADE_PUBLIC_PAGE_BG_WHITE)}
      >
        <div className={`relative ${SADE_PUBLIC_HERO_CONTENT_CLASS} grid gap-8 ${showAside ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""} lg:items-center`}>
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-[#0284C7] shadow-sm">
            <Icon className="h-4 w-4" />
            {kickerHref ? (
              <Link href={kickerHref} className="hover:underline">
                {kicker}
              </Link>
            ) : (
              kicker
            )}
          </div>
          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600">{subtitle}</p> : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("q");
              const q = String(value ?? "").trim();
              window.location.href = kesfetSearchTarget(q, ctaHref);
            }}
            className="mt-7 grid gap-3 rounded-[1.75rem] border border-slate-100 bg-white p-3 shadow-xl md:grid-cols-[230px_minmax(0,1fr)_auto]"
          >
            {onLocationClick ? (
              <button
                type="button"
                onClick={onLocationClick}
                className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-sky-50/80 hover:ring-1 hover:ring-[#0284C7]/25"
                title="Adres veya konum seç"
                aria-label={`Konum: ${locationLabel}. Değiştirmek için tıklayın.`}
              >
                <MapPin className="h-4 w-4 shrink-0 text-[#0284C7]" />
                <span className="truncate">{locationLabel}</span>
              </button>
            ) : (
              <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                <MapPin className="h-4 w-4 shrink-0 text-[#0284C7]" />
                <span className="truncate">{locationLabel}</span>
              </div>
            )}
            <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input name="q" placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" />
            </label>
            <Link href={ctaHref} className="inline-flex items-center justify-center rounded-2xl bg-[#0284C7] px-6 py-3 text-sm font-black text-white hover:bg-[#0369A1]" style={{ color: "#fff" }}>
              {ctaLabel}
            </Link>
          </form>
          {quickActions ? <div className="mt-3">{quickActions}</div> : null}
          {children}
        </div>
        {showAside ? (
          <aside className="grid content-start gap-4">
            {aside ?? (
              <>
                <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-amber-50/40 p-5 text-slate-900 shadow-xl">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0284C7]">Yekpare hızlı erişim</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Adres, sipariş ve mağaza akışı tek yerde.</h2>
                  <Link href={ctaHref} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0284C7] px-4 py-3 text-sm font-black text-white hover:bg-[#0369A1]" style={{ color: "#fff" }}>
                    {ctaLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/kesfet"
                    className="rounded-[1.5rem] bg-sky-500 p-4 text-white transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    aria-label="Keşfet — yakındaki işletmeler"
                  >
                    <ShoppingBag className="mb-3 h-7 w-7" />
                    <p className="text-2xl font-black">Keşfet</p>
                    <p className="text-xs font-semibold text-white/80">Yakındaki işletmeler</p>
                  </Link>
                  <Link
                    href="/turizm"
                    className="rounded-[1.5rem] bg-amber-400 p-4 text-slate-950 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                    aria-label="Seyahat — otel, tur ve konaklama"
                  >
                    <Building2 className="mb-3 h-7 w-7" />
                    <p className="text-2xl font-black">Seyahat</p>
                    <p className="text-xs font-semibold text-slate-700">Otel, tur ve konaklama</p>
                  </Link>
                </div>
              </>
            )}
          </aside>
        ) : null}
      </div>
      </section>
    </div>
  );
}

const SEYAHAT_TAB_ITEMS = [
  { type: "hotel", label: "Otel", href: "/turizm/konaklama", emoji: "🏨", description: "Konaklama ve oteller." },
  { type: "villa", label: "Villa & Ev", href: "/turizm/villa-ev", emoji: "🏡", description: "Villa ve tatil evleri." },
  { type: "tour", label: "Tur", href: "/turizm/turlar", emoji: "🗺️", description: "Günübirlik ve paket turlar." },
  { type: "boat", label: "Yat/Tekne", href: "/turizm/yat-turlari", emoji: "⛵", description: "Yat ve tekne kiralama." },
  { type: "car", label: "Rent a Car", href: "/turizm/arac-kiralama", emoji: "🚗", description: "Araç kiralama." },
  { type: "flight", label: "Uçak", href: "/turizm/ucus", emoji: "✈️", description: "Uçak bileti arama." },
] as const;

function HomeServiceTabs({
  activeTravelType,
}: {
  activeTravelType?: string;
}) {
  return (
    <Section
      title="Seyahat"
      subtitle="Otel, villa, tur, tekne ve araç kiralama."
      className="pt-3 md:pt-4"
    >
      <div role="tabpanel">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-2">
          {SEYAHAT_TAB_ITEMS.map((item) => {
            const selected = activeTravelType === item.type;
            return (
              <Link
                key={item.type}
                href={item.href}
                className={`group rounded-[14px] border bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-4 lg:p-2.5 ${
                  selected ? "border-sky-400 bg-sky-50/40" : "border-slate-100"
                }`}
              >
                <span className="mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-xl sm:mb-3 sm:h-12 sm:w-12 sm:text-2xl lg:mb-1.5 lg:h-9 lg:w-9 lg:text-lg">{item.emoji}</span>
                <span className="block text-xs font-black text-slate-950 group-hover:text-sky-700 sm:text-sm lg:text-xs">{item.label}</span>
                <span className="mt-1 line-clamp-2 hidden text-xs font-semibold leading-5 text-slate-500 sm:block lg:hidden">{item.description}</span>
              </Link>
            );
          })}
          <Link
            href="/turizm"
            className="group col-span-2 flex items-center justify-between rounded-[14px] border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:col-span-1 sm:flex-col sm:items-start sm:p-4 lg:col-span-1 lg:p-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 sm:mb-3 sm:h-12 sm:w-12">
              <Compass className="h-5 w-5 text-sky-700 sm:h-6 sm:w-6" />
            </span>
            <span>
              <span className="block text-xs font-black text-slate-950 group-hover:text-sky-700 sm:text-sm">Tüm seyahat</span>
              <span className="mt-0.5 hidden text-xs font-semibold text-slate-500 sm:block">Otel, tur ve kiralama</span>
            </span>
            <ArrowRight className="h-4 w-4 text-sky-700 sm:hidden" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

function ModuleSelector({ active }: { active?: SixAmMartModuleKey }) {
  return (
    <Section title="Hizmet seç" subtitle="İhtiyacın olan Yekpare bölümüne hızlıca geç." className="pt-3 md:pt-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const selected = module.key === active;
          return (
            <Link
              key={module.key}
              href={module.href}
              className={`group rounded-[14px] border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                selected ? "border-[#0284C7]" : "border-slate-100"
              }`}
            >
              <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${module.bg}`}>
                <Icon className="h-6 w-6" style={{ color: module.accent }} />
              </span>
              <span className="block text-sm font-black text-slate-950 group-hover:text-[#0284C7]">{module.label}</span>
              <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-slate-500">{module.description}</span>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

function StoreCard({ item, compact = false, dense = false }: { item: Vendor | HomepageBusiness; compact?: boolean; dense?: boolean }) {
  const name = item.name;
  const businessItem = item as HomepageBusiness;
  const vendorItem = item as Vendor;
  const image = "photoUrl" in item ? businessItem.photoUrl : vendorItem.imageUrl || vendorItem.coverUrl;
  const slug = "slug" in item ? String(item.slug ?? "").trim() : "";
  const sf = "storefrontHref" in item && item.storefrontHref ? String(item.storefrontHref) : "";
  const href = sf.startsWith("/")
    ? sf
    : ("discoverHref" in item && item.discoverHref)
      ? String(item.discoverHref)
      : slug
        ? `/kesfet/${encodeURIComponent(slug)}`
        : "/kesfet";
  const rating = "userRatingsTotal" in item ? item.rating : item.rating;
  const count = "userRatingsTotal" in item ? businessItem.userRatingsTotal : vendorItem.reviewCount;
  const img = resolveClientMediaSrc(image ?? null);
  return (
    <Link href={String(href)} className={`group block min-w-0 rounded-[10px] border border-slate-200 bg-white shadow-sm transition hover:border-sky-200 hover:shadow-lg ${dense ? "p-2 sm:p-[10px]" : "p-[10px]"} ${compact ? "w-48 shrink-0" : ""}`}>
      <div className={`relative overflow-hidden rounded-[10px] bg-slate-100 ${compact ? "h-28" : dense ? "aspect-[4/3] sm:h-[130px] sm:aspect-auto" : "h-[130px]"}`}>
        {img ? (
          <img src={img} alt={name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-sky-50 to-amber-50 text-4xl">🏪</div>
        )}
        {"featured" in item && item.featured ? (
          <span className={`absolute left-1.5 top-1.5 rounded-full bg-orange-500 font-black text-white ${dense ? "px-1.5 py-0.5 text-[9px] sm:left-2 sm:top-2 sm:px-2 sm:text-[10px]" : "left-2 top-2 px-2 py-0.5 text-[10px]"}`}>Öne çıkan</span>
        ) : null}
        {"isOpen" in item && item.isOpen === false ? (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900">Açılış aşamasında</span>
          </div>
        ) : null}
      </div>
      <div className={dense ? "pt-2 sm:pt-[10px]" : "pt-[10px]"}>
        <h3 className={`font-black text-slate-950 group-hover:text-[#0284C7] ${dense ? "line-clamp-2 text-xs leading-snug sm:line-clamp-1 sm:text-sm" : "line-clamp-1 text-sm"}`}>{name}</h3>
        {!dense && "description" in item && item.description ? <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">{item.description}</p> : null}
        <div className={`flex flex-wrap items-center gap-1.5 text-slate-500 ${dense ? "mt-1 text-[10px] sm:mt-1.5 sm:gap-2 sm:text-xs" : "mt-1.5 gap-2 text-xs"}`}>
          <span className="inline-flex items-center gap-1 font-bold text-amber-500"><Star className={`fill-amber-400 text-amber-400 ${dense ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3 w-3"}`} /> {ratingLabel(rating)}</span>
          {count ? <span className={dense ? "hidden sm:inline" : ""}>({Number(count).toLocaleString("tr-TR")})</span> : null}
          {"deliveryTime" in item && item.deliveryTime ? <span className={`inline-flex items-center gap-1 ${dense ? "hidden sm:inline-flex" : ""}`}><Clock className="h-3 w-3" /> {item.deliveryTime}dk</span> : null}
        </div>
        {"city" in item && item.city ? <p className={`mt-1 flex items-center gap-1 font-semibold text-slate-400 ${dense ? "line-clamp-1 text-[10px] sm:text-[11px]" : "text-[11px]"}`}><MapPin className={`shrink-0 ${dense ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3 w-3"}`} /> {item.district ? `${item.district}, ` : ""}{item.city}</p> : null}
      </div>
    </Link>
  );
}

function ProductCard({ product, dense = false }: { product: Product; dense?: boolean }) {
  const img = resolveClientMediaSrc(product.imageUrl ?? null);
  const price = Number(product.price ?? 0);
  const sale = Number(product.salePrice ?? 0);
  const hasSale = sale > 0 && sale < price;
  const href = product.href || product.storefrontHref || "/kesfet";
  return (
    <Link href={href} className={`group flex h-full min-w-0 flex-col rounded-[8px] border border-slate-200 bg-white shadow-sm transition hover:shadow-lg ${dense ? "p-2 sm:p-[10px]" : "p-[10px]"}`}>
      <div className={`relative overflow-hidden rounded-[5px] bg-slate-50 ${dense ? "aspect-square sm:h-[212px] sm:aspect-auto" : "h-[212px]"}`}>
        {img ? (
          <img src={img} alt={product.name} className={`h-full w-full transition duration-300 group-hover:scale-105 ${dense ? "object-cover sm:object-contain sm:p-4" : "object-contain p-4"}`} />
        ) : (
          <div className={`grid h-full w-full place-items-center ${dense ? "text-3xl sm:text-5xl" : "text-5xl"}`}>🛒</div>
        )}
        <span className={`absolute rounded-full bg-white text-slate-500 shadow-sm ${dense ? "right-1.5 top-1.5 hidden p-1.5 sm:block sm:right-3 sm:top-3 sm:p-2" : "right-3 top-3 p-2"}`}><Heart className={`${dense ? "h-3 w-3 sm:h-4 sm:w-4" : "h-4 w-4"}`} /></span>
        {hasSale ? <span className={`absolute rounded-full bg-red-500 font-black text-white ${dense ? "left-1.5 top-1.5 px-1.5 py-0.5 text-[9px] sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[10px]" : "left-3 top-3 px-2 py-1 text-[10px]"}`}>Fırsat</span> : null}
      </div>
      <div className={`flex flex-1 flex-col ${dense ? "pt-2 sm:pt-3" : "pt-3"}`}>
        <h3 className={`line-clamp-2 font-black leading-tight text-slate-950 group-hover:text-[#0284C7] ${dense ? "min-h-[2.5rem] text-xs sm:min-h-9 sm:text-sm" : "min-h-9 text-sm"}`}>{product.name}</h3>
        <p className={`line-clamp-1 font-semibold text-slate-500 ${dense ? "mt-0.5 text-[10px] sm:mt-1 sm:text-xs" : "mt-1 text-xs"}`}>{product.vendorName || product.categoryName || "Yekpare mağaza"}</p>
        <p className={`mt-auto font-black text-[#0284C7] ${dense ? "pt-1.5 text-sm sm:pt-2 sm:text-base" : "mt-2 text-base"}`}>{money(hasSale ? sale : price)}</p>
      </div>
    </Link>
  );
}

function ListingCard({ listing }: { listing: TourismListing }) {
  const img = resolveClientMediaSrc(listing.image_url ?? null);
  const href = listing.href || `/turizm/${listing.type}/${listing.slug}`;
  const price = Number(listing.sale_price || listing.price || 0);
  const typeLabel: Record<string, string> = { hotel: "Otel", villa: "Villa", tour: "Tur", boat: "Yat/Tekne", car: "Rent a Car" };
  const typeIcon: Record<string, string> = { hotel: "🏨", villa: "🏡", tour: "🗺️", boat: "⛵", car: "🚗" };
  return (
    <Link href={href} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden bg-sky-50">
        {img ? <img src={img} alt={listing.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-5xl">{typeIcon[listing.type] ?? "🏨"}</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-black text-slate-700 shadow-sm">{typeIcon[listing.type] ?? "🏨"} {typeLabel[listing.type] ?? listing.type}</span>
        {listing.star_rating ? <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-white">★ {listing.star_rating}</span> : null}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-slate-950 group-hover:text-sky-700">{listing.title}</h3>
        {listing.city ? <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-400"><MapPin className="h-3 w-3" /> {listing.city}</p> : null}
        <div className="mt-3 flex items-end justify-between border-t border-slate-50 pt-3">
          <span className="text-lg font-black text-sky-700">{listing.map_business_fallback ? "Keşfet" : money(price)}</span>
          <span className="text-xs font-bold text-slate-400">/{listing.price_unit || "gün"}</span>
        </div>
      </div>
    </Link>
  );
}

function ServiceRails() {
  return (
    <section className="border-b border-sky-100 bg-white">
      <div className="mx-auto max-w-[1440px] px-4 pb-4 pt-3">
        <div className="yekpare-scrollbar flex gap-4 overflow-x-auto pb-1">
          {HOME_SERVICE_RAILS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group flex w-[88px] shrink-0 flex-col items-center gap-2 text-center sm:w-[96px]">
                <span className={`grid h-16 w-16 place-items-center rounded-full ${item.bg} shadow-sm ring-1 ring-slate-100 transition group-hover:-translate-y-0.5 group-hover:shadow-md`}>
                  <Icon className="h-7 w-7" style={{ color: item.color }} />
                </span>
                <span className="line-clamp-2 text-[11px] font-black leading-tight text-slate-800 group-hover:text-[#0EA5E9]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SadeAuthorsStrip({ authors }: { authors: SadeAuthor[] }) {
  if (!authors.length) return null;
  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4" style={{ color: SADE_ACCENT }} />
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Köşe Yazarları</h3>
        <div className="flex-1" />
        <Link href="/yazarlar" className="text-xs font-black hover:underline" style={{ color: SADE_ACCENT }}>Tümü <ChevronRight className="inline h-3.5 w-3.5" /></Link>
      </div>
      <div className="yekpare-scrollbar flex gap-4 overflow-x-auto pb-1">
        {authors.map((author) => {
          const src = resolveClientMediaSrc(author.avatarUrl ?? null);
          const href = author.latestArticle?.slug ? buildKoseArticlePublicPath(String(author.latestArticle.slug)) : `/yazar/${author.id}`;
          return (
            <Link key={author.id} href={href} className="flex w-[120px] shrink-0 flex-col items-center gap-2 text-center">
              {src ? <img src={src} alt={author.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-sky-100" loading="lazy" /> : <div className="grid h-16 w-16 place-items-center rounded-full text-lg font-black text-white" style={{ background: `linear-gradient(135deg,${SADE_ACCENT},${SADE_ACCENT_DARK})` }}>{author.name?.[0] ?? "Y"}</div>}
              <span className="line-clamp-2 text-[11px] font-black leading-tight text-slate-900">{author.name}</span>
              {author.latestArticle?.title ? <span className="line-clamp-2 text-[9px] font-semibold leading-snug text-slate-500">{author.latestArticle.title}</span> : author.title ? <span className="line-clamp-2 text-[9px] font-semibold text-slate-400">{author.title}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SadeCategoryNewsModule({ slug, label, color }: { slug: string; label: string; color: string }) {
  const [items, setItems] = useState<NewsCardItem[]>([]);
  useEffect(() => {
    fetchHybridNews({ categorySlug: slug, limit: 32, rssScope: "all" })
      .then((rows) => setItems(ensureNewsBoxItems(rows, rows, CATEGORY_BOX_DISPLAY_TOTAL)))
      .catch(() => setItems([]));
  }, [slug]);
  return (
    <HmYekpareCategoryBox
      slug={slug}
      label={label}
      color={color}
      items={items}
      categoryHref={`/kategori/${slug}`}
      getItemHref={(item) => newsItemHref(item as NewsCardItem)}
    />
  );
}

function PromoBanner({ campaigns }: { campaigns: Array<{ id: number; title: string; description?: string | null; storefrontHref?: string | null }> }) {
  if (!campaigns.length) return null;
  const lead = campaigns[0];
  return (
    <section className="sixam-section mx-auto w-full max-w-[1440px] px-4">
      <div className="overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-[#0EA5E9] to-sky-600 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-100">Kampanya</p>
            <h2 className="mt-2 text-2xl font-black leading-tight">{lead.title}</h2>
            {lead.description ? <p className="mt-2 max-w-xl text-sm font-semibold text-white/85">{lead.description}</p> : null}
          </div>
          <Link href={lead.storefrontHref || "/kesfet"} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-sky-50">Keşfet <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}

function YekparePlatformServicesSection() {
  return (
    <Section title="Yekpare platform hizmetleri" subtitle="Haber merkezi, AI çağrı, haritalar ve içerik modülleri.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {YEKPARE_PLATFORM_MODULES.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="group rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <Icon className="mb-3 h-7 w-7" style={{ color: module.accent }} />
              <h3 className="text-lg font-black group-hover:text-[#0EA5E9]">{module.title}</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{module.description}</p>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

export function YekpareServicePlatformSections({ className = "" }: { className?: string }) {
  return (
    <div className={`${SADE_PUBLIC_POST_HERO_STACK_CLASS} ${className}`.trim()}>
      <Section title="Tüm hizmetler" subtitle="Yekpare modüllerine tek dokunuşla geç.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.key} href={module.href} className="group rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <Icon className="mb-3 h-7 w-7" style={{ color: module.accent }} />
                <h3 className="text-lg font-black group-hover:text-[#0EA5E9]">{module.title}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{module.description}</p>
              </Link>
            );
          })}
        </div>
      </Section>
      <YekparePlatformServicesSection />
    </div>
  );
}

export function SixAmMartHomePage() {
  const { data: siteSettings } = useGetSiteSettings();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [storedLoc, setStoredLoc] = useState<PublicLocationState | null>(() =>
    typeof window !== "undefined" ? readPublicLocation() : null,
  );
  const [businesses, setBusinesses] = useState<HomepageBusiness[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: number; title: string; description?: string | null; storefrontHref?: string | null }>>([]);
  const locLabel = formatPublicLocationLabel(storedLoc);

  useEffect(() => {
    const sync = () => setStoredLoc(readPublicLocation());
    sync();
    const onUpdated = (event: Event) => {
      setStoredLoc((event as CustomEvent<PublicLocationState>).detail ?? readPublicLocation());
    };
    window.addEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
    return () => window.removeEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onUpdated as EventListener);
  }, []);

  useEffect(() => {
    void (async () => {
      const biz = await fetchPublicJson<{ success?: boolean; data?: HomepageBusiness[] }>(`${API}/map/homepage-businesses`);
      const bizRows = biz.data;
      setBusinesses(biz.ok && bizRows?.success && Array.isArray(bizRows.data) ? bizRows.data : []);
      setCampaigns([]);
    })().catch(() => {
      setBusinesses([]);
      setCampaigns([]);
    });
  }, []);

  return (
    <Shell searchPlaceholder="Restoran, mağaza, ürün, şehir veya hizmet ara">
      <SadeLocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mapsSettings={siteSettings ?? null}
      />
      <Hero
        kicker="Yekpare Arama Motoru"
        kickerHref="/bilgi/yekpare-nedir"
        title="Yakındaki restoran, mağaza ve hizmetleri Yekpare ile bul."
        subtitle="Konumunu seç, yakınındaki işletmeleri keşfet ve hizmetlere hızlıca ulaş."
        ctaHref="/kesfet"
        ctaLabel="Keşfet"
        locationLabel={locLabel}
        onLocationClick={() => setPickerOpen(true)}
        searchPlaceholder="Restoran, mağaza, ürün veya şehir ara"
        fadeToBg={SADE_PUBLIC_PAGE_BG_WHITE}
      >
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ...YEKPARE_SERVICE_MODULE_ORDER.map((key) => ({
              label: YEKPARE_SERVICE_MODULE_META[key].label,
              href: YEKPARE_SERVICE_MODULE_META[key].href,
            })),
            ...YEKPARE_PLATFORM_NAV,
          ].map((chip) => (
            <Link key={chip.href} href={chip.href} className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:border-[#0EA5E9] hover:text-[#0EA5E9]">{chip.label}</Link>
          ))}
        </div>
      </Hero>
      <ServiceRails />
      <main className={`${SADE_PUBLIC_POST_HERO_MAIN_CLASS} pb-10`}>
        {campaigns.length ? <PromoBanner campaigns={campaigns} /> : null}
        {businesses.length ? (
          <Section title="Öne çıkan işletmeler" subtitle="Yakındaki işletmeleri ve vitrinleri keşfet." action={<Link href="/kesfet/liste" className="text-sm font-black" style={{ color: SADE_ACCENT }}>Tümü</Link>}>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">{businesses.slice(0, 8).map((business) => <StoreCard key={business.id} item={business} dense />)}</div>
          </Section>
        ) : null}
        <div className="space-y-4">
          <section className="sixam-section mx-auto w-full max-w-[1440px] px-4 pt-2">
            <KesfetRegionsExploreBlock mode="home" variant="sade" />
          </section>
          <HomeTravelTabs />
          <YekpareServicePlatformSections />
        </div>
      </main>
    </Shell>
  );
}

export function SixAmMartDeliveryPage(_props?: { defaultModule?: SixAmMartModuleKey }) {
  return <Redirect to="/" />;
}

export function SixAmMartMarketplacePage() {
  return <Redirect to="/" />;
}

export function SixAmMartTourismPage() {
  const { data: siteSettings } = useGetSiteSettings();
  const [loc, setLoc] = useState<TrAddressValue>({ city: "", district: "", mahalle: "" });
  const [activeType, setActiveType] = useState("hotel");
  const [listings, setListings] = useState<TourismListing[]>([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const locLabel = [loc.district, loc.city].filter(Boolean).join(", ") || "Destinasyon seç";

  useEffect(() => {
    if (activeType === "flight") {
      setListings([]);
      return;
    }
    fetch(`${API}/tourism/listings?type=${encodeURIComponent(activeType)}&limit=12`)
      .then((r) => r.json())
      .then((d) => setListings(Array.isArray(d?.listings) ? d.listings : []))
      .catch(() => setListings([]));
  }, [activeType]);

  return (
    <Shell active="rental" locationLabel={locLabel} searchPlaceholder="Şehir, otel, tur veya kiralama ara">
      <Hero active="rental" kicker="Seyahat" title="Otel, villa, tur ve araç seçeneklerini karşılaştır" subtitle="Yekpare seyahat ilanlarını konaklama, tur, tekne ve araç seçenekleriyle incele." ctaHref="/turizm/hotel" ctaLabel="Seyahati keşfet" locationLabel={locLabel} searchPlaceholder="Destinasyon veya tesis ara" />
      <section className="border-y border-sky-100 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 pb-4 pt-3">
          <GoogleTrAddressQuickFill mapsSettings={siteSettings ?? null} value={loc} onChange={setLoc} variant="blue" />
          <div className="yekpare-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Seyahat türü">
            {SEYAHAT_TAB_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                role="tab"
                aria-selected={activeType === item.type}
                onClick={() => setActiveType(item.type)}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                  activeType === item.type ? "border-sky-300 bg-sky-50 text-sky-800" : "border-slate-100 bg-white text-slate-700 hover:bg-sky-50/50"
                }`}
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <label className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">Giriş<input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full bg-transparent text-sm text-slate-900 outline-none" /></label>
            <label className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">Çıkış<input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full bg-transparent text-sm text-slate-900 outline-none" /></label>
            <Link href={SEYAHAT_TAB_ITEMS.find((item) => item.type === activeType)?.href ?? "/turizm"} className="grid place-items-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white" style={{ color: "#fff" }}>Ara / rezervasyon bul</Link>
          </div>
        </div>
      </section>
      <HomeServiceTabs activeTravelType={activeType} />
      <main className={`${SADE_PUBLIC_POST_HERO_MAIN_CLASS} pb-10`}>
        <Section title="Popüler seyahat seçenekleri" subtitle="Yekpare seyahat ilanları.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
        </Section>
      </main>
    </Shell>
  );
}


function NewsCard({ item, featured = false }: { item: NewsCardItem; featured?: boolean }) {
  const text = item.spot || item.summary || stripHtml(item.content).slice(0, 180);
  const imgSrc = resolveNewsItemImageUrl(item);
  const imgFallback = resolveNewsItemImageFallbackUrl(item);
  return (
    <NewsItemLink
      item={item}
      className={`group overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        featured ? "grid md:grid-cols-[1.15fr_0.85fr]" : "block"
      }`}
    >
      <div className={`relative overflow-hidden bg-slate-100 ${featured ? "min-h-[280px]" : "h-44"}`}>
        {imgSrc || imgFallback ? (
          <HmNewsImage
            src={imgSrc}
            fallbackSrc={imgFallback}
            alt={item.title}
            className="transition duration-500 group-hover:scale-105"
            loading={featured ? "eager" : "lazy"}
            priority={featured}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-sky-50 to-amber-50 text-5xl">📰</div>
        )}
        {item.categoryName ? (
          <span className="absolute left-3 top-3 rounded-full bg-[#0284C7] px-3 py-1 text-[11px] font-black text-white" style={{ color: "#fff" }}>
            {item.categoryName}
          </span>
        ) : null}
        {newsItemIsRss(item) ? (
          <span className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
            RSS
          </span>
        ) : null}
      </div>
      <div className={featured ? "flex flex-col justify-center p-6" : "p-4"}>
        <h2 className={`${featured ? "text-3xl" : "text-base"} line-clamp-3 font-black leading-tight text-slate-950 group-hover:text-[#0284C7]`}>
          {item.title}
        </h2>
        {text ? <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">{text}</p> : null}
        <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          {fmtDate(item.publishedAt || item.createdAt) || (newsItemIsRss(item) ? "RSS kaynağı" : "Yekpare haberleri")}
        </p>
      </div>
    </NewsItemLink>
  );
}

export function SixAmMartNewsPage({ all = false }: { all?: boolean }) {
  const layoutPrefs = usePortalNewsLayoutPrefs();
  const moduleOrder = useMemo(
    () => resolveSadeNewsPortalModuleOrder(layoutPrefs),
    [layoutPrefs],
  );
  const modOn = useCallback(
    (id: SadeNewsPortalModuleId) => isSadeNewsPortalModuleEnabled(layoutPrefs, id),
    [layoutPrefs],
  );
  const showFinance = resolveTickerFinanceEnabled(layoutPrefs);
  const showWeather = resolveTickerWeatherEnabled(layoutPrefs);
  const showQuickLinks = layoutPrefs.hmNewsQuickLinksEnabled !== false;
  const rssHeadlineEnabled = layoutPrefs.hmNewsRssHeadlineEnabled !== false;

  const [portalNewsHost, setPortalNewsHost] = useState(false);
  const apiFeatured = useSadeFeaturedHeadlines(8);
  const [activeCategory, setActiveCategory] = useState("");
  const [items, setItems] = useState<NewsCardItem[]>([]);
  const [categoryPoolItems, setCategoryPoolItems] = useState<NewsCardItem[]>([]);
  const [rssHeadlineItems, setRssHeadlineItems] = useState<NewsCardItem[]>([]);
  const [breakingNews, setBreakingNews] = useState<NewsCardItem[]>([]);
  const [popularNews, setPopularNews] = useState<NewsCardItem[]>([]);
  const [authors, setAuthors] = useState<SadeAuthor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPortalNewsHost(isPortalNewsPlatformHost());
  }, []);

  useEffect(() => {
    if (!portalNewsHost) return;
    const root = document.documentElement;
    const prevY = root.getAttribute("data-yekpare-theme");
    const prevH = root.getAttribute("data-home-theme");
    root.setAttribute("data-yekpare-theme", "light");
    root.setAttribute("data-home-theme", "light");
    return () => {
      if (prevY != null) root.setAttribute("data-yekpare-theme", prevY);
      else root.removeAttribute("data-yekpare-theme");
      if (prevH != null) root.setAttribute("data-home-theme", prevH);
      else root.removeAttribute("data-home-theme");
    };
  }, [portalNewsHost]);

  useEffect(() => {
    setLoading(true);
    fetchHybridNews({ categorySlug: activeCategory || undefined, limit: all ? 60 : 40, rssScope: "all" })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [all, activeCategory]);

  useEffect(() => {
    fetchHybridNews({ limit: 100, offset: 0, rssOnly: true, rssScope: "all" })
      .then((rows) => setRssHeadlineItems(pickOneRssHeadlinePerCategory(rows)))
      .catch(() => setRssHeadlineItems([]));
    fetchHybridNews({ limit: 120, offset: 0, rssScope: "all" })
      .then(setCategoryPoolItems)
      .catch(() => setCategoryPoolItems([]));
  }, []);

  useEffect(() => {
    fetch(`${API}/news/breaking`).then((r) => r.json()).then((d) => setBreakingNews(Array.isArray(d) ? d.slice(0, 10) : [])).catch(() => setBreakingNews([]));
    fetch(`${API}/news/popular`).then((r) => r.json()).then((d) => setPopularNews(Array.isArray(d) ? d.slice(0, 7) : [])).catch(() => setPopularNews([]));
    fetch(`${API}/authors?limit=12`).then((r) => r.json()).then((d) => setAuthors((Array.isArray(d) ? d : d?.authors ?? []).slice(0, 10))).catch(() => setAuthors([]));
  }, []);

  const featuredSlides = useMemo(() => {
    return buildPortalHeadlinePool({
      manualItems: portalNewsHost ? [] : apiFeatured,
      latestItems: mergeUniqueNewsItems(categoryPoolItems, items, rssHeadlineItems),
      rssEnabled: rssHeadlineEnabled,
      limit: 12,
      portalRssFirst: portalNewsHost,
    });
  }, [apiFeatured, categoryPoolItems, items, portalNewsHost, rssHeadlineItems, rssHeadlineEnabled]);

  const featuredSideItems = useMemo(
    () => excludeNewsItems(mergeUniqueNewsItems(categoryPoolItems, items, apiFeatured), featuredSlides, 4),
    [apiFeatured, categoryPoolItems, featuredSlides, items],
  );

  const timelineItems = useMemo(
    () => (breakingNews.length ? breakingNews : items.slice(0, 8)),
    [breakingNews, items],
  );
  const breakingItems = useMemo(
    () => (breakingNews.length ? breakingNews : items.slice(0, 6)),
    [breakingNews, items],
  );

  const rssFallbackItems = useMemo(
    () => (breakingNews.length ? breakingNews : items.slice(0, 10)),
    [breakingNews, items],
  );

  const portalCategoryPool = useMemo(
    () => (categoryPoolItems.length ? categoryPoolItems : mergeUniqueNewsItems(items, rssHeadlineItems)),
    [categoryPoolItems, items, rssHeadlineItems],
  );
  const gridItems = useMemo(() => {
    if (activeCategory) return items;
    const headlineIds = new Set(featuredSlides.map((n) => n.id));
    return items.filter((n) => !headlineIds.has(n.id));
  }, [items, featuredSlides, activeCategory]);
  const categoryTitle = STANDARD_PORTAL_NEWS_TABS.find((c) => c.slug === activeCategory)?.label;
  const showEditorial = !activeCategory;

  const categoryNav = (
    <NewsCategorySubNav
      categories={NEWS_CATEGORY_MODULES}
      activeCategory={activeCategory}
      onCategoryChange={setActiveCategory}
    />
  );

  const renderPortalModule = (moduleId: SadeNewsPortalModuleId) => {
    if (!modOn(moduleId)) return null;
    switch (moduleId) {
      case "financeWeather":
        return modOn("financeWeather") ? (
          <SadeFinanceWeatherStrip showFinance={showFinance} showWeather={showWeather} />
        ) : null;
      case "breakingBand":
        return breakingItems.length ? <SadeBreakingBand items={breakingItems} /> : null;
      case "googleNewsBand":
        return (
          <SadeRssBreakingBand layoutPrefs={layoutPrefs} fallbackItems={rssFallbackItems} />
        );
      case "headlineGrid":
        return featuredSlides.length ? (
          <SadeNewsHeadlineGrid slides={featuredSlides} sideItems={featuredSideItems} showQuickAccess={showQuickLinks} />
        ) : null;
      case "newsMapModule":
        return (
          <HmNewsMapModule
            linkMode="yekpare"
            accent={SADE_ACCENT}
            className="mb-6"
          />
        );
      case "worldBriefs":
        return <DunyadanKisaKisaBand accent={SADE_ACCENT} className="mb-6" />;
      case "yekpareHaberler":
        return <SadeYekpareHaberlerBlock items={portalCategoryPool} href="/tum-haberler" />;
      case "recentVideosSidebar":
        return (
          <HmRecentVideosBox
            videoTvHref={(sourceId, videoId) => `/yp/kanal/${sourceId}/${encodeURIComponent(videoId)}`}
            listHref="/yp/"
            accent={SADE_ACCENT}
          />
        );
      case "authorsStrip":
        return authors.length ? (
          <Section title="Köşe yazarları" subtitle="Yazarlar ve son yazıları.">
            <SadeAuthorsStrip authors={authors} />
          </Section>
        ) : null;
      case "publicInfo":
        return <SadePublicInfoCards />;
      case "timeline":
        return timelineItems.length ? <SadeEditorialTimeline items={timelineItems} /> : null;
      case "categoryModules":
        return (
          <Section title="Kategori modülleri" subtitle="Gündem, ekonomi, spor ve daha fazlası.">
            <div className="grid gap-4 lg:grid-cols-2">
              {NEWS_CATEGORY_MODULES.map((cat) => (
                <SadeCategoryNewsModule key={cat.slug} slug={cat.slug} label={cat.label} color={cat.color} />
              ))}
            </div>
          </Section>
        );
      case "newsletter":
        return <SadeNewsletterCta />;
      case "ataturkBand":
        return <SadeAtaturkBand />;
      case "historyNationalDaysBand":
        return <SadeHistoryNationalDaysBand />;
      case "latestGrid":
        return (
          <HmRssNewsBand
            title={activeCategory ? `${categoryTitle ?? "Kategori"} haberleri` : all ? "Tüm haberler" : "Son haberler"}
            titleHref="/haberler"
            items={gridItems}
            tabSourceItems={portalCategoryPool}
            categoryTabs={STANDARD_PORTAL_NEWS_TABS}
            initialCategorySlug={activeCategory}
            accent={SADE_ACCENT}
            pending={loading}
            moreHref="/haberler"
            moreLabel="Daha Fazla Haber"
            loadMoreMode="inline"
            allNewsHref="/haberler"
            gridColumns={3}
          />
        );
      case "popularSidebar":
        if (!popularNews.length) return null;
        return (
          <aside className="space-y-4">
            <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
                <TrendingUp className="h-4 w-4" style={{ color: SADE_ACCENT }} />
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Popüler</h3>
              </div>
              <div className="space-y-3">
                {popularNews.map((n, i) => (
                  <Link key={n.id} href={newsItemHref(n)} className="flex gap-3 rounded-lg p-1 transition hover:bg-slate-50">
                    <span className="text-2xl font-black leading-none" style={{ color: i < 3 ? SADE_ACCENT : "#d1d5db" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="line-clamp-3 flex-1 text-xs font-bold leading-snug text-slate-800 hover:text-[#0EA5E9]">{n.title}</p>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                <PenLine className="h-4 w-4" style={{ color: SADE_ACCENT }} />
                Hızlı erişim
              </p>
              <div className="grid gap-1">
                {[
                  { label: "Son dakika", href: "/kategori/son-dakika" },
                  { label: "Tüm haberler", href: "/tum-haberler" },
                  { label: "Yazarlar", href: "/yazarlar" },
                  { label: "Haber merkezi", href: "/habermerkezi" },
                  { label: "Ana sayfa", href: "/" },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-sky-50 hover:text-[#0EA5E9]">
                    {l.label}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        );
      default:
        return null;
    }
  };

  const showHeadlineGrid =
    showEditorial && modOn("headlineGrid") && featuredSlides.length > 0;
  const editorialModules = moduleOrder.filter(
    (id) => id !== "financeWeather" && id !== "headlineGrid" && id !== "latestGrid" && id !== "popularSidebar",
  );
  const listModuleIds = moduleOrder.filter((id) => id === "latestGrid" || id === "popularSidebar");
  const hasSidebar = showEditorial && listModuleIds.includes("popularSidebar") && modOn("popularSidebar") && popularNews.length > 0;
  const headerFinanceTicker =
    modOn("financeWeather") && (showFinance || showWeather) ? (
      <SadeFinanceWeatherStrip showFinance={showFinance} showWeather={showWeather} variant="header" />
    ) : null;

  return (
    <Shell
      staticLocationLabel="Türkiye"
      searchPlaceholder="Haberlerde ara"
      showHeaderSearch={false}
      headerSearchReplacement={headerFinanceTicker}
      subHeader={categoryNav}
      heroChrome={false}
      portalNewsPage={portalNewsHost}
    >
      <main
        className={`relative z-[5] mx-auto w-full max-w-[1440px] bg-white px-4 pb-8 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}
        data-hm-vitrin-theme="news"
      >
        {showHeadlineGrid ? (
          <div className={`${SADE_PUBLIC_POST_HERO_STACK_CLASS} pt-2`}>
            {renderPortalModule("headlineGrid")}
          </div>
        ) : null}
        {showEditorial && editorialModules.some((id) => modOn(id)) ? (
          <div className={SADE_PUBLIC_POST_HERO_STACK_CLASS}>
            {editorialModules.map((moduleId) => (
              <div key={moduleId}>{renderPortalModule(moduleId)}</div>
            ))}
          </div>
        ) : null}
        {showEditorial ? (
          <div className={SADE_PUBLIC_POST_HERO_STACK_CLASS}>
            <SadeHomeCitiesBandCompact />
          </div>
        ) : null}
        {listModuleIds.some((id) => modOn(id)) ? (
          <div className={`grid gap-8 ${hasSidebar ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
            {listModuleIds.map((moduleId) => {
              if (moduleId === "popularSidebar" && !hasSidebar) return null;
              if (moduleId === "latestGrid" && !modOn("latestGrid")) return null;
              return (
                <div key={moduleId} className={moduleId === "popularSidebar" ? undefined : "min-w-0"}>
                  {renderPortalModule(moduleId)}
                </div>
              );
            })}
          </div>
        ) : null}
      </main>
    </Shell>
  );
}

export function SixAmMartNewsDetailPage() {
  const params = useParams<{ id?: string }>();
  const slug = params.id ?? "";
  const [news, setNews] = useState<NewsCardItem | null>(null);
  const [related, setRelated] = useState<NewsCardItem[]>([]);
  const [koseAuthor, setKoseAuthor] = useState<KoseAuthorBrief | null>(null);
  const [koseMoreArticles, setKoseMoreArticles] = useState<KoseArticleBrief[]>([]);
  const [koseOtherAuthors, setKoseOtherAuthors] = useState<KoseAuthorBrief[]>([]);
  const [loading, setLoading] = useState(true);

  const koseArticle = isKosePortalArticle(news) && hasKoseAuthorId(news);
  const koseAuthorDisplay: KoseAuthorBrief | null =
    koseAuthor ??
    (koseArticle && news?.authorId && news.authorName?.trim()
      ? { id: news.authorId, name: news.authorName.trim() }
      : null);

  const bodyHtml = useMemo(
    () => rewriteInlineHtmlImgSrc(normalizeAiNewsHtml(news?.content || "")),
    [news?.content],
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API}/news/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNews(d))
      .catch(() => setNews(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!news || koseArticle) {
      setRelated([]);
      return;
    }
    fetch(`${API}/news?status=published&limit=4&offset=0&siteScope=portal`)
      .then((r) => r.json())
      .then((d) => setRelated(Array.isArray(d?.items) ? d.items.filter((item: NewsCardItem) => (item.slug || item.id) !== slug).slice(0, 3) : []))
      .catch(() => setRelated([]));
  }, [slug, news, koseArticle]);

  useEffect(() => {
    if (!koseArticle || !news?.authorId) {
      setKoseAuthor(null);
      setKoseMoreArticles([]);
      setKoseOtherAuthors([]);
      return;
    }
    const authorId = news.authorId;
    void Promise.all([
      fetch(`${API}/authors/${authorId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `${API}/news?authorId=${encodeURIComponent(String(authorId))}&siteScope=portal&status=published&limit=12&offset=0`,
      ).then((r) => (r.ok ? r.json() : { items: [] })),
      fetch(`${API}/authors`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([author, morePayload, authorsRaw]) => {
        setKoseAuthor(author as KoseAuthorBrief | null);
        const items = Array.isArray(morePayload?.items) ? morePayload.items : [];
        setKoseMoreArticles(
          items
            .filter((item: NewsCardItem) => String(item.slug || item.id) !== slug)
            .map((item: NewsCardItem) => ({
              id: Number(item.id),
              slug: String(item.slug || item.id),
              title: item.title,
              categoryName: item.categoryName,
              createdAt: String(item.createdAt || item.publishedAt || new Date().toISOString()),
            })),
        );
        const authors = Array.isArray(authorsRaw)
          ? authorsRaw
          : (authorsRaw as { authors?: KoseAuthorBrief[] })?.authors ?? [];
        setKoseOtherAuthors(authors.filter((a: KoseAuthorBrief) => a.id !== authorId));
      })
      .catch(() => {
        setKoseAuthor(null);
        setKoseMoreArticles([]);
        setKoseOtherAuthors([]);
      });
  }, [koseArticle, news?.authorId, slug]);

  const image = news?.imageUrl ? resolveClientMediaSrc(news.imageUrl) || news.imageUrl : null;
  const excerpt = news ? resolveNewsExcerpt(news) : null;
  const readMin = useMemo(
    () =>
      news
        ? estimateNewsReadMinutes({
            title: news.title,
            spot: news.spot ?? news.summary,
            content: news.content,
          })
        : 1,
    [news],
  );

  return (
    <Shell staticLocationLabel="Türkiye" searchPlaceholder="Haberlerde ara">
      <main className={`hm-article-detail-page mx-auto w-full max-w-screen-xl px-4 pb-6 md:pb-8 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
          <Link href="/" className="text-[#0284C7] hover:underline">Anasayfa</Link>
          <span>/</span>
          <Link href="/haberler" className="text-[#0284C7] hover:underline">Haberler</Link>
          {news?.categoryName ? (
            <>
              <span>/</span>
              <span className="text-slate-700">{news.categoryName}</span>
            </>
          ) : null}
        </div>
        {loading ? (
          <div className="h-[520px] animate-pulse rounded-[2rem] bg-slate-50" />
        ) : news ? (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3 lg:gap-10">
            <article className="min-w-0 overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-sm lg:col-span-2">
              <div className="p-5 md:p-8">
                <EditorialNewsDetailHeader
                  accent={SADE_ACCENT}
                  title={news.title}
                  categoryName={news.categoryName}
                  categoryVariant="eyebrow"
                  dateLabel={fmtDate(news.publishedAt || news.createdAt)}
                  readMin={readMin}
                  excerpt={excerpt}
                  imageSrc={image}
                  imageAlt={news.title}
                  authorSlot={
                    koseArticle && koseAuthorDisplay ? (
                      <KoseAuthorByline
                        author={koseAuthorDisplay}
                        accent={SADE_ACCENT}
                        href={`/yazar/${koseAuthorDisplay.id}`}
                      />
                    ) : news.authorName ? (
                      <p className="text-sm font-semibold text-slate-600">✍️ {news.authorName}</p>
                    ) : null
                  }
                />
                <NewsArticleBody
                  html={bodyHtml}
                  className="yekpare-rich-content yekpare-news-body yekpare-news-body--column prose prose-lg max-w-none text-slate-800 leading-relaxed
                  prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mt-8 prose-headings:mb-4
                  prose-p:text-slate-700 prose-p:leading-[1.8] prose-p:mb-[1.25em]
                  prose-img:rounded-lg prose-img:w-full prose-img:max-w-full prose-img:my-6 prose-img:shadow-sm
                  prose-a:no-underline hover:prose-a:underline
                  prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:bg-sky-50 prose-blockquote:px-4 prose-blockquote:py-2
                  [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-6 [&_a]:text-[var(--article-link)]"
                  style={{ "--article-link": SADE_ACCENT } as CSSProperties}
                />
              </div>
            </article>
            <HmNewsDetailSidebar accent={SADE_ACCENT} excludeNewsId={Number(news.id)} excludeSlug={news.slug || slug} />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm font-bold text-slate-500">Haber bulunamadı.</div>
        )}
        {koseArticle && koseAuthorDisplay ? (
          <div className="space-y-6">
            {koseMoreArticles.length > 0 ? (
              <KoseAuthorArticlesBand
                title="Yazarın diğer yazıları"
                articles={koseMoreArticles}
                accent={SADE_ACCENT}
                moreHref={`/yazar/${koseAuthorDisplay.id}`}
                moreLabel="Tüm yazıları"
                excludeSlug={slug}
              />
            ) : null}
            <KoseOtherAuthorsBand
              authors={koseOtherAuthors}
              accent={SADE_ACCENT}
              excludeAuthorId={koseAuthorDisplay.id}
              yazarlarHref="/yazarlar"
            />
          </div>
        ) : related.length ? (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950">Diğer haberler</h2>
              <Link href="/tum-haberler" className="text-sm font-black text-[#0284C7]">Tüm haberler</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">{related.map((item) => <NewsCard key={item.id} item={item} />)}</div>
          </section>
        ) : null}
      </main>
    </Shell>
  );
}

export function SixAmMartHomeModulePage() {
  const module = moduleFromQuery("rental");
  if (module === "rental") return <SixAmMartTourismPage />;
  return <Redirect to="/" />;
}
