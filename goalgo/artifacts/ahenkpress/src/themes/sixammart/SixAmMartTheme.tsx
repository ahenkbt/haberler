import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, Redirect, useLocation, useParams } from "wouter";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { SADE_PUBLIC_HERO_CONTENT_CLASS, SADE_PUBLIC_HERO_CONTENT_COMPACT_CLASS, SADE_PUBLIC_HERO_STAGE_CLASS, SADE_PUBLIC_HERO_SURFACE_CLASS, SADE_PUBLIC_PAGE_BG, SADE_PUBLIC_PAGE_BG_WHITE, SADE_PUBLIC_POST_HERO_BODY_CLASS, SADE_PUBLIC_POST_HERO_MAIN_CLASS, SADE_PUBLIC_POST_HERO_STACK_CLASS, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";
import {
  YEKPARE_PLATFORM_NAV,
  YEKPARE_SERVICE_MODULE_META,
  YEKPARE_SERVICE_MODULE_ORDER,
  resolveSixAmMartActiveFromPath,
  isSiparisNavActive,
  type SixAmMartModuleKey,
} from "@/lib/yekpareServiceNav";
import { kesfetSearchTarget, filterPublicTopNavForHeader, resolvePublicTopNav } from "@/lib/kesfetDiscoverHub";
import { isTurizmNavActive } from "@/themes/turizm/turizmRoutes";
import { isOtomotivNavActive } from "@/themes/otomotiv/otomotivRoutes";
import {
  ArrowRight,
  Bike,
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
  PackageCheck,
  PenLine,
  Phone,
  PlayCircle,
  Search,
  ShoppingBag,
  Star,
  Store,
  Truck,
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
import { combineTrAddressLine } from "@/components/transport/TransportAddressPicker";
import {
  checkTransportProviderAvailable,
  getTransportUnavailableMessage,
  mapTransportRequestError,
} from "@/lib/ulasimTransportErrors";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { SadeHeaderLocationPill } from "@/components/SadeHeaderLocationPill";
import { SearchEngineFooter } from "@/components/SearchEngineFooter";
import { SearchEngineHeader } from "@/components/SearchEngineHeader";
import { SearchEngineSubNavStack } from "@/components/SearchEngineSubNavStack";
import { useSearchEngineHeaderState } from "@/hooks/useSearchEngineHeaderState";
import { useYekpareTheme } from "@/hooks/useYekpareTheme";
import { shouldShowGlobalCategoryPills } from "@/lib/searchEngineNav";
import { SadeLocationPickerModal } from "@/components/SadeLocationPickerModal";
import {
  formatPublicLocationLabel,
  PUBLIC_LOCATION_UPDATED_EVENT,
  readPublicLocation,
  type PublicLocationState,
} from "@/lib/publicLocation";
import { resolveClientMediaSrc, normalizeAiNewsHtml, rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { resolveMarketplaceStoreCardHref } from "@/lib/marketplaceStoreHref";
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
import { UlasimSubNavBar } from "@/components/UlasimSubNavBar";
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
import { HomeOrderTabs } from "./HomeOrderTabs";
import { HomeShoppingShowcase } from "./HomeShoppingShowcase";
import { HomeTravelTabs } from "./HomeTravelTabs";
import { HmYekpareCategoryBox } from "@/components/HmYekpareKategorilerKutusu";
import { CATEGORY_BOX_DISPLAY_TOTAL, ensureNewsBoxItems } from "@/lib/hmCategoryBoxItems";
import { HmRecentVideosBox } from "@/components/HmRecentVideosBox";
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
  food: { icon: Utensils, color: "#ef4444", bg: "bg-red-50" },
  grocery: { icon: Store, color: "#38BDF8", bg: "bg-sky-50" },
  pharmacy: { icon: Wrench, color: "#8b5cf6", bg: "bg-violet-50" },
  rental: { icon: Building2, color: "#0284c7", bg: "bg-sky-50" },
  parcel: { icon: Car, color: "#f97316", bg: "bg-orange-50" },
  shop: { icon: ShoppingBag, color: SADE_ACCENT, bg: "bg-sky-50" },
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
  { title: "Keşfet", href: "/kesfet", icon: Compass, accent: "#3b82f6", description: "Sipariş, alışveriş, haritalar, seyahat, otomotiv, haberler, YekTube, Bilgi Ağacı ve daha fazlası — tek merkezden." },
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
  food: { icon: Utensils, accent: "#ef4444", bg: "bg-red-50" },
  grocery: { icon: Store, accent: "#38BDF8", bg: "bg-sky-50" },
  pharmacy: { icon: Wrench, accent: "#8b5cf6", bg: "bg-violet-50" },
  rental: { icon: Building2, accent: "#0284c7", bg: "bg-sky-50" },
  parcel: { icon: Car, accent: "#f97316", bg: "bg-orange-50" },
  shop: { icon: ShoppingBag, accent: "#0284C7", bg: "bg-cyan-50" },
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
  "/otomotiv": Car,
  "/ulasim": Truck,
  "/haberler": Newspaper,
  "/yektube": PlayCircle,
  "/bilgiagaci": BookOpen,
  "/magaza": ShoppingBag,
  "/yemek": Utensils,
  "/market": Store,
  "/isletmeler": Wrench,
  "/siparis": Store,
  "/iletisim": Phone,
};

function platformLinkIcon(href: string) {
  const path = href.split("?")[0] ?? href;
  return PUBLIC_LINK_ICONS[path] ?? Compass;
}

function isShellNavLinkActive(pathOnly: string, href: string): boolean {
  if (href === "/siparis") return isSiparisNavActive(pathOnly);
  if (href === "/turizm") return isTurizmNavActive(pathOnly);
  if (href === "/otomotiv") return isOtomotivNavActive(pathOnly);
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
}): Promise<NewsCardItem[]> {
  const qs = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset ?? 0),
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
}): NewsCardItem[] {
  const manual = mergeUniqueNewsItems(
    opts.manualItems.filter((item) => !newsItemIsRss(item)),
    opts.latestItems.filter((item) => !newsItemIsRss(item)),
  ).slice(0, 1);
  const rss = opts.rssEnabled ? pickOneRssHeadlinePerCategory(opts.latestItems) : [];
  return mergeUniqueNewsItems(manual, rss, opts.manualItems, opts.latestItems).slice(0, opts.limit ?? 12);
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

function moduleFromQuery(defaultModule: SixAmMartModuleKey = "grocery"): SixAmMartModuleKey {
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
  children,
}: {
  active?: SixAmMartModuleKey;
  locationLabel?: string;
  /** Sabit konum etiketi — masaüstü seçici kapalı (ör. «Türkiye») */
  staticLocationLabel?: string;
  searchPlaceholder?: string;
  /** Turizm rotalarında BC tarzı footer (§5.3) */
  footerVariant?: "default" | "turizm" | "otomotiv";
  /** Header altına yapışık alt şerit (ör. /haberler kategori menüsü) */
  subHeader?: React.ReactNode;
  /** Alt şerit ana menü altındaki hero gradient içinde (cam yüzey) */
  subHeaderInHero?: boolean;
  /** Sade krem-yeşil hero + alt fade — header ve isteğe bağlı üst modüller */
  heroChrome?: boolean;
  /** heroChrome içinde kategori nav altına eklenen içerik (ör. /haberler vitrin modülleri) */
  heroExtension?: React.ReactNode;
  /** /haritalar masaüstü: header/footer arasında esnek harita gövdesi */
  mapEmbed?: boolean;
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
  footerVariant?: "default" | "turizm" | "otomotiv";
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
                    href="/magaza"
                    className="rounded-[1.5rem] bg-sky-500 p-4 text-white transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    aria-label="Alışveriş — pazaryeri ve ürünler"
                  >
                    <ShoppingBag className="mb-3 h-7 w-7" />
                    <p className="text-2xl font-black">Alışveriş</p>
                    <p className="text-xs font-semibold text-white/80">Pazaryeri ve ürünler</p>
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

const SIPARIS_MODULE_KEYS: SixAmMartModuleKey[] = ["food", "grocery", "shop", "pharmacy"];

const SEYAHAT_TAB_ITEMS = [
  { type: "hotel", label: "Otel", href: "/turizm/konaklama", emoji: "🏨", description: "Konaklama ve oteller." },
  { type: "villa", label: "Villa & Ev", href: "/turizm/villa-ev", emoji: "🏡", description: "Villa ve tatil evleri." },
  { type: "tour", label: "Tur", href: "/turizm/turlar", emoji: "🗺️", description: "Günübirlik ve paket turlar." },
  { type: "boat", label: "Yat/Tekne", href: "/turizm/yat-turlari", emoji: "⛵", description: "Yat ve tekne kiralama." },
  { type: "car", label: "Rent a Car", href: "/turizm/arac-kiralama", emoji: "🚗", description: "Araç kiralama." },
  { type: "flight", label: "Uçak", href: "/turizm/ucus", emoji: "✈️", description: "Uçak bileti arama." },
] as const;

type HomeServiceTabGroup = "siparis" | "seyahat";

function HomeServiceTabs({
  defaultGroup = "siparis",
  activeModule,
  activeTravelType,
  showGroupSwitch = true,
}: {
  defaultGroup?: HomeServiceTabGroup;
  activeModule?: SixAmMartModuleKey;
  activeTravelType?: string;
  /** Anasayfa: Sipariş | Seyahat; vitrin sayfalarında tek grup da gösterilebilir. */
  showGroupSwitch?: boolean;
}) {
  const [group, setGroup] = useState<HomeServiceTabGroup>(defaultGroup);
  const siparisModules = MODULES.filter((m) => SIPARIS_MODULE_KEYS.includes(m.key));

  const siparisCardCount = siparisModules.length + 1;

  return (
    <Section
      title={
        showGroupSwitch
          ? "Sipariş ve seyahat"
          : group === "seyahat"
            ? "Seyahat"
            : "Sipariş"
      }
      subtitle={
        showGroupSwitch
          ? "Yemek, market veya seyahat ilanlarına sekmelerden geç."
          : group === "seyahat"
            ? "Otel, villa, tur, tekne ve araç kiralama."
            : "Yemek, market, alışveriş ve yakındaki işletmeler."
      }
      className="pt-3 md:pt-4"
    >
      {showGroupSwitch ? (
        <div
          className="mb-4 flex rounded-2xl border border-sky-100 bg-sky-50/60 p-1"
          role="tablist"
          aria-label="Sipariş ve seyahat sekmeleri"
        >
          {(
            [
              ["siparis", "Sipariş", Utensils],
              ["seyahat", "Seyahat", Building2],
            ] as const
          ).map(([id, label, Icon]) => {
            const selected = group === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setGroup(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition sm:px-4 sm:py-3 ${
                  selected ? "bg-white text-[#0EA5E9] shadow-sm ring-1 ring-sky-100" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div role="tabpanel">
        {group === "siparis" ? (
          <div
            className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-2.5 ${
              siparisCardCount >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"
            }`}
          >
            {siparisModules.map((module) => {
              const Icon = module.icon;
              const selected = module.key === activeModule;
              return (
                <Link
                  key={module.key}
                  href={module.href}
                  className={`group rounded-[14px] border bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-4 lg:p-3 ${
                    selected ? "border-[#0EA5E9]" : "border-slate-100"
                  }`}
                >
                  <span className={`mb-2 flex h-10 w-10 items-center justify-center rounded-2xl sm:mb-3 sm:h-12 sm:w-12 lg:mb-2 lg:h-10 lg:w-10 ${module.bg}`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-5 lg:w-5" style={{ color: module.accent }} />
                  </span>
                  <span className="block text-xs font-black text-slate-950 group-hover:text-[#0EA5E9] sm:text-sm lg:text-xs">{module.label}</span>
                  <span className="mt-1 line-clamp-2 hidden text-xs font-semibold leading-5 text-slate-500 sm:block">{module.description}</span>
                </Link>
              );
            })}
            <Link
              href="/siparis"
              className="group col-span-2 flex items-center justify-between rounded-[14px] border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:col-span-1 sm:flex-col sm:items-start sm:p-4 lg:p-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 sm:mb-3 sm:h-12 sm:w-12">
                <PackageCheck className="h-5 w-5 text-[#0EA5E9] sm:h-6 sm:w-6" />
              </span>
              <span>
                <span className="block text-xs font-black text-slate-950 group-hover:text-[#0EA5E9] sm:text-sm">Tüm sipariş</span>
                <span className="mt-0.5 hidden text-xs font-semibold text-slate-500 sm:block">Restoran ve market vitrini</span>
              </span>
              <ArrowRight className="h-4 w-4 text-[#0EA5E9] sm:hidden" />
            </Link>
          </div>
        ) : (
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
        )}
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
        ? resolveMarketplaceStoreCardHref({ slug, vendorType: "ecommerce", storefrontHref: sf || undefined })
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
  const href = product.href || product.storefrontHref || "/magaza";
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
          <Link href={lead.storefrontHref || "/magaza"} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-sky-50">Keşfet <ArrowRight className="h-4 w-4" /></Link>
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
      const [biz, mkt] = await Promise.all([
        fetchPublicJson<{ success?: boolean; data?: HomepageBusiness[] }>(`${API}/map/homepage-businesses`),
        fetchPublicJson<{ success?: boolean; data?: { campaigns?: Array<{ id: number; title: string; description?: string | null; storefrontHref?: string | null }> } }>(
          `${API}/delivery/marketplace?lang=tr&limit=24&randomize=1`,
        ),
      ]);
      const bizRows = biz.data;
      setBusinesses(biz.ok && bizRows?.success && Array.isArray(bizRows.data) ? bizRows.data : []);
      const campaigns = mkt.data?.data?.campaigns;
      setCampaigns(Array.isArray(campaigns) ? campaigns.slice(0, 3) : []);
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
        subtitle="Konumunu seç, yakınındaki işletmeleri keşfet, sipariş ve alışveriş adımlarına hızlıca geç."
        ctaHref="/yemek"
        ctaLabel="Siparişe başla"
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
        <HomeShoppingShowcase />
        <div className="space-y-4">
          <HomeOrderTabs nearbyBusinesses={businesses} />
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

export function SixAmMartDeliveryPage({ defaultModule = "grocery" }: { defaultModule?: SixAmMartModuleKey }) {
  const { data: siteSettings } = useGetSiteSettings();
  const [active, setActive] = useState<SixAmMartModuleKey>(() => moduleFromQuery(defaultModule));
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [loc, setLoc] = useState<TrAddressValue>({ city: "", district: "", mahalle: "" });
  const [loading, setLoading] = useState(false);
  const activeCategory = active === "food" ? "yemek" : active === "pharmacy" ? "nalbur-elektronik-yedek-parca" : "hepsi";
  const locLabel = [loc.mahalle, loc.district, loc.city].filter(Boolean).join(", ") || "Adres / konum seç";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("kategori");
    if (cat === "yemek") setActive("food");
    if (cat === "nalbur-elektronik-yedek-parca") setActive("pharmacy");
  }, []);

  useEffect(() => {
    fetch(`${API}/delivery/categories`)
      .then((r) => r.json())
      .then((all: VendorCategory[]) => setCategories(Array.isArray(all) ? all.filter((c) => c.superCategory === "siparis" || !c.superCategory).sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)) : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: "delivery", limit: "60" });
    if (activeCategory !== "hepsi") params.set("category", activeCategory);
    if (search.trim()) params.set("search", search.trim());
    if (loc.city) params.set("city", loc.city);
    if (loc.district) params.set("district", loc.district);
    if (loc.mahalle) params.set("neighborhood", loc.mahalle);
    fetch(`${API}/delivery/vendors?${params}`)
      .then((r) => r.json())
      .then((d) => setVendors(Array.isArray(d) ? d : []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, [activeCategory, search, loc.city, loc.district, loc.mahalle]);

  return (
    <Shell active={active} locationLabel={locLabel} searchPlaceholder="İşletme, kategori veya ürün ara">
      <Hero active={active} kicker="Sipariş" title="Yakındaki restoranları ve işletmeleri keşfet" subtitle="Yemek, market ve yerel işletmeler Yekpare'de kartlar, kategoriler ve konum aramasıyla listelenir." ctaHref="/siparis" ctaLabel="Siparişe başla" locationLabel={locLabel} searchPlaceholder="İşletme veya ürün ara" />
      <section className="border-y border-sky-100 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 pb-4 pt-3">
          <GoogleTrAddressQuickFill mapsSettings={siteSettings ?? null} value={loc} onChange={setLoc} variant="orange" />
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <label className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-4 ring-1 ring-slate-100">
              <Search className="h-4 w-4 text-[#0284C7]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent py-3 text-sm font-semibold outline-none" placeholder="İşletme veya ürün ara..." />
            </label>
            <button className="rounded-xl bg-[#0284C7] px-6 py-3 text-sm font-black text-white" style={{ color: "#fff" }}>Ara</button>
          </form>
        </div>
      </section>
      <HomeServiceTabs defaultGroup="siparis" activeModule={active} />
      <main id="sixam-store-grid" className={`${SADE_PUBLIC_POST_HERO_MAIN_CLASS} pb-10`}>
        <Section title="Kategoriler" subtitle="İşletmeleri kategoriye göre süz.">
          <div className="yekpare-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setActive("grocery")} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${active === "grocery" ? "bg-[#0284C7] text-white" : "bg-white text-slate-700"}`}>🏪 Hepsi</button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActive(cat.slug === "yemek" ? "food" : cat.slug === "nalbur-elektronik-yedek-parca" ? "pharmacy" : "grocery")} className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-sky-50">
                {cat.icon || "•"} {cat.name}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Öne çıkan işletmeler" subtitle={loading ? "Mağazalar yükleniyor..." : `${vendors.length} işletme listeleniyor.`}>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-52 animate-pulse rounded-[10px] bg-white" />)}</div>
          ) : vendors.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{vendors.map((vendor) => <StoreCard key={vendor.id} item={vendor} />)}</div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm font-bold text-slate-500">Bu filtrede gerçek Yekpare işletmesi bulunamadı.</div>
          )}
        </Section>
      </main>
    </Shell>
  );
}

export function SixAmMartMarketplacePage() {
  const [payload, setPayload] = useState<MarketplacePayload>({});
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ lang: "tr", limit: "120" });
    if (query.trim()) params.set("q", query.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    fetch(`${API}/delivery/marketplace?${params}`)
      .then((r) => r.json())
      .then((d) => setPayload(d?.success && d?.data ? d.data : {}))
      .catch(() => setPayload({}))
      .finally(() => setLoading(false));
  }, [query, selectedCategory]);

  const categories = payload.categories ?? [];
  const categoryList = flattenCategories(categories).slice(0, 40);
  const featured = payload.featuredProducts?.length ? payload.featuredProducts : (payload.products ?? []).slice(0, 8);
  const newest = payload.newest?.length ? payload.newest : (payload.products ?? []).slice(0, 12);
  const best = payload.bestSelling?.length ? payload.bestSelling : (payload.products ?? []).slice(0, 12);

  return (
    <Shell active="shop" staticLocationLabel="Türkiye geneli mağazalar" searchPlaceholder="Ürün, marka veya mağaza ara">
      <Hero active="shop" kicker="Alışveriş" title="Türkiye'nin yerel mağazaları tek pazaryerinde" subtitle="Yekpare alışveriş mağazalarındaki ürünleri kategori, vitrin ve mağaza kartlarıyla keşfet." ctaHref="/magaza/urunler" ctaLabel="Alışverişe başla" locationLabel="Türkiye geneli" searchPlaceholder="Ürün, marka veya mağaza ara" />
      <section className="border-y border-sky-100 bg-white">
        <form onSubmit={(e) => e.preventDefault()} className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 pb-4 pt-3 lg:flex-row">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none">
            <option value="">Tüm Kategoriler</option>
            {categoryList.map((cat) => <option key={cat.id} value={categoryKey(cat)}>{cat.name}</option>)}
          </select>
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-4 ring-1 ring-slate-100">
            <Search className="h-4 w-4 text-[#0284C7]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 bg-transparent py-3 text-sm font-semibold outline-none" placeholder="Ürün, marka veya mağaza ara..." />
          </label>
        </form>
      </section>
      <ModuleSelector active="shop" />
      <main className={`${SADE_PUBLIC_POST_HERO_MAIN_CLASS} pb-10`}>
        {categories.length ? (
          <Section title="Kategoriye göre alışveriş" subtitle="Yekpare ürün kategorileri.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {categories.slice(0, 12).map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(categoryKey(cat))} className="rounded-[14px] border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-2xl">{cat.icon || "🛍️"}</span>
                  <span className="line-clamp-2 text-sm font-black text-slate-950">{cat.name}</span>
                </button>
              ))}
            </div>
          </Section>
        ) : null}
        <Section title="Öne çıkan ürünler" subtitle={loading ? "Ürünler yükleniyor..." : "Yekpare mağazalarından ürünler."}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </Section>
        {best.length ? <Section title="En çok beğenilen ürünler"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{best.map((product) => <ProductCard key={product.id} product={product} />)}</div></Section> : null}
        {newest.length ? <Section title="Yeni gelen ürünler"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{newest.map((product) => <ProductCard key={product.id} product={product} />)}</div></Section> : null}
      </main>
    </Shell>
  );
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
      <HomeServiceTabs defaultGroup="seyahat" activeTravelType={activeType} />
      <main className={`${SADE_PUBLIC_POST_HERO_MAIN_CLASS} pb-10`}>
        <Section title="Popüler seyahat seçenekleri" subtitle="Yekpare seyahat ilanları.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
        </Section>
      </main>
    </Shell>
  );
}

