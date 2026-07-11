import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearch } from "wouter";
import {
  BookOpen,
  ChevronRight,
  Clock,
  CloudSun,
  ExternalLink,
  Image as ImageIcon,
  Play,
  Search,
  Sparkles,
  Star,
  Video,
} from "lucide-react";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { buildKonumaGoreHref } from "@/lib/konumaGoreUtils";
import { buildUnifiedSearchHref, resolveUnifiedSearchBasePath } from "@/lib/hmUnifiedSearchPath";
import { buildSariSayfalarListPath } from "@/lib/sariSayfalarUtils";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";
import { useHomepageDayNightTheme } from "@/hooks/useHomepageDayNightTheme";
import { useSearchAiTabSummary } from "@/hooks/useSearchAiTabSummary";
import { SearchEngineHeader } from "@/components/SearchEngineHeader";
import { SearchEngineFooter } from "@/components/SearchEngineFooter";
import { SearchEngineSearchForm } from "@/components/SearchEngineSearchForm";
import { SearchEngineSubNavStack } from "@/components/SearchEngineSubNavStack";
import {
  isCityLocationHeroQuery,
  isLandmarkLocationContext,
  type SearchLocationContext,
} from "@/components/search/SearchLocationRightPanel";
import {
  SearchResultsRightPanel,
  type CityQuickFacts,
} from "@/components/search/SearchResultsRightPanel";
import { HaritalarTab } from "@/components/search/HaritalarTab";
import type { HaritalarSearchItem } from "@/components/search/haritalarSearchBuckets";
import { rewriteHaritalarPathToMap } from "@/lib/haritalarNav";
import { pushRecentSearch } from "@/hooks/useSearchSuggestions.ts";
import "@/styles/unifiedSearchResults.css";
import "@/styles/searchSuggest.css";
import "@/styles/homepageTheme.css";
import "@/styles/searchEngineHeader.css";

const API = "/api";
const ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://yekpare.net";

type SearchTabKey =
  | "all"
  | "ai"
  | "gorsel"
  | "video"
  | "gundem"
  | "haritalar"
  | "alisveris";

const SEARCH_TABS: Array<{ key: SearchTabKey; label: string }> = [
  { key: "all", label: "Arama" },
  { key: "ai", label: "Yekpare AI" },
  { key: "gorsel", label: "Görsel" },
  { key: "video", label: "Video" },
  { key: "gundem", label: "Gündem" },
  { key: "haritalar", label: "Haritalar" },
  { key: "alisveris", label: "Alışveriş" },
];

type HeroFilterMode = "default" | "panel" | "search";

const HERO_FILTERS: Array<{ key: string; label: string; mode: HeroFilterMode }> = [
  { key: "genel", label: "Genel", mode: "default" },
  { key: "rehber", label: "Şehir rehberi", mode: "panel" },
  { key: "bilgi", label: "Şehir bilgi", mode: "panel" },
  { key: "siparis", label: "Sipariş", mode: "panel" },
  { key: "gezilecek", label: "Gezilecek yerler", mode: "search" },
  { key: "oteller", label: "Oteller", mode: "search" },
  { key: "restoranlar", label: "Restoranlar", mode: "search" },
  { key: "biletler", label: "Biletler", mode: "search" },
  { key: "hava", label: "Hava durumu", mode: "search" },
];

type SearchItem = {
  id: string;
  name: string;
  slug?: string | null;
  resultType?: string;
  typeLabel?: string;
  href: string;
  address?: string | null;
  city?: string | null;
  description?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
  categoryName?: string | null;
  price?: number | null;
  subtitle?: string | null;
  storeType?: string | null;
  hmSiteName?: string | null;
  hmSiteSlug?: string | null;
  hasPublicProfile?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

type SearchSection = {
  key: string;
  title: string;
  total: number;
  seeAllHref: string;
  items: SearchItem[];
};

type MapPreview = {
  latitude: number;
  longitude: number;
  label: string;
  href: string;
  zoom?: number;
} | null;

type RelatedSearch = { query: string; href: string };

type GalleryImageItem = {
  id: string;
  imageUrl: string;
  title?: string | null;
  pageUrl?: string | null;
  source: string;
  origin: "yekpare" | "web";
};

type ExternalVideoItem = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  source: string;
  duration: string | null;
  publisher: string | null;
};

type UnifiedSearchResponse = {
  success?: boolean;
  query?: string;
  sections?: SearchSection[];
  totalResults?: number;
  aiSummary?: string | null;
  aiModel?: string | null;
  internetSearchEnabled?: boolean;
  searchMeta?: {
    ai?: { detail?: string; timedOut?: boolean };
    elapsedMs?: number;
    media?: { imageCount?: number; videoCount?: number; source?: string };
  };
  mapPreview?: MapPreview;
  locationContext?: SearchLocationContext | null;
  aiGalleryImages?: string[];
  externalImages?: Array<{
    id: string;
    imageUrl: string;
    thumbnailUrl: string;
    title: string | null;
    pageUrl: string | null;
    source: string;
  }>;
  externalVideos?: ExternalVideoItem[];
  relatedSearches?: RelatedSearch[];
  cityQuickFacts?: CityQuickFacts | null;
};

function sectionItems(sections: SearchSection[], key: string): SearchItem[] {
  return sections.find((s) => s.key === key)?.items ?? [];
}

function toHaritalarItem(item: SearchItem): HaritalarSearchItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    resultType: item.resultType,
    typeLabel: item.typeLabel,
    href: rewriteHaritalarPathToMap(item.href),
    address: item.address,
    city: item.city,
    description: item.description,
    rating: item.rating,
    userRatingsTotal: item.userRatingsTotal,
    photoUrl: item.photoUrl,
    coverPhotoUrl: item.coverPhotoUrl,
    categoryName: item.categoryName,
    price: item.price,
    subtitle: item.subtitle,
    storeType: item.storeType,
    latitude: item.latitude,
    longitude: item.longitude,
  };
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function mapEmbedUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.04}%2C${lat - 0.03}%2C${lng + 0.04}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function formatPrice(value: number | null | undefined): string | null {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}

function tourismCta(storeType?: string | null): string {
  const t = String(storeType ?? "").toLowerCase();
  if (t === "hotel" || t === "villa" || t === "space") return "Odaları Gör";
  if (t === "tour" || t === "boat") return "Hemen Ayır";
  if (t === "car") return "Rezervasyon Yap";
  return "Rezervasyon Yap";
}

function ResultLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function OrganicResultItem({ item, siteLabel }: { item: SearchItem; siteLabel?: string }) {
  const url = isExternalHref(item.href)
    ? item.href
    : `${ORIGIN}${item.href.startsWith("/") ? item.href : `/${item.href}`}`;
  const label = siteLabel ?? item.typeLabel ?? item.categoryName ?? "Yekpare";

  return (
    <article className="usr-organic-item">
      <div className="usr-organic-site">{label}</div>
      <ResultLink href={item.href} className="usr-organic-title">
        {item.name}
        {isExternalHref(item.href) ? (
          <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-60" aria-hidden />
        ) : null}
      </ResultLink>
      <div className="usr-organic-url">{url}</div>
      {item.description ? <p className="usr-organic-snippet">{item.description}</p> : null}
    </article>
  );
}

function WikiOrganicItem({ item }: { item: SearchItem }) {
  const img = item.coverPhotoUrl ?? item.photoUrl;
  return (
    <article className="usr-wiki-organic yekpare-home-glass">
      <div className="usr-wiki-organic-row">
        {img ? (
          <div className="usr-wiki-organic-thumb">
            <img src={img} alt="" loading="lazy" />
          </div>
        ) : null}
        <div className="usr-wiki-organic-body">
          <span className="usr-service-badge">
            <BookOpen className="h-3 w-3" aria-hidden />
            Bilgi Ağacı
          </span>
          <ResultLink href={item.href} className="usr-organic-title">
            {item.name}
          </ResultLink>
          {item.description ? <p className="usr-organic-snippet">{item.description}</p> : null}
        </div>
      </div>
    </article>
  );
}

function ImageGridSection({
  images,
  query,
  emptyHint,
  loading,
}: {
  images: GalleryImageItem[];
  query: string;
  emptyHint?: string;
  loading?: boolean;
}) {
  if (!images.length) {
    if (!query.trim()) return null;
    if (loading) {
      return (
        <section className="usr-section" aria-label="Görseller">
          <div className="usr-section-head">
            <ImageIcon className="h-5 w-5" style={{ color: "var(--usr-accent)" }} />
            <h2>Görsel</h2>
          </div>
          <div className="usr-web-hint yekpare-home-glass">
            <ImageIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <p>Web görselleri yükleniyor…</p>
          </div>
        </section>
      );
    }
    return (
      <section className="usr-section" aria-label="Görseller">
        <div className="usr-section-head">
          <ImageIcon className="h-5 w-5" style={{ color: "var(--usr-accent)" }} />
          <h2>Görsel</h2>
        </div>
        <div className="usr-web-hint yekpare-home-glass">
          <ImageIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          <p>{emptyHint ?? "Bu sorgu için görsel bulunamadı. Site ve web araması sonuçları birleştirilir."}</p>
        </div>
      </section>
    );
  }
  const visible = images.slice(0, 24);
  return (
    <section className="usr-section" aria-label="Görseller">
      <div className="usr-section-head">
        <ImageIcon className="h-5 w-5" style={{ color: "var(--usr-accent)" }} />
        <h2>Görsel</h2>
      </div>
      <div className="usr-image-grid yekpare-home-glass">
        {visible.map((item) => {
          const cell = (
            <>
              <img src={item.imageUrl} alt={item.title ?? ""} loading="lazy" />
              <span className="usr-image-grid-source">{item.source}</span>
            </>
          );
          const href = item.pageUrl ?? item.imageUrl;
          return (
            <div key={item.id} className="usr-image-grid-cell">
              {item.origin === "web" && href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="usr-image-grid-link">
                  {cell}
                </a>
              ) : (
                cell
              )}
            </div>
          );
        })}
      </div>
      {images.length > visible.length ? (
        <p className="usr-image-grid-more text-sm opacity-70">
          {images.length.toLocaleString("tr-TR")} görsel — Yekpare + web kaynakları
        </p>
      ) : null}
    </section>
  );
}

function RelatedSearchesSection({ items }: { items: RelatedSearch[] }) {
  if (!items.length) return null;
  return (
    <section className="usr-section" aria-label="Arananlar">
      <div className="usr-section-head">
        <Search className="h-5 w-5" style={{ color: "var(--usr-accent)" }} />
        <h2>Arananlar</h2>
      </div>
      <div className="usr-related-grid">
        {items.map((item) => (
          <Link key={item.query} href={item.href} className="usr-related-pill">
            <Search className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            {item.query}
          </Link>
        ))}
      </div>
    </section>
  );
}

function AiSummaryMainCard({ summary }: { summary: string }) {
  return (
    <section
      id="yekpare-ai-summary"
      className="usr-ai-card yekpare-home-glass"
      aria-label="Yekpare AI özeti"
    >
      <div className="usr-section-head">
        <Sparkles className="h-5 w-5" style={{ color: "var(--usr-accent)" }} aria-hidden />
        <h2>Yekpare AI</h2>
        <span className="usr-ai-model-badge">Yerli model</span>
      </div>
      <p className="usr-ai-summary-text">{summary}</p>
    </section>
  );
}

function formatInternetSearchDetail(detail: string | null | undefined): string | null {
  const raw = String(detail ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429")) {
    if (lower.includes("duckduckgo") || lower.includes("yedek kaynaktan")) return raw;
    return "Gemini API kota limiti aşıldı. Google AI Studio faturalandırmasını kontrol edin veya bir süre sonra tekrar deneyin.";
  }
  if (raw.length > 240) return `${raw.slice(0, 237)}…`;
  return raw;
}

