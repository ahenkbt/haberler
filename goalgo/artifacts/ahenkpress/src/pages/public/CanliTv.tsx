/** @deprecated Yektube v1 — v2 geçişinde `YektubeStandaloneRoute` / v2 SPA kullanın. */
import type { CSSProperties, ReactNode } from "react";
import { useListVideoSources, useGetSiteSettings } from "@workspace/api-client-react";
import { Link, useLocation, useSearch } from "wouter";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  MonitorPlay,
  Play,
  ListVideo,
  Video,
  Radio,
  Menu,
  Home,
  Tv2,
  Star,
  X,
  ChevronRight,
  ChevronLeft,
  Grid3X3,
  Film,
  Clock,
  Mic,
  Copy,
  Share2,
  Code,
  Link2,
  Shuffle,
  Smartphone,
} from "lucide-react";
import {
  VIDEO_TV_CATEGORY_LABELS,
  VIDEO_TV_CATEGORY_COLORS,
  buildVideoTvNavSlugs,
} from "@/lib/videoTvCategories";
import {
  YEKTUBE_HOME,
  absoluteUrl,
  yektubeCanliTvPath,
  yektubeChannelPath,
  yektubePlaylistPath,
  yektubeWatchPath,
  yektubeSearchPath,
} from "@/lib/yektubeUrls";
import { enhanceYoutubeIframeSrc } from "@/lib/youtubeEmbed";
import { isYoutubeVideoId, resolveLiveVideoId } from "@/lib/yektubeLiveEmbed";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { normalizeYoutubeImageSrc, sourceCoverFallbackSrc, sourceCoverSrc } from "@/lib/youtubeThumbnails";
import { YektubeEngagement } from "@/components/YektubeEngagement";
import { YektubePlayerMark } from "@/components/YektubePlayerMark";
import { YektubeWatchPlayer } from "@/components/YektubeWatchPlayer";
import { YektubeScrollTabs } from "@/components/YektubeScrollTabs";
import { YektubeLiveChatPanel } from "@/components/YektubeLiveChatPanel";
import { useHmVideoTvLayout } from "@/contexts/HmVideoTvContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  YEKTUBE_ACCENT,
} from "@/lib/yektubeTheme";
import { SADE_PUBLIC_HERO_STAGE_CLASS, SADE_PUBLIC_HERO_SURFACE_CLASS, SADE_PUBLIC_HERO_SUBNAV_ONLY_CLASS, SADE_PUBLIC_HERO_YEKTUBE_BAND_CLASS, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { isPodcastSource } from "@/lib/yektubePodcastFilter";
import {
  parseYektubeSectionPath,
  yektubeSectionPath,
  type YektubeView,
} from "@/lib/yektubeNav";
import { YektubeNewsVideoGrid, NEWS_BOX_VIDEO_LIMIT } from "@/components/YektubeNewsVideoGrid";
import { displayVideoTitle, isYekcekVideo, recommendationVideoTitle } from "@/lib/yektubeVideoClassify";
import { YektubeTopSearchBar, YEKTUBE_INLINE_SEARCH_INPUT_CLASS, YEKTUBE_INLINE_SEARCH_PLACEHOLDER } from "@/components/YektubeTopSearchBar";
import { yektubeYekcekPath } from "@/lib/yektubeUrls";
import { YektubeShortsReel } from "@/components/YektubeShortsReel";
import { triggerYektubeBackgroundRefresh } from "@/lib/yektubeBackgroundRefresh";
import {
  YektubeMobileAnaSayfa,
  YektubeMobileBottomNav,
  YektubeMobileFeedItem,
  YektubeMobileModeProvider,
  YektubeMobileSearchOverlay,
  YektubeMobileTopBar,
  useYektubeMobileChrome,
} from "@/components/YektubeMobileChrome";

export type VideoItem = {
  id: number;
  sourceId?: number | null;
  platform: string;
  videoId: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  channelName?: string | null;
  publishedAt?: string | null;
  duration?: string | null;
  categorySlug: string;
  isFeatured: boolean;
  /** false ise embed kapalı — site içinde gösterilmez */
  embedAllowed?: boolean;
  isStory?: boolean;
};

export type Source = {
  id: number;
  name: string;
  platform: string;
  sourceType: string;
  channelId: string;
  url?: string | null;
  logoUrl?: string | null;
  categorySlug: string;
  active: boolean;
  isLive: boolean;
  videoCount?: number;
};

type View = YektubeView;

/** Orijinal Yektube anasayfa — açık gri zemin + köşe glow */
const YEKTUBE_PAGE_SURFACE_BG = "#f8fafc";

export function isListSourceType(sourceType: string): boolean {
  return sourceType === "playlist" || sourceType === "podcast";
}

export function embedSrc(source: Source, autoplay = false): string {
  const ap = autoplay ? "?autoplay=1" : "";
  let raw: string;
  if (source.isLive && (source.sourceType === "video" || isYoutubeVideoId(source.channelId))) {
    raw = `https://www.youtube-nocookie.com/embed/${source.channelId.trim()}${ap}`;
  } else if (source.sourceType === "video") {
    raw = `https://www.youtube-nocookie.com/embed/${source.channelId}${ap}`;
  } else if (isListSourceType(source.sourceType)) {
    raw = `https://www.youtube-nocookie.com/embed?listType=playlist&list=${source.channelId}${autoplay ? "&autoplay=1" : ""}`;
  } else if (source.sourceType === "live") {
    raw = `https://www.youtube-nocookie.com/embed/live_stream?channel=${source.channelId}${autoplay ? "&autoplay=1" : ""}`;
  } else {
    raw = `https://www.youtube-nocookie.com/embed?listType=user_uploads&list=${source.channelId}${autoplay ? "&autoplay=1" : ""}`;
  }
  return enhanceYoutubeIframeSrc(raw);
}

const CHANNEL_COLORS = [
  "#039D55", "#1976d2", "#388e3c", "#7b1fa2", "#e65100",
  "#00838f", "#ad1457", "#1565c0", "#558b2f", "#6a1b9a",
  "#f57c00", "#0288d1", "#2e7d32", "#c62828",
];
export function channelColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return CHANNEL_COLORS[Math.abs(h) % CHANNEL_COLORS.length];
}

const CAT_LABELS: Record<string, string> = {
  ...VIDEO_TV_CATEGORY_LABELS,
  haberler: "Haberler",
  haber: "Haber",
  spor: "Spor",
  ekonomi: "Ekonomi",
  teknoloji: "Teknoloji",
  eglence: "Eğlence",
  saglik: "Sağlık",
  dizi: "Dizi",
  sinema: "Sinema",
  "film-dizi": "Canlı Film & Dizi",
  muzik: "Müzik",
  seyahat: "Seyahat",
  doga: "Doğa",
  tarih: "Tarih",
  bilim: "Bilim",
  cocuk: "Çocuk",
};

const CAT_COLORS: Record<string, string> = {
  ...VIDEO_TV_CATEGORY_COLORS,
  haberler: "#039D55",
  haber: "#039D55",
  spor: "#1976d2",
  ekonomi: "#388e3c",
  teknoloji: "#7b1fa2",
  eglence: "#e65100",
  saglik: "#00838f",
  dizi: "#ad1457",
  sinema: "#1565c0",
  "film-dizi": "#1565c0",
  muzik: "#c62828",
  seyahat: "#558b2f",
  doga: "#2e7d32",
  tarih: "#6a1b9a",
  bilim: "#0288d1",
  cocuk: "#f57c00",
};