const ULASIM_FEATURED_SERVICES = [
  {
    id: "tow",
    icon: "🛻",
    label: "Çekici",
    description: "Arıza, kaza ve yol yardımı — en yakın çekici ile hızlı müdahale.",
    cta: "Yol yardımı çağır",
    accent: "from-sky-500 to-cyan-600",
  },
  {
    id: "moving",
    icon: "🚚",
    label: "Nakliyat",
    description: "Ev, ofis ve eşya taşıma — planlı nakliyat ve fiyat teklifi.",
    cta: "Nakliyat planla",
    accent: "from-[#0EA5E9] to-cyan-700",
  },
] as const;

const ULASIM_SECONDARY_SERVICES = [
  { id: "rideshare", icon: "🚗", label: "Araç Paylaşma", description: "Ortak yolculuk" },
  { id: "taxi", icon: "🚕", label: "Taksi", description: "Hızlı ulaşım" },
  { id: "courier", icon: "📦", label: "Kurye", description: "Paket gönderimi" },
  { id: "cargo", icon: "📮", label: "Kargo", description: "Şehirler arası yük" },
] as const;

const ULASIM_SERVICE_LABELS: Record<string, string> = {
  tow: "Çekici",
  moving: "Nakliyat",
  rideshare: "Araç Paylaşma",
  taxi: "Taksi",
  courier: "Kurye",
  cargo: "Kargo",
};

