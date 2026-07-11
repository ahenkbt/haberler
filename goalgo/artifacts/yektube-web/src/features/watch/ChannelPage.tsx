import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Film, Home, ListVideo, MessageSquare, Smartphone } from "lucide-react";
import type { YektubeVideo } from "@workspace/yektube-core";
import type { ChannelCommunityPost, ChannelPlaylist } from "@/lib/api";
import {
  fetchChannelCommunity,
  fetchChannelMeta,
  fetchChannelPlaylists,
  fetchSource,
  fetchSourceByRef,
  fetchVideos,
} from "@/lib/api";
import { decodeHtml } from "@/lib/constants";
import { FeedSkeleton } from "@/components/CategoryChips";
import { SubscribeButton } from "@/components/SubscribeButton";
import { VideoFeedItem, VideoGridCard } from "@/components/VideoFeedItem";
import { ChannelAvatar } from "@/components/ChannelAvatar";
import { ChannelCoverMosaic } from "@/components/ChannelCoverMosaic";
import { VideoThumb } from "@/components/VideoThumb";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useChannelRouteParams } from "@/hooks/useKanalRouteParams";
import { ytRoutes } from "@/lib/routes";
import { isLongFormVideo, splitYekcekVideos } from "@/lib/yektubeVideoClassify";
import { ChannelShortsReel } from "@/features/shorts/ChannelShortsReel";
import { cn } from "@/lib/cn";

type ChannelTab = "anasayfa" | "videolar" | "yekcek" | "listeler" | "topluluk";
type VideoSort = "latest" | "popular" | "oldest";

const PLAYLIST_SHELF_SIZE = 8;
const YEKCEK_SHELF_SIZE = 8;
const HOME_VIDEO_SHELF_SIZE = 8;

function parseSourceIdFromRef(ref: string): number | null {
  const suffix = ref.match(/-(\d+)$/);
  if (suffix?.[1]) {
    const n = parseInt(suffix[1], 10);
    if (n > 0) return n;
  }
  if (/^\d+$/.test(ref.trim())) return parseInt(ref.trim(), 10);
  return null;
}

function ChannelBannerImage({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <img
      src={url}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function ChannelTabBar({
  tab,
  onTab,
  showYekcek,
  showPlaylists,
  showCommunity,
}: {
  tab: ChannelTab;
  onTab: (t: ChannelTab) => void;
  showYekcek: boolean;
  showPlaylists: boolean;
  showCommunity: boolean;
}) {
  const tabs: { key: ChannelTab; label: string; icon: ReactNode; show: boolean }[] = [
    { key: "anasayfa", label: "Ana Sayfa", icon: <Home className="h-4 w-4" />, show: true },
    { key: "videolar", label: "Videolar", icon: <Film className="h-4 w-4" />, show: true },
    { key: "yekcek", label: "Yekçek", icon: <Smartphone className="h-4 w-4" />, show: showYekcek },
    { key: "listeler", label: "Oynatma listeleri", icon: <ListVideo className="h-4 w-4" />, show: showPlaylists },
    { key: "topluluk", label: "Topluluk", icon: <MessageSquare className="h-4 w-4" />, show: showCommunity },
  ];
  return (
    <div className="flex items-center gap-0 overflow-x-auto border-b border-[var(--color-yt-border)] scrollbar-none">
      {tabs
        .filter((t) => t.show)
        .map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              tab === t.key
                ? "border-[var(--color-yt-text)] text-[var(--color-yt-text)]"
                : "border-transparent text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
    </div>
  );
}

function VideoSortChips({ sort, onSort }: { sort: VideoSort; onSort: (s: VideoSort) => void }) {
  const options: { key: VideoSort; label: string }[] = [
    { key: "latest", label: "Son yüklenenler" },
    { key: "popular", label: "Popüler" },
    { key: "oldest", label: "İlk yüklenenler" },
  ];
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onSort(o.key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            sort === o.key
              ? "bg-[var(--color-yt-text)] text-[var(--color-yt-bg)]"
              : "bg-[var(--color-yt-chip)] text-[var(--color-yt-text)] hover:bg-[var(--color-yt-border)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function sortChannelVideos(videos: YektubeVideo[], sort: VideoSort): YektubeVideo[] {
  const arr = [...videos];
  if (sort === "oldest") return arr.sort((a, b) => a.id - b.id);
  if (sort === "popular") {
    return arr.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.id - a.id);
  }
  return arr.sort((a, b) => b.id - a.id);
}

function PlaylistCardMosaic({ items }: { items: YektubeVideo[] }) {
  const four: (YektubeVideo | null)[] = items.slice(0, 4);
  while (four.length < 4) four.push(null);
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2">
      {four.map((v, i) => (
        <div key={i} className="relative min-h-0 ring-[0.5px] ring-black/20">
          {v ? (
            <VideoThumb
              videoId={v.videoId}
              thumbnail={v.thumbnail}
              quality="mq"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-yt-skeleton)]" />
          )}
        </div>
      ))}
    </div>
  );
}