function WebSourcesSection({
  items,
  internetSearchEnabled,
  loading,
  aiDetail,
}: {
  items: SearchItem[];
  internetSearchEnabled: boolean;
  loading: boolean;
  aiDetail?: string | null;
}) {
  const hintDetail = formatInternetSearchDetail(aiDetail);
  if (items.length > 0) {
    return (
      <section className="usr-section" aria-label="Ek Kaynaklar">
        <div className="usr-section-head">
          <ExternalLink className="h-5 w-5" style={{ color: "var(--usr-accent)" }} />
          <h2>Ek Kaynaklar</h2>
        </div>
        <div className="usr-external-list yekpare-home-glass">
          {items.map((item) => (
            <OrganicResultItem key={item.id} item={item} siteLabel="Web" />
          ))}
        </div>
      </section>
    );
  }

  if (loading) return null;

  if (!internetSearchEnabled) {
    return (
      <section className="usr-section" aria-label="Web araması">
        <div className="usr-section-head">
          <ExternalLink className="h-5 w-5" style={{ color: "var(--usr-accent)" }} />
          <h2>Ek Kaynaklar</h2>
        </div>
        <div className="usr-web-hint yekpare-home-glass">
          <ExternalLink className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          <p>
            Web araması yapılandırılmamış. Yönetim panelinden{" "}
            <Link href="/admin/ayarlar?tab=entegrasyon#gemini-api-key">Gemini API anahtarı</Link>{" "}
            ekleyerek internet sonuçlarını etkinleştirebilirsiniz.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="usr-section" aria-label="Ek Kaynaklar">
      <div className="usr-section-head">
        <ExternalLink className="h-5 w-5" style={{ color: "var(--usr-accent)" }} />
        <h2>Ek Kaynaklar</h2>
      </div>
      <div className="usr-web-hint yekpare-home-glass">
        <ExternalLink className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        <p>
          Web araması etkin ancak bu sorgu için kaynak bulunamadı.
          {hintDetail ? ` ${hintDetail}` : " Birkaç saniye sonra tekrar deneyin veya farklı bir arama yapın."}
        </p>
      </div>
    </section>
  );
}

function TimeWidget() {
  const now = new Date();
  const time = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  const date = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

  return (
    <div className="usr-hero-widget usr-hero-time yekpare-home-glass">
      <div className="usr-hero-widget-head">
        <Clock className="h-4 w-4" aria-hidden />
        <span>Zaman</span>
      </div>
      <p className="usr-hero-widget-value">{time}</p>
      <p className="usr-hero-widget-sub">{date}</p>
    </div>
  );
}

type HeroCityLinks = {
  rehberHref: string;
  bilgiHref: string;
  siparisHref: string;
};

function resolveCityActionLinks(input: {
  cityName: string;
  lat?: number | null;
  lng?: number | null;
  wikiHref?: string | null;
}): HeroCityLinks {
  const cityName = input.cityName.trim();
  return {
    rehberHref: buildSariSayfalarListPath({ city: cityName }),
    bilgiHref: input.wikiHref ?? `/bilgiagaci/${wikiTitleToUrlSlug(cityName)}`,
    siparisHref: buildKonumaGoreHref({
      city: cityName,
      lat: input.lat ?? undefined,
      lng: input.lng ?? undefined,
      module: "food",
    }),
  };
}

function enrichCityLocationContext(
  context: SearchLocationContext,
  links: HeroCityLinks,
): SearchLocationContext {
  return {
    ...context,
    cityGuideHref: links.rehberHref,
    cityOrderHref: links.siparisHref,
    wiki: context.wiki
      ? { ...context.wiki, href: links.bilgiHref }
      : {
          title: context.city?.name ?? context.label,
          href: links.bilgiHref,
        },
  };
}

function HeroFilterPanel({
  filterKey,
  cityName,
  links,
  guideItems,
  wikiItem,
  orderItems,
}: {
  filterKey: string;
  cityName: string;
  links: HeroCityLinks;
  guideItems: SearchItem[];
  wikiItem: SearchItem | null;
  orderItems: SearchItem[];
}) {
  if (filterKey === "rehber") {
    return (
      <div className="usr-hero-panel" role="tabpanel" aria-label="Şehir rehberi">
        <p className="usr-hero-panel-lead">
          {cityName} için işletme rehberi, kategoriler ve yerel vitrinler.
        </p>
        {guideItems.length > 0 ? (
          <ul className="usr-hero-panel-list">
            {guideItems.slice(0, 5).map((item) => (
              <li key={item.id}>
                <ResultLink href={item.href} className="usr-hero-panel-link">
                  {item.name}
                </ResultLink>
                {item.categoryName ? <span className="usr-hero-panel-meta">{item.categoryName}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="usr-hero-panel-empty">Bu şehir için rehber kayıtları listeleniyor.</p>
        )}
        <Link href={links.rehberHref} className="usr-service-cta">
          {cityName} şehir rehberine git
        </Link>
      </div>
    );
  }

  if (filterKey === "bilgi") {
    const img = wikiItem?.coverPhotoUrl ?? wikiItem?.photoUrl;
    return (
      <div className="usr-hero-panel" role="tabpanel" aria-label="Şehir bilgi">
        {wikiItem ? (
          <div className="usr-hero-panel-wiki">
            {img ? (
              <div className="usr-hero-panel-wiki-thumb">
                <img src={img} alt="" loading="lazy" />
              </div>
            ) : null}
            <div>
              <h3 className="usr-hero-panel-title">{wikiItem.name}</h3>
              {wikiItem.description ? (
                <p className="usr-hero-panel-desc">{wikiItem.description}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="usr-hero-panel-empty">{cityName} hakkında ansiklopedi özeti yükleniyor.</p>
        )}
        <Link href={links.bilgiHref} className="usr-service-cta">
          Bilgi Ağacı'nda oku
        </Link>
      </div>
    );
  }

  if (filterKey === "siparis") {
    return (
      <div className="usr-hero-panel" role="tabpanel" aria-label="Sipariş">
        <p className="usr-hero-panel-lead">
          {cityName} bölgesinde yemek, market ve yerel işletmelerden sipariş verin.
        </p>
        {orderItems.length > 0 ? (
          <ul className="usr-hero-panel-list">
            {orderItems.slice(0, 5).map((item) => (
              <li key={item.id}>
                <ResultLink href={item.href} className="usr-hero-panel-link">
                  {item.name}
                </ResultLink>
                {item.typeLabel || item.categoryName ? (
                  <span className="usr-hero-panel-meta">{item.typeLabel ?? item.categoryName}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="usr-hero-panel-empty">Yakındaki sipariş verilebilir işletmeler listeleniyor.</p>
        )}
        <div className="usr-hero-panel-actions">
          <Link href={links.siparisHref} className="usr-service-cta">
            Sipariş ver
          </Link>
          <Link href={`/siparis?sehir=${encodeURIComponent(cityName)}`} className="usr-service-cta secondary">
            Sipariş vitrini
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

function HeroBlock({
  title,
  subtitle,
  mapPreview,
  galleryImages,
  activeFilter,
  cityLinks,
  guideItems,
  wikiItem,
  orderItems,
  onFilter,
  onFilterSearch,
}: {
  title: string;
  subtitle: ReactNode;
  mapPreview: MapPreview;
  galleryImages: string[];
  activeFilter: string;
  cityLinks: HeroCityLinks;
  guideItems: SearchItem[];
  wikiItem: SearchItem | null;
  orderItems: SearchItem[];
  onFilter: (key: string) => void;
  onFilterSearch: (q: string) => void;
}) {
  const gallery = galleryImages.slice(0, 3);
  const activeMeta = HERO_FILTERS.find((f) => f.key === activeFilter);
  const showPanel = activeMeta?.mode === "panel";

  return (
    <section className="usr-hero yekpare-home-glass" aria-label="Konum özeti">
      <div className="usr-hero-head">
        <h1 className="usr-hero-title">{title}</h1>
        <p className="usr-hero-subtitle">{subtitle}</p>
      </div>

      <div className="usr-hero-filters" role="tablist" aria-label="Sonuç filtreleri">
        {HERO_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={activeFilter === f.key}
            className={`usr-hero-filter${activeFilter === f.key ? " active" : ""}`}
            onClick={() => {
              onFilter(f.key);
              if (f.mode === "search") onFilterSearch(`${title} ${f.label.toLocaleLowerCase("tr-TR")}`);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {showPanel ? (
        <HeroFilterPanel
          filterKey={activeFilter}
          cityName={title}
          links={cityLinks}
          guideItems={guideItems}
          wikiItem={wikiItem}
          orderItems={orderItems}
        />
      ) : (
        <div className="usr-hero-visual-row">
          {mapPreview ? (
            <div className="usr-hero-map">
              <iframe
                title={`${mapPreview.label} harita`}
                src={mapEmbedUrl(mapPreview.latitude, mapPreview.longitude)}
                className="usr-map-embed"
                loading="lazy"
              />
              <Link href={rewriteHaritalarPathToMap(mapPreview.href)} className="usr-hero-map-link">
                Haritada aç
              </Link>
            </div>
          ) : null}

          {gallery.length > 0 ? (
            <div className="usr-hero-gallery">
              {gallery.map((src, i) => (
                <div key={`${src}-${i}`} className="usr-hero-gallery-cell">
                  <img src={src} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          ) : null}

          <div className="usr-hero-widgets">
            <div className="usr-hero-widget usr-hero-weather yekpare-home-glass">
              <div className="usr-hero-widget-head">
                <CloudSun className="h-4 w-4" aria-hidden />
                <span>Hava durumu</span>
              </div>
              <p className="usr-hero-widget-value">—</p>
              <p className="usr-hero-widget-sub">Yakında</p>
            </div>
            <TimeWidget />
          </div>
        </div>
      )}
    </section>
  );
}

function ServiceCard({ item, badge, cta }: { item: SearchItem; badge?: string; cta?: string }) {
  const img = item.coverPhotoUrl ?? item.photoUrl;
  const priceLabel = formatPrice(item.price);

  return (
    <article className="usr-service-card yekpare-home-glass">
      {badge ? <span className="usr-service-badge">{badge}</span> : null}
      {img ? (
        <div className="usr-service-media">
          <img src={img} alt="" loading="lazy" />
        </div>
      ) : null}
      <div className="usr-service-body">
        <h3 className="usr-service-title">
          <ResultLink href={item.href}>{item.name}</ResultLink>
        </h3>
        {item.subtitle || item.description ? (
          <p className="usr-service-desc">{item.subtitle ?? item.description}</p>
        ) : null}
        <div className="usr-service-meta">
          {item.rating ? (
            <span className="usr-service-rating">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {Number(item.rating).toFixed(1)}
            </span>
          ) : null}
          {priceLabel ? <span className="usr-service-price">{priceLabel}</span> : null}
        </div>
        {cta ? (
          <ResultLink href={item.href} className="usr-service-cta">
            {cta}
          </ResultLink>
        ) : null}
      </div>
    </article>
  );
}

function isExternalVideoItem(item: SearchItem | ExternalVideoItem): item is ExternalVideoItem {
  return "videoUrl" in item;
}

function externalVideoMetaLine(item: ExternalVideoItem): string | null {
  return [item.duration, item.publisher].filter(Boolean).join(" · ") || null;
}

function externalVideoSourceLabel(item: ExternalVideoItem): string {
  return item.publisher ?? item.source ?? "Web";
}

function VideoCard({
  item,
  sourceLabel = "YekTube",
  external = false,
}: {
  item: SearchItem | ExternalVideoItem;
  sourceLabel?: string;
  external?: boolean;
}) {
  const thumb = isExternalVideoItem(item)
    ? item.thumbnailUrl
    : item.coverPhotoUrl ?? item.photoUrl;
  const href = isExternalVideoItem(item) ? item.videoUrl : item.href;
  const title = isExternalVideoItem(item) ? item.title : item.name;
  const subtitle = isExternalVideoItem(item) ? externalVideoMetaLine(item) : item.subtitle ?? null;

  const thumbBlock = (
    <>
      {thumb ? <img src={thumb} alt="" className="usr-video-thumb" loading="lazy" /> : null}
      <span className="usr-video-play" aria-hidden>
        <Play className="h-6 w-6 fill-current" />
      </span>
    </>
  );

  return (
    <article className="usr-service-card usr-video-card yekpare-home-glass">
      <span className="usr-service-badge">
        <Video className="h-3 w-3" aria-hidden />
        {sourceLabel}
      </span>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="usr-video-thumb-wrap">
          {thumbBlock}
        </a>
      ) : (
        <Link href={href} className="usr-video-thumb-wrap">
          {thumbBlock}
        </Link>
      )}
      <div className="usr-service-body">
        <h3 className="usr-service-title">
          {external ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {title}
            </a>
          ) : (
            <Link href={href}>{title}</Link>
          )}
        </h3>
        {subtitle ? <p className="usr-service-desc">{subtitle}</p> : null}
      </div>
    </article>
  );
}

export type UnifiedSearchResultsPageProps = {
  /** Editör haber sitesi: Yekpare üst/alt chrome yok; site header/footer dışarıdan gelir. */
  embedInHmSite?: boolean;
};

function SearchTabsNav({
  activeTab,
  onTab,
}: {
  activeTab: SearchTabKey;
  onTab: (tab: SearchTabKey) => void;
}) {
  return (
    <nav className="usr-tabs" aria-label="Arama türleri">
      {SEARCH_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`usr-tab${activeTab === tab.key ? " active" : ""}`}
          aria-current={activeTab === tab.key ? "page" : undefined}
          onClick={() => onTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export default function UnifiedSearchResultsPage({ embedInHmSite = false }: UnifiedSearchResultsPageProps) {
  const search = useSearch();
  const params = useMemo(() => {
    const raw =
      search.trim() ||
      (typeof window !== "undefined" ? window.location.search : "");
    const query = raw.startsWith("?") ? raw.slice(1) : raw;
    return new URLSearchParams(query);
  }, [search]);
  const initialQ = params.get("q") ?? "";
  const initialCity = params.get("city") ?? "";
  const initialTab = (params.get("tab") as SearchTabKey | null) ?? "all";
  const fromAi = params.get("ai") === "1";

  const [queryInput, setQueryInput] = useState(initialQ);
  const [appliedQuery, setAppliedQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<SearchTabKey>(
    SEARCH_TABS.some((t) => t.key === initialTab) ? initialTab : "all",
  );
  const [heroFilter, setHeroFilter] = useState("genel");
  const [city] = useState(initialCity);
  const [sections, setSections] = useState<SearchSection[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [internetSearchEnabled, setInternetSearchEnabled] = useState(false);
  const [internetSearchDetail, setInternetSearchDetail] = useState<string | null>(null);
  const [mapPreview, setMapPreview] = useState<MapPreview>(null);
  const [locationContext, setLocationContext] = useState<SearchLocationContext | null>(null);
  const [aiGalleryImages, setAiGalleryImages] = useState<string[]>([]);
  const [externalImages, setExternalImages] = useState<UnifiedSearchResponse["externalImages"]>([]);
  const [externalVideos, setExternalVideos] = useState<ExternalVideoItem[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [cityQuickFacts, setCityQuickFacts] = useState<CityQuickFacts | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaAttemptRef = useRef("");
  const { theme: homeTheme } = useHomepageDayNightTheme();

  const loadExternalMedia = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setMediaLoading(true);
    try {
      const { ok, data } = await fetchPublicJson<{
        success?: boolean;
        images?: NonNullable<UnifiedSearchResponse["externalImages"]>;
        videos?: ExternalVideoItem[];
      }>(`${API}/search/media?q=${encodeURIComponent(trimmed)}`);
      if (!ok || !data?.success) return;
      const images = Array.isArray(data.images) ? data.images : [];
      const videos = Array.isArray(data.videos) ? data.videos : [];
      if (images.length) setExternalImages(images);
      if (videos.length) setExternalVideos(videos);
      if (images.length || videos.length) setInternetSearchEnabled(true);
    } catch {
      /* yedek medya isteği sessizce atlanır */
    } finally {
      setMediaLoading(false);
    }
  }, []);

  const loadResults = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSections([]);
      setTotalResults(0);
      setAiSummary(null);
      setInternetSearchEnabled(false);
      setInternetSearchDetail(null);
      setMapPreview(null);
      setLocationContext(null);
      setAiGalleryImages([]);
      setExternalImages([]);
      setExternalVideos([]);
      setRelatedSearches([]);
      setCityQuickFacts(null);
      mediaAttemptRef.current = "";
      return;
    }
    mediaAttemptRef.current = "";
    setLoading(true);
    setError(null);
    try {
      const urlParams = new URLSearchParams({ q: trimmed, perSection: "50" });
      if (city) urlParams.set("city", city);
      const { ok, data } = await fetchPublicJson<UnifiedSearchResponse>(`${API}/search/unified?${urlParams}`);
      if (!ok || !data?.success) {
        setError("Arama sonuçları yüklenemedi.");
        return;
      }
      setSections(Array.isArray(data.sections) ? data.sections : []);
      setTotalResults(typeof data.totalResults === "number" ? data.totalResults : 0);
      setAiSummary(typeof data.aiSummary === "string" ? data.aiSummary : null);
      setInternetSearchEnabled(data.internetSearchEnabled === true);
      setInternetSearchDetail(
        typeof data.searchMeta?.ai?.detail === "string" ? data.searchMeta.ai.detail : null,
      );
      setMapPreview(data.mapPreview ?? null);
      setLocationContext(data.locationContext ?? null);
      setAiGalleryImages(Array.isArray(data.aiGalleryImages) ? data.aiGalleryImages.filter(Boolean) : []);
      setExternalImages(Array.isArray(data.externalImages) ? data.externalImages : []);
      setExternalVideos(Array.isArray(data.externalVideos) ? data.externalVideos : []);
      setRelatedSearches(Array.isArray(data.relatedSearches) ? data.relatedSearches : []);
      setCityQuickFacts(data.cityQuickFacts ?? null);

      const extImgCount = Array.isArray(data.externalImages) ? data.externalImages.length : 0;
      const extVidCount = Array.isArray(data.externalVideos) ? data.externalVideos.length : 0;
      if (extImgCount === 0 && extVidCount === 0) {
        mediaAttemptRef.current = `${trimmed}::unified-fallback`;
        void loadExternalMedia(trimmed);
      }
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }, [city, loadExternalMedia]);

  useEffect(() => {
    const q = appliedQuery.trim();
    if (!q || loading || mediaLoading) return;
    const needsImages = activeTab === "gorsel" && !(externalImages?.length ?? 0);
    const needsVideos = activeTab === "video" && !externalVideos.length;
    if (!needsImages && !needsVideos) return;
    const attemptKey = `${q}::${activeTab}`;
    if (mediaAttemptRef.current === attemptKey) return;
    mediaAttemptRef.current = attemptKey;
    void loadExternalMedia(q);
  }, [activeTab, appliedQuery, externalImages?.length, externalVideos.length, loadExternalMedia, loading, mediaLoading]);

  useEffect(() => {
    const q = params.get("q") ?? "";
    const tab = (params.get("tab") as SearchTabKey | null) ?? "all";
    setQueryInput(q);
    setAppliedQuery(q);
    setActiveTab(SEARCH_TABS.some((t) => t.key === tab) ? tab : "all");
    setHeroFilter("genel");
    void loadResults(q);
  }, [params, loadResults]);

  const tourismItems = useMemo(() => sectionItems(sections, "seyahat"), [sections]);
  const yektubeItems = useMemo(() => sectionItems(sections, "yektube"), [sections]);
  const hmItems = useMemo(() => sectionItems(sections, "hm_bagli_siteler"), [sections]);
  const cityItems = useMemo(() => sectionItems(sections, "sehir"), [sections]);
  const wikiItems = useMemo(() => sectionItems(sections, "bilgi_agaci"), [sections]);
  const internetItems = useMemo(() => sectionItems(sections, "internet"), [sections]);
  const newsItems = useMemo(() => sectionItems(sections, "haberler"), [sections]);
  const mapItems = useMemo(() => sectionItems(sections, "haritalar"), [sections]);
  const sariSayfalarItems = useMemo(() => sectionItems(sections, "sari_sayfalar"), [sections]);
  const hizmetItems = useMemo(() => sectionItems(sections, "hizmetler"), [sections]);
  const otomotivItems = useMemo(() => sectionItems(sections, "otomotiv"), [sections]);
  const urunlerItems = useMemo(() => sectionItems(sections, "urunler"), [sections]);
  const yemekMarketItems = useMemo(() => sectionItems(sections, "yemek_market"), [sections]);
  const shopItems = useMemo(
    () => [...urunlerItems, ...yemekMarketItems],
    [urunlerItems, yemekMarketItems],
  );

  const galleryImageItems = useMemo(() => {
    const items: GalleryImageItem[] = [];
    const seen = new Set<string>();
    const push = (entry: GalleryImageItem) => {
      const url = String(entry.imageUrl ?? "").trim();
      if (!url || seen.has(url)) return;
      seen.add(url);
      items.push(entry);
    };

    for (const item of externalImages ?? []) {
      push({
        id: item.id,
        imageUrl: item.thumbnailUrl || item.imageUrl,
        title: item.title,
        pageUrl: item.pageUrl,
        source: item.source || "Web",
        origin: "web",
      });
    }

    for (const url of aiGalleryImages) {
      push({
        id: `site-gallery-${items.length + 1}`,
        imageUrl: url,
        source: "Yekpare",
        origin: "yekpare",
      });
    }

    for (const item of sections.flatMap((s) => s.items)) {
      const url = String(item.coverPhotoUrl ?? item.photoUrl ?? "").trim();
      if (!url) continue;
      push({
        id: `site-${item.id}`,
        imageUrl: url,
        title: item.name,
        pageUrl: isExternalHref(item.href) ? item.href : `${ORIGIN}${item.href.startsWith("/") ? item.href : `/${item.href}`}`,
        source: item.typeLabel ?? item.categoryName ?? "Yekpare",
        origin: "yekpare",
      });
    }

    return items;
  }, [aiGalleryImages, externalImages, sections]);

  const galleryImageUrls = useMemo(
    () => galleryImageItems.map((item) => item.imageUrl),
    [galleryImageItems],
  );

  const hybridVideoItems = useMemo(() => {
    const siteItems: SearchItem[] = [...yektubeItems];
    const seen = new Set(siteItems.map((i) => i.id));
    for (const item of [...tourismItems, ...newsItems, ...hmItems]) {
      if (seen.has(item.id)) continue;
      if (!item.coverPhotoUrl && !item.photoUrl) continue;
      seen.add(item.id);
      siteItems.push(item);
    }
    return siteItems;
  }, [yektubeItems, tourismItems, newsItems, hmItems]);

  const hasApiAiSummary = Boolean(aiSummary?.trim());

  const tabAi = useSearchAiTabSummary({
    query: appliedQuery,
    active: activeTab === "ai" && Boolean(appliedQuery.trim()),
    existingSummary: hasApiAiSummary ? aiSummary : null,
  });

  const organicItems = useMemo(() => {
    const items: SearchItem[] = [];
    const seen = new Set<string>();
    const push = (list: SearchItem[]) => {
      for (const item of list) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    };
    push(mapItems);
    push(sariSayfalarItems);
    push(hizmetItems);
    push(otomotivItems);
    push(hmItems);
    push(newsItems);
    push(wikiItems.slice(1));
    return items;
  }, [mapItems, sariSayfalarItems, hizmetItems, otomotivItems, hmItems, newsItems, wikiItems]);

  const placesItems = useMemo(
    () => [...mapItems, ...tourismItems].filter((item) => item.photoUrl || item.coverPhotoUrl),
    [mapItems, tourismItems],
  );

  const applySearch = (nextQ?: string, nextTab?: SearchTabKey) => {
    const q = (nextQ ?? queryInput).trim();
    const tab = nextTab ?? activeTab;
    setQueryInput(q);
    setAppliedQuery(q);
    if (tab !== activeTab) setActiveTab(tab);
    if (q) pushRecentSearch(q);
    const nextParams = new URLSearchParams();
    if (q) nextParams.set("q", q);
    if (city) nextParams.set("city", city);
    if (tab !== "all") nextParams.set("tab", tab);
    const qs = nextParams.toString();
    const searchBase = resolveUnifiedSearchBasePath();
    window.history.replaceState(null, "", qs ? `${searchBase}?${qs}` : searchBase);
    void loadResults(q);
  };

  const setTab = (tab: SearchTabKey) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams();
    if (appliedQuery.trim()) nextParams.set("q", appliedQuery.trim());
    if (city) nextParams.set("city", city);
    if (tab !== "all") nextParams.set("tab", tab);
    const qs = nextParams.toString();
    const searchBase = resolveUnifiedSearchBasePath();
    window.history.replaceState(null, "", qs ? `${searchBase}?${qs}` : searchBase);
  };

  const isCityHeroQuery = isCityLocationHeroQuery({
    locationContext,
    cityCount: cityItems.length,
    cityQuickFacts,
  });

  const hasPartialResults =
    isCityHeroQuery ||
    Boolean(mapPreview) ||
    wikiItems.length > 0 ||
    internetItems.length > 0 ||
    mapItems.length > 0 ||
    sariSayfalarItems.length > 0 ||
    relatedSearches.length > 0 ||
    organicItems.length > 0 ||
    galleryImageItems.length > 0 ||
    externalVideos.length > 0;

  const toBusinessCard = (item: SearchItem) => ({
    id: item.id,
    name: item.name,
    href: item.href,
    photoUrl: item.photoUrl ?? null,
    coverPhotoUrl: item.coverPhotoUrl ?? null,
    address: item.address ?? null,
    city: item.city ?? null,
    categoryName: item.categoryName ?? null,
    rating: item.rating ?? null,
    userRatingsTotal: item.userRatingsTotal ?? null,
  });

  const effectiveLocationContext: SearchLocationContext | null = useMemo(() => {
    const enrichIfCity = (ctx: SearchLocationContext): SearchLocationContext => {
      if (!isCityHeroQuery) return ctx;
      const cityName = ctx.city?.name ?? ctx.label;
      const links = resolveCityActionLinks({
        cityName,
        lat: ctx.city?.latitude ?? mapPreview?.latitude ?? null,
        lng: ctx.city?.longitude ?? mapPreview?.longitude ?? null,
        wikiHref: ctx.wiki?.href ?? wikiItems[0]?.href ?? null,
      });
      return enrichCityLocationContext(ctx, links);
    };

    if (locationContext) {
      if (isCityHeroQuery) {
        return enrichIfCity({ ...locationContext, businesses: [] });
      }
      return locationContext;
    }

    if (isCityHeroQuery) {
      return enrichIfCity({
        locationIntent: true,
        label: mapPreview?.label ?? cityItems[0]?.name ?? appliedQuery,
        city: cityItems[0]
          ? {
              id: cityItems[0].id,
              name: cityItems[0].name,
              imageUrl: cityItems[0].coverPhotoUrl ?? cityItems[0].photoUrl ?? null,
              description: cityItems[0].description ?? null,
              href: cityItems[0].href,
            }
          : null,
        district: null,
        businesses: [],
        wiki: wikiItems[0]
          ? {
              title: wikiItems[0].name,
              description: wikiItems[0].description ?? null,
              imageUrl: wikiItems[0].coverPhotoUrl ?? wikiItems[0].photoUrl ?? null,
              href: wikiItems[0].href,
            }
          : null,
        mapPreview: mapPreview ?? undefined,
      });
    }

    const businessPool = [...mapItems, ...sariSayfalarItems, ...hizmetItems];
    const seenBiz = new Set<string>();
    const businesses = [];
    for (const item of businessPool) {
      const key = item.id.replace(/^map-pin-/, "");
      if (seenBiz.has(key)) continue;
      seenBiz.add(key);
      businesses.push(toBusinessCard(item));
      if (businesses.length >= 5) break;
    }

    const wiki = wikiItems[0]
      ? {
          title: wikiItems[0].name,
          description: wikiItems[0].description ?? null,
          imageUrl: wikiItems[0].coverPhotoUrl ?? wikiItems[0].photoUrl ?? null,
          href: wikiItems[0].href,
        }
      : null;

    if (!businesses.length && !wiki) return null;

    return {
      locationIntent: false,
      label: appliedQuery,
      city: null,
      district: null,
      businesses,
      wiki,
    };
  }, [
    locationContext,
    isCityHeroQuery,
    mapPreview,
    cityItems,
    mapItems,
    sariSayfalarItems,
    hizmetItems,
    wikiItems,
    appliedQuery,
  ]);

  const displayAiSummary =
    aiSummary?.trim() ||
    (appliedQuery.trim() && (totalResults > 0 || hasPartialResults)
      ? `"${appliedQuery.trim()}" için Yekpare veri tabanında ${Math.max(totalResults, organicItems.length + wikiItems.length).toLocaleString("tr-TR")} eşleşme bulundu.${fromAi ? " Yekpare AI aramanız genel arama sonuçlarına yönlendirildi." : ""}`
      : null) ||
    (appliedQuery.trim() && hasPartialResults
      ? `"${appliedQuery.trim()}" hakkında işletmeler, ansiklopedi ve web kaynakları aşağıda listeleniyor.`
      : null);

  useEffect(() => {
    if (!fromAi || typeof window === "undefined") return undefined;
    const scrollToAi = () => {
      const target =
        document.getElementById("yekpare-ai-summary") ??
        document.querySelector<HTMLElement>('[aria-label="Yekpare AI özeti"]');
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const t = window.setTimeout(scrollToAi, 320);
    return () => window.clearTimeout(t);
  }, [fromAi, displayAiSummary, loading]);

  const isLandmarkHero = isLandmarkLocationContext(effectiveLocationContext);
  const heroTitle = isLandmarkHero
    ? (effectiveLocationContext?.label ?? appliedQuery)
    : (effectiveLocationContext?.city?.name ?? effectiveLocationContext?.label ?? appliedQuery);
  const heroCityLinks = useMemo<HeroCityLinks>(
    () =>
      resolveCityActionLinks({
        cityName: heroTitle,
        lat: mapPreview?.latitude ?? effectiveLocationContext?.city?.latitude ?? null,
        lng: mapPreview?.longitude ?? effectiveLocationContext?.city?.longitude ?? null,
        wikiHref: wikiItems[0]?.href ?? effectiveLocationContext?.wiki?.href ?? null,
      }),
    [heroTitle, mapPreview, effectiveLocationContext, wikiItems],
  );
  const heroGuideItems = useMemo(
    () => [...sariSayfalarItems, ...mapItems, ...hizmetItems],
    [sariSayfalarItems, mapItems, hizmetItems],
  );
  const heroOrderItems = useMemo(() => shopItems, [shopItems]);
  const heroSubtitle: ReactNode = isLandmarkHero && effectiveLocationContext?.city ? (
    <Link href={effectiveLocationContext.city.href} className="usr-hero-subtitle-link">
      {effectiveLocationContext.city.name}, il
    </Link>
  ) : effectiveLocationContext?.district ? (
    "ilçe"
  ) : (
    "il"
  );
  const hasAnyResults =
    totalResults > 0 ||
    Boolean(displayAiSummary) ||
    hasPartialResults ||
    (activeTab === "ai" && Boolean(appliedQuery.trim()));
  const showTwoColLayout =
    activeTab === "all" && (hasPartialResults || totalResults > 0) && Boolean(displayAiSummary || effectiveLocationContext);
  const showHero = isCityHeroQuery && Boolean(appliedQuery.trim());
  const showRightPanel = showTwoColLayout;
  const showMainAiCard = activeTab === "all" && hasApiAiSummary && !showRightPanel;

  const renderLeftColumn = () => {
    if (activeTab === "ai") {
      return (
        <section
          id="yekpare-ai-summary"
          className="usr-ai-card yekpare-home-glass"
          aria-label="Yekpare AI"
        >
          <div className="usr-section-head">
            <Sparkles className="h-5 w-5" style={{ color: "var(--usr-accent)" }} aria-hidden />
            <h2>Yekpare AI Özeti</h2>
            <span className="usr-ai-model-badge">Yekpare AI</span>
          </div>
          {tabAi.loading ? (
            <p className="usr-ai-summary-text">Yekpare AI düşünüyor…</p>
          ) : tabAi.summary ? (
            <p className="usr-ai-summary-text">{tabAi.summary}</p>
          ) : tabAi.error ? (
            <div className="usr-web-hint yekpare-home-glass">
              <Sparkles className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <div>
                <p>{formatInternetSearchDetail(tabAi.error) ?? tabAi.error}</p>
                <button type="button" className="usr-tab-ai-retry" onClick={tabAi.retry}>
                  Tekrar dene
                </button>
              </div>
            </div>
          ) : (
            <p className="usr-ai-summary-text">Yekpare AI yanıtı bekleniyor…</p>
          )}
        </section>
      );
    }

    if (activeTab === "gorsel") {
      return (
        <ImageGridSection
          images={galleryImageItems}
          query={appliedQuery}
          loading={mediaLoading}
          emptyHint={
            internetSearchEnabled
              ? "Yekpare sonuçları ve DuckDuckGo web araması birleştirildi; bu sorgu için görsel bulunamadı."
              : undefined
          }
        />
      );
    }

    if (activeTab === "video") {
      const hasVideos = hybridVideoItems.length > 0 || externalVideos.length > 0;
      return (
        <section className="usr-section" aria-label="Videolar">
          {hasVideos ? (
            <div className="usr-services-grid">
              {externalVideos.map((item) => (
                <VideoCard
                  key={item.id}
                  item={item}
                  sourceLabel={externalVideoSourceLabel(item)}
                  external
                />
              ))}
              {hybridVideoItems.map((item) => (
                <VideoCard key={item.id} item={item} sourceLabel="YekTube" />
              ))}
            </div>
          ) : mediaLoading ? (
            <div className="usr-web-hint yekpare-home-glass">
              <Video className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <p>Web videoları yükleniyor…</p>
            </div>
          ) : (
            <div className="usr-web-hint yekpare-home-glass">
              <Video className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <p>
                {internetItems.length > 0
                  ? "YekTube eşleşmesi yok; web kaynakları Genel arama sekmesinde listeleniyor."
                  : "Bu sorgu için video bulunamadı. YekTube ve DuckDuckGo web araması birleştirilir."}
              </p>
            </div>
          )}
        </section>
      );
    }

    if (activeTab === "gundem") {
      return (
        <section className="usr-section" aria-label="Gündem">
          <div className="usr-external-list yekpare-home-glass">
            {[...newsItems, ...hmItems].map((item) => (
              <OrganicResultItem key={item.id} item={item} siteLabel={item.hmSiteName ?? "Yekpare Haber"} />
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === "haritalar") {
      return (
        <HaritalarTab
          query={appliedQuery}
          locationContext={effectiveLocationContext}
          mapPreview={mapPreview}
          cityCount={cityItems.length}
          cityQuickFacts={cityQuickFacts}
          cityItems={cityItems.map(toHaritalarItem)}
          mapItems={mapItems.map(toHaritalarItem)}
          sariSayfalarItems={sariSayfalarItems.map(toHaritalarItem)}
          hizmetItems={hizmetItems.map(toHaritalarItem)}
          otomotivItems={otomotivItems.map(toHaritalarItem)}
          tourismItems={tourismItems.map(toHaritalarItem)}
          yemekMarketItems={yemekMarketItems.map(toHaritalarItem)}
          urunlerItems={urunlerItems.map(toHaritalarItem)}
        />
      );
    }

    if (activeTab === "alisveris") {
      return (
        <section className="usr-section" aria-label="Alışveriş">
          <div className="usr-services-grid">
            {shopItems.map((item) => (
              <ServiceCard key={item.id} item={item} badge={item.typeLabel ?? "Mağaza"} />
            ))}
          </div>
        </section>
      );
    }

    return (
      <>
        {showMainAiCard && aiSummary ? <AiSummaryMainCard summary={aiSummary} /> : null}
        <WebSourcesSection
          items={internetItems}
          internetSearchEnabled={internetSearchEnabled}
          loading={loading}
          aiDetail={internetSearchDetail}
        />
        <div className="usr-organic-list yekpare-home-glass">
          {organicItems.map((item) => (
            <OrganicResultItem
              key={item.id}
              item={item}
              siteLabel={
                item.hmSiteName ??
                (item.resultType === "harita" || item.id.startsWith("map-pin-")
                  ? "Yekpare Haritalar"
                  : item.typeLabel ?? item.categoryName ?? "Yekpare")
              }
            />
          ))}
        </div>
        {wikiItems[0] ? <WikiOrganicItem item={wikiItems[0]} /> : null}
        <ImageGridSection images={galleryImageItems} query={appliedQuery} />
        {tourismItems.length > 0 ? (
          <section className="usr-section" aria-label="Seyahat">
            <div className="usr-section-head">
              <h2>Seyahat &amp; Konaklama</h2>
            </div>
            <div className="usr-services-grid">
              {tourismItems.slice(0, 2).map((item) => (
                <ServiceCard key={item.id} item={item} badge="Yekpare Seyahat" cta={tourismCta(item.storeType)} />
              ))}
            </div>
          </section>
        ) : null}
        {!showRightPanel ? <RelatedSearchesSection items={relatedSearches} /> : null}
      </>
    );
  };

  const rightPanel =
    showRightPanel && activeTab === "all" ? (
      <SearchResultsRightPanel
        context={
          effectiveLocationContext ?? {
            locationIntent: false,
            label: appliedQuery,
            businesses: [],
            wiki: null,
          }
        }
        aiSummary={hasApiAiSummary ? aiSummary : displayAiSummary}
        quickFacts={cityQuickFacts}
        newsItems={newsItems}
        placesItems={placesItems}
        relatedSearches={relatedSearches}
        cityCount={cityItems.length}
      />
    ) : null;

  return (
    <div
      className={`usr-page yekpare-home-root${embedInHmSite ? " usr-page--hm-embed" : ""}`}
      data-page="unified-search"
      data-yekpare-theme={homeTheme}
      data-home-theme={homeTheme}
    >
      {embedInHmSite ? (
        <div className="hm-usr-embed-chrome">
          <SearchEngineSearchForm
            searchValue={queryInput}
            onSearchChange={setQueryInput}
            onSearchSubmit={applySearch}
            searchPlaceholder="Haber, firma, ürün veya konu ara…"
            listId="hm-unified-search-suggest"
            inputTheme="results"
            className="hm-usr-embed-chrome__form"
          />
          {appliedQuery.trim() ? <SearchTabsNav activeTab={activeTab} onTab={setTab} /> : null}
        </div>
      ) : (
        <SearchEngineHeader
          mode="serp"
          sticky
          showSlogan
          showDefaultSubNav={false}
          showLocationPill={false}
          searchValue={queryInput}
          onSearchChange={setQueryInput}
          onSearchSubmit={applySearch}
          searchPlaceholder="Ürün, firma, hizmet veya adres ara…"
          listId="unified-search-page-suggest"
          beforeCategories={<SearchEngineSubNavStack part="categories" showCategories />}
          afterSearch={appliedQuery.trim() ? <SearchTabsNav activeTab={activeTab} onTab={setTab} /> : null}
        />
      )}

      <div className={`usr-layout${showRightPanel ? " has-results-panel" : ""}`}>
        {appliedQuery.trim() ? (
          <p className="usr-stats">
            {loading
              ? "Sonuçlar yükleniyor…"
              : hasAnyResults
                ? `${totalResults.toLocaleString("tr-TR")} sonuç · "${appliedQuery}"`
                : "Eşleşen sonuç bulunamadı"}
          </p>
        ) : null}

        {loading && activeTab !== "ai" ? (
          <div className="usr-skeleton-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="usr-skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="usr-empty text-red-600">{error}</div>
        ) : !appliedQuery.trim() ? (
          <div className="usr-empty yekpare-home-glass">
            <Search className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-semibold">Arama kutusuna bir kelime yazın.</p>
            <p className="mt-2 text-sm">Örn. kapadokya balon turu, ankara kalesi, otel, gözleme</p>
          </div>
        ) : !hasAnyResults ? (
          <div className="usr-empty yekpare-home-glass">
            <p className="font-semibold">"{appliedQuery}" için sonuç bulunamadı.</p>
            <Link href="/kesfet/liste" className="mt-3 inline-block text-sm font-bold" style={{ color: "var(--usr-accent)" }}>
              Keşfet rehberine git
            </Link>
          </div>
        ) : (
          <>
            {showHero && activeTab === "all" ? (
              <HeroBlock
                title={heroTitle}
                subtitle={heroSubtitle}
                mapPreview={mapPreview}
                galleryImages={galleryImageUrls}
                activeFilter={heroFilter}
                cityLinks={heroCityLinks}
                guideItems={heroGuideItems}
                wikiItem={wikiItems[0] ?? null}
                orderItems={heroOrderItems}
                onFilter={setHeroFilter}
                onFilterSearch={(q) => applySearch(q)}
              />
            ) : null}

            <div className={`usr-results-shell${showRightPanel ? " serp-two-col" : ""}`}>
              <div className="usr-results-main">{renderLeftColumn()}</div>
              {rightPanel ? (
                <div className="serp-two-col-right usr-results-aside">{rightPanel}</div>
              ) : null}
            </div>

            {rightPanel ? <div className="serp-two-col-mobile usr-results-aside-mobile">{rightPanel}</div> : null}
          </>
        )}
      </div>

      {embedInHmSite ? null : <SearchEngineFooter />}
    </div>
  );
}