const ULASIM_PARCEL_TYPES = [
  { id: "document", label: "Belge / küçük paket" },
  { id: "box", label: "Koli / market paketi" },
  { id: "fragile", label: "Hassas gönderi" },
  { id: "freight", label: "Palet / yük" },
];

const ULASIM_VEHICLE_TYPES = [
  { id: "bike", label: "Moto kurye" },
  { id: "taxi", label: "Taksi / binek" },
  { id: "van", label: "Panelvan" },
  { id: "truck", label: "Kamyonet / nakliye" },
];

type UlasimPageServiceId = "tow" | "taxi" | "rideshare" | "courier" | "cargo" | "moving";

type UlasimPageService = {
  id: UlasimPageServiceId;
  slug: string;
  icon: string;
  label: string;
  title: string;
  description: string;
  short: string;
  cta: string;
  image: string;
  accent: string;
  vehicleType: string;
  packageType: string;
  advantages: string[];
};

const ULASIM_PAGE_SERVICES: UlasimPageService[] = [
  {
    id: "tow",
    slug: "cekici",
    icon: "🛻",
    label: "Çekici",
    title: "Çekici ve yol yardımı",
    description: "Arıza, kaza veya yolda kalma anında konumunu paylaş; en yakın çekici ve yol yardımı seçeneklerine hızlıca geç.",
    short: "Arıza, kaza ve yol yardımı",
    cta: "Çekici talebi oluştur",
    image: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80",
    accent: "from-sky-500 to-cyan-600",
    vehicleType: "truck",
    packageType: "freight",
    advantages: ["Acil yol yardımı", "Konuma göre yönlendirme", "Şeffaf teklif akışı"],
  },
  {
    id: "taxi",
    slug: "taksi",
    icon: "🚕",
    label: "Taksi",
    title: "Taksi çağırma",
    description: "Şehir içi ulaşım için alış ve varış noktanı seç; taksi talebini sade bir form üzerinden başlat.",
    short: "Şehir içi hızlı ulaşım",
    cta: "Taksi talebi oluştur",
    image: "https://images.unsplash.com/photo-1535463731090-e34f4b5098c5?auto=format&fit=crop&w=900&q=80",
    accent: "from-sky-500 to-cyan-600",
    vehicleType: "taxi",
    packageType: "document",
    advantages: ["Net rota bilgisi", "Hızlı talep", "Mobil uyumlu akış"],
  },
  {
    id: "rideshare",
    slug: "arac-paylasimi",
    icon: "🚗",
    label: "Araç Paylaşımı",
    title: "Araç paylaşımı",
    description: "Aynı yöne giden yolculuklar için kalkış ve varış bilgisini gir; ortak yolculuk talebini başlat.",
    short: "Ortak yolculuk seçenekleri",
    cta: "Araç paylaşımı ara",
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=900&q=80",
    accent: "from-cyan-500 to-sky-600",
    vehicleType: "taxi",
    packageType: "document",
    advantages: ["Ortak rota", "Planlı saat", "Sade talep formu"],
  },
  {
    id: "courier",
    slug: "kurye",
    icon: "📦",
    label: "Kurye",
    title: "Kurye gönderimi",
    description: "Belge, küçük paket veya hassas gönderi için alış ve teslim konumunu seç; kurye teklifini oluştur.",
    short: "Belge ve paket gönderimi",
    cta: "Kurye talebi oluştur",
    image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=900&q=80",
    accent: "from-lime-500 to-sky-600",
    vehicleType: "bike",
    packageType: "document",
    advantages: ["Küçük paket odaklı", "Teslim konumu", "Hızlı gönderi"],
  },
  {
    id: "cargo",
    slug: "kargo",
    icon: "📮",
    label: "Kargo",
    title: "Kargo ve yük gönderimi",
    description: "Koli, palet veya şehirler arası yük için temel bilgileri gir; uygun kargo akışına geç.",
    short: "Koli, palet ve yük",
    cta: "Kargo talebi oluştur",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
    accent: "from-cyan-500 to-sky-600",
    vehicleType: "van",
    packageType: "box",
    advantages: ["Koli ve yük", "Planlı teslimat", "Teklif karşılaştırma"],
  },
  {
    id: "moving",
    slug: "nakliyat",
    icon: "🚚",
    label: "Nakliyat",
    title: "Nakliyat planlama",
    description: "Ev, ofis veya eşya taşıma için tarih, rota ve araç ihtiyacını sade bir akışta paylaş.",
    short: "Ev, ofis ve eşya taşıma",
    cta: "Nakliyat planla",
    image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=900&q=80",
    accent: "from-[#0EA5E9] to-cyan-700",
    vehicleType: "truck",
    packageType: "freight",
    advantages: ["Planlı taşıma", "Araç ihtiyacı", "Rota bazlı teklif"],
  },
];