function PlaylistShelfSection({
  row,
  channelId,
  channelName,
  onShowAll,
}: {
  row: ChannelPlaylist & { videos: YektubeVideo[] };
  channelId: number;
  channelName: string;
  onShowAll: () => void;
}) {
  const longForm = row.videos.filter(isLongFormVideo).slice(0, PLAYLIST_SHELF_SIZE);
  if (longForm.length === 0) return null;
  const watchSource = row.sourceId ?? channelId;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[var(--color-yt-text)]">{row.title}</h2>
        <button
          type="button"
          onClick={onShowAll}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]"
        >
          Tümü <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {longForm.map((v) => (
          <Link
            key={v.videoId}
            href={ytRoutes.watch(
              { id: watchSource, name: channelName },
              { videoId: v.videoId, title: v.title },
            )}
            className="group block min-w-0"
          >
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-yt-skeleton)]">
              <VideoThumb
                videoId={v.videoId}
                thumbnail={v.thumbnail}
                quality="mq"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {v.duration ? (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
                  {v.duration}
                </span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-[var(--color-yt-accent)]">
              {decodeHtml(v.title)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentVideosShelf({
  videos,
  channelId,
  channelName,
  onShowAll,
}: {
  videos: YektubeVideo[];
  channelId: number;
  channelName: string;
  onShowAll: () => void;
}) {
  const slice = videos.slice(0, HOME_VIDEO_SHELF_SIZE);
  if (slice.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[var(--color-yt-text)]">Videolar</h2>
        <button
          type="button"
          onClick={onShowAll}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]"
        >
          Tümü <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {slice.map((v) => (
          <Link
            key={v.videoId}
            href={ytRoutes.watch(
              { id: channelId, name: channelName },
              { videoId: v.videoId, title: v.title },
            )}
            className="group block min-w-0"
          >
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-yt-skeleton)]">
              <VideoThumb
                videoId={v.videoId}
                thumbnail={v.thumbnail}
                quality="mq"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {v.duration ? (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
                  {v.duration}
                </span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-[var(--color-yt-accent)]">
              {decodeHtml(v.title)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function YekcekShelf({
  videos,
  channelId,
  channelName,
  onShowAll,
}: {
  videos: YektubeVideo[];
  channelId: number;
  channelName: string;
  onShowAll: () => void;
}) {
  const slice = videos.slice(0, YEKCEK_SHELF_SIZE);
  if (slice.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[var(--color-yt-text)]">Yekçek</h2>
        <button
          type="button"
          onClick={onShowAll}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]"
        >
          Tümü <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {slice.map((v) => (
          <Link
            key={v.videoId}
            href={ytRoutes.shortsVideo(v.videoId)}
            className="group block"
          >
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[var(--color-yt-skeleton)]">
              <VideoThumb
                videoId={v.videoId}
                thumbnail={v.thumbnail}
                quality="mq"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-medium">{decodeHtml(v.title)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PlaylistListGrid({
  rows,
  channelId,
  channelName,
  focusedPlaylistId,
}: {
  rows: (ChannelPlaylist & { videos: YektubeVideo[] })[];
  channelId: number;
  channelName: string;
  focusedPlaylistId?: string | null;
}) {
  const ordered = focusedPlaylistId
    ? [...rows].sort((a, b) => {
        if (a.playlistId === focusedPlaylistId) return -1;
        if (b.playlistId === focusedPlaylistId) return 1;
        return 0;
      })
    : rows;

  if (ordered.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--color-yt-muted)]">Oynatma listesi bulunamadı.</p>;
  }

  return (
    <div className="space-y-8">
      {ordered.map((row) => {
        const longForm = row.videos.filter(isLongFormVideo);
        const watchSource = row.sourceId ?? channelId;
        return (
          <section key={row.playlistId}>
            <h3 className="mb-3 text-base font-bold">{row.title}</h3>
            {longForm.length === 0 ? (
              <p className="text-sm text-[var(--color-yt-muted)]">Bu listede uzun video yok.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {longForm.map((v) => (
                  <Link
                    key={v.videoId}
                    href={ytRoutes.watch(
                      { id: watchSource, name: channelName },
                      { videoId: v.videoId, title: v.title },
                    )}
                    className="group block"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-yt-skeleton)]">
                      <VideoThumb
                        videoId={v.videoId}
                        thumbnail={v.thumbnail}
                        quality="mq"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      {v.duration ? (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
                          {v.duration}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium group-hover:text-[var(--color-yt-accent)]">
                      {decodeHtml(v.title)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PlaylistCardsGrid({
  rows,
  onSelect,
  badge,
}: {
  rows: (ChannelPlaylist & { videos: YektubeVideo[] })[];
  onSelect: (playlistId: string) => void;
  badge?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((row) => (
        <button
          key={row.playlistId}
          type="button"
          onClick={() => onSelect(row.playlistId)}
          className="group block text-left"
        >
          <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-yt-skeleton)]">
            {row.thumbnail ? (
              <img src={row.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <PlaylistCardMosaic items={row.videos.filter(isLongFormVideo)} />
            )}
            {badge ? (
              <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-semibold group-hover:text-[var(--color-yt-accent)]">
            {row.title}
          </p>
          <p className="text-xs text-[var(--color-yt-muted)]">
            {row.videos.filter(isLongFormVideo).length} video
          </p>
        </button>
      ))}
    </div>
  );
}

function CommunityPostsPanel({
  posts,
  channelId,
  channelName,
  loading,
}: {
  posts: ChannelCommunityPost[];
  channelId: number;
  channelName: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl yt-skeleton" />
        ))}
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-yt-muted)]">
        Bu kanalda topluluk gönderisi bulunamadı veya sekme kapalı.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          key={post.postId}
          className="rounded-xl border border-[var(--color-yt-border)] bg-[var(--color-yt-surface-muted)] p-4"
        >
          {post.publishedText ? (
            <p className="mb-2 text-xs text-[var(--color-yt-muted)]">{post.publishedText}</p>
          ) : null}
          {post.text ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{decodeHtml(post.text)}</p>
          ) : null}
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt=""
              className="mt-3 max-h-80 w-full rounded-lg object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}
          {post.videoId ? (
            <Link
              href={ytRoutes.watch({ id: channelId, name: channelName }, { videoId: post.videoId, title: post.text.slice(0, 80) })}
              className="mt-3 block overflow-hidden rounded-lg ring-1 ring-[var(--color-yt-border)]"
            >
              <VideoThumb videoId={post.videoId} quality="mq" className="aspect-video w-full object-cover" />
            </Link>
          ) : null}
          {post.likeCount ? (
            <p className="mt-2 text-xs text-[var(--color-yt-muted)]">{post.likeCount}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function ChannelPage() {
  const { channelRef, valid } = useChannelRouteParams();
  const isMobile = useIsMobile();
  const fallbackSourceId = useMemo(() => parseSourceIdFromRef(channelRef), [channelRef]);
  const [tab, setTab] = useState<ChannelTab>("anasayfa");
  const [videoSort, setVideoSort] = useState<VideoSort>("latest");
  const [focusedPlaylistId, setFocusedPlaylistId] = useState<string | null>(null);

  const { data: sourceByRef, isLoading: sourceLoading, isError: sourceByRefError } = useQuery({
    queryKey: ["channel-source", channelRef],
    queryFn: () => fetchSourceByRef(channelRef),
    enabled: valid,
    retry: 1,
  });

  const { data: sourceById } = useQuery({
    queryKey: ["channel-source-id", fallbackSourceId],
    queryFn: () => fetchSource(fallbackSourceId!),
    enabled: valid && !sourceByRef && fallbackSourceId != null,
  });

  const source = sourceByRef ?? sourceById;
  const isError = sourceByRefError && !source;

  const channelId = source?.id ?? 0;
  const isYoutubeChannel =
    source?.platform === "youtube" && (source.sourceType === "channel" || source.sourceType === "live");

  const { data: meta } = useQuery({
    queryKey: ["channel-meta", channelId],
    queryFn: () => fetchChannelMeta(channelId),
    enabled: channelId > 0,
  });

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["channel-videos-all", channelId],
    queryFn: () =>
      fetchVideos({
        sourceId: channelId,
        limit: 500,
      }),
    enabled: channelId > 0,
  });

  const { data: playlistData, isLoading: playlistsLoading } = useQuery({
    queryKey: ["channel-playlists", channelId],
    queryFn: () => fetchChannelPlaylists(channelId),
    enabled: channelId > 0 && isYoutubeChannel,
  });

  const { data: communityPosts = [], isLoading: communityLoading } = useQuery({
    queryKey: ["channel-community", channelId],
    queryFn: () => fetchChannelCommunity(channelId),
    enabled: channelId > 0 && isYoutubeChannel,
    staleTime: 120_000,
  });

  const allItems = videos?.items ?? [];
  const { regular: regularVideos, yekcek: yekcekVideos } = useMemo(
    () => splitYekcekVideos(allItems),
    [allItems],
  );

  const sortedRegularVideos = useMemo(
    () => sortChannelVideos(regularVideos, videoSort),
    [regularVideos, videoSort],
  );

  const mosaicVideos = regularVideos.length > 0 ? regularVideos : yekcekVideos;

  const playlistRows = useMemo(() => {
    const pls = playlistData?.playlists ?? [];
    return pls.map((p) => ({
      ...p,
      videos: (p.previewVideos ?? []) as YektubeVideo[],
    }));
  }, [playlistData]);

  const podcastRows = useMemo(() => {
    const pods = playlistData?.podcasts ?? [];
    return pods.map((p) => ({
      ...p,
      videos: (p.previewVideos ?? []) as YektubeVideo[],
    }));
  }, [playlistData]);

  const allPlaylistRows = useMemo(() => [...playlistRows, ...podcastRows], [playlistRows, podcastRows]);

  if (!valid) {
    return <p className="p-4">Geçersiz kanal.</p>;
  }

  if (isError) {
    return <p className="p-4 text-red-600">Kanal bulunamadı.</p>;
  }

  const name = meta?.channelName?.trim() || source?.name || "Kanal";
  const description = meta?.description?.trim() || "";
  const subs = meta?.subscriberText?.trim();
  const customBanner = meta?.bannerUrl?.trim() || "";
  const logoUrl = meta?.logoUrl?.trim() || source?.logoUrl?.trim() || "";
  const showMosaic = !customBanner && mosaicVideos.length > 0;
  const featured = regularVideos[0];
  const homeRecentVideos = useMemo(
    () => sortChannelVideos(regularVideos.slice(1), "latest").slice(0, HOME_VIDEO_SHELF_SIZE),
    [regularVideos],
  );
  const showYekcekTab = yekcekVideos.length > 0 || isYoutubeChannel;
  const showPlaylistsTab = isYoutubeChannel || allPlaylistRows.length > 0;
  const showCommunityTab = isYoutubeChannel;

  const openPlaylistTab = (playlistId?: string) => {
    if (playlistId) setFocusedPlaylistId(playlistId);
    setTab("listeler");
  };

  return (
    <div className="min-h-full yt-app-bg pb-6">
      {sourceLoading ? (
        <div className="h-28 animate-pulse yt-skeleton lg:h-44" />
      ) : source ? (
        <>
          <div className="relative h-28 w-full overflow-hidden lg:h-44">
            {customBanner ? (
              <ChannelBannerImage url={customBanner} className="h-full w-full object-cover" />
            ) : showMosaic ? (
              <ChannelCoverMosaic videos={mosaicVideos} className="h-full" />
            ) : (
              <div className="h-full w-full bg-[var(--color-yt-skeleton)]" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />
          </div>
          <div className="relative px-4 pb-4 lg:px-6">
            <div className="-mt-8 flex gap-4 lg:-mt-10">
              <ChannelAvatar
                source={{ ...source, logoUrl: logoUrl || source.logoUrl, name }}
                className="h-16 w-16 shrink-0 rounded-full border-4 border-[var(--color-yt-bg)] object-cover shadow-sm lg:h-20 lg:w-20"
                fallbackClassName="h-16 w-16 shrink-0 rounded-full border-4 border-[var(--color-yt-bg)] text-xl shadow-sm lg:h-20 lg:w-20"
              />
              <div className="min-w-0 pt-10 lg:pt-12">
                <h1 className="text-xl font-bold lg:text-2xl">{name}</h1>
                {subs ? <p className="text-sm text-[var(--color-yt-muted)]">{subs}</p> : null}
                {source.videoCount != null ? (
                  <p className="text-xs text-[var(--color-yt-muted)]">
                    {regularVideos.length} video
                    {yekcekVideos.length > 0 ? ` · ${yekcekVideos.length} yekçek` : ""}
                  </p>
                ) : null}
                <div className="mt-2">
                  <SubscribeButton sourceId={channelId} compact />
                </div>
              </div>
            </div>
            {description ? (
              <p className="mt-3 line-clamp-3 text-sm text-[var(--color-yt-muted)]">{decodeHtml(description)}</p>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="px-4 lg:px-6">
        <ChannelTabBar
          tab={tab}
          onTab={setTab}
          showYekcek={showYekcekTab}
          showPlaylists={showPlaylistsTab}
          showCommunity={showCommunityTab}
        />
      </div>

      <div className="px-4 pt-4 lg:px-6">
        {tab === "anasayfa" ? (
          videosLoading ? (
            <FeedSkeleton />
          ) : regularVideos.length === 0 && yekcekVideos.length === 0 && playlistRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--color-yt-muted)]">Bu kanalda video yok.</p>
          ) : (
            <div className="space-y-6">
              {featured ? (
                <section>
                  <h2 className="mb-3 text-base font-bold">Öne çıkan</h2>
                  <Link
                    href={ytRoutes.watch(
                      { id: channelId, name },
                      { videoId: featured.videoId, title: featured.title },
                    )}
                    className="group flex flex-col gap-4 lg:flex-row lg:gap-8"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-yt-skeleton)] lg:w-[58%]">
                      <VideoThumb
                        videoId={featured.videoId}
                        thumbnail={featured.thumbnail}
                        quality="hq"
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-95"
                      />
                      {featured.duration ? (
                        <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-0.5 text-xs font-bold text-white">
                          {featured.duration}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold leading-snug group-hover:text-[var(--color-yt-accent)]">
                        {decodeHtml(featured.title)}
                      </p>
                      {featured.publishedAt ? (
                        <p className="mt-1 text-xs text-[var(--color-yt-muted)]">{featured.publishedAt}</p>
                      ) : null}
                    </div>
                  </Link>
                </section>
              ) : null}

              <RecentVideosShelf
                videos={homeRecentVideos}
                channelId={channelId}
                channelName={name}
                onShowAll={() => setTab("videolar")}
              />

              <YekcekShelf
                videos={yekcekVideos}
                channelId={channelId}
                channelName={name}
                onShowAll={() => setTab("yekcek")}
              />

              {playlistsLoading ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-video animate-pulse rounded-xl yt-skeleton" />
                  ))}
                </div>
              ) : (
                playlistRows.map((row) => (
                  <PlaylistShelfSection
                    key={row.playlistId}
                    row={row}
                    channelId={channelId}
                    channelName={name}
                    onShowAll={() => openPlaylistTab(row.playlistId)}
                  />
                ))
              )}
            </div>
          )
        ) : null}

        {tab === "videolar" ? (
          <>
            <VideoSortChips sort={videoSort} onSort={setVideoSort} />
            {videosLoading ? (
              isMobile ? (
                <FeedSkeleton />
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-video animate-pulse rounded-xl yt-skeleton" />
                  ))}
                </div>
              )
            ) : sortedRegularVideos.length === 0 ? (
              <p className="py-12 text-center text-sm text-[var(--color-yt-muted)]">Uzun video yok.</p>
            ) : isMobile ? (
              <div>
                {sortedRegularVideos.map((v) => (
                  <VideoFeedItem key={v.id} video={v} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {sortedRegularVideos.map((v) => (
                  <VideoGridCard key={v.id} video={v} />
                ))}
              </div>
            )}
          </>
        ) : null}

        {tab === "yekcek" ? (
          <div className="-mx-4 sm:mx-0">
            <ChannelShortsReel sourceId={channelId} />
          </div>
        ) : null}

        {tab === "listeler" ? (
          playlistsLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-xl yt-skeleton" />
              ))}
            </div>
          ) : focusedPlaylistId ? (
            <>
              <button
                type="button"
                onClick={() => setFocusedPlaylistId(null)}
                className="mb-4 text-sm font-medium text-[var(--color-yt-muted)] hover:text-[var(--color-yt-text)]"
              >
                ← Tüm listeler
              </button>
              <PlaylistListGrid
                rows={allPlaylistRows.filter((r) => r.playlistId === focusedPlaylistId)}
                channelId={channelId}
                channelName={name}
                focusedPlaylistId={focusedPlaylistId}
              />
            </>
          ) : (
            <div className="space-y-8">
              {playlistRows.length > 0 ? (
                <section>
                  <h2 className="mb-3 text-base font-bold">Oynatma listeleri</h2>
                  <PlaylistCardsGrid rows={playlistRows} onSelect={(id) => setFocusedPlaylistId(id)} />
                </section>
              ) : null}
              {podcastRows.length > 0 ? (
                <section>
                  <h2 className="mb-3 text-base font-bold">Podcastler</h2>
                  <PlaylistCardsGrid
                    rows={podcastRows}
                    onSelect={(id) => setFocusedPlaylistId(id)}
                    badge="Podcast"
                  />
                </section>
              ) : null}
              {allPlaylistRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--color-yt-muted)]">Oynatma listesi bulunamadı.</p>
              ) : null}
            </div>
          )
        ) : null}

        {tab === "topluluk" ? (
          <CommunityPostsPanel
            posts={communityPosts}
            channelId={channelId}
            channelName={name}
            loading={communityLoading}
          />
        ) : null}
      </div>
    </div>
  );
}
