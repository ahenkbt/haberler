import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPinned, Newspaper, Play, Search, Video } from "lucide-react";

import { UnifiedSearchInput } from "@/components/search/UnifiedSearchInput.tsx";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { pushRecentSearch } from "@/hooks/useSearchSuggestions";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { UNIFIED_SEARCH_PATH } from "@/lib/kesfetDiscoverHub";
import { applyJsonLd, applyPortalSiteSeo, buildYekpareWebSiteJsonLd } from "@/lib/pageSeo";
import { usePortalBrandVisuals } from "@/hooks/usePortalBrandVisuals";
import { fetchHybridNewsList, type HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import { triggerYektubeBackgroundRefresh } from "@/lib/yektubeBackgroundRefresh";
import { PORTAL_HOST, PORTAL_ORIGIN } from "@/lib/portalBrand";
import { yektubeWatchPath } from "@/lib/yektubeUrls";

import "@/styles/turkecoYandexHome.css";

const HOME_BRAND = "turk.eco";
const HOME_TAGLINE = "haber video portalı";

type VideoRow = {
  id: number;
  sourceId?: number | null;
  videoId: string;
  title: string;
  thumbnail?: string | null;
  channelName?: string | null;
};

const serviceLinks = [
  { label: "Haberler", href: "/haberler", icon: Newspaper },
  { label: "Videolar", href: "/yektube", icon: Video },
  { label: "Newsmap", href: "/newsmap", icon: MapPinned },
  { label: "Haber Merkezi", href: "/habermerkezi", icon: Building2 },
] as const;

const searchExamples = [
  "Son dakika",
  "Gündem haberleri",
  "Canlı yayın",
  "Yerel haber",
  "Ekonomi",
];

function newsItemImage(row: HomeHybridNewsItem): string | null {
  return resolveClientMediaSrc(row.imageUrl) || null;
}

async function fetchHomeNews(): Promise<HomeHybridNewsItem[]> {
  const items = await fetchHybridNewsList({
    limit: 24,
    offset: 0,
    rssScope: "all",
    fullHybrid: true,
    dbFirst: false,
    fresh: true,
    timeoutMs: 20_000,
    retries: 1,
  });
  const rss = items.filter((row) => row.source === "rss");
  const rest = items.filter((row) => row.source !== "rss");
  return [...rss, ...rest].slice(0, 12);
}

async function fetchHomeVideos(): Promise<VideoRow[]> {
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const params = new URLSearchParams({
    limit: "8",
    excludeStories: "true",
    newsOnly: "true",
    mixChannels: "true",
    seed: String(seed),
  });
  const res = await fetch(`/api/video/videos?${params}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: VideoRow[] };
  return (data.items ?? []).filter((v) => v?.videoId && v.title);
}

function routeForHomeQuery(rawQuery: string): string {
  const q = rawQuery.trim();
  const nq = q.toLocaleLowerCase("tr-TR");
  if (nq.includes("video") || nq.includes("yektube") || nq.includes("canlı") || nq.includes("canli")) {
    return q ? `/yektube?q=${encodeURIComponent(q)}` : "/yektube";
  }
  if (nq.includes("newsmap") || nq.includes("harita")) return "/newsmap";
  if (nq.includes("haber merkezi") || nq.includes("habermerkezi")) return "/habermerkezi";
  if (!q) return UNIFIED_SEARCH_PATH;
  return `${UNIFIED_SEARCH_PATH}?q=${encodeURIComponent(q)}`;
}

export default function SearchEngineHomePage() {
  const [searchText, setSearchText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const { logoSrc } = usePortalBrandVisuals();

  const { data: news = [], isLoading: newsLoading } = useQuery({
    queryKey: ["/api/news/hybrid", "turkeco-home", "rss-all"],
    queryFn: fetchHomeNews,
    staleTime: 0,
    gcTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["/api/video/videos", "turkeco-home"],
    queryFn: fetchHomeVideos,
    staleTime: 3 * 60 * 1000,
  });

  useEffect(() => {
    applyPortalSiteSeo({
      siteName: HOME_BRAND,
      tagline: HOME_TAGLINE,
    });
    applyJsonLd(buildYekpareWebSiteJsonLd());
    triggerYektubeBackgroundRefresh();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % searchExamples.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const placeholder = useMemo(
    () => searchExamples[placeholderIndex] ?? searchExamples[0],
    [placeholderIndex],
  );

  const submitSearch = (queryOverride?: string) => {
    const q = (queryOverride ?? searchText).trim();
    const effectiveQuery = q || placeholder;
    if (!effectiveQuery) return;
    pushRecentSearch(effectiveQuery);
    window.location.href = routeForHomeQuery(effectiveQuery);
  };

  return (
    <div className="tec-home" data-page="home" data-brand={HOME_BRAND}>
      <header className="tec-top">
        <nav className="tec-top-links" aria-label="Ana menü">
          <Link href="/haberler">Haberler</Link>
          <Link href="/yektube">Videolar</Link>
          <Link href="/newsmap">Newsmap</Link>
          <Link href="/habermerkezi">Haber Merkezi</Link>
        </nav>
        <div className="tec-top-actions">
          <Link href="/hesabim" className="tec-login">
            Giriş Yap
          </Link>
        </div>
      </header>

      <section className="tec-hero" aria-label="Arama">
        <Link href="/" className="tec-brand" aria-label={`${HOME_BRAND} ana sayfa`}>
          <img
            src={logoSrc}
            alt={`${HOME_BRAND} — ${HOME_TAGLINE}`}
            className="tec-brand-logo"
            width={280}
            height={280}
            decoding="async"
            fetchPriority="high"
          />
        </Link>

        <div className="tec-search-wrap">
          <form
            className="tec-search"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch(searchText);
            }}
          >
            <Search className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
            <UnifiedSearchInput
              value={searchText}
              onChange={setSearchText}
              onSubmit={submitSearch}
              placeholder={placeholder}
              autoFocus
              theme="home"
              listId="turkeco-home-search"
              disableDropdown
              inputClassName="min-w-0 flex-1 bg-transparent outline-none"
            />
            <button type="submit" className="tec-search-btn">
              Ara
            </button>
          </form>
        </div>

        <div className="tec-services" aria-label="Hizmetler">
          {serviceLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="tec-service">
                <Icon aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>

      <main className="tec-main">
        <div className="tec-panels">
          <section className="tec-panel tec-panel--news" aria-labelledby="tec-news-heading">
            <div className="tec-panel-head">
              <div className="tec-panel-title-wrap">
                <span className="tec-panel-kind">Metin haber</span>
                <h2 id="tec-news-heading">Haberler</h2>
              </div>
              <Link href="/haberler">Tümü</Link>
            </div>
            {newsLoading ? (
              <p className="tec-loading">Haberler yükleniyor…</p>
            ) : news.length === 0 ? (
              <p className="tec-empty">Şu an gösterilecek haber yok.</p>
            ) : (
              <div className="tec-news-list">
                {news.slice(0, 8).map((row) => {
                  const img = newsItemImage(row);
                  return (
                    <Link key={row.id} href={row.href} className="tec-news-item">
                      <div className="tec-news-thumb">
                        {img ? (
                          <img src={img} alt="" loading="lazy" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-300" />
                        )}
                      </div>
                      <div className="tec-news-meta">
                        {row.categoryName ? <span className="tec-news-cat">{row.categoryName}</span> : null}
                        <p className="tec-news-title">{row.title}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="tec-panel tec-panel--video" aria-labelledby="tec-video-heading">
            <div className="tec-panel-head">
              <div className="tec-panel-title-wrap">
                <span className="tec-panel-kind">Yektube</span>
                <h2 id="tec-video-heading">Videolar</h2>
              </div>
              <Link href="/yektube">Tümü</Link>
            </div>
            {videosLoading ? (
              <p className="tec-loading">Videolar yükleniyor…</p>
            ) : videos.length === 0 ? (
              <p className="tec-empty">Şu an gösterilecek video yok.</p>
            ) : (
              <div className="tec-video-grid">
                {videos.slice(0, 6).map((v) => {
                  const sourceId = v.sourceId ?? 0;
                  const href =
                    sourceId > 0 ? yektubeWatchPath(sourceId, v.videoId) : "/yektube";
                  return (
                    <Link key={v.id} href={href} className="tec-video-item">
                      <div className="tec-video-thumb">
                        <YektubeVideoThumb
                          videoId={v.videoId}
                          thumbnail={v.thumbnail}
                          variant="landscape"
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <div className="tec-video-play" aria-hidden>
                          <span>
                            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                          </span>
                        </div>
                      </div>
                      <p className="tec-video-title">{v.title}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="tec-footer">
        <span>
          © {new Date().getFullYear()} {HOME_BRAND}
        </span>
        <nav aria-label="Alt bağlantılar">
          <Link href="/haberler">Haberler</Link>
          <Link href="/yektube">Videolar</Link>
          <Link href="/habermerkezi">Haber Merkezi</Link>
          <Link href="/iletisim">İletişim</Link>
          <a href={PORTAL_ORIGIN}>{PORTAL_HOST}</a>
        </nav>
      </footer>
    </div>
  );
}
