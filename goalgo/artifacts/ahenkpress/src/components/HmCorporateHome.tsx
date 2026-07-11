import { Fragment, useMemo, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Rss } from "lucide-react";
import { Link } from "wouter";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { apiRequest } from "@/lib/queryClient";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";
import { coercePublicHybridNewsHref } from "@/lib/hybridNewsHref";
import { CULTURE_PORTAL_ITEMS, HM_WAR_PAGES, NATIONAL_DAY_HIGHLIGHTS, corporateWarPath, culturePortalPath } from "@/lib/hmCorporateHeritage";
import { HmAtaturkCornerBand } from "@/components/HmAtaturkCornerBand";
import { HmAuthorsStrip } from "@/components/HmAuthorsStrip";
import { HmSidebarBalancedGrid } from "@/components/HmSidebarBalancedGrid";
import { HmPopularCitiesSection } from "@/components/HmPopularCitiesSection";
import { HmNewsMansetSplit, type HmMansetSlide } from "@/components/HmNewsMansetSplit";
import type {
  HmCorporateBandItem,
  HmCorporateDonationSettings,
  HmCorporateHomeModuleId,
  HmCorporateQuickLink,
  HmCorporateSliderItem,
  NewsSiteLayoutPrefs,
} from "@/lib/newsSiteLayout";
import {
  HM_CORPORATE_HOME_MODULE_ORDER,
  HM_HOME_LATEST_BAND_ITEM_COUNT,
  filterCorporateHomeModulesForDonation,
  isHmDonationActive,
  resolveHmCorporateEditorModuleEnabled,
  resolveHmCorporateMainNewsLayout,
  resolveHmDonationIbanModule,
  resolveHmHomeModuleOrder,
  type HmCorporateMainNewsLayout,
} from "@/lib/newsSiteLayout";
import { HmCorporateDonationBand } from "@/components/HmCorporateDonationSections";
import { isLegacyHmDonationHtml, stripLegacyHmDonationHtml } from "@/lib/hmLegacyDonationHtml";
import { HmRssBreakingBand } from "@/components/HmRssBreakingBand";
import { HmSehitSearchModule } from "@/components/HmSehitSearchModule";
import { HmRssNewsBand, type HmRssCategoryTab } from "@/components/HmRssNewsBand";
import { resolveLatestGridOpeningCategorySlug } from "@/lib/hmHomeModuleCategories";
import { hmCategorySlug, humanizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { useHeadlineSliderInteraction } from "@/hooks/useHeadlineSliderInteraction";

type NewsItem = {
  id: number | string;
  slug?: string | null;
  title: string;
  spot?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryColor?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
  isBreaking?: boolean | null;
  isFeatured?: boolean | null;
  source?: "db" | "rss";
  href?: string | null;
};

type NewsIdentitySource = {
  id?: number | string | null;
  slug?: string | null;
  title?: string | null;
  href?: string | null;
};

type AuthorItem = {
  id: number | string;
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  latestArticle?: { id: number | string; title: string; slug: string } | null;
};

export type HmCorporateCategorySection = {
  title: string;
  slug: string;
  color: string;
};

export type HmCorporateHomeProps = {
  siteId?: number | null;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  siteDisplayName: string;
  siteDescription: string;
  latestList: NewsItem[];
  /** «Manşette göster» işaretli yayınlanmış haberler (strict; RSS/manuel ayrımı için). */
  featuredNewsList?: NewsItem[];
  authors: AuthorItem[];
  popular: NewsItem[];
  catSections: HmCorporateCategorySection[];
  activeTab: string;
  currentCategoryName: string;
  latestPending: boolean;
  latestError: boolean;
  mansetBelowHtmlDisplay: string;
  homeMiddleHtmlDisplay: string;
  tumHaberlerHref: string;
  yazarlarHref: string;
  hmVideoTvHref: string | null;
  siteneEkleHref: string;
  hmSlug?: string | null;
  corporateSliderItems?: HmCorporateSliderItem[] | null;
  corporateBandItems?: HmCorporateBandItem[] | null;
  corporateQuickLinks?: HmCorporateQuickLink[] | null;
  corporateDonation?: HmCorporateDonationSettings | null;
  hmCorporateWarsSectionEnabled?: boolean;
  hmCorporateNationalDaysSectionEnabled?: boolean;
  hmCorporateAtaturkCornerEnabled?: boolean;
  hmCorporateCulturePortalBandEnabled?: boolean;
  hmCorporateWarsSectionHref?: string | null;
  hmCorporateNationalDaysSectionHref?: string | null;
  hmCorporateCategorySectionsEnabled?: boolean;
  hmCorporateRssBandEnabled?: boolean;
  hmCorporateLatestNewsEnabled?: boolean;
  hmCorporateLatestDevelopmentsEnabled?: boolean;
  hmCorporateSidebarInfoEnabled?: boolean;
  hmCorporateGoogleNewsBandEnabled?: boolean;
  hmCorporateAuthorsEnabled?: boolean;
  hmSehitSearchEnabled?: boolean;
  layoutPrefs?: NewsSiteLayoutPrefs | null;
  hmCorporateHomeModuleOrder?: string[] | null;
  /** Güncel haber bandı kategori sekmeleri (boşsa haberlerden türetilir). */
  categoryTabs?: HmRssCategoryTab[] | null;
};

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** Kurumsal manşet: sol slider + sağ kutu ızgarası için toplam haber havuzu */
const CORPORATE_MANSET_SLIDER_LIMIT = 5;
const CORPORATE_MANSET_SIDE_LIMIT = 10;
const MAIN_NEWS_GRID_LIMIT = CORPORATE_MANSET_SLIDER_LIMIT + CORPORATE_MANSET_SIDE_LIMIT;

function mediaSrc(url: string | null | undefined): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  return resolveClientMediaSrc(raw) || raw;
}

function normalizeNewsIdentityPart(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR");
}