export default function CanliTv() {
  const hmTv = useHmVideoTvLayout();
  const pathHome = hmTv?.pathHome ?? YEKTUBE_HOME;
  const [location, setLocation] = useLocation();
  const urlSearch = useSearch();
  const urlQuery = useMemo(() => {
    const qs = urlSearch.startsWith("?") ? urlSearch.slice(1) : urlSearch;
    return new URLSearchParams(qs).get("q") ?? "";
  }, [urlSearch]);
  const canliTvHref = yektubeCanliTvPath(pathHome);

  const routeFromUrl = useMemo(() => parseYektubeSectionPath(location, pathHome), [location, pathHome]);

  const { data: sources, isLoading, isError, refetch } = useListVideoSources();
  const { data: settings } = useGetSiteSettings();
  const [view, setView] = useState<View>(routeFromUrl.view);
  const [activeCat, setActiveCat] = useState(routeFromUrl.category);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playing, setPlaying] = useState<Source | null>(null);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const isMobile = useIsMobile();
  const onBrowse = !playingVideo && !playing;
  const isHmEmbed = Boolean(hmTv);
  const isStandaloneYektube = !isHmEmbed;
  const isYtMobile = isStandaloneYektube && isMobile;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const stickyTopPx = hmTv?.contentStickyTopPx ?? (isYtMobile ? 48 : isStandaloneYektube && isMobile ? 44 : 0);
  const showSearchRow = onBrowse && view !== "shorts" && !isYtMobile;
  const subNavBarPx = isMobile && isStandaloneYektube ? 0 : 44;
  const searchBarPx = showSearchRow ? 52 : 0;
  const mobileAsideTopPx = stickyTopPx + subNavBarPx + searchBarPx;

  useEffect(() => {
    setView(routeFromUrl.view);
    setActiveCat(routeFromUrl.category);
  }, [routeFromUrl.view, routeFromUrl.category]);

  useEffect(() => {
    if (routeFromUrl.view === "ara" || urlQuery) {
      setSearch(urlQuery);
    }
  }, [routeFromUrl.view, urlQuery]);

  useEffect(() => {
    if (routeFromUrl.view === "anasayfa" && urlQuery.trim()) {
      setLocation(yektubeSearchPath(pathHome, urlQuery), { replace: true });
    }
  }, [routeFromUrl.view, urlQuery, pathHome, setLocation]);

  const submitYektubeSearch = useCallback(
    (q?: string) => {
      const query = (q ?? search).trim();
      setLocation(yektubeSearchPath(pathHome, query || undefined));
      setSearch(query);
    },
    [search, pathHome, setLocation],
  );

  useEffect(() => {
    triggerYektubeBackgroundRefresh();
  }, []);

  const activeSources = useMemo(() => sources?.filter((s) => s.active) ?? [], [sources]);
  const liveChannels = useMemo(() => activeSources.filter((s) => s.isLive || s.sourceType === "live"), [activeSources]);
  const channelOnlySources = useMemo(
    () => activeSources.filter((s) => !s.isLive && s.sourceType !== "live" && s.sourceType === "channel"),
    [activeSources],
  );
  const playlistSources = useMemo(
    () =>
      activeSources.filter(
        (s) => s.sourceType === "playlist" || (s.sourceType === "podcast" && !isPodcastSource(s)),
      ),
    [activeSources],
  );
  const podcastSources = useMemo(
    () => activeSources.filter((s) => isPodcastSource(s)),
    [activeSources],
  );

  const categories = useMemo(
    () => buildVideoTvNavSlugs(activeSources.map((s) => s.categorySlug)),
    [activeSources],
  );

  const channelCatCounts = useMemo(() => {
    const map: Record<string, number> = {};
    channelOnlySources.forEach((s) => {
      map[s.categorySlug] = (map[s.categorySlug] || 0) + 1;
    });
    return map;
  }, [channelOnlySources]);

  const playlistCatCounts = useMemo(() => {
    const map: Record<string, number> = {};
    playlistSources.forEach((s) => {
      map[s.categorySlug] = (map[s.categorySlug] || 0) + 1;
    });
    return map;
  }, [playlistSources]);

  const podcastCatCounts = useMemo(() => {
    const map: Record<string, number> = {};
    podcastSources.forEach((s) => {
      map[s.categorySlug] = (map[s.categorySlug] || 0) + 1;
    });
    return map;
  }, [podcastSources]);

  const filteredChannels = useMemo(() => {
    return channelOnlySources.filter((s) => {
      const matchCat = activeCat === "all" || s.categorySlug === activeCat;
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [channelOnlySources, activeCat, search]);

  const filteredPlaylists = useMemo(() => {
    return playlistSources.filter((s) => {
      const matchCat = activeCat === "all" || s.categorySlug === activeCat;
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [playlistSources, activeCat, search]);

  const filteredPodcasts = useMemo(() => {
    return podcastSources.filter((s) => {
      const matchCat = activeCat === "all" || s.categorySlug === activeCat;
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [podcastSources, activeCat, search]);

  /** Menü / kategori — URL slug ile senkron */
  function navTo(v: View, category?: string | null) {
    setPlaying(null);
    setPlayingVideo(null);
    setSidebarOpen(false);
    setSearch("");
    const c = category != null ? String(category).trim() : "";
    const cat =
      (v === "kanallar" || v === "playlists" || v === "podcasts") && c.length > 0 ? c : null;
    setLocation(yektubeSectionPath(v, pathHome, cat));
  }

  const setSectionCategory = useCallback(
    (cat: string) => {
      if (view === "kanallar" || view === "playlists" || view === "podcasts") {
        setLocation(yektubeSectionPath(view, pathHome, cat === "all" ? null : cat));
      } else {
        setActiveCat(cat);
      }
    },
    [view, pathHome, setLocation],
  );

  const logoText1 = settings?.logoText1 || "Yek";
  const logoText2 = settings?.logoText2 || "pare";

  if (isError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-bold text-zinc-800 mb-2">Yektube şu an yüklenemedi</p>
        <p className="text-sm text-zinc-600 mb-6 max-w-md">
          Kanal listesi alınamadı (ağ veya sunucu). İnternet bağlantınızı kontrol edip yeniden deneyin.
        </p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="rounded-lg bg-[#039D55] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#028347]"
        >
          Yeniden dene
        </button>
      </div>
    );
  }

  const onHomeBrowse = view === "anasayfa" && onBrowse;
  /** Yekpare /yektube anasayfa — geniş gradient band + içerik bindirme (mobil YouTube modunda kapalı) */
  const showTallHeroBand = !isHmEmbed && onHomeBrowse && !isYtMobile;

  const showDesktopSubNav = isHmEmbed || !isMobile;
  const showBrowseChrome = onBrowse && (showDesktopSubNav || showSearchRow);

  const yektubeSubNav = showDesktopSubNav ? (
    <nav className="w-full">
      <div className={`flex h-11 w-full items-center gap-0 overflow-x-auto text-[12px] font-bold uppercase text-slate-600 ${YEKPARE_PAGE_CONTAINER_CLASS}`}>
        <div className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap border-r border-emerald-100/60 px-3">
          <YektubePlayerMark className="h-5 w-auto max-w-[7.5rem] shrink-0 object-contain" />
        </div>
        {(["anasayfa", "kanallar", "playlists", "podcasts", "videolar", "shorts", "rastgele", "onecikanlar"] as View[]).map((v) => (
          <Link
            key={v}
            href={yektubeSectionPath(v, pathHome)}
            onClick={() => {
              setPlaying(null);
              setPlayingVideo(null);
              setSidebarOpen(false);
              setSearch("");
            }}
            className={`flex h-11 shrink-0 items-center whitespace-nowrap border-r border-emerald-50/80 px-4 transition-colors ${
              view === v
                ? "bg-white/70 text-[#039D55] backdrop-blur"
                : "text-slate-600 hover:bg-white/60 hover:text-[#039D55]"
            }`}
          >
            {v === "anasayfa"
              ? "ANA SAYFA"
              : v === "kanallar"
                ? "KANALLAR"
                : v === "playlists"
                  ? "OYNATMA LİSTELERİ"
                  : v === "podcasts"
                    ? "SESLİ GÜNLÜK"
                    : v === "videolar"
                      ? "VİDEOLAR"
                      : v === "shorts"
                        ? "YEKÇEK"
                      : v === "rastgele"
                        ? "RASTGELE"
                        : "ÖNE ÇIKANLAR"}
          </Link>
        ))}
        <Link
          href={canliTvHref}
          className="flex h-11 shrink-0 items-center whitespace-nowrap border-r border-emerald-50/80 px-4 text-slate-600 transition-colors hover:bg-white/60 hover:text-[#039D55]"
        >
          CANLI YAYIN
        </Link>
        {isStandaloneYektube ? (
          <Link
            href="/"
            className="flex h-11 shrink-0 items-center whitespace-nowrap border-r border-emerald-50/80 px-4 text-[11px] font-black tracking-wide text-slate-500 transition-colors hover:bg-white/60 hover:text-[#039D55]"
          >
            YEKPARE
          </Link>
        ) : null}
        <div className="flex-1" />
        {!(isStandaloneYektube && isMobile) ? (
          <button
            type="button"
            onClick={() => setSidebarOpen((p) => !p)}
            className="p-2 text-slate-600 transition-colors hover:bg-white/60 lg:hidden"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </nav>
  ) : null;

  const yektubeSearchRow = showSearchRow ? (
    <div className={`px-3 py-2 ${YEKPARE_PAGE_CONTAINER_CLASS}`}>
      <YektubeTopSearchBar
        value={search}
        onChange={setSearch}
        onSubmit={submitYektubeSearch}
        pathHome={pathHome}
        showSubmitButton
        className="mx-auto w-full max-w-3xl"
        inputClassName="w-full rounded-full border border-white/70 bg-white/35 py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm backdrop-blur-md placeholder:text-slate-500 focus:border-[#039D55]/45 focus:bg-white/55 focus:outline-none focus:ring-2 focus:ring-[#039D55]/25"
        placeholder={YEKTUBE_INLINE_SEARCH_PLACEHOLDER}
      />
    </div>
  ) : null;

  const yektubeSubNavStack =
    showBrowseChrome || (showDesktopSubNav && onBrowse) ? (
      <>
        {showDesktopSubNav ? yektubeSubNav : null}
        {showSearchRow ? yektubeSearchRow : null}
      </>
    ) : null;

  const showSubNavBand = onBrowse && Boolean(yektubeSubNavStack);
  const subNavGlass = showSubNavBand
    ? "border-b border-emerald-100/40 bg-white/25 backdrop-blur-md supports-[backdrop-filter]:bg-white/20"
    : "border-b border-emerald-100 bg-white/90 backdrop-blur-sm shadow-sm";

  return (
    <YektubeMobileModeProvider active={isYtMobile}>
    <div
      className={`sade-public-page yektube-page-surface flex min-h-screen flex-col text-gray-900${isHmEmbed ? " yektube-page--hm-embed" : ""}${isYtMobile ? " yektube-page--yt-mobile bg-white" : ""}`}
      style={{
        ...(isYtMobile ? {} : sadePublicHeroFadeStyle(YEKTUBE_PAGE_SURFACE_BG)),
        ["--hm-yt-aside-top" as string]: `${mobileAsideTopPx}px`,
        ["--yektube-yt-mobile-top" as string]: isYtMobile && onBrowse ? "48px" : "0px",
      } as CSSProperties}
    >
      {isYtMobile && onBrowse ? (
        <>
          <YektubeMobileTopBar
            pathHome={pathHome}
            view={view}
            onSearchClick={() => setMobileSearchOpen(true)}
          />
          <YektubeMobileSearchOverlay
            pathHome={pathHome}
            open={mobileSearchOpen}
            onClose={() => setMobileSearchOpen(false)}
            initialQuery={search || urlQuery}
          />
        </>
      ) : null}
      {showSubNavBand ? (
        <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
          <div
            className={`${SADE_PUBLIC_HERO_SURFACE_CLASS} ${
              showTallHeroBand ? SADE_PUBLIC_HERO_YEKTUBE_BAND_CLASS : SADE_PUBLIC_HERO_SUBNAV_ONLY_CLASS
            }`}
            style={sadePublicHeroFadeStyle(YEKTUBE_PAGE_SURFACE_BG)}
          >
            <div className={subNavGlass}>{yektubeSubNavStack}</div>
          </div>
        </div>
      ) : yektubeSubNavStack ? (
        <div className={`sticky z-[35] ${subNavGlass}`} style={{ top: stickyTopPx }}>
          {yektubeSubNavStack}
        </div>
      ) : null}

      <div
        className={`yektube-shell-body flex min-h-0 w-full flex-1 flex-col overflow-hidden ${showTallHeroBand ? "yektube-home-content-lift" : ""} ${isYtMobile && onBrowse ? "pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]" : isStandaloneYektube && isMobile && onBrowse ? "pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]" : ""} ${isYtMobile ? "max-w-none px-0" : YEKPARE_PAGE_CONTAINER_CLASS}`}
      >
        <div className="yektube-shell-body flex min-h-0 flex-1 overflow-hidden">
        {/* ── SIDEBAR ── */}
        <aside
          className={`fixed left-0 z-[34] w-56 shrink-0 overflow-y-auto border-r border-emerald-100 bg-white transition-transform duration-200 max-lg:[top:var(--hm-yt-aside-top)] max-lg:h-[calc(100dvh-var(--hm-yt-aside-top))] lg:relative lg:top-0 lg:h-auto lg:min-h-[calc(100vh-8rem)] lg:bg-white ${
            isStandaloneYektube && isMobile
              ? "hidden"
              : sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="space-y-4 p-3">
            <div className="rounded-xl border border-emerald-100 bg-white p-2 shadow-sm">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Menü</p>
              {[
                { v: "anasayfa" as View, label: "Ana Sayfa", icon: Home },
                { v: "kanallar" as View, label: "Kanallar", icon: Grid3X3 },
                { v: "playlists" as View, label: "Oynatma Listeleri", icon: ListVideo },
                { v: "podcasts" as View, label: "Sesli Günlük", icon: Mic },
                { v: "videolar" as View, label: "Videolar", icon: Film },
                { v: "shorts" as View, label: "Yekçek", icon: Smartphone },
                { v: "rastgele" as View, label: "Rastgele", icon: Shuffle },
                { v: "onecikanlar" as View, label: "Öne Çıkanlar", icon: Star },
              ].map(({ v, label, icon: Icon }) => (
                <Link
                  key={v}
                  href={yektubeSectionPath(v, pathHome)}
                  onClick={() => {
                    setPlaying(null);
                    setPlayingVideo(null);
                    setSidebarOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    view === v
                      ? "bg-emerald-50 text-[#039D55]"
                      : "text-slate-600 hover:bg-emerald-50/60 hover:text-[#039D55]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              ))}
              <Link
                href={canliTvHref}
                onClick={() => setSidebarOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50/60 hover:text-[#039D55]"
              >
                <Radio className="h-4 w-4 shrink-0" />
                Canlı Yayın
              </Link>
            </div>

            {liveChannels.length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-white p-2 shadow-sm">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Popüler</p>
                <Link
                  href={canliTvHref}
                  onClick={() => setSidebarOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-50/60 hover:text-[#039D55]"
                >
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#039D55]" />
                  </div>
                  Canlı Yayın TV
                </Link>
              </div>
            )}

            {categories.length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-white p-2 shadow-sm">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Kategoriler</p>
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={yektubeSectionPath("kanallar", pathHome, cat)}
                    onClick={() => {
                      setPlaying(null);
                      setPlayingVideo(null);
                      setSidebarOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      activeCat === cat && (view === "kanallar" || view === "playlists" || view === "podcasts")
                        ? "bg-emerald-50 font-semibold text-[#039D55]"
                        : "text-slate-600 hover:bg-emerald-50/60 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: CAT_COLORS[cat] || YEKTUBE_ACCENT }}
                      />
                      <span>{CAT_LABELS[cat] || cat}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{channelCatCounts[cat] || 0}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div
            className="fixed bottom-0 left-0 right-0 z-[33] bg-black/60 max-lg:[top:var(--hm-yt-aside-top)] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── MAIN CONTENT (oynatma sayfa içinde — YouTube tarzı) ── */}
        <main
          className={`yektube-shell-main flex-1 ${view === "shorts" ? "yektube-shell-main--shorts overflow-hidden bg-black" : "overflow-y-auto"} ${isYtMobile && onBrowse && view !== "shorts" ? "pt-12" : ""}`}
        >
          {isLoading && !sources ? (
            <div className="p-6">
              <LoadingGrid />
            </div>
          ) : playingVideo || playing ? (
            <WatchExperience
              playingVideo={playingVideo}
              playing={playing}
              sources={sources}
              channelLogoUrl={
                playingVideo?.sourceId != null
                  ? (sources ?? []).find((s) => s.id === playingVideo.sourceId)?.logoUrl ?? null
                  : playing?.logoUrl ?? null
              }
              onClose={() => {
                setPlayingVideo(null);
                setPlaying(null);
              }}
              onSelectVideo={(v) => {
                setPlayingVideo(v);
                setPlaying(null);
              }}
              onSelectSource={(s) => {
                if (s.isLive || s.sourceType === "live") {
                  window.location.href = yektubeCanliTvPath(pathHome, s.id);
                  return;
                }
                setPlaying(s);
                setPlayingVideo(null);
              }}
              pathHome={pathHome}
            />
          ) : (
            <>
              {view === "anasayfa" && isYtMobile ? (
                <YektubeMobileAnaSayfa
                  categories={categories}
                  catLabels={CAT_LABELS}
                  pathHome={pathHome}
                  onPlay={(v) => setPlayingVideo(v as VideoItem)}
                />
              ) : null}
              {view === "anasayfa" && !isYtMobile ? (
                <AnaSayfaView
                  sources={channelOnlySources}
                  playlistSources={playlistSources}
                  podcastSources={podcastSources}
                  liveChannels={liveChannels}
                  categories={categories}
                  channelCatCounts={channelCatCounts}
                  playlistCatCounts={playlistCatCounts}
                  podcastCatCounts={podcastCatCounts}
                  isLoading={isLoading}
                  onPlayVideo={setPlayingVideo}
                  onNavigate={(v, cat) => {
                    navTo(v, cat);
                  }}
                  canliTvHref={canliTvHref}
                  pathHome={pathHome}
                />
              ) : null}
              {view === "kanallar" && (
                <KanallarView
                  filtered={filteredChannels}
                  allSources={channelOnlySources}
                  activeCat={activeCat}
                  setActiveCat={setSectionCategory}
                  search={search}
                  setSearch={setSearch}
                  isLoading={isLoading}
                  catCounts={channelCatCounts}
                  categories={categories}
                />
              )}
              {view === "playlists" && (
                <ListSourcesView
                  title="OYNATMA LİSTELERİ"
                  icon={<ListVideo className="h-5 w-5 text-[#039D55]" />}
                  emptyIcon={<ListVideo className="w-10 h-10 mx-auto mb-3 opacity-30" />}
                  emptyText="Bu kategoride oynatma listesi yok"
                  unitLabel="liste"
                  filtered={filteredPlaylists}
                  allSources={playlistSources}
                  activeCat={activeCat}
                  setActiveCat={setSectionCategory}
                  isLoading={isLoading}
                  catCounts={playlistCatCounts}
                  categories={categories}
                />
              )}
              {view === "podcasts" && (
                <ListSourcesView
                  title="SESLİ GÜNLÜK"
                  icon={<Mic className="h-5 w-5 text-[#039D55]" />}
                  emptyIcon={<Mic className="w-10 h-10 mx-auto mb-3 opacity-30" />}
                  emptyText="Bu kategoride sesli günlük yok"
                  unitLabel="sesli günlük"
                  filtered={filteredPodcasts}
                  allSources={podcastSources}
                  activeCat={activeCat}
                  setActiveCat={setSectionCategory}
                  isLoading={isLoading}
                  catCounts={podcastCatCounts}
                  categories={categories}
                />
              )}
              {view === "videolar" && <VideolarView categories={categories} onPlay={setPlayingVideo} />}
              {view === "shorts" && <YektubeShortsReel pathHome={pathHome} />}
              {view === "rastgele" && (
                <RastgeleView categories={categories} onPlay={setPlayingVideo} />
              )}
              {view === "onecikanlar" && (
                <OneCikanlarView sources={channelOnlySources} isLoading={isLoading} />
              )}
              {view === "ara" && (
                <YektubeSearchView
                  query={urlQuery || search}
                  pathHome={pathHome}
                  onPlay={setPlayingVideo}
                  onSearch={submitYektubeSearch}
                />
              )}
            </>
          )}
        </main>
        </div>
      </div>
      {isYtMobile && onBrowse ? (
        <YektubeMobileBottomNav pathHome={pathHome} view={view} canliTvHref={canliTvHref} />
      ) : null}
    </div>
    </YektubeMobileModeProvider>
  );
}

function SidebarVideoRow({
  video,
  onClick,
  active,
}: {
  video: VideoItem;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex gap-2 p-2 rounded-xl text-left transition-colors ${
        active ? "bg-zinc-100 ring-1 ring-zinc-200" : "hover:bg-zinc-50"
      }`}
    >
      <div className="relative w-[168px] shrink-0 aspect-video bg-zinc-200 rounded-lg overflow-hidden">
        <span className="pointer-events-none absolute top-1 left-1 z-[1] rounded bg-[#039D55] px-[4px] py-0.5 text-[7px] font-black uppercase tracking-wide text-white shadow-sm">
          Yektube
        </span>
        <YektubeVideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          className="w-full h-full object-cover"
        />
        {video.duration ? (
          <span className="absolute bottom-1 right-1 bg-black/85 text-white text-[11px] font-medium px-1 py-0.5 rounded">
            {video.duration}
          </span>
        ) : null}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug">
          {recommendationVideoTitle(video.title, video.channelName)}
        </p>
        <p className="text-xs text-zinc-500 mt-1 truncate">{video.channelName || "Yektube"}</p>
        {video.publishedAt ? (
          <p className="text-[11px] text-zinc-400 mt-0.5">{video.publishedAt}</p>
        ) : null}
      </div>
    </button>
  );
}

export function WatchExperience({
  playingVideo,
  playing,
  sources,
  onClose,
  onSelectVideo,
  onSelectSource,
  sharePageUrl = null,
  channelLogoUrl = null,
  sidebarTitle = "Sıradakiler",
  sidebarLiveChannels = null,
  onSelectLiveChannel = null,
  pathHome: pathHomeProp,
  liveTvPlaylistLayout = false,
  liveChatVideoId = null,
}: {
  playingVideo: VideoItem | null;
  playing: Source | null;
  sources: Source[] | undefined;
  onClose: () => void;
  onSelectVideo: (v: VideoItem) => void;
  onSelectSource: (s: Source) => void;
  /** Paylaşım / yerleştirme; yoksa `window.location.href` */
  sharePageUrl?: string | null;
  /** Kanal izle sayfasında avatar yerine logo URL */
  channelLogoUrl?: string | null;
  sidebarTitle?: string;
  /** Canlı TV: sağ sütunda diğer canlı kanallar */
  sidebarLiveChannels?: Source[] | null;
  onSelectLiveChannel?: ((s: Source) => void) | null;
  pathHome?: string;
  /** Canlı TV playlist sayfası — geri butonu ve tekrarlayan meta gizlenir */
  liveTvPlaylistLayout?: boolean;
  /** Canlı sohbet embed — oynatıcının hemen altında */
  liveChatVideoId?: string | null;
}) {
  const ytMobile = useYektubeMobileChrome();
  const hmTv = useHmVideoTvLayout();
  const pathHome = pathHomeProp ?? hmTv?.pathHome ?? YEKTUBE_HOME;

  const [related, setRelated] = useState<VideoItem[]>([]);
  const [similar, setSimilar] = useState<VideoItem[]>([]);
  const [relLoading, setRelLoading] = useState(true);
  const [descOpen, setDescOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [inlineSearch, setInlineSearch] = useState("");
  const [, setSearchLocation] = useLocation();

  const submitInlineSearch = useCallback(
    (q?: string) => {
      const query = (q ?? inlineSearch).trim();
      setSearchLocation(yektubeSearchPath(pathHome, query || undefined));
    },
    [inlineSearch, pathHome, setSearchLocation],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [playingVideo?.id, playing?.id]);

  useEffect(() => {
    let cancelled = false;
    setRelLoading(true);
    const run = async () => {
      try {
        if (sidebarLiveChannels && sidebarLiveChannels.length > 0) {
          if (!cancelled) setRelated([]);
          return;
        }
        if (playingVideo) {
          const p = new URLSearchParams({ limit: "28" });
          if (playingVideo.sourceId) p.set("sourceId", String(playingVideo.sourceId));
          else if (playingVideo.categorySlug) p.set("categorySlug", playingVideo.categorySlug);
          if (!isYekcekVideo(playingVideo)) p.set("excludeStories", "true");
          const r = await fetch(`/api/video/videos?${p}`);
          const data = await r.json();
          const items: VideoItem[] = (data.items ?? []).filter(
            (x: VideoItem) =>
              x.id !== playingVideo.id &&
              x.videoId !== playingVideo.videoId &&
              (isYekcekVideo(playingVideo) ? isYekcekVideo(x) : !isYekcekVideo(x)),
          );
          if (!cancelled) setRelated(items.slice(0, 22));
        } else if (playing) {
          const r = await fetch(`/api/video/videos?sourceId=${encodeURIComponent(String(playing.id))}&limit=28`);
          const data = await r.json();
          if (!cancelled) setRelated(data.items ?? []);
        }
      } catch {
        if (!cancelled) setRelated([]);
      } finally {
        if (!cancelled) setRelLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [playingVideo, playing, sidebarLiveChannels]);

  useEffect(() => {
    let cancelled = false;
    if (!playingVideo?.id || playingVideo.id <= 0) {
      setSimilar([]);
      return;
    }
    fetch(`/api/video/videos/${playingVideo.id}/similar?limit=8`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) {
          const items = ((data.items ?? []) as VideoItem[]).filter((v) =>
            isYekcekVideo(playingVideo) ? isYekcekVideo(v) : !isYekcekVideo(v),
          );
          setSimilar(items);
        }
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => {
      cancelled = true;
    };
  }, [playingVideo?.id]);

  const embedUrl = playingVideo
    ? enhanceYoutubeIframeSrc(
        `https://www.youtube-nocookie.com/embed/${playingVideo.videoId}?autoplay=1`,
      )
    : playing
      ? playing.isLive
        ? (() => {
            const vid = resolveLiveVideoId(playing);
            return vid
              ? enhanceYoutubeIframeSrc(`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1`)
              : embedSrc(playing, true);
          })()
        : embedSrc(playing, true)
      : "";

  const title = playingVideo?.title ?? playing?.name ?? "";
  const channelLabel = playingVideo?.channelName ?? playing?.name ?? "Kanal";
  const description = playingVideo?.description?.trim() || "";
  const initial = channelLabel.charAt(0).toUpperCase();

  const pageShareUrl =
    (sharePageUrl && sharePageUrl.trim()) ||
    (typeof window !== "undefined" ? window.location.href : "");

  const sourceForVideo =
    playingVideo?.sourceId != null && sources
      ? sources.find((s) => s.id === playingVideo.sourceId)
      : undefined;

  const videoShareUrl =
    playingVideo?.sourceId != null
      ? absoluteUrl(yektubeWatchPath(playingVideo.sourceId, playingVideo.videoId, pathHome))
      : pageShareUrl;

  const channelShareUrl =
    sourceForVideo != null
      ? absoluteUrl(yektubeChannelPath(sourceForVideo.id, pathHome))
      : playing != null
        ? absoluteUrl(yektubeChannelPath(playing.id, pathHome))
        : "";

  const playlistShareUrl =
    sourceForVideo && isListSourceType(sourceForVideo.sourceType)
      ? absoluteUrl(yektubePlaylistPath(sourceForVideo.id, pathHome))
      : playing && isListSourceType(playing.sourceType)
        ? absoluteUrl(yektubePlaylistPath(playing.id, pathHome))
        : "";

  const primaryShareUrl =
    playingVideo?.sourceId != null ? videoShareUrl : pageShareUrl;

  const titleEsc = title.replace(/"/g, "&quot;");

  const yektubeEmbedCode =
    playingVideo?.sourceId != null
      ? `<iframe width="560" height="315" src="${absoluteUrl(
          yektubeWatchPath(playingVideo.sourceId, playingVideo.videoId, pathHome),
        )}" title="${titleEsc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : playing != null
        ? `<iframe width="560" height="315" src="${absoluteUrl(yektubeChannelPath(playing.id, pathHome))}" title="${titleEsc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : "";

  const youtubeEmbedCode = playingVideo
    ? `<iframe width="560" height="315" src="${enhanceYoutubeIframeSrc(`https://www.youtube-nocookie.com/embed/${playingVideo.videoId}`)}" title="${titleEsc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    : playing
      ? `<iframe width="560" height="315" src="${embedSrc(playing, false)}" title="${titleEsc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : "";

  const copyText = (text: string, key: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const copyPage = () => copyText(primaryShareUrl, "page");

  const sharePage = () => {
    if (navigator.share) {
      void navigator
        .share({ title, text: title, url: primaryShareUrl })
        .catch(() => copyPage());
    } else {
      copyPage();
    }
  };

  return (
    <div className="min-h-full bg-white">
      <div className={ytMobile ? "py-0" : `${YEKPARE_PAGE_CONTAINER_CLASS} ${liveTvPlaylistLayout ? "py-2" : "py-4"}`}>
        {!liveTvPlaylistLayout ? (
          <button
            type="button"
            onClick={onClose}
            className={`flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors ${ytMobile ? "px-3 py-2" : "mb-4"}`}
          >
            <ChevronLeft className="w-4 h-4" />
            Geri
          </button>
        ) : null}

        <div className={`flex flex-col xl:flex-row gap-6 xl:gap-8 xl:items-start ${ytMobile ? "gap-0" : ""}`}>
          {/* Sol: oynatıcı + meta */}
          <div className={`flex-1 min-w-0 ${ytMobile ? "px-0" : ""}`}>
            {playingVideo?.videoId && playingVideo.platform === "youtube" ? (
              <YektubeWatchPlayer
                videoId={playingVideo.videoId}
                title={title}
                thumbnail={playingVideo.thumbnail}
                embedAllowed={playingVideo.embedAllowed}
                className="w-full"
              />
            ) : (
              <div className={`relative aspect-video w-full bg-black overflow-hidden ${ytMobile ? "" : "rounded-xl shadow-sm ring-1 ring-zinc-200"}`}>
                <iframe
                  key={embedUrl}
                  title={title}
                  src={embedUrl}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
                <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-2 sm:p-3">
                  <YektubePlayerMark
                    coverYoutubeCorner
                    className="h-6 sm:h-8 w-auto max-w-[min(46%,11rem)] object-contain object-bottom drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
                  />
                </div>
              </div>
            )}

            {liveChatVideoId ? (
              <div className={`${ytMobile ? "mt-3 px-3" : "mt-4"}`}>
                <YektubeLiveChatPanel youtubeVideoId={liveChatVideoId} isLive compact={ytMobile} />
              </div>
            ) : null}

            {!liveTvPlaylistLayout ? (
              <h1 className={`font-bold text-zinc-900 leading-snug ${ytMobile ? "mt-2 px-3 text-base" : "mt-3 text-lg sm:text-xl"}`}>{title}</h1>
            ) : null}

            {!liveTvPlaylistLayout ? (
            <div className={`mt-3 flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${ytMobile ? "px-3" : ""}`}>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {channelLogoUrl?.trim() ? (
                    <img
                      src={channelLogoUrl.trim()}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 bg-white"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                      style={{ background: channelColor(channelLabel) }}
                    >
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{channelLabel}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {playing ? <TypeBadge type={playing.sourceType} small /> : null}
                      {playingVideo ? (
                        <span className="text-xs font-bold text-zinc-500 uppercase">Video</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <YektubeTopSearchBar
                  value={inlineSearch}
                  onChange={setInlineSearch}
                  onSubmit={submitInlineSearch}
                  pathHome={pathHome}
                  className="w-full min-w-0 sm:w-auto sm:min-w-[12rem] sm:max-w-xs"
                  placeholder={YEKTUBE_INLINE_SEARCH_PLACEHOLDER}
                  inputClassName={YEKTUBE_INLINE_SEARCH_INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={copyPage}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-800 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied === "page" ? "Kopyalandı" : "Bağlantıyı kopyala"}
                  </button>
                  <button
                    type="button"
                    onClick={sharePage}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-800 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Paylaş
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmbedOpen((o) => !o)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-colors ${
                      embedOpen ? "bg-zinc-900 text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    Yerleştir
                  </button>
                </div>
                {(playingVideo?.sourceId != null || channelShareUrl) && (
                  <div className="flex flex-wrap justify-end gap-1.5 max-w-[min(100%,22rem)]">
                    {playingVideo?.sourceId != null ? (
                      <button
                        type="button"
                        onClick={() => copyText(videoShareUrl, "vid")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 bg-white text-[10px] font-bold text-zinc-700 hover:bg-zinc-50"
                      >
                        <Link2 className="w-3 h-3" />
                        {copied === "vid" ? "Video ✓" : "Video linki"}
                      </button>
                    ) : null}
                    {channelShareUrl ? (
                      <button
                        type="button"
                        onClick={() => copyText(channelShareUrl, "ch")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 bg-white text-[10px] font-bold text-zinc-700 hover:bg-zinc-50"
                      >
                        <Link2 className="w-3 h-3" />
                        {copied === "ch" ? "Kanal ✓" : "Kanal sayfası"}
                      </button>
                    ) : null}
                    {playlistShareUrl ? (
                      <button
                        type="button"
                        onClick={() => copyText(playlistShareUrl, "pl")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 bg-white text-[10px] font-bold text-zinc-700 hover:bg-zinc-50"
                      >
                        <Link2 className="w-3 h-3" />
                        {copied === "pl" ? "Liste ✓" : "Playlist linki"}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            ) : null}

            {embedOpen ? (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
                <p className="text-xs font-bold text-zinc-600">
                  Sitenize yerleştirmek için aşağıdaki HTML kodunu kopyalayın ({YEKTUBE_HOME} veya harici oynatıcı).
                </p>
                {yektubeEmbedCode ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-zinc-500">Yektube (sayfa)</span>
                      <button
                        type="button"
                        onClick={() => copyText(yektubeEmbedCode, "embY")}
                        className="text-[10px] font-bold text-[#039D55] hover:underline"
                      >
                        {copied === "embY" ? "Kopyalandı" : "Kopyala"}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={3}
                      className="w-full text-[11px] font-mono rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800"
                      value={yektubeEmbedCode}
                    />
                  </div>
                ) : null}
                {youtubeEmbedCode ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-zinc-500">Harici oynatıcı (embed)</span>
                      <button
                        type="button"
                        onClick={() => copyText(youtubeEmbedCode, "embT")}
                        className="text-[10px] font-bold text-[#039D55] hover:underline"
                      >
                        {copied === "embT" ? "Kopyalandı" : "Kopyala"}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={3}
                      className="w-full text-[11px] font-mono rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800"
                      value={youtubeEmbedCode}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {description ? (
              <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-100 p-4 text-sm text-zinc-700">
                <p className={descOpen ? "" : "line-clamp-3 whitespace-pre-wrap"}>{description}</p>
                {description.length > 180 ? (
                  <button
                    type="button"
                    className="text-xs font-bold text-zinc-900 mt-2 hover:underline"
                    onClick={() => setDescOpen((o) => !o)}
                  >
                    {descOpen ? "Daha az" : "Devamını oku"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {playingVideo?.videoId && !liveTvPlaylistLayout ? <YektubeEngagement videoId={playingVideo.videoId} /> : null}

            {playingVideo && similar.length > 0 ? (
              <SimilarVideosBox items={similar} accent={YEKTUBE_ACCENT} onSelect={onSelectVideo} />
            ) : null}
          </div>

          {/* Sağ: sıradaki videolar (YouTube sütunu) */}
          <aside className={`w-full shrink-0 xl:w-[402px] xl:sticky xl:top-4 self-start ${ytMobile ? "px-3 pb-6" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-zinc-900">{sidebarTitle}</h2>
              <span className="text-xs text-zinc-400">
                {sidebarLiveChannels
                  ? sidebarLiveChannels.length
                  : relLoading
                    ? "…"
                    : related.length}
              </span>
            </div>
            <div className={`flex flex-col gap-1 pr-1 -mr-1 ${ytMobile ? "" : "max-h-[calc(100vh-12rem)] overflow-y-auto"}`}>
              {sidebarLiveChannels && sidebarLiveChannels.length > 0 ? (
                sidebarLiveChannels.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectLiveChannel?.(s)}
                    className={`flex w-full gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-zinc-50 ${
                      playingVideo?.sourceId === s.id || playing?.id === s.id ? "bg-emerald-50 ring-1 ring-[#039D55]/30" : ""
                    }`}
                  >
                    <div className="relative w-[168px] aspect-video shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {(() => {
                        const cover =
                          sourceCoverSrc(s) ||
                          (playingVideo?.sourceId === s.id && playingVideo.thumbnail
                            ? normalizeYoutubeImageSrc(playingVideo.thumbnail)
                            : "");
                        const vid = resolveLiveVideoId(s);
                        if (cover) {
                          return (
                            <img
                              src={cover}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          );
                        }
                        if (vid) {
                          return (
                            <YektubeVideoThumb
                              videoId={vid}
                              className="h-full w-full object-cover"
                            />
                          );
                        }
                        if (s.logoUrl) {
                          return (
                            <div className="flex h-full w-full items-center justify-center bg-zinc-900 p-3">
                              <img
                                src={normalizeYoutubeImageSrc(s.logoUrl)}
                                alt=""
                                className="max-h-full max-w-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          );
                        }
                        return (
                          <span
                            className="flex h-full w-full items-center justify-center text-lg font-black"
                            style={{ color: channelColor(s.name) }}
                          >
                            {s.name.charAt(0)}
                          </span>
                        );
                      })()}
                      <span className="absolute left-1 top-1 rounded bg-[#039D55] px-1 py-0.5 text-[8px] font-bold uppercase text-white">
                        Canlı
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <p className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug">{s.name}</p>
                      <p className="mt-1 text-[11px] font-bold uppercase text-[#039D55]">Canlı yayın</p>
                    </div>
                  </button>
                ))
              ) : relLoading ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-2 animate-pulse">
                      <div className="w-[168px] aspect-video bg-zinc-200 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-zinc-200 rounded w-full" />
                        <div className="h-3 bg-zinc-200 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : related.length === 0 ? (
                <p className="text-sm text-zinc-500 py-6">Önerilen video bulunamadı.</p>
              ) : (
                related.map((v) => (
                  <SidebarVideoRow
                    key={v.id}
                    video={v}
                    active={playingVideo?.id === v.id}
                    onClick={() => onSelectVideo(v)}
                  />
                ))
              )}
            </div>

            {playing && sources && sources.filter((s) => s.active && s.id !== playing.id).length > 0 ? (
              <div className="mt-8 pt-6 border-t border-zinc-200">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Diğer kanallar</h3>
                <div className="grid grid-cols-3 gap-2">
                  {sources
                    .filter((s) => s.active && s.id !== playing.id)
                    .slice(0, 6)
                    .map((s) => (
                      <ChannelCard key={s.id} source={s} compact />
                    ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  SON EKLENEN (uzun) + YEKÇEK — haber kutusu düzeni   */
/* ─────────────────────────────────────────────────── */
function HomeVideoBoxes({
  categorySlug,
  pathHome,
  onNavigate,
}: {
  categorySlug: string;
  pathHome: string;
  onNavigate: (v: View, cat?: string) => void;
}) {
  const [longVideos, setLongVideos] = useState<VideoItem[]>([]);
  const [shortVideos, setShortVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const longParams = new URLSearchParams({
      limit: String(NEWS_BOX_VIDEO_LIMIT),
      excludeStories: "true",
      mixChannels: "true",
    });
    const shortParams = new URLSearchParams({
      limit: String(NEWS_BOX_VIDEO_LIMIT),
      mixChannels: "true",
    });
    if (categorySlug && categorySlug !== "all") {
      longParams.set("categorySlug", categorySlug);
      shortParams.set("categorySlug", categorySlug);
    }
    Promise.all([
      fetch(`/api/video/videos?${longParams}`).then((r) => r.json()),
      fetch(`/api/video/shorts?${shortParams}`).then((r) => r.json()),
    ])
      .then(([longData, shortData]) => {
        setLongVideos(longData.items ?? []);
        setShortVideos(shortData.items ?? []);
      })
      .catch(() => {
        setLongVideos([]);
        setShortVideos([]);
      })
      .finally(() => setLoading(false));
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <VideoLoadingGrid />
        <VideoLoadingGrid />
      </div>
    );
  }

  const catLabel =
    categorySlug !== "all"
      ? (CAT_LABELS[categorySlug] || categorySlug).toUpperCase()
      : null;

  return (
    <div className="space-y-6">
      <YektubeNewsVideoGrid
        videos={longVideos}
        pathHome={pathHome}
        badge={longVideos.length ? String(longVideos.length) : undefined}
        onMoreHref={
          categorySlug && categorySlug !== "all"
            ? yektubeSectionPath("videolar", pathHome, categorySlug)
            : yektubeSectionPath("videolar", pathHome)
        }
        header={
          <>
            <Play className="h-4 w-4 text-[#039D55]" />
            <span className="text-sm font-black uppercase tracking-wide text-zinc-900">
              {catLabel ? `${catLabel} · ` : ""}Son Eklenen Videolar
              {!catLabel ? <span className="ml-1 text-[10px] font-bold normal-case text-zinc-400">· farklı kanallardan</span> : null}
            </span>
          </>
        }
        emptyText="Henüz uzun video yok."
      />

      <YektubeNewsVideoGrid
        videos={shortVideos}
        pathHome={pathHome}
        variant="portrait"
        badge={shortVideos.length ? String(shortVideos.length) : undefined}
        onMoreHref={yektubeYekcekPath(pathHome)}
        header={
          <>
            <Smartphone className="h-4 w-4 text-[#039D55]" />
            <span className="text-sm font-black uppercase tracking-wide text-zinc-900">Yekçek</span>
          </>
        }
        emptyText="Henüz Yekçek videosu yok."
      />
    </div>
  );
}

/** Anasayfa — kategori kategori haber kutusu (6×6 uzun video) */
function HomeCategoryVideoSections({
  categories,
  pathHome,
}: {
  categories: string[];
  pathHome: string;
}) {
  const [byCat, setByCat] = useState<Record<string, VideoItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categories.length === 0) {
      setByCat({});
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      categories.map(async (cat) => {
        const params = new URLSearchParams({
          limit: String(NEWS_BOX_VIDEO_LIMIT),
          excludeStories: "true",
          categorySlug: cat,
          mixChannels: "true",
        });
        const r = await fetch(`/api/video/videos?${params}`);
        const data = await r.json();
        return [cat, (data.items ?? []) as VideoItem[]] as const;
      }),
    )
      .then((pairs) => setByCat(Object.fromEntries(pairs)))
      .catch(() => setByCat({}))
      .finally(() => setLoading(false));
  }, [categories]);

  if (loading) return <VideoLoadingGrid />;

  const sections = categories.filter((cat) => (byCat[cat]?.length ?? 0) > 0);
  if (sections.length === 0) return null;

  return (
    <div className="space-y-6">
      {sections.map((cat) => (
        <YektubeNewsVideoGrid
          key={cat}
          videos={byCat[cat] ?? []}
          pathHome={pathHome}
          badge={String(Math.min(byCat[cat]?.length ?? 0, NEWS_BOX_VIDEO_LIMIT))}
          onMoreHref={yektubeSectionPath("videolar", pathHome, cat)}
          header={
            <span className="text-sm font-black uppercase tracking-wide text-zinc-900">
              {(CAT_LABELS[cat] || cat).toUpperCase()}
            </span>
          }
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  ANA SAYFA VIEW                                      */
/* ─────────────────────────────────────────────────── */
function AnaSayfaView({
  sources, playlistSources, podcastSources, liveChannels, categories, channelCatCounts, playlistCatCounts, podcastCatCounts, isLoading, onPlayVideo, onNavigate, canliTvHref, pathHome,
}: {
  sources: Source[];
  playlistSources: Source[];
  podcastSources: Source[];
  liveChannels: Source[];
  categories: string[];
  channelCatCounts: Record<string, number>;
  playlistCatCounts: Record<string, number>;
  podcastCatCounts: Record<string, number>;
  isLoading: boolean;
  onPlayVideo: (v: VideoItem) => void;
  onNavigate: (v: View, cat?: string) => void;
  canliTvHref: string;
  pathHome: string;
}) {
  const [homeCat, setHomeCat] = useState("all");

  const homeTabs = useMemo(() => {
    const tabs = [{ id: "all", label: "TÜMÜ" }];
    for (const cat of categories) {
      tabs.push({ id: cat, label: (CAT_LABELS[cat] || cat).toUpperCase() });
    }
    return tabs;
  }, [categories]);

  const filteredSources = useMemo(
    () => (homeCat === "all" ? sources : sources.filter((s) => s.categorySlug === homeCat)),
    [sources, homeCat],
  );

  const filteredPlaylists = useMemo(
    () => (homeCat === "all" ? playlistSources : playlistSources.filter((s) => s.categorySlug === homeCat)),
    [playlistSources, homeCat],
  );

  const filteredPodcasts = useMemo(
    () => (homeCat === "all" ? podcastSources : podcastSources.filter((s) => s.categorySlug === homeCat)),
    [podcastSources, homeCat],
  );

  const filteredLive = useMemo(
    () => (homeCat === "all" ? liveChannels : liveChannels.filter((s) => s.categorySlug === homeCat)),
    [liveChannels, homeCat],
  );

  if (isLoading) return <LoadingGrid />;

  return (
    <div className="space-y-8 p-4 pb-16 md:p-6">
      {categories.length > 0 ? (
        <YektubeScrollTabs tabs={homeTabs} activeId={homeCat} onChange={setHomeCat} className="-mx-4 px-4 md:-mx-6 md:px-6" />
      ) : null}

      {homeCat === "all" ? (
        <p className="text-xs text-zinc-500">
          Tüm kategorilerden karma içerik — canlı yayınlar, kanallar ve son videolar
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          {(CAT_LABELS[homeCat] || homeCat).toUpperCase()} · {filteredSources.length} kanal
          {channelCatCounts[homeCat] != null ? ` · ${channelCatCounts[homeCat]} kayıt` : ""}
        </p>
      )}

      {/* Canlı Yayınlar */}
      {filteredLive.length > 0 && (
        <section>
          <SectionHeader
            icon={<span className="h-2 w-2 animate-pulse rounded-full bg-[#039D55]" />}
            title="CANLI YAYINLAR"
            badge={`${filteredLive.length}`}
            onMore={() => {
              window.location.href = canliTvHref;
            }}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredLive.slice(0, 6).map((s) => (
              <ChannelCard key={s.id} source={s} />
            ))}
          </div>
        </section>
      )}

      <HomeVideoBoxes categorySlug={homeCat} pathHome={pathHome} onNavigate={onNavigate} />

      {homeCat === "all" && categories.length > 0 ? (
        <HomeCategoryVideoSections categories={categories} pathHome={pathHome} />
      ) : null}

      {/* Kanallar */}
      {filteredSources.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <SectionHeader
            icon={<MonitorPlay className="w-4 h-4 text-zinc-400" />}
            title={homeCat === "all" ? "KANALLAR" : `${(CAT_LABELS[homeCat] || homeCat).toUpperCase()} KANALLARI`}
            badge={`${Math.min(filteredSources.length, NEWS_BOX_VIDEO_LIMIT)}`}
            onMore={() => onNavigate("kanallar", homeCat === "all" ? undefined : homeCat)}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredSources.slice(0, NEWS_BOX_VIDEO_LIMIT).map((s) => (
              <ChannelCard key={s.id} source={s} />
            ))}
          </div>
        </section>
      )}

      {/* Oynatma listeleri */}
      {filteredPlaylists.length > 0 && (
        <section>
          <SectionHeader
            icon={<ListVideo className="w-4 h-4 text-zinc-400" />}
            title={homeCat === "all" ? "OYNATMA LİSTELERİ" : `${(CAT_LABELS[homeCat] || homeCat).toUpperCase()} LİSTELERİ`}
            badge={`${Math.min(filteredPlaylists.length, 12)}`}
            onMore={() => onNavigate("playlists", homeCat === "all" ? undefined : homeCat)}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredPlaylists.slice(0, 12).map((s) => (
              <ChannelCard key={s.id} source={s} />
            ))}
          </div>
        </section>
      )}

      {/* Sesli Günlük */}
      {filteredPodcasts.length > 0 && (
        <section>
          <SectionHeader
            icon={<Mic className="w-4 h-4 text-zinc-400" />}
            title={homeCat === "all" ? "SESLİ GÜNLÜK" : `${(CAT_LABELS[homeCat] || homeCat).toUpperCase()} SESLİ GÜNLÜK`}
            badge={`${Math.min(filteredPodcasts.length, 12)}`}
            onMore={() => onNavigate("podcasts", homeCat === "all" ? undefined : homeCat)}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredPodcasts.slice(0, 12).map((s) => (
              <ChannelCard key={s.id} source={s} />
            ))}
          </div>
        </section>
      )}

      {filteredSources.length === 0 && filteredPlaylists.length === 0 && filteredPodcasts.length === 0 && filteredLive.length === 0 && !isLoading && (
        <div className="text-center py-20 text-gray-400">
          <MonitorPlay className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2 text-gray-600">
            {homeCat === "all" ? "Henüz kanal eklenmemiş" : "Bu kategoride içerik yok"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  KANALLAR VIEW                                       */
/* ─────────────────────────────────────────────────── */
function KanallarView({
  filtered, allSources, activeCat, setActiveCat, search, setSearch,
  isLoading, catCounts, categories,
}: {
  filtered: Source[];
  allSources: Source[];
  activeCat: string;
  setActiveCat: (c: string) => void;
  search: string;
  setSearch: (s: string) => void;
  isLoading: boolean;
  catCounts: Record<string, number>;
  categories: string[];
}) {
  const ytMobile = useYektubeMobileChrome();
  const hmTv = useHmVideoTvLayout();
  const pathHome = hmTv?.pathHome ?? YEKTUBE_HOME;

  return (
    <div className={ytMobile ? "pb-4" : "p-4 md:p-6 pb-16"}>
      {!ytMobile ? (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Tv2 className="h-5 w-5 text-[#039D55]" />
            TÜM KANALLAR
          </h2>
          <span className="text-gray-500 text-sm">{filtered.length} kanal</span>
        </div>
      ) : null}

      <YektubeScrollTabs
        className={ytMobile ? "yektube-yt-mobile-chips sticky z-[40] border-b border-zinc-200 bg-white px-3 py-2 mb-0" : "mb-5"}
        activeId={activeCat}
        onChange={setActiveCat}
        tabs={
          ytMobile
            ? [
                { id: "all", label: "Tümü" },
                ...categories.map((cat) => ({
                  id: cat,
                  label: CAT_LABELS[cat] || cat,
                })),
              ]
            : [
                { id: "all", label: `TÜMÜ ${allSources.length}` },
                ...categories.map((cat) => ({
                  id: cat,
                  label: `${(CAT_LABELS[cat] || cat).toUpperCase()} ${catCounts[cat] || 0}`,
                })),
              ]
        }
      />

      {isLoading ? (
        ytMobile ? (
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-zinc-200" />
                <div className="h-4 flex-1 rounded bg-zinc-200" />
              </div>
            ))}
          </div>
        ) : (
          <LoadingGrid />
        )
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MonitorPlay className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-gray-500">
            {search ? `"${search}" için sonuç bulunamadı` : "Bu kategoride kanal yok"}
          </p>
        </div>
      ) : ytMobile ? (
        <div className="divide-y divide-zinc-100">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={yektubeChannelPath(s.id, pathHome)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50"
            >
              {s.logoUrl?.trim() ? (
                <img src={normalizeYoutubeImageSrc(s.logoUrl.trim())} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: CAT_COLORS[s.categorySlug] || YEKTUBE_ACCENT }}
                >
                  {s.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-zinc-900">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  {(s.videoCount ?? 0) > 0 ? `${s.videoCount} video` : "Kanal"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
          {filtered.map((s) => (
            <ChannelCard key={s.id} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  OYNATMA LİSTELERİ / SESLİ GÜNLÜK VIEW                 */
/* ─────────────────────────────────────────────────── */
function ListSourcesView({
  title,
  icon,
  emptyIcon,
  emptyText,
  unitLabel,
  filtered,
  allSources,
  activeCat,
  setActiveCat,
  isLoading,
  catCounts,
  categories,
}: {
  title: string;
  icon: ReactNode;
  emptyIcon: ReactNode;
  emptyText: string;
  unitLabel: string;
  filtered: Source[];
  allSources: Source[];
  activeCat: string;
  setActiveCat: (c: string) => void;
  isLoading: boolean;
  catCounts: Record<string, number>;
  categories: string[];
}) {
  return (
    <div className="p-4 md:p-6 pb-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <span className="text-gray-500 text-sm">{filtered.length} {unitLabel}</span>
      </div>

      <YektubeScrollTabs
        className="mb-5"
        activeId={activeCat}
        onChange={setActiveCat}
        tabs={[
          { id: "all", label: `TÜMÜ ${allSources.length}` },
          ...categories.map((cat) => ({
            id: cat,
            label: `${(CAT_LABELS[cat] || cat).toUpperCase()} ${catCounts[cat] || 0}`,
          })),
        ]}
      />

      {isLoading ? (
        <LoadingGrid />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {emptyIcon}
          <p className="text-gray-500">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
          {filtered.map((s) => (
            <ChannelCard key={s.id} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  ÖNE ÇIKANLAR VIEW                                   */
/* ─────────────────────────────────────────────────── */
function OneCikanlarView({
  sources, isLoading,
}: {
  sources: Source[];
  isLoading: boolean;
}) {
  const popular = sources.slice(0, 12);

  return (
    <div className="p-4 md:p-6 pb-16 space-y-8">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <h2 className="text-xl font-black tracking-tight">ÖNE ÇIKANLAR</h2>
      </div>

      {isLoading ? <LoadingGrid /> : (
        <>
          {popular.length > 0 && (
            <section>
              <SectionHeader
                icon={<MonitorPlay className="w-4 h-4 text-zinc-400" />}
                title="POPÜLER KANALLAR"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {popular.map((s) => (
                  <ChannelCard key={s.id} source={s} />
                ))}
              </div>
            </section>
          )}

          {sources.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-gray-500">Henüz öne çıkan kanal yok.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  CHANNEL CARD                                        */
/* ─────────────────────────────────────────────────── */
function ChannelCard({
  source, compact = false,
}: {
  source: Source;
  compact?: boolean;
}) {
  const hmTv = useHmVideoTvLayout();
  const pathHm = hmTv?.pathHome ?? undefined;
  const color = channelColor(source.name);
  const initial = source.name.charAt(0).toUpperCase();
  const isLiveChannel = source.isLive || source.sourceType === "live";
  const coverSrc = sourceCoverSrc(source);
  const href = isLiveChannel
    ? yektubeCanliTvPath(pathHm, source.id)
    : isListSourceType(source.sourceType)
      ? yektubePlaylistPath(source.id, pathHm)
      : yektubeChannelPath(source.id, pathHm);

  return (
    <Link
      href={href}
      className={`group flex cursor-pointer flex-col items-center rounded-xl border border-emerald-100 bg-white p-2.5 shadow-sm transition-all hover:border-[#039D55]/30 hover:shadow-md ${compact ? "gap-1.5" : "gap-2.5"}`}
    >
      {/* Logo square */}
      <div
        className={`relative overflow-hidden rounded-xl border border-emerald-100 bg-slate-50 transition-colors group-hover:border-[#039D55]/30 ${
          compact ? "w-full aspect-square" : "w-full aspect-square"
        }`}
        style={{ maxHeight: compact ? 80 : undefined }}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={source.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const next = sourceCoverFallbackSrc(source, e.currentTarget.src);
              if (next) {
                e.currentTarget.src = next;
                return;
              }
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
              const parent = el.parentElement!;
              parent.style.background = `linear-gradient(135deg, ${color}30 0%, #f3f4f6 100%)`;
              parent.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span style="font-size:2rem;font-weight:900;color:${color};">${initial}</span></div>`;
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}25 0%, #f3f4f6 100%)` }}
          >
            <span className="text-3xl font-black" style={{ color }}>{initial}</span>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
          </div>
        </div>

        {/* Live badge */}
        {(source.isLive || source.sourceType === "live") && (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-[#039D55] px-1.5 py-0.5 text-[9px] font-bold text-white">
            <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
            CANLI
          </div>
        )}

        {source.platform !== "youtube" ? (
          <div className="absolute bottom-1.5 right-1.5">
            <PlatformBadge platform={source.platform} />
          </div>
        ) : null}
      </div>

      {/* Name */}
      <p className={`w-full text-center font-semibold leading-tight line-clamp-2 text-slate-700 transition-colors group-hover:text-[#039D55] ${compact ? "text-[10px]" : "text-xs"}`}>
        {source.name}
      </p>
    </Link>
  );
}

/* ─────────────────────────────────────────────────── */
/*  HELPERS                                             */
/* ─────────────────────────────────────────────────── */
function SectionHeader({
  icon, title, badge, onMore,
}: {
  icon?: ReactNode;
  title: string;
  badge?: string;
  onMore?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold uppercase tracking-wider text-slate-700">{title}</span>
        {badge && (
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-[#039D55]">{badge}</span>
        )}
      </div>
      {onMore && (
        <button
          onClick={onMore}
          className="flex items-center gap-0.5 text-xs text-slate-400 transition-colors hover:text-[#039D55]"
        >
          Tümü <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === "youtube") {
    return null;
  }
  if (platform === "dailymotion") {
    return (
      <div className="bg-blue-600 text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">
        DM
      </div>
    );
  }
  return null;
}

function TypeBadge({ type, small = false }: { type: string; small?: boolean }) {
  const map: Record<string, { label: string; icon: ReactNode; color: string }> = {
    live: { label: "CANLI", icon: <Radio className="w-3 h-3" />, color: "text-red-400" },
    playlist: { label: "PLAYLİST", icon: <ListVideo className="w-3 h-3" />, color: "text-purple-400" },
    podcast: { label: "SESLİ GÜNLÜK", icon: <Mic className="w-3 h-3" />, color: "text-violet-400" },
    video: { label: "VİDEO", icon: <Video className="w-3 h-3" />, color: "text-orange-400" },
    channel: { label: "KANAL", icon: <MonitorPlay className="w-3 h-3" />, color: "text-blue-400" },
  };
  const info = map[type] ?? map.channel;
  return (
    <span className={`flex items-center gap-1 ${info.color} ${small ? "text-[10px]" : "text-xs"} font-bold`}>
      {info.icon} {info.label}
    </span>
  );
}

function SimilarVideosBox({
  items,
  accent,
  onSelect,
}: {
  items: VideoItem[];
  accent: string;
  onSelect: (v: VideoItem) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm">
      <div
        className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3"
        style={{ background: `linear-gradient(90deg, ${accent}12, #fff)` }}
      >
        <span className="h-5 w-1 rounded-full" style={{ background: accent }} />
        <h2 className="text-sm font-black uppercase tracking-wide text-zinc-950">Benzer videolar</h2>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          >
            <YektubeVideoThumb
              videoId={item.videoId}
              thumbnail={item.thumbnail}
              className="h-20 w-24 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              {item.categorySlug ? (
                <p className="mb-1 text-[10px] font-black uppercase tracking-wide" style={{ color: accent }}>
                  {VIDEO_TV_CATEGORY_LABELS[item.categorySlug] || item.categorySlug}
                </p>
              ) : null}
              <h3 className="line-clamp-3 text-sm font-black leading-snug text-zinc-900 group-hover:text-emerald-700">
                {recommendationVideoTitle(item.title, item.channelName)}
              </h3>
              <p className="mt-1 truncate text-[11px] font-semibold text-zinc-400">
                {item.channelName || "Yektube"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

const RANDOM_PAGE = 16;

function YektubeSearchView({
  query,
  pathHome,
  onPlay,
  onSearch,
}: {
  query: string;
  pathHome: string;
  onPlay: (v: VideoItem) => void;
  onSearch: (q?: string) => void;
}) {
  const ytMobile = useYektubeMobileChrome();
  const [input, setInput] = useState(query);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{ localCount: number; importedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setVideos([]);
      setMeta(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/video/search?q=${encodeURIComponent(q)}&limit=32&excludeStories=true`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setVideos((data.items ?? []) as VideoItem[]);
        setMeta({
          localCount: typeof data.localCount === "number" ? data.localCount : 0,
          importedCount: typeof data.importedCount === "number" ? data.importedCount : 0,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setVideos([]);
          setMeta(null);
          setError("Arama sonuçları yüklenemedi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className={ytMobile ? "pb-4" : "p-4 md:p-6"}>
      {!ytMobile ? (
        <div className="mb-6 max-w-2xl">
          <h1 className="text-xl font-black text-zinc-900">Yektube&apos;de ara</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Önce Yektube veritabanı, sonra YouTube — sonuçlar anında oynatılabilir.
          </p>
          <div className="mt-4">
            <YektubeTopSearchBar
              value={input}
              onChange={setInput}
              onSubmit={onSearch}
              pathHome={pathHome}
              inputClassName="w-full rounded-xl border border-emerald-100 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#039D55]/30"
            />
          </div>
        </div>
      ) : null}

      {!query.trim() ? (
        <p className={`text-sm text-zinc-500 ${ytMobile ? "px-4 py-8" : ""}`}>Video veya kanal adı yazıp arayın.</p>
      ) : loading ? (
        ytMobile ? (
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-video animate-pulse bg-zinc-200" />
            ))}
          </div>
        ) : (
          <LoadingGrid />
        )
      ) : error ? (
        <p className={`text-sm text-red-600 ${ytMobile ? "px-4" : ""}`}>{error}</p>
      ) : videos.length === 0 ? (
        <p className={`text-sm text-zinc-500 ${ytMobile ? "px-4" : ""}`}>“{query}” için video bulunamadı.</p>
      ) : ytMobile ? (
        <div>
          {videos.map((v) => (
            <YektubeMobileFeedItem key={`${v.videoId}-${v.id}`} video={v} pathHome={pathHome} onPlay={onPlay} />
          ))}
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {videos.length} sonuç
            {meta && meta.importedCount > 0
              ? ` · ${meta.localCount} Yektube · ${meta.importedCount} YouTube'dan eklendi`
              : null}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {videos.map((v) => (
              <button
                key={`${v.videoId}-${v.id}`}
                type="button"
                onClick={() => onPlay(v)}
                className="group min-w-0 text-left"
              >
                <div className="relative aspect-video overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200/80">
                  <YektubeVideoThumb
                    videoId={v.videoId}
                    thumbnail={v.thumbnail}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                  {v.duration ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/85 px-1 py-0.5 text-[10px] font-bold text-white">
                      {v.duration}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-zinc-900 group-hover:text-[#039D55]">
                  {recommendationVideoTitle(v.title, v.channelName)}
                </p>
                {v.channelName ? (
                  <p className="mt-0.5 truncate text-[10px] text-zinc-500">{v.channelName}</p>
                ) : null}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RastgeleView({
  categories,
  onPlay,
}: {
  categories: string[];
  onPlay: (v: VideoItem) => void;
}) {
  const hmTv = useHmVideoTvLayout();
  const pathHm = hmTv?.pathHome ?? YEKTUBE_HOME;
  const [activeCat, setActiveCat] = useState("all");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const videosRef = useRef<VideoItem[]>([]);
  videosRef.current = videos;

  const fetchRandom = useCallback(async (reset: boolean) => {
    setLoading(true);
    try {
      const exclude = reset ? [] : videosRef.current.map((v) => v.id).filter((id) => id > 0);
      const params = new URLSearchParams({ limit: String(RANDOM_PAGE) });
      if (activeCat !== "all") params.set("categorySlug", activeCat);
      if (exclude.length > 0) params.set("exclude", exclude.slice(-120).join(","));
      const r = await fetch(`/api/video/videos/random?${params}`);
      const data = await r.json();
      const items: VideoItem[] = data.items ?? [];
      setVideos((prev) => {
        const merged = reset ? items : [...prev, ...items];
        const seen = new Set<string>();
        return merged.filter((v) => {
          const key = `${v.sourceId}-${v.videoId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
      setHasMore(items.length >= RANDOM_PAGE);
    } finally {
      setLoading(false);
    }
  }, [activeCat]);

  useEffect(() => {
    setVideos([]);
    setHasMore(true);
    void fetchRandom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          void fetchRandom(false);
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, fetchRandom]);

  const cats = ["all", ...categories];

  return (
    <div className="p-4 md:p-6 pb-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Shuffle className="h-5 w-5 text-[#039D55]" />
          RASTGELE
        </h2>
        <button
          type="button"
          onClick={() => void fetchRandom(true)}
          className="text-sm font-bold text-[#039D55] hover:underline"
        >
          Yenile
        </button>
      </div>

      <YektubeScrollTabs
        tabs={cats.map((c) => ({
          id: c,
          label: c === "all" ? "Tümü" : VIDEO_TV_CATEGORY_LABELS[c] || c,
        }))}
        activeId={activeCat}
        onChange={setActiveCat}
        className="mb-4"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((v) => (
          <Link
            key={`${v.sourceId}-${v.videoId}-${v.id}`}
            href={yektubeWatchPath(v.sourceId ?? 0, v.videoId, pathHm)}
            onClick={(e) => {
              e.preventDefault();
              onPlay(v);
            }}
            className="group block"
          >
            <div className="aspect-video rounded-xl overflow-hidden bg-zinc-200 mb-2 relative">
              <YektubeVideoThumb
                videoId={v.videoId}
                thumbnail={v.thumbnail}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <p className="text-sm font-bold text-zinc-900 line-clamp-2">{v.title}</p>
            <p className="text-xs text-zinc-500 truncate">{v.channelName}</p>
          </Link>
        ))}
      </div>

      {loading ? <p className="text-center text-sm text-zinc-500 py-6">Yükleniyor…</p> : null}
      <div ref={sentinelRef} className="h-8" />
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  VİDEOLAR VIEW                                        */
/* ─────────────────────────────────────────────────── */
const VIDEO_PAGE = 24;

function VideolarView({ categories, onPlay }: { categories: string[]; onPlay: (v: VideoItem) => void }) {
  const ytMobile = useYektubeMobileChrome();
  const pathHome = useHmVideoTvLayout()?.pathHome ?? YEKTUBE_HOME;
  const [activeCat, setActiveCat] = useState("all");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const cats = ["all", ...categories] as string[];
  const catLabels: Record<string, string> = {
    all: "Tümü",
    ...VIDEO_TV_CATEGORY_LABELS,
    ...CAT_LABELS,
  };

  const fetchVideos = useCallback(async (cat: string, off: number, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(VIDEO_PAGE), offset: String(off), excludeStories: "true" });
      if (cat !== "all") params.set("categorySlug", cat);
      const r = await fetch(`/api/video/videos?${params}`);
      const data = await r.json();
      const items: VideoItem[] = data.items ?? [];
      setTotal(data.total ?? 0);
      setVideos((prev) => reset ? items : [...prev, ...items]);
      setHasMore(off + items.length < (data.total ?? 0));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setVideos([]);
    setOffset(0);
    setHasMore(true);
    fetchVideos(activeCat, 0, true);
  }, [activeCat, fetchVideos]);

  useEffect(() => {
    if (offset === 0) return;
    fetchVideos(activeCat, offset);
  }, [offset, activeCat, fetchVideos]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setOffset((prev) => prev + VIDEO_PAGE);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading]);

  return (
    <div className={ytMobile ? "pb-4" : "p-4 md:p-6 pb-16"}>
      {!ytMobile ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Film className="h-5 w-5 text-[#039D55]" />
              VİDEOLAR
            </h2>
            <span className="text-gray-500 text-sm">{total} video</span>
          </div>
          <YektubeScrollTabs
            className="mb-5"
            activeId={activeCat}
            onChange={setActiveCat}
            tabs={cats.map((cat) => ({
              id: cat,
              label: cat === "all" ? "TÜMÜ" : (catLabels[cat] || cat).toUpperCase(),
            }))}
          />
        </>
      ) : (
        <YektubeScrollTabs
          className="yektube-yt-mobile-chips sticky z-[40] border-b border-zinc-200 bg-white px-3 py-2"
          activeId={activeCat}
          onChange={setActiveCat}
          tabs={cats.map((cat) => ({
            id: cat,
            label: cat === "all" ? "Tümü" : catLabels[cat] || cat,
          }))}
        />
      )}

      {loading && videos.length === 0 ? (
        ytMobile ? (
          <div className="space-y-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b border-zinc-100">
                <div className="aspect-video animate-pulse bg-zinc-200" />
              </div>
            ))}
          </div>
        ) : (
          <VideoLoadingGrid />
        )
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Film className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-gray-500">Bu kategoride video bulunamadı.</p>
        </div>
      ) : ytMobile ? (
        <div>
          {videos.map((v) => (
            <YektubeMobileFeedItem key={v.id} video={v} pathHome={pathHome} onPlay={onPlay} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} onPlay={onPlay} />
          ))}
        </div>
      )}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-10 mt-4" />
      {loading && videos.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#039D55] border-t-transparent" />
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, onPlay }: { video: VideoItem; onPlay: (v: VideoItem) => void }) {
  const hmTv = useHmVideoTvLayout();
  const pathHm = hmTv?.pathHome ?? undefined;
  const cardClass =
    "group block cursor-pointer overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm transition-all duration-200 hover:border-[#039D55]/30 hover:shadow-md";
  const inner = (
    <>
      <div className="relative aspect-video bg-gray-100 overflow-hidden rounded-xl">
        <YektubeVideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 text-gray-900 ml-0.5" fill="currentColor" />
          </div>
        </div>
        {video.duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {video.duration}
          </span>
        )}
      </div>
      <div className="pt-2 pb-1 px-0.5">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-800 transition-colors group-hover:text-[#039D55]">
          {displayVideoTitle(video.title)}
        </p>
        {video.channelName && (
          <p className="text-[10px] text-gray-400 mt-1 truncate">{video.channelName}</p>
        )}
      </div>
    </>
  );
  if (video.sourceId) {
    return (
      <Link href={yektubeWatchPath(video.sourceId, video.videoId, pathHm)} className={cardClass}>
        {inner}
      </Link>
    );
  }
  return (
    <div onClick={() => onPlay(video)} className={cardClass}>
      {inner}
    </div>
  );
}

function VideoLoadingGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="w-full aspect-video bg-gray-200 rounded-xl mb-2" />
          <div className="h-2.5 bg-gray-200 rounded w-full mb-1" />
          <div className="h-2 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full aspect-square bg-gray-200 rounded-xl mb-2" />
            <div className="h-2.5 bg-gray-200 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

