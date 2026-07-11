import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Plus, Search, CircleUser, Clapperboard, PlaySquare } from "lucide-react";
import { YektubePlayerMark } from "@/components/YektubePlayerMark";
import { YektubeScrollTabs } from "@/components/YektubeScrollTabs";
import { yektubeSectionPath, type YektubeView } from "@/lib/yektubeNav";
import { yektubeSearchPath, yektubeWatchPath } from "@/lib/yektubeUrls";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { recommendationVideoTitle } from "@/lib/yektubeVideoClassify";

export type YektubeFeedVideo = {
  id: number;
  sourceId?: number | null;
  videoId: string;
  title: string;
  thumbnail?: string | null;
  channelName?: string | null;
  publishedAt?: string | null;
  duration?: string | null;
};

const YektubeMobileCtx = createContext(false);
export function useYektubeMobileChrome() {
  return useContext(YektubeMobileCtx);
}

export function YektubeMobileModeProvider({ active, children }: { active: boolean; children: ReactNode }) {
  return <YektubeMobileCtx.Provider value={active}>{children}</YektubeMobileCtx.Provider>;
}

export function YektubeMobileTopBar({
  pathHome,
  view,
  onSearchClick,
}: {
  pathHome: string;
  view: YektubeView;
  onSearchClick?: () => void;
}) {
  if (view === "shorts") {
    return (
      <header className="yektube-yt-mobile-top yektube-yt-mobile-top--shorts fixed left-0 right-0 top-0 z-[48] flex h-12 items-center justify-end gap-1 bg-black/30 px-2 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Ara"
          onClick={onSearchClick}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <Search className="h-5 w-5" />
        </button>
      </header>
    );
  }

  return (
    <header className="yektube-yt-mobile-top fixed left-0 right-0 top-0 z-[48] flex h-12 items-center justify-between border-b border-zinc-200/90 bg-white px-3">
      <Link href={yektubeSectionPath("anasayfa", pathHome)} className="flex shrink-0 items-center" aria-label="Yektube">
        <YektubePlayerMark className="h-[1.35rem] w-auto max-w-[6.5rem]" />
      </Link>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Ara"
          onClick={onSearchClick}
          className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 hover:bg-zinc-100"
        >
          <Search className="h-5 w-5" />
        </button>
        <Link
          href="/"
          className="flex h-10 items-center rounded-full px-2.5 text-[10px] font-black tracking-wide text-zinc-500 hover:bg-zinc-100"
        >
          YEKPARE
        </Link>
      </div>
    </header>
  );
}