function newsSlugFromHref(href: string | null | undefined): string {
  const raw = String(href ?? "").trim();
  if (!raw) return "";
  const path = raw.split(/[?#]/)[0] ?? "";
  const match = path.match(/(?:^|\/)haber\/([^/]+)/i);
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function newsIdentityKeys(item: NewsIdentitySource, includeId = true): string[] {
  const keys: string[] = [];
  if (includeId && item.id != null && String(item.id).trim()) {
    keys.push(`id:${normalizeNewsIdentityPart(item.id)}`);
  }

  const slug = normalizeNewsIdentityPart(item.slug) || normalizeNewsIdentityPart(newsSlugFromHref(item.href));
  if (slug) keys.push(`slug:${slug}`);

  const title = normalizeNewsIdentityPart(item.title);
  if (title) keys.push(`title:${title}`);

  return keys;
}

function addNewsIdentityKeys(target: Set<string>, item: NewsIdentitySource, includeId = true) {
  newsIdentityKeys(item, includeId).forEach((key) => target.add(key));
}

function createNewsIdentitySet(items: NewsIdentitySource[], includeId = true): Set<string> {
  const keys = new Set<string>();
  items.forEach((item) => addNewsIdentityKeys(keys, item, includeId));
  return keys;
}

function filterUniqueNewsItems(items: NewsItem[], excludedKeys: ReadonlySet<string> = new Set()): NewsItem[] {
  const seen = new Set<string>();
  const result: NewsItem[] = [];
  for (const item of items) {
    const keys = newsIdentityKeys(item);
    if (keys.some((key) => excludedKeys.has(key) || seen.has(key))) continue;
    keys.forEach((key) => seen.add(key));
    result.push(item);
  }
  return result;
}

/** Kurumsal manşet: sol slider yalnızca «Manşette göster» işaretli haberler; yoksa son haberler. */
function buildCorporateMansetNewsItems(featured: NewsItem[], latest: NewsItem[]): NewsItem[] {
  const feat = filterUniqueNewsItems(featured.filter((n) => n.isFeatured));
  const lat = filterUniqueNewsItems(latest);

  if (feat.length > 0) {
    const slider = feat.slice(0, CORPORATE_MANSET_SLIDER_LIMIT);
    const seen = createNewsIdentitySet(slider);
    const side: NewsItem[] = [];

    for (const n of feat.slice(CORPORATE_MANSET_SLIDER_LIMIT)) {
      const keys = newsIdentityKeys(n);
      if (keys.some((key) => seen.has(key))) continue;
      keys.forEach((key) => seen.add(key));
      side.push(n);
      if (slider.length + side.length >= MAIN_NEWS_GRID_LIMIT) break;
    }

    if (slider.length + side.length < MAIN_NEWS_GRID_LIMIT) {
      for (const n of lat) {
        if (n.isFeatured) continue;
        const keys = newsIdentityKeys(n);
        if (keys.some((key) => seen.has(key))) continue;
        keys.forEach((key) => seen.add(key));
        side.push(n);
        if (slider.length + side.length >= MAIN_NEWS_GRID_LIMIT) break;
      }
    }

    return [...slider, ...side].slice(0, MAIN_NEWS_GRID_LIMIT);
  }

  return lat.slice(0, MAIN_NEWS_GRID_LIMIT);
}

function newsHref(n: NewsItem): string {
  return coercePublicHybridNewsHref(n);
}

function categoryColor(n: NewsItem, accent: string, hmCategoryColors?: Record<string, string> | null): string {
  const slug = String(n.categorySlug ?? "").trim().toLowerCase();
  const raw = slug ? hmCategoryColors?.[slug] : "";
  if (typeof raw === "string" && HEX_COLOR.test(raw.trim())) return raw.trim();
  if (typeof n.categoryColor === "string" && HEX_COLOR.test(n.categoryColor.trim())) return n.categoryColor.trim();
  return accent;
}

function formatDate(d: string | null | undefined, long = false): string {
  if (!d) return "";
  try {
    return format(new Date(d), long ? "d MMMM yyyy" : "d MMM yyyy", { locale: tr });
  } catch {
    return "";
  }
}

function homeTabHref(h: (path: string) => string, slug: string): string {
  const clean = slug.trim().toLowerCase();
  return h(clean ? `/?hmTab=${encodeURIComponent(clean)}` : "/");
}

function isExternalHref(href: string): boolean {
  return isHmPublicNavExternal(href);
}

function resolveStoredHref(h: (path: string) => string, href: string): string {
  const raw = String(href ?? "").trim();
  if (!raw) return "/";
  if (isExternalHref(raw)) return raw;
  return h(raw.startsWith("/") ? raw : `/${raw}`);
}

function splitCorporateHeroTitle(title: string): { firstLine: string; accentLine: string } {
  const parts = title
    .split(/\s*(?:\/|\n|\|)\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { firstLine: parts[0], accentLine: parts.slice(1).join(" ") };
  }

  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { firstLine: title.trim(), accentLine: "" };
  if (words.length <= 3) return { firstLine: words.slice(0, -1).join(" "), accentLine: words[words.length - 1] ?? "" };

  const pivot = Math.ceil(words.length / 2);
  return { firstLine: words.slice(0, pivot).join(" "), accentLine: words.slice(pivot).join(" ") };
}

function corporateHeroEyebrow(siteDisplayName: string, title: string, href: string): string {
  const lower = `${title} ${href}`.toLocaleLowerCase("tr-TR");
  const action = lower.includes("bağış") || lower.includes("bagis") || lower.includes("destek") ? "DESTEK OLUN" : "KURUMSAL VİTRİN";
  return `${siteDisplayName.toLocaleUpperCase("tr-TR")} / ${action}`;
}

function corporateHeroPrimaryCta(title: string, href: string): string {
  const lower = `${title} ${href}`.toLocaleLowerCase("tr-TR");
  if (lower.includes("bağış") || lower.includes("bagis") || lower.includes("destek")) return "Destek Olun";
  return "Detayları Gör";
}

function SectionTitle({ title, href, dark = false }: { title: string; href?: string; dark?: boolean }) {
  return (
    <div className="vkv-section-head">
      <h2 className={`vkv-section-title ${dark ? "vkv-section-title--dark" : ""}`}>{title}</h2>
      {href ? (
        <Link href={href} className={`vkv-more-link ${dark ? "vkv-more-link--dark" : ""}`}>
          Tümü <ChevronRight className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

function ImageBox({ item, className = "" }: { item: NewsItem; className?: string }) {
  const src = mediaSrc(item.imageUrl);
  if (src) {
    return <img src={src} alt={item.title} className={className} loading="lazy" />;
  }
  return (
    <div className={`vkv-image-placeholder ${className}`} aria-hidden>
      <span>H</span>
    </div>
  );
}

function ManualImageBox({ title, imageUrl, className = "" }: { title: string; imageUrl?: string | null; className?: string }) {
  const src = mediaSrc(imageUrl);
  if (src) {
    return <img src={src} alt={title} className={className} loading="lazy" />;
  }
  return (
    <div className={`vkv-image-placeholder ${className}`} aria-hidden>
      <span>H</span>
    </div>
  );
}

function CorporateHeroSlider({
  items,
  accent,
  fallbackTitle,
  fallbackDescription,
  tumHaberlerHref,
}: {
  items: HmCorporateSliderItem[];
  accent: string;
  fallbackTitle: string;
  fallbackDescription: string;
  tumHaberlerHref: string;
}) {
  const h = useHmPublicHref();
  const visible = items.slice(0, 8);
  const len = visible.length;
  const slider = useHeadlineSliderInteraction(len, { intervalMs: 5500 });
  const idx = slider.index;

  if (!visible.length) {
    const fallbackHeading = splitCorporateHeroTitle(fallbackTitle);
    return (
      <section className="vkv-hero vkv-hero--empty">
        <div className="vkv-slide-body">
          <div className="vkv-slide-eyebrow">{fallbackTitle.toLocaleUpperCase("tr-TR")} / KURUMSAL VİTRİN</div>
          <h1 className="vkv-slide-title">
            <span>{fallbackHeading.firstLine}</span>
            {fallbackHeading.accentLine ? <span className="vkv-slide-title-accent">{fallbackHeading.accentLine}</span> : null}
          </h1>
          <p className="vkv-slide-exc">{fallbackDescription}</p>
          <div className="vkv-slide-actions">
            <Link href={tumHaberlerHref} className="vkv-slide-btn vkv-slide-btn--primary">
              Haberleri İncele <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href={tumHaberlerHref} className="vkv-slide-btn vkv-slide-btn--secondary">
              Tüm Haberler
            </Link>
          </div>
          <p className="vkv-slide-help">Slider Yönetimi bölümünden manuel görsel, başlık ve bağlantı ekleyebilirsiniz.</p>
        </div>
      </section>
    );
  }

  const current = visible[idx];
  const currentHref = resolveStoredHref(h, current.href || tumHaberlerHref);
  const currentColor = current.color && HEX_COLOR.test(current.color) ? current.color : accent;
  const heading = splitCorporateHeroTitle(current.title);
  const heroStyle = { "--vkv-slide-accent": currentColor } as CSSProperties;
  const eyebrow = corporateHeroEyebrow(fallbackTitle, current.title, currentHref);
  const primaryCta = corporateHeroPrimaryCta(current.title, currentHref);

  return (
    <section className="vkv-hero" aria-label="Manuel kurumsal slider" style={{ ...heroStyle, ...slider.swipeStyle }} {...slider.bind}>
      {visible.map((item, i) => (
        <div key={item.id} className={`vkv-slide ${i === idx ? "active" : ""}`}>
          <ManualImageBox title={item.title} imageUrl={item.imageUrl} className="vkv-slide-img" />
          <div className="vkv-slide-overlay" />
        </div>
      ))}
      {isExternalHref(currentHref) ? (
        <a href={currentHref} className="vkv-slide-hit" aria-label={current.title} />
      ) : (
        <Link href={currentHref} className="vkv-slide-hit" aria-label={current.title} />
      )}
      <div className="vkv-slide-body">
        <div className="vkv-slide-eyebrow">{eyebrow}</div>
        <h1 className="vkv-slide-title">
          <span>{heading.firstLine}</span>
          {heading.accentLine ? <span className="vkv-slide-title-accent">{heading.accentLine}</span> : null}
        </h1>
        {current.subtitle ? <p className="vkv-slide-exc">{current.subtitle}</p> : null}
        <div className="vkv-slide-actions">
          {isExternalHref(currentHref) ? (
            <a href={currentHref} className="vkv-slide-btn vkv-slide-btn--primary">
              {primaryCta} <ChevronRight className="h-4 w-4" />
            </a>
          ) : (
            <Link href={currentHref} className="vkv-slide-btn vkv-slide-btn--primary">
              {primaryCta} <ChevronRight className="h-4 w-4" />
            </Link>
          )}
          <Link href={tumHaberlerHref} className="vkv-slide-btn vkv-slide-btn--secondary">
            Tüm Haberler
          </Link>
        </div>
      </div>
      {len > 1 ? (
        <>
          <button type="button" className="vkv-hero-prev" aria-label="Önceki haber" onClick={() => slider.prev()}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className="vkv-hero-next" aria-label="Sonraki haber" onClick={() => slider.next()}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="vkv-hero-dots">
            {visible.map((item, i) => (
              <button key={item.id} type="button" className={`vkv-dot ${i === idx ? "active" : ""}`} onClick={() => slider.setIndex(i)} aria-label={`${i + 1}. manşet`} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function toMansetSlide(item: NewsItem): HmMansetSlide {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    imageUrl: item.imageUrl ?? null,
    categoryName: item.categoryName,
    categorySlug: item.categorySlug,
    categoryColor: item.categoryColor,
    authorName: item.authorName,
    createdAt: item.createdAt,
  };
}

function MainNewsGridLeadSide({
  items,
  accent,
  hmCategoryColors,
}: {
  items: NewsItem[];
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const h = useHmPublicHref();
  const [main, ...rest] = items;
  const sideItems = rest.slice(0, 6);
  if (!main) {
    return <div className="vkv-empty-panel">Henüz yayınlanmış haber yok.</div>;
  }

  return (
    <div className="vkv-news-grid">
      <Link href={h(newsHref(main))} className="vkv-news-main-card">
        <ImageBox item={main} className="vkv-news-main-img" />
        <div className="vkv-news-main-overlay" aria-hidden />
        <div className="vkv-news-main-body">
          <div className="vkv-nmb-top">
            {main.categoryName ? (
              <span className="vkv-news-main-cat" style={{ background: categoryColor(main, accent, hmCategoryColors) }}>
                {main.categoryName}
              </span>
            ) : null}
            {main.isFeatured ? <span className="vkv-manseta-pin">MANŞET</span> : null}
          </div>
          <h3 className="vkv-news-main-title">{main.title}</h3>
          {main.spot ? <p className="vkv-news-main-exc">{main.spot}</p> : null}
          {main.createdAt ? <time className="vkv-news-main-date">{formatDate(main.createdAt, true)}</time> : null}
        </div>
      </Link>
      <div className="vkv-news-side">
        {sideItems.map((item) => (
          <Link key={item.id} href={h(newsHref(item))} className="vkv-news-side-card">
            <ImageBox item={item} className="vkv-nsc-img" />
            <div>
              {item.categoryName ? (
                <span className="vkv-nsc-cat" style={{ color: categoryColor(item, accent, hmCategoryColors) }}>
                  {item.categoryName}
                </span>
              ) : null}
              <h4 className="vkv-nsc-title">{item.title}</h4>
              {item.createdAt ? <time className="vkv-nsc-date">{formatDate(item.createdAt)}</time> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MainNewsGrid({
  items,
  categories,
  activeTab,
  accent,
  hmCategoryColors,
  layout = "manset-side",
}: {
  items: NewsItem[];
  categories: HmCorporateCategorySection[];
  activeTab: string;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  layout?: HmCorporateMainNewsLayout;
}) {
  const sliderSlides = useMemo(() => items.slice(0, CORPORATE_MANSET_SLIDER_LIMIT).map(toMansetSlide), [items]);
  const sideSlides = useMemo(() => {
    const excluded = createNewsIdentitySet(items.slice(0, CORPORATE_MANSET_SLIDER_LIMIT));
    const pool: NewsItem[] = [];
    const seen = new Set<string>();
    const push = (item: NewsItem) => {
      const keys = newsIdentityKeys(item);
      if (keys.some((key) => excluded.has(key) || seen.has(key))) return;
      keys.forEach((key) => seen.add(key));
      pool.push(item);
    };
    items.slice(1, CORPORATE_MANSET_SLIDER_LIMIT).forEach(push);
    items.forEach(push);
    return pool.slice(0, CORPORATE_MANSET_SIDE_LIMIT).map(toMansetSlide);
  }, [items]);

  return (
    <section className={`vkv-main ${layout === "lead-side-grid" ? "vkv-main--news-lead-grid" : "vkv-main--news-manset"}`}>
      {!sliderSlides.length ? (
        <div className="vkv-empty-panel">Henüz yayınlanmış haber yok.</div>
      ) : layout === "lead-side-grid" ? (
        <MainNewsGridLeadSide items={items} accent={accent} hmCategoryColors={hmCategoryColors} />
      ) : (
        <HmNewsMansetSplit
          sliderSlides={sliderSlides}
          sideSlides={sideSlides}
          accent={accent}
          hmCategoryColors={hmCategoryColors}
          sideDense
        />
      )}
    </section>
  );
}

function quickAccessSubtitle(label: string): string {
  const normalized = label.trim().toLocaleLowerCase("tr-TR");
  if (normalized.includes("gezilecek")) return "Rotalar ve öneriler";
  if (normalized.includes("seyahat")) return "Anılar ve notlar";
  if (normalized.includes("mutfak")) return "Lezzet rehberi";
  if (normalized.includes("turizm")) return "Etkinlik ve aktiviteler";
  if (normalized.includes("kültür") || normalized.includes("kultur")) return "Kent hafızası";
  if (normalized.includes("müze") || normalized.includes("muze")) return "Sergiler ve koleksiyonlar";
  if (normalized.includes("sanat")) return "Etkinlik takvimi";
  return "Detaylara hızlı ulaşın";
}

type QuickAccessLink = {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  color?: string | null;
};

function QuickAccess({
  tumHaberlerHref,
  yazarlarHref,
  hmVideoTvHref,
  siteneEkleHref,
  bandItems,
  items,
  showAuthorsLink,
  showRssLink,
}: {
  tumHaberlerHref: string;
  yazarlarHref: string;
  hmVideoTvHref: string | null;
  siteneEkleHref: string;
  bandItems?: HmCorporateBandItem[] | null;
  items?: HmCorporateQuickLink[] | null;
  showAuthorsLink: boolean;
  showRssLink: boolean;
}) {
  const h = useHmPublicHref();
  const fallbackLinks: QuickAccessLink[] = [
    { key: "fallback-gezilecek", icon: "01", title: "Gezilecek Yerler", subtitle: "Rotalar ve öneriler", href: tumHaberlerHref },
    ...(showAuthorsLink
      ? [{ key: "fallback-seyahat", icon: "02", title: "Seyahat Hatırası", subtitle: "Anılar ve notlar", href: yazarlarHref }]
      : []),
    { key: "fallback-mutfak", icon: "03", title: "Geleneksel Mutfak", subtitle: "Lezzet rehberi", href: h("/bilgiagaci") },
    { key: "fallback-turizm", icon: "04", title: "Turizm Aktiviteleri", subtitle: "Etkinlik ve aktiviteler", href: hmVideoTvHref ?? tumHaberlerHref },
    { key: "fallback-kultur", icon: "05", title: "Kültür Atlası", subtitle: "Kent hafızası", href: h("/bilgiagaci") },
    ...(showRssLink
      ? [{ key: "fallback-muzeler", icon: "06", title: "Müzeler", subtitle: "Sergiler ve koleksiyonlar", href: h("/rss-baglantilari") }]
      : []),
    { key: "fallback-sanat", icon: "07", title: "Sanat", subtitle: "Etkinlik takvimi", href: siteneEkleHref || h("/reklam") },
  ];
  const hasManagedBandConfig = Array.isArray(bandItems) && bandItems.length > 0;
  const bandLinks: QuickAccessLink[] = (bandItems ?? [])
    .filter((item) => item.active !== false && item.title.trim() && (item.href ?? "").trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item, index) => ({
      key: item.id || `band-${index + 1}`,
      icon: String(index + 1).padStart(2, "0"),
      title: item.title.trim(),
      subtitle: item.subtitle?.trim() || quickAccessSubtitle(item.title),
      href: resolveStoredHref(h, item.href ?? ""),
      color: item.color && HEX_COLOR.test(item.color) ? item.color : null,
    }));
  const managedLinks: QuickAccessLink[] = (items ?? [])
    .filter((item) => item.enabled !== false && item.label.trim() && item.href.trim())
    .map((item, index) => ({
      key: item.id || `quick-${index + 1}`,
      icon: item.icon?.trim() || String(index + 1).padStart(2, "0"),
      title: item.label.trim(),
      subtitle: item.subtitle?.trim() || quickAccessSubtitle(item.label),
      href: resolveStoredHref(h, item.href),
    }));
  const links = hasManagedBandConfig ? bandLinks : managedLinks.length ? managedLinks : fallbackLinks;
  if (!links.length) return null;
  return (
    <section className="vkv-he" aria-label="Hızlı erişim">
      <div className="vkv-he-w">
        <div className="vkv-he-grid">
          {links.map((l) => {
            const cardStyle = l.color ? ({ "--vkv-he-card-accent": l.color } as CSSProperties) : undefined;
            return isExternalHref(l.href) ? (
              <a key={l.key} href={l.href} className="vkv-he-kart" style={cardStyle}>
                <span className="vkv-he-ikon">{l.icon}</span>
                <span className="vkv-he-copy">
                  <span className="vkv-he-label">{l.title}</span>
                  <span className="vkv-he-subtitle">{l.subtitle}</span>
                </span>
              </a>
            ) : (
              <Link key={l.key} href={l.href} className="vkv-he-kart" style={cardStyle}>
                <span className="vkv-he-ikon">{l.icon}</span>
                <span className="vkv-he-copy">
                  <span className="vkv-he-label">{l.title}</span>
                  <span className="vkv-he-subtitle">{l.subtitle}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const CORPORATE_WARS = HM_WAR_PAGES.map((page) => ({
  year: page.year,
  title: page.shortTitle.toLocaleUpperCase("tr-TR"),
  text: page.summary,
  slug: page.slug,
}));

function CorporateInfoSections({
  showWars,
  showNationalDays,
  warsHref,
  nationalDaysHref,
}: {
  showWars: boolean;
  showNationalDays: boolean;
  warsHref?: string | null;
  nationalDaysHref?: string | null;
}) {
  const h = useHmPublicHref();
  if (!showWars && !showNationalDays) return null;

  const resolvedWarsHref = resolveStoredHref(h, warsHref || "/savaslar");
  const resolvedNationalDaysHref = resolveStoredHref(h, nationalDaysHref || "/milli-gunler");

  return (
    <section className="vkv-info-tabs" aria-label="Kurumsal bilgi bölümleri">
      <div className="vkv-info-tabs-w">
        {showWars ? (
          <article className="vkv-info-panel vkv-info-panel--wars">
            <div className="vkv-info-head">
              <span className="vkv-info-kicker">Tarih</span>
              <h2>TÜRK MİLLETİNİN SAVAŞLARI</h2>
            </div>
            <div className="vkv-war-list">
              {CORPORATE_WARS.map((row) => (
                <Link key={`${row.year}-${row.title}`} href={h(corporateWarPath(row.slug))} className="vkv-war-row">
                  <div className="vkv-war-year">{row.year}</div>
                  <div className="vkv-war-copy">
                    <h3>{row.title}</h3>
                    <p>{row.text}</p>
                  </div>
                </Link>
              ))}
            </div>
            {isExternalHref(resolvedWarsHref) ? (
              <a href={resolvedWarsHref} className="vkv-info-footer-link">
                TÜM SAVAŞLAR VE ASKERİ TARİH »
              </a>
            ) : (
              <Link href={resolvedWarsHref} className="vkv-info-footer-link">
                TÜM SAVAŞLAR VE ASKERİ TARİH »
              </Link>
            )}
          </article>
        ) : null}

        {showNationalDays ? (
          <article className="vkv-info-panel vkv-info-panel--days">
            <div className="vkv-info-head">
              <span className="vkv-info-kicker">Anma Takvimi</span>
              <h2>MİLLÎ GÜNLER & ANMA TÖRENLERİ</h2>
            </div>
            <div className="vkv-day-grid">
              {NATIONAL_DAY_HIGHLIGHTS.map((item) => (
                <Link key={`${item.day}-${item.title}`} href={resolvedNationalDaysHref} className="vkv-day-tile">
                  <span>{item.day}</span>
                  <strong>{item.title}</strong>
                </Link>
              ))}
            </div>
            {isExternalHref(resolvedNationalDaysHref) ? (
              <a href={resolvedNationalDaysHref} className="vkv-info-footer-link">
                TÜM MİLLÎ GÜNLER »
              </a>
            ) : (
              <Link href={resolvedNationalDaysHref} className="vkv-info-footer-link">
                TÜM MİLLÎ GÜNLER »
              </Link>
            )}
          </article>
        ) : null}
      </div>
    </section>
  );
}

function CulturePortalBand() {
  const h = useHmPublicHref();
  return (
    <section className="vkv-culture-strip" aria-label="Kültür Portalı">
      <div className="vkv-culture-strip-w">
        <div className="vkv-culture-strip-head">
          <span>Kültür Portalı</span>
          <strong>Türkiye'nin kültür, turizm ve sanat başlıklarına hızlı erişim</strong>
        </div>
        <div className="vkv-culture-strip-grid hm-culture-scroll-row">
          {CULTURE_PORTAL_ITEMS.map((item) => (
            <Link key={item.slug} href={h(culturePortalPath(item.slug))} className="vkv-culture-strip-item hm-culture-scroll-card">
              <span className="vkv-culture-strip-icon">{item.icon}</span>
              <span className="vkv-culture-strip-copy">
                <span>{item.title}</span>
                <em>{item.subtitle}</em>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryNewsSection({
  section,
  siteId,
  accent,
  hmCategoryColors,
  excludedKeys,
}: {
  section: HmCorporateCategorySection;
  siteId?: number | null;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  excludedKeys?: ReadonlySet<string>;
}) {
  const h = useHmPublicHref();
  const siteQs = siteId != null ? `?siteId=${encodeURIComponent(String(siteId))}` : "";
  const { data = [] } = useQuery<NewsItem[]>({
    queryKey: ["/api/news/by-category", section.slug, siteId ?? "all", "corporate"],
    queryFn: () => apiRequest(`/api/news/by-category/${section.slug}${siteQs}`) as Promise<NewsItem[]>,
    staleTime: 5 * 60 * 1000,
  });
  const filtered = useMemo(() => filterUniqueNewsItems(data, excludedKeys), [data, excludedKeys]);
  const [main, ...rest] = filtered.slice(0, 5);
  if (!main) return null;

  return (
    <section className="vkv-cat-section">
      <SectionTitle title={`${section.title} Haberleri`} href={homeTabHref(h, section.slug)} />
      <div className="vkv-cat-grid">
        <Link href={h(newsHref(main))} className="vkv-cat-main">
          <ImageBox item={main} className="vkv-cat-main-img" />
          <div className="vkv-cat-main-body">
            <span className="vkv-cat-label" style={{ background: section.color }}>
              {section.title}
            </span>
            <h3>{main.title}</h3>
          </div>
        </Link>
        <div className="vkv-cat-side">
          {rest.slice(0, 4).map((item) => (
            <Link key={item.id} href={h(newsHref(item))} className="vkv-cat-card">
              <ImageBox item={item} className="vkv-cat-card-img" />
              <div>
                <span style={{ color: categoryColor(item, accent, hmCategoryColors) }}>{item.categoryName || section.title}</span>
                <h4>{item.title}</h4>
                <time>{formatDate(item.createdAt)}</time>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PopularSidebar({ popular, accent, hmCategoryColors }: { popular: NewsItem[]; accent: string; hmCategoryColors?: Record<string, string> | null }) {
  const h = useHmPublicHref();
  if (!popular.length) return null;
  return (
    <aside className="vkv-popular">
      <SectionTitle title="Güncel Gelişmeler" />
      {popular.slice(0, 6).map((item, i) => (
        <Link key={item.id} href={h(newsHref(item))} className="vkv-popular-row">
          <span className="vkv-popular-no" style={{ color: i < 3 ? accent : undefined }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>
            {item.categoryName ? (
              <em style={{ color: categoryColor(item, accent, hmCategoryColors) }}>{item.categoryName}</em>
            ) : null}
            <strong>{item.title}</strong>
          </span>
        </Link>
      ))}
    </aside>
  );
}

export function HmCorporateHome({
  siteId = null,
  accent,
  hmCategoryColors = null,
  siteDisplayName,
  siteDescription,
  latestList,
  featuredNewsList = [],
  authors,
  popular,
  catSections,
  activeTab,
  currentCategoryName,
  latestPending,
  latestError,
  mansetBelowHtmlDisplay,
  homeMiddleHtmlDisplay,
  tumHaberlerHref,
  yazarlarHref,
  hmVideoTvHref,
  siteneEkleHref,
  hmSlug = null,
  corporateSliderItems = null,
  corporateBandItems = null,
  corporateQuickLinks = null,
  corporateDonation = null,
  hmCorporateWarsSectionEnabled,
  hmCorporateNationalDaysSectionEnabled,
  hmCorporateAtaturkCornerEnabled,
  hmCorporateCulturePortalBandEnabled,
  hmCorporateWarsSectionHref,
  hmCorporateNationalDaysSectionHref,
  hmCorporateCategorySectionsEnabled,
  hmCorporateRssBandEnabled,
  hmCorporateLatestNewsEnabled,
  hmCorporateLatestDevelopmentsEnabled,
  hmCorporateSidebarInfoEnabled,
  hmCorporateGoogleNewsBandEnabled,
  hmCorporateAuthorsEnabled = false,
  hmSehitSearchEnabled = false,
  layoutPrefs = null,
  hmCorporateHomeModuleOrder = null,
  categoryTabs = null,
}: HmCorporateHomeProps) {
  const h = useHmPublicHref();
  const sonDakikaHref = h(
    siteId != null ? `/sondakika?siteId=${encodeURIComponent(String(siteId))}` : "/sondakika",
  );
  const heroItems = useMemo(
    () =>
      (corporateSliderItems ?? [])
        .filter((item) => item.active !== false && item.title.trim())
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, 8),
    [corporateSliderItems],
  );
  const mainNewsItems = useMemo(
    () => buildCorporateMansetNewsItems(featuredNewsList, latestList),
    [featuredNewsList, latestList],
  );
  const orderedModules = (filterCorporateHomeModulesForDonation(
    resolveHmHomeModuleOrder(hmCorporateHomeModuleOrder, HM_CORPORATE_HOME_MODULE_ORDER),
    corporateDonation,
  ) ?? [...HM_CORPORATE_HOME_MODULE_ORDER]) as HmCorporateHomeModuleId[];
  const shownTopNewsKeys = useMemo(() => {
    const keys = createNewsIdentitySet(heroItems, false);
    if (orderedModules.includes("mainNews")) {
      mainNewsItems.forEach((item) => addNewsIdentityKeys(keys, item));
    }
    return keys;
  }, [heroItems, mainNewsItems, orderedModules]);
  const continuationNewsItems = useMemo(() => filterUniqueNewsItems(latestList, shownTopNewsKeys), [latestList, shownTopNewsKeys]);
  const latestGridOpeningSlug = useMemo(
    () =>
      resolveLatestGridOpeningCategorySlug({
        manualSlug: layoutPrefs?.hmNewsHomeModuleCategorySlugs?.latestGrid,
        tabStripSlugs: (categoryTabs ?? []).map((tab) => tab.slug).filter(Boolean),
        sectionSlugs: catSections.map((section) => section.slug),
      }),
    [catSections, categoryTabs, layoutPrefs?.hmNewsHomeModuleCategorySlugs?.latestGrid],
  );
  const latestTitle = latestGridOpeningSlug
    ? catSections.find((section) => hmCategorySlug(section.slug) === latestGridOpeningSlug)?.title
      ?? humanizeNewsCategorySlug(latestGridOpeningSlug)
    : currentCategoryName || "Güncel Haberler";
  const donationIbanModule = resolveHmDonationIbanModule(orderedModules, "corporate");
  const showFallbackDonation =
    isHmDonationActive(corporateDonation) && donationIbanModule == null;
  const mainNewsLayout = resolveHmCorporateMainNewsLayout(layoutPrefs);
  const latestGridShowsNews = hmCorporateLatestNewsEnabled !== false;
  const latestGridShowsSidebar =
    hmCorporateLatestDevelopmentsEnabled !== false || hmCorporateSidebarInfoEnabled !== false;
  const embedSehitInLatestGrid =
    hmSehitSearchEnabled === true &&
    resolveHmCorporateEditorModuleEnabled(layoutPrefs, "sehitSearch") &&
    resolveHmCorporateEditorModuleEnabled(layoutPrefs, "latestGrid") &&
    latestGridShowsNews &&
    latestGridShowsSidebar &&
    orderedModules.includes("latestGrid") &&
    orderedModules.includes("sehitSearch");

  const renderModule = (moduleId: HmCorporateHomeModuleId) => {
    if (!resolveHmCorporateEditorModuleEnabled(layoutPrefs, moduleId)) return null;
    switch (moduleId) {
      case "hero":
        return (
          <CorporateHeroSlider
            items={heroItems}
            accent={accent}
            fallbackTitle={siteDisplayName}
            fallbackDescription={siteDescription}
            tumHaberlerHref={tumHaberlerHref}
          />
        );
      case "quickAccess":
        return (
          <QuickAccess
            tumHaberlerHref={tumHaberlerHref}
            yazarlarHref={yazarlarHref}
            hmVideoTvHref={hmVideoTvHref}
            siteneEkleHref={siteneEkleHref}
            bandItems={corporateBandItems}
            items={corporateQuickLinks}
            showAuthorsLink={hmCorporateAuthorsEnabled === true}
            showRssLink={false}
          />
        );
      case "googleNewsBand":
        return hmCorporateGoogleNewsBandEnabled === true && layoutPrefs ? (
          <HmRssBreakingBand
            accent={accent}
            layoutPrefs={layoutPrefs}
            siteId={siteId}
            className="vkv-rss-breaking-band hm-vitrin-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow"
          />
        ) : null;
      case "culturePortal":
        return hmCorporateCulturePortalBandEnabled === true ? <CulturePortalBand /> : null;
      case "mansetAd": {
        if (!mansetBelowHtmlDisplay?.trim()) return null;
        if (
          isHmDonationActive(corporateDonation) &&
          (/destek bandı|vkv-donation|çalışmalarımıza destek/i.test(mansetBelowHtmlDisplay) ||
            isLegacyHmDonationHtml(mansetBelowHtmlDisplay))
        ) {
          return null;
        }
        return <div className="vkv-ad-shell" dangerouslySetInnerHTML={{ __html: mansetBelowHtmlDisplay }} />;
      }
      case "mainNews":
        return (
          <MainNewsGrid
            items={mainNewsItems}
            categories={catSections}
            activeTab={activeTab}
            accent={accent}
            hmCategoryColors={hmCategoryColors}
            layout={mainNewsLayout}
          />
        );
      case "popularCities":
        return hmSlug && layoutPrefs?.sadeNewsCitiesBandEnabled === true ? (
          <HmPopularCitiesSection hmSlug={hmSlug} accent={accent} className="vkv-popular-cities" />
        ) : null;
      case "ataturkCorner":
        return hmCorporateAtaturkCornerEnabled === true ? (
          <HmAtaturkCornerBand accent={accent} className="hm-ataturk-band--corporate-home" />
        ) : null;
      case "rssBand":
        return hmCorporateRssBandEnabled === true ? (
          <div className="vkv-kb">
            <div className="vkv-kb-w">
              <span className="vkv-kb-icon" aria-hidden>
                <Rss className="h-7 w-7" />
              </span>
              <div className="vkv-kb-text">
                {siteDisplayName} <em>güvenilir yayın akışını</em> kurumsal vitrinle okuyucularına ulaştırıyor.
              </div>
              <Link href={h("/rss-baglantilari")} className="vkv-kb-link">
                RSS Bağlantıları <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ) : null;
      case "authorsStrip":
        return hmCorporateAuthorsEnabled === true && authors.length > 0 ? (
          <HmAuthorsStrip authors={authors.slice(0, 8)} accent={accent} yazarlarHref={yazarlarHref} variant="corporate" />
        ) : null;
      case "homeMiddleAd": {
        if (!homeMiddleHtmlDisplay?.trim()) return null;
        let middleHtml = homeMiddleHtmlDisplay;
        if (isHmDonationActive(corporateDonation) && isLegacyHmDonationHtml(middleHtml)) {
          middleHtml = stripLegacyHmDonationHtml(middleHtml);
        }
        if (!middleHtml?.trim()) return null;
        return <div className="vkv-ad-shell" dangerouslySetInnerHTML={{ __html: middleHtml }} />;
      }
      case "latestGrid": {
        const showLatestNews = hmCorporateLatestNewsEnabled !== false;
        const showDevelopments = hmCorporateLatestDevelopmentsEnabled !== false;
        const showSidebarInfo = hmCorporateSidebarInfoEnabled !== false;
        const showSidebar = showDevelopments || showSidebarInfo;
        if (!showLatestNews && !showSidebar) return null;

        const sidebarStack = showSidebar ? (
          <div className="vkv-sidebar-stack">
            {showDevelopments ? (
              <PopularSidebar popular={popular} accent={accent} hmCategoryColors={hmCategoryColors} />
            ) : null}
            {showSidebarInfo ? (
              <>
                <div className="vkv-sb">
                  <blockquote>
                    "{siteDescription}"
                    <cite>{siteDisplayName}</cite>
                  </blockquote>
                </div>
                <div className="vkv-side-links">
                  <Link href={h("/kunye")}>Künye</Link>
                  <Link href={h("/iletisim")}>İletişim</Link>
                  <Link href={h("/reklam")}>Reklam</Link>
                  <Link href={h("/abonelik")}>Abonelik</Link>
                </div>
              </>
            ) : null}
          </div>
        ) : null;

        if (showLatestNews && showSidebar) {
          return (
            <HmSidebarBalancedGrid
              enabled
              className="vkv-content-grid vkv-content-grid--latest"
              mainClassName="min-w-0"
              sidebarClassName="min-w-0 vkv-sidebar-stack-col"
              items={continuationNewsItems}
              columnsPerRow={4}
              fixedVisibleCount={HM_HOME_LATEST_BAND_ITEM_COUNT}
              mainHeader={
                embedSehitInLatestGrid ? (
                  <HmSehitSearchModule variant="home" layout="sidebarMain" />
                ) : null
              }
              mainFooter={null}
              renderItems={(visible) => (
                <section className="vkv-latest">
                  <HmRssNewsBand
                    title={latestTitle}
                    titleHref={tumHaberlerHref}
                    items={visible}
                    tabSourceItems={latestList}
                    categoryTabs={categoryTabs ?? undefined}
                    initialCategorySlug={latestGridOpeningSlug}
                    accent={accent}
                    hmCategoryColors={hmCategoryColors}
                    pending={latestPending}
                    error={latestError}
                    moreHref={tumHaberlerHref}
                    moreLabel="Tüm Haberler"
                    loadMoreMode="inline"
                    categoriesHref={tumHaberlerHref}
                    allNewsHref={sonDakikaHref}
                    maxVisibleItems={HM_HOME_LATEST_BAND_ITEM_COUNT}
                    categoryQuerySiteId={null}
                    gridColumns={4}
                    className="vkv-latest-band"
                  />
                </section>
              )}
              sidebar={sidebarStack}
            />
          );
        }

        return (
          <div className="vkv-content-grid">
            {showLatestNews ? (
              <section className="vkv-latest">
                <HmRssNewsBand
                  title={latestTitle}
                  titleHref={tumHaberlerHref}
                  items={continuationNewsItems.slice(0, HM_HOME_LATEST_BAND_ITEM_COUNT)}
                  tabSourceItems={latestList}
                  categoryTabs={categoryTabs ?? undefined}
                  initialCategorySlug={latestGridOpeningSlug}
                  accent={accent}
                  hmCategoryColors={hmCategoryColors}
                  pending={latestPending}
                  error={latestError}
                  moreHref={tumHaberlerHref}
                  moreLabel="Tüm Haberler"
                  loadMoreMode="inline"
                  categoriesHref={tumHaberlerHref}
                  allNewsHref={sonDakikaHref}
                  maxVisibleItems={HM_HOME_LATEST_BAND_ITEM_COUNT}
                  categoryQuerySiteId={null}
                  gridColumns={4}
                  className="vkv-latest-band"
                />
              </section>
            ) : null}
            {sidebarStack}
          </div>
        );
      }
      case "heritageInfo":
        if (hmCorporateWarsSectionEnabled !== true && hmCorporateNationalDaysSectionEnabled !== true) return null;
        return (
          <CorporateInfoSections
            showWars={hmCorporateWarsSectionEnabled === true}
            showNationalDays={hmCorporateNationalDaysSectionEnabled === true}
            warsHref={hmCorporateWarsSectionHref}
            nationalDaysHref={hmCorporateNationalDaysSectionHref}
          />
        );
      case "sehitSearch":
        if (embedSehitInLatestGrid) return null;
        return hmSehitSearchEnabled === true ? <HmSehitSearchModule variant="home" /> : null;
      case "donationSupport":
        return isHmDonationActive(corporateDonation) ? <HmCorporateDonationBand donation={corporateDonation!} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="hm-vitrin-home vkv-corporate-home">
      {orderedModules.map((moduleId) => (
        <Fragment key={moduleId}>{renderModule(moduleId)}</Fragment>
      ))}
      {showFallbackDonation && corporateDonation ? <HmCorporateDonationBand donation={corporateDonation} /> : null}
    </div>
  );
}
