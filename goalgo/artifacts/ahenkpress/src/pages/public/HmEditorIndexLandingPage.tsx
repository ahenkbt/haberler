import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight,
  Bell,
  CloudSun,
  Loader2,
  LogIn,
  MapPinned,
  Newspaper,
  Search,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";
import { HmNewsImage, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { useHmHeaderSonDakikaItems } from "@/components/HmHeaderSonDakikaTicker";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { fetchHybridNewsList } from "@/hooks/useHomeHybridNews";
import { useHmHomeHybridBootstrap } from "@/hooks/useHmHomeHybridBootstrap";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { resolveHmEditorLoginPublicHref } from "@/lib/hmEditorPublicLinks";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { hmVitrinAccentHex } from "@/lib/hmVitrinThemeTokens";
import { apiRequest } from "@/lib/queryClient";
import { recommendationVideoTitle } from "@/lib/yektubeVideoClassify";

import "@/styles/hmIndexLanding.css";

type FinanceApiItem = {
  symbol: string;
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
};

type CategoryRow = {
  id?: number;
  slug?: string;
  name?: string;
  color?: string | null;
};

type PopularNewsRow = {
  id?: number | string;
  slug?: string | null;
  title?: string | null;
};

type RecentVideo = {
  id: number;
  sourceId?: number | null;
  videoId: string;
  title: string;
  thumbnail?: string | null;
  channelName?: string | null;
};

type Props = {
  onEnterSite: () => void;
};

function newsDetailHref(h: (path: string) => string, item: { slug?: string | null; id?: number | string; href?: string | null }): string {
  const external = String(item.href ?? "").trim();
  if (/^https?:\/\//i.test(external)) return external;
  const slug = String(item.slug ?? "").trim();
  if (slug) return h(`/haber/${encodeURIComponent(slug)}`);
  const id = item.id;
  if (id != null && String(id).trim()) return h(`/haber/${encodeURIComponent(String(id))}`);
  return h("/tum-haberler");
}

function IndexWidgetCard({
  title,
  icon: Icon,
  accent,
  children,
  href,
  linkLabel = "Tümü",
}: {
  title: string;
  icon: typeof Bell;
  accent: string;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <article className="hm-index-widget" style={{ ["--hm-index-accent" as string]: accent }}>
      <header className="hm-index-widget__head">
        <span className="hm-index-widget__icon" aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="hm-index-widget__title">{title}</h2>
        {href ? (
          <Link href={href} className="hm-index-widget__more">
            {linkLabel} <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        ) : null}
      </header>
      <div className="hm-index-widget__body">{children}</div>
    </article>
  );
}

export default function HmEditorIndexLandingPage({ onEnterSite }: Props) {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const [searchQ, setSearchQ] = useState("");

  const siteId = ctx?.siteId ?? 0;
  const layout = ctx?.layoutPrefs;
  const accent =
    (layout?.hmPrimaryColor ?? "").trim() ||
    hmVitrinAccentHex(layout?.hmVitrinTheme ?? "default") ||
    "#e61e25";
  const showFinance = layout?.tickerFinance !== false;
  const showWeather = layout?.tickerWeather !== false;
  const siteOrigin = hmPublicSiteOrigin(ctx?.domain ?? null);
  const editorLoginHref = resolveHmEditorLoginPublicHref(siteOrigin);
  const logoSrc = resolveClientMediaSrc(String(layout?.logoUrl ?? "").trim());

  const breakingItems = useHmHeaderSonDakikaItems("breaking");
  useHmHomeHybridBootstrap(siteId, siteId > 0);

  const { data: financeRaw = [] } = useQuery({
    queryKey: ["/api/finance", "hm-index-landing"],
    queryFn: () => apiRequest("/api/finance") as Promise<FinanceApiItem[]>,
    enabled: showFinance,
    staleTime: 60_000,
  });

  const { data: popularNews = [] } = useQuery({
    queryKey: ["/api/news/popular", siteId, "hm-index-landing"],
    queryFn: async () => {
      const payload = (await apiRequest(
        `/api/news/popular?siteId=${encodeURIComponent(String(siteId))}&limit=8`,
      )) as { items?: PopularNewsRow[] } | PopularNewsRow[];
      if (Array.isArray(payload)) return payload;
      return payload.items ?? [];
    },
    enabled: siteId > 0,
    staleTime: 120_000,
  });

  const { data: mapNews = [] } = useQuery({
    queryKey: ["/api/news/hybrid", "newsmap", siteId, "hm-index-landing"],
    queryFn: () =>
      fetchHybridNewsList({
        siteId,
        limit: 8,
        offset: 0,
        global: true,
        dbFirst: true,
        timeoutMs: 10_000,
      }),
    enabled: siteId > 0,
    staleTime: 120_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories", siteId, "hm-index-landing"],
    queryFn: () => apiRequest(`/api/categories?siteId=${encodeURIComponent(String(siteId))}`) as Promise<CategoryRow[]>,
    enabled: siteId > 0,
    staleTime: 300_000,
  });

  const { data: recentVideos = [] } = useQuery({
    queryKey: ["/api/video/videos", "hm-index-landing"],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "4", excludeStories: "true", newsOnly: "true", mixChannels: "true" });
      const res = await fetch(`/api/video/videos?${params}`);
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: RecentVideo[] };
      return data.items ?? [];
    },
    staleTime: 120_000,
  });

  const { data: hybridPool = [] } = useQuery({
    queryKey: ["/api/news/hybrid", "hm-index-categories", siteId],
    queryFn: () =>
      fetchHybridNewsList({
        siteId,
        limit: 60,
        offset: 0,
        rssScope: "all",
        dbFirst: true,
        timeoutMs: 10_000,
      }),
    enabled: siteId > 0,
    staleTime: 120_000,
  });

  const financeRows = useMemo(() => {
    const items = Array.isArray(financeRaw) ? financeRaw : [];
    const order = ["USD", "EUR", "GA", "BIST"] as const;
    const bySymbol = new Map(items.map((item) => [item.symbol, item]));
    return order
      .map((symbol) => bySymbol.get(symbol))
      .filter(Boolean)
      .slice(0, 4) as FinanceApiItem[];
  }, [financeRaw]);

  const trendingQueries = useMemo(() => {
    const titles = [
      ...breakingItems.map((n) => String(n.title ?? "")),
      ...popularNews.map((n) => String(n.title ?? "")),
    ]
      .map((t) => t.trim())
      .filter((t) => t.length >= 12)
      .slice(0, 6);
    if (titles.length >= 4) return titles;
    const siteName = ctx?.displayName ?? "haber";
    return [
      ...titles,
      `${siteName} son dakika`,
      "döviz kuru",
      "hava durumu",
      "spor haberleri",
    ].slice(0, 6);
  }, [breakingItems, popularNews, ctx?.displayName]);

  const categoryBoxes = useMemo(() => {
    const cats = (categories as CategoryRow[]).filter((c) => c.slug && c.name).slice(0, 4);
    return cats.map((cat) => {
      const slug = String(cat.slug);
      const items = hybridPool
        .filter((item) => String(item.categorySlug ?? "").toLowerCase() === slug.toLowerCase())
        .slice(0, 4);
      return {
        slug,
        name: String(cat.name),
        color: String(cat.color ?? accent),
        items,
      };
    });
  }, [categories, hybridPool, accent]);

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const q = searchQ.trim();
    if (!q) return;
    window.location.href = h(`/tum-haberler?q=${encodeURIComponent(q)}`);
  };

  if (!ctx) return null;

  return (
    <div className="hm-index-landing" style={{ ["--hm-index-accent" as string]: accent }}>
      <header className="hm-index-landing__header">
        <div className="hm-index-landing__header-inner">
          <div className="hm-index-landing__brand">
            {logoSrc ? (
              <img src={logoSrc} alt={ctx.displayName} className="hm-index-landing__logo" />
            ) : (
              <span className="hm-index-landing__site-name">{ctx.displayName}</span>
            )}
          </div>
          <div className="hm-index-landing__header-actions">
            <span className="hm-index-landing__preload-hint">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Site hazırlanıyor…
            </span>
            <a href={editorLoginHref} className="hm-index-landing__editor-link">
              <LogIn className="h-4 w-4" aria-hidden />
              Editör girişi
            </a>
            <button type="button" className="hm-index-landing__enter-btn" onClick={onEnterSite}>
              Siteye gir
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {(showFinance || showWeather) && (
        <div className="hm-index-landing__ticker">
          {showFinance && financeRows.length > 0 ? (
            <div className="hm-index-landing__finance">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {financeRows.map((row) => (
                <span key={row.symbol} className="hm-index-landing__finance-item">
                  <strong>{row.label}</strong> {row.value}
                  <span className={`hm-index-landing__finance-change hm-index-landing__finance-change--${row.direction}`}>
                    {row.change}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
          {showWeather ? (
            <div className="hm-index-landing__weather">
              <CloudSun className="h-3.5 w-3.5 shrink-0" aria-hidden />
              İstanbul 18°C · Parçalı bulutlu
            </div>
          ) : null}
        </div>
      )}

      {breakingItems.length > 0 ? (
        <div className="hm-index-landing__breaking" aria-label="Son dakika">
          <span className="hm-index-landing__breaking-label">
            <Bell className="h-3.5 w-3.5" aria-hidden />
            Son dakika
          </span>
          <div className="hm-index-landing__breaking-track">
            <div className="hm-index-landing__breaking-inner">
              {[...breakingItems, ...breakingItems].map((item, index) => (
                <Link
                  key={`${item.id ?? index}-${index}`}
                  href={newsDetailHref(h, item)}
                  className="hm-index-landing__breaking-link"
                >
                  {String(item.title ?? "").trim()}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <main className="hm-index-landing__main">
        <section className="hm-index-landing__hero">
          <h1 className="hm-index-landing__hero-title">{ctx.displayName}</h1>
          <p className="hm-index-landing__hero-desc">
            Güncel haberler, son dakika gelişmeleri, video ve harita haberleri — tek ekranda.
          </p>
          <form className="hm-index-landing__search" onSubmit={onSearchSubmit}>
            <Search className="hm-index-landing__search-icon" aria-hidden />
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Haber, konu veya kategori ara…"
              className="hm-index-landing__search-input"
              aria-label="Haber ara"
            />
            <button type="submit" className="hm-index-landing__search-btn">
              Ara
            </button>
          </form>
          <div className="hm-index-landing__chips">
            <Link href={h("/sondakika")} className="hm-index-landing__chip">
              <Bell className="h-3.5 w-3.5" /> Son dakika
            </Link>
            <Link href={h("/tum-haberler")} className="hm-index-landing__chip">
              <Newspaper className="h-3.5 w-3.5" /> Tüm haberler
            </Link>
            {layout?.hmNewsVideoTvEnabled !== false ? (
              <Link href={h("/video-tv")} className="hm-index-landing__chip">
                <Video className="h-3.5 w-3.5" /> Video
              </Link>
            ) : null}
            <Link href={h("/haritalar")} className="hm-index-landing__chip">
              <MapPinned className="h-3.5 w-3.5" /> Harita
            </Link>
          </div>
        </section>

        <section className="hm-index-landing__widgets">
          <IndexWidgetCard title="Son Dakika Haberler" icon={Bell} accent={accent} href={h("/sondakika")}>
            <ul className="hm-index-list">
              {(breakingItems.length > 0 ? breakingItems : popularNews).slice(0, 6).map((item, index) => (
                <li key={String(item.id ?? index)}>
                  <Link href={newsDetailHref(h, item)} className="hm-index-list__link">
                    {String(item.title ?? "").trim()}
                  </Link>
                </li>
              ))}
            </ul>
          </IndexWidgetCard>

          <IndexWidgetCard title="En Çok Arananlar" icon={Zap} accent={accent} href={h("/tum-haberler")}>
            <ul className="hm-index-list">
              {trendingQueries.map((label, index) => (
                <li key={`${label}-${index}`}>
                  <Link href={h(`/tum-haberler?q=${encodeURIComponent(label)}`)} className="hm-index-list__link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </IndexWidgetCard>

          <IndexWidgetCard title="Popüler Videolar" icon={Video} accent={accent} href={h("/video-tv")}>
            {recentVideos.length > 0 ? (
              <div className="hm-index-videos">
                {recentVideos.slice(0, 4).map((video) => {
                  const sourceId = video.sourceId ?? 0;
                  const href =
                    sourceId > 0 ? h(`/video-tv/kanal/${sourceId}/${encodeURIComponent(video.videoId)}`) : h("/video-tv");
                  return (
                    <Link key={video.id} href={href} className="hm-index-video-card">
                      <div className="hm-index-video-card__thumb">
                        <YektubeVideoThumb
                          videoId={video.videoId}
                          alt={video.title}
                          thumbnail={video.thumbnail}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="hm-index-video-card__title">
                        {recommendationVideoTitle(video.title, video.channelName)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="hm-index-empty">Video yükleniyor…</p>
            )}
          </IndexWidgetCard>

          <IndexWidgetCard title="Harita Haberleri" icon={MapPinned} accent={accent} href={h("/haritalar")}>
            <ul className="hm-index-list">
              {mapNews.slice(0, 6).map((item, index) => (
                <li key={item.id ?? index}>
                  <Link href={item.href || newsDetailHref(h, item)} className="hm-index-list__link">
                    {item.title}
                  </Link>
                </li>
              ))}
              {mapNews.length === 0 ? <li className="hm-index-empty">Harita haberleri yükleniyor…</li> : null}
            </ul>
          </IndexWidgetCard>
        </section>

        {categoryBoxes.length > 0 ? (
          <section className="hm-index-landing__categories">
            <div className="hm-index-landing__section-head">
              <h2 className="hm-index-landing__section-title">Kategori kutuları</h2>
              <Link href={h("/tum-haberler")} className="hm-index-widget__more">
                Tüm kategoriler <ArrowRight className="inline h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="hm-index-landing__category-grid">
              {categoryBoxes.map((box) => (
                <article key={box.slug} className="hm-index-category-box">
                  <header className="hm-index-category-box__head">
                    <span className="hm-index-category-box__bar" style={{ background: box.color }} aria-hidden />
                    <h3 className="hm-index-category-box__title">{box.name}</h3>
                    <Link href={h(`/kategori/${encodeURIComponent(box.slug)}`)} className="hm-index-category-box__all">
                      Tümü
                    </Link>
                  </header>
                  <div className="hm-index-category-box__items">
                    {box.items.length > 0 ? (
                      box.items.map((item, index) => (
                        <Link
                          key={item.id ?? index}
                          href={item.href || newsDetailHref(h, item)}
                          className="hm-index-category-item"
                        >
                          <div className="hm-index-category-item__thumb">
                            <HmNewsImage src={resolveNewsItemImageUrl(item)} alt="" loading="lazy" />
                          </div>
                          <p className="hm-index-category-item__title">{item.title}</p>
                        </Link>
                      ))
                    ) : (
                      <p className="hm-index-empty">Bu kategoride haber yükleniyor…</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="hm-index-landing__cta">
          <p className="hm-index-landing__cta-text">Tam haber sitesi arka planda hazırlandı.</p>
          <button type="button" className="hm-index-landing__enter-btn hm-index-landing__enter-btn--large" onClick={onEnterSite}>
            Haber sitesine geç
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </section>
      </main>
    </div>
  );
}