const ULASIM_HOME_SERVICE_IDS: UlasimPageServiceId[] = ["tow", "taxi", "rideshare", "courier", "cargo"];
const ULASIM_HOME_SERVICES = ULASIM_PAGE_SERVICES.filter((service) => ULASIM_HOME_SERVICE_IDS.includes(service.id));

function getUlasimPageService(slugOrId?: string | null) {
  if (!slugOrId) return null;
  return ULASIM_PAGE_SERVICES.find((service) => service.slug === slugOrId || service.id === slugOrId) ?? null;
}

function UlasimHeroAside({ service }: { service: UlasimPageService }) {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-sky-100">
      <div className="relative h-64 bg-slate-100">
        <img src={service.image} alt={service.label} className="h-full w-full object-cover" loading="lazy" />
        <div className={`absolute inset-0 bg-gradient-to-tr ${service.accent} opacity-35`} />
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/85 p-4 shadow-lg backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0284C7]">Ulaşım hizmeti</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{service.label}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{service.short}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4 text-center text-xs font-bold text-slate-600">
        {service.advantages.map((item) => (
          <span key={item} className="rounded-xl bg-sky-50 px-2 py-2 text-[#0284C7]">{item}</span>
        ))}
      </div>
    </div>
  );
}

function formatUlasimAddress(tr: TrAddressValue): string {
  return combineTrAddressLine(tr, tr.sokak ?? "");
}

