/** @deprecated Yektube v1 kanal sayfası — v2: `/yektube-v2/kanal/:id`. */
import { Link, useParams, useLocation } from "wouter";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useListVideoSources } from "@workspace/api-client-react";
import {
  WatchExperience,
  channelColor,
  isListSourceType,
  type Source,
  type VideoItem,
} from "./CanliTv";
import { VIDEO_TV_CATEGORY_LABELS } from "@/lib/videoTvCategories";
import {
  absoluteUrl,
  yektubeCanliTvPath,
  yektubeChannelPath,
  yektubePlaylistPath,
  yektubeWatchPath,
  yektubeSearchPath,
  YEKTUBE_HOME,
} from "@/lib/yektubeUrls";
import { useHmVideoTvLayout } from "@/contexts/HmVideoTvContext";
import { isLiveSource } from "./YektubeCanliTvPage";
import { enhanceYoutubeIframeSrc } from "@/lib/youtubeEmbed";
import { normalizeYoutubeImageSrc } from "@/lib/youtubeThumbnails";
import { looksLikeVideoPlaylistNotPodcast } from "@/lib/yektubePodcastFilter";
import { triggerYektubeBackgroundRefresh } from "@/lib/yektubeBackgroundRefresh";
import { buildMosaicSlots, YektubeHeroMosaic } from "@/components/YektubeHeroMosaic";
import { VideoTvBrandLogo } from "@/components/VideoTvBrandLogo";
import { YektubeVideoThumb } from "@/components/YektubeVideoThumb";
import { YektubeScrollTabs } from "@/components/YektubeScrollTabs";
import { YektubePlayerMark } from "@/components/YektubePlayerMark";
import { YektubeShortsReel } from "@/components/YektubeShortsReel";
import { YektubeExpandableDescription } from "@/components/YektubeExpandableDescription";
import { YektubeNewsVideoGrid, NEWS_BOX_VIDEO_LIMIT } from "@/components/YektubeNewsVideoGrid";
import { YektubeTopSearchBar, YEKTUBE_INLINE_SEARCH_INPUT_CLASS, YEKTUBE_INLINE_SEARCH_PLACEHOLDER } from "@/components/YektubeTopSearchBar";
import { displayVideoTitle, isYekcekVideo, splitYekcekVideos } from "@/lib/yektubeVideoClassify";
import {
  ArrowLeft,
  ChevronRight,
  Film,
  Home,
  ListVideo,
  Mic2,
  Play,
  Radio,
  Search,
  Copy,
  Smartphone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { YEKTUBE_ACCENT } from "@/lib/yektubeTheme";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { SADE_PUBLIC_POST_HERO_BODY_CLASS } from "@/lib/yekpareSadeTheme";

type TabKey = "anasayfa" | "videolar" | "yekcek" | "listeler" | "podcastler" | "canli";

type RemotePlaylistItem = {
  playlistId: string;
  title: string;
  thumbnail?: string;
  sourceId?: number | null;
  previewVideos?: VideoItem[];
};

type PlaylistRow = RemotePlaylistItem & {
  videos: VideoItem[];
};


/** Oynatma listeleri sekmesindeki kart için 2×2 özet mozaik */
function PlaylistCardMosaic({ items }: { items: VideoItem[] }) {
  const four: (VideoItem | null)[] = items.slice(0, 4);
  while (four.length < 4) four.push(null);
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2">
      {four.map((v, i) => (
        <div key={i} className="relative min-h-0 ring-[0.5px] ring-black/40">
          {v ? (
            <YektubeVideoThumb
              videoId={v.videoId}
              thumbnail={v.thumbnail}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-700" />
          )}
        </div>
      ))}
    </div>
  );
}

function YektubeThumbBadge() {
  return (
    <span className="pointer-events-none absolute top-1.5 left-1.5 z-[1] rounded bg-[#039D55] px-[5px] py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow-sm">
      Yektube
    </span>
  );
}