export function YektubeMobileBottomNav({
  pathHome,
  view,
  canliTvHref,
}: {
  pathHome: string;
  view: YektubeView;
  canliTvHref: string;
}) {
  const items = [
    { id: "anasayfa" as const, label: "Ana Sayfa", icon: Home, href: yektubeSectionPath("anasayfa", pathHome) },
    { id: "shorts" as const, label: "Yekçek", icon: Clapperboard, href: yektubeSectionPath("shorts", pathHome) },
    { id: "create" as const, label: "", icon: Plus, href: canliTvHref, center: true },
    { id: "kanallar" as const, label: "Abonelikler", icon: PlaySquare, href: yektubeSectionPath("kanallar", pathHome) },
    { id: "playlists" as const, label: "Siz", icon: CircleUser, href: yektubeSectionPath("playlists", pathHome) },
  ];

  return (
    <nav
      className="yektube-yt-mobile-bottom fixed bottom-0 left-0 right-0 z-[48] flex items-end justify-around border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Yektube mobil menü"
    >
      {items.map(({ id, label, icon: Icon, href, center }) => {
        const active = id !== "create" && view === id;
        if (center) {
          return (
            <Link
              key={id}
              href={href}
              className="flex min-w-0 flex-1 flex-col items-center justify-center py-1.5"
              aria-label="Canlı yayın"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={id}
            href={href}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 ${
              active ? "text-zinc-900" : "text-zinc-500"
            }`}
          >
            <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} fill={active && id === "anasayfa" ? "currentColor" : "none"} />
            {label ? <span className="max-w-full truncate px-0.5 text-[10px] font-medium">{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function YektubeMobileFeedItem({
  video,
  pathHome,
  onPlay,
}: {
  video: YektubeFeedVideo;
  pathHome: string;
  onPlay?: (v: YektubeFeedVideo) => void;
}) {
  const title = recommendationVideoTitle(video.title, video.channelName);
  const channel = video.channelName?.trim() || "Yektube";
  const initial = channel.charAt(0).toUpperCase();
  const href = video.sourceId ? yektubeWatchPath(video.sourceId, video.videoId, pathHome) : null;

  const body = (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        <YektubeVideoThumb
          videoId={video.videoId}
          thumbnail={video.thumbnail}
          variant="landscape"
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {video.duration ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {video.duration}
          </span>
        ) : null}
      </div>
      <div className="flex gap-3 px-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-medium leading-snug text-zinc-900">{title}</p>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {channel}
            {video.publishedAt ? ` · ${video.publishedAt}` : ""}
          </p>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block border-b border-zinc-100 bg-white">
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onPlay?.(video)} className="block w-full border-b border-zinc-100 bg-white text-left">
      {body}
    </button>
  );
}

export function YektubeMobileCategoryChips({
  tabs,
  activeId,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="yektube-yt-mobile-chips sticky z-[40] border-b border-zinc-200 bg-white" style={{ top: "var(--yektube-yt-mobile-top, 48px)" }}>
      <YektubeScrollTabs tabs={tabs} activeId={activeId} onChange={onChange} className="px-3 py-2" />
    </div>
  );
}

export function YektubeMobileAnaSayfa({
  categories,
  catLabels,
  pathHome,
  onPlay,
}: {
  categories: string[];
  catLabels: Record<string, string>;
  pathHome: string;
  onPlay: (v: YektubeFeedVideo) => void;
}) {
  const [homeCat, setHomeCat] = useState("all");
  const homeTabs = useMemo(() => {
    const tabs = [{ id: "all", label: "Tümü" }];
    for (const cat of categories) {
      tabs.push({ id: cat, label: catLabels[cat] || cat });
    }
    return tabs;
  }, [categories, catLabels]);

  return (
    <div className="yektube-yt-mobile-home">
      {categories.length > 0 ? (
        <YektubeMobileCategoryChips tabs={homeTabs} activeId={homeCat} onChange={setHomeCat} />
      ) : null}
      <YektubeMobileHomeFeed pathHome={pathHome} categorySlug={homeCat} onPlay={onPlay} />
    </div>
  );
}

export function YektubeMobileHomeFeed({
  pathHome,
  categorySlug,
  onPlay,
}: {
  pathHome: string;
  categorySlug: string;
  onPlay: (v: YektubeFeedVideo) => void;
}) {
  const [videos, setVideos] = useState<YektubeFeedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: "24",
      excludeStories: "true",
      mixChannels: "true",
      enrichTitles: "true",
    });
    if (categorySlug && categorySlug !== "all") params.set("categorySlug", categorySlug);
    fetch(`/api/video/videos?${params}`)
      .then((r) => r.json())
      .then((d) => setVideos(d.items ?? []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-b border-zinc-100 bg-white">
            <div className="aspect-video animate-pulse bg-zinc-200" />
            <div className="flex gap-3 p-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-zinc-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-zinc-500">Henüz video yok.</p>;
  }

  return (
    <div className="yektube-yt-mobile-feed">
      {videos.map((v) => (
        <YektubeMobileFeedItem key={v.id} video={v} pathHome={pathHome} onPlay={onPlay} />
      ))}
    </div>
  );
}

export function YektubeMobileSearchOverlay({
  pathHome,
  open,
  onClose,
  initialQuery = "",
}: {
  pathHome: string;
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}) {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState(initialQuery);

  useEffect(() => {
    if (open) setQ(initialQuery);
  }, [open, initialQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <form
        className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          setLocation(yektubeSearchPath(pathHome, q.trim() || undefined));
          onClose();
        }}
      >
        <button type="button" onClick={onClose} className="shrink-0 text-sm font-medium text-zinc-600">
          İptal
        </button>
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Video, kanal veya oynatma listesi ara…"
          className="min-w-0 flex-1 rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
      </form>
    </div>
  );
}