function UlasimQuoteCard({
  service,
  siteSettings,
  pickup,
  destination,
  serviceDate,
  serviceTime,
  packageType,
  vehicleType,
  duration,
  showAdvanced,
  customerName,
  customerPhone,
  loading,
  formError,
  submitResult,
  onPickupChange,
  onDestinationChange,
  onServiceDateChange,
  onServiceTimeChange,
  onPackageTypeChange,
  onVehicleTypeChange,
  onDurationChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onToggleAdvanced,
  onSubmit,
  onReset,
}: {
  service: UlasimPageService;
  siteSettings: React.ComponentProps<typeof GoogleTrAddressQuickFill>["mapsSettings"];
  pickup: TrAddressValue;
  destination: TrAddressValue;
  serviceDate: string;
  serviceTime: string;
  packageType: string;
  vehicleType: string;
  duration: string;
  showAdvanced: boolean;
  customerName: string;
  customerPhone: string;
  loading: boolean;
  formError: string | null;
  submitResult: { trackingCode: string } | null;
  onPickupChange: (value: TrAddressValue) => void;
  onDestinationChange: (value: TrAddressValue) => void;
  onServiceDateChange: (value: string) => void;
  onServiceTimeChange: (value: string) => void;
  onPackageTypeChange: (value: string) => void;
  onVehicleTypeChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onToggleAdvanced: () => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  if (submitResult) {
    return (
      <div id="ulasim-hizli-teklif" className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100 sm:p-8">
        <div className="text-5xl" aria-hidden>{service.icon}</div>
        <h3 className="mt-4 text-xl font-black text-slate-950">Talebiniz alındı</h3>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {service.label} talebiniz işleme alındı. Sağlayıcılar kısa süre içinde yönlendirilecek.
        </p>
        <div className="mt-5 inline-block rounded-xl bg-sky-50 px-6 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#0284C7]">Takip kodu</p>
          <p className="text-2xl font-black text-[#0284C7]">{submitResult.trackingCode}</p>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href={`/takip/${submitResult.trackingCode}`}
            className="rounded-xl bg-[#0284C7] px-6 py-2.5 text-sm font-black text-white hover:bg-[#0369A1]"
            style={{ color: "#fff" }}
          >
            Takip et
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Yeni talep
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="ulasim-hizli-teklif" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <p className="mb-4 text-sm text-slate-600">
        Seçili hizmet: <span className="font-black text-slate-900">{service.label}</span>
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <UserRound className="h-3.5 w-3.5 text-[#0284C7]" />
            Ad soyad
          </span>
          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
            placeholder="Adınız soyadınız"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Phone className="h-3.5 w-3.5 text-[#0284C7]" />
            Telefon
          </span>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
            placeholder="05xx xxx xx xx"
            autoComplete="tel"
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-[#0284C7]" />
            Alış konumu
          </span>
          <GoogleTrAddressQuickFill mapsSettings={siteSettings ?? null} value={pickup} onChange={onPickupChange} variant="emerald" />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <LocateFixed className="h-3.5 w-3.5 text-[#0284C7]" />
            Varış konumu
          </span>
          <GoogleTrAddressQuickFill mapsSettings={siteSettings ?? null} value={destination} onChange={onDestinationChange} variant="emerald" />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-[#0284C7]" />
            Tarih
          </span>
          <input
            type="date"
            value={serviceDate}
            onChange={(e) => onServiceDateChange(e.target.value)}
            className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Clock className="h-3.5 w-3.5 text-[#0284C7]" />
            Saat
          </span>
          <input
            type="time"
            value={serviceTime}
            onChange={(e) => onServiceTimeChange(e.target.value)}
            className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onToggleAdvanced}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:text-[#0369A1]"
      >
        Daha fazla seçenek
        <ChevronDown className={`h-4 w-4 transition ${showAdvanced ? "rotate-180" : ""}`} />
      </button>

      {showAdvanced ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <PackageCheck className="h-3.5 w-3.5 text-[#0284C7]" />
              Paket tipi
            </span>
            <select
              value={packageType}
              onChange={(e) => onPackageTypeChange(e.target.value)}
              className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
            >
              {ULASIM_PARCEL_TYPES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Car className="h-3.5 w-3.5 text-[#0284C7]" />
              Araç tipi
            </span>
            <select
              value={vehicleType}
              onChange={(e) => onVehicleTypeChange(e.target.value)}
              className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
            >
              {ULASIM_VEHICLE_TYPES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Clock className="h-3.5 w-3.5 text-[#0284C7]" />
              Zamanlama
            </span>
            <select
              value={duration}
              onChange={(e) => onDurationChange(e.target.value)}
              className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
            >
              <option value="now">Hemen</option>
              <option value="same-day">Aynı gün</option>
              <option value="scheduled">Planlı</option>
              <option value="multi-day">Çok günlü</option>
            </select>
          </label>
        </div>
      ) : null}

      {formError ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-[#0284C7] px-6 py-3.5 text-sm font-black text-white hover:bg-[#0369A1] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        style={{ color: "#fff" }}
      >
        {loading ? "Gönderiliyor…" : service.cta}
      </button>
    </div>
  );
}

export function SixAmMartTransportPage({ serviceSlug }: { serviceSlug?: string } = {}) {
  const { data: siteSettings } = useGetSiteSettings();
  const { user, token } = useCustomerAuth();
  const routeService = getUlasimPageService(serviceSlug);
  const isServicePage = Boolean(serviceSlug);
  const [pickup, setPickup] = useState<TrAddressValue>({ city: "", district: "", mahalle: "" });
  const [destination, setDestination] = useState<TrAddressValue>({ city: "", district: "", mahalle: "" });
  const [activeTab, setActiveTab] = useState("tow");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTime, setServiceTime] = useState("09:00");
  const [packageType, setPackageType] = useState("document");
  const [vehicleType, setVehicleType] = useState("truck");
  const [duration, setDuration] = useState("now");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{ trackingCode: string } | null>(null);
  const locLabel = [pickup.district, pickup.city].filter(Boolean).join(", ") || "Kalkış konumu seç";
  const activeService = routeService ?? getUlasimPageService(activeTab) ?? ULASIM_PAGE_SERVICES[0];

  useEffect(() => {
    if (user?.name) setCustomerName((prev) => prev || user.name);
    if (user?.phone) setCustomerPhone((prev) => prev || user.phone || "");
  }, [user?.name, user?.phone]);

  useEffect(() => {
    if (!routeService) return;
    setActiveTab(routeService.id);
    setPackageType(routeService.packageType);
    setVehicleType(routeService.vehicleType);
    setSubmitResult(null);
    setFormError(null);
  }, [routeService]);

  const selectService = (id: string) => {
    setActiveTab(id);
    if (id === "tow") setVehicleType("truck");
    if (id === "moving") setVehicleType("truck");
    if (id === "courier") setVehicleType("bike");
    if (id === "taxi") setVehicleType("taxi");
  };

  const scrollToQuote = () => {
    document.getElementById("ulasim-hizli-teklif")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetQuoteForm = () => {
    setSubmitResult(null);
    setFormError(null);
    setPickup({ city: "", district: "", mahalle: "" });
    setDestination({ city: "", district: "", mahalle: "" });
    setServiceDate("");
    setServiceTime("09:00");
    setDuration("now");
    setShowAdvanced(false);
  };

  async function submitTransportRequest() {
    const name = customerName.trim();
    const phone = customerPhone.trim();
    const fromAddress = formatUlasimAddress(pickup);
    const toAddress = formatUlasimAddress(destination);
    if (!name || !phone || !fromAddress) {
      setFormError("Ad, telefon ve alış konumu zorunludur.");
      scrollToQuote();
      return;
    }
    if (activeService.id !== "tow" && !toAddress) {
      setFormError("Varış konumunu da girin.");
      scrollToQuote();
      return;
    }

    let scheduledAt: string | undefined;
    if (serviceDate) {
      const timePart = serviceTime || "09:00";
      scheduledAt = new Date(`${serviceDate}T${timePart}`).toISOString();
    }

    setFormError(null);
    setLoading(true);
    try {
      const availability = await checkTransportProviderAvailable(activeService.id);
      if (availability === false) {
        setFormError(getTransportUnavailableMessage(activeService.id));
        scrollToQuote();
        return;
      }

      const res = await fetch("/api/transport/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          requestType: activeService.id,
          customerName: name,
          customerPhone: phone,
          fromAddress,
          toAddress: toAddress || undefined,
          scheduledAt,
          extraData: { packageType, vehicleType, duration },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(mapTransportRequestError(activeService.id, res.status, data));
        scrollToQuote();
        return;
      }
      const trackingCode = String(data.trackingCode ?? data.tracking_code ?? "");
      if (!trackingCode) {
        setFormError("Talep alındı ancak takip kodu oluşturulamadı.");
        return;
      }
      setSubmitResult({ trackingCode });
      scrollToQuote();
    } catch {
      setFormError("Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  const selectFeaturedService = (id: string) => {
    selectService(id);
    scrollToQuote();
  };

  if (isServicePage && !routeService) {
    return <Redirect to="/ulasim" />;
  }

  return (
    <Shell
      active="parcel"
      locationLabel={locLabel}
      searchPlaceholder="Çekici, taksi, kurye veya kargo ara"
      subHeader={<UlasimSubNavBar services={ULASIM_PAGE_SERVICES} inline />}
    >
      <Hero
        active="parcel"
        kicker="Ulaşım"
        title={isServicePage ? activeService.title : "Yolculuğun, gönderin ve acil yardımın tek noktada"}
        subtitle={
          isServicePage
            ? activeService.description
            : "Çekici, taksi, araç paylaşımı, kurye, kargo ve nakliyat için konumunu seç; tek akışta talebini oluştur."
        }
        ctaHref="#ulasim-hizli-teklif"
        ctaLabel={isServicePage ? activeService.cta : "Ulaşım talebi oluştur"}
        locationLabel={locLabel}
        searchPlaceholder="Ulaşım hizmeti veya rota ara"
        fadeToBg={SADE_PUBLIC_PAGE_BG_WHITE}
        aside={<UlasimHeroAside service={activeService} />}
        quickActions={
          <div className="flex flex-wrap gap-2">
            {ULASIM_HOME_SERVICES.slice(0, 3).map((service) => (
              <Link
                key={service.id}
                href={`/ulasim/${service.slug}`}
                className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#0284C7] hover:bg-white"
              >
                {service.label}
              </Link>
            ))}
          </div>
        }
      />
      <main id="ulasim-talep" className={`${SADE_PUBLIC_POST_HERO_MAIN_CLASS} pb-10`}>
        {isServicePage ? (
          <>
            <Section title={`${activeService.label} detayları`} subtitle={activeService.short}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-hidden rounded-2xl bg-slate-50">
                  <img src={activeService.image} alt={activeService.label} className="h-72 w-full object-cover" loading="lazy" />
                </div>
                <div className="grid gap-3">
                  {activeService.advantages.map((item) => (
                    <div key={item} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                      <p className="text-sm font-black text-slate-950">{item}</p>
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{activeService.label} talebi için sade ve hızlı akış.</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Teklif formu" subtitle="Konum ve zamanı gir; talebini başlat." className="scroll-mt-24">
              <UlasimQuoteCard
                service={activeService}
                siteSettings={siteSettings ?? null}
                pickup={pickup}
                destination={destination}
                serviceDate={serviceDate}
                serviceTime={serviceTime}
                packageType={packageType}
                vehicleType={vehicleType}
                duration={duration}
                showAdvanced={showAdvanced}
                customerName={customerName}
                customerPhone={customerPhone}
                loading={loading}
                formError={formError}
                submitResult={submitResult}
                onPickupChange={setPickup}
                onDestinationChange={setDestination}
                onServiceDateChange={setServiceDate}
                onServiceTimeChange={setServiceTime}
                onPackageTypeChange={setPackageType}
                onVehicleTypeChange={setVehicleType}
                onDurationChange={setDuration}
                onCustomerNameChange={setCustomerName}
                onCustomerPhoneChange={setCustomerPhone}
                onToggleAdvanced={() => setShowAdvanced((open) => !open)}
                onSubmit={submitTransportRequest}
                onReset={resetQuoteForm}
              />
            </Section>
          </>
        ) : (
          <>
            <Section title="Ulaşım hizmetleri" subtitle="Öne çıkan hizmetler görselli ve sade kartlarla listelendi.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {ULASIM_HOME_SERVICES.map((service) => (
                  <Link
                    key={service.id}
                    href={`/ulasim/${service.slug}`}
                    className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"
                    onClick={() => selectService(service.id)}
                  >
                    <div className="relative h-36 bg-slate-100">
                      <img src={service.image} alt={service.label} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                      <div className={`absolute inset-0 bg-gradient-to-t ${service.accent} opacity-35`} />
                      <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-xl bg-white/90 text-xl shadow-sm">{service.icon}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-black text-slate-950 group-hover:text-[#0284C7]">{service.label}</h3>
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{service.short}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/ulasim/nakliyat"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-[#0284C7]"
              >
                <span aria-hidden>{getUlasimPageService("moving")?.icon}</span>
                Nakliyat hizmetini de görüntüle
              </Link>
            </Section>

            <Section title="Kısa teklif" subtitle="Ana sayfada sadece temel alanlar; detaylar hizmet sayfalarında." className="scroll-mt-24">
              <UlasimQuoteCard
                service={activeService}
                siteSettings={siteSettings ?? null}
                pickup={pickup}
                destination={destination}
                serviceDate={serviceDate}
                serviceTime={serviceTime}
                packageType={packageType}
                vehicleType={vehicleType}
                duration={duration}
                showAdvanced={showAdvanced}
                customerName={customerName}
                customerPhone={customerPhone}
                loading={loading}
                formError={formError}
                submitResult={submitResult}
                onPickupChange={setPickup}
                onDestinationChange={setDestination}
                onServiceDateChange={setServiceDate}
                onServiceTimeChange={setServiceTime}
                onPackageTypeChange={setPackageType}
                onVehicleTypeChange={setVehicleType}
                onDurationChange={setDuration}
                onCustomerNameChange={setCustomerName}
                onCustomerPhoneChange={setCustomerPhone}
                onToggleAdvanced={() => setShowAdvanced((open) => !open)}
                onSubmit={submitTransportRequest}
                onReset={resetQuoteForm}
              />
            </Section>
          </>
        )}
      </main>
    </Shell>
  );

  return (
    <Shell active="parcel" locationLabel={locLabel} searchPlaceholder="Nereden nereye veya hizmet tipi ara">
      <Hero
        active="parcel"
        kicker="Ulaşım"
        title="Çekici ve nakliyat için hızlı teklif"
        subtitle="Yol yardımı ve taşıma ihtiyaçlarında konumunu seç, teklif al. Taksi, kurye ve kargo da aynı akışta."
        ctaHref="#ulasim-hizli-teklif"
        ctaLabel="Teklif al"
        locationLabel={locLabel}
        searchPlaceholder="Çekici, nakliyat veya rota ara"
        fadeToBg={SADE_PUBLIC_PAGE_BG_WHITE}
        quickActions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectFeaturedService("tow")}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#0284C7] hover:bg-white"
            >
              Yol yardımı
            </button>
            <button
              type="button"
              onClick={() => selectFeaturedService("moving")}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#0284C7] hover:bg-white"
            >
              Nakliyat
            </button>
          </div>
        }
      />
      <main id="ulasim-talep" className={`${SADE_PUBLIC_POST_HERO_MAIN_CLASS} pb-10`}>
        <Section title="Hizmet tipi" subtitle="Çekici ve nakliyat öncelikli; diğer seçenekler altta.">
          <div className="grid gap-3 lg:grid-cols-2">
            {ULASIM_FEATURED_SERVICES.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => selectFeaturedService(service.id)}
                className={`rounded-2xl p-4 text-left transition sm:p-5 ${
                  activeTab === service.id
                    ? "bg-sky-50 ring-2 ring-[#0284C7]/20"
                    : "bg-slate-50/80 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-2xl">{service.icon}</span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-950">{service.label}</h3>
                    <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{service.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Diğer:</span>
            {ULASIM_SECONDARY_SERVICES.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => selectService(service.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === service.id
                    ? "bg-sky-100 text-[#0284C7]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span aria-hidden>{service.icon}</span>
                {service.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Hızlı teklif" subtitle="Konum ve zamanı gir; teklif akışına geç." className="scroll-mt-24">
          <div id="ulasim-hizli-teklif" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
            <p className="mb-4 text-sm text-slate-600">
              Seçili hizmet:{" "}
              <span className="font-black text-slate-900">{ULASIM_SERVICE_LABELS[activeTab] ?? "Ulaşım"}</span>
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-[#0284C7]" />
                  Alış konumu
                </span>
                <GoogleTrAddressQuickFill mapsSettings={siteSettings ?? null} value={pickup} onChange={setPickup} variant="emerald" />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <LocateFixed className="h-3.5 w-3.5 text-[#0284C7]" />
                  Varış konumu
                </span>
                <GoogleTrAddressQuickFill mapsSettings={siteSettings ?? null} value={destination} onChange={setDestination} variant="emerald" />
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-[#0284C7]" />
                  Tarih
                </span>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-[#0284C7]" />
                  Saat
                </span>
                <input
                  type="time"
                  value={serviceTime}
                  onChange={(e) => setServiceTime(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:text-[#0369A1]"
            >
              Daha fazla seçenek
              <ChevronDown className={`h-4 w-4 transition ${showAdvanced ? "rotate-180" : ""}`} />
            </button>

            {showAdvanced ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <PackageCheck className="h-3.5 w-3.5 text-[#0284C7]" />
                    Paket tipi
                  </span>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
                  >
                    {ULASIM_PARCEL_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Car className="h-3.5 w-3.5 text-[#0284C7]" />
                    Araç tipi
                  </span>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
                  >
                    {ULASIM_VEHICLE_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-[#0284C7]" />
                    Zamanlama
                  </span>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0284C7]/15"
                  >
                    <option value="now">Hemen</option>
                    <option value="same-day">Aynı gün</option>
                    <option value="scheduled">Planlı</option>
                    <option value="multi-day">Çok günlü</option>
                  </select>
                </label>
              </div>
            ) : null}

            <button
              type="button"
              onClick={scrollToQuote}
              className="mt-5 w-full rounded-xl bg-[#0284C7] px-6 py-3.5 text-sm font-black text-white hover:bg-[#0369A1] sm:w-auto"
              style={{ color: "#fff" }}
            >
              Teklif al
            </button>
          </div>
        </Section>
      </main>
    </Shell>
  );
}

function Summary({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <Icon className="mb-2 h-5 w-5 text-[#0284C7]" />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function NewsCard({ item, featured = false }: { item: NewsCardItem; featured?: boolean }) {
  const image = resolveClientMediaSrc(item.imageUrl ?? null);
  const text = item.spot || item.summary || stripHtml(item.content).slice(0, 180);
  return (
    <NewsItemLink
      item={item}
      className={`group overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        featured ? "grid md:grid-cols-[1.15fr_0.85fr]" : "block"
      }`}
    >
      <div className={`relative overflow-hidden bg-slate-100 ${featured ? "min-h-[280px]" : "h-44"}`}>
        {image ? (
          <img src={image} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
      manualItems: apiFeatured,
      latestItems: mergeUniqueNewsItems(categoryPoolItems, items, rssHeadlineItems),
      rssEnabled: rssHeadlineEnabled,
      limit: 12,
    });
  }, [apiFeatured, categoryPoolItems, items, rssHeadlineItems, rssHeadlineEnabled]);

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

  const heroModuleIds = showEditorial
    ? (["financeWeather", "headlineGrid"].filter((id) => modOn(id as SadeNewsPortalModuleId)) as SadeNewsPortalModuleId[])
    : [];
  const editorialModules = moduleOrder.filter((id) => id !== "financeWeather" && id !== "headlineGrid" && id !== "latestGrid" && id !== "popularSidebar");
  const listModuleIds = moduleOrder.filter((id) => id === "latestGrid" || id === "popularSidebar");
  const hasSidebar = showEditorial && listModuleIds.includes("popularSidebar") && modOn("popularSidebar") && popularNews.length > 0;
  const newsHeroExtension = heroModuleIds.length ? (
    <div className="space-y-1.5 pt-0 pb-0.5">
      {heroModuleIds.map((moduleId) => (
        <div key={moduleId}>{renderPortalModule(moduleId)}</div>
      ))}
    </div>
  ) : null;

  return (
    <Shell
      staticLocationLabel="Türkiye"
      searchPlaceholder="Haberlerde ara"
      subHeader={categoryNav}
      heroChrome={Boolean(newsHeroExtension)}
      heroExtension={newsHeroExtension}
    >
      <main
        className={`relative z-[5] mx-auto w-full max-w-[1440px] bg-white px-4 pb-8 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}
        data-hm-vitrin-theme="news"
      >
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
  const module = moduleFromQuery("grocery");
  if (module === "shop") return <Redirect to="/magaza" />;
  if (module === "rental") return <SixAmMartTourismPage />;
  if (module === "parcel") return <SixAmMartTransportPage />;
  return <SixAmMartDeliveryPage defaultModule={module} />;
}