/** Kanal / playlist — haber sitesi tarzı 6 sütun video ızgarası (Tümü sekmesi) */
function PlaylistVideoGrid({
  videos,
  pathHome,
  playlistSourceId,
  fallbackWatchSourceId,
  categoryLabel,
}: {
  videos: VideoItem[];
  pathHome: string;
  playlistSourceId?: number | null;
  fallbackWatchSourceId?: number;
  categoryLabel?: string;
}) {
  if (videos.length === 0) {
    return <p className="py-8 text-sm text-zinc-500">Bu listede henüz video yok.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {videos.map((v) => {
        const watchSourceId = playlistSourceId ?? v.sourceId ?? fallbackWatchSourceId ?? null;
        const cardInner = (
          <>
            <div className="relative aspect-video overflow-hidden rounded-sm bg-zinc-100 ring-1 ring-zinc-200/80">
              <YektubeThumbBadge />
              {categoryLabel ? (
                <span className="pointer-events-none absolute left-0 top-0 z-[2] bg-[#e61e25] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {categoryLabel}
                </span>
              ) : null}
              <YektubeVideoThumb
                videoId={v.videoId}
                thumbnail={v.thumbnail}
                variant={isYekcekVideo(v) ? "portrait" : "landscape"}
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
              {v.duration ? (
                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-bold text-white">
                  {v.duration}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2.5 text-sm font-bold leading-snug text-zinc-900 line-clamp-3 group-hover:text-[#039D55]">
              {displayVideoTitle(v.title)}
            </h3>
            {v.description ? (
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 line-clamp-2">{v.description}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-zinc-400 truncate">
              {v.channelName || "Yektube"}
              {v.publishedAt ? ` · ${v.publishedAt}` : ""}
            </p>
          </>
        );
        if (watchSourceId) {
          return (
            <Link
              key={v.videoId}
              href={yektubeWatchPath(watchSourceId, v.videoId, pathHome)}
              className="group block min-w-0"
            >
              {cardInner}
            </Link>
          );
        }
        return (
          <div key={v.videoId} className="group block min-w-0 opacity-60">
            {cardInner}
          </div>
        );
      })}
    </div>
  );
}

/** Tek playlist rafı — yatay video kartları */
function PlaylistVideoShelf({
  videos,
  pathHome,
  playlistSourceId,
  fallbackWatchSourceId,
}: {
  videos: VideoItem[];
  pathHome: string;
  playlistSourceId?: number | null;
  /** Playlist henüz DB'de yoksa kanal kaynağı ile Yektube izleme */
  fallbackWatchSourceId?: number;
}) {
  if (videos.length === 0) {
    return <p className="py-8 text-sm text-zinc-500">Bu listede henüz video yok.</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
      {videos.slice(0, 24).map((v) => {
        const watchSourceId = playlistSourceId ?? v.sourceId ?? fallbackWatchSourceId ?? null;
        const cardInner = (
          <>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
              <YektubeThumbBadge />
              <YektubeVideoThumb
                videoId={v.videoId}
                thumbnail={v.thumbnail}
                variant={isYekcekVideo(v) ? "portrait" : "landscape"}
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
              {v.duration ? (
                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-bold text-white">
                  {v.duration}
                </span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-zinc-900 group-hover:text-[#039D55]">
              {v.title}
            </p>
          </>
        );
        if (watchSourceId) {
          return (
            <Link
              key={`${v.videoId}-${v.id}`}
              href={yektubeWatchPath(watchSourceId, v.videoId, pathHome)}
              className="group shrink-0 w-[200px] sm:w-[220px]"
            >
              {cardInner}
            </Link>
          );
        }
        return (
          <div key={`${v.videoId}-${v.id}`} className="group shrink-0 w-[200px] sm:w-[220px] opacity-60">
            {cardInner}
          </div>
        );
      })}
    </div>
  );
}

/** Kanal anasayfası — her playlist ayrı haber kutusu (6×6 ızgara) */
function ChannelPlaylistNewsBoxes({
  rows,
  pathHome,
  loading,
  fallbackWatchSourceId,
  onOpenPlaylistTab,
}: {
  rows: PlaylistRow[];
  pathHome: string;
  loading?: boolean;
  fallbackWatchSourceId?: number;
  onOpenPlaylistTab?: (playlistId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-4 h-6 w-40 animate-pulse rounded bg-zinc-200" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((__, j) => (
                <div key={j} className="aspect-video animate-pulse rounded bg-zinc-200" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-6">
      {rows.map((row) => {
        const videos = row.videos.filter((v) => !isYekcekVideo(v));
        if (videos.length === 0) return null;
        const moreHref =
          row.sourceId != null ? yektubePlaylistPath(row.sourceId, pathHome) : undefined;
        return (
          <YektubeNewsVideoGrid
            key={row.playlistId}
            videos={videos.map((v) => ({
              ...v,
              sourceId: v.sourceId ?? row.sourceId ?? fallbackWatchSourceId ?? undefined,
            }))}
            pathHome={pathHome}
            badge={String(Math.min(videos.length, NEWS_BOX_VIDEO_LIMIT))}
            onMoreHref={moreHref}
            onMoreClick={
              !moreHref && onOpenPlaylistTab ? () => onOpenPlaylistTab(row.playlistId) : undefined
            }
            header={
              <span className="text-sm font-black uppercase tracking-wide text-zinc-900">{row.title}</span>
            }
          />
        );
      })}
    </div>
  );
}

/** @deprecated — sekmeli kayan raf yerine ChannelPlaylistNewsBoxes kullanın */
function YoutubeStylePlaylistRows({
  rows,
  pathHome,
  loading,
  emptyText,
  showAllTab = true,
  fallbackWatchSourceId,
  channelVideos,
  excludeVideoIds,
}: {
  rows: PlaylistRow[];
  pathHome: string;
  loading?: boolean;
  emptyText?: string;
  showAllTab?: boolean;
  fallbackWatchSourceId?: number;
  /** Kanalın doğrudan videoları — Tümü sekmesinde playlistlerle birleştirilir */
  channelVideos?: VideoItem[];
  /** Öne çıkan vb. — grid'de tekrar gösterme */
  excludeVideoIds?: string[];
}) {
  const [activeTab, setActiveTab] = useState<string>(showAllTab ? "all" : "");

  useEffect(() => {
    if (rows.length === 0) return;
    if (showAllTab) {
      setActiveTab("all");
      return;
    }
    setActiveTab(rows[0]?.playlistId ?? "");
  }, [rows, showAllTab]);

  const tabs = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    if (showAllTab && rows.length > 1) {
      out.push({ id: "all", label: "Tümü" });
    }
    for (const row of rows) {
      out.push({ id: row.playlistId, label: row.title });
    }
    return out;
  }, [rows, showAllTab]);

  const mixedVideos = useMemo(() => {
    const seen = new Set<string>();
    const out: VideoItem[] = [];
    const add = (v: VideoItem, rowSourceId?: number | null) => {
      const vid = v.videoId?.trim();
      if (!vid || seen.has(vid)) return;
      seen.add(vid);
      out.push({
        ...v,
        sourceId: v.sourceId ?? rowSourceId ?? fallbackWatchSourceId ?? undefined,
      });
    };
    for (const v of channelVideos ?? []) add(v, fallbackWatchSourceId);
    for (const row of rows) {
      for (const v of row.videos) add(v, row.sourceId);
    }
    return out;
  }, [rows, channelVideos, fallbackWatchSourceId]);

  const activeRow = useMemo(
    () => (activeTab === "all" ? null : rows.find((r) => r.playlistId === activeTab) ?? null),
    [activeTab, rows],
  );

  const excludeSet = useMemo(() => new Set(excludeVideoIds ?? []), [excludeVideoIds]);

  const shelfVideos = useMemo(() => {
    const base = activeTab === "all" ? mixedVideos : (activeRow?.videos ?? []);
    if (activeTab !== "all" || excludeSet.size === 0) return base;
    return base.filter((v) => !excludeSet.has(v.videoId));
  }, [activeTab, mixedVideos, activeRow, excludeSet]);
  const shelfSourceId = activeRow?.sourceId ?? null;
  const playlistPageHref =
    activeRow?.sourceId != null ? yektubePlaylistPath(activeRow.sourceId, pathHome) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded bg-zinc-200" />
          ))}
        </div>
        {showAllTab ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="aspect-video animate-pulse rounded-sm bg-zinc-200" />
                <div className="h-4 w-full animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="h-[118px] w-[210px] shrink-0 animate-pulse rounded-lg bg-zinc-200" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (rows.length === 0) {
    return emptyText ? <p className="text-sm text-zinc-500">{emptyText}</p> : null;
  }

  if (rows.length === 1 && !showAllTab) {
    const row = rows[0];
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900">{row.title}</h3>
          {row.sourceId ? (
            <Link
              href={yektubePlaylistPath(row.sourceId, pathHome)}
              className="ml-auto inline-flex items-center gap-0.5 text-xs font-bold text-zinc-500 hover:text-[#039D55]"
            >
              Tümünü gör <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
        <PlaylistVideoGrid
          videos={row.videos}
          pathHome={pathHome}
          playlistSourceId={row.sourceId}
          fallbackWatchSourceId={fallbackWatchSourceId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <YektubeScrollTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeRow && activeTab !== "all" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {activeRow.sourceId ? (
            <Link
              href={yektubePlaylistPath(activeRow.sourceId, pathHome)}
              className="text-sm font-black uppercase tracking-wide text-zinc-900 hover:text-[#039D55]"
            >
              {activeRow.title}
            </Link>
          ) : (
            <span className="text-sm font-black uppercase tracking-wide text-zinc-900">{activeRow.title}</span>
          )}
          {activeRow.videos.length > 0 && activeRow.sourceId ? (
            <Link
              href={yektubeWatchPath(activeRow.sourceId, activeRow.videos[0].videoId, pathHome)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100"
            >
              <Play className="h-3 w-3 fill-current" />
              Tümünü oynat
            </Link>
          ) : null}
          {playlistPageHref && activeRow.sourceId ? (
            <Link
              href={playlistPageHref}
              className="ml-auto inline-flex items-center gap-0.5 text-xs font-bold text-zinc-500 hover:text-zinc-900"
            >
              Tümünü gör <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      ) : activeTab === "all" ? (
        <p className="pt-1 text-xs text-zinc-500">
          Tüm oynatma listelerinden karma içerik · {mixedVideos.length} video
        </p>
      ) : null}

      {activeTab === "all" ? (
        <PlaylistVideoGrid
          videos={shelfVideos}
          pathHome={pathHome}
          fallbackWatchSourceId={fallbackWatchSourceId}
        />
      ) : (
        <PlaylistVideoGrid
          videos={shelfVideos}
          pathHome={pathHome}
          playlistSourceId={shelfSourceId}
          fallbackWatchSourceId={fallbackWatchSourceId}
        />
      )}
    </div>
  );
}

export default function VideoTvChannel() {
  const { id, videoId: videoIdParam } = useParams<{ id: string; videoId?: string; slug?: string }>();
  const [, setLocation] = useLocation();
  const hmTv = useHmVideoTvLayout();
  const pathHome = hmTv?.pathHome ?? YEKTUBE_HOME;
  const brandLabel = hmTv ? "Video TV" : "Yektube";
  const stickyHeaderPx = hmTv?.contentStickyTopPx ?? 52;
  const { data: allSources } = useListVideoSources();
  const channelId = parseInt(String(id ?? ""), 10);
  const vParam = useMemo(() => {
    if (!videoIdParam) return null;
    try {
      return decodeURIComponent(videoIdParam);
    } catch {
      return videoIdParam;
    }
  }, [videoIdParam]);

  useEffect(() => {
    triggerYektubeBackgroundRefresh();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !id) return;
    const legacy = new URLSearchParams(window.location.search).get("v");
    if (legacy && !videoIdParam) {
      setLocation(`${pathHome}/kanal/${id}/${encodeURIComponent(legacy)}`, { replace: true });
    }
  }, [id, videoIdParam, setLocation, pathHome]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = window.location.pathname;
    if (p.startsWith("/video-tv/kanal/") && !p.includes("/tr/")) {
      setLocation(`${YEKTUBE_HOME}${p.slice("/video-tv".length)}${window.location.search}`, { replace: true });
    }
  }, [setLocation]);

  const [source, setSource] = useState<Source | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("anasayfa");
  const [videoSearch, setVideoSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [copiedChip, setCopiedChip] = useState<string | null>(null);
  const [htmlMeta, setHtmlMeta] = useState<{
    bannerUrl: string;
    logoUrl: string;
    channelName: string;
    description: string;
  } | null>(null);
  const [remotePlaylists, setRemotePlaylists] = useState<RemotePlaylistItem[]>([]);
  const [remotePodcasts, setRemotePodcasts] = useState<RemotePlaylistItem[]>([]);
  const [playlistVideos, setPlaylistVideos] = useState<Record<string, VideoItem[]>>({});
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  const copyChip = (chipKey: string, text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopiedChip(chipKey);
      setTimeout(() => setCopiedChip(null), 1600);
    });
  };

  const submitGlobalSearch = (q?: string) => {
    const query = (q ?? globalSearch).trim();
    setLocation(yektubeSearchPath(pathHome, query || undefined));
  };

  const shareUrlForWatch = useMemo(() => {
    if (typeof window === "undefined" || !vParam) return null;
    return absoluteUrl(yektubeWatchPath(channelId, vParam, pathHome));
  }, [channelId, vParam, pathHome]);

  useEffect(() => {
    if (Number.isNaN(channelId)) {
      setLoadErr("Geçersiz kanal");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/video/sources/${channelId}`).then((r) => {
        if (!r.ok) throw new Error("notfound");
        return r.json() as Promise<Source>;
      }),
      fetch(`/api/video/videos?sourceId=${channelId}&limit=500`).then((r) => r.json()),
    ])
      .then(([src, vData]) => {
        if (cancelled) return;
        setSource(src);
        setVideos((vData.items ?? []) as VideoItem[]);
        setLoadErr(null);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadErr("Kanal bulunamadı veya kaldırılmış.");
          setSource(null);
          setVideos([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => {
    if (!source || !isLiveSource(source)) return;
    setLocation(yektubeCanliTvPath(pathHome, channelId), { replace: true });
  }, [source, channelId, pathHome, setLocation]);

  useEffect(() => {
    if (
      !source ||
      source.platform !== "youtube" ||
      isListSourceType(source.sourceType) ||
      (source.sourceType === "video" && !isLiveSource(source))
    ) {
      setHtmlMeta(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/video/sources/${channelId}/channel-html-meta`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.ok || d.skip) return;
        setHtmlMeta({
          bannerUrl: typeof d.bannerUrl === "string" ? d.bannerUrl : "",
          logoUrl: typeof d.logoUrl === "string" ? d.logoUrl : "",
          channelName: typeof d.channelName === "string" ? d.channelName : "",
          description: typeof d.description === "string" ? d.description : "",
        });
      })
      .catch(() => {
        if (!cancelled) setHtmlMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [source, channelId]);

  useEffect(() => {
    if (
      !source ||
      source.platform !== "youtube" ||
      (source.sourceType !== "channel" && source.sourceType !== "live")
    ) {
      setRemotePlaylists([]);
      setRemotePodcasts([]);
      setPlaylistVideos({});
      return;
    }
    let cancelled = false;
    setPlaylistsLoading(true);
    fetch(`/api/video/sources/${channelId}/playlists`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (cancelled || !data?.ok) return;
        const pls = (data.playlists ?? []) as RemotePlaylistItem[];
        const pods = ((data.podcasts ?? []) as RemotePlaylistItem[]).filter(
          (p) => !looksLikeVideoPlaylistNotPodcast(p.title),
        );
        setRemotePlaylists(pls);
        setRemotePodcasts(pods);

        const videosMap: Record<string, VideoItem[]> = {};
        for (const p of [...pls, ...pods]) {
          videosMap[p.playlistId] = (p.previewVideos ?? []) as VideoItem[];
        }

        const sourceIds = [...pls, ...pods]
          .map((p) => p.sourceId)
          .filter((id): id is number => typeof id === "number" && id > 0);
        if (sourceIds.length > 0) {
          const entries = await Promise.all(
            sourceIds.map(async (sid) => {
              const res = await fetch(`/api/video/videos?sourceId=${sid}&limit=100`);
              const json = await res.json().catch(() => ({}));
              const items = (json.items ?? []) as VideoItem[];
              const pl = [...pls, ...pods].find((x) => x.sourceId === sid);
              return [pl?.playlistId ?? String(sid), items] as const;
            }),
          );
          if (!cancelled) {
            for (const [pid, items] of entries) {
              if (items.length > 0) videosMap[pid] = items;
            }
          }
        }
        if (!cancelled) setPlaylistVideos(videosMap);
      })
      .catch(() => {
        if (!cancelled) {
          setRemotePlaylists([]);
          setRemotePodcasts([]);
          setPlaylistVideos({});
        }
      })
      .finally(() => {
        if (!cancelled) setPlaylistsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, channelId]);

  const playlistRows = useMemo((): PlaylistRow[] => {
    return remotePlaylists.map((p) => ({
      ...p,
      videos: playlistVideos[p.playlistId] ?? [],
    }));
  }, [remotePlaylists, playlistVideos]);

  const podcastRows = useMemo((): PlaylistRow[] => {
    return remotePodcasts.map((p) => ({
      ...p,
      videos: playlistVideos[p.playlistId] ?? [],
    }));
  }, [remotePodcasts, playlistVideos]);

  const resolvedVideo: VideoItem | null = useMemo(() => {
    if (!vParam) return null;
    const found = videos.find((x) => x.videoId === vParam);
    if (found) return found;
    const channelLabel = source?.name?.trim() || "Video";
    return {
      id: -1,
      sourceId: source?.id ?? channelId,
      platform: "youtube",
      videoId: vParam,
      title: channelLabel,
      description: null,
      thumbnail: `https://img.youtube.com/vi/${vParam}/mqdefault.jpg`,
      channelName: channelLabel,
      channelId: source?.channelId ?? "",
      publishedAt: null,
      duration: null,
      categorySlug: source?.categorySlug ?? "haberler",
      isFeatured: false,
      isStory: false,
      embedAllowed: true,
    };
  }, [vParam, videos, source, channelId]);

  const { regular: regularVideos, yekcek: yekcekVideos } = useMemo(
    () => splitYekcekVideos(videos),
    [videos],
  );

  const filteredVideos = useMemo(() => {
    const q = videoSearch.trim().toLowerCase();
    const base = q ? regularVideos.filter((v) => v.title.toLowerCase().includes(q)) : regularVideos;
    const seen = new Set<string>();
    return base.filter((v) => {
      const id = v.videoId?.trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [regularVideos, videoSearch]);

  const color = source ? channelColor(source.name) : YEKTUBE_ACCENT;
  const initial = source?.name?.charAt(0).toUpperCase() ?? "?";
  const catLabel = source ? VIDEO_TV_CATEGORY_LABELS[source.categorySlug] || source.categorySlug : "";

  if (Number.isNaN(channelId)) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-zinc-600">Geçersiz adres.</p>
        <Link href={pathHome} className="font-semibold text-[#039D55] hover:underline">
          {brandLabel}&apos;a dön
        </Link>
      </div>
    );
  }

  if (vParam && resolvedVideo) {
    const watchLogo =
      (htmlMeta?.logoUrl && htmlMeta.logoUrl.trim()) || source?.logoUrl || null;
    const channelLabel = source?.name?.trim() || resolvedVideo.channelName || "Video";

    return (
      <div className="sade-public-page min-h-screen bg-white">
        <div className="sticky z-30 border-b border-zinc-200 bg-white/95 backdrop-blur" style={{ top: stickyHeaderPx }}>
          <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} flex items-center gap-3 py-2.5`}>
            <Link
              href={source ? yektubeChannelPath(channelId, pathHome) : pathHome}
              className="flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-900 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              {source ? "Kanal" : "Video TV"}
            </Link>
            <span className="text-zinc-300">|</span>
            <span className="text-sm font-bold text-zinc-900 truncate">{channelLabel}</span>
          </div>
        </div>

        <WatchExperience
          playingVideo={resolvedVideo}
          playing={null}
          sources={allSources ?? []}
          sharePageUrl={shareUrlForWatch}
          channelLogoUrl={watchLogo}
          pathHome={pathHome}
          onClose={() =>
            setLocation(source ? yektubeChannelPath(channelId, pathHome) : pathHome)
          }
          onSelectVideo={(v) =>
            setLocation(yektubeWatchPath(channelId, v.videoId, pathHome))
          }
          onSelectSource={(s) =>
            setLocation(
              isLiveSource(s)
                ? yektubeCanliTvPath(pathHome, s.id)
                : yektubeChannelPath(s.id, pathHome),
            )
          }
        />
      </div>
    );
  }

  if (loading && !source) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#039D55] border-t-transparent" />
      </div>
    );
  }

  if (loadErr || !source) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 px-4 bg-white">
        <p className="text-zinc-600">{loadErr || "Kanal yok"}</p>
        <Link href={pathHome} className="font-semibold text-[#039D55] hover:underline">
          {brandLabel}&apos;a dön
        </Link>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: ReactNode; show: boolean }[] = [
    { key: "anasayfa", label: "Ana Sayfa", icon: <Home className="w-4 h-4" />, show: true },
    { key: "videolar", label: "Videolar", icon: <Film className="w-4 h-4" />, show: true },
    {
      key: "yekcek",
      label: "Yekçek",
      icon: <Smartphone className="w-4 h-4" />,
      show: source.sourceType === "channel" || source.sourceType === "live" || yekcekVideos.length > 0,
    },
    {
      key: "listeler",
      label: "Oynatma listeleri",
      icon: <ListVideo className="w-4 h-4" />,
      show:
        source.sourceType === "channel" ||
        isListSourceType(source.sourceType) ||
        source.sourceType === "live",
    },
    {
      key: "podcastler",
      label: "Sesli Günlük",
      icon: <Mic2 className="w-4 h-4" />,
      show: source.sourceType === "channel" || source.sourceType === "live",
    },
    {
      key: "canli",
      label: "Canlı",
      icon: <Radio className="w-4 h-4" />,
      show: isLiveSource(source),
    },
  ];

  const featured = regularVideos[0];
  const displayName = (htmlMeta?.channelName?.trim() || source.name).trim();
  const metaDescription = htmlMeta?.description?.trim() || "";
  const handle =
    source.channelId.length > 18 ? `${source.channelId.slice(0, 10)}…` : source.channelId;
  const logoUrl = (htmlMeta?.logoUrl && htmlMeta.logoUrl.trim()) || source.logoUrl || null;

  return (
    <div className="sade-public-page min-h-screen bg-white text-slate-900">
      <YektubeHeroMosaic
        slots={buildMosaicSlots(regularVideos.length > 0 ? regularVideos : yekcekVideos)}
        title={displayName}
        subtitle={metaDescription || undefined}
        rightSlot={
          hmTv ? (
            <Link
              href={pathHome}
              className="pointer-events-auto flex items-center gap-2 rounded-xl bg-white/95 px-2.5 py-2 shadow-lg ring-1 ring-black/10 hover:bg-white transition-colors"
            >
              <VideoTvBrandLogo className="h-7 w-auto object-contain" />
            </Link>
          ) : (
            <Link
              href={pathHome}
              className="pointer-events-auto flex items-center gap-2 rounded-xl bg-white/95 px-2.5 py-2 shadow-lg ring-1 ring-black/10 hover:bg-white transition-colors"
            >
              <img src="/yektube-logo.png" alt="Yektube" className="h-7 w-auto object-contain" draggable={false} />
            </Link>
          )
        }
      />

      <div className="border-b border-emerald-100 bg-white">
        <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:gap-8 sm:py-4`}>
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200 sm:h-[5.5rem] sm:w-[5.5rem]">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-black sm:text-4xl" style={{ color }}>
                {initial}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{displayName}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              @{handle} · {regularVideos.length} video
              {yekcekVideos.length > 0 ? ` · ${yekcekVideos.length} yekçek` : ""}
              {catLabel ? ` · ${catLabel}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
              {regularVideos[0] ? (
                <Link
                  href={yektubeWatchPath(channelId, regularVideos[0].videoId, pathHome)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#039D55] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#028347]"
                >
                  <Play className="h-4 w-4 shrink-0 fill-white" />
                  Oynat
                </Link>
              ) : null}
              <Link
                href={pathHome}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-emerald-100"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                {brandLabel}
              </Link>
              <YektubeTopSearchBar
                value={globalSearch}
                onChange={setGlobalSearch}
                onSubmit={submitGlobalSearch}
                pathHome={pathHome}
                className="min-w-0 flex-1 basis-full sm:basis-auto sm:min-w-[12rem] sm:max-w-md"
                placeholder={YEKTUBE_INLINE_SEARCH_PLACEHOLDER}
                inputClassName={YEKTUBE_INLINE_SEARCH_INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} relative z-10 pb-16 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <div className="flex flex-wrap items-center gap-2 py-3 border-b border-zinc-200">
          <span className="text-[10px] font-black uppercase text-zinc-400 w-full sm:w-auto">Paylaş</span>
          <button
            type="button"
            onClick={() => copyChip("ch", absoluteUrl(yektubeChannelPath(channelId, pathHome)))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <Copy className="w-3 h-3" />
            {copiedChip === "ch" ? "Kanal linki kopyalandı" : "Kanal linki"}
          </button>
          {isListSourceType(source.sourceType) ? (
            <button
              type="button"
              onClick={() => copyChip("pl", absoluteUrl(yektubePlaylistPath(channelId, pathHome)))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100"
            >
              <Copy className="w-3 h-3" />
              {copiedChip === "pl" ? "Liste linki kopyalandı" : "Playlist linki"}
            </button>
          ) : null}
          {regularVideos[0] ? (
            <button
              type="button"
              onClick={() =>
                copyChip("vid", absoluteUrl(yektubeWatchPath(channelId, regularVideos[0].videoId, pathHome)))
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100"
            >
              <Copy className="w-3 h-3" />
              {copiedChip === "vid" ? "Video linki kopyalandı" : "Son video linki"}
            </button>
          ) : null}
        </div>

        {/* Kanal sekmeleri */}
        <div className="mt-2 border-b border-zinc-200 flex items-center gap-0 overflow-x-auto scrollbar-none">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-[#039D55] text-[#039D55]"
                    : "border-transparent text-slate-500 hover:text-[#039D55]"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          <div className="flex-1 min-w-[1rem]" />
          <div className="hidden md:flex items-center py-2 pr-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                placeholder="Kanalda ara..."
                className="h-9 w-44 rounded-full border-emerald-100 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* ── Ana Sayfa sekmesi ── */}
        {tab === "anasayfa" && (
          <div className="mt-3 space-y-6 md:mt-4 md:space-y-7">
            {!featured && yekcekVideos.length === 0 ? (
              <p className="text-zinc-500 text-sm">Henüz bu kaynak için video senkronu yok. Yönetimden RSS senkronu çalıştırın.</p>
            ) : (
              <>
                {featured ? (
                <section>
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wide mb-4">Öne çıkan</h2>
                  <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
                    <Link
                      href={yektubeWatchPath(channelId, featured.videoId, pathHome)}
                      className="lg:w-[58%] shrink-0 group"
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 shadow-md ring-1 ring-zinc-200">
                        <YektubeThumbBadge />
                        <YektubeVideoThumb
                          videoId={featured.videoId}
                          thumbnail={featured.thumbnail}
                          className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                          loading="eager"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/35">
                          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
                            <Play className="w-7 h-7 text-zinc-900 ml-1" fill="currentColor" />
                          </div>
                        </div>
                        {featured.duration && (
                          <span className="absolute bottom-2 right-2 bg-black/85 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                            {featured.duration}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <Link
                        href={yektubeWatchPath(channelId, featured.videoId, pathHome)}
                        className="text-lg sm:text-xl font-bold text-zinc-900 hover:text-[#039D55] leading-snug"
                      >
                        {displayVideoTitle(featured.title)}
                      </Link>
                      <p className="text-xs text-zinc-500 mt-1.5">
                        {source.name}
                        {featured.publishedAt ? ` · ${featured.publishedAt}` : ""}
                      </p>
                      <YektubeExpandableDescription text={featured.description} className="mt-2" />
                      <Link
                        href={yektubeWatchPath(channelId, featured.videoId, pathHome)}
                        className="mt-4 inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        Oynat
                      </Link>
                    </div>
                  </div>
                </section>
                ) : null}

                {yekcekVideos.length > 0 && (
                  <YektubeNewsVideoGrid
                    videos={yekcekVideos.map((v) => ({ ...v, sourceId: v.sourceId ?? channelId }))}
                    pathHome={pathHome}
                    variant="portrait"
                    badge={String(Math.min(yekcekVideos.length, NEWS_BOX_VIDEO_LIMIT))}
                    onMoreClick={() => setTab("yekcek")}
                    header={
                      <span className="text-sm font-black uppercase tracking-wide text-zinc-900">Yekçek</span>
                    }
                  />
                )}

                {(source.sourceType === "channel" || source.sourceType === "live") && playlistRows.length > 0 && (
                  <ChannelPlaylistNewsBoxes
                    rows={playlistRows}
                    pathHome={pathHome}
                    loading={playlistsLoading}
                    fallbackWatchSourceId={channelId}
                    onOpenPlaylistTab={() => setTab("listeler")}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* ── Videolar ── */}
        {tab === "videolar" && (
          <div className="mt-3 md:mt-4">
            <div className="md:hidden mb-4 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                placeholder="Ara..."
                className="h-9 pl-8 text-sm rounded-full"
              />
            </div>
            {filteredVideos.length === 0 ? (
              <p className="text-zinc-500 text-sm">Sonuç yok.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
                {filteredVideos.map((v) => (
                  <Link
                    key={v.id}
                    href={yektubeWatchPath(channelId, v.videoId, pathHome)}
                    className="group block"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100">
                      <YektubeThumbBadge />
                      <YektubeVideoThumb
                        videoId={v.videoId}
                        thumbnail={v.thumbnail}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      {v.duration && (
                        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[11px] font-semibold px-1 py-0.5 rounded">
                          {v.duration}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-zinc-900 line-clamp-2 leading-snug group-hover:text-[#039D55]">
                      {displayVideoTitle(v.title)}
                    </h3>
                    <YektubeExpandableDescription text={v.description} className="mt-1 text-xs" />
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {v.channelName || source.name}
                      {v.publishedAt ? ` · ${v.publishedAt}` : ""}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Yekçek ── */}
        {tab === "yekcek" && (
          <div className="mt-3 md:mt-4 -mx-4 sm:mx-0">
            <YektubeShortsReel pathHome={pathHome} sourceId={channelId} />
          </div>
        )}

        {/* ── Oynatma listeleri (YouTube tarzı alt alta raflar) ── */}
        {tab === "listeler" && (
          <div className="mt-3 md:mt-4">
            {isListSourceType(source.sourceType) ? (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900">{displayName}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{videos.length} video</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
                  {videos.map((v) => (
                    <Link
                      key={v.id}
                      href={yektubeWatchPath(channelId, v.videoId, pathHome)}
                      className="group block"
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100">
                        <YektubeThumbBadge />
                        <YektubeVideoThumb
                          videoId={v.videoId}
                          thumbnail={v.thumbnail}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-zinc-900 line-clamp-2 leading-snug group-hover:text-[#039D55]">
                        {v.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900">Oynatma listeleri</h2>
                </div>
                <ChannelPlaylistNewsBoxes
                  rows={playlistRows}
                  pathHome={pathHome}
                  loading={playlistsLoading}
                  fallbackWatchSourceId={channelId}
                />
              </>
            )}
          </div>
        )}

        {/* ── Sesli Günlük ── */}
        {tab === "podcastler" && (source.sourceType === "channel" || source.sourceType === "live") && (
          <div className="mt-3 md:mt-4">
            <div className="mb-6">
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900">Sesli Günlük</h2>
              <p className="mt-1 text-xs text-zinc-500">Kanalın sesli günlük oynatma listeleri</p>
            </div>
            <YoutubeStylePlaylistRows
              rows={podcastRows}
              pathHome={pathHome}
              loading={playlistsLoading}
              fallbackWatchSourceId={channelId}
              emptyText="Bu kanal için sesli günlük listesi bulunamadı."
            />
          </div>
        )}

        {/* ── Canlı ── */}
        {tab === "canli" && isLiveSource(source) && (
          <div className="mt-3 max-w-4xl md:mt-4">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-zinc-200 shadow-lg">
              <iframe
                title="Canlı yayın"
                src={enhanceYoutubeIframeSrc(
                  `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(source.channelId)}&autoplay=0`,
                )}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
              <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-2 sm:p-3">
                <YektubePlayerMark
                  coverYoutubeCorner
                  className="h-6 sm:h-8 w-auto max-w-[min(46%,11rem)] object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-3">Yayın YouTube üzerinden gelir; saat dilimi ve yayın durumu YouTube'a bağlıdır.</p>
          </div>
        )}
      </div>
    </div>
  );
}
