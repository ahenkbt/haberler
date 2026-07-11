import { Link, useLocation, useParams } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useListVideoSources } from "@workspace/api-client-react";
import { ArrowLeft, Radio } from "lucide-react";
import { useHmVideoTvLayout } from "@/contexts/HmVideoTvContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { YektubeScrollTabs } from "@/components/YektubeScrollTabs";
import { normalizeYoutubeImageSrc } from "@/lib/youtubeThumbnails";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { absoluteUrl, YEKTUBE_HOME, yektubeCanliTvPath } from "@/lib/yektubeUrls";
import { resolveLiveVideoId } from "@/lib/yektubeLiveEmbed";
import { VIDEO_TV_CATEGORY_LABELS, buildVideoTvNavSlugs } from "@/lib/videoTvCategories";
import {
  WatchExperience,
  channelColor,
  type Source,
  type VideoItem,
} from "./CanliTv";

export function isLiveSource(source: Source): boolean {
  return source.isLive || source.sourceType === "live";
}

function mergeVideos(db: VideoItem[], scraped: VideoItem[]): VideoItem[] {
  const seen = new Set<string>();
  const out: VideoItem[] = [];
  for (const v of [...db, ...scraped]) {
    if (!v.videoId || seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    out.push(v);
  }
  return out;
}

export default function YektubeCanliTvPage() {
  const hmTv = useHmVideoTvLayout();
  const isMobile = useIsMobile();
  const pathHome = hmTv?.pathHome ?? YEKTUBE_HOME;
  const brandLabel = hmTv ? "Video TV" : "Yektube";
  const stickyTopPx = hmTv?.contentStickyTopPx ?? (hmTv ? 52 : isMobile ? 44 : 0);
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  const { data: sources, isLoading, isError, refetch } = useListVideoSources();

  const liveChannels = useMemo(
    () => (sources ?? []).filter((s) => s.active && isLiveSource(s)),
    [sources],
  );

  const paramId = parseInt(String(params.id ?? ""), 10);
  const selected = useMemo(() => {
    if (!Number.isNaN(paramId)) {
      return liveChannels.find((s) => s.id === paramId) ?? liveChannels[0] ?? null;
    }
    return liveChannels[0] ?? null;
  }, [liveChannels, paramId]);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [htmlMeta, setHtmlMeta] = useState<{
    bannerUrl: string;
    logoUrl: string;
    channelName: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (liveChannels.length === 0 || !Number.isNaN(paramId)) return;
    const first = liveChannels[0];
    if (first) {
      setLocation(yektubeCanliTvPath(pathHome, first.id), { replace: true });
    }
  }, [liveChannels, paramId, pathHome, setLocation]);

  useEffect(() => {
    if (!selected) {
      setVideos([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch(`/api/video/videos?sourceId=${selected.id}&limit=12`).then((r) => r.json()),
      fetch(`/api/video/sources/${selected.id}/recent-videos`).then((r) => r.json()),
      fetch(`/api/video/sources/${selected.id}/live-broadcast?refresh=1`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([dbData, recentData, liveData]) => {
        if (cancelled) return;
        const dbItems = (dbData.items ?? []) as VideoItem[];
        const recentItems = recentData?.ok ? ((recentData.items ?? []) as VideoItem[]) : [];
        const merged = mergeVideos(dbItems, recentItems);
        const liveVideoId =
          typeof liveData?.videoId === "string" && liveData.videoId.trim() ? liveData.videoId.trim() : null;
        if (liveVideoId && !merged.some((v) => v.videoId === liveVideoId)) {
          merged.unshift({
            id: -selected.id,
            sourceId: selected.id,
            platform: selected.platform,
            videoId: liveVideoId,
            title: selected.name,
            description: null,
            thumbnail: null,
            channelName: selected.name,
            categorySlug: selected.categorySlug,
            isFeatured: false,
          });
        }
        setVideos(merged);
      })
      .catch(() => {
        if (!cancelled) setVideos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  useEffect(() => {
    if (!selected || selected.platform !== "youtube") {
      setHtmlMeta(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/video/sources/${selected.id}/channel-html-meta`)
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
  }, [selected?.id, selected?.platform]);

  const playingVideo = useMemo((): VideoItem | null => {
    if (!selected) return null;
    const videoId = resolveLiveVideoId(selected, videos);
    if (!videoId) return null;
    const fromDb = videos.find((v) => v.videoId === videoId);
    return (
      fromDb ?? {
        id: -selected.id,
        sourceId: selected.id,
        platform: selected.platform,
        videoId,
        title: selected.name,
        description: null,
        thumbnail: null,
        channelName: selected.name,
        categorySlug: selected.categorySlug,
        isFeatured: false,
      }
    );
  }, [selected, videos]);

  const displayName = (htmlMeta?.channelName?.trim() || selected?.name || "").trim();
  const liveVideoId = playingVideo?.videoId ?? (selected ? resolveLiveVideoId(selected, videos) : null);

  const categoryTabs = useMemo(() => {
    const slugs = new Set<string>();
    for (const ch of liveChannels) {
      slugs.add(ch.categorySlug?.trim() || "diger");
    }
    const ordered = buildVideoTvNavSlugs([...slugs]);
    const tabs = [{ id: "all", label: "Tümü" }];
    for (const slug of ordered) {
      if (slugs.has(slug)) {
        tabs.push({ id: slug, label: VIDEO_TV_CATEGORY_LABELS[slug] ?? slug });
      }
    }
    if (slugs.has("diger") && !ordered.includes("diger")) {
      tabs.push({ id: "diger", label: "Diğer" });
    }
    return tabs;
  }, [liveChannels]);

  const sidebarChannels = useMemo(() => {
    const base = liveChannels.filter((s) => s.id !== selected?.id);
    if (activeCategory === "all") return base;
    return base.filter((s) => (s.categorySlug?.trim() || "diger") === activeCategory);
  }, [liveChannels, selected?.id, activeCategory]);

  const shareUrl = selected
    ? absoluteUrl(yektubeCanliTvPath(pathHome, selected.id))
    : absoluteUrl(yektubeCanliTvPath(pathHome));

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-bold text-zinc-800">Canlı yayın listesi yüklenemedi</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg bg-[#039D55] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#028347]"
        >
          Yeniden dene
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#039D55] border-t-transparent" />
      </div>
    );
  }

  if (liveChannels.length === 0) {
    return (
      <div className="sade-public-page min-h-screen bg-white py-20 text-center text-zinc-500">
        <Radio className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p className="font-medium">Henüz canlı yayın kanalı yok.</p>
        <Link href={pathHome} className="mt-4 inline-block text-sm font-bold text-[#039D55] hover:underline">
          {brandLabel} ana sayfa
        </Link>
      </div>
    );
  }

  if (!selected) return null;

  const logoUrl = normalizeYoutubeImageSrc(htmlMeta?.logoUrl || selected.logoUrl) || null;
  const initial = selected.name.charAt(0).toUpperCase();
  const color = channelColor(selected.name);

  return (
    <div className="sade-public-page min-h-screen bg-white text-slate-900">
      <div
        className="sticky z-30 border-b border-zinc-200 bg-white/95 backdrop-blur"
        style={{ top: stickyTopPx }}
      >
        <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} flex items-center gap-3 py-2.5`}>
          <Link
            href={pathHome}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {brandLabel}
          </Link>
          <span className="text-zinc-300">|</span>
          <div className="flex min-w-0 items-center gap-2">
            <Radio className="h-4 w-4 shrink-0 text-[#039D55]" />
            <span className="truncate text-sm font-bold text-zinc-900">Canlı Yayın TV</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#039D55]">
              {liveChannels.length}
            </span>
          </div>
        </div>
      </div>

      <div className={`${YEKPARE_PAGE_CONTAINER_CLASS} pt-3 pb-2`}>
        {categoryTabs.length > 1 ? (
          <YektubeScrollTabs
            tabs={categoryTabs}
            activeId={activeCategory}
            onChange={setActiveCategory}
            className="rounded-t-xl border border-b-0 border-zinc-200 bg-white"
          />
        ) : null}

        <div className={`${categoryTabs.length > 1 ? "mt-0" : "mt-0"} flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:px-4`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-zinc-200">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-black" style={{ color }}>
                {initial}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Kaynak</p>
            <p className="truncate text-sm font-bold text-zinc-900">{displayName}</p>
          </div>
        </div>
      </div>

      <WatchExperience
        playingVideo={playingVideo}
        playing={playingVideo ? null : selected}
        sources={liveChannels}
        sharePageUrl={shareUrl}
        channelLogoUrl={htmlMeta?.logoUrl || selected.logoUrl}
        sidebarTitle="Sıradakiler"
        sidebarLiveChannels={sidebarChannels}
        onSelectLiveChannel={(s) => setLocation(yektubeCanliTvPath(pathHome, s.id))}
        onClose={() => setLocation(pathHome)}
        onSelectVideo={() => {}}
        onSelectSource={(s) => setLocation(yektubeCanliTvPath(pathHome, s.id))}
        pathHome={pathHome}
        liveTvPlaylistLayout
        liveChatVideoId={liveVideoId}
      />
    </div>
  );
}
